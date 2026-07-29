#!/usr/bin/env python3
"""Download the latin + latin-ext woff2 files for the fonts the app uses and
emit a local @font-face block. Turkish needs latin-ext (ğ ş ı İ)."""
import re
import pathlib
import urllib.request

CSS_URL = (
    "https://fonts.googleapis.com/css2"
    "?family=Spectral:ital,wght@0,400;0,500;0,600;1,400"
    "&family=Karla:wght@400;500;600;700&display=swap"
)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36"
KEEP = {"latin", "latin-ext"}

OUT = pathlib.Path("public/fonts")
OUT.mkdir(parents=True, exist_ok=True)


def get(url, binary=False):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req) as r:
        return r.read() if binary else r.read().decode()


css = get(CSS_URL)

# Each @font-face is preceded by a /* subset */ comment.
blocks = re.findall(r"/\*\s*([\w-]+)\s*\*/\s*(@font-face\s*\{[^}]*\})", css)
print(f"toplam @font-face: {len(blocks)}")

faces = []
for subset, block in blocks:
    if subset not in KEEP:
        continue
    fam = re.search(r"font-family:\s*'([^']+)'", block).group(1)
    style = re.search(r"font-style:\s*(\w+)", block).group(1)
    weight = re.search(r"font-weight:\s*(\d+)", block).group(1)
    urange = re.search(r"unicode-range:\s*([^;]+);", block).group(1).strip()
    url = re.search(r"url\(([^)]+)\)", block).group(1)

    name = f"{fam.lower()}-{weight}-{style}-{subset}.woff2"
    data = get(url, binary=True)
    (OUT / name).write_bytes(data)
    print(f"  {len(data)//1024:>3} KB  {name}")

    faces.append(
        "@font-face {\n"
        f"  font-family: '{fam}';\n"
        f"  font-style: {style};\n"
        f"  font-weight: {weight};\n"
        "  font-display: swap;\n"
        f"  src: url('/fonts/{name}') format('woff2');\n"
        f"  unicode-range: {urange};\n"
        "}"
    )

header = (
    "/* Self-hosted: the app ships offline, so fonts must not come from the\n"
    "   network. latin + latin-ext only (Turkish needs latin-ext for ğ ş ı İ).\n"
    "   Regenerate with scripts/fetch-fonts.py. */\n"
)
pathlib.Path("assets/fonts.css").write_text(header + "\n".join(faces) + "\n")
print(f"\nassets/fonts.css yazıldı ({len(faces)} @font-face)")
total = sum(f.stat().st_size for f in OUT.iterdir())
print(f"public/fonts toplam: {total//1024} KB")
