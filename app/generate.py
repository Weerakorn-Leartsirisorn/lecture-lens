"""Summary, quiz and flashcards from a lecture's page text.

Every quiz question and flashcard carries `source_page` + `evidence` (a short quote).
verify_items() checks the quote really appears on that page and sets `verified`.
We ask for a few extra items and keep verified ones first, so the student only sees
questions that can be traced back to the slides.
"""

import difflib
import re

from . import config, llm
from .ingest import lecture_text
from .schemas import Flashcards, Lecture, Quiz, Summary

LANG_NAME = {"th": "Thai", "en": "English"}

STYLE = """Language rules: keep technical terms, names, formulas and code in their original form
(usually English) even when writing Thai, e.g. "Gradient descent คือการปรับค่า parameter ...".
Use only what the lecture says. Never add facts that are not in the pages."""

SUMMARY_PROMPT = """You are a study assistant for a university student. Below is the full text of a lecture,
split by page.

Write a structured summary in BOTH Thai and English:
- overview_th / overview_en: 2-3 sentences on what the lecture is about.
- sections: follow the lecture's own order and topics (usually 3-8 sections). For each: a title in
  both languages, 2-6 concise points in both languages (the Thai and English points say the same
  thing), and `pages`: the page numbers the section comes from.
- key_terms: up to 12 important terms with a one-line meaning in Thai and in English and the page
  where it is introduced.

{style}

Return only JSON with exactly this shape:
{{"overview_th": "...", "overview_en": "...",
  "sections": [{{"title_th": "...", "title_en": "...", "points_th": ["..."], "points_en": ["..."], "pages": [1, 2]}}],
  "key_terms": [{{"term": "...", "meaning_th": "...", "meaning_en": "...", "page": 3}}]}}

LECTURE ({num_pages} pages):
{text}"""

QUIZ_PROMPT = """You are writing a practice quiz for a university student from the lecture pages below.

Write {n} multiple-choice questions in {lang}.
- Test understanding (why / how / which applies / what happens if), not trivia like slide titles.
- Spread the questions across different pages and topics{focus_note}.
- Exactly 4 choices; one correct; wrong choices must be plausible (common misconceptions).
  Vary which position (0-3) holds the correct answer.
- explanation: 1-3 sentences in {lang} on why the answer is right.
- source_page: the page that supports the answer.
- evidence: a SHORT quote (5-20 words) copied EXACTLY, character for character, from that page's
  text, in the page's original language. Do not translate or paraphrase it.

{style}

Return only JSON with exactly this shape:
{{"questions": [{{"question": "...", "choices": ["...", "...", "...", "..."], "answer_index": 0,
  "explanation": "...", "source_page": 1, "evidence": "..."}}]}}

LECTURE PAGES:
{text}"""

FLASHCARD_PROMPT = """You are making flashcards for a university student from the lecture pages below.

Write {n} flashcards in {lang}. Front: a term, concept or short question. Back: a concise answer
(1-3 sentences). Cover the most important ideas across the whole lecture; avoid duplicates.
source_page: the page the card comes from. evidence: a SHORT quote (5-20 words) copied EXACTLY from
that page's text, in the page's original language.

{style}

Return only JSON with exactly this shape:
{{"cards": [{{"front": "...", "back": "...", "source_page": 1, "evidence": "..."}}]}}

LECTURE PAGES:
{text}"""


def _pages_check(lecture: Lecture):
    valid = {p.page for p in lecture.pages}

    def check(result) -> None:
        bad: list = []
        if isinstance(result, Summary):
            bad = [pg for s in result.sections for pg in s.pages if pg not in valid]
            bad += [t.page for t in result.key_terms if t.page not in valid]
        elif isinstance(result, Quiz):
            bad = [q.source_page for q in result.questions if q.source_page not in valid]
        elif isinstance(result, Flashcards):
            bad = [c.source_page for c in result.cards if c.source_page not in valid]
        if bad:
            raise ValueError(f"page numbers {sorted(set(bad))} do not exist; valid pages are 1-{max(valid)}")

    return check


# ---------------- evidence verification ----------------

_STRIP = re.compile(r"[\s\"'“”‘’`.,;:!?()\[\]{}<>•·\-–—_*#|/\\]+")


def _norm(s: str) -> str:
    # Thai has no spaces between words and slides break lines anywhere, so drop all whitespace.
    return _STRIP.sub("", s).lower()


def evidence_found(evidence: str, page_text: str, threshold: float = 0.8) -> bool:
    ev, page = _norm(evidence), _norm(page_text)
    if len(ev) < 4 or not page:
        return False
    if ev in page:
        return True
    m = difflib.SequenceMatcher(None, ev, page, autojunk=False).find_longest_match(0, len(ev), 0, len(page))
    return m.size / len(ev) >= threshold


def verify_items(lecture: Lecture, items: list) -> list:
    text = {p.page: p.text for p in lecture.pages}
    for it in items:
        it.verified = evidence_found(it.evidence, text.get(it.source_page, ""))
    # stable: verified first, original order otherwise
    return sorted(items, key=lambda it: not it.verified)


# ---------------- public API ----------------


def _cache(lecture_id: str, name: str):
    return config.LECTURES / f"{lecture_id}.{name}.json"


async def summary(lecture: Lecture, refresh: bool = False) -> Summary:
    path = _cache(lecture.id, "summary")
    if path.is_file() and not refresh:
        return Summary.model_validate_json(path.read_text("utf-8"))
    prompt = SUMMARY_PROMPT.format(style=STYLE, num_pages=lecture.num_pages, text=lecture_text(lecture))
    result = await llm.ask_json([{"type": "input_text", "text": prompt}], Summary, _pages_check(lecture))
    path.write_text(result.model_dump_json(indent=1), "utf-8")
    return result


async def quiz(lecture: Lecture, lang: str = "th", n: int = 10, focus_pages: list[int] | None = None) -> Quiz:
    focus = sorted({p for p in (focus_pages or []) if 1 <= p <= lecture.num_pages})
    focus_note = (
        f". Focus ONLY on pages {focus} (the student got these wrong); ask about the same ideas "
        "from a different angle than a simple re-ask"
        if focus else ""
    )
    extra = max(2, n // 4)  # ask for a few spare questions to replace unverified ones
    prompt = QUIZ_PROMPT.format(
        n=n + extra, lang=LANG_NAME[lang], focus_note=focus_note, style=STYLE,
        text=lecture_text(lecture, focus or None),
    )
    result = await llm.ask_json([{"type": "input_text", "text": prompt}], Quiz, _pages_check(lecture))
    result.questions = verify_items(lecture, result.questions)[:n]
    return result


async def flashcards(lecture: Lecture, lang: str = "th", n: int = 15) -> Flashcards:
    extra = max(2, n // 4)
    prompt = FLASHCARD_PROMPT.format(n=n + extra, lang=LANG_NAME[lang], style=STYLE, text=lecture_text(lecture))
    result = await llm.ask_json([{"type": "input_text", "text": prompt}], Flashcards, _pages_check(lecture))
    result.cards = verify_items(lecture, result.cards)[:n]
    return result


def stats(items: list) -> dict:
    return {"total": len(items), "verified": sum(1 for i in items if i.verified)}


__all__ = ["summary", "quiz", "flashcards", "stats", "evidence_found", "verify_items"]
