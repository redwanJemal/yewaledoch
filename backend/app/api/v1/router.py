"""API v1 router."""

from fastapi import APIRouter

from app.api.v1.admin import router as admin_router
from app.api.v1.auth import router as auth_router
from app.api.v1.upload import router as upload_router
from app.api.v1.children import router as children_router
from app.api.v1.comments import post_comments_router, router as comments_router
from app.api.v1.notifications import router as notifications_router
from app.api.v1.posts import mine_router, router as posts_router, saved_router
from app.api.v1.resources import router as resources_router
from app.api.v1.users import router as users_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(users_router, prefix="/users", tags=["users"])
# /posts/saved and /posts/mine MUST come before /posts/{post_id} to avoid UUID parse errors
router.include_router(saved_router, prefix="/posts/saved", tags=["saved"])
router.include_router(mine_router, prefix="/posts/mine", tags=["posts"])
router.include_router(posts_router, prefix="/posts", tags=["posts"])
router.include_router(post_comments_router, prefix="/posts/{post_id}/comments", tags=["comments"])
router.include_router(comments_router, prefix="/comments", tags=["comments"])
router.include_router(notifications_router, prefix="/notifications", tags=["notifications"])
router.include_router(children_router, prefix="/children", tags=["children"])
router.include_router(resources_router, prefix="/resources", tags=["resources"])
router.include_router(upload_router, prefix="/upload", tags=["upload"])
router.include_router(admin_router, prefix="/admin", tags=["admin"])
