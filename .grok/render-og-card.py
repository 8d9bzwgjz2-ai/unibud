#!/usr/bin/env python3
"""Compose the UNIBUD share card at 2x, then the caller downscales to 1200x630."""

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

S = 2
LW, LH = 1200, 630
W, H = LW * S, LH * S

NAVY = (7, 17, 31)
SURFACE = (12, 23, 40)
ELEVATED = (17, 31, 51)
LINE = (36, 52, 75)
ACCENT = (67, 139, 255)
BONE = (242, 246, 252)
MUTED = (164, 178, 197)

FONTS = Path("/workspace/.grok/fonts")
SANS_700 = ImageFont.truetype(FONTS / "DMSans-normal-700.ttf", 164 * S)
SANS_600 = ImageFont.truetype(FONTS / "DMSans-normal-600.ttf", 26 * S)
SANS_500 = ImageFont.truetype(FONTS / "DMSans-normal-500.ttf", 22 * S)
SANS_ITEM = ImageFont.truetype(FONTS / "DMSans-normal-500.ttf", 18 * S)
MONO = ImageFont.truetype(FONTS / "DMMono-normal-500.ttf", 12 * S)
SERIF = ImageFont.truetype(FONTS / "PlayfairDisplay-normal-600.ttf", 40 * S)


def px(n: float) -> int:
    return int(round(n * S))


def text_size(text: str, font: ImageFont.FreeTypeFont, tracking: float = 0) -> tuple[float, float]:
    if not text:
        return 0.0, 0.0
    width = sum(font.getlength(ch) for ch in text) + tracking * (len(text) - 1)
    bbox = font.getbbox(text)
    height = bbox[3] - bbox[1]
    return width, height


def draw_tracked(draw: ImageDraw.ImageDraw, x: float, y: float, text: str, font, fill, tracking: float = 0):
    for ch in text:
        draw.text((x, y), ch, font=font, fill=fill)
        x += font.getlength(ch) + tracking
    return x


