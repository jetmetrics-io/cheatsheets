import json
import re
import urllib.request
from datetime import datetime, timezone

CHANNEL_URL = "https://t.me/s/jetmetrics"

html = urllib.request.urlopen(CHANNEL_URL).read().decode("utf-8")

m = re.search(
    r'counter_value">([\d.,]+K?)</span>\s*<span class="counter_type">subscribers',
    html,
)
if not m:
    raise SystemExit("Could not find subscriber count on " + CHANNEL_URL)

raw = m.group(1)  # e.g. "2.21K" or "980"

if raw.endswith("K"):
    value = float(raw[:-1].replace(",", "."))
    label = f"{value:.1f}".replace(".", ",") + "K"
else:
    value = int(raw.replace(",", ""))
    label = f"{value:,}".replace(",", " ")

data = {
    "label_ru": label,
    "updated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
}

with open("telegram_stats.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
    f.write("\n")

print(f"Written telegram_stats.json: {data}")
