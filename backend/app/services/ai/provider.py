import asyncio
import os
from openai import AsyncOpenAI
from ...config import get_settings


class AIProvider:
    def __init__(self) -> None:
        settings = get_settings()
        self.api_key = (
            settings.ai_api_key
            or os.environ.get('AI_API_KEY')
            or os.environ.get('OPENROUTER_API_KEY')
            or os.environ.get('GEMINI_API_KEY')
            or os.environ.get('GOOGLE_API_KEY')
            or os.environ.get('OPENAI_API_KEY')
            or ''
        )
        self.base_url = settings.ai_base_url or os.environ.get('AI_BASE_URL') or ''
        self.model = settings.ai_model or os.environ.get('AI_MODEL') or 'deepseek/deepseek-chat'

        # Auto-detect and configure provider based on key / base_url
        if not self.base_url:
            if self.api_key.startswith('sk-or-'):
                # OpenRouter key
                self.base_url = 'https://openrouter.ai/api/v1'
            elif self.api_key.startswith('AIza') or os.environ.get('GEMINI_API_KEY') or os.environ.get('GOOGLE_API_KEY'):
                # Google Gemini
                self.base_url = 'https://generativelanguage.googleapis.com/v1beta/openai/'

    def _is_openrouter(self) -> bool:
        return 'openrouter.ai' in (self.base_url or '')

    async def complete(
        self,
        system_prompt: str = "You are an expert AI recruitment assistant.",
        user_prompt: str = "",
        prompt: str = "",
        system: str = "",
        temperature: float = 0.3
    ) -> str:
        sys_msg = system or system_prompt
        user_msg = prompt or user_prompt
        if not user_msg and sys_msg:
            user_msg, sys_msg = sys_msg, "You are an expert AI recruitment assistant."

        if not self.api_key:
            print("[AIProvider] No API key configured.")
            return ""

        # OpenRouter: primary model + fallbacks across OpenAI, DeepSeek, Anthropic
        if self._is_openrouter():
            models_to_try = [
                self.model,
                'deepseek/deepseek-chat',          # DeepSeek — fast & cheap
                'openai/gpt-4o-mini',               # OpenAI GPT-4o-mini
                'anthropic/claude-3-haiku',         # Anthropic Claude 3 Haiku
                'openai/gpt-3.5-turbo',             # OpenAI fallback
            ]
        else:
            # Gemini or other OpenAI-compat endpoints
            models_to_try = [
                self.model,
                'gemini-1.5-flash',
                'gemini-1.5-pro',
                'gpt-4o-mini',
            ]

        # Deduplicate while preserving order
        seen: set = set()
        models_to_try = [m for m in models_to_try if m and not (m in seen or seen.add(m))]

        kwargs: dict = {'api_key': self.api_key}
        if self.base_url:
            kwargs['base_url'] = self.base_url

        # OpenRouter requires extra headers for proper attribution
        extra_headers: dict = {}
        if self._is_openrouter():
            extra_headers = {
                'HTTP-Referer': os.environ.get('PUBLIC_APP_URL', 'http://localhost'),
                'X-Title': 'CBTS AI Recruitment App',
            }

        async with AsyncOpenAI(**kwargs) as client:
            for m in models_to_try:
                try:
                    call = client.chat.completions.create(
                        model=m,
                        messages=[
                            {'role': 'system', 'content': sys_msg},
                            {'role': 'user', 'content': user_msg}
                        ],
                        temperature=temperature,
                        extra_headers=extra_headers if extra_headers else None,
                    )
                    response = await asyncio.wait_for(call, timeout=30.0)
                    if response.choices and response.choices[0].message.content:
                        return response.choices[0].message.content.strip()
                except Exception as err:
                    print(f"[AIProvider] Model '{m}' failed: {err}")

        print("[AIProvider] All models failed — returning empty. Please check your API key.")
        return ""
