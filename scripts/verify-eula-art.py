"""Read-only validation for generated character v4 atlases and their registration metadata.

Requires Pillow. Never rewrites, resizes, crops to disk, or otherwise changes art.
Run: python scripts/verify-eula-art.py [eula raiden jean diluc xiao]
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
ASSET_ROOT = ROOT / "public/assets/animations"
CHARACTERS = ("eula", "raiden", "jean", "diluc", "xiao")
EXPECTED = {"idle": 4, "run": 8, "jump": 8, "dodge": 4, "jab": 8, "smash": 8, "special": 12, "secondary": 12}
VARIANTS = {"jab": 8, "smash": 8}
PHASES = ("windup", "contact", "followthrough", "recover")


def verify(character: str) -> dict:
    assets = ASSET_ROOT / f"{character}-v4"
    manifest_path = assets / "manifest.json"
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["character"] == character
    assert set(manifest["clips"]) == set(EXPECTED)
    assert set(manifest["variants"]) == set(VARIANTS)
    reports = []
    entries = [(name, count, manifest["clips"][name], False) for name, count in EXPECTED.items()]
    entries += [(name, count, manifest["variants"][name], True) for name, count in VARIANTS.items()]
    for name, expected_count, clip, variant in entries:
        image_path = assets / clip["image"]
        with Image.open(image_path) as image:
            assert image.mode == "RGBA", (name, "Expected real RGBA")
            assert image.size == (clip["width"], clip["height"]), (name, image.size)
            assert 0 < clip["standingBodyHeightPixels"] <= max(image.size)
            frames = clip["frames"]
            assert len(frames) == expected_count, (name, len(frames))
            alpha = image.getchannel("A")
            transparent = alpha.histogram()[0] / (image.width * image.height)
            assert transparent > 0.30, (name, "Insufficient transparent background")
            fingerprints = set()
            min_gutters = []
            for index, frame in enumerate(frames):
                rect = frame["sourceRect"]
                x, y, width, height = (rect[key] for key in ("x", "y", "width", "height"))
                assert all(isinstance(v, int) for v in (x, y, width, height)), (name, index, "Integer rect required")
                assert x >= 0 and y >= 0 and width > 0 and height > 0
                assert x + width <= image.width and y + height <= image.height
                anchor = frame["footAnchor"]
                assert all(0 <= anchor[axis] <= 1 for axis in ("x", "y")), (name, index, anchor)
                assert frame.get("duration", 1) > 0
                # Crop only in memory for analysis; no raster is saved or altered.
                source = image.crop((x, y, x + width, y + height))
                fingerprints.add(hashlib.sha256(source.tobytes()).hexdigest())
                bounds = source.getchannel("A").point(lambda a: 255 if a >= 128 else 0).getbbox()
                assert bounds is not None, (name, index, "Empty frame")
                gutter = min(bounds[0], bounds[1], width - bounds[2], height - bounds[3])
                assert gutter >= 1, (name, index, "Opaque content clipped by source rect")
                min_gutters.append(gutter)
                if "weaponTip" in frame:
                    assert 0 <= frame["weaponTip"]["x"] <= width
                    assert 0 <= frame["weaponTip"]["y"] <= height
            assert len(fingerprints) == expected_count, (name, "Exact duplicate frames")
            if character == "xiao" and name == "special":
                assert all(frame.get("name") == ("windup", "dive", "impact", "recover")[PHASES.index(frame["phase"])] for frame in frames)
            if name in ("jab", "smash", "special", "secondary"):
                phase_indices = [PHASES.index(frame["phase"]) for frame in frames]
                assert phase_indices == sorted(phase_indices), (name, "Attack phases must stay ordered")
                assert set(phase_indices) == set(range(4)), (name, "Every attack phase must exist")
                expected_ticks = {"jab": 26, "smash": 63, "special": 56, "secondary": 44}
                if character == "eula" and not variant:
                    assert sum(frame["duration"] for frame in frames) == expected_ticks[name], (name, "Attack timing changed")
            reports.append({"image": clip["image"], "clip": name, "variant": variant, "frames": len(frames), "size": list(image.size),
                            "transparentPercent": round(transparent * 100, 2),
                            "minimumOpaqueGutterPx": min(min_gutters),
                            "standingBodyHeightPixels": clip["standingBodyHeightPixels"],
                            "sha256": hashlib.sha256(image_path.read_bytes()).hexdigest()})
    unique_atlases = {report["image"]: report["size"] for report in reports}
    return {"character": character, "ok": True, "baseFrames": sum(EXPECTED.values()), "variantFrames": sum(VARIANTS.values()),
            "totalFrames": sum(EXPECTED.values()) + sum(VARIANTS.values()), "uniqueAtlases": len(unique_atlases),
            "decodedRgbaMiB": round(sum(w * h * 4 for w, h in unique_atlases.values()) / 1048576, 2), "atlases": reports}


def main() -> None:
    characters = sys.argv[1:] or list(CHARACTERS)
    assert all(character in CHARACTERS for character in characters), "Unknown character id"
    reports = [verify(character) for character in characters]
    print(json.dumps({"ok": True, "totalFrames": sum(report["totalFrames"] for report in reports), "characters": reports}, indent=2))


if __name__ == "__main__":
    main()
