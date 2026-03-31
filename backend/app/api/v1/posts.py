"""Post endpoints — feed, CRUD, engagement."""

from datetime import UTC, datetime
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, OptionalUser
from app.core.database import get_db
from app.models.like import Like
from app.models.post import Post
from app.models.report import Report
from app.models.save import Save
from app.models.user import User

router = APIRouter()
saved_router = APIRouter()
mine_router = APIRouter()


# --- Schemas ---


class AuthorInfo(BaseModel):
    """Author info embedded in post responses."""
    id: str
    first_name: str | None
    last_name: str | None
    username: str | None
    photo_url: str | None
    role: str
    expert_verified: bool
    expert_specialty: str | None
    parenting_role: str | None


class PostCreate(BaseModel):
    """Create post request."""
    title: str = Field(..., min_length=3, max_length=300)
    body: str = Field(..., min_length=10)
    post_type: str = Field(..., pattern=r"^(question|tip|story|discussion|expert_answer)$")
    category: str = Field(..., min_length=1)
    age_group: str | None = None
    tags: list[str] = []
    images: list[str] = []
    is_anonymous: bool = False
    discussion_prompt: str | None = None


class PostUpdate(BaseModel):
    """Update post request."""
    title: str | None = Field(None, min_length=3, max_length=300)
    body: str | None = Field(None, min_length=10)
    category: str | None = None
    tags: list[str] | None = None
    is_anonymous: bool | None = None


class PostResponse(BaseModel):
    """Single post response."""
    id: str
    title: str
    body: str
    post_type: str
    category: str
    age_group: str | None
    tags: list[str]
    language: str
    images: list[str]
    is_anonymous: bool
    is_pinned: bool
    is_featured: bool
    discussion_prompt: str | None
    source_url: str | None
    like_count: int
    comment_count: int
    save_count: int
    view_count: int
    status: str
    published_at: str | None
    created_at: str
    author: AuthorInfo | None = None
    is_liked: bool = False
    is_saved: bool = False


