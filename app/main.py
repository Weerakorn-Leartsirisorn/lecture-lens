"""Lecture Lens API.  Run:  uvicorn app.main:app --reload   then open http://localhost:8000"""

import logging

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import config, generate
from .ingest import ingest_pdf, load_lecture, pdf_path
from .llm import LLMError
from .schemas import FlashcardRequest, QuizRequest

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
app = FastAPI(title="Lecture Lens")


def _lecture(lecture_id: str):
    lecture = load_lecture(lecture_id)
    if not lecture:
        raise HTTPException(404, "lecture not found; upload it again")
    return lecture


def _model_error(e: LLMError):
    return HTTPException(502, f"Model API error: {e}")


@app.get("/api/health")
def health():
    return {"ok": True, "model": config.MODEL, "api_key_configured": bool(config.MODEL_API_KEY)}


@app.post("/api/lectures")
async def upload(file: UploadFile = File(...)):
    if not (file.filename or "").lower().endswith(".pdf"):
        raise HTTPException(400, "please upload a PDF (export your slides as PDF first)")
    data = await file.read()
    if len(data) > config.MAX_UPLOAD_MB * 1024 * 1024:
        raise HTTPException(413, f"file is larger than {config.MAX_UPLOAD_MB} MB")
    try:
        lecture = await ingest_pdf(file.filename, data)
    except LLMError as e:
        raise _model_error(e)
    except ValueError as e:
        raise HTTPException(400, str(e))
    return {
        "id": lecture.id,
        "filename": lecture.filename,
        "num_pages": lecture.num_pages,
        "fallback_pages": [int(p) for p, s in lecture.source.items() if s != "model"],
    }


@app.get("/api/lectures/{lecture_id}/summary")
async def get_summary(lecture_id: str, refresh: bool = False):
    try:
        return await generate.summary(_lecture(lecture_id), refresh)
    except LLMError as e:
        raise _model_error(e)


@app.post("/api/lectures/{lecture_id}/quiz")
async def make_quiz(lecture_id: str, req: QuizRequest):
    try:
        q = await generate.quiz(_lecture(lecture_id), req.lang, req.n, req.focus_pages)
    except LLMError as e:
        raise _model_error(e)
    return {**q.model_dump(), "stats": generate.stats(q.questions)}


@app.post("/api/lectures/{lecture_id}/flashcards")
async def make_flashcards(lecture_id: str, req: FlashcardRequest):
    try:
        f = await generate.flashcards(_lecture(lecture_id), req.lang, req.n)
    except LLMError as e:
        raise _model_error(e)
    return {**f.model_dump(), "stats": generate.stats(f.cards)}


@app.get("/api/lectures/{lecture_id}/pages/{page}")
def page_text(lecture_id: str, page: int):
    for p in _lecture(lecture_id).pages:
        if p.page == page:
            return p
    raise HTTPException(404, "no such page")


@app.get("/api/lectures/{lecture_id}/pdf")
def get_pdf(lecture_id: str):
    path = pdf_path(lecture_id)
    if not path.is_file():
        raise HTTPException(404, "pdf not found")
    return FileResponse(path, media_type="application/pdf")


app.mount("/", StaticFiles(directory=config.ROOT / "static", html=True), name="static")
