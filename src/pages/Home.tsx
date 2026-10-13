import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Game } from '../game/engine';
import type { MatchOptions } from '../game/engine';
import { CHARACTERS } from '../game/data';
import { LOBBY_BACKGROUND_ART, LOBBY_CHARACTER_ART } from '../game/lobby-art';
import { assetLoading } from '../game/asset-loading';
import { useArtLoading, useBattleArt } from '../hooks/useArtLoading';
import ArtLoading from '../components/ArtLoading';
import { getSecondaryProfile, getTacticalMap, SURVIVAL_BRANCHES, TACTICAL_MAPS } from '../game/survival-data';
import type { SurvivalOptions, TacticalMapId } from '../game/survival-data';
import { unlockBattleAudio } from '../game/audio';
import AudioSettings from './AudioSettings';
import SurvivalBattle, { SurvivalControls } from './SurvivalBattle';
import MobileControls, { ControlModeSetting, RotateDeviceGuide } from '../components/mobile/MobileControls';
import { enterMobileFullscreen, pauseForMobileEnvironment, readMobileEnvironment, readMobileVisualQuality, useMobileBattleLifecycle, useMobileEnvironment } from '../hooks/useMobileGame';
import './Home.css';

const CHARACTER_DETAILS: Record<string, { element: string; english: string; role: string; line: string; color: string }> = {
  raiden: { element: '雷', english: 'RAIDEN SHOGUN', role: '均衡 · 远程牵制', line: '以雷霆之势，定胜负于一瞬。', color: '#b9a0f5' },
  jean: { element: '风', english: 'JEAN', role: '灵巧 · 风压控场', line: '让风引领你，越过每一道边界。', color: '#9ddbd0' },
  eula: { element: '冰', english: 'EULA', role: '重装 · 范围爆发', line: '以优雅的剑舞，奏响终场之章。', color: '#a2d7ec' },
  diluc: { element: '火', english: 'DILUC', role: '强攻 · 烈焰突进', line: '黎明之前，让烈焰划破长夜。', color: '#eea08a' },
  xiao: { element: '风', english: 'XIAO', role: '空战 · 下坠爆发', line: '靖妖傩舞，一枪荡尽四方。', color: '#77e3c3' },
  zhongli: { element: '岩', english: 'ZHONGLI', role: '守御 · 岩柱共鸣', line: '以磐岩立约，令天星定局。', color: '#e4bd78' },
  furina: { element: '水', english: 'FURINA', role: '召唤 · 沙龙协演', line: '让水之舞台，为此刻喝彩。', color: '#8fcffa' },
};

const TACTICAL_LOBBY_COPY: Record<TacticalMapId, { icon: string; number: string; headline: string; approach: string; sniper: string; goal: string; route: string }> = {
  'wind-ruins': { icon: '↟', number: '03', headline: '借风登高处，', approach: '借风登高，选择你的进攻时机。', sniper: '借风登高，近身打断', goal: '借风井换层，绕后破盾，再压制射手。', route: '借风换层' },
  'broken-bridge': { icon: '⌁', number: '04', headline: '跃过断桥间，', approach: '穿过低谷，寻找绕后的进攻路线。', sniper: '上下绕行，近身打断', goal: '二段跳跨断口，下穿避冲锋，再沿坡回桥。', route: '跨桥转线' },
  'mechanism-hall': { icon: '⚙', number: '05', headline: '穿行机关间，', approach: '读懂地火节奏，登台避险再反击。', sniper: '二段跳登高，近身打断', goal: '黄纹预警时跳上侧台，红焰熄灭后再下穿反击。', route: '看纹登台' },
};

function Crest({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'crest crest-small' : 'crest'} viewBox="0 0 48 48" fill="none" aria-hidden="true"><path d="M24 2 30 18 46 24 30 30 24 46 18 30 2 24 18 18Z" stroke="currentColor" strokeWidth="1.3"/><path d="m24 11 4 13-4 13-4-13Z" fill="currentColor"/><path d="m11 24 13-4 13 4-13 4Z" fill="currentColor"/><circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth=".5"/></svg>;
}

