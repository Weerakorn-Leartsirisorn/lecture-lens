"""PDF -> page-by-page text.

The PDF is split into chunks of CHUNK_PAGES pages; each chunk is uploaded with the
Files API and Muse Spark transcribes it (it reads slide images, tables and diagrams
that plain text extraction misses). Chunks run in parallel. If a chunk fails, we fall
back to pypdf's text layer for those pages so one bad chunk never blocks a lecture.

Results are cached by the PDF's sha256, so the same file is only processed once.
"""

import asyncio
import hashlib
import io
import logging

from pypdf import PdfReader, PdfWriter
from pydantic import BaseModel

from . import config, llm
from .schemas import Lecture, Page

log = logging.getLogger("lecture_lens.ingest")


class _Pages(BaseModel):
    pages: list[Page]


TRANSCRIBE_PROMPT = """This PDF contains pages {start} to {end} of a university lecture (slides).
The lecture may mix Thai and English. Transcribe every page, in order, exactly as written:
titles, bullet points, table cells, formulas, chart labels and values, and text inside diagrams.
Do not translate, summarize, or correct anything. If a page is mostly a figure, add one short line
starting with "[Figure]" describing what it shows. Write [illegible] for text you cannot read.

Number pages starting at {start} (the first page of this file is page {start}).
Return only JSON: {{"pages": [{{"page": {start}, "text": "..."}}, ...]}} with exactly {count} entries."""


def lecture_path(lecture_id: str):
    return config.LECTURES / f"{lecture_id}.json"


def pdf_path(lecture_id: str):
    return config.UPLOADS / f"{lecture_id}.pdf"


def load_lecture(lecture_id: str) -> Lecture | None:
    p = lecture_path(lecture_id)
    return Lecture.model_validate_json(p.read_text("utf-8")) if p.is_file() else None


async def ingest_pdf(filename: str, data: bytes) -> Lecture:
    lecture_id = hashlib.sha256(data).hexdigest()[:16]
    cached = load_lecture(lecture_id)
    if cached:
        return cached

    reader = PdfReader(io.BytesIO(data))
    n = len(reader.pages)
    if n == 0:
        raise ValueError("the PDF has no pages")
    pdf_path(lecture_id).write_bytes(data)
    local_text = [(p.extract_text() or "").strip() for p in reader.pages]

    chunks = [(s, min(s + config.CHUNK_PAGES, n)) for s in range(0, n, config.CHUNK_PAGES)]
    results = await asyncio.gather(
        *(_transcribe_chunk(reader, s, e, filename) for s, e in chunks), return_exceptions=True
    )

    pages: list[Page] = []
    source: dict[str, str] = {}
    for (s, e), result in zip(chunks, results):
        if isinstance(result, BaseException):
            log.warning("chunk pages %d-%d failed (%s); using PDF text layer", s + 1, e, result)
            for i in range(s, e):
                pages.append(Page(page=i + 1, text=local_text[i]))
                source[str(i + 1)] = "pdf_text"
        else:
            pages.extend(result)
            for p in result:
                source[str(p.page)] = "model"

    lecture = Lecture(id=lecture_id, filename=filename, num_pages=n, pages=pages, source=source)
    lecture_path(lecture_id).write_text(lecture.model_dump_json(indent=1), "utf-8")
    return lecture


async def _transcribe_chunk(reader: PdfReader, start: int, end: int, filename: str) -> list[Page]:
    writer = PdfWriter()
    for i in range(start, end):
        writer.add_page(reader.pages[i])
    buf = io.BytesIO()
    writer.write(buf)
    file_id = await llm.upload_pdf(f"{filename}-p{start + 1}-{end}.pdf", buf.getvalue())

    first, count = start + 1, end - start
    expected = list(range(first, end + 1))

    def check(result: _Pages) -> None:
        got = [p.page for p in result.pages]
        if got != expected:
            raise ValueError(f"expected pages {expected}, got {got}")

    result = await llm.ask_json(
        [
            {"type": "input_text", "text": TRANSCRIBE_PROMPT.format(start=first, end=end, count=count)},
            {"type": "input_file", "file_id": file_id},
        ],
        _Pages,
        check,
    )
    return result.pages


def lecture_text(lecture: Lecture, only_pages: list[int] | None = None) -> str:
    keep = set(only_pages or [])
    return "\n\n".join(
        f"=== Page {p.page} ===\n{p.text}" for p in lecture.pages if not keep or p.page in keep
    )
