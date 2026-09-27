"""Render editable 30-second Teumpick concept-film scene plates.

All app text and colors are taken from the current app sources. The locker is a
single canonical AI image reused as-is; only the selected door is illustrated
open for the pickup beat. The hardware flow is explicitly marked as a concept.
"""

from __future__ import annotations

import math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter, ImageFont, ImageOps

ROOT = Path(__file__).resolve().parent
ASSETS = ROOT / "assets"
SCENES = ROOT / "scenes"
SCENES.mkdir(exist_ok=True)
W, H = 1080, 1920
GREEN = (8, 127, 84)
DARK = (24, 43, 35)
MUTED = (113, 128, 120)
PALE = (239, 246, 241)
BG = (248, 250, 248)
FONT_REG = r"C:\Windows\Fonts\malgun.ttf"
FONT_BOLD = r"C:\Windows\Fonts\malgunbd.ttf"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(FONT_BOLD if bold else FONT_REG, size)


def tx(draw, xy, value, size, fill=DARK, bold=False, anchor=None):
    draw.text(xy, value, font=font(size, bold), fill=fill, anchor=anchor)


def round_rect(draw, box, radius, fill, outline=None, width=1):
    draw.rounded_rectangle(box, radius=radius, fill=fill, outline=outline, width=width)


def cover(path: Path, size=(W, H)):
    image = Image.open(path).convert("RGB")
    return ImageOps.fit(image, size, Image.Resampling.LANCZOS, centering=(0.5, 0.5)).convert("RGBA")


def cutout(path: Path):
    image = Image.open(path).convert("RGBA")
    alpha = image.getchannel("A")
    # The generated assets have a faint transparent studio glow. Trim only
    # pixels that carry visible content, preserving antialiased edges.
    bbox = alpha.point(lambda x: 255 if x > 8 else 0).getbbox()
    return image.crop(bbox) if bbox else image


def paste_fit(base, image, x, y, width):
    height = round(image.height * width / image.width)
    resized = image.resize((width, height), Image.Resampling.LANCZOS)
    base.alpha_composite(resized, (x, y))
    return x, y, width, height


def vignette(base, opacity=120):
    g = Image.new("L", (1, H))
    gd = ImageDraw.Draw(g)
    for y in range(H):
        v = max(0, 1 - y / (H * 0.45))
        gd.point((0, y), fill=round(opacity * v))
    alpha = g.resize((W, H))
    layer = Image.new("RGBA", (W, H), (8, 28, 20, 0))
    layer.putalpha(alpha)
    base.alpha_composite(layer)


def scene_label(base, kicker, headline, detail=None, dark=False, bottom=False):
    draw = ImageDraw.Draw(base)
    y = 1495 if bottom else 116
    if dark:
        box = (48, y - 35, 1032, y + (330 if detail else 245))
        overlay = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        od = ImageDraw.Draw(overlay)
        od.rounded_rectangle(box, radius=30, fill=(7, 35, 26, 196))
        base.alpha_composite(overlay)
        draw = ImageDraw.Draw(base)
    fg = (255, 255, 255) if dark else DARK
    sub = (213, 237, 222) if dark else GREEN
    tx(draw, (80, y), kicker, 26, sub, True)
    for n, line in enumerate(headline.split("\n")):
        tx(draw, (80, y + 47 + n * 84), line, 60, fg, True)
    if detail:
        ty = y + 63 + len(headline.split("\n")) * 84
        tx(draw, (80, ty), detail, 29, (232, 240, 234) if dark else MUTED)


def concept_tag(base):
    draw = ImageDraw.Draw(base)
    round_rect(draw, (790, 1807, 1022, 1862), 20, (12, 65, 46, 225))
    tx(draw, (906, 1834), "보관함 콘셉트", 24, (255, 255, 255), True, "mm")


