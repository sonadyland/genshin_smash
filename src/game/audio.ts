/** Battle sound has its own clock and random generator; it never advances gameplay RNG. */
export type AudioScene = 'playing' | 'paused' | 'upgrade' | 'result';
export type SoundEvent = 'attack' | 'cast' | 'impact' | 'hurt' | 'jump' | 'land' | 'dodge' | 'pickup' | 'upgrade' | 'ko' | 'explosion' | 'select' | 'throw' | 'summon' | 'shield';
export interface SoundOptions { charId?: string; kind?: 'jab' | 'smash' | 'special' | 'secondary'; power?: number; summonKind?: 'geo-meteor' | 'geo-pulse' | 'hydro-wave' | 'bubble' | 'water-pierce' | 'crab-splash' }
export interface AudioSettings {
  musicVolume: number; sfxVolume: number; trackTitle: string;
  trackSource: 'fallback' | 'configured' | 'imported';
  trackStatus: 'loading' | 'ready' | 'fallback' | 'blocked';
}
const ORIGINAL_TITLE = '疾如猛火 · Rapid as Wildfires';
const ORIGINAL_URL = 'https://music.163.com/song/media/outer/url?id=1492283139.mp3';
const FALLBACK_TITLE = '山岳行阵 · 原创程序配乐';
let settings: AudioSettings = { musicVolume: 0.32, sfxVolume: 0.72, trackTitle: ORIGINAL_TITLE, trackSource: 'configured', trackStatus: 'loading' };
type MusicSource = { src: string; title: string; sourcePage?: string };
let configured: MusicSource = { src: ORIGINAL_URL, title: ORIGINAL_TITLE, sourcePage: 'https://music.163.com/song?id=1492283139' };
let selected = configured;
let importedUrl: string | null = null;
let configurationLoaded = false;
let configurationVersion = 0;
const subscribers = new Set<() => void>();
const sessions = new Set<BattleAudio>();
let gestureContext: AudioContext | null = null;
let userUnlocked = false;
const clamp = (v: number) => Math.max(0, Math.min(1, v));

function publish(patch: Partial<AudioSettings>) {
  const next = { ...settings, ...patch };
  if (JSON.stringify(next) === JSON.stringify(settings)) return;
  settings = next;
  subscribers.forEach(listener => listener());
}
export const getAudioSettings = (): AudioSettings => settings;
export function subscribeAudioSettings(listener: () => void): () => void { subscribers.add(listener); return () => subscribers.delete(listener); }
export function setAudioSettings(patch: { musicVolume?: number; sfxVolume?: number }) {
  const musicVolume = Number.isFinite(patch.musicVolume) ? clamp(patch.musicVolume!) : settings.musicVolume;
  const sfxVolume = Number.isFinite(patch.sfxVolume) ? clamp(patch.sfxVolume!) : settings.sfxVolume;
  publish({ musicVolume, sfxVolume });
  sessions.forEach(session => session.setMix({ music: musicVolume, sfx: sfxVolume }));
}
function changeSource(source: MusicSource, imported: boolean, force = false) {
  if (!force && selected.src === source.src && selected.title === source.title && imported === (settings.trackSource === 'imported')) return;
  selected = source;
  publish({ trackTitle: source.src ? source.title : FALLBACK_TITLE, trackSource: source.src ? imported ? 'imported' : 'configured' : 'fallback', trackStatus: source.src ? 'loading' : 'fallback' });
  sessions.forEach(session => session.replaceMusicSource());
}
export function importMusicFile(file: File): void {
  if (!file || !/\.(mp3|ogg|wav|m4a|aac|flac|opus)$/i.test(file.name) || file.size > 80 * 1024 * 1024 || file.size === 0) throw new Error('请选择 80 MB 以内的 MP3、OGG、WAV、M4A、AAC、FLAC 或 OPUS 音频。');
  const previous = importedUrl;
  importedUrl = URL.createObjectURL(file);
  configurationVersion++;
  changeSource({ src: importedUrl, title: file.name.replace(/\.[^.]+$/, '') }, true);
  if (previous) URL.revokeObjectURL(previous);
}
export function resetMusicSource(): void {
  const previous = importedUrl; importedUrl = null;
  configurationVersion++;
  changeSource(configured, false, true);
  if (previous) URL.revokeObjectURL(previous);
}
function newContext(): AudioContext | null {
  if (typeof AudioContext === 'undefined') return null;
  try { return new AudioContext(); } catch { return null; }
}
/** Call directly inside the click/keydown handler, before React mounts the arena. */
export function unlockBattleAudio(): void {
  userUnlocked = true;
  if (sessions.size) sessions.forEach(session => session.unlock());
  else {
    gestureContext ??= newContext();
    if (gestureContext?.state === 'suspended') void gestureContext.resume().catch(() => undefined);
  }
}
function loadConfiguration() {
  if (configurationLoaded || typeof fetch === 'undefined' || typeof document === 'undefined' || !document.baseURI) return;
  configurationLoaded = true;
  const version = configurationVersion;
  const manifestUrl = new URL('assets/audio/music.json', document.baseURI).href;
  void fetch(manifestUrl).then(response => response.ok ? response.json() : null).then((value: unknown) => {
    if (!value || typeof value !== 'object') return;
    const data = value as Record<string, unknown>;
    if (typeof data.src !== 'string' || typeof data.title !== 'string') return;
    const src = data.src ? new URL(data.src, manifestUrl).href : '';
    if (src && !/^https?:/i.test(src)) return;
    configured = { src, title: data.title, sourcePage: typeof data.sourcePage === 'string' ? data.sourcePage : undefined };
    if (version === configurationVersion && !importedUrl) changeSource(configured, false);
  }).catch(() => undefined);
}

