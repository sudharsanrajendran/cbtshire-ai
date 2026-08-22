from functools import lru_cache
from pathlib import Path
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    database_url: str = 'sqlite:///./app.db'
    jwt_secret_key: str = 'change-this-in-production'
    jwt_algorithm: str = 'HS256'
    access_token_expire_minutes: int = 60
    ai_api_key: str = ''
    ai_model: str = ''
    ai_base_url: str = ''
    cors_origins: str = '*'
    storage_endpoint_url: str = ''
    storage_access_key: str = ''
    storage_secret_key: str = ''
    storage_bucket: str = ''
    storage_region: str = 'auto'
    storage_public_url: str = ''
    supabase_url: str = ''
    supabase_service_role_key: str = ''
    supabase_storage_bucket: str = 'cbtshire-resumes'
    public_app_url: str = 'https://cbtshire-ai.vercel.app'
    smtp_host: str = ''
    smtp_port: int = 587
    smtp_username: str = ''
    smtp_password: str = ''
    smtp_from_email: str = ''
    model_config = SettingsConfigDict(env_file=Path(__file__).resolve().parents[1] / '.env', extra='ignore')

@lru_cache
def get_settings() -> Settings:
    return Settings()
