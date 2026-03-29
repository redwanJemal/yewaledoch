"""API v1 router."""

from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.comments import post_comments_router, router as comments_router
from app.api.v1.posts import router as posts_router
from app.api.v1.posts import saved_router
from app.api.v1.users import router as users_router

router = APIRouter()

router.include_router(auth_router, prefix="/auth", tags=["auth"])
router.include_router(users_router, prefix="/users", tags=["users"])
router.include_router(posts_router, prefix="/posts", tags=["posts"])
router.include_router(post_comments_router, prefix="/posts/{post_id}/comments", tags=["comments"])
router.include_router(comments_router, prefix="/comments", tags=["comments"])
router.include_router(saved_router, prefix="/saved", tags=["saved"])