def background() -> Image.Image:
    yy, xx = np.mgrid[0:H, 0:W]
    cx, cy = (LW - 268) / 2 * S, LH * 0.48 * S
    rx, ry = W * 0.42, H * 0.62
    dist = np.sqrt(((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2)
    dist = np.clip(dist, 0, 1)
    dist = dist ** 1.15
    c0 = np.array([14, 26, 46], dtype=np.float32)
    c1 = np.array(NAVY, dtype=np.float32)
    arr = c0 * (1 - dist)[..., None] + c1 * dist[..., None]
    return Image.fromarray(arr.astype(np.uint8), "RGB")


def main() -> None:
    img = background().convert("RGBA")
    draw = ImageDraw.Draw(img)

    drawer_w = px(268)
    drawer_x = W - drawer_w

    # Soft shadow just left of the Guild drawer.
    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    sd = ImageDraw.Draw(shadow)
    sd.rectangle([drawer_x - px(18), 0, drawer_x + px(8), H], fill=(0, 0, 0, 90))
    shadow = shadow.filter(ImageFilter.GaussianBlur(px(18)))
    img = Image.alpha_composite(img, shadow)
    draw = ImageDraw.Draw(img)

    draw.rectangle([drawer_x, 0, W, H], fill=SURFACE + (255,))
    draw.line([(drawer_x, 0), (drawer_x, H)], fill=LINE + (255,), width=max(1, S))

    # Guild drawer contents. Lettering stays well inside the panel.
    pad_x = px(22)
    label = "GUILD"
    label_track = px(2.4)
    label_w, label_h = text_size(label, MONO, label_track)
    label_x = drawer_x + pad_x
    label_y = px(36)
    draw_tracked(draw, label_x, label_y, label, MONO, MUTED, label_track)
    rule_y = label_y + label_h + px(14)
    draw.line(
        [(label_x, rule_y), (W - pad_x, rule_y)],
        fill=LINE + (255,),
        width=max(1, S),
    )

    items = ["The Quarter", "Concierge", "Board"]
    row_top = rule_y + px(22)
    row_h = px(64)
    icon = px(36)
    for index, name in enumerate(items):
        y = row_top + index * (row_h + px(10))
        row_box = [label_x, y, W - pad_x, y + row_h]
        if index == 0:
            draw.rounded_rectangle(row_box, radius=px(12), fill=ELEVATED + (255,))
            draw.rounded_rectangle(
                [label_x, y, label_x + px(3), y + row_h],
                radius=px(2),
                fill=ACCENT + (255,),
            )
        ix = label_x + px(14)
        iy = y + (row_h - icon) // 2
        draw.rounded_rectangle(
            [ix, iy, ix + icon, iy + icon],
            radius=px(10),
            fill=((26, 58, 107) if index == 0 else (14, 26, 46)) + (255,),
        )
        # Flat geometric marks, no pictorial marketplace icons.
        cx = ix + icon / 2
        cy = iy + icon / 2
        if index == 0:
            s = px(7)
            gap = px(3)
            for col in (0, 1):
                for row in (0, 1):
                    x0 = cx - s - gap / 2 + col * (s + gap)
                    y0 = cy - s - gap / 2 + row * (s + gap)
                    draw.rounded_rectangle([x0, y0, x0 + s, y0 + s], radius=px(1.5), fill=ACCENT + (255,))
        elif index == 1:
            r = px(7)
            draw.ellipse([cx - r, cy - r - px(2), cx + r, cy + r - px(2)], outline=ACCENT + (255,), width=px(2))
            draw.arc(
                [cx - px(8), cy + px(1), cx + px(8), cy + px(12)],
                start=200,
                end=340,
                fill=ACCENT + (255,),
                width=px(2),
            )
        else:
            for offset in (-px(6), 0, px(6)):
                draw.rounded_rectangle(
                    [cx - px(8), cy + offset - px(1.2), cx + px(8), cy + offset + px(1.2)],
                    radius=px(1),
                    fill=ACCENT + (255,),
                )
        nw, nh = text_size(name, SANS_ITEM, 0)
        bbox = SANS_ITEM.getbbox(name)
        tx = ix + icon + px(12)
        ty = y + (row_h - (bbox[3] - bbox[1])) / 2 - bbox[1]
        draw.text((tx, ty), name, font=SANS_ITEM, fill=BONE + (255,))

    # Centered lockup in the open campus column, clear of the drawer.
    main_right = drawer_x - px(36)
    main_left = px(64)
    center_x = (main_left + main_right) / 2

    mark = px(66)
    title = "UNIBUD"
    title_track = px(-1.6)
    tagline = "Learn. Connect. Grow."
    destinations = ["Square", "Connect", "Quad", "Chat"]

    title_w, title_h = text_size(title, SANS_700, title_track)
    tag_w, tag_h = text_size(tagline, SANS_600, 0)
    dest_gap = px(28)
    dot = px(4)
    dest_widths = [text_size(name, SANS_500, 0)[0] for name in destinations]
    dest_row_w = sum(dest_widths) + dest_gap * (len(destinations) - 1)

    stack_h = mark + px(20) + title_h + px(18) + px(3) + px(18) + tag_h + px(30) + px(24)
    top = (H - stack_h) / 2

    mark_x = center_x - mark / 2
    mark_y = top
    draw.rounded_rectangle(
        [mark_x, mark_y, mark_x + mark, mark_y + mark],
        radius=px(16),
        fill=ACCENT + (255,),
    )
    # Optical center for the Playfair "u".
    ubox = SERIF.getbbox("u")
    uw, uh = ubox[2] - ubox[0], ubox[3] - ubox[1]
    draw.text(
        (mark_x + (mark - uw) / 2 - ubox[0], mark_y + (mark - uh) / 2 - ubox[1] - px(1)),
        "u",
        font=SERIF,
        fill=BONE + (255,),
    )

    title_bbox = SANS_700.getbbox(title)
    title_x = center_x - title_w / 2
    title_y = mark_y + mark + px(20) - title_bbox[1]
    draw_tracked(draw, title_x, title_y, title, SANS_700, BONE, title_track)

    rule_w = px(48)
    rule_top = title_y + title_bbox[3] + px(18)
    draw.rounded_rectangle(
        [center_x - rule_w / 2, rule_top, center_x + rule_w / 2, rule_top + px(3)],
        radius=px(2),
        fill=ACCENT + (255,),
    )

    tag_bbox = SANS_600.getbbox(tagline)
    tag_x = center_x - tag_w / 2
    tag_y = rule_top + px(3) + px(18) - tag_bbox[1]
    draw.text((tag_x, tag_y), tagline, font=SANS_600, fill=MUTED + (255,))

    dest_y_mid = tag_y + tag_bbox[3] + px(30) + px(12)
    cursor = center_x - dest_row_w / 2
    for index, name in enumerate(destinations):
        bbox = SANS_500.getbbox(name)
        draw.text((cursor, dest_y_mid - (bbox[3] - bbox[1]) / 2 - bbox[1]), name, font=SANS_500, fill=BONE + (255,))
        cursor += dest_widths[index]
        if index < len(destinations) - 1:
            dot_x = cursor + dest_gap / 2
            draw.ellipse(
                [dot_x - dot / 2, dest_y_mid - dot / 2, dot_x + dot / 2, dest_y_mid + dot / 2],
                fill=ACCENT + (255,),
            )
            cursor += dest_gap

    # Margin report in logical pixels.
    samples = {
        "mark": (mark_x, mark_y, mark_x + mark, mark_y + mark),
        "title": (title_x, title_y + title_bbox[1], title_x + title_w, title_y + title_bbox[3]),
        "tag": (tag_x, tag_y + tag_bbox[1], tag_x + tag_w, tag_y + tag_bbox[3]),
    }
    print("canvas", W, H)
    print("title_w_logical", round(title_w / S, 1), "of", LW)
    for key, box in samples.items():
        l, t, r, b = [v / S for v in box]
        print(f"{key}: L{l:.1f} T{t:.1f} R{LW-r:.1f} B{LH-b:.1f} drawer_gap {((drawer_x)/S) - r:.1f}")

    out = Path("/workspace/.grok/card-raw.png")
    img.convert("RGB").save(out, "PNG")
    print("wrote", out, out.stat().st_size)


if __name__ == "__main__":
    main()
