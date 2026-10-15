"""Package the approved Corrin 32-clip / 228-frame catalogue, without redrawing.

All source rectangles, anatomical rulers and transparent pixels are preserved.
Pillow WebP: https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp
"""
import hashlib
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'public/previews/corrin-v1'
DEST = ROOT / 'public/assets/animations/corrin-v1'
REPORT = ROOT / 'docs/corrin-art-registration.json'
sha = lambda data: hashlib.sha256(data).hexdigest()
read = lambda path: json.loads(path.read_text(encoding='utf-8'))


def catalogue():
    result = {}
    # Only approved v2 human drawings are read. Dragon/water originals remain active.
    idle = read(SOURCE / 'dragon-idle.json')
    result['dragon:idle'] = {**idle, 'id': 'idle', 'form': 'dragon', 'loop': True}
    for clip in read(SOURCE / 'dragon-motion-registration.json')['clips']:
        result[f"dragon:{clip['id']}"] = {**clip, 'form': 'dragon'}
    for clip in read(SOURCE / 'transform-fx-registration.json')['clips']:
        if clip['id'].startswith('fx-'):
            result[f"fx:{clip['id']}"] = {**clip, 'form': 'fx'}
    approved = read(SOURCE / 'human-v2-manifest.json')
    assert approved['ready'] is True
    for item in approved['sources']:
        for clip in read(SOURCE / item['src'])['clips']:
            result[f"{item['form']}:{clip['id']}"] = {**clip, 'form': item['form']}
    for retired in approved['retired']:
        result.pop(retired, None)
    for key, override in read(SOURCE / 'preview-registration-overrides.json')['clips'].items():
        if 'pivotY' in override:
            for frame, y in zip(result[key]['frames'], override['pivotY'], strict=True):
                frame['pivot'][1] = y
    for action, binding in read(SOURCE / approved['weaponEffects'])['clips'].items():
        result[f'human:{action}']['weaponEffect'] = binding
    assert set(result) == set(approved['requiredClips'])
    assert len(result) == 32
    assert sum(len(c['frames']) for c in result.values()) == 228
    return result


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    report = {'revision': 'master-proportions-v2', 'source': 'approved corrin-v1 preview catalogue',
              'images': [], 'clips': 32, 'frames': 228,
              'compression': 'WebP quality=92 method=6 original dimensions and exact lossless alpha; lobby thumbnail only',
              'movement': 'Physics supplies world x and feetY; no preview camera, air -32 offset, rootOffset or whole-body tween is replayed.'}
    encoded = {}

    def encode(source, target, lobby=False):
        if target.name in encoded:
            return encoded[target.name]
        original_bytes = source.read_bytes()
        with Image.open(source) as original:
            picture = original.convert('RGBA')
            if lobby:
                picture.thumbnail((640, 960), Image.Resampling.LANCZOS)
            if '--registration-only' not in sys.argv or not target.exists():
                temporary = target.with_suffix('.webp.tmp')
                picture.save(temporary, 'WEBP', quality=90 if lobby else 92, method=6, exact=True, alpha_quality=100)
                temporary.replace(target)
            with Image.open(target) as decoded:
                assert decoded.size == picture.size and decoded.mode == 'RGBA'
                assert ImageChops.difference(picture.getchannel('A'), decoded.getchannel('A')).getbbox() is None
            assert sha(source.read_bytes()) == sha(original_bytes)
            report['images'].append({'source': source.relative_to(ROOT).as_posix(), 'target': target.relative_to(ROOT).as_posix(),
                                     'sourceSha256': sha(original_bytes), 'targetSha256': sha(target.read_bytes()),
                                     'sourceBytes': len(original_bytes), 'bytes': target.stat().st_size,
                                     'width': picture.width, 'height': picture.height, 'alphaLossless': True})
            encoded[target.name] = picture.size
            return picture.size

    approved = catalogue()
    sources = {}
    for source in approved.values():
        for index in set(frame['sheet'] for frame in source['frames']):
            original = SOURCE / source['sheets'][index]['src']
            sources[original.with_suffix('.webp').name] = original
    # Each output has exactly one writer. Pillow's WebP encoder releases the GIL.
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(encode, original, DEST / filename) for filename, original in sources.items()]
        for future in futures:
            future.result()
    manifest = {'version': 2, 'character': 'corrin', 'revision': 'master-proportions-v2', 'clips': {}}
    for key, source in approved.items():
        sheets, indexes = [], {}
        for old_index in sorted(set(f['sheet'] for f in source['frames'])):
            sheet = source['sheets'][old_index]
            original = SOURCE / sheet['src']
            image = original.with_suffix('.webp').name
            width, height = encode(original, DEST / image)
            assert [width, height] == [sheet['width'], sheet['height']]
            indexes[old_index] = len(sheets)
            sheets.append({'image': image, 'width': width, 'height': height, 'bodyHeight': sheet['bodyHeight']})
        clip = {'id': source['id'], 'form': source['form'],
                'gameHeight': source.get('worldHeight', source.get('gameHeight', 135 if source['form'] == 'dragon' else 112)),
                'loop': source.get('loop', source['id'] in ['idle', 'run']), 'sheets': sheets, 'frames': []}
        for key_name in ['weaponEffect', 'flightLoopFrames', 'spawnFrame', 'impactFrame']:
            if key_name in source:
                clip[key_name] = source[key_name]
        for frame in source['frames']:
            value = {name: frame[name] for name in ['rect', 'pivot', 'phase', 'anchors'] if name in frame}
            value['sheet'] = indexes[frame['sheet']]
            value['duration'] = frame.get('duration', frame.get('durationMs'))
            if 'bounds' in frame:
                value['bounds'] = frame['bounds']
            elif source['form'] == 'fx':
                # Read-only alpha measurement gives combat effects meaningful sizes;
                # padding around the generated artwork is not a damage radius.
                atlas = SOURCE / source['sheets'][frame['sheet']]['src']
                x, y, width, height = frame['rect']
                with Image.open(atlas) as original:
                    alpha = original.convert('RGBA').getchannel('A').crop((x, y, x + width, y + height))
                    bounds = alpha.point(lambda a: 255 if a > 16 else 0).getbbox()
                    assert bounds is not None
                    value['bounds'] = [bounds[0], bounds[1], bounds[2] - bounds[0], bounds[3] - bounds[1]]
            clip['frames'].append(value)
        manifest['clips'][key] = clip
    portrait = SOURCE / 'portrait.png'
    assert portrait.exists(), 'Approved dual-form portrait must be archived in the preview source directory.'
    encode(portrait, ROOT / 'public/assets/lobby/corrin.webp', lobby=True)
    manifest_path = DEST / 'manifest.json'
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report['sourceBytes'] = sum(image['sourceBytes'] for image in report['images'])
    report['productionBytes'] = sum(image['bytes'] for image in report['images']) + manifest_path.stat().st_size
    report['images'].sort(key=lambda image: image['target'])
    REPORT.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Corrin: 32 clips / 228 frames, {len(report['images']) - 1} atlases; {report['sourceBytes']} -> {report['productionBytes']} bytes")


if __name__ == '__main__':
    main()
