import { useEffect, useState } from 'react';
import type { RefObject } from 'react';
import type { VisualQuality } from '../game/visual-quality';

export type ControlMode = 'auto' | 'touch' | 'keyboard';
const MODE_KEY = 'elemental-clash-control-mode';
let sessionMode: ControlMode | null = null;

export function readMobileVisualQuality(): VisualQuality {
  try { return JSON.parse(localStorage.getItem('elemental-clash-touch-layout-v1') || '{}').visualQuality === 'low' ? 'low' : 'standard'; }
  catch { return 'standard'; }
}

export function readMobileEnvironment() {
  let mode: ControlMode = 'auto';
  try {
    const stored = localStorage.getItem(MODE_KEY);
    if (stored === 'touch' || stored === 'keyboard') mode = stored;
  } catch { /* Private browsing can disallow storage. */ }
  mode = sessionMode ?? mode;
  const touch = navigator.maxTouchPoints > 0 || matchMedia('(any-pointer: coarse)').matches;
  const compact = Math.min(innerWidth, innerHeight) <= 1024;
  return { mode, enabled: mode === 'touch' || (mode === 'auto' && touch && compact), portrait: innerHeight > innerWidth };
}

export function useMobileEnvironment() {
  const [environment, setEnvironment] = useState(readMobileEnvironment);
  useEffect(() => {
    const update = () => setEnvironment(previous => {
      const next = readMobileEnvironment();
      return previous.mode === next.mode && previous.enabled === next.enabled && previous.portrait === next.portrait ? previous : next;
    });
    const media = matchMedia('(any-pointer: coarse)');
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    window.addEventListener('mobile-control-mode', update);
    media.addEventListener('change', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
      window.removeEventListener('mobile-control-mode', update);
      media.removeEventListener('change', update);
    };
  }, []);
  return environment;
}

export function setControlMode(mode: ControlMode) {
  sessionMode = mode;
  try { localStorage.setItem(MODE_KEY, mode); } catch { /* The current session still receives the update. */ }
  window.dispatchEvent(new Event('mobile-control-mode'));
}

// Called directly inside a user gesture, alongside audio unlocking.
export async function enterMobileFullscreen() {
  if (!readMobileEnvironment().enabled) return;
  try {
    if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
      await document.documentElement.requestFullscreen();
    }
    const orientation = screen.orientation as ScreenOrientation & { lock?: (value: string) => Promise<void> };
    if (document.fullscreenElement && orientation?.lock) await orientation.lock('landscape');
  } catch { /* Safari and non-fullscreen browsers use the visible rotate-device guide. */ }
}

type MobileGame = { clearTouchInput: () => void; pause: () => void; getSnapshot: () => { phase: string } };
export function pauseForMobileEnvironment(game: MobileGame) {
  const environment = readMobileEnvironment();
  if (environment.enabled && environment.portrait) game.pause();
}

export function useMobileBattleLifecycle(gameRef: RefObject<MobileGame | null>, enabled: boolean, portrait: boolean, phase: string) {
  useEffect(() => {
    if (!enabled) return;
    const stop = () => {
      const game = gameRef.current;
      if (!game) return;
      game.clearTouchInput();
      if (['playing', 'fight', 'countdown'].includes(game.getSnapshot().phase)) game.pause();
    };
    if (portrait) stop();
    const visibility = () => { if (document.hidden) stop(); };
    let hadFullscreen = !!document.fullscreenElement;
    const fullscreen = () => {
      const hasFullscreen = !!document.fullscreenElement;
      if (hadFullscreen && !hasFullscreen) stop();
      hadFullscreen = hasFullscreen;
    };
    document.addEventListener('visibilitychange', visibility);
    document.addEventListener('fullscreenchange', fullscreen);
    window.addEventListener('blur', stop);
    return () => {
      document.removeEventListener('visibilitychange', visibility);
      document.removeEventListener('fullscreenchange', fullscreen);
      window.removeEventListener('blur', stop);
    };
  }, [gameRef, enabled, portrait, phase]);
}
