"""Render the 1200x630 link-preview image for GEN M Explorer.

Writes src/app/opengraph-image.jpg and src/app/twitter-image.jpg (Next's
static metadata-file convention). A JPEG keeps the preview well under the
~300 KB that WhatsApp reliably shows; a generated PNG of the map art was
over 2 MB. Re-run after changing the copy:

    python3 scripts/make-og-image.py

Uses the real map art and Neoverse Sans (the site's heading face). The GEN M
wordmark is left out until branding approval is confirmed.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MAP = ROOT / "public/images/Coastal Park Beachfront Map.png"
FONT_MEDIUM = ROOT / "src/app/fonts/NeoverseSans-Medium.otf"
FONT_CONDENSED = ROOT / "src/app/fonts/NeoverseSans-RegularCondensed.otf"
OUTPUTS = [ROOT / "src/app/opengraph-image.jpg", ROOT / "src/app/twitter-image.jpg"]

W, H = 1200, 630
DEEP = (44, 45, 111)  # --brand-deep
LIME = (237, 242, 181)  # --lime (the one accent)
CREAM = (247, 243, 232)  # --cream

# Copy: keep in step with src/lib/site.ts (EVENT_DATES, EVENT_PLACE).
EYEBROW = "GEN M EXPLORER"
HEADLINE = ["Walk the beach", "before you", "get there"]
FOOTER = "13–15 Nov 2026 · Kozhikode Beach"


def main() -> None:
    art = Image.open(MAP).convert("RGB")
    # Keep 1200:630 from the full-width art; the sea and beach sit at the top.
    crop_h = round(art.width * H / W)
    top = 60
    art = art.crop((0, top, art.width, top + crop_h)).resize((W, H), Image.LANCZOS)

    # Navy band on the left fading out by ~75% of the width, so the text has a
    # calm ground and the map still reads on the right.
    shade = Image.new("L", (W, H))
    px = shade.load()
    for x in range(W):
        t = x / W
        if t <= 0.42:
            alpha = 0.94
        elif t >= 0.78:
            alpha = 0.0
        else:
            alpha = 0.94 * (1 - (t - 0.42) / 0.36) ** 1.6
        value = round(alpha * 255)
        for y in range(H):
            px[x, y] = value
    art = Image.composite(Image.new("RGB", (W, H), DEEP), art, shade)

    draw = ImageDraw.Draw(art)
    eyebrow_font = ImageFont.truetype(str(FONT_CONDENSED), 30)
    headline_font = ImageFont.truetype(str(FONT_MEDIUM), 80)
    footer_font = ImageFont.truetype(str(FONT_CONDENSED), 38)

    x = 72
    # Eyebrow pill in the accent colour.
    tracking = 4
    text_w = sum(draw.textlength(ch, font=eyebrow_font) + tracking for ch in EYEBROW) - tracking
    pill_top = 118
    draw.rounded_rectangle(
        (x, pill_top, x + text_w + 44, pill_top + 52), radius=26, fill=LIME
    )
    cx = x + 22
    for ch in EYEBROW:
        draw.text((cx, pill_top + 11), ch, font=eyebrow_font, fill=DEEP)
        cx += draw.textlength(ch, font=eyebrow_font) + tracking

    y = 206
    for line in HEADLINE:
        draw.text((x, y), line, font=headline_font, fill=CREAM)
        y += 86

    draw.text((x, y + 36), FOOTER, font=footer_font, fill=LIME)

    for path in OUTPUTS:
        art.save(path, "JPEG", quality=84, optimize=True, progressive=True)
        print(path.relative_to(ROOT), path.stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
