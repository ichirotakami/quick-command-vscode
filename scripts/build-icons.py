#!/usr/bin/env python3
"""Regenerate media/fonts/quick-command-icons.woff and package.json's
`contributes.icons` from src/icons/manifest.json — the single source of
truth for custom brand icons (dbt, knight, docker, pre-commit, ...).

Each manifest entry is SVG path data already normalized to a 24x24 viewBox
(same convention as codicons: y-down, ~0.1-0.4 unit margin). extension.ts
imports the manifest directly for the sidebar webview's inline SVG; this
script is only needed to (re)build the two artifacts VS Code requires to be
static: the compiled icon font and package.json's contributes.icons block.

Usage:
    python3 scripts/build-icons.py

Requires: fonttools (pip install fonttools)
"""
import json
import re
import sys
from pathlib import Path

try:
    from fontTools.svgLib.path import parse_path
    from fontTools.pens.ttGlyphPen import TTGlyphPen
    from fontTools.pens.cu2quPen import Cu2QuPen
    from fontTools.pens.transformPen import TransformPen
    from fontTools.fontBuilder import FontBuilder
except ImportError:
    print("error: fonttools is required — run: pip3 install fonttools", file=sys.stderr)
    sys.exit(1)

ROOT = Path(__file__).resolve().parent.parent
MANIFEST_PATH = ROOT / "src" / "icons" / "manifest.json"
FONT_PATH = ROOT / "media" / "fonts" / "quick-command-icons.woff"
PACKAGE_JSON_PATH = ROOT / "package.json"

UNITS_PER_EM = 1000
VIEWBOX = 24
SCALE = UNITS_PER_EM / VIEWBOX


def build_glyph(path_data: str):
    ttpen = TTGlyphPen(None)
    cu2qu = Cu2QuPen(ttpen, max_err=0.1)
    # Flip Y (SVG y-down -> font y-up) and scale the 24-unit viewBox to unitsPerEm.
    transform = (SCALE, 0, 0, -SCALE, 0, VIEWBOX * SCALE)
    parse_path(path_data, TransformPen(cu2qu, transform))
    return ttpen.glyph()


def build_font(manifest: dict) -> None:
    glyph_order = [".notdef"] + list(manifest.keys())
    glyphs = {".notdef": TTGlyphPen(None).glyph()}
    cmap = {}
    metrics = {".notdef": (UNITS_PER_EM, 0)}

    for name, icon in manifest.items():
        codepoint = int(icon["codepoint"], 16)
        glyphs[name] = build_glyph(icon["svgPath"])
        cmap[codepoint] = name
        metrics[name] = (UNITS_PER_EM, 0)

    fb = FontBuilder(UNITS_PER_EM, isTTF=True)
    fb.setupGlyphOrder(glyph_order)
    fb.setupCharacterMap(cmap)
    fb.setupGlyf(glyphs)
    fb.setupHorizontalMetrics(metrics)
    fb.setupHorizontalHeader(ascent=UNITS_PER_EM, descent=0)
    fb.setupNameTable({"familyName": "quick-command-icons", "styleName": "Regular"})
    fb.setupOS2(sTypoAscender=UNITS_PER_EM, sTypoDescender=0, usWinAscent=UNITS_PER_EM, usWinDescent=0)
    fb.setupPost()

    fb.font.flavor = "woff"
    FONT_PATH.parent.mkdir(parents=True, exist_ok=True)
    fb.font.save(str(FONT_PATH))


def update_package_json(manifest: dict) -> None:
    text = PACKAGE_JSON_PATH.read_text()
    pkg = json.loads(text)

    font_rel_path = "./media/fonts/quick-command-icons.woff"
    icons_block = {}
    for icon in manifest.values():
        icons_block[icon["themeIconId"]] = {
            "description": icon["description"],
            "default": {"fontPath": font_rel_path, "fontCharacter": "\\" + icon["codepoint"]},
        }

    pkg.setdefault("contributes", {})["icons"] = icons_block
    # Preserve the file's existing 2-space indent style, insertion order, and any
    # non-ASCII characters (ensure_ascii would otherwise \uXXXX-escape them).
    PACKAGE_JSON_PATH.write_text(json.dumps(pkg, indent=2, ensure_ascii=False) + "\n")


def main() -> None:
    manifest = json.loads(MANIFEST_PATH.read_text())

    for name, icon in manifest.items():
        for field in ("themeIconId", "description", "codepoint", "svgPath"):
            if field not in icon:
                print(f"error: icons/manifest.json entry '{name}' is missing '{field}'", file=sys.stderr)
                sys.exit(1)
        if not re.fullmatch(r"[0-9A-Fa-f]{4,6}", icon["codepoint"]):
            print(f"error: icon '{name}' has an invalid codepoint {icon['codepoint']!r} (expected hex, e.g. E900)", file=sys.stderr)
            sys.exit(1)

    codepoints = [icon["codepoint"].upper() for icon in manifest.values()]
    if len(set(codepoints)) != len(codepoints):
        print("error: duplicate codepoints in icons/manifest.json", file=sys.stderr)
        sys.exit(1)

    build_font(manifest)
    update_package_json(manifest)

    print(f"Built {FONT_PATH.relative_to(ROOT)} with {len(manifest)} glyph(s):")
    for name, icon in manifest.items():
        print(f"  {name:12s} \\{icon['codepoint']}  ({icon['themeIconId']})")
    print(f"Updated {PACKAGE_JSON_PATH.relative_to(ROOT)}'s contributes.icons.")
    print("Run `npm run build` to rebuild the extension bundle.")


if __name__ == "__main__":
    main()
