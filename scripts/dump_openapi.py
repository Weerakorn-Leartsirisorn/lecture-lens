"""Print the API's OpenAPI schema. web/ generates its TypeScript types from it:
   cd web && npm run gen:api"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
from app.main import app  # noqa: E402

print(json.dumps(app.openapi(), indent=1, ensure_ascii=False))