class PostListResponse(BaseModel):
    """Paginated post list."""
    items: list[PostResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class ReportCreate(BaseModel):
    """Report request."""
    reason: str = Field(..., pattern=r"^(spam|inappropriate|misinformation|harassment|other)$")
    details: str | None = None


# --- Helper ---


def post_to_response(
    post: Post,
    is_liked: bool = False,
    is_saved: bool = False,
) -> PostResponse:
    """Convert Post model to response, respecting anonymity."""
    author = None
    if not post.is_anonymous and post.author:
        author = AuthorInfo(
            id=str(post.author.id),
            first_name=post.author.first_name,
            last_name=post.author.last_name,
            username=post.author.username,
            photo_url=post.author.photo_url,
            role=post.author.role,
            expert_verified=post.author.expert_verified,
            expert_specialty=post.author.expert_specialty,
            parenting_role=post.author.parenting_role,
        )
    elif post.is_anonymous and post.author:
        # Anonymous: only show parenting_role
        author = AuthorInfo(
            id="",
            first_name=None,
            last_name=None,
            username=None,
            photo_url=None,
            role="member",
            expert_verified=False,
            expert_specialty=None,
            parenting_role=post.author.parenting_role,
        )

    return PostResponse(
        id=str(post.id),
        title=post.title,
        body=post.body,
        post_type=post.post_type,
        category=post.category,
        age_group=post.age_group,
        tags=post.tags or [],
        language=post.language,
        images=post.images or [],
        is_anonymous=post.is_anonymous,
        is_pinned=post.is_pinned,
        is_featured=post.is_featured,
        discussion_prompt=post.discussion_prompt,
        source_url=post.source_url,
        like_count=post.like_count,
        comment_count=post.comment_count,
        save_count=post.save_count,
        view_count=post.view_count,
        status=post.status,
        published_at=post.published_at.isoformat() if post.published_at else None,
        created_at=post.created_at.isoformat(),
        author=author,
        is_liked=is_liked,
        is_saved=is_saved,
    )


# --- Post Feed ---


@router.get("", response_model=PostListResponse)
async def list_posts(
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    category: str | None = None,
    age_group: str | None = None,
    post_type: str | None = None,
    search: str | None = None,
    sort: str = Query("latest", pattern=r"^(latest|popular|discussed)$"),
    user: OptionalUser = None,
    db: AsyncSession = Depends(get_db),
):
    """List published posts with filters and pagination."""
    query = select(Post).where(
        Post.status == "published",
    ).options(selectinload(Post.author))

    # Filters
    if category:
        query = query.where(Post.category == category)
    if age_group:
        query = query.where(Post.age_group == age_group)
    if post_type:
        query = query.where(Post.post_type == post_type)
    if search:
        query = query.where(
            or_(
                Post.title.ilike(f"%{search}%"),
                Post.body.ilike(f"%{search}%"),
            )
        )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Sort
    if sort == "popular":
        query = query.order_by(Post.like_count.desc(), Post.published_at.desc())
    elif sort == "discussed":
        query = query.order_by(Post.comment_count.desc(), Post.published_at.desc())
    else:  # latest
        query = query.order_by(Post.is_pinned.desc(), Post.published_at.desc())

    # Paginate
    offset = (page - 1) * per_page
    query = query.offset(offset).limit(per_page)

    result = await db.execute(query)
    posts = result.scalars().all()

    # Get user's liked/saved post IDs
    liked_ids: set[str] = set()
    saved_ids: set[str] = set()
    if user:
        post_ids = [p.id for p in posts]
        if post_ids:
            like_result = await db.execute(
                select(Like.post_id).where(
                    Like.user_id == user.id,
                    Like.post_id.in_(post_ids),
                )
            )
            liked_ids = {str(lid) for lid in like_result.scalars().all()}

            save_result = await db.execute(
                select(Save.post_id).where(
                    Save.user_id == user.id,
                    Save.post_id.in_(post_ids),
                )
            )
            saved_ids = {str(sid) for sid in save_result.scalars().all()}

    items = [
        post_to_response(
            p,
            is_liked=str(p.id) in liked_ids,
            is_saved=str(p.id) in saved_ids,
        )
        for p in posts
    ]

    return PostListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


# --- Post Detail ---


@router.get("/{post_id}", response_model=PostResponse)
async def get_post(
    post_id: UUID,
    user: OptionalUser = None,
    db: AsyncSession = Depends(get_db),
):
    """Get post by ID with author info."""
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.author))
    )
    post = result.scalar_one_or_none()

    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    # Increment view count (fire-and-forget style, don't block)
    post.view_count += 1

    # Check liked/saved for authenticated user
    is_liked = False
    is_saved = False
    if user:
        like_result = await db.execute(
            select(Like.id).where(
                Like.user_id == user.id,
                Like.post_id == post_id,
            )
        )
        is_liked = like_result.scalar_one_or_none() is not None

        save_result = await db.execute(
            select(Save.id).where(
                Save.user_id == user.id,
                Save.post_id == post_id,
            )
        )
        is_saved = save_result.scalar_one_or_none() is not None

    return post_to_response(post, is_liked=is_liked, is_saved=is_saved)


# --- Create Post ---


@router.post("", response_model=PostResponse, status_code=201)
async def create_post(
    body: PostCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Create a new post. Requires contributor+ role."""
    allowed_roles = {"contributor", "expert", "admin"}
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=403,
            detail="Only contributors, experts, and admins can create posts",
        )

    # expert_answer restricted to experts/admins
    if body.post_type == "expert_answer" and user.role not in {"expert", "admin"}:
        raise HTTPException(
            status_code=403,
            detail="Only experts can create expert answers",
        )

    post = Post(
        author_id=user.id,
        title=body.title,
        body=body.body,
        post_type=body.post_type,
        category=body.category,
        age_group=body.age_group,
        tags=body.tags,
        images=body.images,
        is_anonymous=body.is_anonymous,
        discussion_prompt=body.discussion_prompt,
        status="published",
        published_at=datetime.now(UTC),
    )
    db.add(post)

    # Increment user post count
    user.post_count += 1

    await db.flush()
    await db.refresh(post)

    # Load author relationship
    result = await db.execute(
        select(Post)
        .where(Post.id == post.id)
        .options(selectinload(Post.author))
    )
    post = result.scalar_one()

    return post_to_response(post)


# --- Update Post ---


@router.patch("/{post_id}", response_model=PostResponse)
async def update_post(
    post_id: UUID,
    body: PostUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Update a post. Only author or admin can edit."""
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(selectinload(Post.author))
    )
    post = result.scalar_one_or_none()

    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to edit this post")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(post, field, value)

    return post_to_response(post)


# --- Delete Post ---


