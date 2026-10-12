"""Register Eula's sword-directed frost cast without changing raster pixels.

This intentionally writes one standalone AnimationClip only; the integration
owner selects it in the active manifest. All twelve existing timings and phases
come from the preserved v6 secondary.json. Anatomical standing height is fixed
across the full sequence. Weapon bounds never set per-frame character scale.

Connected-component labeling follows the existing register-eula-v6.py contract:
https://docs.opencv.org/4.x/d3/dc0/group__imgproc__shape.html
"""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / "public/assets/animations/eula-v6"
IMAGE = PACK / "secondary-swordcast-v7.png"
OUTPUT = IMAGE.with_suffix(".json")
# Baselines are the supporting boot contours, not a cape or the long blade.
# X is the midpoint between the two supporting boots; y is the shared floor.
FOOT_POINTS = [
    (227.5, 326), (648.75, 325), (1069, 325), (1487, 325),
    (185, 590), (610.5, 590), (1041.75, 590), (1456, 594),
    (210.25, 883), (620.75, 883), (1032.75, 883), (1464.75, 883),
]
# Inspected solid blue-white blade endpoints. The soft outer ice particles are
# deliberately excluded from the spell emitter, especially in frames 5-8.
TIP_POINTS = [
    (43, 308), (440, 320), (869, 321), (1274, 310),
    (431, 454), (859, 455), (1280, 455), (1667, 455),
    (417, 854), (829, 868), (1251, 870), (1666, 874),
]
# Upright first pose: hair crown y75 to boot floor y326 =251px.
# Upright last pose: y634 to y883 =249px. Use their mean for the entire clip.
STANDING_BODY_HEIGHT = 250


def main():
    before_hash = hashlib.sha256(IMAGE.read_bytes()).hexdigest()
    with Image.open(IMAGE) as opened:
        assert opened.mode == "RGBA", "Expected real transparent RGBA"
        rgba = np.asarray(opened)
    height, width = rgba.shape[:2]
    assert (width, height) == (1684, 934)
    alpha = rgba[:, :, 3]
    count, labels, stats, centers = cv2.connectedComponentsWithStats(
        (alpha > 32).astype("uint8"), 8
    )
    bodies = [i for i in range(1, count) if stats[i, 4] > 1000]
    assert len(bodies) == 12, ("Expected twelve separated full sprites", len(bodies))
    bodies.sort(key=lambda i: centers[i, 1])
    bodies = sum(
        [sorted(bodies[row:row + 4], key=lambda i: centers[i, 0]) for row in range(0, 12, 4)],
        [],
    )
    original = json.loads((PACK / "secondary.json").read_text(encoding="utf-8"))
    clip = copy.deepcopy(original)
    clip.update(
        image=IMAGE.name, width=width, height=height,
        standingBodyHeightPixels=STANDING_BODY_HEIGHT,
    )
    report = []
    for index, (frame, component, foot, tip) in enumerate(
        zip(clip["frames"], bodies, FOOT_POINTS, TIP_POINTS, strict=True)
    ):
        x, y, w, h = map(int, stats[component, :4])
        left, top, right, bottom = x - 5, y - 5, x + w + 5, y + h + 5
        left = min(left, int(np.floor(foot[0])) - 5)
        top = min(top, int(np.floor(foot[1])) - 5)
        right = max(right, int(np.ceil(foot[0])) + 5)
        bottom = max(bottom, int(np.ceil(foot[1])) + 5)
        # Preserve all antialiasing that actually intersects the crop plus the
        # three-pixel renderer guard, while leaving disconnected stray mist out.
        for _ in range(12):
            assert 0 <= left < right <= width and 0 <= top < bottom <= height
            mask = alpha[top:bottom, left:right] > 32
            grow = (
                bool(mask[:, :3].any()), bool(mask[:3, :].any()),
                bool(mask[:, -3:].any()), bool(mask[-3:, :].any()),
            )
            if not any(grow):
                break
            left -= 2 if grow[0] else 0
            top -= 2 if grow[1] else 0
            right += 2 if grow[2] else 0
            bottom += 2 if grow[3] else 0
        else:
            raise AssertionError((index, "Could not establish transparent crop guard"))
        rect = dict(x=left, y=top, width=right - left, height=bottom - top)
        frame["sourceRect"] = rect
        frame["footAnchor"] = dict(
            x=round((foot[0] - left) / rect["width"], 8),
            y=round((foot[1] - top) / rect["height"], 8),
        )
        frame["weaponTip"] = dict(x=tip[0] - left, y=tip[1] - top)
        assert alpha[tip[1], tip[0]] >= 128, (index, "Emitter must land on solid blade")
        assert all(0 <= value <= 1 for value in frame["footAnchor"].values())
        assert 0 <= frame["weaponTip"]["x"] < rect["width"]
        assert 0 <= frame["weaponTip"]["y"] < rect["height"]
        neighbor_ids = set(map(int, np.unique(labels[top:bottom, left:right])))
        assert not (neighbor_ids & (set(bodies) - {component})), (index, "Crop contains neighboring body")
        ys, xs = np.where(alpha[top:bottom, left:right] > 32)
        gutter = int(min(xs.min(), ys.min(), rect["width"] - 1 - xs.max(), rect["height"] - 1 - ys.max()))
        assert gutter >= 3, (index, gutter)
        for previous in clip["frames"][:index]:
            a, b = previous["sourceRect"], rect
            assert (
                a["x"] + a["width"] <= b["x"] or b["x"] + b["width"] <= a["x"]
                or a["y"] + a["height"] <= b["y"] or b["y"] + b["height"] <= a["y"]
            ), (index, "Overlapping crops")
        assert {
            k: v for k, v in frame.items()
            if k not in ("sourceRect", "footAnchor", "weaponTip")
        } == {
            k: v for k, v in original["frames"][index].items()
            if k not in ("sourceRect", "footAnchor", "weaponTip")
        }, (index, "Animation timing/schema changed")
        report.append(dict(
            frame=index + 1, name=frame["name"], phase=frame["phase"],
            duration=frame["duration"], sourceRect=rect,
            footAbsolute=list(foot), weaponTipAbsolute=list(tip),
            tipAlpha=int(alpha[tip[1], tip[0]]), minimumAlpha32GutterPx=gutter,
        ))
    assert clip["trail"] == original["trail"] == "none"
    assert sum(frame["duration"] for frame in clip["frames"]) == 44
    assert hashlib.sha256(IMAGE.read_bytes()).hexdigest() == before_hash
    OUTPUT.write_text(json.dumps(clip, indent=2) + "\n", encoding="utf-8")
    validation = dict(
        image=str(IMAGE.relative_to(ROOT)).replace("\\", "/"),
        metadata=str(OUTPUT.relative_to(ROOT)).replace("\\", "/"),
        generator="built-in image_gen", width=width, height=height,
        sha256=before_hash, bytes=IMAGE.stat().st_size, mode="RGBA",
        transparentPercent=round(float(np.mean(alpha == 0)) * 100, 3),
        frames=12, ticks=44, standingBodyHeightPixels=STANDING_BODY_HEIGHT,
        sourceScale="unchanged; no per-frame body resizing",
        imageUnchanged=True, minimumAlpha32GutterPx=min(r["minimumAlpha32GutterPx"] for r in report),
        registration=report,
    )
    (ROOT / "docs/eula-swordcast-v7-validation.json").write_text(
        json.dumps(validation, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps({k: v for k, v in validation.items() if k != "registration"}, indent=2))


if __name__ == "__main__":
    main()
