"""Re-encode display-sized lobby/HUD art; source PNGs and animation atlases stay intact.

Run with a Python environment containing Pillow 11+ and WebP support:
    python scripts/generate-lobby-art.py
Optional --review-dir writes side-by-side quality evidence outside public assets.
"""
import argparse
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageStat

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'public' / 'assets'
SOURCES = {
    'raiden': 'characters/raiden-v2.png', 'jean': 'characters/jean-v2.png',
    'eula': 'characters/eula-v6.png', 'diluc': 'characters/diluc-v6.png',
    'xiao': 'characters/xiao-v6.png', 'zhongli': 'animations/zhongli-v1/portrait.png',
    'furina': 'animations/furina-v1/portrait.png', 'liyue-dawn': 'backgrounds/liyue-dawn-v2.png',
}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--review-dir', type=Path)
    parser.add_argument('--only', nargs='+', choices=list(SOURCES), help='Re-encode only these named portraits/backgrounds')
    args = parser.parse_args()
    destination = ASSETS / 'lobby'
    destination.mkdir(exist_ok=True)
    if args.review_dir:
        args.review_dir.mkdir(parents=True, exist_ok=True)
    report = {}
    for name, source_path in SOURCES.items():
        if args.only and name not in args.only:
            continue
        source = ASSETS / source_path
        with Image.open(source) as original:
            image = original.copy()
            # The background is already 1672x941: never enlarge it to a nominal target.
            image.thumbnail((1920, 1080) if name == 'liyue-dawn' else (640, 960), Image.Resampling.LANCZOS)
            target = destination / f'{name}.webp'
            temporary = target.with_suffix('.webp.tmp')
            image.save(temporary, 'WEBP', quality=90, method=6, exact=True, alpha_quality=100)
            # Keep the previous published image readable while encoding is in progress.
            temporary.replace(target)
            with Image.open(target) as decoded:
                assert decoded.size == image.size
                if image.mode == 'RGBA':
                    assert decoded.mode == 'RGBA'
                    assert ImageChops.difference(image.getchannel('A'), decoded.getchannel('A')).getbbox() is None
                report[name] = {'sourceBytes': source.stat().st_size, 'bytes': target.stat().st_size,
                                'width': image.width, 'height': image.height, 'alphaLossless': image.mode == 'RGBA'}
                if args.review_dir:
                    views = []
                    for item in (image, decoded):
                        view = item.convert('RGBA')
                        view.thumbnail((480, 720), Image.Resampling.LANCZOS)
                        views.append(view)
                    board = Image.new('RGB', (1000, 780), '#172437')
                    draw = ImageDraw.Draw(board)
                    draw.text((20, 15), f'{name}: resized source PNG', fill='white')
                    draw.text((520, 15), 'published WebP (quality 90, exact alpha)', fill='white')
                    for index, view in enumerate(views):
                        board.paste(view, (20 + 500 * index, 48), view)
                    board.save(args.review_dir / f'{name}-comparison.jpg', quality=95)
                    # RMS on opaque-composited pixels is diagnostic only, not a quality gate.
                    reference = Image.new('RGB', image.size, '#172437')
                    result = reference.copy()
                    reference.paste(image, mask=image.getchannel('A') if image.mode == 'RGBA' else None)
                    result.paste(decoded, mask=decoded.getchannel('A') if decoded.mode == 'RGBA' else None)
                    report[name]['compositedRms'] = ImageStat.Stat(ImageChops.difference(reference, result)).rms
    report['total'] = {'sourceBytes': sum(item['sourceBytes'] for item in report.values()),
                       'bytes': sum(item['bytes'] for item in report.values())}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    if args.review_dir:
        (args.review_dir / 'size-report.json').write_text(json.dumps(report, indent=2), encoding='utf-8')


if __name__ == '__main__':
    main()
