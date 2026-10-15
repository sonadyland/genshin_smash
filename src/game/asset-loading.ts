import { ensureArtUrls, onArtUrlsChanged } from './art-url-session';
import { ART_CATALOG } from './asset-catalog';
import { assetUrl } from './asset-url';
import { acquireGameArt } from './art';
import type { GameArtLease } from './art';

export interface AssetProgress {
  status: 'waiting' | 'loading' | 'ready' | 'error';
  loadedBytes: number;
  totalBytes: number;
  percent: number;
  error?: string;
}
export interface AssetLoadingSnapshot {
  home: AssetProgress;
  characters: Readonly<Record<string, AssetProgress>>;
  /** A DOM image is assigned its URL only after this download and decode finish. */
  homeReadyUrls: readonly string[];
}
export interface BattleLoadingProgress extends AssetProgress { phase: 'download' | 'decode' | 'ready' }
export interface BattlePreparation {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => BattleLoadingProgress;
  ready: Promise<void>;
  /** Release after the engine acquires its own art lease, or when leaving/retrying. */
  release: () => void;
}
export interface AssetCatalog {
  home: readonly string[];
  shared: readonly string[];
  characters: Readonly<Record<string, readonly string[]>>;
  sizes: Readonly<Record<string, number>>;
}
interface Download {
  path: string;
  url: string;
  size: number;
  loaded: number;
  state: AssetProgress['status'];
  home: boolean;
  error?: string;
}
interface PreparationState {
  ids: readonly string[];
  files: Download[];
  listeners: Set<() => void>;
  snapshot: BattleLoadingProgress;
  phase: BattleLoadingProgress['phase'];
  settled: boolean;
  authorizing: boolean;
  released: boolean;
  lease?: GameArtLease;
  resolve: () => void;
  reject: (error: Error) => void;
}
interface LoaderOptions {
  resolveUrl?: (path: string) => string;
  fetch?: typeof globalThis.fetch;
  decodeHome?: (url: string) => Promise<void>;
  acquireArt?: typeof acquireGameArt;
  concurrency?: number;
  /** Inactivity, rather than whole-download duration: slow progressing files work. */
  idleTimeoutMs?: number;
  decodeTimeoutMs?: number;
}
const CHARACTER_ORDER = ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina', 'tharja', 'corrin'];
const message = (error: unknown) => error instanceof Error ? error.message : String(error);
const decodeImage = async (url: string) => {
  const image = new Image(); image.crossOrigin = 'anonymous'; image.decoding = 'async'; image.src = url;
  await image.decode();
  if (!image.naturalWidth || !image.naturalHeight) throw new Error('图片解码失败');
};

