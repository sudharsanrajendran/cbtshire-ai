from .provider import AIProvider
async def generate_offer(offer_context: str) -> str:
    return await AIProvider().complete('Draft a professional offer letter for recruiter review. Do not send or approve it.', offer_context)
