import { useEffect, useRef } from 'react';
import { CHARACTERS } from '../game/data';
import { LOBBY_BACKGROUND_ART, LOBBY_CHARACTER_ART } from '../game/lobby-art';
import type { BattleArtProgress } from '../hooks/useArtLoading';
import { useArtLoading } from '../hooks/useArtLoading';
import './ArtLoading.css';

function megabytes(bytes: number) {
  return (bytes / 1024 / 1024).toFixed(1);
}

export default function ArtLoading({ characterIds, progress, onRetry, onExit }: {
  characterIds: readonly string[];
  progress: BattleArtProgress;
  onRetry: () => void;
  onExit: () => void;
}) {
  const exitRef = useRef<HTMLButtonElement>(null);
  const { homeReadyUrls } = useArtLoading();
  const characters = [...new Set(characterIds)].map(id => CHARACTERS.find(character => character.id === id)!);
  const failed = progress.status === 'error';
  const decoding = progress.phase === 'decode' || progress.phase === 'ready';
  const percent = Math.min(100, Math.max(0, Math.floor(progress.percent)));
  const title = failed ? '素材暂未准备完成' : decoding ? '正在准备动画' : '正在准备战斗';

  useEffect(() => { exitRef.current?.focus({ preventScroll: true }); }, []);

  return <section className="art-loading" aria-label="战斗素材准备" style={{ backgroundImage: `linear-gradient(100deg, #07191bea, #102a30db)${homeReadyUrls.includes(LOBBY_BACKGROUND_ART) ? `, url("${LOBBY_BACKGROUND_ART}")` : ''}` }}>
    <div className="art-loading-portraits" aria-hidden="true">{characters.map(character => <img crossOrigin="anonymous" key={character.id} src={homeReadyUrls.includes(LOBBY_CHARACTER_ART[character.id]) ? LOBBY_CHARACTER_ART[character.id] : undefined} alt=""/>)}</div>
    <div className="art-loading-panel">
      <span className="tiny-label">READY FOR THE NEXT ADVENTURE</span>
      <h2>{title}</h2>
      <p className="art-loading-characters">{characters.map(character => character.name).join(' · ')}</p>
      <div className="art-loading-track" role="progressbar" aria-label="本局素材加载进度" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-valuetext={decoding ? '下载完成，正在准备动画' : `${percent}%`}><i style={{ width: `${percent}%` }}/></div>
      <div className="art-loading-progress"><strong>{decoding ? '下载完成' : `${percent}%`}</strong><span>{progress.totalBytes > 0 ? `${megabytes(progress.loadedBytes)} / ${megabytes(progress.totalBytes)} MB` : '正在确认本局素材'}</span></div>
      <p className={`art-loading-note ${failed ? 'art-loading-error' : ''}`} role={failed ? 'alert' : undefined}>{failed ? '网络或素材载入失败。已完成的下载会保留，请重试。' : decoding ? '下载已完成，正在展开本局动作和特效。' : '优先加载本局角色，完成后自动开战。计时与怪潮尚未开始。'}</p>
      <div className="art-loading-actions">{failed && <button className="start-button" onClick={onRetry}>重新加载 <span>↻</span></button>}<button ref={exitRef} className="quiet-button" onClick={onExit}>返回大厅</button></div>
    </div>
  </section>;
}
