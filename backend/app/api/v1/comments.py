"""Comment endpoints — threaded comments, likes, moderation."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import CurrentUser, OptionalUser
from app.core.database import get_db
from app.models.comment import Comment
from app.models.like import Like
from app.models.notification import Notification
from app.models.post import Post
from app.models.report import Report
from app.models.user import User

# Router for endpoints nested under /posts/{post_id}/comments
post_comments_router = APIRouter()

# Router for standalone /comments/{id} endpoints (edit, delete, like, report)
router = APIRouter()


# --- Schemas ---


class CommentAuthorInfo(BaseModel):
    """Author info embedded in comment responses."""
    id: str
    first_name: str | None
    last_name: str | None
    username: str | None
    photo_url: str | None
    role: str
    expert_verified: bool
    expert_specialty: str | None
    parenting_role: str | None


class CommentCreate(BaseModel):
    """Create comment request."""
    body: str = Field(..., min_length=1, max_length=5000)
    parent_id: UUID | None = None
    is_anonymous: bool = False


class CommentUpdate(BaseModel):
    """Update comment request."""
    body: str = Field(..., min_length=1, max_length=5000)


class CommentResponse(BaseModel):
    """Single comment response."""
    id: str
    post_id: str
    parent_id: str | None
    body: str
    is_anonymous: bool
    is_expert_answer: bool
    like_count: int
    status: str
    created_at: str
    updated_at: str
    author: CommentAuthorInfo | None = None
    is_liked: bool = False
    replies: list["CommentResponse"] = []


class CommentListResponse(BaseModel):
    """Paginated comment list."""
    items: list[CommentResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class ReportCreate(BaseModel):
    """Report request."""
    reason: str = Field(..., pattern=r"^(spam|inappropriate|misinformation|harassment|other)$")
    details: str | None = None


# --- Helpers ---


def _build_author(comment: Comment) -> CommentAuthorInfo | None:
    """Build author info, respecting anonymity."""
    if not comment.author:
        return None

    if comment.is_anonymous:
        return CommentAuthorInfo(
            id="",
            first_name=None,
            last_name=None,
            username=None,
            photo_url=None,
            role="member",
            expert_verified=False,
            expert_specialty=None,
            parenting_role=comment.author.parenting_role,
        )

    return CommentAuthorInfo(
        id=str(comment.author.id),
        first_name=comment.author.first_name,
        last_name=comment.author.last_name,
        username=comment.author.username,
        photo_url=comment.author.photo_url,
        role=comment.author.role,
        expert_verified=comment.author.expert_verified,
        expert_specialty=comment.author.expert_specialty,
        parenting_role=comment.author.parenting_role,
    )


def _comment_to_response(
    comment: Comment,
    is_liked: bool = False,
    replies: list[CommentResponse] | None = None,
) -> CommentResponse:
    """Convert Comment model to response."""
    return CommentResponse(
        id=str(comment.id),
        post_id=str(comment.post_id),
        parent_id=str(comment.parent_id) if comment.parent_id else None,
        body=comment.body,
        is_anonymous=comment.is_anonymous,
        is_expert_answer=comment.is_expert_answer,
        like_count=comment.like_count,
        status=comment.status,
        created_at=comment.created_at.isoformat(),
        updated_at=comment.updated_at.isoformat(),
        author=_build_author(comment),
        is_liked=is_liked,
        replies=replies or [],
    )


# --- List Comments (nested under posts) ---


@post_comments_router.get("", response_model=CommentListResponse)
async def list_comments(
    post_id: UUID,
    page: int = Query(1, ge=1),
    per_page: int = Query(50, ge=1, le=100),
    user: OptionalUser = None,
    db: AsyncSession = Depends(get_db),
):
    """List comments for a post, with threaded replies."""
    # Verify post exists
    post = await db.get(Post, post_id)
    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    # Fetch all active comments for this post (top-level + replies)
    result = await db.execute(
        select(Comment)
        .where(Comment.post_id == post_id, Comment.status == "active")
        .options(selectinload(Comment.author))
        .order_by(Comment.created_at.asc())
    )
    all_comments = result.scalars().all()

    # Get liked comment IDs for authenticated user
    liked_ids: set[str] = set()
    if user and all_comments:
        comment_ids = [c.id for c in all_comments]
        like_result = await db.execute(
            select(Like.comment_id).where(
                Like.user_id == user.id,
                Like.comment_id.in_(comment_ids),
            )
        )
        liked_ids = {str(lid) for lid in like_result.scalars().all()}

    # Separate top-level comments and replies
    top_level = [c for c in all_comments if c.parent_id is None]
    replies_by_parent: dict[str, list[Comment]] = {}
    for c in all_comments:
        if c.parent_id:
            key = str(c.parent_id)
            replies_by_parent.setdefault(key, []).append(c)

    total = len(top_level)

    # Paginate top-level comments
    offset = (page - 1) * per_page
    paginated = top_level[offset : offset + per_page]

    # Build response with nested replies
    items = []
    for comment in paginated:
        child_replies = replies_by_parent.get(str(comment.id), [])
        reply_responses = [
            _comment_to_response(r, is_liked=str(r.id) in liked_ids)
            for r in child_replies
        ]
        items.append(
            _comment_to_response(
                comment,
                is_liked=str(comment.id) in liked_ids,
                replies=reply_responses,
            )
        )

    return CommentListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


# --- Create Comment (nested under posts) ---


@post_comments_router.post("", response_model=CommentResponse, status_code=201)
async def create_comment(
    post_id: UUID,
    body: CommentCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Add a comment to a post. Requires member+ role."""
    # Check role (reader cannot comment)
    if user.role == "reader":
        raise HTTPException(
            status_code=403,
            detail="Members and above can comment. Complete your profile to become a member.",
        )

    # Verify post exists and is published
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post or post.status == "removed":
        raise HTTPException(status_code=404, detail="Post not found")

    # Validate parent_id if provided (must belong to same post, no deeper nesting)
    parent_comment = None
    if body.parent_id:
        parent_comment = await db.get(Comment, body.parent_id)
        if not parent_comment or parent_comment.post_id != post_id:
            raise HTTPException(status_code=404, detail="Parent comment not found")
        if parent_comment.parent_id is not None:
            raise HTTPException(
                status_code=400,
                detail="Replies can only be one level deep",
            )

    # Create comment
    comment = Comment(
        post_id=post_id,
        author_id=user.id,
        parent_id=body.parent_id,
        body=body.body.strip(),
        is_anonymous=body.is_anonymous,
        is_expert_answer=user.role == "expert",
    )
    db.add(comment)

    # Increment counters
    post.comment_count += 1
    user.comment_count += 1

    await db.flush()
    await db.refresh(comment)

    # Auto-promote: member with 10+ comments → contributor
    if user.role == "member" and user.comment_count >= 10:
        user.role = "contributor"

    # Create notification for post author (unless self-comment)
    if post.author_id != user.id:
        author_name = "Someone" if body.is_anonymous else user.display_name
        notification = Notification(
            user_id=post.author_id,
            type="comment",
            title="New comment on your post",
            body=f"{author_name} commented on \"{post.title[:50]}\"",
            data={
                "post_id": str(post_id),
                "comment_id": str(comment.id),
            },
        )
        db.add(notification)

    # If replying, notify parent comment author (unless self-reply or same as post author)
    if parent_comment and parent_comment.author_id != user.id:
        # Don't duplicate if parent author == post author (already notified above)
        if parent_comment.author_id != post.author_id:
            author_name = "Someone" if body.is_anonymous else user.display_name
            reply_notification = Notification(
                user_id=parent_comment.author_id,
                type="reply",
                title="New reply to your comment",
                body=f"{author_name} replied to your comment on \"{post.title[:50]}\"",
                data={
                    "post_id": str(post_id),
                    "comment_id": str(comment.id),
                    "parent_comment_id": str(parent_comment.id),
                },
            )
            db.add(reply_notification)

    # Load author for response
    result = await db.execute(
        select(Comment)
        .where(Comment.id == comment.id)
        .options(selectinload(Comment.author))
    )
    comment = result.scalar_one()

    return _comment_to_response(comment)


