"""Meta Model API client: the OpenAI SDK pointed at api.meta.ai (same as Meta's workshop).

ask_json() makes one JSON-mode Responses API call, validates the reply with a
Pydantic model, and retries with the validation error if the reply is invalid.
"""

import asyncio
import json
import logging
from typing import Callable, TypeVar

from openai import AsyncOpenAI
from pydantic import BaseModel, ValidationError

from . import config

log = logging.getLogger("lecture_lens.llm")
T = TypeVar("T", bound=BaseModel)

_client: AsyncOpenAI | None = None
_limit = asyncio.Semaphore(config.MAX_PARALLEL_CALLS)


class LLMError(RuntimeError):
    pass


def client() -> AsyncOpenAI:
    global _client
    if _client is None:
        if not config.MODEL_API_KEY:
            raise LLMError("MODEL_API_KEY is not set: add it to .env")
        _client = AsyncOpenAI(api_key=config.MODEL_API_KEY, base_url=config.MODEL_API_BASE_URL)
    return _client


async def upload_pdf(name: str, data: bytes) -> str:
    """Upload a PDF with the Files API; returns its file_id."""
    async with _limit:
        f = await client().files.create(file=(name, data, "application/pdf"), purpose="user_data")
    return f.id


async def ask_json(
    content: list[dict],
    schema: type[T],
    check: Callable[[T], None] | None = None,
    attempts: int = 3,
) -> T:
    """content: Responses API input parts, e.g. [{"type": "input_text", "text": ...},
    {"type": "input_file", "file_id": ...}]. `check` may raise ValueError for problems
    Pydantic can't see (e.g. a page number outside the document)."""
    error = ""
    for attempt in range(1, attempts + 1):
        parts = list(content)
        if error:
            parts.append({
                "type": "input_text",
                "text": f"Your previous output was invalid: {error}\nReturn the corrected JSON only.",
            })
        kwargs: dict = {
            "model": config.MODEL,
            "input": [{"role": "user", "content": parts}],
            "text": {"format": {"type": "json_object"}},
        }
        if config.REASONING_EFFORT:
            kwargs["reasoning"] = {"effort": config.REASONING_EFFORT}
        async with _limit:
            response = await client().responses.create(**kwargs)
        raw = response.output_text or ""
        try:
            result = schema.model_validate_json(_strip_fences(raw))
            if check:
                check(result)
            return result
        except (ValidationError, ValueError) as problem:
            error = _short(problem)
            log.warning("attempt %d/%d invalid %s: %s", attempt, attempts, schema.__name__, error)
    raise LLMError(f"model did not return valid {schema.__name__}: {error}")


def _strip_fences(raw: str) -> str:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.split("\n", 1)[1] if "\n" in raw else raw
        raw = raw.rsplit("```", 1)[0]
    return raw


def _short(problem: Exception) -> str:
    if isinstance(problem, ValidationError):
        return "; ".join(
            f"{'.'.join(str(p) for p in e['loc'])}: {e['msg']}" for e in problem.errors()[:8]
        )
    return str(problem)[:500]


def shape(model: type[BaseModel]) -> str:
    """Compact JSON schema to paste into prompts (json_object mode needs the shape in the prompt)."""
    s = model.model_json_schema()
    return json.dumps(s, ensure_ascii=False, separators=(",", ":"))
