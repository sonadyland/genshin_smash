"""Register the generated firebird sample; reads pixels and writes JSON only.

No image is resized, painted, composited, or written by this script. Cell search
windows and blade-tip landmarks were inspected on the final built-in image_gen
output. A single physical body height keeps weapon reach out of body scaling.
"""
from __future__ import annotations

import copy
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
PACK = ROOT / 'public/assets/animations/diluc-v6'
IMAGE = PACK / 'secondary-firebird-v7.png'
OLD = PACK / 'secondary-v5.json'
OUT = PACK / 'secondary-firebird-v7.json'
REPORT = ROOT / 'docs/diluc-firebird-v7-registration.json'

# Measured empty gutters, not a nominal grid: the first raised blade slightly
# crosses the nominal quarter-width, but remains well clear of its neighbor.
ROWS = [
    (0, 382, [0, 355, 745, 1090, 1448]),
    (382, 772, [0, 395, 795, 1120, 1448]),
    (772, 1086, [0, 395, 760, 1100, 1448]),
]
FOOT_X = [218, 585, 961, 1291, 207, 575, 972, 1327, 188, 544, 916, 1269]
GROUND_Y = [366] * 4 + [754] * 4 + [1026] * 4
TIP_HINTS = [(22, 284), (377, 297), (774, 306), (1104, 282),
             (370, 414), (728, 400), (1057, 392), (1165, 424),
             (363, 795), (708, 1001), (1073, 1011), (1422, 1014)]
BODY_HEIGHT = 276


def main():
    image = Image.open(IMAGE)
    assert image.mode == 'RGBA'
    pixels = np.asarray(image)
    height, width = pixels.shape[:2]
    assert (width, height) == (1448, 1086)
    original = json.loads(OLD.read_text(encoding='utf-8'))
    clip = copy.deepcopy(original)
    clip.update(image=IMAGE.name, width=width, height=height,
                standingBodyHeightPixels=BODY_HEIGHT)
    measurements = []
    for index, frame in enumerate(clip['frames']):
        row, col = divmod(index, 4)
        top, bottom, columns = ROWS[row]
        left, right = columns[col:col + 2]
        alpha = pixels[top:bottom, left:right, 3]
        ys, xs = np.where(alpha > 32)
        assert len(xs)
        x = int(xs.min()) + left - 5
        y = int(ys.min()) + top - 5
        r = int(xs.max()) + left + 6
        b = max(int(ys.max()) + top + 6, GROUND_Y[index] + 3)
        assert 0 <= x < r <= width and 0 <= y < b <= height
        assert x >= left and r <= right and y >= top and b <= bottom
        rect = dict(x=x, y=y, width=r - x, height=b - y)
        local_alpha = pixels[y:b, x:r, 3]
        oy, ox = np.where(local_alpha > 32)
        gutter = min(int(ox.min()), int(oy.min()), r - x - int(ox.max()) - 1, b - y - int(oy.max()) - 1)
        assert gutter >= 5
        hint_x, hint_y = TIP_HINTS[index]
        ty, tx = np.where(pixels[max(y, hint_y - 12):min(b, hint_y + 13),
                                 max(x, hint_x - 12):min(r, hint_x + 13), 3] >= 128)
        tx = tx + max(x, hint_x - 12)
        ty = ty + max(y, hint_y - 12)
        nearest = int(np.argmin((tx - hint_x) ** 2 + (ty - hint_y) ** 2))
        tip_x, tip_y = int(tx[nearest]), int(ty[nearest])
        frame['sourceRect'] = rect
        frame['footAnchor'] = {'x': round((FOOT_X[index] - x) / (r - x), 6),
                               'y': round((GROUND_Y[index] - y) / (b - y), 6)}
        frame['weaponTip'] = {'x': tip_x - x, 'y': tip_y - y}
        assert 0 <= frame['footAnchor']['x'] <= 1 and 0 <= frame['footAnchor']['y'] <= 1
        for key in ('name', 'duration', 'phase', 'sourceScale'):
            assert frame.get(key) == original['frames'][index].get(key)
        measurements.append({'frame': index + 1, 'phase': frame['phase'],
                             'sourceRect': rect, 'footPixels': [FOOT_X[index], GROUND_Y[index]],
                             'weaponTipPixels': [tip_x, tip_y], 'alpha32GutterPx': gutter})
    for left in clip['frames']:
        a = left['sourceRect']
        for right in clip['frames']:
            if left is right:
                continue
            b = right['sourceRect']
            assert a['x'] + a['width'] <= b['x'] or b['x'] + b['width'] <= a['x'] or a['y'] + a['height'] <= b['y'] or b['y'] + b['height'] <= a['y']
    assert clip['trail'] == original['trail']
    assert len(clip['frames']) == 12
    OUT.write_text(json.dumps(clip, indent=2) + '\n', encoding='utf-8')
    report = {'image': str(IMAGE.relative_to(ROOT)).replace('\\', '/'),
              'sha256': hashlib.sha256(IMAGE.read_bytes()).hexdigest(),
              'generator': 'built-in image_gen; 3 calls; final unmodified RGBA output',
              'size': [width, height], 'frames': 12, 'timingAndPhasesPreserved': True,
              'fixedStandingBodyHeightPixels': BODY_HEIGHT,
              'minimumAlpha32GutterPx': min(m['alpha32GutterPx'] for m in measurements),
              'measurements': measurements}
    REPORT.write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({k: report[k] for k in ('sha256', 'size', 'frames', 'timingAndPhasesPreserved', 'fixedStandingBodyHeightPixels', 'minimumAlpha32GutterPx')}))


if __name__ == '__main__':
    main()
