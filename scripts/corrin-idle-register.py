"""Register original Corrin idle sheets without rewriting any image pixels."""
from pathlib import Path
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/previews/corrin-v1"


def alpha_bounds(path, rect=None):
    with Image.open(path) as source:
        image = source.crop(rect) if rect else source
        box = image.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
        return [box[0], box[1], box[2] - box[0], box[3] - box[1]]


def register_human():
    # Each source sheet has one fixed head-to-support-foot measurement.
    # Per-frame pivots only compensate grid-placement offsets, not body motion.
    clip = {
        "id": "human", "title": "人形 · 持剑静候", "status": "ready", "gameHeight": 112,
        "reference": {"src": "./assets/human-master.png", "width": 1254, "height": 1254,
                      "bodyHeight": 1131, "pivot": [630, 1199],
                      "bounds": alpha_bounds(OUT / "assets/human-master.png")},
        "sheets": [
            {"src": "./assets/human-idle-a.png", "width": 1254, "height": 1254, "bodyHeight": 492},
            {"src": "./assets/human-idle-b.png", "width": 1254, "height": 1254, "bodyHeight": 497},
        ],
        "frames": [],
        "note": "8 张真实动作帧；每表固定身体标尺，支撑脚落地。呼吸循环 2.2 秒，眨眼阶段短停留。",
    }
    pivots = [[330, 601], [304, 601], [330, 576], [304, 576], [330, 605], [304, 605], [330, 579], [304, 579]]
    durations = [480, 380, 65, 70, 85, 400, 380, 340]
    phases = ["安静呼吸", "胸肩轻提", "眨眼过渡", "短暂闭眼", "重新睁眼", "缓缓呼气", "衣摆回落", "自然归稳"]
    for index in range(8):
        sheet = index // 4
        cell = index % 4
        x, y = (cell % 2) * 627, (cell // 2) * 627
        rect = [x, y, 627, 627]
        bounds = alpha_bounds(OUT / clip["sheets"][sheet]["src"], (x, y, x + 627, y + 627))
        clip["frames"].append({"sheet": sheet, "rect": rect, "pivot": pivots[index], "bounds": bounds, "duration": durations[index], "phase": phases[index]})
    (OUT / "human-idle.json").write_text(json.dumps(clip, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def register_dragon():
    clip = {
        "id": "dragon", "title": "白龙 · 四足安定", "status": "ready", "gameHeight": 135,
        "reference": {"src": "./assets/dragon-master.png", "width": 1536, "height": 1024,
                      "bodyHeight": 950, "pivot": [850, 999],
                      "bounds": alpha_bounds(OUT / "assets/dragon-master.png")},
        "sheets": [
            {"src": "./assets/dragon-idle-a.png", "width": 1254, "height": 1254, "bodyHeight": 400},
            {"src": "./assets/dragon-idle-b.png", "width": 1254, "height": 1254, "bodyHeight": 403},
        ],
        "frames": [],
        "note": "8 张真实动作帧；每表固定角尖至前爪标尺，四足支撑不变。胸腹与颈部缓慢起伏，3 秒循环。",
    }
    pivots = [[320, 551], [336, 551], [320, 526], [336, 526], [320, 552], [334, 552], [320, 527], [334, 528]]
    durations = [600, 500, 80, 80, 100, 550, 500, 590]
    phases = ["四足静候", "缓慢吸气", "眼睑轻收", "呼吸峰值", "重新睁眼", "胸腹回落", "尾尖归稳", "回到静候"]
    for index in range(8):
        sheet = index // 4
        cell = index % 4
        x, y = (cell % 2) * 627, (cell // 2) * 627
        rect = [x, y, 627, 627]
        bounds = alpha_bounds(OUT / clip["sheets"][sheet]["src"], (x, y, x + 627, y + 627))
        clip["frames"].append({"sheet": sheet, "rect": rect, "pivot": pivots[index], "bounds": bounds, "duration": durations[index], "phase": phases[index]})
    (OUT / "dragon-idle.json").write_text(json.dumps(clip, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    register_human()
    register_dragon()
