from uuid import uuid4
import httpx
from ..config import get_settings

class CloudStorage:
    def __init__(self) -> None:
        settings = get_settings()
        if not all([settings.supabase_url, settings.supabase_service_role_key, settings.supabase_storage_bucket]):
            raise RuntimeError('Supabase storage is not configured. Set SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and SUPABASE_STORAGE_BUCKET.')
        self.base_url = settings.supabase_url.rstrip('/')
        self.key = settings.supabase_service_role_key
        self.bucket = settings.supabase_storage_bucket

    def upload(self, content: bytes, filename: str, content_type: str) -> tuple[str, str]:
        key = f'resumes/{uuid4().hex}-{filename}'
        headers = {'Authorization': f'Bearer {self.key}', 'apikey': self.key, 'Content-Type': content_type, 'x-upsert': 'false'}
        try:
            response = httpx.post(f'{self.base_url}/storage/v1/object/{self.bucket}/{key}', headers=headers, content=content, timeout=30)
            response.raise_for_status()
            signed = httpx.post(f'{self.base_url}/storage/v1/object/sign/{self.bucket}/{key}', headers={**headers, 'Content-Type': 'application/json'}, json={'expiresIn': 3600}, timeout=30)
            signed.raise_for_status()
            signed_path = signed.json().get('signedURL', '')
            return key, f'{self.base_url}/storage/v1{signed_path}' if signed_path.startswith('/') else signed_path
        except httpx.HTTPError as error:
            raise RuntimeError('Supabase Storage upload failed. Check the project URL, service-role key, and bucket name.') from error
