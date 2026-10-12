"""Measure Diluc v6 registrations from unchanged generated PNGs; writes JSON only.

Requires Pillow, NumPy and OpenCV. The v4 manifest supplies animation semantics,
not v6 coordinates. Opaque connected components delimit each new drawing; SIFT
body correspondences transfer the established pelvis/foot reference into new
pixels. Blade endpoints are independently measured from the new silhouettes.
OpenCV contracts: https://docs.opencv.org/4.x/d1/de0/tutorial_py_feature_homography.html
                 https://docs.opencv.org/4.x/d9/d0c/group__calib3d.html
"""
from __future__ import annotations

import copy
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OLD = ROOT / 'public/assets/animations/diluc-v4'
NEW = ROOT / 'public/assets/animations/diluc-v6'
SIFT = cv2.SIFT_create(contrastThreshold=0.015)
MATCHER = cv2.BFMatcher()
# Directions were inspected on the generated v6 blades, not inherited from v4.
TIP_DIRECTIONS = {
    ('clips', 'jab'): [(-1, .1)] * 2 + [(1, 0)] + [(1, .5)] * 5,
    ('clips', 'smash'): [(-1, .7), (-1, .3), (1, .7), (1, .7), (1, .4), (1, -1), (1, .7), (1, .7)],
    ('clips', 'special'): [(1, .7)] + [(-1, .3)] * 3 + [(1, 0)] * 4 + [(1, .7)] * 4,
    ('clips', 'secondary'): [(-1, .6)] * 4 + [(1, -1)] * 4 + [(1, -.4)] + [(1, .7)] * 3,
    ('variants', 'jab'): [(-1, .4), (-.7, -1), (1, -.3)] + [(1, .8)] * 5,
    ('variants', 'smash'): [(-.5, -1), (-1, -1)] + [(1, .8)] * 6,
}
CLIP_FILES = {'idle': 'idle', 'run': 'run', 'jump': 'jump', 'dodge': 'dodge', 'jab': 'jab-v5',
              'smash': 'smash', 'special': 'special-v5', 'secondary': 'secondary-v5'}


def load(path):
    return np.asarray(Image.open(path).convert('RGBA'))


def components(pixels):
    count, labels, stats, centers = cv2.connectedComponentsWithStats((pixels[:, :, 3] > 32).astype('uint8'), 8)
    bodies = [(index, stats[index], centers[index]) for index in range(1, count) if stats[index, 4] > 2000]
    bodies.sort(key=lambda item: item[2][1])
    ordered = []
    for start in range(0, len(bodies), 4):
        ordered.extend(sorted(bodies[start:start + 4], key=lambda item: item[2][0]))
    return labels, ordered


def features(pixels):
    alpha = pixels[:, :, 3] >= 128
    rgb = pixels[:, :, :3].copy()
    rgb[~alpha] = 0
    return SIFT.detectAndCompute(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), alpha.astype('uint8') * 255)


def correspondence(old, new):
    before, descriptors_before = features(old)
    after, descriptors_after = features(new)
    matches = MATCHER.knnMatch(descriptors_before, descriptors_after, k=2)
    reliable = [left for left, right in matches if left.distance < 0.72 * right.distance]
    assert len(reliable) >= 8, f'Insufficient body correspondences: {len(reliable)}'
    source = np.float32([before[item.queryIdx].pt for item in reliable])
    target = np.float32([after[item.trainIdx].pt for item in reliable])
    matrix, inliers = cv2.estimateAffinePartial2D(source, target, method=cv2.RANSAC, ransacReprojThreshold=3, maxIters=5000)
    assert matrix is not None and inliers.sum() >= 7
    scale = float(np.hypot(matrix[0, 0], matrix[1, 0]))
    assert .5 < scale < 1.6, scale
    error = np.linalg.norm(source @ matrix[:, :2].T + matrix[:, 2] - target, axis=1)
    return matrix, scale, int(inliers.sum()), float(np.median(error[inliers[:, 0] == 1]))


