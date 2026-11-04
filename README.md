# Lecture Lens

Turn Thai–English lecture slides into a study kit — a bilingual summary, a practice quiz and
flashcards — where **every question links back to the slide it came from**.

Built for the Meta Global AI Developer Hackathon 2026 with **Muse Spark** on the **Meta Model API**.

## The problem
At Chulalongkorn (and most Thai universities), lectures mix Thai and English and slides are dense.
Generic AI summarizers make up facts and translate technical terms into Thai nobody uses in class.
Students can't tell which AI-generated question is actually covered in their exam material.

## What it does
1. **Upload slides (PDF)** → Muse Spark reads every page, including tables, formulas and diagrams.
2. **Bilingual summary** — Thai and English side by side, sections in the lecture's order, key-term
   glossary. Technical terms stay in English, the way they are used in class.
3. **Practice quiz** — 10 multiple-choice questions that test understanding. After answering you see
   the explanation, the **exact quote from the slide**, and a link that opens that page.
4. **Practice my mistakes** — one click builds a new quiz focused only on the pages you got wrong.
5. **Flashcards** — flip cards, each traced to its source page.

## How it works
```
PDF ──split into 8-page chunks──► Files API ──► Muse Spark transcribes pages (parallel)
                                                   │ (fallback: PDF text layer if a chunk fails)
                                                   ▼
                                     page-by-page text, cached by sha256
                                                   │
                ┌──────────────────────────────────┼──────────────────────────────┐
                ▼                                  ▼                              ▼
       bilingual summary                quiz (+ spare questions)            flashcards
                                                   │
                       evidence check: is the quoted text really on source_page?
                       (whitespace-insensitive for Thai + fuzzy match) → verified ✓
                       verified items shown first; unverified ones replaced by spares
```
- **Responses API** in JSON mode; every reply is validated with **Pydantic** and checked for
  impossible page numbers. Invalid replies go back to the model with the error (up to 3 tries).
- **Grounding by design**: the model must cite `source_page` + a verbatim `evidence` quote; the app
  verifies it instead of trusting it.

## Run it
```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env          # add MODEL_API_KEY (Meta Model API dashboard → API keys)
uvicorn app.main:app --reload
# open http://localhost:8000
```

## API
| Method | Path | |
|---|---|---|
| POST | `/api/lectures` | upload PDF → `{id, num_pages}` |
| GET | `/api/lectures/{id}/summary` | bilingual summary (cached) |
| POST | `/api/lectures/{id}/quiz` | `{lang: "th"\|"en", n, focus_pages}` |
| POST | `/api/lectures/{id}/flashcards` | `{lang, n}` |
| GET | `/api/lectures/{id}/pdf` | original slides |

## Built with
Muse Spark 1.3 · Meta Model API (Responses + Files API) · FastAPI · Pydantic · pypdf · vanilla JS