def logo(draw, x, y, scale=1.0, on_dark=False):
    s = scale
    green = (255, 255, 255) if on_dark else GREEN
    bx = (x, y, x + int(53 * s), y + int(53 * s))
    round_rect(draw, bx, int(14 * s), green)
    line = (255, 255, 255) if not on_dark else GREEN
    # Match public/favicon.svg (shopping bag and check mark).
    pt = lambda px, py: (x + px * s * 53 / 48, y + py * s * 53 / 48)
    path = [pt(14,18), pt(34,18), pt(36,38), pt(12,38), pt(14,18)]
    draw.line(path, fill=line, width=max(2, round(2.5*s)), joint="curve")
    draw.arc((pt(19,9)[0], pt(19,9)[1], pt(29,19)[0], pt(29,19)[1]), 180, 360, fill=line, width=max(2, round(2.5*s)))
    draw.line([pt(19,27), pt(23,31), pt(30,23)], fill=line, width=max(2, round(2.5*s)), joint="curve")
    tx(draw, (x + 66*s, y + 2*s), "틈픽", int(43*s), green, True)


def ui_base(active="주변 가게"):
    im = Image.new("RGBA", (390, 844), BG + (255,))
    d = ImageDraw.Draw(im)
    d.rectangle((0, 0, 390, 72), fill=(255, 255, 255))
    tx(d, (20, 21), "⌖  신도림역 ⌄", 20, DARK, True)
    d.ellipse((272, 20, 303, 51), fill=PALE)
    tx(d, (287, 35), "구", 13, GREEN, True, "mm")
    tx(d, (311, 18), "구매자", 12, DARK, True)
    tx(d, (311, 36), "둘러보기", 11, MUTED)
    d.rectangle((0, 72, 390, 105), fill=(232, 241, 235))
    tx(d, (20, 81), "게스트 체험 · 주문은 새로고침하면 초기화됩니다.", 11, MUTED)
    d.rectangle((0, 770, 390, 844), fill=(255, 255, 255))
    d.line((0, 770, 390, 770), fill=(224, 231, 226), width=1)
    tabs = ["주변 가게", "내 주문", "픽업존", "마이"]
    glyphs = ["▣", "▤", "⬡", "♙"]
    for i, (label, glyph) in enumerate(zip(tabs, glyphs)):
        cx = 49 + i * 98
        if label == active:
            round_rect(d, (i*98+4, 777, i*98+94, 836), 10, PALE)
        c = GREEN if label == active else MUTED
        tx(d, (cx, 789), glyph, 21, c, False, "mm")
        tx(d, (cx, 816), label, 11, c, label == active, "mm")
    return im


def ui_shops(salad):
    im = ui_base()
    d = ImageDraw.Draw(im)
    round_rect(d, (20, 124, 370, 169), 11, (232, 244, 235))
    tx(d, (34, 137), "내 주문을 저장하려면 회원가입하세요  →", 13, GREEN)
    tx(d, (22, 197), "오늘의 한 끼, 환승길에 픽업.", 23, DARK, True)
    tx(d, (22, 230), "기다림은 줄이고, 맛있는 일상은 챙기세요.", 13, MUTED)
    banner = ImageOps.fit(salad, (350, 146), Image.Resampling.LANCZOS)
    im.alpha_composite(banner.convert("RGBA"), (20, 280))
    shade = Image.new("RGBA", (350, 146), (7, 52, 37, 128))
    im.alpha_composite(shade, (20, 280))
    d = ImageDraw.Draw(im)
    tx(d, (39, 297), "역 밖으로 돌아가지 않아도", 18, (255, 255, 255), True)
    tx(d, (39, 325), "맛있는 한 끼가 기다려요.", 18, (255, 255, 255), True)
    tx(d, (22, 456), "신도림역 주변 가게", 21, DARK, True)
    tx(d, (229, 460), "4", 15, GREEN, True)
    tx(d, (22, 489), "지금 주문 접수 중인 가게예요.", 12, MUTED)
    round_rect(d, (20, 521, 370, 568), 11, (255, 255, 255), (224, 231, 226))
    tx(d, (36, 535), "⌕  가게, 메뉴 검색", 15, (169, 178, 172))
    x = 20
    for label in ("전체", "한식", "샐러드", "샌드위치"):
        w = 55 if label == "전체" else 68 if label != "샌드위치" else 83
        round_rect(d, (x, 589, x+w, 623), 17, DARK if label == "전체" else (255,255,255), None if label == "전체" else (224,231,226))
        tx(d, (x+w/2, 606), label, 12, (255,255,255) if label == "전체" else DARK, False, "mm")
        x += w+8
    round_rect(d, (20, 644, 370, 761), 12, (255,255,255), (224,231,226))
    thumb = ImageOps.fit(salad, (112, 117), Image.Resampling.LANCZOS)
    im.alpha_composite(thumb.convert("RGBA"), (20, 644))
    d = ImageDraw.Draw(im)
    tx(d, (146, 656), "그린테이블", 18, DARK, True)
    tx(d, (146, 684), "그릴드 치킨 샐러드", 13, MUTED)
    tx(d, (146, 709), "약 15분 후 픽업", 12, GREEN)
    tx(d, (146, 735), "10,900원부터", 15, DARK, True)
    return im