def main():
    manifest = json.loads((OLD / 'manifest.json').read_text(encoding='utf-8'))
    original = copy.deepcopy(manifest)
    manifest['date'] = '2026-10-12'
    manifest['generator'] = 'built-in image_gen; Wolf\'s Gravestone weapon revision'
    report = []
    images = {}
    for section in ('clips', 'variants'):
        for name, clip in manifest[section].items():
            filename = clip['image']
            if filename not in images:
                new = load(NEW / filename)
                labels, poses = components(new)
                images[filename] = (load(OLD / filename), new, labels, poses)
            old, new, labels, poses = images[filename]
            clip['width'], clip['height'] = new.shape[1], new.shape[0]
            measured_scales = []
            start = {'run': 4, 'dodge': 8, 'smash': 8}.get(name, 0) if section == 'clips' else 0
            if filename != 'basic.png' and name == 'smash':
                start = 0
            for index, frame in enumerate(clip['frames']):
                component_id, bounds, center = poses[index + start]
                bx, by, bw, bh = map(int, bounds[:4])
                x, y = max(0, bx - 5), max(0, by - 5)
                right, bottom = min(new.shape[1], bx + bw + 5), min(new.shape[0], by + bh + 5)
                # Two alternate-J poses are separated by four transparent pixels;
                # share that gutter without making their source rectangles overlap.
                for other_id, other_bounds, _ in poses:
                    if other_id == component_id:
                        continue
                    ax, ay, aw, ah = map(int, other_bounds[:4])
                    if by + bh > ay and ay + ah > by:
                        if ax + aw <= bx:
                            x = max(x, (ax + aw + bx) // 2)
                        elif bx + bw <= ax:
                            right = min(right, (bx + bw + ax) // 2)
                rect = frame['sourceRect']
                ox, oy, ow, oh = (rect[key] for key in ('x', 'y', 'width', 'height'))
                matrix, scale, inliers, error = correspondence(old[oy:oy+oh, ox:ox+ow], new[y:bottom, x:right])
                point = matrix @ np.array([frame['footAnchor']['x'] * ow, frame['footAnchor']['y'] * oh, 1])
                # The established foot reference is virtual during flight/crouch;
                # retain its body-relative meaning, including air below the shoes.
                bottom = max(bottom, int(np.ceil(point[1] + y)) + 3)
                assert bottom <= new.shape[0], (name, index, bottom)
                rect = {'x': x, 'y': y, 'width': right-x, 'height': bottom-y}
                frame['sourceRect'] = rect
                frame['footAnchor'] = {'x': round(float(point[0]) / rect['width'], 6),
                                       'y': round(float(point[1]) / rect['height'], 6)}
                measured_scales.append(scale)
                tip = None
                if 'weaponTip' in frame:
                    ys, xs = np.where((labels == component_id) & (new[:, :, 3] >= 128))
                    direction = np.asarray(TIP_DIRECTIONS[(section, name)][index], dtype=float)
                    direction /= np.linalg.norm(direction)
                    projections = xs * direction[0] + ys * direction[1]
                    endpoint = projections >= projections.max() - 1
                    tip = [int(round(float(np.mean(xs[endpoint])))), int(round(float(np.mean(ys[endpoint]))))]
                    frame['weaponTip'] = {'x': tip[0] - x, 'y': tip[1] - y}
                report.append({'clip': name, 'variant': section == 'variants', 'frame': index, 'rect': [x, y, right-x, bottom-y],
                               'foot': [round(float(point[0]+x), 2), round(float(point[1]+y), 2)], 'scale': round(scale, 5),
                               'inliers': inliers, 'medianError': round(error, 3), 'weaponTip': tip})
            median_scale = float(np.median(measured_scales))
            clip['standingBodyHeightPixels'] = round(clip['standingBodyHeightPixels'] * median_scale, 3)
            for frame, prior in zip(clip['frames'], original[section][name]['frames']):
                assert {key: frame.get(key) for key in ('name', 'duration', 'phase')} == {key: prior.get(key) for key in ('name', 'duration', 'phase')}
            assert clip.get('trail') == original[section][name].get('trail')
            target_name = CLIP_FILES[name] if section == 'clips' else f'{name}-variant-v5'
            (NEW / f'{target_name}.json').write_text(json.dumps(clip, indent=2) + '\n', encoding='utf-8')
    (NEW / 'manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
    (ROOT / 'docs/diluc-v6-registration-measurements.json').write_text(json.dumps(report, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'frames': len(report), 'atlases': len(images), 'minimumBodyMatches': min(item['inliers'] for item in report),
                      'maximumMedianBodyErrorPx': max(item['medianError'] for item in report)}, separators=(',', ':')))


if __name__ == '__main__':
    main()
