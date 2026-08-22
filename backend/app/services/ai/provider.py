from openai import AsyncOpenAI
from ...config import get_settings

class AIProvider:
    def __init__(self) -> None:
        settings = get_settings()
        kwargs = {'api_key': settings.ai_api_key}
        if settings.ai_base_url:
            kwargs['base_url'] = settings.ai_base_url
        self.client = AsyncOpenAI(**kwargs) if settings.ai_api_key else None
        self.model = settings.ai_model

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        if not self.client or not self.model: return 'AI provider is not configured. Review the inputs manually.'
        try:
            response = await self.client.chat.completions.create(model=self.model, messages=[{'role': 'system', 'content': system_prompt}, {'role': 'user', 'content': user_prompt}], temperature=0.2)
            return response.choices[0].message.content or ''
        except Exception as err:
            print(f"[AI Provider Error] {err}")
            return 'AI analysis is temporarily unavailable because the configured provider quota or connection is unavailable. Resume data was saved for recruiter review.'
