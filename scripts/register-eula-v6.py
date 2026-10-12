"""Register generated Eula v6 atlases. Reads PNGs unchanged, writes JSON only.

Body feature correspondences preserve the old animation's physical foot/pelvis
reference. One median anatomical scale is used for each clip, never per-frame
alpha height (which includes the newly enlarged sword). Blade endpoints below
were inspected on the new sheets and are snapped to their opaque silhouettes.
OpenCV contracts consulted:
https://docs.opencv.org/4.x/d1/de0/tutorial_py_feature_homography.html
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
OLD = ROOT / 'public/assets/animations/eula-v4'
NEW = ROOT / 'public/assets/animations/eula-v6'
SIFT = cv2.SIFT_create(contrastThreshold=0.015)
MATCHER = cv2.BFMatcher()
TIP_POINTS = {
    ('clips', 'jab'): [(395,420),(481,134),(1321,235),(1757,218),(420,823),(912,822),(1287,825),(1729,826)],
    ('clips', 'smash'): [(19,408),(436,394),(1326,327),(1759,235),(467,657),(933,810),(1313,814),(1729,814)],
    ('clips', 'special'): [(325,358),(407,306),(736,252),(1429,291),(375,543),(741,550),(1104,555),(1134,554),(336,1003),(727,1004),(1073,1004),(1426,1006)],
    ('clips', 'secondary'): [(353,352),(724,353),(1072,353),(1431,353),(355,693),(725,693),(1073,693),(1429,693),(354,1034),(724,1034),(1075,1033),(1429,1034)],
    ('variants', 'jab'): [(443,445),(489,54),(1324,403),(1757,453),(437,846),(917,841),(1345,848),(1756,843)],
    ('variants', 'smash'): [(91,110),(554,23),(1301,120),(1615,456),(452,836),(909,835),(1294,828),(1754,834)],
}


def load(path):
    return np.asarray(Image.open(path).convert('RGBA'))


def components(pixels, columns, expected):
    count, labels, stats, centers = cv2.connectedComponentsWithStats((pixels[:,:,3] >= 128).astype('uint8'), 8)
    bodies = [(i, stats[i], centers[i]) for i in range(1, count) if stats[i,4] > 2000]
    assert len(bodies) == expected, (len(bodies), expected)
    bodies.sort(key=lambda item: item[2][1])
    ordered = []
    for row in range(0, len(bodies), columns):
        ordered.extend(sorted(bodies[row:row+columns], key=lambda item: item[2][0]))
    return labels, ordered


def features(pixels):
    alpha = pixels[:,:,3] >= 128
    rgb = pixels[:,:,:3].copy()
    rgb[~alpha] = 0
    return SIFT.detectAndCompute(cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY), alpha.astype('uint8') * 255)


def correspondence(old, new):
    before, descriptors_before = features(old)
    after, descriptors_after = features(new)
    pairs = MATCHER.knnMatch(descriptors_before, descriptors_after, k=2)
    reliable = [pair[0] for pair in pairs if len(pair) == 2 and pair[0].distance < .72 * pair[1].distance]
    assert len(reliable) >= 8, ('insufficient body matches', len(reliable))
    source = np.float32([before[m.queryIdx].pt for m in reliable])
    target = np.float32([after[m.trainIdx].pt for m in reliable])
    matrix, inliers = cv2.estimateAffinePartial2D(source, target, method=cv2.RANSAC, ransacReprojThreshold=3, maxIters=5000)
    assert matrix is not None and int(inliers.sum()) >= 7
    scale = float(np.hypot(matrix[0,0], matrix[1,0]))
    assert .5 < scale < 1.6, scale
    errors = np.linalg.norm(source @ matrix[:,:2].T + matrix[:,2] - target, axis=1)
    return matrix, scale, int(inliers.sum()), float(np.median(errors[inliers[:,0] == 1]))


def main():
    original = json.loads((OLD / 'manifest.json').read_text(encoding='utf-8'))
    manifest = copy.deepcopy(original)
    manifest['date'] = '2026-10-12'
    manifest['generator'] = 'built-in image_gen; Song of Broken Pines weapon revision'
    report = []
    for section in ('clips', 'variants'):
        for name, clip in manifest[section].items():
            old_filename = clip['image']
            filename = 'secondary.png' if name == 'secondary' else old_filename
            old, new = load(OLD / old_filename), load(NEW / filename)
            clip['image'] = filename
            clip['width'], clip['height'] = new.shape[1], new.shape[0]
            labels, poses = components(new, 2 if name in ('idle','dodge') else 4, len(clip['frames']))
            scales = []
            for index, frame in enumerate(clip['frames']):
                component_id, bounds, _ = poses[index]
                bx, by, bw, bh = map(int, bounds[:4])
                left, top = max(0,bx-5), max(0,by-5)
                right, bottom = min(new.shape[1],bx+bw+5), min(new.shape[0],by+bh+5)
                prior = original[section][name]['frames'][index]
                ox, oy, ow, oh = (prior['sourceRect'][key] for key in ('x','y','width','height'))
                matrix, scale, inliers, error = correspondence(old[oy:oy+oh,ox:ox+ow],new[top:bottom,left:right])
                foot = matrix @ np.array([prior['footAnchor']['x']*ow,prior['footAnchor']['y']*oh,1])
                foot += [left,top]
                # Preserve virtual ground references during flight, rather than
                # moving them onto a bent knee, cloak or the enlarged sword tip.
                left = max(0, min(left, int(np.floor(foot[0]))-5))
                right = max(right, int(np.ceil(foot[0]))+5)
                top = max(0, min(top, int(np.floor(foot[1]))-5))
                bottom = max(bottom, int(np.ceil(foot[1]))+5)
                assert right <= new.shape[1] and bottom <= new.shape[0], (name,index,foot.tolist())
                # The opaque body selects the pose, but its antialiased contour
                # can extend beyond that bbox. Preserve those pixels and the
                # renderer's three-pixel gutter without moving the body anchor.
                for _ in range(16):
                    alpha = new[top:bottom,left:right,3] > 32
                    grow = (bool(alpha[:,:3].any()), bool(alpha[:3,:].any()),
                            bool(alpha[:,-3:].any()), bool(alpha[-3:,:].any()))
                    if not any(grow):
                        break
                    left -= 3 if grow[0] else 0
                    top -= 3 if grow[1] else 0
                    right += 3 if grow[2] else 0
                    bottom += 3 if grow[3] else 0
                    assert 0 <= left < right <= new.shape[1] and 0 <= top < bottom <= new.shape[0], (name,index,'antialias gutter leaves image')
                else:
                    raise AssertionError((name,index,'antialias gutter did not converge'))
                rect = {'x':left,'y':top,'width':right-left,'height':bottom-top}
                frame['sourceRect'] = rect
                frame['footAnchor'] = {'x':round(float(foot[0]-left)/rect['width'],6),'y':round(float(foot[1]-top)/rect['height'],6)}
                assert all(0 <= v <= 1 for v in frame['footAnchor'].values())
                other = [int(i) for i in np.unique(labels[top:bottom,left:right]) if i not in (0,component_id)]
                large_other = [i for i in other if np.count_nonzero(labels == i) > 2000]
                assert not large_other, (name,index,'neighbor sprite in rect',large_other)
                tip = None
                if 'weaponTip' in frame:
                    ys,xs = np.where(labels == component_id)
                    expected = TIP_POINTS[(section,name)][index]
                    distances = (xs-expected[0])**2 + (ys-expected[1])**2
                    nearest = int(np.argmin(distances))
                    assert int(distances[nearest]) <= 100, (name,index,'tip annotation off silhouette')
                    tip = [int(xs[nearest]),int(ys[nearest])]
                    frame['weaponTip'] = {'x':tip[0]-left,'y':tip[1]-top}
                scales.append(scale)
                report.append({'clip':name,'variant':section=='variants','frame':index,'image':filename,'rect':[left,top,right-left,bottom-top],
                               'foot':[round(float(v),2) for v in foot],'scale':round(scale,5),'inliers':inliers,
                               'medianError':round(error,3),'weaponTip':tip})
                assert {key:frame.get(key) for key in ('name','phase','duration')} == {key:prior.get(key) for key in ('name','phase','duration')}
            clip['standingBodyHeightPixels'] = round(original[section][name]['standingBodyHeightPixels'] * float(np.median(scales)),3)
            assert clip.get('trail') == original[section][name].get('trail')
            (NEW / Path(filename).with_suffix('.json')).write_text(json.dumps(clip,indent=2)+'\n',encoding='utf-8')
    (NEW / 'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n',encoding='utf-8')
    (ROOT / 'docs/eula-v6-registration-measurements.json').write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'frames':len(report),'atlases':10,'minimumBodyMatches':min(x['inliers'] for x in report),
                      'maximumMedianBodyErrorPx':max(x['medianError'] for x in report)},separators=(',',':')))


if __name__ == '__main__':
    main()
