"""Register generated Tharja locomotion without modifying source PNG pixels."""
from pathlib import Path
import json

BASE = Path(__file__).resolve().parents[1] / "public" / "previews" / "tharja-v2"
RECTS = [[0, 0, 627, 627], [627, 0, 627, 627], [0, 627, 627, 627], [627, 627, 627, 627]]

def frame(sheet, cell, pivot, duration, phase, name, root_offset=None, rect=None):
    value = dict(sheet=sheet, rect=rect or RECTS[cell], pivot=pivot, durationMs=duration, phase=phase, name=name)
    if root_offset is not None:
        value["rootOffset"] = root_offset
    return value

CLIPS = {
    "idle": {
        "id": "idle", "title": "静候咒文",
        "sheets": [{"src": "./assets/idle-a.png", "standingBodyHeight": 452}, {"src": "./assets/idle-b.png", "standingBodyHeight": 455}],
        "frames": [
            frame(0, 0, [374, 562], 480, "静候", "quiet-ready"),
            frame(0, 1, [343, 562], 380, "吸气", "inhale"),
            frame(0, 2, [374, 541], 70, "吸气", "blink-in"),
            frame(0, 3, [344, 541], 70, "吸气", "blink-crest"),
            frame(1, 2, [375, 543], 80, "呼气", "blink-out"),
            frame(1, 0, [374, 564], 340, "呼气", "exhale"),
            frame(1, 1, [337, 564], 350, "归稳", "cloth-settle"),
            frame(1, 3, [339, 543], 420, "归稳", "neutral-settle"),
        ], "loop": True, "restMs": 0,
        "note": "以获准 v3 修长身形与自然松弛站姿绘制。8 个真实姿态，2.19 秒循环；仅逐帧脚底配准，每张图共用固定身体标尺。"
    },
    "run": {
        "id": "run", "title": "携书疾行",
        "sheets": [{"src": "./assets/run-a.png", "standingBodyHeight": 455}, {"src": "./assets/run-b.png", "standingBodyHeight": 510}],
        "frames": [
            frame(0, 0, [366, 614], 100, "接触", "right-contact"),
            frame(0, 1, [345, 614], 80, "承重", "right-compression"),
            frame(0, 2, [356, 507], 85, "摆腿", "right-passing"),
            frame(0, 3, [337, 507], 75, "腾空", "left-precontact"),
            frame(1, 0, [366, 602], 100, "接触", "left-contact"),
            frame(1, 1, [345, 602], 80, "承重", "left-compression"),
            frame(1, 2, [369, 513], 85, "摆腿", "left-passing"),
            frame(1, 3, [349, 513], 75, "腾空", "right-precontact"),
        ], "loop": True, "restMs": 0,
        "note": "8 相位跑步：左右接触、承重、交会与短腾空。左手稳托书，右臂平衡；虚拟地面基线配准保留腾空鞋底高度，未逐帧钉鞋或拉伸身体。"
    },
    "jump": {
        "id": "jump", "title": "轻跃落定",
        "sheets": [{"src": "./assets/jump-a.png", "standingBodyHeight": 541}, {"src": "./assets/jump-b.png", "standingBodyHeight": 567}],
        "frames": [
            frame(0, 0, [374, 610], 100, "起跳", "crouch-prepare"),
            frame(0, 1, [337, 610], 70, "起跳", "push-off"),
            frame(0, 2, [377, 610], 110, "腾空", "rise"),
            frame(0, 3, [343, 610], 120, "腾空", "apex"),
            frame(1, 0, [381, 610], 100, "下落", "descent", [0, -20]),
            frame(1, 2, [381, 583], 70, "落定", "landing-contact"),
            frame(1, 1, [344, 609], 90, "落定", "landing-absorb"),
            frame(1, 3, [338, 588], 170, "落定", "neutral-recover"),
        ], "loop": False, "restMs": 500,
        "note": "8 个起跳、腾空、下降与落地姿态。虚拟地面配准保留升空高度；下降帧有小量根偏移。落地按接触、膝部压缩、归位排列；每张图共用固定身体标尺。"
    },
    "dodge": {
        "id": "dodge", "title": "携卷避让",
        "sheets": [{"src": "./assets/dodge-a.png", "standingBodyHeight": 555}],
        "frames": [
            frame(0, 0, [351, 618], 110, "预备", "lower-center", [0, 0], [0, 0, 627, 650]),
            frame(0, 1, [342, 618], 100, "滑步", "sidestep", [34, 0], [627, 0, 627, 650]),
            frame(0, 2, [381, 562], 120, "刹停", "brake", [52, 0], [0, 650, 627, 604]),
            frame(0, 3, [339, 568], 190, "归稳", "return-to-book", [42, 0], [627, 650, 627, 604]),
        ], "loop": False, "restMs": 500,
        "note": "低身、短侧步、刹停与回书四姿态；书始终由左手托住。少量根平移用于独立审片展示闪避位移，左右镜像随朝向处理。"
    }
}

def register():
    BASE.mkdir(parents=True, exist_ok=True)
    for clip_id, clip in CLIPS.items():
        (BASE / f"{clip_id}.json").write_text(json.dumps(clip, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print("Registered: " + ", ".join(CLIPS))

if __name__ == "__main__":
    register()
