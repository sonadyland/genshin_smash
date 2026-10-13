"""Register original generated sprites. Read PNG pixels for QA; never write image pixels."""
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/previews/tharja-v2'
SPECS = {
    'secondary-a': {'split': 648, 'height': 594, 'pivots': [(383.5, 637), (330, 636), (387.5, 588), (349.5, 585)], 'sha256': '53874e9bc0ecf4da5d35c37bf66e91c40ea672b4969f713750205e8676f03cf4'},
    'secondary-b': {'split': 634, 'height': 500, 'pivots': [(356.5, 608), (329.5, 608), (359, 580), (332.5, 580)], 'sha256': '01e7b1dace79e13c1bf5f6be85c83ac9e6235455dc0db77a93146451a68d1601'},
    'secondary-c': {'split': 647, 'height': 578, 'pivots': [(384.5, 636), (342.5, 636), (384.5, 563), (351, 564)], 'sha256': '66a5c8b6547069c463b2bc36969adaa8a061c1830fc227b0a3e84498309d4b2c'},
    'secondary-d': {'split': 632, 'height': 595, 'pivots': [(390.5, 624), (331, 624), (391, 593), (333, 593)], 'sha256': 'f9ec76db5b83d98b8ffe4135e0ebba89294ab8017e9cb9b3be1dbe01cbf8a3b7'},
    'hurt-a': {'split': 627, 'height': 583, 'pivots': [(383, 615), (319.5, 615), (385, 590), (334, 590)], 'sha256': '713c088ae4e0639b653a854d7b1ab562418194e87bf3d3dc20f4c4e31763f174'},
}
NAMES = ['书页待势', '垂眸读咒', '抬书起指', '右手抬腕', '抬肘描符', '手越额前', '向上引咒', '转掌蓄势', '掌势转下', '迅速压掌', '指地释放', '掌势随动', '屈肘收掌', '翻腕回书', '指尖回页', '归位静候']
DURATIONS = [110, 130, 140, 140, 130, 120, 140, 130, 75, 60, 125, 90, 90, 100, 100, 150]
report = {'generator': 'built-in image_gen', 'pixelEdits': False, 'sheets': [], 'frames': []}

def frames_for(name, sheet_index, names, durations, phases):
    spec = SPECS[name]
    path = DEST / 'assets' / (name + '.png')
    image = Image.open(path)
    assert image.mode == 'RGBA' and image.size == (1254, 1254)
    # Approved source hashes were recorded during generation; only repository
    # PNGs are required when registering again on another machine.
    equal = hashlib.sha256(path.read_bytes()).hexdigest() == spec['sha256']
    assert equal, name
    report['sheets'].append({'src': f'./assets/{name}.png', 'width': 1254, 'height': 1254,
        'standingBodyHeight': spec['height'], 'bytes': path.stat().st_size,
        'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'identicalToGeneratedSource': equal,
        'alphaExtrema': image.getchannel('A').getextrema()})
    frames = []
    for i in range(4):
        y = 0 if i < 2 else spec['split']
        h = spec['split'] if i < 2 else 1254 - y
        x = (i % 2) * 627
        rect = [x, y, 627, h]
        alpha = image.getchannel('A').crop((x, y, x + 627, y + h))
        bounds = alpha.point(lambda value: 255 if value > 32 else 0).getbbox()
        assert bounds is not None
        margins = [bounds[0], bounds[1], 627 - bounds[2], h - bounds[3]]
        assert min(margins) >= 7, (name, i, margins)
        frame = {'sheet': sheet_index, 'name': names[i], 'rect': rect, 'pivot': spec['pivots'][i],
            'durationMs': durations[i], 'phase': phases[i]}
        if name == 'secondary-c' and i == 2:
            frame['castOrigin'] = [473, 220]
            assert image.getpixel((473, y + 220))[3] >= 128
        frames.append(frame)
        report['frames'].append({'image': name, 'frame': i + 1, 'rect': rect, 'pivot': spec['pivots'][i],
            'alpha32Bounds': bounds, 'transparentMarginsLTRB': margins})
    return frames

secondary = {'id': 'secondary', 'title': '远渊咒域 · Mire', 'sheets': [], 'frames': [], 'effect': 'mire',
    'releaseFrame': 10, 'loop': False, 'restMs': 650,
    'note': '缓慢抬书读咒，举起右手描符，再迅速前下压掌；第 11 帧指地时远方咒域展开，随后收掌回到松弛站姿。咒域是独立美术演示，尚无伤害判定。'}
for index, suffix in enumerate('abcd'):
    name = f'secondary-{suffix}'
    secondary['sheets'].append({'src': f'./assets/{name}.png', 'standingBodyHeight': SPECS[name]['height']})
    secondary['frames'].extend(frames_for(name, index, NAMES[index * 4:(index + 1) * 4], DURATIONS[index * 4:(index + 1) * 4], [["读咒起势"] * 4, ["抬手描符"] * 4, ["压掌成域"] * 4, ["回书归位"] * 4][index]))
hurt = {'id': 'hurt', 'title': '护书回稳 · HIT REACTION', 'sheets': [{'src': './assets/hurt-a.png', 'standingBodyHeight': SPECS['hurt-a']['height']}],
    'frames': frames_for('hurt-a', 0, ['缩肩护书', '承受冲击', '重心回稳', '恢复待势'], [80, 105, 140, 200], ['护书', '受击', '回稳', '归位']),
    'loop': False, 'restMs': 800, 'note': '短暂缩肩护书、轻微后仰，再回稳归位；这是受击姿态审片，不改变幸存者模式受击不会打断操作的规则。'}
for clip in [secondary, hurt]:
    (DEST / (clip['id'] + '.json')).write_text(json.dumps(clip, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
report['frameCount'] = len(report['frames'])
(DEST / 'mire-hurt-validation.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('Registered 16 Mire and 4 hurt frames; original PNGs untouched.')
