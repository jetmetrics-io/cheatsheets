#!/usr/bin/env python3
"""Generate the Tilda embed and its fallback sheet count from hub-cheatsheets/data.json."""
import html as html_lib
import json
import os
import re
from pathlib import Path

ASSET_BASE = "https://jetmetrics-static.storage.yandexcloud.net/cheatsheets/"
ROOT = Path(__file__).resolve().parent
SITE_ROOT = Path(os.environ.get("JM_SITE_ROOT", ROOT.parent)).expanduser().resolve()
DATA_PATH = Path(os.environ.get("CHEATSHEETS_DATA", SITE_ROOT / "hub-cheatsheets" / "data.json"))


def pluralize(n: int, one: str, few: str, many: str) -> str:
    n10, n100 = n % 10, n % 100
    if n10 == 1 and n100 != 11:
        return one
    if 2 <= n10 <= 4 and not 12 <= n100 <= 14:
        return few
    return many


def replace_text_by_id(source: str, element_id: str, value: str) -> str:
    pattern = re.compile(
        rf'(<(?P<tag>[A-Za-z][\w:-]*)\b[^>]*\bid="{re.escape(element_id)}"[^>]*>)(.*?)(</(?P=tag)\s*>)',
        re.DOTALL,
    )
    result, count = pattern.subn(
        lambda match: match.group(1) + html_lib.escape(value) + match.group(4), source
    )
    if count != 1:
        raise ValueError(f"Expected one element with id={element_id!r}, found {count}")
    return result


if not DATA_PATH.is_file():
    raise SystemExit(f"Cheatsheet database not found: {DATA_PATH}")
with DATA_PATH.open(encoding="utf-8") as f:
    data = json.load(f)
count = len(data.get("items", []))
if count == 0:
    raise SystemExit("Cheatsheet database has no items; refusing to write a zero count")
word = pluralize(count, "читшит", "читшита", "читшитов")

index_path = ROOT / "index.html"
source = index_path.read_text(encoding="utf-8")
for element_id in ("jm-csl-lead-count", "jm-csl-stat-total", "jm-csl-footer-count"):
    source = replace_text_by_id(source, element_id, str(count))
for element_id in ("jm-csl-lead-word", "jm-csl-stat-total-word", "jm-csl-footer-word"):
    source = replace_text_by_id(source, element_id, word)
index_path.write_text(source, encoding="utf-8")

body = re.sub(r'<script src="app\.js"></script>', "", source).strip()
output = (
    f'<link rel="stylesheet" href="{ASSET_BASE}style.css">\n\n'
    + body
    + f'\n\n<script src="{ASSET_BASE}app.js"></script>\n'
)
(ROOT / "native_embed.html").write_text(output, encoding="utf-8")
print(f"Count {count} ({word}) read from {DATA_PATH}")
print(f"Written index.html and native_embed.html, {len(output)} embed chars")
