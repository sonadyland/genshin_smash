"""Register manually measured v3 combat poses; never write raster pixels."""
import hashlib
import json
from pathlib import Path
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'public/previews/tharja-v2'
CONFIG = DEST / 'combat-registration.json'

def main():
    config = json.loads(CONFIG.read_text(encoding='utf-8'))
    for key, meta in config['clips'].items():
        reports, frames, sheets = [], [], []
        for si, suffix in enumerate('abc'):
            name = f'{key}-{suffix}'
            path = DEST / 'assets' / f'{name}.png'
            before = path.read_bytes()
            with Image.open(path) as image:
                assert image.mode == 'RGBA' and image.size == (1254, 1254)
                rgba = np.array(image)
            alpha = rgba[:,:,3]
            assert alpha.min() == 0 and alpha.max() >= 250
            split = meta['splits'][si]
            sheetreport = []
            for local in range(4):
                i = si * 4 + local
                x, y = local % 2 * 627, 0 if local < 2 else split
                h = split if local < 2 else 1254 - split
                crop = alpha[y:y+h, x:x+627]
                ys, xs = np.where(crop > 32)
                bounds = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
                margin = min(bounds[0], bounds[1], 626-bounds[2], h-1-bounds[3])
                assert margin >= 10, (name, i, bounds, margin)
                frame = dict(sheet=si, name=meta['names'][i], rect=[x,y,627,h],
                             pivot=meta['pivots'][i], durationMs=meta['durations'][i], phase=meta['phases'][i])
                origin = meta.get('origins',{}).get(str(i))
                if origin:
                    frame['castOrigin'] = origin
                    assert int(crop[origin[1],origin[0]]) >= 128, (key,i,'anchor outside character',origin)
                frames.append(frame)
                sheetreport.append(dict(index=i, bounds=bounds, margin=margin, origin=origin,
                                        originAlpha=int(crop[origin[1],origin[0]]) if origin else None))
            source = DEST / config['sources'][name]
            assert source.read_bytes() == before
            assert hashlib.sha256(before).hexdigest() == config['sourceSha256'][name], (name, 'approved source SHA-256 mismatch')
            assert path.read_bytes() == before
            sheets.append(dict(src=f'./assets/{name}.png', standingBodyHeight=meta['body'][si]))
            reports.append(dict(file=f'assets/{name}.png', source=source.relative_to(ROOT).as_posix(), bytes=len(before),
                                sha256=hashlib.sha256(before).hexdigest(), unchanged=True, frames=sheetreport))
        clip = {k:meta[k] for k in ['id','title','effect','releaseFrame','note']}
        clip.update(sheets=sheets, frames=frames, loop=False, restMs=500)
        for key in ['returnFrame','effectEndFrame']:
            if key in meta: clip[key] = meta[key]
        (DEST/f'{meta["id"]}.json').write_text(json.dumps(clip,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        report = dict(generator='built-in image_gen', rasterEdits=False, frameCount=12,
                      durationMs=sum(meta['durations']), sheets=reports)
        (DEST/f'{meta["id"]}-validation.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
        print(meta['id'], '12 frames', sum(meta['durations']), 'ms', 'margin', min(f['margin'] for r in reports for f in r['frames']))

if __name__ == '__main__': main()
