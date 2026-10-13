// A settled attempt cannot publish progress from its still-finishing sibling images.
export function createClipLoader({ clips, sourceFor, loadJson, loadImage, validate, onStatus }) {
  const pending = new Map(), attempts = new Map();
  function ensure(id) {
    if (clips.has(id)) return Promise.resolve(clips.get(id));
    if (pending.has(id)) return pending.get(id);
    const attempt = { settled: false };
    attempts.set(id, attempt);
    const current = () => attempts.get(id) === attempt && !attempt.settled;
    const report = (value, loaded = 0, total = 0) => { if (current()) onStatus(id, value, loaded, total); };
    const work = (async () => {
      report('loading');
      const clip = await loadJson(sourceFor(id)); validate(clip);
      let loaded = 0; report('loading', loaded, clip.sheets.length);
      const sources = await Promise.all(clip.sheets.map(async (sheet, index) => {
        const asset = await loadImage(id, index, sheet.src);
        report('loading', ++loaded, clip.sheets.length);
        return asset;
      }));
      validate(clip, sources.map(source => ({ width: source.naturalWidth, height: source.naturalHeight })));
      clips.set(id, clip); report('ready', loaded, loaded); attempt.settled = true;
      return clip;
    })().catch(error => {
      report('error'); attempt.settled = true; throw error;
    }).finally(() => {
      if (attempts.get(id) === attempt) { pending.delete(id); attempts.delete(id); }
    });
    pending.set(id, work);
    return work;
  }
  return { ensure };
}
