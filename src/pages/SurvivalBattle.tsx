import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CHARACTERS } from '../game/data';
import { LOBBY_CHARACTER_ART } from '../game/lobby-art';
import { useArtLoading, useBattleArt } from '../hooks/useArtLoading';
import ArtLoading from '../components/ArtLoading';
import CorrinStatus from '../components/CorrinStatus';
import { SurvivalGame } from '../game/survival-engine';
import { EXPEDITION_REGIONS, getSecondaryProfile, getTacticalMap, SURVIVAL_DURATION, TACTICAL_DURATION } from '../game/survival-data';
import type { SurvivalOptions, TacticalMapId, UpgradeChoice } from '../game/survival-data';
import { unlockBattleAudio } from '../game/audio';
import AudioSettings from './AudioSettings';
import MobileControls, { RotateDeviceGuide } from '../components/mobile/MobileControls';
import { pauseForMobileEnvironment, readMobileVisualQuality, useMobileBattleLifecycle, useMobileEnvironment } from '../hooks/useMobileGame';
import './SurvivalBattle.css';

type Snapshot = ReturnType<SurvivalGame['getSnapshot']>;

const KIND_LABELS = { core: 'L · 元素强化', secondary: 'I · 战技强化', branch: 'L · 元素进化', passive: '生存强化', auxiliary: '追击强化' };
const KIND_SIGILS = { core: '✧', secondary: '✹', branch: '✦', passive: '◇', auxiliary: '⌁' };

const TACTICAL_BATTLE_COPY: Record<TacticalMapId, { controls: string; touch: string; bottomline: string; pause: string; retry: string }> = {
  'wind-ruins': {
    controls: '走进中央风井借风升空，按 S 可下穿浮台并压住上升气流。',
    touch: '风井升空 · 下键下穿 · 重击破盾',
    bottomline: '走进中央风井升空 · S 下穿浮台 / 压住气流',
    pause: '中央风井升空 · 下键下穿 / 压住气流',
    retry: '借风换层',
  },
  'broken-bridge': {
    controls: '二段跳跨过断桥，按 S 下穿桥面；落入谷地后可借中央跳台或两侧缓坡返回。',
    touch: '二段跳跨桥 · 下键下穿 · 沿坡回桥',
    bottomline: 'W 二段跳跨断口 · S 下穿桥面',
    pause: '二段跳跨断口 · 下键下穿桥面 · 两侧坡道回桥',
    retry: '跨桥转线',
  },
  'mechanism-hall': {
    controls: '西、东地火交替发动：黄纹预警 2 秒，红焰喷发 2 秒，熄灭后再通行。单跳上侧台、二段跳登高，所有浮台都免地火；红焰时谨慎按 S 下穿。地火只伤玩家，每次喷发最多造成 8 点伤害。',
    touch: '黄纹登台 · 红焰勿下穿 · 二段跳登高',
    bottomline: '黄纹预警 2 秒 → 红焰喷发 2 秒 → 熄灭通行 · W 登台，S 下穿前先看地火',
    pause: '黄纹预警时登台 · 红焰时勿下穿 · 浮台免地火，仍需应对敌人',
    retry: '看纹登台、熄灭后下穿',
  },
};

const HAZARD_STATE_LABELS = { off: '待机', warning: '预警', active: '喷发' };
const HAZARD_STATE_SYMBOLS = { off: '◇', warning: '△', active: '♨' };

function TacticalHazards({ mapId, snapshot, extinguished = false }: { mapId: TacticalMapId; snapshot: Snapshot | null; extinguished?: boolean }) {
  const map = getTacticalMap(mapId);
  const hazards = snapshot?.tacticalHazards ?? map.hazards?.map(hazard => ({ ...hazard, state: 'off' as const, phaseRemaining: 0 }));
  if (!hazards?.length) return null;
  return <div className="tactical-hazards" aria-label="地火机关状态">
    {hazards.map(hazard => <div key={hazard.id} className={`tactical-hazard hazard-${hazard.state}`}>
      <span aria-hidden="true">{HAZARD_STATE_SYMBOLS[hazard.state]}</span>
      <span aria-live="polite" aria-atomic="true">{hazard.name} · {extinguished ? '已熄火' : HAZARD_STATE_LABELS[hazard.state]}</span>
      {!extinguished && <small>{snapshot ? `${Math.ceil(hazard.phaseRemaining)}s` : '安全'}</small>}
    </div>)}
  </div>;
}

