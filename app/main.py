"""Lecture Lens API.  Run:  uvicorn app.main:app --reload   then open http://localhost:8000"""

import hmac
import logging

from fastapi import FastAPI, File, HTTPException, Request, UploadFile
from fastapi.responses import FileResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException

from . import config, generate
from .ingest import ingest_pdf, load_lecture, pdf_path
from .llm import LLMError
from .schemas import (
    FlashcardRequest, FlashcardsResponse, Health, Page, QuizRequest, QuizResponse, Summary, LectureInfo,
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(name)s %(levelname)s %(message)s")
app = FastAPI(title="Lecture Lens")


ACCESS_COOKIE = "ll_access"


@app.middleware("http")
async def access_gate(request: Request, call_next):
    """Temporary gate until accounts exist: open the site once with ?access=<code>
    to get a cookie. Without the cookie, every API route except /api/health is 401."""
    code = config.ACCESS_CODE
    if not code:
        return await call_next(request)
    given = request.query_params.get("access")
    if given is not None:
        url = request.url.remove_query_params("access")
        resp = RedirectResponse(url.path + (f"?{url.query}" if url.query else ""), 303)
        if hmac.compare_digest(given, code):
            resp.set_cookie(ACCESS_COOKIE, code, max_age=30 * 86400, httponly=True, samesite="lax",
                            secure=request.headers.get("x-forwarded-proto") == "https")
        return resp
    path = request.url.path
    if path.startswith("/api/") and path != "/api/health":
        if not hmac.compare_digest(request.cookies.get(ACCESS_COOKIE, ""), code):
            return JSONResponse({"detail": "access code required: open the link you were given (it ends in ?access=...)"}, 401)
    return await call_next(request)


def _lecture(lecture_id: str):
    lecture = load_lecture(lecture_id)
    if not lecture:
        raise HTTPException(404, "lecture not found; upload it again")
    return lecture


def _model_error(e: LLMError):
    return HTTPException(502, f"Model API error: {e}")


@app.get("/api/health")
def health() -> Health:
    return Health(ok=True, model=config.MODEL, api_key_configured=bool(config.MODEL_API_KEY))


@app.post("/api/lectures")
async def upload(file: UploadFile = File(...)) -> LectureInfo:
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
    return _info(lecture)


def _info(lecture) -> LectureInfo:
    return LectureInfo(id=lecture.id, filename=lecture.filename, num_pages=lecture.num_pages,
                       fallback_pages=lecture.fallback_pages)


@app.get("/api/lectures/{lecture_id}")
def get_lecture(lecture_id: str) -> LectureInfo:
    return _info(_lecture(lecture_id))


@app.get("/api/lectures/{lecture_id}/summary")
async def get_summary(lecture_id: str, refresh: bool = False) -> Summary:
    try:
        return await generate.summary(_lecture(lecture_id), refresh)
    except LLMError as e:
        raise _model_error(e)


@app.post("/api/lectures/{lecture_id}/quiz")
async def make_quiz(lecture_id: str, req: QuizRequest) -> QuizResponse:
    try:
        q = await generate.quiz(_lecture(lecture_id), req.lang, req.n, req.focus_pages, difficulty=req.difficulty)
    except LLMError as e:
        raise _model_error(e)
    return QuizResponse(questions=q.questions, stats=generate.stats(q.questions))


@app.post("/api/lectures/{lecture_id}/flashcards")
async def make_flashcards(lecture_id: str, req: FlashcardRequest) -> FlashcardsResponse:
    try:
        f = await generate.flashcards(_lecture(lecture_id), req.lang, req.n)
    except LLMError as e:
        raise _model_error(e)
    return FlashcardsResponse(cards=f.cards, stats=generate.stats(f.cards))


@app.get("/api/lectures/{lecture_id}/pages/{page}")
def page_text(lecture_id: str, page: int) -> Page:
    for p in _lecture(lecture_id).pages:
        if p.page == page:
            return p
    raise HTTPException(404, "no such page")


@app.get("/api/lectures/{lecture_id}/pdf", response_class=FileResponse,
         responses={200: {"content": {"application/pdf": {}}, "description": "The uploaded PDF"}})
def get_pdf(lecture_id: str):
    path = pdf_path(lecture_id)
    if not path.is_file():
        raise HTTPException(404, "pdf not found")
    return FileResponse(path, media_type="application/pdf")


class SPAFiles(StaticFiles):
    """Serve the frontend; any unknown non-API path gets index.html so client-side routes
    like /lecture/<id> survive a refresh. Unknown /api/* paths stay a 404."""

    async def get_response(self, path, scope):
        try:
            return await super().get_response(path, scope)
        except StarletteHTTPException as e:
            if e.status_code != 404 or path == "api" or path.startswith("api/"):
                raise
            return await super().get_response("index.html", scope)


if (config.FRONTEND_DIR / "index.html").is_file():
    app.mount("/", SPAFiles(directory=config.FRONTEND_DIR, html=True), name="frontend")
else:
    logging.getLogger("lecture_lens").info(
        "No frontend build at %s: serving the API only. Run `cd web && npm run dev` for the UI.", config.FRONTEND_DIR)