def ui_cart():
    im = ui_base()
    # App's cart is a white overlay/modal above the shop screen.
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((12, 15, 378, 830), radius=18, fill=(255,255,255))
    tx(d, (348, 27), "×", 27, DARK, False, "mm")
    tx(d, (195, 59), "▣", 23, GREEN, False, "mm")
    tx(d, (195, 101), "장바구니", 25, DARK, True, "mm")
    tx(d, (195, 161), "그린테이블 · 신도림역 픽업", 13, MUTED, False, "mm")
    tx(d, (55, 225), "그릴드 치킨 샐러드", 19, DARK, True)
    tx(d, (302, 225), "삭제", 13, GREEN)
    tx(d, (55, 268), "10,900원 / 개", 13, MUTED)
    round_rect(d, (180, 264, 299, 309), 9, (255,255,255), (224,231,226))
    tx(d, (239, 286), "−       1       +", 15, DARK, False, "mm")
    tx(d, (283, 329), "10,900원", 16, DARK, True, "ra")
    d.line((54, 370, 336, 370), fill=(224,231,226))
    round_rect(d, (36, 392, 354, 444), 11, (255,255,255), (224,231,226))
    tx(d, (195, 417), "메뉴 더 담기", 15, DARK, True, "mm")
    tx(d, (53, 513), "가게에 요청할 내용", 14, DARK, True)
    round_rect(d, (53, 545, 337, 602), 10, (255,255,255), (224,231,226))
    tx(d, (67, 563), "예: 음료 얼음은 적게 넣어 주세요", 13, (158,167,160))
    d.line((53, 645, 337, 645), fill=(224,231,226))
    tx(d, (53, 669), "총 1개 · 주문 합계", 17, DARK)
    tx(d, (335, 669), "10,900원", 18, DARK, True, "ra")
    tx(d, (53, 709), "약 15분 후 픽업 예상 · 보관함 1칸 배정", 12, MUTED)
    tx(d, (53, 731), "시범 주문이며 실제 결제되지 않습니다.", 12, MUTED)
    round_rect(d, (35, 780, 355, 826), 10, GREEN)
    tx(d, (195, 802), "10,900원 · 한 번에 시범 주문하기", 14, (255,255,255), True, "mm")
    return im


def ui_order(salad):
    im = ui_base("내 주문")
    d = ImageDraw.Draw(im)
    tx(d, (22, 135), "내 주문", 27, DARK, True)
    tx(d, (22, 174), "준비부터 수령까지, 여기서 확인하세요.", 13, MUTED)
    round_rect(d, (18, 215, 372, 715), 17, (255,255,255), (224,231,226))
    round_rect(d, (36, 235, 111, 267), 14, (227,245,233))
    tx(d, (73, 250), "입고 완료", 12, GREEN, True, "mm")
    tx(d, (330, 250), "#T7P203", 11, MUTED, False, "ra")
    thumb = ImageOps.fit(salad, (78, 78), Image.Resampling.LANCZOS)
    im.alpha_composite(thumb.convert("RGBA"), (36, 291))
    d = ImageDraw.Draw(im)
    tx(d, (128, 291), "그린테이블", 12, MUTED)
    tx(d, (128, 313), "그릴드 치킨 샐러드", 14, DARK, True)
    tx(d, (128, 342), "10,900원", 15, DARK, True)
    round_rect(d, (36, 394, 352, 477), 11, (239,246,241))
    tx(d, (53, 407), "신도림역 A존", 13, MUTED)
    tx(d, (53, 431), "03번 보관함", 24, GREEN, True)
    tx(d, (45, 506), "주문 접수  ─  준비 중  ─  이동  ─  입고 완료", 11, GREEN)
    d.line((36, 547, 352, 547), fill=(224,231,226))
    tx(d, (39, 568), "지금 픽업할 수 있어요", 17, GREEN, True)
    tx(d, (39, 609), "수령 코드", 13, MUTED)
    tx(d, (39, 636), "482913", 28, DARK, True)
    round_rect(d, (36, 668, 352, 702), 9, GREEN)
    tx(d, (194, 684), "수령 확인", 13, (255,255,255), True, "mm")
    return im


def place_phone(base, screen, x=200, y=310, width=680):
    scale = width / 390
    height = round(844 * scale)
    frame = Image.new("RGBA", (width+36, height+36), (0,0,0,0))
    fd = ImageDraw.Draw(frame)
    round_rect(fd, (0,0,width+35,height+35), 43, (18,47,37), (6,28,21), 3)
    screen_large = screen.resize((width, height), Image.Resampling.LANCZOS)
    mask = Image.new("L", (width,height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0,0,width-1,height-1), radius=28, fill=255)
    screen_large.putalpha(mask)
    frame.alpha_composite(screen_large, (18,18))
    shadow = Image.new("RGBA", frame.size, (0,0,0,0))
    shadow.putalpha(frame.getchannel("A").filter(ImageFilter.GaussianBlur(24)).point(lambda a: int(a*0.26)))
    base.alpha_composite(shadow, (x+16,y+25))
    base.alpha_composite(frame, (x,y))


def station_base():
    return cover(ASSETS / "station.png")


def locker_open_variant(locker):
    im = locker.copy()
    # First row, third door (03): only the door leaf changes; the housing,
    # dimensions, branding, keypad and all other doors remain identical.
    # Coordinates in the source render are translated into the trimmed cutout.
    ox, oy = 114, 61
    d = ImageDraw.Draw(im)
    d.rounded_rectangle((559-ox, 230-oy, 758-ox, 472-oy), radius=7, fill=(18, 38, 30, 255), outline=(7,83,58,255), width=5)
    d.rectangle((575-ox, 248-oy, 742-ox, 454-oy), fill=(38, 49, 43, 255))
    leaf = locker.crop((563-ox, 237-oy, 752-ox, 466-oy)).resize((73,229), Image.Resampling.LANCZOS)
    im.alpha_composite(leaf, (758-ox, 237-oy))
    d = ImageDraw.Draw(im)
    d.line((758-ox,239-oy,758-ox,462-oy), fill=(211,218,211), width=5)
    return im


def brand_locker(locker):
    """Paint the same fixed Teumpick sign and door numbers on every appearance."""
    im = locker.copy()
    d = ImageDraw.Draw(im)
    tx(d, (370, 78), "틈픽", 64, (255, 255, 255), True, "mm")
    for row in range(4):
        for col in range(3):
            number = row * 3 + col + 1
            tx(d, (34 + col * 213, 192 + row * 262), f"{number:02d}", 21, GREEN, True)
    return im


def scene1(station, woman, locker):
    im = station.copy()
    paste_fit(im, locker, 550, 660, 480)
    paste_fit(im, woman, -60, 620, 580)
    vignette(im, 180)
    scene_label(im, "TEUMPICK  ·  SMART PICKUP", "환승길에,\n한 끼가 필요할 때", "미리 주문하고 동선에서 픽업하세요", dark=True)
    concept_tag(im)
    return im


def scene2(salad):
    im = Image.new("RGBA", (W,H), BG+(255,))
    d = ImageDraw.Draw(im)
    logo(d, 70, 85, 1.1)
    scene_label(im, "01  ·  고르기", "역과 메뉴를\n앱에서 선택", None, False)
    place_phone(im, ui_shops(salad), 190, 420, 690)
    return im


def scene3():
    im = Image.new("RGBA", (W,H), (229,242,233,255))
    scene_label(im, "02  ·  주문하기", "이동하기 전에\n미리 주문", None, False)
    place_phone(im, ui_cart(), 190, 420, 690)
    return im


def scene4():
    im = cover(ASSETS / "seller-prep.png")
    vignette(im, 210)
    scene_label(im, "03  ·  가게에서 준비", "가게는 주문을 받고\n음식을 준비해요", None, True)
    return im


def scene5(station, woman, locker, salad):
    im = station.copy()
    paste_fit(im, locker, 515, 700, 535)
    paste_fit(im, woman, -65, 705, 560)
    vignette(im, 165)
    scene_label(im, "04  ·  역에서 확인", "도착하면 보관함과\n수령 코드를 확인", None, True)
    # Exact app palette and order wording; illustrated from current screen.
    card = ui_order(salad).crop((18,215,372,715)).resize((495,700), Image.Resampling.LANCZOS)
    card.putalpha(card.getchannel("A"))
    im.alpha_composite(card, (560, 1010))
    concept_tag(im)
    return im


def scene6(station, woman, locker):
    im = station.copy()
    paste_fit(im, locker, 455, 505, 620)
    paste_fit(im, woman, -170, 820, 625)
    vignette(im, 150)
    scene_label(im, "05  ·  보관함에서", "수령 코드 입력", "03번 보관함  ·  482913", True)
    concept_tag(im)
    return im


def scene7(station, woman, locker_open):
    im = station.copy()
    paste_fit(im, locker_open, 455, 505, 620)
    paste_fit(im, woman, -100, 810, 620)
    vignette(im, 170)
    scene_label(im, "06  ·  바로 픽업", "문이 열리면\n바로 찾아가요", "하드웨어 개방 장면은 콘셉트 연출입니다", True)
    concept_tag(im)
    return im


def scene8(station, woman, locker):
    im = station.copy()
    paste_fit(im, locker, 560, 770, 470)
    paste_fit(im, woman, -35, 735, 560)
    overlay = Image.new("RGBA", (W,H), (5,42,29,152))
    im.alpha_composite(overlay)
    d = ImageDraw.Draw(im)
    logo(d, 70, 110, 1.3, True)
    tx(d, (80, 340), "환승하는 틈에,", 68, (255,255,255), True)
    tx(d, (80, 445), "맛있는 한 끼.", 68, (255,255,255), True)
    tx(d, (82, 570), "틈픽  ·  미리 주문하고 환승길에 픽업", 30, (222,245,230))
    round_rect(d, (62, 1692, 1018, 1842), 26, (6,52,36,220))
    tx(d, (540, 1737), "제품 콘셉트 시연 영상", 28, (255,255,255), True, "mm")
    tx(d, (540, 1794), "실제 보관함과 문 개방 기능은 개발 예정", 26, (214,234,220), False, "mm")
    return im


def main():
    station = station_base()
    locker = brand_locker(cutout(ASSETS / "locker.png"))
    woman_phone = cutout(ASSETS / "commuter-phone.png")
    woman_keypad = cutout(ASSETS / "commuter-keypad.png")
    woman_bag = cutout(ASSETS / "commuter-bag.png")
    salad = Image.open(ASSETS / "salad.png").convert("RGB")
    shots = [
        scene1(station, woman_phone, locker),
        scene2(salad),
        scene3(),
        scene4(),
        scene5(station, woman_phone, locker, salad),
        scene6(station, woman_keypad, locker),
        scene7(station, woman_keypad, locker_open_variant(locker)),
        scene8(station, woman_bag, locker),
    ]
    for i, shot in enumerate(shots, 1):
        path = SCENES / f"{i:02d}.png"
        shot.convert("RGB").save(path, optimize=True)
        print(path)
    thumbs = [x.resize((270,480), Image.Resampling.LANCZOS) for x in shots]
    contact = Image.new("RGB", (1080,960), (255,255,255))
    for j, thumb in enumerate(thumbs):
        contact.paste(thumb.convert("RGB"), ((j%4)*270,(j//4)*480))
    contact.save(ROOT / "contact-sheet.png", optimize=True)


if __name__ == "__main__":
    main()
