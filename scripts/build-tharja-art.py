"""Package approved Tharja v2 frames; no new drawings or pixel retouching.

Pillow WebP options: https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp
Full-size atlases use quality 92 with exact, lossless alpha. Lobby alone is resized.
"""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageChops

ROOT = Path(__file__).resolve().parent.parent
PREVIEW = ROOT / 'public/previews/tharja-v2'
DEST = ROOT / 'public/assets/animations/tharja-v1'
LOBBY = ROOT / 'public/assets/lobby/tharja.webp'
CLIPS = ['idle', 'run', 'jump', 'dodge', 'jab', 'smash', 'special', 'secondary', 'hurt']
ATTACKS = {'jab': (5, 6, 9), 'smash': (5, 6, 9), 'special': (4, 6, 9), 'secondary': (10, 11, 13)}
# Production movement is driven by physics. Air poses use a pelvis-projected body
# root; these three roots remove the separate showcase's whole-body ascent.
# Run keeps authored gait lift. Dodge showcase horizontal travel is not reapplied.
JUMP_ROOT_Y = {2: 578, 3: 553, 4: 602}
JUMP_NAMES = ['takeoff', 'takeoff', 'rise', 'apex', 'fall', 'land', 'land', 'land']
sha = lambda data: hashlib.sha256(data).hexdigest()
report = {'source': 'approved public/previews/tharja-v2', 'images': [], 'frames': 0,
          'atlasCompression': 'WebP quality=92 method=6; original dimensions; alpha exact',
          'movement': 'Physics owns jump/dodge translation; no showcase rootOffset replay.'}


def encode(source, target, lobby=False):
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
        return picture.size


def main():
    DEST.mkdir(parents=True, exist_ok=True)
    manifest = {'version': 1, 'character': 'tharja', 'clips': {}}
    for name in CLIPS:
        source = json.loads((PREVIEW / f'{name}.json').read_text(encoding='utf-8'))
        sheets = []
        for sheet in source['sheets']:
            file = PREVIEW / sheet['src']
            target_name = file.with_suffix('.webp').name
            width, height = encode(file, DEST / target_name)
            sheets.append((target_name, width, height))
        base = source['sheets'][0]['standingBodyHeight']
        clip = {'image': sheets[0][0], 'width': sheets[0][1], 'height': sheets[0][2],
                'standingBodyHeightPixels': base, 'trail': 'none', 'frames': []}
        for timing_key in ['releaseFrame', 'returnFrame', 'effectEndFrame']:
            if timing_key in source:
                clip[timing_key] = source[timing_key]
        for i, frame in enumerate(source['frames']):
            sheet_index = frame['sheet']
            sheet = source['sheets'][sheet_index]
            rect = frame['rect']
            pivot = list(frame['pivot'])
            if name == 'jump' and i in JUMP_ROOT_Y:
                pivot[1] = JUMP_ROOT_Y[i]
            registered = {'name': JUMP_NAMES[i] if name == 'jump' else frame['name'],
                          'sourceRect': dict(zip(['x', 'y', 'width', 'height'], rect)),
                          'footAnchor': {'x': pivot[0] / rect[2], 'y': pivot[1] / rect[3]},
                          'sourceScale': base / sheet['standingBodyHeight'],
                          'duration': round(frame['durationMs'] * .06, 6)}
            if sheet_index:
                registered.update(dict(zip(['image', 'width', 'height'], sheets[sheet_index])))
            if name in ATTACKS:
                release, follow, recover = ATTACKS[name]
                registered['phase'] = 'windup' if i < release else 'contact' if i < follow else 'followthrough' if i < recover else 'recover'
            if 'castOrigin' in frame:
                registered['castOrigin'] = dict(zip(['x', 'y'], frame['castOrigin']))
            clip['frames'].append(registered)
        assert all(0 <= f['footAnchor']['x'] <= 1 and 0 <= f['footAnchor']['y'] <= 1 for f in clip['frames'])
        manifest['clips'][name] = clip
        report['frames'] += len(clip['frames'])
    assert report['frames'] == 84
    portrait = PREVIEW / 'portrait.png'
    encode(portrait, LOBBY, lobby=True)
    (DEST / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    report['sourceBytes'] = sum(i['sourceBytes'] for i in report['images'])
    report['productionBytes'] = sum(i['bytes'] for i in report['images']) + (DEST / 'manifest.json').stat().st_size
    (ROOT / 'docs/tharja-art-registration.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Tharja: {report['frames']} frames, {len(report['images']) - 1} WebP atlases; {report['sourceBytes']} source bytes -> {report['productionBytes']} production bytes")


if __name__ == '__main__':
    main()