function ExpeditionNavigation({ snapshot }: { snapshot: Snapshot | null }) {
  const expedition = snapshot?.expedition;
  const regionId = expedition?.regionId ?? EXPEDITION_REGIONS[0].id;
  const visited = expedition?.visitedRegions ?? [regionId];
  const objective = expedition?.objective ?? '向右探索断桥回廊 · 可随时沿坡返回';
  const showHazards = regionId === 'mechanism-hall';
  return <section className={`expedition-navigation ${showHazards ? 'has-hazards' : ''}`} aria-label="漫游探索进度">
    <div className="expedition-current" aria-live="polite"><strong>{expedition?.regionName ?? EXPEDITION_REGIONS[0].name}</strong><span>已到达 {visited.length}/{EXPEDITION_REGIONS.length}</span></div>
    <div className="expedition-region-list" aria-label="相连区域">{EXPEDITION_REGIONS.map(region => <span key={region.id} className={`${region.id === regionId ? 'current' : ''} ${visited.includes(region.id) ? 'visited' : ''}`} aria-current={region.id === regionId ? 'location' : undefined}>{visited.includes(region.id) ? '◆' : '◇'} {region.name}</span>)}</div>
    <p className="expedition-objective">{objective}</p>
    {showHazards && <TacticalHazards mapId="mechanism-hall" snapshot={snapshot} extinguished={expedition?.bossStarted}/>}
  </section>;
}

