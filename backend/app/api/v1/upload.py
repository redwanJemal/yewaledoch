"""Image upload endpoint."""

from fastapi import APIRouter, HTTPException, UploadFile, status

from app.api.deps import CurrentUser
from app.services.storage import ALLOWED_CONTENT_TYPES, MAX_FILE_SIZE, upload_image

router = APIRouter()


@router.post("/image")
async def upload_image_endpoint(
    file: UploadFile,
    user: CurrentUser,
) -> dict[str, str]:
    """Upload an image and return its URL.

    Accepts JPEG, PNG, WebP, GIF. Max 5MB.
    """
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported file type. Allowed: {', '.join(ALLOWED_CONTENT_TYPES)}",
        )

    data = await file.read()
    if len(data) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File too large (max 5MB)",
        )

    try:
        url = await upload_image(data, file.content_type or "image/jpeg")
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Upload failed: {str(e)}",
        )

    return {"url": url}
