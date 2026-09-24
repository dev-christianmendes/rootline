from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

# apps/api/app/config.py -> apps/api -> apps -> <repo root>
REPO_ROOT = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_prefix="ROOTLINE_",
        extra="ignore",
    )

    database_url: str = "postgresql+psycopg://rootline:rootline@localhost:5432/rootline"

    # Comma separated list of allowed origins for the Next.js dev server.
    cors_origins: str = "http://localhost:3000,http://127.0.0.1:3000"

    # Directory holding the seed datasets (services.json, incidents.json, ...).
    seed_data_dir: Path = REPO_ROOT / "data" / "mock"

    # Seed the database from seed_data_dir when it is empty.
    auto_seed: bool = True

    # The analysis pipeline still returns pre-computed hypotheses, so this
    # delay reproduces the "investigating" feel of the previous mock API.
    # Set to 0 to return immediately.
    analysis_delay_ms: int = 900

    app_version: str = "0.1.0"
    environment: str = "development"

    @field_validator("cors_origins")
    @classmethod
    def _split_origins(cls, value: str) -> str:
        return ",".join(part.strip() for part in value.split(",") if part.strip())

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin for origin in self.cors_origins.split(",") if origin]


@lru_cache
def get_settings() -> Settings:
    return Settings()