function formatTime(seconds: number) {
  const value = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(value / 60).toString().padStart(2, '0')}:${(value % 60).toString().padStart(2, '0')}`;
}

function offerKey(snapshot: Snapshot | null) {
  return snapshot?.phase === 'upgrade' ? `${snapshot.level}:${snapshot.choices.map(choice => `${choice.id}:${choice.level}`).join('|')}` : '';
}

function Cooldown({ label, hotkey, remaining, maximum, level, description }: { label: string; hotkey: string; remaining: number; maximum: number; level?: number; description?: string }) {
  const ready = remaining <= 0;
  return <div className={`survival-cooldown ${ready ? 'ready' : ''}`} title={description} aria-label={`${hotkey} ${label}${level ? ` 等级 ${level}` : ''}，${ready ? '就绪' : `冷却 ${remaining.toFixed(1)} 秒`}${description ? `，${description}` : ''}`}>
    <kbd>{hotkey}</kbd><span>{label}{level && <em> Lv.{level}</em>}<small>{ready ? '就绪' : `${remaining.toFixed(1)} 秒`}</small></span>
    <div className="survival-cooldown-track"><i style={{ width: `${ready ? 100 : Math.max(0, 1 - remaining / Math.max(1, maximum)) * 100}%` }}/></div>
  </div>;
}

function UpgradeCard({ choice, index, onChoose }: { choice: UpgradeChoice; index: number; onChoose: () => void }) {
  return <button className={`upgrade-card upgrade-${choice.kind}`} onClick={onChoose} style={{ '--upgrade-color': choice.color || '#cbb98c' } as CSSProperties}>
    <span className="upgrade-topline"><span>{KIND_LABELS[choice.kind]}</span><kbd>{index + 1}</kbd></span>
    <span className="upgrade-sigil" aria-hidden="true">{KIND_SIGILS[choice.kind]}</span>
    <strong>{choice.name}</strong>
    <span className="upgrade-level">{choice.kind === 'branch' ? '专属路线 · 本局生效' : `Lv.${Math.max(0, choice.level - 1)} → Lv.${choice.level} / ${choice.maxLevel}`}</span>
    <span className="upgrade-description">{choice.description}</span>
    <span className="upgrade-select">选择此强化 <span>↗</span></span>
  </button>;
}

export function SurvivalControls({ compact = false, tactical = false, expedition = false, mapId }: { compact?: boolean; tactical?: boolean; expedition?: boolean; mapId?: TacticalMapId }) {
  const map = getTacticalMap(mapId);
  const copy = TACTICAL_BATTLE_COPY[map.id];
  return <div className={compact ? 'survival-controls compact' : 'survival-controls'}>
    <p><kbd>A</kbd><kbd>D</kbd> 移动 <kbd>W</kbd> 跳跃 / 二段跳 <kbd>S</kbd> 快降 / 下平台 <kbd>H</kbd> 闪避</p>
    <p><kbd>J</kbd> 普攻 <kbd>K</kbd> 重击 <kbd>L</kbd> 元素技能 <kbd>I</kbd> 战技 <span>· 全手动释放</span></p>
    {!compact && <p className="survival-control-note">{tactical ? `L / I 固定为 3 级、独立冷却。${copy.controls}盾卫可绕后或重击破盾，冲锋兽扑空后有反击空档，射手近身即可打断。` : '两招独立冷却、独立升级，最高 5 级。L 在 4 级选择进化。钟离岩柱与芙宁娜沙龙成员仅在手动释放 L 后持续行动。升级时战场暂停，选择后继续。'}<kbd>Esc</kbd> / <kbd>P</kbd> 暂停，<kbd>M</kbd> 静音。神威用 <kbd>L</kbd> 切换近战人形与远程白龙，两形态共享生命及冷却。魈先起跳再按 <kbd>L</kbd> 下坠；<kbd>I</kbd> 可在地面或空中水平突进。</p>}
    {!compact && expedition && <p className="survival-control-note">遗迹漫游：风井借风登高，断桥二段跳或沿谷地绕行，机关黄纹预警时登台。三区可自由往返，生命与成长保留。9 分钟首领登场后停止增援、地火熄灭，存活至 10 分钟通关。</p>}
  </div>;
}

export default function SurvivalBattle({ options, muted, onMutedChange, onExit }: { options: SurvivalOptions; muted: boolean; onMutedChange: (value: boolean) => void; onExit: () => void }) {
  const mobile = useMobileEnvironment();
  const [editingControls, setEditingControls] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<SurvivalGame | null>(null);
  const initialMuted = useRef(muted);
  const lastSelectionAt = useRef(0);
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const hasStarted = snapshot !== null;
  const isTactical = options.variant === 'tactical';
  const isExpedition = options.variant === 'expedition';
  const tacticalMap = getTacticalMap(options.mapId);
  const tacticalCopy = TACTICAL_BATTLE_COPY[tacticalMap.id];
  const hasHazards = !!tacticalMap.hazards?.length;
  const usesWind = tacticalMap.wind !== null;
  const duration = snapshot?.duration ?? (isTactical ? TACTICAL_DURATION : SURVIVAL_DURATION);
  const encounterIndex = snapshot?.encounterIndex ?? 0;
  const encounter = tacticalMap.encounters[Math.max(0, encounterIndex)];
  const nextEncounter = tacticalMap.encounters[encounterIndex + 1];
  const character = CHARACTERS[options.player];
  const loading = useArtLoading();
  const phase = snapshot?.phase || 'playing';
  const choicesKey = offerKey(snapshot);
  const hasOverlay = phase !== 'playing';
  const isResult = phase === 'victory' || phase === 'defeat';
  const branchOffer = snapshot?.choices.length === 2 && snapshot.choices.every(choice => choice.kind === 'branch');
  const openControlEditor = useCallback(() => {
    const game = gameRef.current;
    game?.clearTouchInput();
    if (game?.getSnapshot().phase === 'playing') game.pause();
    setEditingControls(true);
  }, []);

  const start = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const game = new SurvivalGame(canvas);
    gameRef.current = game;
    game.setMuted(initialMuted.current);
    game.setVisualQuality(readMobileVisualQuality());
    game.start(options);
    pauseForMobileEnvironment(game);
    setSnapshot(game.getSnapshot());
    canvas.focus({ preventScroll: true });
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
  const preparation = useBattleArt([character.id], start);
  useMobileBattleLifecycle(gameRef, mobile.enabled, mobile.portrait, phase);
  useEffect(() => {
    initialMuted.current = muted;
    gameRef.current?.setMuted(muted);
    if (gameRef.current?.getSnapshot().phase === 'playing' && !document.activeElement?.closest('[data-audio-settings]')) canvasRef.current?.focus({ preventScroll: true });
  }, [muted]);

  const selectUpgrade = useCallback((id: string) => {
    const game = gameRef.current;
    if (!game || Date.now() - lastSelectionAt.current < 350 || offerKey(game.getSnapshot()) !== choicesKey) return;
    unlockBattleAudio();
    if (game.chooseUpgrade(id)) {
      lastSelectionAt.current = Date.now();
      setSnapshot(game.getSnapshot());
    }
  }, [choicesKey]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!hasStarted || editingControls || (mobile.enabled && mobile.portrait)) return;
    if (!hasOverlay) {
      canvas?.focus({ preventScroll: true });
      return;
    }
    const dialog = dialogRef.current;
    if (!dialog) return;
    const actions = () => Array.from(dialog.querySelectorAll<HTMLElement>('button:not(:disabled), input:not([type=file]):not(:disabled)'));
    const primary = actions()[0];
    primary?.focus({ preventScroll: true });
    primary?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    const keepFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !dialog.contains(event.target)) {
        primary?.focus({ preventScroll: true });
        primary?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
      }
    };
    const keyboard = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLElement && event.target.closest('[data-audio-settings]')) return;
      if (event.key.toLowerCase() === 'm') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat && gameRef.current) { if (gameRef.current.getSnapshot().muted) unlockBattleAudio(); gameRef.current.setMuted(!gameRef.current.getSnapshot().muted); }
        return;
      }
      if (event.repeat && ['Enter', ' ', '1', '2', '3'].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
      if (phase === 'paused' && ['Escape', 'p', 'P'].includes(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!event.repeat) { unlockBattleAudio(); gameRef.current?.resume(); }
        return;
      }
      if (phase === 'upgrade' && /^[123]$/.test(event.key)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        dialog.querySelectorAll<HTMLButtonElement>('.upgrade-card')[Number(event.key) - 1]?.click();
        return;
      }
      const arrows = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'];
      if (event.key !== 'Tab' && !arrows.includes(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      const buttons = actions();
      if (!buttons.length) return;
      const direction = event.key === 'Tab' ? (event.shiftKey ? -1 : 1) : (event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 1);
      const current = buttons.findIndex(button => button === document.activeElement);
      const next = buttons[(current + direction + buttons.length) % buttons.length];
      next.focus({ preventScroll: true });
      next.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    document.addEventListener('focusin', keepFocus);
    document.addEventListener('keydown', keyboard, true);
    return () => {
      document.removeEventListener('focusin', keepFocus);
      document.removeEventListener('keydown', keyboard, true);
    };
  }, [hasOverlay, phase, choicesKey, editingControls, mobile.enabled, mobile.portrait, hasStarted]);

  const hp = snapshot?.hp ?? 100;
  const maxHp = snapshot?.maxHp ?? 100;
  const level = snapshot?.level ?? 1;
  const xp = snapshot?.xp ?? 0;
  const xpNeeded = snapshot?.xpNeeded ?? 1;
  const skillLevel = snapshot?.skillLevel ?? (isTactical ? 3 : 1);
  const secondaryLevel = snapshot?.secondaryLevel ?? (isTactical ? 3 : 1);
  const secondaryForm = getSecondaryProfile(character.id, secondaryLevel).description.split('；')[0];
  const specialName = snapshot?.corrin?.specialName ?? character.special.name;
  const secondaryName = snapshot?.corrin?.secondaryName ?? character.secondary.name;
  const summonStatus = character.id === 'zhongli' || character.id === 'furina' ? <div className="survival-summon-status" aria-label="召唤状态">
    {character.id === 'zhongli' ? <><span>盾 {Math.ceil(snapshot?.shieldHp ?? 0)}{(snapshot?.shieldRemaining ?? 0) > 0 ? ` · ${Math.ceil(snapshot!.shieldRemaining)}s` : ''}</span><span>岩柱 {snapshot?.summonCount ?? 0} · {Math.ceil(snapshot?.summonRemaining ?? 0)}s</span></> : <><span>沙龙 {snapshot?.summonCount ?? 0}/3 · {Math.ceil(snapshot?.summonRemaining ?? 0)}s</span><span>喝彩 {(snapshot?.buffRemaining ?? 0) > 0 ? `${Math.ceil(snapshot!.buffRemaining)}s` : '未开启'}</span></>}
  </div> : null;
  const skillLoadout = <div className="survival-skill-loadout"><div><kbd>L</kbd><span>{specialName} · Lv.{skillLevel}<small>{isTactical ? '试炼固定技能 · 手动释放' : snapshot?.branchName || '基础形态 · 4 级可进化'}</small></span></div><div><kbd>I</kbd><span>{secondaryName} · Lv.{secondaryLevel}<small>{secondaryForm}</small></span></div></div>;
  return <main className={`survival-main ${isTactical ? 'tactical-main' : isExpedition ? 'expedition-main' : ''} ${summonStatus ? 'has-summon-status' : ''}`}>
    {mobile.enabled && <MobileControls gameRef={gameRef} snapshot={snapshot} character={character} active={snapshot?.phase === 'playing' && !mobile.portrait} editing={editingControls && !mobile.portrait} onCloseEditor={() => setEditingControls(false)}/>}
    {mobile.enabled && mobile.portrait && <RotateDeviceGuide onExit={onExit}/>}
    <div className="arena-toolbar survival-toolbar">
      <div><span className="tiny-label">{isTactical ? 'TACTICAL TRIAL · NINETY SECONDS' : isExpedition ? 'RUINS EXPEDITION · TEN MINUTES' : 'ENDLESS TIDES · TEN MINUTES'}</span><h1>{isTactical ? '战术试炼' : isExpedition ? '遗迹漫游' : '经典生存'} <span>· {isTactical ? tacticalMap.name : isExpedition ? '三境相连' : '千岩浮境'}</span></h1></div>
      <div className="arena-actions">{mobile.enabled && <button className="quiet-button" disabled={!snapshot || phase === 'upgrade' || isResult} onClick={openControlEditor}>触控布局</button>}<button className="quiet-button" disabled={!snapshot || phase === 'upgrade' || isResult} onClick={() => { if (phase === 'paused' && !(mobile.enabled && mobile.portrait)) { unlockBattleAudio(); gameRef.current?.resume(); } else gameRef.current?.pause(); }}>{phase === 'paused' ? '▷ 继续' : 'Ⅱ 暂停'}<kbd>Esc</kbd></button><button className="quiet-button" onClick={onExit}>返回大厅 <span>↗</span></button></div>
    </div>
    <section className="survival-status" aria-label="生存状态">
      <div className="survival-hero-status"><div className="survival-avatar"><img src={snapshot || loading.homeReadyUrls.includes(LOBBY_CHARACTER_ART[character.id]) ? LOBBY_CHARACTER_ART[character.id] : undefined} alt=""/></div><div className="survival-vitals"><div className="survival-name"><strong>{character.name}</strong><span>{isTactical ? 'L / I · Lv.3' : `LV. ${level}`}</span></div><div className="survival-health" role="progressbar" aria-label="生命值" aria-valuenow={Math.ceil(hp)} aria-valuemin={0} aria-valuemax={maxHp}><i style={{ width: `${Math.max(0, hp / maxHp) * 100}%` }}/><span>{Math.ceil(hp)} / {maxHp}</span></div>{summonStatus}</div></div>
      <div className="survival-clock"><span>{isTactical ? '存活至试炼结束' : isExpedition ? '存活至漫游结束' : '坚持至秘境关闭'}</span><strong>{formatTime(snapshot?.remaining ?? duration)}</strong><small>{isTactical ? snapshot?.encounterName || encounter.name : snapshot?.waveName || '初入秘境'}</small></div>
      <div className="survival-run-stats"><div><span>击败敌人</span><strong>{snapshot?.kills ?? 0}</strong></div><div className="survival-route"><span>{isTactical ? tacticalMap.subtitle : `L · 元素 Lv.${skillLevel}`}</span><strong>{isTactical ? `换层 ${snapshot?.tacticalStats.layerChanges ?? 0} · ${usesWind ? `乘风 ${snapshot?.tacticalStats.windRides ?? 0}` : `避冲锋 ${snapshot?.tacticalStats.chargesEvaded ?? 0}`}` : snapshot?.branchName || '尚未进化'}</strong></div></div>
    </section>
    {isTactical ? <div className={`tactical-stagebar ${hasHazards ? 'has-hazards' : ''}`}><div className="tactical-encounters" aria-label="试炼阶段">{tacticalMap.encounters.map((stage, index) => <span key={stage.start} className={index === encounterIndex ? 'active' : index < encounterIndex ? 'complete' : ''} aria-current={index === encounterIndex ? 'step' : undefined}><b>{index + 1}</b><span>{stage.name.replace(/^\d+\s*·\s*/, '')}</span><small>{formatTime(stage.start)}</small></span>)}</div><div className="tactical-stage-hint"><span aria-live="polite">{encounter.hint}</span><small>{nextEncounter ? `下一组 ${formatTime(Math.max(0, nextEncounter.start - (snapshot?.elapsed ?? 0)))}` : '最后一组 · 坚持至计时结束'}</small></div>{hasHazards ? <TacticalHazards mapId={tacticalMap.id} snapshot={snapshot}/> : <p className="tactical-touch-tip"><b>{tacticalMap.name}</b> · {tacticalCopy.touch}</p>}</div> : <div className="survival-experience" role="progressbar" aria-label="升级经验" aria-valuenow={xp} aria-valuemin={0} aria-valuemax={xpNeeded}><i style={{ width: `${Math.min(100, xp / xpNeeded * 100)}%` }}/><span>经验 {Math.floor(xp)} / {xpNeeded}</span></div>}
    {isExpedition && <ExpeditionNavigation snapshot={snapshot}/>}
    <div className="arena-frame survival-arena"><canvas ref={canvasRef} tabIndex={-1} onPointerDown={() => canvasRef.current?.focus({ preventScroll: true })} aria-label={`${character.name}的${isTactical ? `90秒战术试炼，${tacticalMap.name}，${tacticalMap.subtitle}，${tacticalCopy.touch}` : isExpedition ? '遗迹漫游，风井遗迹、断桥回廊、机关回廊相连，十分钟自由探索' : '经典生存'}战场，A D移动，W跳跃，S下穿，J K手动攻击，L元素技能，I战技，H闪避`}/><CorrinStatus hud={snapshot?.corrin}/>{!snapshot && <ArtLoading characterIds={[character.id]} progress={preparation.progress} onRetry={preparation.retry} onExit={onExit}/>}</div>
    <div className="survival-actionbar">
      <SurvivalControls compact tactical={isTactical} expedition={isExpedition} mapId={tacticalMap.id}/>
      <div className="survival-cooldowns"><Cooldown label={specialName} hotkey="L" level={isTactical ? skillLevel : undefined} remaining={snapshot?.skillCooldown ?? 0} maximum={snapshot?.skillCooldownMax ?? 1} description={character.desc}/><Cooldown label={secondaryName} hotkey="I" level={secondaryLevel} remaining={snapshot?.secondaryCooldown ?? 0} maximum={snapshot?.secondaryCooldownMax ?? character.secondaryCooldown} description={secondaryForm}/><Cooldown label="闪避" hotkey="H" remaining={snapshot?.dodgeCooldown ?? 0} maximum={snapshot?.dodgeCooldownMax ?? 1}/></div>
    </div>
    <div className="survival-bottomline"><span>{isTactical ? `${tacticalCopy.bottomline} · ${tacticalMap.routeHint}` : isExpedition ? '风井登高 · 断桥上下绕行 · 机关黄纹登台 · 三区自由往返，成长一路保留' : character.id === 'xiao' ? '魈：W 起跳 → L 枪尖向下戳刺。凌空路线返还跳跃，由你决定何时再起跳。' : '攻击方向随你的朝向。沿坡道穿行高地与谷地，利用浮台拉开距离。'}</span><span>{isTactical ? '01:30 存活通关 · L / I 固定 3 级' : '10:00 存活通关 · 首领奖励额外计算'}</span></div>
    {hasOverlay && !editingControls && !(mobile.enabled && mobile.portrait) && <div className="survival-overlay">
      <div className={`survival-dialog ${phase === 'upgrade' ? 'survival-upgrade-dialog' : 'survival-summary-dialog'}`} ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="survival-dialog-title">
        {phase === 'upgrade' ? <>
          <span className="tiny-label">{branchOffer ? 'CHOOSE YOUR DESTINY' : 'A NEW STRENGTH AWAKENS'}</span>
          <h2 id="survival-dialog-title">{branchOffer ? '选择进化之路' : '元素之力，进一步'}</h2>
          <p className="survival-dialog-intro">{branchOffer ? '两条路线，本局择一。让你的招式呈现全新形态。' : `等级 ${level} · 选择一项强化，继续迎接下一轮怪潮。`}<span>战场与计时已暂停</span></p>
          <div className={`upgrade-cards ${branchOffer ? 'branch-choices' : ''}`}>{snapshot?.choices.map((choice, index) => <UpgradeCard key={`${choicesKey}:${choice.id}`} choice={choice} index={index} onChoose={() => selectUpgrade(choice.id)}/>)}</div>
          {!branchOffer && <button className="survival-reroll" disabled={!snapshot?.rerollsRemaining} onClick={() => {
            const game = gameRef.current;
            if (!game || Date.now() - lastSelectionAt.current < 350) return;
            if (game.rerollUpgrades()) {
              lastSelectionAt.current = Date.now();
              setSnapshot(game.getSnapshot());
              window.requestAnimationFrame(() => dialogRef.current?.querySelector<HTMLButtonElement>('.upgrade-card')?.focus({ preventScroll: true }));
            }
          }}>↻ 重选 <span>剩余 {snapshot?.rerollsRemaining ?? 0} 次</span></button>}
          <p className="survival-choice-help"><kbd>1</kbd><kbd>2</kbd>{!branchOffer && <kbd>3</kbd>} 快速选择 <span>· 方向键切换，Enter 确认</span></p>
        </> : phase === 'paused' ? <>
          <div className="survival-summary-sigil">◇</div><span className="tiny-label">THE TIDES CAN WAIT</span><h2 id="survival-dialog-title">{isExpedition ? '漫游暂歇' : '暂歇片刻'}</h2><p className="survival-dialog-intro">{isExpedition ? `${snapshot?.expedition?.regionName ?? '风井遗迹'} · 已到达 ${snapshot?.expedition?.visitedRegions.length ?? 1}/${EXPEDITION_REGIONS.length} 区域。战场与机关计时均已暂停。` : '战场为你停留。准备好，就再度出发。'}</p>
          <div className="survival-pause-build"><span>{character.name} · {isTactical ? tacticalMap.name : isExpedition ? `遗迹漫游 · Lv.${level}` : `Lv.${level}`}</span>{skillLoadout}<small>已生存 {formatTime(snapshot?.elapsed ?? 0)} · 击败 {snapshot?.kills ?? 0} 名敌人</small></div>
          <SurvivalControls tactical={isTactical} expedition={isExpedition} mapId={tacticalMap.id}/>
          {isTactical && <p className="tactical-pause-tip">{tacticalCopy.pause}<br/>重击破盾，冲锋扑空后反击，射手近身打断。</p>}
          {isExpedition && <p className="expedition-pause-tip">{snapshot?.expedition?.objective}<br/>风井登高 · 二段跳跨桥 · 地火预警时登台</p>}
          {mobile.enabled && <button className="quiet-button mobile-pause-settings" onClick={openControlEditor}>触控布局</button>}
          <AudioSettings muted={muted} onMutedChange={onMutedChange} inline onResume={() => gameRef.current?.resume()}/>
          <button className="start-button" onClick={() => { unlockBattleAudio(); gameRef.current?.resume(); }}>{isExpedition ? '继续漫游' : '继续挑战'} <span>→</span></button><button className="overlay-back" onClick={onExit}>结束本局，返回大厅</button>
        </> : <>
          <div className="survival-result-portrait"><img src={LOBBY_CHARACTER_ART[character.id]} alt=""/></div><span className="tiny-label">{phase === 'victory' ? isTactical ? 'TACTICAL TRIAL COMPLETE' : isExpedition ? 'EXPEDITION COMPLETE' : 'DOMAIN CONQUERED' : 'UNTIL THE NEXT DAWN'}</span><h2 id="survival-dialog-title">{phase === 'victory' ? isTactical ? '九十秒，破阵而归' : isExpedition ? '遗迹漫游，平安归来' : '十分钟，破局而归' : isTactical ? '试炼暂告一段落' : isExpedition ? '漫游暂告一段落' : '此行暂告一段落'}</h2><p className="survival-dialog-intro">{isTactical ? phase === 'victory' ? `${tacticalMap.name} · 三组敌阵已走过。回顾你的换层与反击，试试另一种破局方式。` : `${tacticalMap.name} · 再试一次：${tacticalCopy.retry}、躲过冲锋，抓住恢复空档再进攻。` : isExpedition ? `遗迹漫游 · 已到达 ${snapshot?.expedition?.visitedRegions.length ?? 1}/${EXPEDITION_REGIONS.length} 区域。${phase === 'victory' ? '十分钟的探索已完成，下次试试另一条战斗路线。' : '借地形躲开围攻，积累强化后再向前探索。'}` : phase === 'victory' ? '风浪已息。你的元素之力，刻下了新的战绩。' : '记住这次选择，下次从新的招式中寻找答案。'}</p>
          <div className="survival-result-stats"><div><span>生存时间</span><strong>{formatTime(snapshot?.elapsed ?? 0)}</strong></div><div><span>击败敌人</span><strong>{snapshot?.kills ?? 0}</strong></div><div><span>{isTactical ? '换层次数' : '最终等级'}</span><strong>{isTactical ? snapshot?.tacticalStats.layerChanges ?? 0 : level}</strong></div><div><span>{isTactical ? usesWind ? '乘风次数' : '避开冲锋' : '精英击败'}</span><strong>{isTactical ? usesWind ? snapshot?.tacticalStats.windRides ?? 0 : snapshot?.tacticalStats.chargesEvaded ?? 0 : snapshot?.eliteKills ?? 0}</strong></div></div>
          {isTactical && <div className="tactical-result-actions"><span>重击破盾 <strong>{snapshot?.tacticalStats.guardsBroken ?? 0}</strong></span>{usesWind && <span>避开冲锋 <strong>{snapshot?.tacticalStats.chargesEvaded ?? 0}</strong></span>}</div>}
          {isExpedition && <div className="expedition-result-regions" aria-label="本局到达区域">{EXPEDITION_REGIONS.map(region => <span key={region.id} className={snapshot?.expedition?.visitedRegions.includes(region.id) ? 'visited' : ''}>{snapshot?.expedition?.visitedRegions.includes(region.id) ? '◆' : '◇'} {region.name}</span>)}</div>}
          <div className="survival-result-route">{skillLoadout}<small>{isTactical ? `${tacticalMap.name} · L / I 固定 3 级` : snapshot?.bossKilled ? '✦ 已击败秘境首领' : '秘境首领未击败'} · 总伤害 {Math.round(snapshot?.damageDealt ?? 0).toLocaleString()}</small></div>
          <button className="start-button" onClick={() => { unlockBattleAudio(); lastSelectionAt.current = 0; gameRef.current?.rematch(); if (gameRef.current) pauseForMobileEnvironment(gameRef.current); if (gameRef.current) setSnapshot(gameRef.current.getSnapshot()); }}>{isExpedition ? '再次漫游' : '再次挑战'} <span>→</span></button><button className="overlay-back" onClick={onExit}>返回大厅，选择新的斗士</button>
        </>}
      </div>
    </div>}
  </main>;
}