function Artwork({ id, available, unavailable = false, className = '', alt = '' }: { id: string; available: boolean; unavailable?: boolean; className?: string; alt?: string }) {
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  if (failed || unavailable) return <span className="artwork-unavailable">立绘暂未载入</span>;
  return <><img className={`${className} artwork-image ${loaded ? 'is-loaded' : ''}`} src={available ? LOBBY_CHARACTER_ART[id] : undefined} alt={alt} draggable={false} onLoad={() => setLoaded(true)} onError={() => setFailed(true)}/>{!loaded && <span className="artwork-loading" aria-label="正在载入角色立绘">✦</span>}</>;
}

function ControlsGuide() {
  return <div className="guide-content">
    <div className="guide-intro"><strong>打出破绽，把对手击出边界。</strong><p>伤害百分比越高，受到的击飞越远。每人 3 条命，3 分钟后先比剩余生命，再比伤害百分比。</p></div>
    <div className="control-grid"><div><span className="player-label">PLAYER 01</span><p><kbd>A</kbd><kbd>D</kbd> 移动 <kbd>W</kbd> 跳跃 / 二段跳 <kbd>S</kbd> 快降 / 下平台</p><p><kbd>J</kbd> 普攻 <kbd>K</kbd> 重击 <kbd>L</kbd> 元素技能 <kbd>I</kbd> 战技 <kbd>H</kbd> 闪避</p></div><div><span className="player-label">PLAYER 02</span><p><kbd>←</kbd><kbd>→</kbd> 移动 <kbd>↑</kbd> 跳跃 <kbd>↓</kbd> 快降 / 下平台</p><p><kbd>,</kbd> 普攻 <kbd>.</kbd> 重击 <kbd>/</kbd> 元素技能 <kbd>'</kbd> 战技 <kbd>右 Shift</kbd> 闪避</p></div></div>
    <p className="guide-note">P2 也可使用小键盘 1 / 2 / 3 攻击、5 战技、0 闪避。战技与元素技能独立冷却。<kbd>Esc</kbd> / <kbd>P</kbd> 暂停 · <kbd>M</kbd> 静音。推荐使用键盘，在横屏下游玩。</p>
  </div>;
}

