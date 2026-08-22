from .provider import AIProvider
async def candidate_insights(candidate_context: str) -> str:
    return await AIProvider().complete('Give recruiters transparent, reviewable candidate insights without making an employment decision.', candidate_context)
