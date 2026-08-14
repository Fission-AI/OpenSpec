"""Render .excalidraw to PNG via the UMD template (esm.sh workaround)."""
import json
import sys
from pathlib import Path
from playwright.sync_api import sync_playwright

TEMPLATE = Path(__file__).parent / "render_template_umd.html"


def bbox(elements):
    mnx = mny = float("inf")
    mxx = mxy = float("-inf")
    for el in elements:
        if el.get("isDeleted"):
            continue
        x, y = el.get("x", 0), el.get("y", 0)
        if el.get("type") in ("arrow", "line") and "points" in el:
            for px, py in el["points"]:
                mnx, mny = min(mnx, x + px), min(mny, y + py)
                mxx, mxy = max(mxx, x + px), max(mxy, y + py)
        else:
            w, h = abs(el.get("width", 0)), abs(el.get("height", 0))
            mnx, mny = min(mnx, x), min(mny, y)
            mxx, mxy = max(mxx, x + w), max(mxy, y + h)
    if mnx == float("inf"):
        return 0, 0, 800, 600
    return mnx, mny, mxx, mxy


def main():
    src = Path(sys.argv[1])
    data = json.loads(src.read_text())
    els = [e for e in data["elements"] if not e.get("isDeleted")]
    mnx, mny, mxx, mxy = bbox(els)
    pad = 80
    vw = min(int(mxx - mnx + pad * 2), 1920)
    vh = max(int(mxy - mny + pad * 2), 600)
    out = src.with_suffix(".png")

    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page(viewport={"width": vw, "height": vh}, device_scale_factor=2)
        page.goto(TEMPLATE.as_uri())
        page.wait_for_function("window.__moduleReady === true || window.__moduleError", timeout=60000)
        err = page.evaluate("window.__moduleError || null")
        if err:
            print(f"ERROR: {err}", file=sys.stderr)
            sys.exit(1)
        result = page.evaluate(f"window.renderDiagram({json.dumps(data)})")
        if not result or not result.get("success"):
            print(f"ERROR: {result.get('error') if result else 'null result'}", file=sys.stderr)
            sys.exit(1)
        page.wait_for_function("window.__renderComplete === true", timeout=15000)
        page.wait_for_timeout(500)
        svg = page.query_selector("#root svg")
        svg.screenshot(path=str(out))
        browser.close()
    print(out)


if __name__ == "__main__":
    main()
