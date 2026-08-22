import os
from openai import AsyncOpenAI
from ...config import get_settings

class AIProvider:
    def __init__(self) -> None:
        settings = get_settings()
        api_key = (
            settings.ai_api_key
            or os.environ.get('AI_API_KEY')
            or os.environ.get('GEMINI_API_KEY')
            or os.environ.get('GOOGLE_API_KEY')
            or os.environ.get('OPENAI_API_KEY')
            or os.environ.get('GROQ_API_KEY')
            or ''
        )
        base_url = settings.ai_base_url or os.environ.get('AI_BASE_URL') or ''
        model = settings.ai_model or os.environ.get('AI_MODEL') or ''

        # Auto-configure for Google Gemini OpenAI compatibility endpoint
        if (os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY')) and not base_url:
            base_url = 'https://generativelanguage.googleapis.com/v1beta/openai/'
            if not model:
                model = 'gemini-1.5-flash'
        elif not model:
            model = 'gpt-4o-mini'

        kwargs = {'api_key': api_key}
        if base_url:
            kwargs['base_url'] = base_url

        self.client = AsyncOpenAI(**kwargs) if api_key else None
        self.model = model

    async def complete(self, system_prompt: str, user_prompt: str) -> str:
        if not self.client:
            return ''
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {'role': 'system', 'content': system_prompt},
                    {'role': 'user', 'content': user_prompt}
                ],
                temperature=0.3
            )
            return response.choices[0].message.content or ''
        except Exception as err:
            print(f"[AI Provider Error] {err}")
            return ''