# --- Edit Comment ---


@router.patch("/{comment_id}", response_model=CommentResponse)
async def update_comment(
    comment_id: UUID,
    body: CommentUpdate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Edit own comment. Only body is editable."""
    result = await db.execute(
        select(Comment)
        .where(Comment.id == comment_id)
        .options(selectinload(Comment.author))
    )
    comment = result.scalar_one_or_none()

    if not comment or comment.status == "removed":
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized to edit this comment")

    comment.body = body.body.strip()

    return _comment_to_response(comment)


# --- Delete Comment ---


@router.delete("/{comment_id}")
async def delete_comment(
    comment_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Soft delete a comment. Only author or admin."""
    result = await db.execute(
        select(Comment).where(Comment.id == comment_id)
    )
    comment = result.scalar_one_or_none()

    if not comment or comment.status == "removed":
        raise HTTPException(status_code=404, detail="Comment not found")

    if comment.author_id != user.id and user.role != "admin":
        raise HTTPException(status_code=403, detail="Not authorized to delete this comment")

    comment.status = "removed"

    # Decrement post comment count
    post = await db.get(Post, comment.post_id)
    if post:
        post.comment_count = max(0, post.comment_count - 1)

    return {"message": "Comment deleted"}


# --- Like Toggle ---


@router.post("/{comment_id}/like")
async def toggle_comment_like(
    comment_id: UUID,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Toggle like on a comment."""
    comment = await db.get(Comment, comment_id)
    if not comment or comment.status == "removed":
        raise HTTPException(status_code=404, detail="Comment not found")

    result = await db.execute(
        select(Like).where(
            Like.user_id == user.id,
            Like.comment_id == comment_id,
        )
    )
    like = result.scalar_one_or_none()

    if like:
        await db.delete(like)
        comment.like_count = max(0, comment.like_count - 1)
        return {"liked": False, "like_count": comment.like_count}
    else:
        like = Like(user_id=user.id, comment_id=comment_id)
        db.add(like)
        comment.like_count += 1
        return {"liked": True, "like_count": comment.like_count}


# --- Report Comment ---


@router.post("/{comment_id}/report", status_code=201)
async def report_comment(
    comment_id: UUID,
    body: ReportCreate,
    user: CurrentUser,
    db: AsyncSession = Depends(get_db),
):
    """Report a comment. Prevents duplicate reports from same user."""
    comment = await db.get(Comment, comment_id)
    if not comment or comment.status == "removed":
        raise HTTPException(status_code=404, detail="Comment not found")

    # Check for existing report
    result = await db.execute(
        select(Report).where(
            Report.reporter_id == user.id,
            Report.comment_id == comment_id,
        )
    )
    existing = result.scalar_one_or_none()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="You have already reported this comment",
        )

    report = Report(
        reporter_id=user.id,
        comment_id=comment_id,
        reason=body.reason,
        details=body.details,
    )
    db.add(report)

    return {"message": "Report submitted"}