function Battle({ options, muted, onMutedChange, onExit }: { options: MatchOptions; muted: boolean; onMutedChange: (value: boolean) => void; onExit: () => void }) {
  const mobile = useMobileEnvironment();
  const [editingControls, setEditingControls] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Game | null>(null);
  const [snapshot, setSnapshot] = useState<ReturnType<Game['getSnapshot']> | null>(null);
  const initialMuted = useRef(muted);
  const openControlEditor = useCallback(() => {
    const game = gameRef.current;
    game?.clearTouchInput();
    if (game && ['fight', 'countdown'].includes(game.getSnapshot().phase)) game.pause();
    setEditingControls(true);
  }, []);
  const start = useCallback(() => {
    if (!canvasRef.current) return;
    const game = new Game(canvasRef.current);
    gameRef.current = game;
    game.setMuted(initialMuted.current);
    game.setVisualQuality(readMobileVisualQuality());
    game.setMobileHud(readMobileEnvironment().enabled);
    game.start(options);
    pauseForMobileEnvironment(game);
    setSnapshot(game.getSnapshot());
    canvasRef.current.focus({ preventScroll: true });
    const timer = window.setInterval(() => {
      const next = game.getSnapshot();
      setSnapshot(previous => previous && JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
      onMutedChange(next.muted);
    }, 80);
    return () => {
      window.clearInterval(timer);
      game.destroy();
      gameRef.current = null;
    };
  }, [options, onMutedChange]);
  const battleCharacterIds = [CHARACTERS[options.player].id, CHARACTERS[options.opponent].id];
  const preparation = useBattleArt(battleCharacterIds, start);
  useEffect(() => { initialMuted.current = muted; gameRef.current?.setMuted(muted); }, [muted]);
  useEffect(() => { gameRef.current?.setMobileHud(mobile.enabled); }, [mobile.enabled]);
  const paused = snapshot?.phase === 'paused';
  const result = snapshot?.phase === 'result';
  const showOverlay = paused || result;
  useMobileBattleLifecycle(gameRef, mobile.enabled, mobile.portrait, snapshot?.phase || 'countdown');
  useEffect(() => {
    if (!showOverlay || editingControls || (mobile.enabled && mobile.portrait)) return;
    const dialog = dialogRef.current;
    const canvas = canvasRef.current;
    if (!dialog) return;
    const primary = dialog.querySelector<HTMLButtonElement>('button');
    primary?.focus({ preventScroll: true });
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) primary?.focus({ preventScroll: true });
    };
    const cycleActions = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('[data-audio-settings]')) return;
      if (event.key !== 'Tab') return;
      const buttons = Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type=file]):not(:disabled)'));
      if (!buttons.length) return;
      event.preventDefault();
      const current = buttons.findIndex(button => button === document.activeElement);
      const next = current < 0 ? (event.shiftKey ? buttons.length - 1 : 0) : (current + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length;
      buttons[next].focus({ preventScroll: true });
    };
    document.addEventListener('focusin', keepFocus);
    document.addEventListener('keydown', cycleActions, true);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      document.removeEventListener('keydown', cycleActions, true);
      if (canvas?.isConnected) canvas.focus({ preventScroll: true });
    };
  }, [showOverlay, editingControls, mobile.enabled, mobile.portrait]);
  const winner = snapshot?.winner === 0 ? CHARACTERS[options.player] : CHARACTERS[options.opponent];
  const xiaoControls = [
    CHARACTERS[options.player].id === 'xiao' && 'P1：W 起跳 → 空中按 L',
    CHARACTERS[options.opponent].id === 'xiao' && (options.mode === 'pvp' ? 'P2：↑ 起跳 → 空中按 /' : '对手魈仅能在空中释放技能'),
  ].filter(Boolean);
  return <main className="battle-main">
    <div className="arena-toolbar"><div><span className="tiny-label">JADE CHAMBER ARENA</span><h1>群玉之巅 <span>· {options.mode === 'cpu' ? '单人试炼' : '本地双人'}</span></h1></div><div className="arena-actions">{mobile.enabled && <button className="quiet-button" disabled={!snapshot} onClick={openControlEditor}>触控布局</button>}<button className="quiet-button" onClick={() => { if (paused) unlockBattleAudio(); if (paused && !(mobile.enabled && mobile.portrait)) gameRef.current?.resume(); else if (!paused) gameRef.current?.pause(); }} disabled={!snapshot || result}>{paused ? '▷ 继续' : 'Ⅱ 暂停'}<kbd>Esc</kbd></button><button className="quiet-button" onClick={onExit}>返回大厅 <span>↗</span></button></div></div>
    <div className="arena-frame">
      <canvas ref={canvasRef} tabIndex={-1} aria-label="提瓦特大乱斗对战场地，P1按I释放战技，P2按单引号或小键盘5释放战技，完整操作说明见下方" />
      {!snapshot && <ArtLoading characterIds={battleCharacterIds} progress={preparation.progress} onRetry={preparation.retry} onExit={onExit}/>}
      {showOverlay && !editingControls && !(mobile.enabled && mobile.portrait) && <div className="battle-overlay"><div ref={dialogRef} className="overlay-panel" role="dialog" aria-modal="true" aria-label={paused ? '战斗已暂停' : '对战结果'}><Crest /><span className="tiny-label">{paused ? 'TAKE A BREATH' : snapshot?.draw ? 'AN EVEN MATCH' : 'VICTORY'}</span><h2>{paused ? '暂歇片刻' : snapshot?.draw ? '不分伯仲' : `${winner.name} 获胜`}</h2><p>{paused ? '战场为你停留。准备好，就继续这场交锋。' : snapshot?.draw ? '旗鼓相当的交锋，再来一场决定胜负。' : `${snapshot?.winner === 0 ? 'P1' : options.mode === 'cpu' ? 'CPU' : 'P2'} 赢下了这场对决。下一场，新的可能。`}</p>{paused && mobile.enabled && <button className="quiet-button mobile-pause-settings" onClick={openControlEditor}>触控布局</button>}{paused && <AudioSettings muted={muted} onMutedChange={onMutedChange} inline onResume={() => gameRef.current?.resume()}/>}<button className="start-button" onClick={() => { unlockBattleAudio(); if (paused) gameRef.current?.resume(); else { gameRef.current?.rematch(); pauseForMobileEnvironment(gameRef.current!); } }}>{paused ? '继续战斗' : '再战一场'} <span>→</span></button><button className="overlay-back" onClick={onExit}>返回角色选择</button></div></div>}
    </div>
    {mobile.enabled && <MobileControls gameRef={gameRef} snapshot={snapshot} character={CHARACTERS[options.player]} active={snapshot?.phase === 'fight' && !mobile.portrait} editing={editingControls && !mobile.portrait} onCloseEditor={() => setEditingControls(false)}/>}
    {mobile.enabled && mobile.portrait && <RotateDeviceGuide onExit={onExit}/>}
    <div className="battle-help"><span><b>P1</b> A / D 移动 · W 二段跳 · J / K 攻击 · L 元素技能 · I 战技 · H 闪避</span><span>{options.mode === 'pvp' ? "P2 方向键移动 · , 普攻 · . 重击 · / 元素技能 · ' 或小键盘 5 战技 · 右 Shift 闪避" : '元素技能与战技独立冷却，交替出招，用重击将对手击出边界。'}</span></div>
    {xiaoControls.length > 0 && <p className="plunge-tip"><span>魈 · 降魔下坠</span>{xiaoControls.join(' · ')}<b>向下戳刺，落地震击周围。</b></p>}
    <details className="guide battle-guide"><summary>操作与胜负规则 <span>＋</span></summary><ControlsGuide /></details>
  </main>;
}

