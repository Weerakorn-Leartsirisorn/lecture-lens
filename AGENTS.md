# Lecture Lens – rules for the agent

FastAPI + React hackathon app: lecture PDF -> bilingual (Thai/English) summary,
quiz and flashcards. Every quiz question / flashcard cites source_page + a verbatim evidence quote.

## Structure
- app/ingest.py: PDF -> page text (Files API + Muse Spark, cached in data/)
- app/generate.py: prompts + evidence verification (evidence_found)
- app/main.py: API routes; serves the built frontend from web/dist
- web/: React + TypeScript + shadcn/ui (Vite). API types in web/src/api/schema.d.ts are
  generated: after changing app/schemas.py or a route, run `cd web && npm run gen:api`

## Rules
- Never read, print or edit .env. Never hardcode API keys.
- Don't change prompts or evidence_found in app/generate.py unless explicitly asked.
- No new dependencies without asking first.
- Keep Thai text readable: font IBM Plex Sans Thai, line-height >= 1.6.
- UI must work in light + dark mode, Thai + English toggle, and narrow screens.
- After Python changes run: python -m py_compile app/*.py
- After frontend changes run: cd web && npm run build && npm run check:api
- Keep changes small; explain what you changed at the end.

## Run
source .venv/bin/activate && python -m uvicorn app.main:app --reload --port 8000   (API)
cd web && npm run dev   (UI at http://localhost:5173, proxies /api to :8000)