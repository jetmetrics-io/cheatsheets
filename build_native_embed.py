import re

ASSET_BASE = "https://jetmetrics-io.github.io/cheatsheets/"

with open("index.html", encoding="utf-8") as f:
    html = f.read()

body = html
body = re.sub(r'<script src="app\.js"></script>', "", body).strip()

output = (
    f'<link rel="stylesheet" href="{ASSET_BASE}style.css">\n\n'
    + body
    + f'\n\n<script src="{ASSET_BASE}app.js"></script>\n'
)

with open("native_embed.html", "w", encoding="utf-8") as f:
    f.write(output)

print(f"Written native_embed.html, {len(output)} chars — paste this into the new Tilda page's code block.")