export default function Home() {
  const mobile = useMobileEnvironment();
  const [player, setPlayer] = useState(0);
  const [opponent, setOpponent] = useState(3);
  const [mode, setMode] = useState<MatchOptions['mode'] | 'survival'>('survival');
  const [survivalVariant, setSurvivalVariant] = useState<NonNullable<SurvivalOptions['variant']>>('expedition');
  const [tacticalMapId, setTacticalMapId] = useState<TacticalMapId>('wind-ruins');
  const [difficulty, setDifficulty] = useState<MatchOptions['difficulty']>('normal');
  const [items, setItems] = useState(true);
  const [muted, setMuted] = useState(false);
  const [match, setMatch] = useState<MatchOptions | null>(null);
  const [survival, setSurvival] = useState<SurvivalOptions | null>(null);
  const startButtonRef = useRef<HTMLButtonElement>(null);
  const wasInMatch = useRef(false);
  const selected = CHARACTERS[player];
  const detail = CHARACTER_DETAILS[selected.id];
  const isSurvival = mode === 'survival';
  const isTactical = isSurvival && survivalVariant === 'tactical';
  const isExpedition = isSurvival && survivalVariant === 'expedition';
  const tacticalMap = getTacticalMap(tacticalMapId);
  const tacticalCopy = TACTICAL_LOBBY_COPY[tacticalMap.id];
  const usesWind = tacticalMap.wind !== null;
  const inBattle = !!match || !!survival;
  const loading = useArtLoading();
  const [homeImageAttempt, setHomeImageAttempt] = useState(0);
  const backgroundReady = loading.homeReadyUrls.includes(LOBBY_BACKGROUND_ART);
  const portraitReady = (id: string) => loading.homeReadyUrls.includes(LOBBY_CHARACTER_ART[id]);
  const retryHome = () => { setHomeImageAttempt(value => value + 1); assetLoading.retryHome(); };
  useEffect(() => {
    if (inBattle) return;
    return assetLoading.enterLobby();
  }, [inBattle]);
  useEffect(() => {
    if (!inBattle && wasInMatch.current) startButtonRef.current?.focus({ preventScroll: true });
    wasInMatch.current = inBattle;
  }, [inBattle]);
  return <div className={`game-shell ${mobile.enabled ? 'mobile-mode' : ''} ${inBattle ? 'in-battle' : ''} ${survival ? 'in-survival' : ''}`} style={{ '--mobile-stage-art': backgroundReady ? `url("${LOBBY_BACKGROUND_ART}")` : 'none' } as CSSProperties}>
    <header className="site-header"><a className="brand" href="#" onClick={event => { event.preventDefault(); setMatch(null); setSurvival(null); }} aria-label="返回提瓦特大乱斗大厅"><Crest small /><span>提瓦特<span className="brand-sub">ELEMENTAL CLASH</span></span><span className="brand-divider"/><span className="brand-edition">大乱斗</span></a><div className="header-right"><span className="edition-tag"><i/> FANTASY ARENA <span>03</span></span><AudioSettings muted={muted} onMutedChange={setMuted} inBattle={inBattle}/></div></header>
    {survival ? <SurvivalBattle options={survival} muted={muted} onMutedChange={setMuted} onExit={() => setSurvival(null)}/> : match ? <Battle options={match} muted={muted} onMutedChange={setMuted} onExit={() => setMatch(null)} /> : <main className={`lobby-main ${isSurvival ? 'survival-lobby' : ''}`}>
      <div className="lobby-grid">
        <section className="roster-section" aria-label="角色选择" style={{ '--character-color': detail.color } as CSSProperties}>
          <div key={homeImageAttempt} className="hero-showcase" style={{ backgroundImage: `linear-gradient(90deg, rgba(9, 24, 30, .97) 0%, rgba(9, 24, 30, .8) 32%, rgba(9, 24, 30, .18) 100%)${backgroundReady ? `, url("${LOBBY_BACKGROUND_ART}")` : ''}` }}>
            <div className="hero-orbit"/><div className="hero-star hero-star-one">✦</div><div className="hero-star hero-star-two">✧</div>
            <div className="hero-copy"><div className="eyebrow"><span/> {isTactical ? `战术试炼 · ${tacticalMap.name}` : isExpedition ? '遗迹漫游 · 三境相连' : isSurvival ? '经典生存 · 千岩浮境' : '风起提瓦特 · 群玉之巅'}</div><h1>{isTactical ? <>{tacticalCopy.headline}<br/>以<span>走位破阵。</span></> : isExpedition ? <>穿行三重境，<br/>让<span>路线随心。</span></> : isSurvival ? <>身陷千重围，<br/>以<span>元素破局。</span></> : <>每一次交锋，<br/>皆是<span>高光时刻。</span></>}</h1><p>{isTactical ? <>{tacticalMap.subtitle}，迎战三组敌阵。<br/>{tacticalCopy.approach}</> : isExpedition ? <>乘风、跨桥、避地火，一路自由往返。<br/>手动出招，在探索中不断成长。</> : isSurvival ? <>跃过高低浮台，迎战十分钟怪潮。<br/>手动出招，在每次成长中进化。</> : <>跃上浮空擂台，释放元素之力。<br/>把对手击出边界，成为最后的赢家。</>}</p><div className="hero-rule"><span>{isTactical ? '90' : isSurvival ? '10' : '3'} <small>{isTactical ? '秒战术试炼' : isSurvival ? '分钟生存' : '条生命'}</small></span><i/><span>{isTactical || isExpedition ? '3' : isSurvival ? '2' : '3'} <small>{isTactical ? '组敌阵' : isExpedition ? '片相连区域' : isSurvival ? '条进化分支' : '分钟对决'}</small></span><i/><span>{CHARACTERS.length} <small>位斗士</small></span></div></div>
            <div className="hero-art-wrap" key={selected.id}><span className="element-watermark">{detail.element}</span><Artwork id={selected.id} available={portraitReady(selected.id)} unavailable={loading.home.status === 'error' && !portraitReady(selected.id)} className="hero-character" alt={`${selected.name}全身立绘`}/></div>
            <div className="featured-character"><span>{detail.english}</span><h2>{selected.name}<small>{selected.title}</small></h2><p>{detail.line}</p></div>
            <div className="hero-caption"><span className="live-dot"/> {isTactical ? '战术小战场 · 换层 × 破盾 × 反击' : isExpedition ? '连续大地图 · 自由探索 × 随机成长' : isSurvival ? '经典玩法 · 手动战斗 × 随机成长' : '全新元素竞技场'} <span>{isTactical ? `${tacticalCopy.number} / ${tacticalMap.name}` : isExpedition ? '06 / 遗迹漫游' : isSurvival ? '02 / 千岩浮境' : '01 / 群玉之巅'}</span></div>
          </div>
          {loading.home.status !== 'ready' && <div className={`lobby-loading-note ${loading.home.status === 'error' ? 'has-error' : ''}`} role="status"><span>{loading.home.status === 'error' ? '部分首页图片未能载入，仍可选择角色出战。' : `正在加载首页图片 · ${Math.floor(loading.home.percent)}%`}</span>{loading.home.status === 'error' && <button type="button" onClick={retryHome}>重试首页图片</button>}</div>}
          <div className="roster-heading"><h2>选择你的斗士 <span>SELECT YOUR FIGHTER</span></h2><span>P1 出战角色</span></div>
          <div className="character-roster">{CHARACTERS.map((character, index) => {
            const progress = loading.characters[character.id] ?? { status: 'waiting', loadedBytes: 0, totalBytes: 0, percent: 0 };
            const showProgress = progress.status !== 'ready';
            const percent = Math.floor(progress.percent);
            return <div key={character.id} className="character-slot">
              <button className={`character-card ${index === player ? 'selected' : ''} ${showProgress ? 'has-loading-progress' : ''}`} onClick={() => setPlayer(index)} aria-pressed={index === player} aria-label={`选择${character.name}`} style={{ '--card-color': CHARACTER_DETAILS[character.id].color } as CSSProperties}>
                <div className="card-art"><Artwork key={`${character.id}:${homeImageAttempt}`} id={character.id} available={portraitReady(character.id)} unavailable={loading.home.status === 'error' && !portraitReady(character.id)}/></div><span className="card-element">{CHARACTER_DETAILS[character.id].element}</span><span className="card-copy"><strong>{character.name}</strong><small>{CHARACTER_DETAILS[character.id].role}</small></span>{index === player && <span className="card-selected">✓</span>}
                {showProgress && <span className={`card-loading-progress ${progress.status}`}><span>{progress.status === 'error' ? '素材加载失败' : progress.status === 'waiting' ? `等待加载${percent > 0 ? ` · ${percent}%` : ''}` : `素材加载 ${percent}%`}</span><span className="card-loading-track" role="progressbar" aria-label={`${character.name}素材加载进度`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent}><i style={{ width: `${percent}%` }}/></span></span>}
              </button>
              {progress.status === 'error' && <button type="button" className="card-loading-retry" aria-label={`重试${character.name}素材`} onClick={() => assetLoading.retryCharacter(character.id)}>重试</button>}
            </div>;
          })}</div>
        </section>
        <aside className="match-panel" aria-label="对战设置">
          <div className="panel-heading"><div><span className="tiny-label">READY TO CLASH</span><h2>出战准备</h2></div><Crest small/></div>
          <div className="mode-switch three-modes" role="group" aria-label="对战模式"><button className={isSurvival ? 'active' : ''} onClick={() => setMode('survival')} aria-pressed={isSurvival}><span>✦</span> 秘境生存</button><button className={mode === 'cpu' ? 'active' : ''} onClick={() => setMode('cpu')} aria-pressed={mode === 'cpu'}><span>◇</span> 单人试炼</button><button className={mode === 'pvp' ? 'active' : ''} onClick={() => setMode('pvp')} aria-pressed={mode === 'pvp'}><span>◈</span> 本地双人</button></div>
          {isSurvival && <div className="survival-variant-switch" role="group" aria-label="秘境玩法"><button className={isExpedition ? 'active' : ''} onClick={() => setSurvivalVariant('expedition')} aria-pressed={isExpedition} aria-label="选择遗迹漫游"><span>10 分钟 <em>新</em></span><strong>遗迹漫游</strong><small>三区相连 · 自由探索</small></button><button className={survivalVariant === 'survival' ? 'active' : ''} onClick={() => setSurvivalVariant('survival')} aria-pressed={survivalVariant === 'survival'} aria-label="选择经典生存"><span>10 分钟</span><strong>经典生存</strong><small>怪潮 · 随机成长</small></button><button className={isTactical ? 'active' : ''} onClick={() => setSurvivalVariant('tactical')} aria-pressed={isTactical} aria-label="选择战术试炼"><span>90 秒</span><strong>战术试炼</strong><small>三张地形 · 三组敌阵</small></button></div>}
          {isExpedition && <div className="expedition-lobby-route" aria-label="遗迹漫游路线"><div><span>↟ 风井遗迹</span><i>↔</i><span>⌁ 断桥回廊</span><i>↔</i><span>⚙ 机关回廊</span></div><p>沿缓坡自由往返，成长一路保留。<br/>9 分钟首领登场、停止增援并熄火；存活至 10 分钟通关。</p></div>}
          {isTactical && <div className="tactical-map-picker"><div className="tactical-map-heading"><span>试炼地形</span><small>同一斗士，试试不同路线</small></div><div className="tactical-map-options" role="group" aria-label="试炼地形">{Object.values(TACTICAL_MAPS).map(map => <button type="button" key={map.id} className={map.id === tacticalMapId ? 'active' : ''} aria-pressed={map.id === tacticalMapId} aria-label={`选择${map.name}`} onClick={() => setTacticalMapId(map.id)}><span aria-hidden="true">{TACTICAL_LOBBY_COPY[map.id].icon}</span><strong>{map.name}</strong><small>{map.subtitle}</small></button>)}</div><p>{tacticalMap.description}</p></div>}
          {isSurvival ? <div className="survival-lobby-intro"><span className="player-label">{isTactical ? `${tacticalMap.name} · 存活 90 秒即胜利` : isExpedition ? '遗迹漫游 · 从风井出发，自选路线' : '经典生存 · 存活即胜利'}</span><strong>{selected.name}<small>{detail.role}</small></strong><p>{isTactical ? <>L / I 固定 3 级，专注地形与敌人应对。<br/>每 30 秒迎来新敌阵，换层寻找突破口。</> : <>L / I 从 1 级成长，收集经验，升级三选一。<br/>元素技能与战技各自成长，组合你的打法。</>}</p></div> : <div className="matchup"><div className="matchup-player"><span className="player-label">P1 · 你的斗士</span><strong>{selected.name}</strong><small>{detail.role}</small></div><span className="versus">VS</span><div className="matchup-player opponent"><label className="player-label" htmlFor="opponent">{mode === 'cpu' ? 'CPU · 挑战对手' : 'P2 · 好友斗士'}</label><select id="opponent" value={opponent} onChange={event => setOpponent(Number(event.target.value))}>{CHARACTERS.map((character, index) => <option value={index} key={character.id}>{character.name}</option>)}</select><small>{CHARACTER_DETAILS[CHARACTERS[opponent].id].role}</small></div></div>}
          <div className="character-skills" aria-label={`${selected.name}的技能`}>
            <div className="character-brief"><kbd className="brief-hotkey">L</kbd><div><strong>{selected.special.name}<span>{selected.id === 'xiao' ? '元素技能 · 空中限定' : '元素技能'}</span></strong><p>{selected.desc}</p>{selected.id === 'xiao' && <small className="skill-cooldown-note">W 起跳后，枪尖向下戳刺</small>}{selected.specialCooldown && <small className="skill-cooldown-note">独立冷却 {selected.specialCooldown} 秒 · 手动释放后召唤物持续行动</small>}</div></div>
            <div className="character-brief secondary-brief"><kbd className="brief-hotkey">I</kbd><div><strong>{selected.secondary.name}<span>战技</span></strong><p>{selected.secondaryDesc}</p><small className="skill-cooldown-note">独立冷却 {selected.secondaryCooldown} 秒</small></div></div>
          </div>
          {isTactical ? <div className="tactical-lobby-brief"><div className="tactical-brief-heading"><span>{tacticalMap.subtitle}</span><strong>L / I · Lv.3</strong></div><p><b>盾卫</b> 绕后 / 重击破盾 <b>冲锋兽</b> 避开蓄力冲撞</p><p><b>高台射手</b> {tacticalCopy.sniper}</p><div className="tactical-loadout-preview"><kbd>I</kbd><span>{getSecondaryProfile(selected.id, 3).description.split('；')[0]}</span></div><small><b>本图目标</b> {tacticalCopy.goal}</small></div> : isSurvival ? <div className="survival-path-preview"><details className="survival-branch-preview"><summary><span>L · 4 级专属进化</span><small>{SURVIVAL_BRANCHES[selected.id].map(branch => branch.name).join(' / ')} ＋</small></summary><div>{SURVIVAL_BRANCHES[selected.id].map(branch => <div className="survival-path-option" key={branch.id} style={{ '--path-color': branch.color } as CSSProperties}><span>✧</span><div><strong>{branch.name}</strong><p>{branch.description}</p></div></div>)}<p className="survival-branch-note">达到 4 级后免费二选一，本局择一。</p></div></details><div className="secondary-form-preview"><div className="survival-path-heading">I · 战技形态 <span>独立升至 5 级</span></div>{[3, 5].map(level => <p key={level}><span>Lv.{level}</span>{getSecondaryProfile(selected.id, level).description.split('；')[0]}</p>)}</div><p className="survival-manual-note"><kbd>J</kbd> 普攻 <kbd>K</kbd> 重击 <kbd>L</kbd> 元素技能 <kbd>I</kbd> 战技 <span>全手动释放</span></p></div> : mode === 'cpu' ? <fieldset className="difficulty"><legend>挑战难度 <span>{difficulty === 'easy' ? '熟悉招式，轻松上手' : difficulty === 'normal' ? '攻守之间，尽情交锋' : '全力以赴，突破极限'}</span></legend><div>{([['easy', '入门'], ['normal', '标准'], ['hard', '挑战']] as const).map(([value, label]) => <button key={value} type="button" onClick={() => setDifficulty(value)} className={difficulty === value ? 'active' : ''} aria-pressed={difficulty === value}>{label}{difficulty === value && <span>◆</span>}</button>)}</div></fieldset> : <div className="pvp-note"><span>双人同屏，一决高下</span><p>与好友共用一个键盘，P2 使用方向键与右侧攻击键；战技按单引号或小键盘 5。</p></div>}
          {!isSurvival && <div className="item-setting"><div><strong>随机道具</strong><span>让战局多一点惊喜</span></div><button className={`toggle ${items ? 'on' : ''}`} type="button" role="switch" aria-checked={items} aria-label="随机道具" onClick={() => setItems(!items)}><span/></button></div>}
          <ControlModeSetting mode={mobile.mode}/>
          {mobile.enabled && mode === 'pvp' && <p className="mobile-pvp-note">本地双人需要外接键盘；屏幕按键仅控制 P1。</p>}
          <button ref={startButtonRef} className="start-button" onClick={() => { unlockBattleAudio(); void enterMobileFullscreen(); if (mode === 'survival') setSurvival({ player, variant: survivalVariant, ...(isTactical ? { mapId: tacticalMapId } : {}) }); else setMatch({ mode, player, opponent, difficulty, stocks: 3, duration: 180, items }); }}><span className="button-spark">✦</span> {isTactical ? '开始战术试炼' : isExpedition ? '开始遗迹漫游' : isSurvival ? '进入秘境' : '进入战场'} <span>→</span></button>
          <p className="start-note"><span>⌨</span> {mobile.enabled ? '横持设备 · 两侧触屏按键 · 全手动战斗' : isTactical ? '90 秒挑战 · 固定技能 · 存活即胜利' : isSurvival ? '十分钟挑战 · 升级选择期间暂停计时' : '键盘操作 · 素材就绪后自动开战'}</p>
        </aside>
      </div>
      <details className="guide"><summary><span><span className="guide-icon">⌘</span> 初次来访？了解操作与胜负规则</span><span>展开指南 ＋</span></summary>{isSurvival ? <div className="guide-content"><div className="guide-intro"><strong>{isTactical ? `观察敌阵，${tacticalCopy.route}，活过 90 秒。` : isExpedition ? '一张相连的大地图，路线由你决定。' : '手动出招，选择成长，突破十分钟怪潮。'}</strong><p>{isTactical ? `${tacticalMap.description}盾卫用重击破盾或绕后应对，冲锋兽蓄力后跳过或闪避，高台射手可贴近打断。敌阵在 0、30、60 秒登场；L 元素技能与 I 战技固定为 3 级，存活至 01:30 即可通关。结算时可查看换层、${usesWind ? '乘风、' : ''}破盾和躲避冲锋次数。` : isExpedition ? '从风井遗迹出发，经断桥回廊通往机关回廊。三区由缓坡相连，随时可以回头，不按时间切换地图。L / I 从 1 级开始，拾取经验后升级三选一；跨区保留生命、强化与战绩。9 分钟首领登场后停止增援、地火熄灭；存活至 10:00 通关，击败首领另计战绩。' : '在大型横版秘境中击败敌人、拾取经验。每次升级三选一，L 元素技能达到 4 级后二选一进化；I 战技独立升至 5 级，在 3、5 级改变形态。两招未满级时会持续提供强化机会。最多携带两种随手动攻击触发的追击强化。存活至 10:00 即可通关，击败第 9 分钟出现的首领获得额外战绩。'}</p></div><SurvivalControls tactical={isTactical} expedition={isExpedition} mapId={tacticalMapId}/></div> : <ControlsGuide />}</details>
      <footer className="site-footer"><span>TEYVAT · ELEMENTAL CLASH</span><p>同人创作 · 非官方游戏 <i/> 愿每一场对决，都值得回味。</p><span>{isTactical ? 'TACTICAL TRIAL / 90 SEC' : isExpedition ? 'RUINS EXPEDITION / 600 SEC' : isSurvival ? 'MANUAL COMBAT / 600 SEC' : '3 STOCK / 180 SEC'}</span></footer>
    </main>}
  </div>;
}