type Voice = { source: AudioScheduledSourceNode; nodes: AudioNode[]; bus: 'music' | 'sfx'; priority: number };
/** One arena owns one session; destruction stops every source, timer and pending play. */
export class BattleAudio {
  private context: AudioContext | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private noise: AudioBuffer | null = null;
  private voices: Voice[] = [];
  private media: HTMLAudioElement | null = null;
  private mediaFailed = false;
  private mediaPending = false;
  private mediaVersion = 0;
  private loadingTimer: ReturnType<typeof setTimeout> | null = null;
  private timer: ReturnType<typeof setInterval> | null = null;
  private nextBeat = 0;
  private musicStep = 0;
  private seed = 0x9e3779b9;
  private lastEvents = new Map<string, number>();
  private pendingSounds: { event: SoundEvent; options: SoundOptions }[] = [];
  private scene: AudioScene = 'paused';
  private destroyed = false;
  private unlocked = false;
  private musicVolume = settings.musicVolume;
  private sfxVolume = settings.sfxVolume;
  muted = false;

  constructor() { sessions.add(this); loadConfiguration(); }
  private random() { this.seed = (Math.imul(this.seed, 1664525) + 1013904223) >>> 0; return this.seed / 4294967296; }
  private ensureContext() {
    if (this.context || !this.unlocked || this.destroyed) return this.context;
    this.context = gestureContext ?? newContext(); gestureContext = null;
    const ctx = this.context;
    if (!ctx) return null;
    this.musicGain = ctx.createGain(); this.sfxGain = ctx.createGain(); this.compressor = ctx.createDynamicsCompressor();
    this.compressor.threshold.value = -13; this.compressor.knee.value = 14; this.compressor.ratio.value = 5;
    this.compressor.attack.value = 0.003; this.compressor.release.value = 0.18;
    this.musicGain.connect(this.compressor); this.sfxGain.connect(this.compressor); this.compressor.connect(ctx.destination);
    this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const samples = this.noise.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = this.random() * 2 - 1;
    this.applyMix();
    return ctx;
  }
  unlock(): void {
    if (this.destroyed) return;
    userUnlocked = true; this.unlocked = true;
    this.ensureContext();
    // HTMLAudio playback also needs to be requested synchronously in the gesture.
    if (this.scene === 'playing') this.startMusic();
    this.syncContext();
  }
  private syncContext(): void {
    const ctx = this.context;
    if (!ctx || this.destroyed || ctx.state === 'closed') return;
    // Always enqueue the desired operation. The visible state may still describe
    // the moment before an opposite suspend/resume request has completed.
    const operation = this.scene === 'playing' ? ctx.resume() : ctx.suspend();
    void operation.then(() => {
      if (this.destroyed || this.context !== ctx || ctx.state === 'closed') return;
      const playing = this.scene === 'playing';
      if ((playing && ctx.state !== 'running') || (!playing && ctx.state !== 'suspended')) { this.syncContext(); return; }
      if (playing) {
        this.startMusic();
        const pending = this.pendingSounds; this.pendingSounds = [];
        for (const sound of pending) this.play(sound.event, sound.options);
      }
    }).catch(() => { this.pendingSounds = []; });
  }
  setMuted(value: boolean): void { this.muted = value; this.applyMix(); }
  setMix(value: { music?: number; sfx?: number }): void {
    if (Number.isFinite(value.music)) this.musicVolume = clamp(value.music!);
    if (Number.isFinite(value.sfx)) this.sfxVolume = clamp(value.sfx!);
    this.applyMix();
  }
  private applyMix() {
    const time = this.context?.currentTime ?? 0;
    for (const [node, volume] of [[this.musicGain, this.musicVolume], [this.sfxGain, this.sfxVolume]] as const) {
      if (node) { node.gain.cancelScheduledValues(time); node.gain.setValueAtTime(this.muted ? 0 : volume, time); }
    }
    if (this.media) { this.media.volume = this.musicVolume; this.media.muted = this.muted; }
  }
  setScene(scene: AudioScene): void {
    if (this.destroyed || this.scene === scene) return;
    this.scene = scene;
    if (scene === 'playing') {
      if (userUnlocked) this.unlock();
    } else {
      this.stopMusic(false); this.stopVoices('sfx'); this.pendingSounds = [];
      this.syncContext();
    }
  }
  restart(): void {
    if (this.destroyed) return;
    this.stopMusic(true); this.stopVoices('sfx'); this.pendingSounds = []; this.lastEvents.clear(); this.musicStep = 0; this.mediaFailed = false;
    if (this.scene === 'playing' && this.unlocked) this.startMusic();
  }
  replaceMusicSource(): void {
    if (this.destroyed) return;
    this.stopMusic(true); this.disposeMedia(); this.musicStep = 0;
    if (this.scene === 'playing' && this.unlocked) this.startMusic();
  }
  private disposeMedia() {
    this.clearLoadingTimer();
    this.mediaVersion++; this.mediaPending = false; this.mediaFailed = false;
    if (this.media) { this.media.pause(); this.media.onerror = null; this.media.removeAttribute('src'); this.media.load(); this.media = null; }
  }
  private startMusic() {
    if (this.destroyed || !this.unlocked || this.scene !== 'playing') return;
    const ctx = this.ensureContext();
    if (selected.src && !this.mediaFailed && typeof Audio !== 'undefined') {
      if (!this.media) {
        this.media = new Audio(selected.src); this.media.loop = true; this.media.preload = 'auto';
        // Keep remote music outside the Web Audio graph: its host need not grant CORS.
        this.media.onerror = () => this.failMedia(); this.applyMix();
      }
      if (this.media.paused && !this.mediaPending) {
        this.mediaPending = true;
        const media = this.media, version = this.mediaVersion;
        if (typeof setTimeout !== 'undefined') this.loadingTimer = setTimeout(() => {
          if (!this.destroyed && version === this.mediaVersion && this.mediaPending) this.failMedia();
        }, 12000);
        void media.play().then(() => {
          if (this.destroyed || this.media !== media || this.scene !== 'playing') { media.pause(); return; }
          if (version !== this.mediaVersion) return;
          this.mediaPending = false;
          this.clearLoadingTimer();
          this.stopVoices('music'); this.stopTimer();
          publish({ trackStatus: 'ready', trackTitle: selected.title, trackSource: importedUrl ? 'imported' : 'configured' });
        }).catch((error: unknown) => {
          if (this.destroyed || version !== this.mediaVersion) return;
          this.mediaPending = false;
          this.clearLoadingTimer();
          if (error instanceof Error && error.name === 'NotAllowedError') publish({ trackStatus: 'blocked' });
          else this.failMedia();
        });
      }
    }
    if ((!selected.src || this.mediaFailed) && ctx?.state === 'running') this.startFallback();
  }
  private failMedia() {
    if (this.destroyed) return;
    this.mediaVersion++; this.mediaFailed = true; this.mediaPending = false; this.media?.pause();
    this.clearLoadingTimer();
    publish({ trackStatus: 'fallback', trackTitle: FALLBACK_TITLE, trackSource: 'fallback' });
    if (this.scene === 'playing' && this.context?.state === 'running') this.startFallback();
  }
  private stopTimer() { if (this.timer !== null) { clearInterval(this.timer); this.timer = null; } }
  private clearLoadingTimer() { if (this.loadingTimer !== null) { clearTimeout(this.loadingTimer); this.loadingTimer = null; } }
  private stopMusic(reset: boolean) {
    this.clearLoadingTimer();
    this.mediaVersion++; this.mediaPending = false;
    this.media?.pause(); if (reset && this.media) { try { this.media.currentTime = 0; } catch { /* No decoded media yet. */ } }
    this.stopTimer(); this.stopVoices('music'); this.nextBeat = 0;
  }
  private startFallback() {
    if (this.timer !== null || this.destroyed || this.scene !== 'playing' || !this.context || typeof setInterval === 'undefined') return;
    publish({ trackStatus: 'fallback', trackSource: 'fallback', trackTitle: FALLBACK_TITLE });
    this.nextBeat = this.context.currentTime + 0.03;
    this.scheduleMusic(); this.timer = setInterval(() => this.scheduleMusic(), 90);
  }
  private scheduleMusic() {
    const ctx = this.context;
    if (!ctx || this.scene !== 'playing' || this.destroyed || ctx.state !== 'running') return;
    if (this.nextBeat < ctx.currentTime) this.nextBeat = ctx.currentTime + 0.025;
    // An original pentatonic sixteen-bar phrase, with alternating plucked figures and drums.
    const melody = [0, 2, 4, 7, 9, 7, 4, 2, 0, 4, 7, 12, 9, 7, 4, -1, 7, 9, 12, 14, 12, 9, 7, 4, 2, 4, 7, 9, 7, 4, 2, -1];
    while (this.nextBeat < ctx.currentTime + 0.25) {
      const step = this.musicStep++, beat = step % 8, phrase = Math.floor(step / 32) % 4;
      const root = [146.83, 130.81, 110, 130.81][phrase], note = melody[step % melody.length];
      if (note >= 0) {
        const frequency = root * 2 ** ((note + 12) / 12);
        this.tone(frequency, 0.24, 'triangle', 0.06, frequency * 0.999, 'music', 0, this.nextBeat);
        this.tone(frequency * 2, 0.095, 'sine', 0.022, frequency * 1.997, 'music', 0, this.nextBeat);
      }
      if (beat === 0 || beat === 4) {
        this.tone(root / 2, 0.4, 'sine', 0.12, root / 2, 'music', 0, this.nextBeat);
        this.tone(112, 0.2, 'sine', 0.21, 40, 'music', 0, this.nextBeat);
        this.hiss(0.035, 450, 0.035, 'lowpass', 'music', 0, this.nextBeat);
      } else if (beat === 2 || beat === 6) this.hiss(0.08, 1800, 0.055, 'bandpass', 'music', 0, this.nextBeat);
      else this.hiss(0.025, 6200, 0.015, 'highpass', 'music', 0, this.nextBeat);
      this.nextBeat += 60 / 116 / 2;
    }
  }
  private register(source: AudioScheduledSourceNode, nodes: AudioNode[], bus: 'music' | 'sfx', priority: number) {
    const limit = bus === 'sfx' ? 32 : 24;
    const sameBus = this.voices.filter(voice => voice.bus === bus);
    if (sameBus.length >= limit) {
      const oldest = sameBus.reduce((best, voice) => voice.priority < best.priority ? voice : best);
      if (oldest.priority > priority) { source.disconnect(); nodes.forEach(node => node.disconnect()); return false; }
      this.removeVoice(oldest, true);
    }
    const voice = { source, nodes, bus, priority }; this.voices.push(voice);
    source.onended = () => this.removeVoice(voice, false);
    return true;
  }
  private removeVoice(voice: Voice, stop: boolean) {
    const index = this.voices.indexOf(voice); if (index < 0) return;
    this.voices.splice(index, 1); voice.source.onended = null;
    if (stop) { try { voice.source.stop(); } catch { /* Already ended. */ } }
    voice.source.disconnect(); voice.nodes.forEach(node => node.disconnect());
  }
  private stopVoices(bus: 'music' | 'sfx') { this.voices.filter(voice => voice.bus === bus).forEach(voice => this.removeVoice(voice, true)); }
  private tone(frequency: number, duration: number, type: OscillatorType, volume: number, end: number, bus: 'music' | 'sfx' = 'sfx', priority = 1, when?: number) {
    const ctx = this.context, target = bus === 'music' ? this.musicGain : this.sfxGain;
    if (!ctx || !target) return;
    const at = when ?? ctx.currentTime, oscillator = ctx.createOscillator(), gain = ctx.createGain();
    oscillator.type = type; oscillator.frequency.setValueAtTime(Math.max(20, frequency), at); oscillator.frequency.exponentialRampToValueAtTime(Math.max(20, end), at + duration);
    gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.006); gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    oscillator.connect(gain); gain.connect(target); if (!this.register(oscillator, [gain], bus, priority)) return;
    oscillator.start(at); oscillator.stop(at + duration + 0.012);
  }
  private hiss(duration: number, frequency: number, volume: number, type: BiquadFilterType = 'bandpass', bus: 'music' | 'sfx' = 'sfx', priority = 1, when?: number) {
    const ctx = this.context, target = bus === 'music' ? this.musicGain : this.sfxGain;
    if (!ctx || !target || !this.noise) return;
    const at = when ?? ctx.currentTime, source = ctx.createBufferSource(), gain = ctx.createGain(), filter = ctx.createBiquadFilter();
    source.buffer = this.noise; filter.type = type; filter.frequency.setValueAtTime(frequency, at); filter.frequency.exponentialRampToValueAtTime(Math.max(70, frequency * 0.35), at + duration); filter.Q.value = 1.6;
    gain.gain.setValueAtTime(0.0001, at); gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, volume), at + 0.008); gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(target); if (!this.register(source, [filter, gain], bus, priority)) return;
    source.start(at, this.random() * Math.max(0, 1 - duration)); source.stop(at + duration + 0.012);
  }
  play(event: SoundEvent, options: SoundOptions = {}): void {
    if (this.destroyed || this.muted || this.scene !== 'playing' || !this.unlocked) return;
    const ctx = this.ensureContext(); if (!ctx) return;
    if (ctx.state !== 'running') {
      // Keep the one-shot cue that coincides with resume (notably upgrade), with
      // a small deduplicated budget. Pausing discards it rather than replaying it later.
      if (!this.pendingSounds.some(sound => sound.event === event && sound.options.charId === options.charId && sound.options.kind === options.kind)) {
        if (this.pendingSounds.length >= 8) this.pendingSounds.shift();
        this.pendingSounds.push({ event, options });
      }
      return;
    }
    const key = `${event}:${options.charId ?? ''}:${options.kind ?? ''}`, now = ctx.currentTime;
    const high = event === 'cast' || event === 'ko' || event === 'explosion' || event === 'upgrade';
    const interval = high ? 0.016 : event === 'summon' ? 0.11 : event === 'shield' ? 0.09 : event === 'impact' ? 0.065 : event === 'pickup' ? 0.075 : 0.045;
    if (now - (this.lastEvents.get(key) ?? -100) < interval) return;
    this.lastEvents.set(key, now);
    const priority = high ? 3 : event === 'attack' || event === 'hurt' ? 2 : 1;
    const power = Math.min(2, Math.max(0.5, (options.power ?? 10) / 12));
    const tone = (f: number, d: number, t: OscillatorType, v: number, end = f, delay = 0) => this.tone(f, d, t, v, end, 'sfx', priority, now + delay);
    const noise = (d: number, f: number, v: number, type: BiquadFilterType = 'bandpass', delay = 0) => this.hiss(d, f, v, type, 'sfx', priority, now + delay);
    if (event === 'cast') {
      const secondary = options.kind === 'secondary';
      if (options.charId === 'raiden') { noise(0.24, 4300, 0.18, 'highpass'); tone(secondary ? 78 : 105, 0.35, 'sawtooth', 0.09, 42); tone(1300, 0.11, 'sine', 0.065, 220); noise(0.07, 7000, 0.12, 'highpass', 0.09); }
      else if (options.charId === 'eula') { noise(0.22, 7400, 0.1, 'highpass'); [1568, 2093, 2637].forEach((f, i) => tone(f, secondary ? 0.32 : 0.22, 'sine', 0.05, f * 0.98, i * 0.035)); tone(170, 0.18, 'triangle', 0.06, 85); }
      else if (options.charId === 'diluc') { noise(secondary ? 0.55 : 0.32, 1300, 0.28, 'lowpass'); tone(100, 0.38, 'triangle', 0.14, 38); noise(0.11, 3800, 0.13, 'highpass', 0.09); }
      else if (options.charId === 'xiao') { noise(secondary ? 0.2 : 0.36, 3000, 0.16); tone(secondary ? 740 : 500, 0.22, 'sine', 0.07, secondary ? 220 : 130); tone(150, 0.18, 'triangle', 0.065, 65); }
      else if (options.charId === 'zhongli') { tone(secondary ? 68 : 100, secondary ? .65 : .42, 'triangle', .17, 32); noise(secondary ? .5 : .27, 520, .18, 'lowpass'); [392, 588].forEach((f, i) => tone(f, .38, 'sine', .035, f * .96, i * .04)); }
      else if (options.charId === 'furina') { noise(.26, 2600, .1, 'bandpass'); [587, 740, 880, 1175].forEach((f, i) => tone(f, secondary ? .42 : .24, 'sine', .045, f * 1.005, i * .035)); tone(220, .22, 'triangle', .06, 110); }
      else { noise(0.48, 1700, 0.16); tone(392, 0.35, 'sine', 0.07, secondary ? 784 : 588); tone(587, 0.3, 'sine', 0.035, 880, 0.035); }
    } else if (event === 'shield') {
      tone(196, .18, 'triangle', .075, 90); tone(784, .22, 'sine', .04, 740); noise(.08, 900, .06, 'lowpass');
    } else if (event === 'summon') {
      if (options.summonKind === 'geo-pulse') { tone(115, .22, 'triangle', .075, 52); noise(.14, 600, .07, 'lowpass'); }
      else if (options.summonKind === 'crab-splash') { noise(.21, 1800, .1); tone(180, .14, 'sine', .055, 75); tone(960, .1, 'sine', .025, 620); }
      else if (options.summonKind === 'water-pierce') { noise(.14, 3900, .065, 'highpass'); tone(920, .12, 'sine', .04, 480); }
      else { tone(360, .14, 'sine', .065, 890); tone(980, .12, 'sine', .025, 590, .055); noise(.09, 2100, .04); }
    } else if (event === 'attack' || event === 'throw') {
      const heavy = options.kind === 'smash'; noise(heavy ? 0.21 : 0.12, heavy ? 1200 : 2500, heavy ? 0.14 : 0.09); tone(heavy ? 155 : 400, 0.09, 'triangle', 0.045, heavy ? 70 : 120);
    } else if (event === 'impact' || event === 'hurt' || event === 'land' || event === 'explosion') {
      const big = event === 'explosion', hurt = event === 'hurt';
      tone(big ? 90 : hurt ? 140 : 185, big ? 0.4 : 0.15, 'triangle', (big ? 0.2 : 0.09) * power, big ? 30 : 55);
      noise(big ? 0.42 : 0.115, hurt ? 800 : options.charId === 'eula' ? 5200 : 2400, (big ? 0.23 : 0.095) * power, big ? 'lowpass' : 'bandpass');
      if (options.charId === 'eula') tone(2400, 0.18, 'sine', 0.035, 2100);
      if (options.charId === 'raiden') noise(0.07, 7000, 0.06, 'highpass');
      if (options.charId === 'zhongli') { noise(.12, 650, .065, 'lowpass'); tone(110, .16, 'triangle', .045, 48); }
      if (options.charId === 'furina') { tone(720, .11, 'sine', .035, 1150); noise(.08, 3300, .035); }
    } else if (event === 'jump' || event === 'dodge') { noise(event === 'jump' ? 0.08 : 0.19, 1800, 0.065); tone(event === 'jump' ? 220 : 700, 0.12, 'sine', 0.035, event === 'jump' ? 430 : 170); }
    else if (event === 'ko') { noise(0.4, 800, 0.2, 'lowpass'); tone(70, 0.5, 'triangle', 0.14, 25); tone(523, 0.5, 'sine', 0.065, 131); }
    else if (event === 'upgrade') { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 'sine', 0.08, f, i * 0.055)); }
    else { tone(event === 'pickup' ? 880 : 660, 0.13, 'sine', 0.055, event === 'pickup' ? 1320 : 990); }
  }
  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true; sessions.delete(this); this.stopMusic(true); this.stopVoices('sfx'); this.pendingSounds = []; this.disposeMedia();
    this.musicGain?.disconnect(); this.sfxGain?.disconnect(); this.compressor?.disconnect();
    const ctx = this.context; this.context = null;
    if (ctx && ctx.state !== 'closed') void ctx.close().catch(() => undefined);
  }
}
