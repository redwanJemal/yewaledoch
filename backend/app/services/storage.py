"""MinIO/S3 storage service for image uploads."""

import uuid
from datetime import timedelta
from urllib.parse import urlparse

from minio import Minio
from minio.error import S3Error

from app.core.config import settings


def _get_client() -> Minio:
    """Create MinIO client from settings."""
    endpoint = settings.MINIO_ENDPOINT.replace("http://", "").replace("https://", "")
    secure = settings.MINIO_ENDPOINT.startswith("https://")
    return Minio(
        endpoint,
        access_key=settings.MINIO_ACCESS_KEY,
        secret_key=settings.MINIO_SECRET_KEY,
        secure=secure,
    )


def _ensure_bucket(client: Minio) -> None:
    """Create bucket if it doesn't exist."""
    if not client.bucket_exists(settings.MINIO_BUCKET):
        client.make_bucket(settings.MINIO_BUCKET)


ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
}

MAX_FILE_SIZE = 5 * 1024 * 1024  # 5MB


async def upload_image(
    file_data: bytes,
    content_type: str,
    folder: str = "posts",
) -> str:
    """Upload image to MinIO and return the public URL.

    Args:
        file_data: Raw file bytes
        content_type: MIME type (must be in ALLOWED_CONTENT_TYPES)
        folder: Storage folder prefix

    Returns:
        Public URL to the uploaded image
    """
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise ValueError(f"Unsupported content type: {content_type}")

    if len(file_data) > MAX_FILE_SIZE:
        raise ValueError("File too large (max 5MB)")

    ext_map = {
        "image/jpeg": ".jpg",
        "image/png": ".png",
        "image/webp": ".webp",
        "image/gif": ".gif",
    }
    ext = ext_map.get(content_type, ".jpg")
    filename = f"{folder}/{uuid.uuid4().hex}{ext}"

    client = _get_client()
    _ensure_bucket(client)

    import io
    client.put_object(
        settings.MINIO_BUCKET,
        filename,
        io.BytesIO(file_data),
        length=len(file_data),
        content_type=content_type,
    )

    # Build public URL
    parsed = urlparse(settings.MINIO_ENDPOINT)
    base = f"{parsed.scheme}://{parsed.netloc}"
    return f"{base}/{settings.MINIO_BUCKET}/{filename}"