/** Per-page transfer state; the browser remains the authority for persistent cache. */
export function createAssetLoading(catalog: AssetCatalog, options: LoaderOptions = {}) {
  const resolveUrl = options.resolveUrl ?? assetUrl;
  const fetchAsset = options.fetch ?? ((...args: Parameters<typeof fetch>) => fetch(...args));
  const acquireArt = options.acquireArt ?? acquireGameArt;
  const concurrency = Math.max(1, Math.min(2, options.concurrency ?? 2));
  const idleTimeout = options.idleTimeoutMs ?? 45_000;
  const decodeTimeout = options.decodeTimeoutMs ?? 90_000;
  const listeners = new Set<() => void>();
  const downloads = new Map<string, Download>();
  const preparationErrors = new Map<string, string>();
  const startedCharacters = new Set<string>();
  const preparations = new Set<PreparationState>();
  let lobbyReferences = 0, active = 0, queued = false;
  let snapshot: AssetLoadingSnapshot;

  function files(paths: readonly string[]): Download[] {
    const result = new Map<string, Download>();
    for (const path of paths) {
      const url = resolveUrl(path);
      let entry = downloads.get(path);
      if (!entry) {
        entry = { path, url, size: catalog.sizes[path] ?? 0, loaded: 0, state: 'waiting', home: false };
        downloads.set(path, entry);
      }
      if (catalog.home.includes(path)) entry.home = true;
      result.set(path, entry);
    }
    return [...result.values()];
  }
  const home = files(catalog.home), shared = files(catalog.shared);
  const characterFiles = Object.fromEntries(Object.entries(catalog.characters).map(([id, paths]) => [id, files([...catalog.shared, ...paths])]));
  const order = [...CHARACTER_ORDER.filter(id => id in characterFiles), ...Object.keys(characterFiles).filter(id => !CHARACTER_ORDER.includes(id))];

  function progress(entries: readonly Download[], extraError?: string): AssetProgress {
    const totalBytes = entries.reduce((sum, file) => sum + file.size, 0);
    const loadedBytes = entries.reduce((sum, file) => sum + file.loaded, 0);
    const error = extraError ?? entries.find(file => file.state === 'error')?.error;
    const complete = entries.every(file => file.state === 'ready');
    return {
      status: error ? 'error' : complete ? 'ready' : entries.some(file => file.state !== 'waiting') ? 'loading' : 'waiting',
      totalBytes, loadedBytes,
      percent: complete ? 100 : totalBytes ? Math.min(99, Math.floor(loadedBytes / totalBytes * 100)) : 0,
      ...(error ? { error } : {}),
    };
  }
  function publish() {
    snapshot = {
      home: progress(home),
      characters: Object.fromEntries(Object.entries(characterFiles).map(([id, entries]) => {
        const state = progress(entries, preparationErrors.get(id));
        if (!startedCharacters.has(id) && state.status !== 'ready' && state.status !== 'error') state.status = 'waiting';
        return [id, state];
      })),
      homeReadyUrls: home.filter(file => file.state === 'ready').map(file => file.url),
    };
    for (const preparation of preparations) {
      if (preparation.settled) continue;
      const download = progress(preparation.files);
      preparation.snapshot = { ...download, status: preparation.phase === 'decode' ? 'loading' : download.status, phase: preparation.phase };
      for (const listener of preparation.listeners) listener();
    }
    for (const listener of listeners) listener();
  }
  function schedule() {
    if (queued) return;
    queued = true;
    queueMicrotask(() => { queued = false; pump(); });
  }
  function timeout<T>(work: Promise<T>, ms: number, label: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout>;
    return Promise.race([work, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error(label)), ms); })])
      .finally(() => clearTimeout(timer));
  }
  async function download(file: Download) {
    active++; file.state = 'loading'; file.loaded = 0; file.error = undefined;
    publish();
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    const heartbeat = () => { clearTimeout(timer); timer = setTimeout(() => controller.abort(), idleTimeout); };
    heartbeat();
    try {
      if (!options.resolveUrl) await ensureArtUrls();
      file.url = resolveUrl(file.path);
      // default honors the production immutable HTTP cache without overriding
      // dev validation. Do not route, cache-bust or retain response buffers.
      const response = await fetchAsset(file.url, { cache: 'default', signal: controller.signal });
      if (!response.ok) throw new Error(`素材请求失败 (${response.status})`);
      let received = 0;
      if (response.body) {
        const reader = response.body.getReader();
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            heartbeat(); received += value.byteLength;
            // Streams contain decoded bytes even when nginx gzip is enabled.
            // Catalog sizes therefore take precedence over Content-Length.
            file.loaded = file.size ? Math.min(file.size, received) : received;
            publish();
          }
        } finally { reader.releaseLock(); }
      } else {
        const body = await response.arrayBuffer(); received = body.byteLength;
      }
      clearTimeout(timer!);
      if (file.size && received !== file.size) throw new Error('素材不完整，请重试');
      if (!file.size) file.size = received;
      if (file.home) await timeout((options.decodeHome ?? decodeImage)(file.url), decodeTimeout, '首页图片解码超时，请重试');
      file.loaded = file.size; file.state = file.url === resolveUrl(file.path) ? 'ready' : 'waiting';
    } catch (error) {
      file.state = 'error';
      file.error = controller.signal.aborted ? '网络长时间无响应，请重试' : message(error);
    } finally {
      clearTimeout(timer!); active--; publish(); schedule();
    }
  }
  function finishError(preparation: PreparationState, error: Error) {
    if (preparation.released || preparation.settled) return;
    preparation.settled = true;
    preparation.snapshot = { ...progress(preparation.files), status: 'error', error: error.message, phase: preparation.phase };
    if (preparation.phase === 'decode') for (const id of preparation.ids) preparationErrors.set(id, error.message);
    preparation.lease?.release(); preparation.lease = undefined;
    preparation.reject(error);
    for (const listener of preparation.listeners) listener();
    publish();
  }
  function checkPreparations() {
    for (const preparation of preparations) {
      if (preparation.settled || preparation.released || preparation.phase !== 'download' || preparation.authorizing) continue;
      for (const file of preparation.files) if (file.state === 'ready' && file.url !== resolveUrl(file.path)) {
        file.url = resolveUrl(file.path); file.state = 'waiting'; file.loaded = 0;
      }
      const state = progress(preparation.files);
      if (state.status === 'error') { finishError(preparation, new Error(state.error)); continue; }
      if (state.status !== 'ready') continue;
      preparation.phase = 'decode'; publish();
      try { preparation.lease = acquireArt(preparation.ids, { strict: true }); }
      catch (error) { finishError(preparation, new Error(message(error))); continue; }
      void timeout(preparation.lease.ready, decodeTimeout, '动画准备超时，请重试').then(() => {
        if (preparation.released) return;
        preparation.phase = 'ready'; preparation.settled = true;
        preparation.snapshot = { ...progress(preparation.files), status: 'ready', percent: 100, phase: 'ready' };
        preparation.resolve();
        for (const listener of preparation.listeners) listener();
      }, error => finishError(preparation, new Error(message(error))));
    }
  }
  function nextFile(): Download | undefined {
    // Released navigations never start new files. Existing responses finish so
    // partial multi-megabyte atlases do not get downloaded a second time.
    for (const preparation of preparations) {
      if (preparation.settled || preparation.released) continue;
      const pending = preparation.files.find(file => file.state === 'waiting');
      if (pending) return pending;
    }
    if (preparations.size || !lobbyReferences) return;
    if (home.some(file => file.state === 'waiting' || file.state === 'loading')) return home.find(file => file.state === 'waiting');
    // A failed pack does not prevent later characters from being prepared.
    for (const id of order) {
      const entries = characterFiles[id];
      if (preparationErrors.has(id) || entries.some(file => file.state === 'error')) continue;
      if (entries.every(file => file.state === 'ready')) continue;
      startedCharacters.add(id);
      return entries.find(file => file.state === 'waiting');
    }
    return undefined;
  }
  function pump() {
    checkPreparations();
    while (active < concurrency) {
      const file = nextFile();
      if (!file) break;
      void download(file);
    }
  }
  function reset(entries: readonly Download[]) {
    for (const file of entries) if (file.state === 'error') { file.state = 'waiting'; file.loaded = 0; file.error = undefined; }
  }
  if (!options.resolveUrl) onArtUrlsChanged(() => {
    for (const file of downloads.values()) {
      if (file.state === 'loading' || (file.state === 'ready' && !file.home)) continue;
      file.url = resolveUrl(file.path);
      file.state = 'waiting'; file.loaded = 0; file.error = undefined;
    }
    preparationErrors.clear(); publish(); schedule();
  });
  publish();
  return {
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    getSnapshot: () => snapshot,
    enterLobby() {
      if (!options.resolveUrl) void ensureArtUrls().catch(() => undefined);
      lobbyReferences++; schedule(); let released = false;
      return () => { if (released) return; released = true; lobbyReferences--; schedule(); };
    },
    retryHome() {
      const retry = () => { reset(home); publish(); schedule(); };
      if (options.resolveUrl) retry(); else void ensureArtUrls(true).catch(() => undefined).then(retry);
    },
    retryCharacter(id: string) {
      const retry = () => { preparationErrors.delete(id); reset(characterFiles[id] ?? []); publish(); schedule(); };
      if (options.resolveUrl) retry(); else void ensureArtUrls(true).catch(() => undefined).then(retry);
    },
    prepareBattle(ids: readonly string[]): BattlePreparation {
      const selected = [...new Set(ids)];
      const unknown = selected.find(id => !characterFiles[id]);
      const entries = [...new Set([...shared, ...selected.flatMap(id => characterFiles[id] ?? [])])];
      reset(entries);
      for (const id of selected) { preparationErrors.delete(id); startedCharacters.add(id); }
      let resolve!: () => void, reject!: (error: Error) => void;
      const ready = new Promise<void>((ok, fail) => { resolve = ok; reject = fail; });
      // Consumers normally attach immediately; cleanup in React StrictMode can
      // cancel a session before its effect has attached an error handler.
      void ready.catch(() => undefined);
      const preparation: PreparationState = { ids: selected, files: entries, listeners: new Set(), snapshot: { ...progress(entries), phase: 'download' }, phase: 'download', settled: false, authorizing: !options.resolveUrl, released: false, resolve, reject };
      preparations.add(preparation);
      if (!options.resolveUrl) void ensureArtUrls().then(() => {
        // Warm the exact current URLs that the new art lease will decode.
        // Background packs retain progress across expiry until actually selected.
        for (const file of entries) if (file.state !== 'loading' && file.url !== resolveUrl(file.path)) {
          file.url = resolveUrl(file.path); file.state = 'waiting'; file.loaded = 0; file.error = undefined;
        }
        preparation.authorizing = false; publish(); schedule();
      }, error => finishError(preparation, new Error(message(error))));
      if (!selected.length || unknown) finishError(preparation, new Error('无法识别本局角色'));
      publish(); schedule();
      return {
        ready,
        subscribe(listener) { preparation.listeners.add(listener); return () => { preparation.listeners.delete(listener); }; },
        getSnapshot: () => preparation.snapshot,
        release() {
          if (preparation.released) return;
          preparation.released = true; preparations.delete(preparation);
          preparation.lease?.release(); preparation.lease = undefined;
          if (!preparation.settled) { preparation.settled = true; preparation.reject(new Error('已取消素材准备')); }
          preparation.listeners.clear(); schedule();
        },
      };
    },
  };
}

export const assetLoading = createAssetLoading(ART_CATALOG);
