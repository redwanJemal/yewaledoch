"""Admin API — dashboard, drafts, content, users, reports, scraper, broadcast."""

import asyncio
import uuid
from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Query
from pydantic import BaseModel, Field
from sqlalchemy import delete, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import AdminUser
from app.core.database import get_db
from app.models.comment import Comment
from app.models.llm_settings import LLMSettings
from app.models.notification import Notification
from app.models.post import Post
from app.models.report import Report
from app.models.scraped_draft import ScrapedDraft
from app.models.user import User

router = APIRouter()


# --- Schemas ---


class DashboardResponse(BaseModel):
    """Dashboard stats overview."""
    total_users: int
    total_posts: int
    total_comments: int
    new_users_today: int
    posts_today: int
    comments_today: int
    active_users_24h: int
    pending_drafts: int
    pending_reports: int


class DraftUpdate(BaseModel):
    """Edit a scraped draft."""
    translated_title: str | None = None
    translated_body: str | None = None
    category: str | None = None
    notes: str | None = None


class DraftResponse(BaseModel):
    """Scraped draft response."""
    id: str
    reddit_post_id: str
    reddit_url: str | None
    subreddit: str | None
    original_title: str | None
    original_body: str | None
    original_upvotes: int | None
    original_comments: int | None
    translated_title: str | None
    translated_body: str | None
    status: str
    category: str | None
    notes: str | None
    scraped_at: str
    reviewed_at: str | None
    published_post_id: str | None


