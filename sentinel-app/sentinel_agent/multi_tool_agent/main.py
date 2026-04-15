from dotenv import load_dotenv
from pathlib import Path
import os

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

print(">>> PROJECT:", os.getenv("GOOGLE_CLOUD_PROJECT"))
print(">>> VERTEXAI:", os.getenv("GOOGLE_GENAI_USE_VERTEXAI"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import uuid

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

@app.post("/chat")
async def chat(req: ChatRequest):
    from google.adk.runners import Runner
    from google.adk.sessions import InMemorySessionService
    from agent import root_agent

    session_service = InMemorySessionService()
    runner = Runner(
        agent=root_agent,
        app_name="sentinel",
        session_service=session_service
    )

    session_id = req.session_id or str(uuid.uuid4())
    await session_service.create_session(
        app_name="sentinel",
        user_id="president",
        session_id=session_id
    )

    from google.genai.types import Content, Part
    content = Content(role="user", parts=[Part(text=req.message)])

    final_response = ""
    async for event in runner.run_async(
        user_id="president",
        session_id=session_id,
        new_message=content
    ):
        if event.is_final_response():
            if event.content and event.content.parts:
                for part in event.content.parts:
                    if hasattr(part, "text") and part.text:
                        final_response += part.text
            break

    return {"response": final_response or "Briefing complete — no text response captured.", "session_id": session_id}