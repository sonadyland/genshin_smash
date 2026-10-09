import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { getAudioSettings, importMusicFile, resetMusicSource, setAudioSettings, subscribeAudioSettings, unlockBattleAudio } from '../game/audio';
import './AudioSettings.css';

function SoundIcon({ muted }: { muted: boolean }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><path d="m11 5-5 4H3v6h3l5 4V5Z"/>{muted ? <path d="m16 9 6 6m0-6-6 6"/> : <><path d="M15 8a6 6 0 0 1 0 8"/><path d="M18 5a10 10 0 0 1 0 14"/></>}</svg>;
}

export default function AudioSettings({ muted, onMutedChange, inline = false, inBattle = false, onResume }: { muted: boolean; onMutedChange: (value: boolean) => void; inline?: boolean; inBattle?: boolean; onResume?: () => void }) {
  const settings = useSyncExternalStore(subscribeAudioSettings, getAudioSettings);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const id = useId();
  const restoreFocus = () => {
    const canvas = !inline && !document.querySelector('[aria-modal="true"]') ? document.querySelector('canvas') : null;
    if (canvas) canvas.focus({ preventScroll: true });
    else toggleRef.current?.focus({ preventScroll: true });
  };
  const closePanel = () => { setOpen(false); restoreFocus(); };
  const toggleMuted = () => { if (muted) unlockBattleAudio(); onMutedChange(!muted); if (!open && !inline) restoreFocus(); };
  useEffect(() => {
    if (open && inline) panelRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [open, inline]);
  useEffect(() => {
    if (!open || inline) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', closeOutside);
    return () => document.removeEventListener('pointerdown', closeOutside);
  }, [open, inline]);
  const sourceLabel = settings.trackSource === 'imported' ? '本地导入 · 本次会话' : settings.trackSource === 'fallback' ? '原创程序音乐' : '配置曲目';
  const statusLabel = settings.trackStatus === 'loading' ? (inline || inBattle ? '正在载入音乐…' : '进入战斗后载入并循环播放') : settings.trackStatus === 'blocked' ? '浏览器尚未允许播放，点击启用音乐。' : settings.trackStatus === 'fallback' ? '当前使用原创战斗配乐。恢复默认曲可重试配置音源。' : '音乐已就绪 · 战斗中循环播放';
  return <div ref={rootRef} data-audio-settings className={`audio-settings ${inline ? 'audio-settings-inline' : ''}`} onKeyDown={event => {
    event.stopPropagation();
    if (event.key === 'Escape') {
      event.preventDefault();
      if (open) closePanel();
      else if (onResume && !event.repeat) { unlockBattleAudio(); onResume(); }
    }
    if (event.key.toLowerCase() === 'm' && !event.repeat) { event.preventDefault(); toggleMuted(); }
  }}>
    <div className="audio-toolbar">
      <button className="sound-button" onClick={toggleMuted} aria-label={muted ? '开启声音' : '关闭声音'} title={muted ? '开启声音（M）' : '关闭声音（M）'}><SoundIcon muted={muted}/><span>{muted ? '声音关' : '声音开'}</span></button>
      <button ref={toggleRef} className="audio-settings-toggle" aria-expanded={open} aria-controls={`${id}-panel`} onClick={() => { if (open) closePanel(); else setOpen(true); }}>声音设置 <span aria-hidden="true">{open ? '−' : '＋'}</span></button>
    </div>
    {open && <section ref={panelRef} id={`${id}-panel`} className="audio-settings-panel" aria-label="音乐与音效设置">
      <div className="audio-panel-heading"><span>SOUND OF TEYVAT</span><button className="audio-panel-close" aria-label="关闭声音设置" onClick={closePanel}>×</button></div>
      <div className="audio-track" aria-live="polite"><small>战斗配乐 · {sourceLabel}</small><strong>{settings.trackTitle}</strong><p>{statusLabel}</p></div>
      {settings.trackStatus === 'blocked' && <button className="audio-enable" onClick={unlockBattleAudio}>启用音乐</button>}
      <label className="audio-volume" htmlFor={`${id}-music`}><span>音乐 <output>{Math.round(settings.musicVolume * 100)}%</output></span><input id={`${id}-music`} type="range" min="0" max="100" step="1" value={Math.round(settings.musicVolume * 100)} onChange={event => { unlockBattleAudio(); setAudioSettings({ musicVolume: Number(event.target.value) / 100 }); }}/></label>
      <label className="audio-volume" htmlFor={`${id}-sfx`}><span>音效 <output>{Math.round(settings.sfxVolume * 100)}%</output></span><input id={`${id}-sfx`} type="range" min="0" max="100" step="1" value={Math.round(settings.sfxVolume * 100)} onChange={event => { unlockBattleAudio(); setAudioSettings({ sfxVolume: Number(event.target.value) / 100 }); }}/></label>
      {muted && <p className="audio-muted-note">已全局静音 · 按 M 或点击“声音关”恢复</p>}
      <div className="audio-source-actions"><button onClick={() => { unlockBattleAudio(); fileRef.current?.click(); }}>导入本地音乐</button><button onClick={() => { unlockBattleAudio(); resetMusicSource(); setError(''); }}>恢复默认曲</button></div>
      <input ref={fileRef} className="audio-file-input" type="file" accept="audio/*,.mp3,.ogg,.wav,.m4a,.aac,.flac,.opus" aria-label="选择本地音乐文件" tabIndex={-1} onChange={event => {
        const file = event.target.files?.[0];
        if (file) { try { unlockBattleAudio(); importMusicFile(file); setError(''); } catch (reason) { setError(reason instanceof Error ? reason.message : '无法读取该音频，请选择可播放的音乐文件。'); } }
        event.target.value = '';
      }}/>
      {error && <p className="audio-error" role="alert">{error}</p>}
      <p className="audio-source-note">本地文件仅在当前页面使用，不会上传。默认曲需要联网，加载失败时自动使用原创配乐。</p>
    </section>}
  </div>;
}