@router.delete("/{post_id}")
async def delete_post(
    post_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a post. Only author or admin."""
    result = await db.execute(
        select(Post).where(Post.id == post_id)
    )
    post = result.scalar_one_or_none()

    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    if post.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this post")

    post.status = "removed"

    return {"message": "Post deleted"}


# --- Like Toggle ---


@router.post("/{post_id}/like")
async def toggle_like(
    post_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Toggle like on a post."""
    post = await db.get(Post, post_id)
    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(Like).where(
            Like.user_id == user.id,
            Like.post_id == post_id,
        )
    )
    like = result.scalar_one_or_none()

    if like:
        await db.delete(like)
        post.like_count = max(0, post.like_count - 1)
        return {"liked": False, "like_count": post.like_count}
    else:
        like = Like(user_id=user.id, post_id=post_id)
        db.add(like)
        post.like_count += 1
        return {"liked": True, "like_count": post.like_count}


# --- Save Toggle ---


@router.post("/{post_id}/save")
async def toggle_save(
    post_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Toggle save/bookmark on a post."""
    post = await db.get(Post, post_id)
    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    result = await db.execute(
        select(Save).where(
            Save.user_id == user.id,
            Save.post_id == post_id,
        )
    )
    save = result.scalar_one_or_none()

    if save:
        await db.delete(save)
        post.save_count = max(0, post.save_count - 1)
        return {"saved": False}
    else:
        save = Save(user_id=user.id, post_id=post_id)
        db.add(save)
        post.save_count += 1
        return {"saved": True}


# --- Report ---


@router.post("/{post_id}/report", status_code=201)
async def report_post(
    post_id: UUID,
    body: ReportCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Report a post. Prevents duplicate reports from same user."""
    post = await db.get(Post, post_id)
    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    # Check for existing report
    result = await db.execute(
        select(Report).where(
            Report.reporter_id == user.id,
            Report.post_id == post_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already reported this post",
        )

    report = Report(
        reporter_id=user.id,
        post_id=post_id,
        reason=body.reason,
        details=body.details,
    )
    db.add(report)

    return {"message": "Report submitted"}


# --- Saved Posts ---


@saved_router.get("", response_model=PostListResponse)
async def list_saved_posts(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List user's saved/bookmarked posts."""
    query = (
        select(Post)
        .join(Save, Save.post_id == Post.id)
        .where(Save.user_id == user.id)
        .where(Post.status != "removed")
        .options(selectinload(Post.author))
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    offset = (page - 1) * per_page
    query = query.order_by(Save.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    posts = result.scalars().all()

    # All saved posts are saved by definition; check likes
    liked_ids: set[str] = set()
    post_ids = [p.id for p in posts]
    if post_ids:
        like_result = await db.execute(
            select(Like.post_id).where(
                Like.user_id == user.id,
                Like.post_id.in_(post_ids),
            )
        )
        liked_ids = {str(lid) for lid in like_result.scalars().all()}

    items = [
        post_to_response(p, is_liked=str(p.id) in liked_ids, is_saved=True)
        for p in posts
    ]

    return PostListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


# --- My Posts ---


@mine_router.get("", response_model=PostListResponse)
async def list_my_posts(
    user: CurrentUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    db: AsyncSession = Depends(get_db),
):
    """List posts created by the current user."""
    query = (
        select(Post)
        .where(Post.author_id == user.id)
        .where(Post.status != "removed")
        .options(selectinload(Post.author))
    )

    # Count
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    # Paginate
    offset = (page - 1) * per_page
    query = query.order_by(Post.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    posts = result.scalars().all()

    # Check liked/saved
    liked_ids: set[str] = set()
    saved_ids: set[str] = set()
    post_ids = [p.id for p in posts]
    if post_ids:
        like_result = await db.execute(
            select(Like.post_id).where(
                Like.user_id == user.id,
                Like.post_id.in_(post_ids),
            )
        )
        liked_ids = {str(lid) for lid in like_result.scalars().all()}

        save_result = await db.execute(
            select(Save.post_id).where(
                Save.user_id == user.id,
                Save.post_id.in_(post_ids),
            )
        )
        saved_ids = {str(sid) for sid in save_result.scalars().all()}

    items = [
        post_to_response(
            p,
            is_liked=str(p.id) in liked_ids,
            is_saved=str(p.id) in saved_ids,
        )
        for p in posts
    ]

    return PostListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )
