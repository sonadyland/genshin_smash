"""Read-only raster audit and metadata registration for Tharja's Flux sample.

Source PNGs are copied verbatim from built-in image_gen. This script never
resizes, repaints, removes backgrounds, or saves image pixels. Every sheet has
one standing-height calibration; only the crop and supporting-foot pivot vary.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / "public/previews/tharja-v1"
SHEETS = ("jab-a", "jab-b", "jab-c")
BODY_HEIGHTS = (540, 552, 562)
# Midpoints of the two supporting shoe contours in their 627px cells.
# The cape's bounds do not participate in centering.
PIVOTS = (
    (367.75, 598), (331.25, 598), (368.25, 583), (332.75, 583),
    (374.5, 610), (341.25, 610), (377.25, 591), (339.25, 590),
    (375.5, 615), (334.25, 615), (375, 595), (331.75, 594),
)
DURATIONS = (70, 80, 90, 90, 65, 100, 60, 70, 75, 85, 95, 120)
NAMES = (
    "书页待势", "抬腕引符", "收指凝咒", "收肘蓄势",
    "前送施法手", "展掌放咒", "腕指随势", "收肘回卷",
    "手回书前", "翻腕向页", "重心归位", "回到待势",
)
PHASES = ("引咒",) * 4 + ("前送", "释放", "释放") + ("回收",) * 5
APPROVED_SHA256 = (
    "4c8412ab2e9a515e489376f6109b736a0131cc2c70929fd5b4b2d1bd7662ceb9",
    "a08af7f3c0f54d7f3c1a1ec30da1c604061aa34f6a4c42a8d88d585a7a984163",
    "e64b12d989c721b78bd70e6afb06ca67ede5e8b2a914765eaaf71d84031a997e",
)


def main():
    frames = []
    reports = []
    for sheet, name in enumerate(SHEETS):
        path = PREVIEW / "assets" / f"{name}.png"
        before = hashlib.sha256(path.read_bytes()).hexdigest()
        with Image.open(path) as image:
            assert image.mode == "RGBA" and image.size == (1254, 1254)
            rgba = np.asarray(image)
        alpha = rgba[:, :, 3]
        assert int(alpha.min()) == 0 and int(alpha.max()) == 255
        red = (rgba[:, :, 0] > 180) & (rgba[:, :, 1] < 90) & (rgba[:, :, 2] < 90)
        red_alpha = alpha[red]
        per_frame = []
        for local in range(4):
            index = sheet * 4 + local
            x, y = local % 2 * 627, local // 2 * 627
            crop = alpha[y:y + 627, x:x + 627]
            ys, xs = np.where(crop > 32)
            bounds = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
            gutter = min(bounds[0], bounds[1], 626 - bounds[2], 626 - bounds[3])
            assert gutter >= 10, (name, local, bounds)
            frame = dict(
                sheet=sheet, name=NAMES[index], rect=[x, y, 627, 627],
                pivot=list(PIVOTS[index]), durationMs=DURATIONS[index], phase=PHASES[index],
            )
            # B2: measured center of the outward-facing right palm, not the
            # book, a cape edge, a projected point, or any transparent glow.
            if index == 5:
                frame["castOrigin"] = [504, 182]
                assert int(crop[182, 504]) >= 128
            assert 0 <= frame["pivot"][0] < 627 and 0 <= frame["pivot"][1] < 627
            frames.append(frame)
            per_frame.append(dict(
                index=index, alpha32Bounds=bounds, minimumAlpha32Gutter=gutter,
                footPivot=frame["pivot"], castOrigin=frame.get("castOrigin"),
                castOriginAlpha=int(crop[182, 504]) if index == 5 else None,
            ))
        assert hashlib.sha256(path.read_bytes()).hexdigest() == before
        source_match = before == APPROVED_SHA256[sheet]
        assert source_match, (name, 'approved source SHA-256 mismatch')
        reports.append(dict(
            file=f"assets/{name}.png", source=path.relative_to(ROOT).as_posix(), width=1254, height=1254,
            mode="RGBA", bytes=path.stat().st_size, sha256=before,
            sourceCopiedByteForByte=source_match, imageUnchanged=True,
            standingBodyHeight=BODY_HEIGHTS[sheet],
            transparentPixels=int(np.count_nonzero(alpha == 0)),
            redResidualPixels=int(red.sum()),
            redResidualMaximumAlpha=int(red_alpha.max()) if len(red_alpha) else 0,
            redPixelsWithAlphaAbove16=int(np.count_nonzero(red_alpha > 16)),
            frames=per_frame,
        ))
    assert len(frames) == 12 and sum(DURATIONS) == 1000
    clip = dict(
        id="jab", title="暗流咒击 · Flux",
        sheets=[dict(src=f"./assets/{name}.png", standingBodyHeight=BODY_HEIGHTS[i]) for i, name in enumerate(SHEETS)],
        frames=frames, releaseFrame=5, loop=True, restMs=500,
        note="一次完整远程普攻：书页引咒、右掌前送、放咒和回收；人物保持原地承重，法球在独立预览层从右掌发射。动作样板时序不代表未来正式战斗硬直。",
    )
    (PREVIEW / "jab.json").write_text(json.dumps(clip, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    validation = dict(
        generator="built-in image_gen", rasterEdits=False, frameCount=12,
        durationMs=1000, restMs=500, releaseFrame=5,
        calibration="One fixed standing-body height per four-frame sheet; no per-frame scale or axis distortion.",
        sheets=reports,
    )
    (PREVIEW / "jab-validation.json").write_text(json.dumps(validation, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(dict(
        frames=len(frames), durationMs=1000, releaseFrame=5,
        palmAlpha=reports[1]["frames"][1]["castOriginAlpha"],
        bytes=sum(r["bytes"] for r in reports),
        minimumGutter=min(f["minimumAlpha32Gutter"] for r in reports for f in r["frames"]),
        sourcesUnchanged=all(r["imageUnchanged"] for r in reports),
    ), indent=2))


if __name__ == "__main__":
    main()
