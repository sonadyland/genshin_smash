import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = ts.transpileModule(fs.readFileSync(path.join(root, 'src/game/audio.ts'), 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
const flush = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };

function environment(options = {}) {
  const contexts = [], media = [], sources = [], timers = new Map(), timeouts = new Map(), revoked = [], requests = [];
  let nextTimer = 0, nextUrl = 0;
  class Parameter {
    value = 0; events = [];
    setValueAtTime(value, time) { this.value = value; this.events.push(['set', value, time]); }
    exponentialRampToValueAtTime(value, time) { this.events.push(['ramp', value, time]); }
    cancelScheduledValues(time) { this.events.push(['cancel', time]); }
  }
  class Node {
    connected = []; disconnected = false;
    connect(node) { this.connected.push(node); return node; }
    disconnect() { this.disconnected = true; this.connected = []; }
  }
  class Source extends Node {
    frequency = new Parameter(); onended = null; starts = []; stops = [];
    constructor(kind) { super(); this.kind = kind; sources.push(this); }
    start(...args) { this.starts.push(args); }
    stop(...args) { this.stops.push(args); }
  }
  class Context {
    state = options.suspended ? 'suspended' : 'running'; currentTime = 0; sampleRate = 8000; destination = new Node(); gains = []; filters = []; closed = 0;
    transitions = [];
    constructor() { contexts.push(this); }
    createGain() { const n = new Node(); n.gain = new Parameter(); this.gains.push(n); return n; }
    createDynamicsCompressor() { const n = new Node(); for (const key of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[key] = new Parameter(); return n; }
    createBuffer(_channels, length) { return { getChannelData: () => new Float32Array(length) }; }
    createOscillator() { return new Source('oscillator'); }
    createBufferSource() { return new Source('noise'); }
    createBiquadFilter() { const n = new Node(); n.frequency = new Parameter(); n.Q = new Parameter(); this.filters.push(n); return n; }
    resume() { return this.transition('running'); }
    suspend() { return this.transition('suspended'); }
    transition(state) {
      if (options.deferContext) return new Promise(resolve => this.transitions.push({ state, resolve: () => { this.state = state; resolve(); } }));
      this.state = state; return Promise.resolve();
    }
    close() { this.state = 'closed'; this.closed++; return Promise.resolve(); }
  }
  class Media {
    paused = true; currentTime = 0; playCount = 0; pauseCount = 0; pending = []; onerror = null;
    constructor(src) { this.src = src; media.push(this); }
    play() {
      this.playCount++;
      if (options.rejectPlay) return Promise.reject(options.rejectPlay);
      if (options.deferPlay) return new Promise((resolve, reject) => this.pending.push({ resolve: () => { this.paused = false; resolve(); }, reject }));
      this.paused = false; return Promise.resolve();
    }
    pause() { this.paused = true; this.pauseCount++; }
    removeAttribute(key) { if (key === 'src') this.src = ''; }
    load() { this.loaded = true; }
  }
  const fakeMath = Object.create(Math);
  fakeMath.random = () => { throw new Error('Audio consumed gameplay Math.random'); };
  class AudioUrl extends URL {
    static createObjectURL() { return `blob:test-${++nextUrl}`; }
    static revokeObjectURL(url) { revoked.push(url); }
  }
  const context = vm.createContext({
    console, Math: fakeMath, Error, Promise, Float32Array, URL: AudioUrl,
    Audio: options.noAudio ? undefined : Media, AudioContext: options.noContext ? undefined : Context,
    setInterval: fn => { const id = ++nextTimer; timers.set(id, fn); return id; }, clearInterval: id => timers.delete(id),
    setTimeout: fn => { const id = ++nextTimer; timeouts.set(id, fn); return id; }, clearTimeout: id => timeouts.delete(id),
    ...(options.manifest ? { document: { baseURI: 'https://example.test/game/' }, fetch: async url => { requests.push(url); return { ok: true, json: async () => options.manifest }; } } : {}),
  });
  const mod = { exports: {} };
  vm.runInContext(`(function(exports, module) { ${source}\n})`, context)(mod.exports, mod);
  return { ...mod.exports, contexts, media, sources, timers, timeouts, revoked, requests, options,
    active() { this.unlockBattleAudio(); const session = new this.BattleAudio(); session.setScene('playing'); return session; },
    fireTimeouts() { for (const [id, fn] of [...timeouts]) { timeouts.delete(id); fn(); } },
  };
}
const cases = [];
const test = (name, run) => cases.push({ name, run });

test('mounting or starting without interaction creates no audio context or playback', () => {
  const e = environment(), session = new e.BattleAudio(); session.setScene('playing'); session.play('cast', { charId: 'raiden' });
  assert.equal(e.contexts.length, 0); assert.equal(e.media.length, 0); assert.equal(e.sources.length, 0); session.destroy();
});
test('the initial click is adopted by one arena and real OST uses native looping media without CORS graph', async () => {
  const e = environment(), session = e.active(); await flush();
  assert.equal(e.contexts.length, 1); assert.equal(e.media.length, 1);
  assert.equal(e.media[0].loop, true); assert.equal(e.media[0].crossOrigin, undefined);
  assert.match(e.media[0].src, /^https:\/\/music\.163\.com\/song\/media\/outer\/url\?id=1492283139\.mp3$/);
  assert.equal(e.media[0].paused, false); assert.equal(e.getAudioSettings().trackStatus, 'ready');
  assert.equal(e.sources.length, 0, 'No procedural music layered over successful OST'); session.destroy();
});
test('live independent volume and all-mute apply to active nodes without restarting music', async () => {
  const e = environment(), session = e.active(); await flush();
  const media = e.media[0]; media.currentTime = 41;
  e.setAudioSettings({ musicVolume: 0.18, sfxVolume: 0.85 });
  assert.equal(media.volume, 0.18); assert.equal(session.sfxGain.gain.value, 0.85);
  session.setMuted(true); assert.equal(media.muted, true); assert.equal(session.musicGain.gain.value, 0); assert.equal(session.sfxGain.gain.value, 0);
  const count = e.sources.length; session.play('cast', { charId: 'diluc' }); assert.equal(e.sources.length, count);
  session.setMuted(false); assert.equal(media.muted, false); assert.equal(session.sfxGain.gain.value, 0.85);
  assert.equal(media.currentTime, 41); assert.equal(media.playCount, 1); assert.equal(e.media.length, 1);
  e.setAudioSettings({ musicVolume: 99, sfxVolume: -2 }); assert.equal(media.volume, 1); assert.equal(session.sfxGain.gain.value, 0);
  session.destroy();
});
test('seven elemental skills have distinct layered timbres and never consume game RNG', async () => {
  const signatures = [];
  for (const charId of ['raiden', 'jean', 'eula', 'diluc', 'xiao', 'zhongli', 'furina']) {
    const e = environment(), session = e.active(); await flush();
    session.play('cast', { charId, kind: 'secondary' });
    assert.ok(e.sources.length >= 3, charId);
    signatures.push(JSON.stringify({ sources: e.sources.map(n => [n.kind, n.type, n.frequency.events]), filters: e.contexts[0].filters.map(n => [n.type, n.frequency.events]) }));
    session.destroy();
  }
  assert.equal(new Set(signatures).size, 7);
});
test('salon pet layers share a rate limit, recover after the interval, and leave room for a cast', async () => {
  const e = environment(), session = e.active(); await flush();
  session.play('summon', { charId: 'furina', summonKind: 'bubble' }); const first = e.sources.length;
  assert.ok(first >= 3);
  for (const summonKind of ['water-pierce', 'crab-splash', 'bubble']) session.play('summon', { charId: 'furina', summonKind });
  assert.equal(e.sources.length, first);
  e.contexts[0].currentTime += .12;
  session.play('summon', { charId: 'furina', summonKind: 'crab-splash' }); assert.ok(e.sources.length > first);
  const beforeCast = e.sources.length; session.play('cast', { charId: 'furina', kind: 'secondary' }); assert.ok(e.sources.length > beforeCast);
  session.play('shield', { charId: 'zhongli' }); assert.ok(session.voices.length <= 32); session.destroy();
});
test('crowd hits are rate-limited but a same-frame skill remains audible and voice budget is finite', async () => {
  const e = environment(), session = e.active(); await flush();
  session.play('impact', { charId: 'raiden' }); const first = e.sources.length;
  for (let i = 0; i < 100; i++) session.play('impact', { charId: 'raiden' });
  assert.equal(e.sources.length, first);
  session.play('cast', { charId: 'raiden', kind: 'special' }); assert.ok(e.sources.length > first);
  for (let i = 0; i < 50; i++) { e.contexts[0].currentTime += 0.02; session.play('cast', { charId: 'raiden', kind: 'secondary' }); }
  assert.ok(session.voices.length <= 32); assert.ok(session.voices.every(v => v.priority === 3));
  const protectedVoices = [...session.voices]; session.play('pickup');
  assert.ok(protectedVoices.every(v => session.voices.includes(v)), 'Low-priority pickup cannot steal a skill voice');
  session.destroy(); assert.equal(session.voices.length, 0);
});
test('pause, upgrade and result stop soundtrack and effects; explicit resume preserves position', async () => {
  const e = environment(), session = e.active(); await flush();
  const media = e.media[0]; media.currentTime = 37;
  for (const scene of ['paused', 'upgrade', 'result']) {
    session.play('cast', { charId: 'diluc' }); session.setScene(scene);
    assert.equal(media.paused, true); assert.equal(session.voices.length, 0); assert.equal(e.contexts[0].state, 'suspended');
    session.play('cast', { charId: 'raiden' }); assert.equal(session.voices.length, 0);
    session.setScene('playing'); await flush(); assert.equal(media.paused, false); assert.equal(media.currentTime, 37);
  }
  session.restart(); await flush(); assert.equal(media.currentTime, 0); assert.equal(e.media.length, 1); session.destroy();
});
test('async context resume preserves the upgrade cue and pause clears queued sounds', async () => {
  const e = environment({ deferContext: true }), session = e.active(); await flush();
  const ctx = e.contexts[0]; ctx.transitions.shift().resolve(); await flush();
  session.setScene('upgrade'); ctx.transitions.shift().resolve(); await flush(); assert.equal(ctx.state, 'suspended');
  session.setScene('playing'); session.play('upgrade'); assert.equal(e.sources.length, 0); assert.equal(session.pendingSounds.length, 1);
  ctx.transitions.shift().resolve(); await flush(); assert.equal(e.sources.length, 4); assert.equal(session.pendingSounds.length, 0);
  session.setScene('paused'); ctx.transitions.shift().resolve(); await flush();
  session.setScene('playing'); session.play('cast', { charId: 'diluc' }); assert.equal(session.pendingSounds.length, 1);
  session.setScene('paused'); assert.equal(session.pendingSounds.length, 0); session.destroy();
});
test('rapid pause/resume requests recover even when old context transitions finish late', async () => {
  const e = environment({ deferContext: true }), session = e.active(); await flush(); const ctx = e.contexts[0];
  ctx.transitions.shift().resolve(); await flush();
  session.setScene('paused'); session.setScene('playing');
  assert.deepEqual(ctx.transitions.map(item => item.state), ['suspended', 'running']);
  const oldPause = ctx.transitions.shift(), newerResume = ctx.transitions.shift();
  newerResume.resolve(); await flush(); oldPause.resolve(); await flush();
  assert.equal(ctx.transitions.at(-1).state, 'running'); ctx.transitions.pop().resolve(); await flush();
  assert.equal(ctx.state, 'running'); session.play('cast', { charId: 'eula' }); assert.ok(e.sources.length > 0);
  session.setScene('paused'); const pause = ctx.transitions.pop(); session.destroy(); pause.resolve(); await flush();
  assert.equal(e.timers.size, 0); assert.equal(session.pendingSounds.length, 0); assert.equal(e.media[0].paused, true);
});
test('late media completion cannot resurrect music after pause, replacement or destruction', async () => {
  const e = environment({ deferPlay: true }), session = e.active(), old = e.media[0];
  session.setScene('paused'); old.pending[0].resolve(); await flush(); assert.equal(old.paused, true);
  session.setScene('playing'); await flush(); const pending = old.pending.at(-1);
  e.importMusicFile({ name: 'new.mp3', size: 250 }); const newer = e.media[1];
  pending.resolve(); await flush(); assert.equal(old.paused, true); assert.equal(newer.paused, true);
  session.destroy(); newer.pending[0].resolve(); await flush(); assert.equal(newer.paused, true);
  assert.equal(e.contexts[0].closed, 1); assert.equal(e.timers.size, 0); assert.equal(e.timeouts.size, 0);
});
test('an older pending play cannot pause a newer successful resume on the same element', async () => {
  const e = environment({ deferPlay: true }), session = e.active(), media = e.media[0];
  session.setScene('paused'); session.setScene('playing'); await flush();
  media.pending[1].resolve(); await flush(); assert.equal(media.paused, false);
  media.pending[0].resolve(); await flush(); assert.equal(media.paused, false); session.destroy();
});
test('decode/network failure switches to clearly named original fallback with bounded timer and voices', async () => {
  const e = environment({ rejectPlay: new Error('Unsupported source') }), session = e.active(); await flush();
  assert.equal(e.getAudioSettings().trackSource, 'fallback'); assert.equal(e.getAudioSettings().trackStatus, 'fallback');
  assert.match(e.getAudioSettings().trackTitle, /原创/); assert.equal(e.timers.size, 1); assert.ok(e.sources.length > 0);
  for (let i = 0; i < 500; i++) { e.contexts[0].currentTime += 0.1; for (const tick of e.timers.values()) tick(); }
  assert.ok(session.voices.length <= 24); session.setScene('paused'); assert.equal(e.timers.size, 0); assert.equal(session.voices.length, 0);
  session.setScene('playing'); await flush(); assert.equal(e.timers.size, 1); session.destroy(); assert.equal(e.timers.size, 0);
});
test('a stalled stream times out to fallback and default source can be explicitly retried', async () => {
  const e = environment({ deferPlay: true }), session = e.active(); e.fireTimeouts();
  assert.equal(e.getAudioSettings().trackStatus, 'fallback'); assert.equal(e.timers.size, 1);
  e.resetMusicSource(); assert.equal(e.media.length, 2); assert.equal(e.timers.size, 0);
  e.media[1].pending[0].resolve(); await flush(); assert.equal(e.getAudioSettings().trackStatus, 'ready'); session.destroy();
});
test('autoplay rejection is visible and recovers from a later user gesture', async () => {
  const error = new Error('Interaction required'); error.name = 'NotAllowedError';
  const e = environment({ rejectPlay: error }), session = e.active(); await flush();
  assert.equal(e.getAudioSettings().trackStatus, 'blocked'); assert.equal(e.timers.size, 0);
  e.options.rejectPlay = null; session.unlock(); await flush(); assert.equal(e.getAudioSettings().trackStatus, 'ready'); session.destroy();
});
test('local file replacement detaches media before revoking URLs and reset restores configured source', async () => {
  const e = environment(), session = e.active(); await flush();
  assert.throws(() => e.importMusicFile({ name: 'wrong.txt', size: 5 }));
  assert.throws(() => e.importMusicFile({ name: 'huge.mp3', size: 90 * 1024 * 1024 }));
  e.importMusicFile({ name: 'first.ogg', size: 100 }); await flush(); assert.equal(e.getAudioSettings().trackSource, 'imported');
  const first = e.media.at(-1); e.importMusicFile({ name: 'second.wav', size: 120 }); await flush();
  assert.equal(first.paused, true); assert.equal(first.src, ''); assert.deepEqual(e.revoked, ['blob:test-1']);
  e.resetMusicSource(); await flush(); assert.deepEqual(e.revoked, ['blob:test-1', 'blob:test-2']);
  assert.equal(e.getAudioSettings().trackSource, 'configured'); assert.match(e.media.at(-1).src, /1492283139/); session.destroy();
});
test('deployed manifest resolves local assets relative to its folder and empty src opts into fallback', async () => {
  for (const src of ['battle.mp3', '']) {
    const e = environment({ manifest: { src, title: '自定义战斗曲' } }), session = e.active(); await flush();
    assert.equal(e.requests[0], 'https://example.test/game/assets/audio/music.json');
    if (src) assert.equal(e.media.at(-1).src, 'https://example.test/game/assets/audio/battle.mp3');
    else assert.equal(e.getAudioSettings().trackSource, 'fallback');
    session.destroy();
  }
});
test('subscription snapshots are stable without changes and destruction is idempotent', async () => {
  const e = environment(), session = e.active(); await flush(); let notifications = 0;
  const off = e.subscribeAudioSettings(() => notifications++), first = e.getAudioSettings();
  e.setAudioSettings({ musicVolume: first.musicVolume }); assert.equal(e.getAudioSettings(), first); assert.equal(notifications, 0);
  e.setAudioSettings({ musicVolume: 0.12 }); assert.equal(notifications, 1); off(); e.setAudioSettings({ musicVolume: 0.14 }); assert.equal(notifications, 1);
  session.destroy(); session.destroy(); assert.equal(e.contexts[0].closed, 1);
  session.unlock(); session.play('cast'); assert.equal(e.contexts.length, 1);
});
test('browsers with unavailable sound hardware still run the optional soundtrack and gameplay calls safely', async () => {
  const e = environment({ noContext: true }), session = e.active(); await flush();
  session.play('cast', { charId: 'raiden' }); assert.equal(e.media[0].paused, false);
  session.setScene('paused'); session.setScene('playing'); session.destroy();
  const silent = environment({ noContext: true, noAudio: true }), noDevice = silent.active(); noDevice.play('cast'); noDevice.destroy();
});

let failures = 0;
for (const { name, run } of cases) { try { await run(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}\n`, error); } }
console.log(`\n${cases.length - failures}/${cases.length} audio regression checks passed.`);
if (failures) process.exitCode = 1;