class DraftListResponse(BaseModel):
    """Paginated draft list."""
    items: list[DraftResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class AdminPostUpdate(BaseModel):
    """Admin edit any post."""
    title: str | None = None
    body: str | None = None
    category: str | None = None
    status: str | None = None
    is_pinned: bool | None = None
    is_featured: bool | None = None
    tags: list[str] | None = None


class AdminPostResponse(BaseModel):
    """Post response for admin (includes author info always)."""
    id: str
    title: str
    body: str
    post_type: str
    category: str
    status: str
    is_pinned: bool
    is_featured: bool
    like_count: int
    comment_count: int
    view_count: int
    created_at: str
    published_at: str | None
    author_id: str
    author_name: str | None


class AdminPostListResponse(BaseModel):
    """Paginated admin post list."""
    items: list[AdminPostResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class AdminUserResponse(BaseModel):
    """User response for admin."""
    id: str
    telegram_id: int
    first_name: str | None
    last_name: str | None
    username: str | None
    role: str
    is_banned: bool
    ban_reason: str | None
    post_count: int
    comment_count: int
    reputation: int
    created_at: str


class AdminUserListResponse(BaseModel):
    """Paginated user list."""
    items: list[AdminUserResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class RoleUpdate(BaseModel):
    """Change user role."""
    role: str = Field(..., pattern=r"^(reader|member|contributor|expert|admin)$")


class BanRequest(BaseModel):
    """Ban user."""
    ban_reason: str = Field(..., min_length=1)


class ReportResponse(BaseModel):
    """Report response for admin."""
    id: str
    reporter_id: str
    reporter_name: str | None
    post_id: str | None
    comment_id: str | None
    reason: str
    details: str | None
    status: str
    created_at: str
    resolved_at: str | None


class ReportListResponse(BaseModel):
    """Paginated report list."""
    items: list[ReportResponse]
    total: int
    page: int
    per_page: int
    has_more: bool


class ReportAction(BaseModel):
    """Resolve a report."""
    action: str = Field(..., pattern=r"^(remove|dismiss|ban)$")


class BroadcastRequest(BaseModel):
    """Broadcast notification."""
    title: str = Field(..., min_length=1)
    body: str = Field(..., min_length=1)


class LLMSettingsResponse(BaseModel):
    """LLM provider configuration (api_key masked)."""
    id: str
    provider: str
    api_key_set: bool  # True if an API key is configured (key itself is never returned)
    model: str
    base_url: str | None
    enabled: bool
    updated_at: str


class LLMSettingsUpdate(BaseModel):
    """Update LLM provider configuration."""
    provider: str = Field(..., pattern=r"^(anthropic|openai|deepseek|custom)$")
    api_key: str | None = None  # None = keep existing key unchanged
    model: str = Field(..., min_length=1)
    base_url: str | None = None
    enabled: bool = True


# --- Helpers ---


def draft_to_response(draft: ScrapedDraft) -> DraftResponse:
    """Convert ScrapedDraft to response."""
    return DraftResponse(
        id=str(draft.id),
        reddit_post_id=draft.reddit_post_id,
        reddit_url=draft.reddit_url,
        subreddit=draft.subreddit,
        original_title=draft.original_title,
        original_body=draft.original_body,
        original_upvotes=draft.original_upvotes,
        original_comments=draft.original_comments,
        translated_title=draft.translated_title,
        translated_body=draft.translated_body,
        status=draft.status,
        category=draft.category,
        notes=draft.notes,
        scraped_at=draft.scraped_at.isoformat(),
        reviewed_at=draft.reviewed_at.isoformat() if draft.reviewed_at else None,
        published_post_id=str(draft.published_post_id) if draft.published_post_id else None,
    )


def admin_post_response(post: Post) -> AdminPostResponse:
    """Convert Post to admin response."""
    author_name = None
    if post.author:
        author_name = post.author.display_name
    return AdminPostResponse(
        id=str(post.id),
        title=post.title,
        body=post.body,
        post_type=post.post_type,
        category=post.category,
        status=post.status,
        is_pinned=post.is_pinned,
        is_featured=post.is_featured,
        like_count=post.like_count,
        comment_count=post.comment_count,
        view_count=post.view_count,
        created_at=post.created_at.isoformat(),
        published_at=post.published_at.isoformat() if post.published_at else None,
        author_id=str(post.author_id),
        author_name=author_name,
    )


def admin_user_response(user: User) -> AdminUserResponse:
    """Convert User to admin response."""
    return AdminUserResponse(
        id=str(user.id),
        telegram_id=user.telegram_id,
        first_name=user.first_name,
        last_name=user.last_name,
        username=user.username,
        role=user.role,
        is_banned=user.is_banned,
        ban_reason=user.ban_reason,
        post_count=user.post_count,
        comment_count=user.comment_count,
        reputation=user.reputation,
        created_at=user.created_at.isoformat(),
    )


def llm_settings_to_response(row: LLMSettings) -> LLMSettingsResponse:
    """Convert LLMSettings ORM row to API response (api_key masked)."""
    return LLMSettingsResponse(
        id=str(row.id),
        provider=row.provider,
        api_key_set=bool(row.api_key),
        model=row.model,
        base_url=row.base_url,
        enabled=row.enabled,
        updated_at=row.updated_at.isoformat(),
    )


# --- Dashboard ---


@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Dashboard stats overview."""
    now = datetime.now(UTC)
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    yesterday = now - timedelta(hours=24)

    # Run all count queries in parallel-ish (single session, but clear intent)
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_posts = (await db.execute(
        select(func.count(Post.id)).where(Post.status == "published")
    )).scalar() or 0
    total_comments = (await db.execute(
        select(func.count(Comment.id)).where(Comment.status == "active")
    )).scalar() or 0

    new_users_today = (await db.execute(
        select(func.count(User.id)).where(User.created_at >= today_start)
    )).scalar() or 0
    posts_today = (await db.execute(
        select(func.count(Post.id)).where(
            Post.published_at >= today_start,
            Post.status == "published",
        )
    )).scalar() or 0
    comments_today = (await db.execute(
        select(func.count(Comment.id)).where(
            Comment.created_at >= today_start,
            Comment.status == "active",
        )
    )).scalar() or 0

    # Active users = users who posted or commented in last 24h
    active_posters = select(Post.author_id).where(
        Post.created_at >= yesterday
    ).distinct()
    active_commenters = select(Comment.author_id).where(
        Comment.created_at >= yesterday
    ).distinct()
    active_users_24h = (await db.execute(
        select(func.count()).select_from(
            active_posters.union(active_commenters).subquery()
        )
    )).scalar() or 0

    pending_drafts = (await db.execute(
        select(func.count(ScrapedDraft.id)).where(ScrapedDraft.status == "pending")
    )).scalar() or 0
    pending_reports = (await db.execute(
        select(func.count(Report.id)).where(Report.status == "pending")
    )).scalar() or 0

    return DashboardResponse(
        total_users=total_users,
        total_posts=total_posts,
        total_comments=total_comments,
        new_users_today=new_users_today,
        posts_today=posts_today,
        comments_today=comments_today,
        active_users_24h=active_users_24h,
        pending_drafts=pending_drafts,
        pending_reports=pending_reports,
    )


# --- Draft Queue ---


@router.get("/drafts", response_model=DraftListResponse)
async def list_drafts(
    admin: AdminUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List scraped drafts with optional status filter."""
    query = select(ScrapedDraft)

    if status:
        query = query.where(ScrapedDraft.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    query = query.order_by(ScrapedDraft.scraped_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    drafts = result.scalars().all()

    items = [draft_to_response(d) for d in drafts]

    return DraftListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


@router.get("/drafts/{draft_id}", response_model=DraftResponse)
async def get_draft(
    draft_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Get a single scraped draft."""
    draft = await db.get(ScrapedDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    return draft_to_response(draft)


@router.patch("/drafts/{draft_id}", response_model=DraftResponse)
async def update_draft(
    draft_id: uuid.UUID,
    body: DraftUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Edit a scraped draft."""
    draft = await db.get(ScrapedDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    update_data = body.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(draft, field, value)

    await db.commit()
    await db.refresh(draft)
    return draft_to_response(draft)


@router.post("/drafts/{draft_id}/publish", response_model=DraftResponse)
async def publish_draft(
    draft_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Publish a scraped draft — creates a new curated Post."""
    draft = await db.get(ScrapedDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    if draft.status == "published":
        raise HTTPException(status_code=400, detail="Draft already published")

    if not draft.translated_title or not draft.translated_body:
        raise HTTPException(
            status_code=400,
            detail="Draft must have translated title and body before publishing",
        )

    if not draft.category:
        raise HTTPException(status_code=400, detail="Draft must have a category before publishing")

    # Create a new Post from draft data
    post = Post(
        author_id=admin.id,
        title=draft.translated_title,
        body=draft.translated_body,
        post_type="curated",
        category=draft.category,
        language="am",
        source_url=draft.reddit_url,
        source_subreddit=draft.subreddit,
        source_upvotes=draft.original_upvotes,
        status="published",
        published_at=datetime.now(UTC),
    )
    db.add(post)
    await db.flush()

    # Update draft
    draft.status = "published"
    draft.published_post_id = post.id
    draft.reviewed_by = admin.id
    draft.reviewed_at = datetime.now(UTC)

    return draft_to_response(draft)


@router.delete("/drafts/{draft_id}")
async def discard_draft(
    draft_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Discard a scraped draft."""
    draft = await db.get(ScrapedDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")

    draft.status = "discarded"
    draft.reviewed_by = admin.id
    draft.reviewed_at = datetime.now(UTC)

    return {"message": "Draft discarded"}


# --- Content Management ---


@router.get("/posts", response_model=AdminPostListResponse)
async def list_all_posts(
    admin: AdminUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status: str | None = None,
    post_type: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List all posts including drafts and removed — admin view."""
    query = select(Post).options(selectinload(Post.author))

    if status:
        query = query.where(Post.status == status)
    if post_type:
        query = query.where(Post.post_type == post_type)
    if search:
        query = query.where(
            or_(
                Post.title.ilike(f"%{search}%"),
                Post.body.ilike(f"%{search}%"),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    query = query.order_by(Post.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    posts = result.scalars().all()

    items = [admin_post_response(p) for p in posts]

    return AdminPostListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


@router.patch("/posts/{post_id}", response_model=AdminPostResponse)
async def admin_update_post(
    post_id: uuid.UUID,
    body: AdminPostUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Admin edit any post — pin, feature, change status, etc."""
    result = await db.execute(
        select(Post).where(Post.id == post_id).options(selectinload(Post.author))
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    update_data = body.model_dump(exclude_unset=True)

    # If publishing, set published_at
    if update_data.get("status") == "published" and not post.published_at:
        post.published_at = datetime.now(UTC)

    for field, value in update_data.items():
        setattr(post, field, value)

    return admin_post_response(post)


@router.delete("/posts/{post_id}")
async def admin_delete_post(
    post_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Hard delete a post and its related data."""
    post = await db.get(Post, post_id)
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")

    await db.delete(post)

    return {"message": "Post permanently deleted"}


# --- User Management ---


@router.get("/users", response_model=AdminUserListResponse)
async def list_users(
    admin: AdminUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    role: str | None = None,
    search: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    """List users with search and role filter."""
    query = select(User)

    if role:
        query = query.where(User.role == role)
    if search:
        query = query.where(
            or_(
                User.username.ilike(f"%{search}%"),
                User.first_name.ilike(f"%{search}%"),
                User.last_name.ilike(f"%{search}%"),
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    query = query.order_by(User.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    users = result.scalars().all()

    items = [admin_user_response(u) for u in users]

    return AdminUserListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


@router.patch("/users/{user_id}/role")
async def change_user_role(
    user_id: uuid.UUID,
    body: RoleUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Change a user's role."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.role = body.role

    return {"message": f"User role updated to {body.role}", "role": body.role}


@router.post("/users/{user_id}/ban")
async def ban_user(
    user_id: uuid.UUID,
    body: BanRequest,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Ban a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.role == "admin":
        raise HTTPException(status_code=400, detail="Cannot ban an admin user")

    user.is_banned = True
    user.ban_reason = body.ban_reason

    return {"message": "User banned", "is_banned": True}


@router.post("/users/{user_id}/unban")
async def unban_user(
    user_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Unban a user."""
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    user.is_banned = False
    user.ban_reason = None

    return {"message": "User unbanned", "is_banned": False}


# --- Reports ---


@router.get("/reports", response_model=ReportListResponse)
async def list_reports(
    admin: AdminUser,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=50),
    status: str | None = Query("pending"),
    db: AsyncSession = Depends(get_db),
):
    """List reports with optional status filter (defaults to pending)."""
    query = select(Report).options(selectinload(Report.reporter))

    if status:
        query = query.where(Report.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar() or 0

    offset = (page - 1) * per_page
    query = query.order_by(Report.created_at.desc()).offset(offset).limit(per_page)

    result = await db.execute(query)
    reports = result.scalars().all()

    items = [
        ReportResponse(
            id=str(r.id),
            reporter_id=str(r.reporter_id),
            reporter_name=r.reporter.display_name if r.reporter else None,
            post_id=str(r.post_id) if r.post_id else None,
            comment_id=str(r.comment_id) if r.comment_id else None,
            reason=r.reason,
            details=r.details,
            status=r.status,
            created_at=r.created_at.isoformat(),
            resolved_at=r.resolved_at.isoformat() if r.resolved_at else None,
        )
        for r in reports
    ]

    return ReportListResponse(
        items=items,
        total=total,
        page=page,
        per_page=per_page,
        has_more=(offset + len(items)) < total,
    )


@router.post("/reports/{report_id}/action")
async def resolve_report(
    report_id: uuid.UUID,
    body: ReportAction,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Resolve a report: remove content, dismiss, or ban user."""
    result = await db.execute(
        select(Report).where(Report.id == report_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")

    if report.status != "pending":
        raise HTTPException(status_code=400, detail="Report already resolved")

    now = datetime.now(UTC)

    if body.action == "dismiss":
        report.status = "dismissed"

    elif body.action == "remove":
        # Remove the reported content and warn user
        if report.post_id:
            post = await db.get(Post, report.post_id)
            if post:
                post.status = "removed"
        elif report.comment_id:
            comment = await db.get(Comment, report.comment_id)
            if comment:
                comment.status = "removed"
        report.status = "resolved"

    elif body.action == "ban":
        # Ban the content author and remove the content
        author_id = None
        if report.post_id:
            post = await db.get(Post, report.post_id)
            if post:
                post.status = "removed"
                author_id = post.author_id
        elif report.comment_id:
            comment = await db.get(Comment, report.comment_id)
            if comment:
                comment.status = "removed"
                author_id = comment.author_id

        if author_id:
            author = await db.get(User, author_id)
            if author and author.role != "admin":
                author.is_banned = True
                author.ban_reason = f"Banned due to report: {report.reason}"

        report.status = "resolved"

    report.resolved_by = admin.id
    report.resolved_at = now

    return {"message": f"Report {body.action}d", "status": report.status}


# --- LLM Settings ---


@router.get("/settings/llm", response_model=LLMSettingsResponse)
async def get_llm_settings(
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Get current LLM provider configuration. API key is never returned."""
    result = await db.execute(select(LLMSettings).limit(1))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(status_code=404, detail="No LLM settings configured yet")
    return llm_settings_to_response(row)


@router.put("/settings/llm", response_model=LLMSettingsResponse)
async def upsert_llm_settings(
    body: LLMSettingsUpdate,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Create or update LLM provider configuration."""
    result = await db.execute(select(LLMSettings).limit(1))
    row = result.scalar_one_or_none()

    if row is None:
        row = LLMSettings(
            provider=body.provider,
            api_key=body.api_key or "",
            model=body.model,
            base_url=body.base_url,
            enabled=body.enabled,
        )
        db.add(row)
    else:
        row.provider = body.provider
        row.model = body.model
        row.base_url = body.base_url
        row.enabled = body.enabled
        # Only update api_key if a new one was provided
        if body.api_key is not None:
            row.api_key = body.api_key

    await db.commit()
    await db.refresh(row)
    return llm_settings_to_response(row)


@router.post("/settings/llm/test")
async def test_llm_settings(
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """Test the configured LLM provider with a minimal translation request."""
    from scraper.translator import LLMConfig, translate_post

    result = await db.execute(select(LLMSettings).limit(1))
    row = result.scalar_one_or_none()

    if not row or not row.api_key:
        raise HTTPException(status_code=400, detail="No LLM settings configured")
    if not row.enabled:
        raise HTTPException(status_code=400, detail="LLM settings are disabled")

    config = LLMConfig(
        provider=row.provider,
        api_key=row.api_key,
        model=row.model,
        base_url=row.base_url,
    )

    translation = await translate_post(
        title="Hello",
        body="This is a test.",
        comments=[],
        llm_config=config,
    )

    if translation is None:
        raise HTTPException(status_code=502, detail="Translation test failed — check provider settings and API key")

    return {"ok": True, "provider": row.provider, "model": row.model}


# --- Re-translate Draft ---


@router.post("/drafts/{draft_id}/translate", response_model=DraftResponse)
async def translate_draft(
    draft_id: uuid.UUID,
    admin: AdminUser,
    db: AsyncSession = Depends(get_db),
):
    """
    (Re-)translate a draft using the configured LLM provider.

    Overwrites translated_title, translated_body, translated_comments, and category.
    Only works on pending drafts.
    """
    from scraper.translator import LLMConfig, translate_post

    draft = await db.get(ScrapedDraft, draft_id)
    if not draft:
        raise HTTPException(status_code=404, detail="Draft not found")
    if draft.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending drafts can be re-translated")
    if not draft.original_title or not draft.original_body:
        raise HTTPException(status_code=400, detail="Draft has no original content to translate")

    # Load LLM config from DB, fall back to env var
    settings_result = await db.execute(
        select(LLMSettings).where(LLMSettings.enabled == True).limit(1)  # noqa: E712
    )
    llm_row = settings_result.scalar_one_or_none()

    if llm_row and llm_row.api_key:
        config: LLMConfig | None = LLMConfig(
            provider=llm_row.provider,
            api_key=llm_row.api_key,
            model=llm_row.model,
            base_url=llm_row.base_url,
        )
    else:
        config = LLMConfig.from_env()

    if config is None:
        raise HTTPException(
            status_code=400,
            detail="No LLM provider configured — add settings under Settings > LLM Provider",
        )

    translation = await translate_post(
        title=draft.original_title,
        body=draft.original_body,
        comments=draft.top_comments or [],
        llm_config=config,
    )

    if translation is None:
        raise HTTPException(
            status_code=502,
            detail="Translation failed — check provider settings and API key",
        )

    draft.translated_title = translation["translated_title"]
    draft.translated_body = translation["translated_body"]
    draft.translated_comments = translation.get("translated_comments", [])
    if translation.get("suggested_category"):
        draft.category = translation["suggested_category"]

    await db.flush()
    return draft_to_response(draft)


# --- Scraper Control ---


@router.post("/scraper/run")
async def trigger_scraper(
    admin: AdminUser,
    background_tasks: BackgroundTasks,
):
    """Trigger the Reddit scraper pipeline manually (runs in background)."""

    async def run_scraper() -> None:
        """Run scraper pipeline in background."""
        try:
            from scraper.scheduler import run_pipeline
            await run_pipeline()
        except Exception:
            import structlog
            structlog.get_logger(__name__).error("background_scraper_failed", exc_info=True)

    background_tasks.add_task(run_scraper)

    return {"message": "Scraper pipeline triggered in background"}


# --- Broadcast ---


@router.post("/broadcast")
async def send_broadcast(
    body: BroadcastRequest,
    admin: AdminUser,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    """Send a broadcast notification to all users via Telegram bot."""
    from app.core.config import settings

    # Create in-app notifications for all users
    result = await db.execute(select(User.id, User.telegram_id).where(User.is_banned == False))  # noqa: E712
    users = result.all()

    for user_id, telegram_id in users:
        notification = Notification(
            user_id=user_id,
            type="broadcast",
            title=body.title,
            body=body.body,
            data={"from": "admin"},
        )
        db.add(notification)

    async def send_telegram_messages(
        user_telegram_ids: list[int], title: str, message: str, bot_token: str,
    ) -> None:
        """Send Telegram messages in background."""
        if not bot_token:
            return
        try:
            import httpx
            async with httpx.AsyncClient() as client:
                text = f"**{title}**\n\n{message}"
                for tid in user_telegram_ids:
                    try:
                        await client.post(
                            f"https://api.telegram.org/bot{bot_token}/sendMessage",
                            json={"chat_id": tid, "text": text, "parse_mode": "Markdown"},
                        )
                    except Exception:
                        continue
        except ImportError:
            pass

    telegram_ids = [tid for _, tid in users]
    background_tasks.add_task(
        asyncio.to_thread,
        lambda: asyncio.run(
            send_telegram_messages(telegram_ids, body.title, body.body, settings.BOT_TOKEN)
        ),
    )

    return {"message": f"Broadcast sent to {len(users)} users"}
