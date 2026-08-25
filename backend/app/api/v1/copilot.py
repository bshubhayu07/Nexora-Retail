from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.schemas import CopilotChatRequest, CopilotChatResponse
from app.services.copilot_service import CopilotService

router = APIRouter(prefix="/copilot", tags=["Local LLaMA AI Copilot"])

@router.post("/chat", response_model=CopilotChatResponse)
async def chat_with_llama_copilot(
    request: CopilotChatRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Query the Local LLaMA 3.2 Retail AI Copilot with plain text questions.
    RAG engine injects live store footfall, queue wait times, shelf fill levels,
    and Qualcomm Edge hardware status automatically into the prompt context.
    """
    return await CopilotService.process_chat(db, request)
