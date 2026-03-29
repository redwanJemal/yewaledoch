"""Application configuration."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment."""

    # App
    APP_NAME: str = "YeWaledoch"
    APP_URL: str = "http://localhost:5173"
    APP_ENV: str = "development"
    DEBUG: bool = False

    # Telegram
    BOT_TOKEN: str = ""
    BOT_USERNAME: str = ""
    MINI_APP_URL: str = ""

    # Admin
    ADMIN_TELEGRAM_IDS: str = ""  # Comma-separated Telegram IDs

    @property
    def admin_ids(self) -> set[int]:
        """Parse admin Telegram IDs."""
        if not self.ADMIN_TELEGRAM_IDS:
            return set()
        return {int(x.strip()) for x in self.ADMIN_TELEGRAM_IDS.split(",") if x.strip()}

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://yewaledoch:secret@localhost:5436/yewaledoch"

    # Redis
    REDIS_URL: str = "redis://localhost:6383/0"

    # Security
    SECRET_KEY: str = "change-me-in-production"
    JWT_SECRET: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_MINUTES: int = 60 * 24 * 7  # 7 days

    # CORS
    CORS_ORIGINS: str = "*"

    # MinIO / S3 Storage
    MINIO_ENDPOINT: str = "http://localhost:9000"
    MINIO_ACCESS_KEY: str = ""
    MINIO_SECRET_KEY: str = ""
    MINIO_BUCKET: str = "yewaledoch"

    # AI Translation
    ANTHROPIC_API_KEY: str = ""

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
