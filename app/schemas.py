"""Shapes of everything the model returns. Pydantic validates each reply;
an invalid reply is sent back to the model with the error (see llm.ask_json)."""

from typing import Literal

from pydantic import BaseModel, Field, field_validator

Lang = Literal["th", "en"]


class Page(BaseModel):
    page: int
    text: str


class Lecture(BaseModel):
    id: str
    filename: str
    num_pages: int
    pages: list[Page]
    source: dict[str, str] = {}  # page -> "model" | "pdf_text" (how its text was obtained)


# ---------- summary (always bilingual) ----------


class KeyTerm(BaseModel):
    term: str  # keep the original technical term (usually English)
    meaning_th: str
    meaning_en: str
    page: int


class SummarySection(BaseModel):
    title_th: str
    title_en: str
    points_th: list[str]
    points_en: list[str]
    pages: list[int] = Field(min_length=1)


class Summary(BaseModel):
    overview_th: str
    overview_en: str
    sections: list[SummarySection] = Field(min_length=1)
    key_terms: list[KeyTerm] = []


# ---------- quiz / flashcards (one language per request) ----------


class QuizQuestion(BaseModel):
    question: str
    choices: list[str] = Field(min_length=4, max_length=4)
    answer_index: int = Field(ge=0, le=3)
    explanation: str
    source_page: int
    evidence: str  # short verbatim quote from source_page that supports the answer
    verified: bool = False  # set by us, not the model: evidence really appears on that page

    @field_validator("choices")
    @classmethod
    def distinct_choices(cls, v: list[str]) -> list[str]:
        if len({c.strip().lower() for c in v}) != 4:
            raise ValueError("the 4 choices must be different")
        return v


class Quiz(BaseModel):
    questions: list[QuizQuestion] = Field(min_length=1)


class Flashcard(BaseModel):
    front: str
    back: str
    source_page: int
    evidence: str
    verified: bool = False


class Flashcards(BaseModel):
    cards: list[Flashcard] = Field(min_length=1)


# ---------- request bodies ----------


class QuizRequest(BaseModel):
    lang: Lang = "th"
    n: int = Field(default=10, ge=1, le=30)
    focus_pages: list[int] = []  # "practice my mistakes": only ask about these pages


class FlashcardRequest(BaseModel):
    lang: Lang = "th"
    n: int = Field(default=15, ge=1, le=40)
