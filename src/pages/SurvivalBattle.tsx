import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { CHARACTERS } from '../game/data';
import { CHARACTER_ART } from '../game/art';
import { SurvivalGame } from '../game/survival-engine';
import { getSecondaryProfile } from '../game/survival-data';
import type { UpgradeChoice } from '../game/survival-data';
import { unlockBattleAudio } from '../game/audio';
import AudioSettings from './AudioSettings';
import MobileControls, { RotateDeviceGuide } from '../components/mobile/MobileControls';
import { pauseForMobileEnvironment, readMobileVisualQuality, useMobileBattleLifecycle, useMobileEnvironment } from '../hooks/useMobileGame';
import './SurvivalBattle.css';

type SurvivalOptions = { player: number };
type Snapshot = ReturnType<SurvivalGame['getSnapshot']>;

const KIND_LABELS = { core: 'L · 元素强化', secondary: 'I · 战技强化', branch: 'L · 元素进化', passive: '生存强化', auxiliary: '追击强化' };
const KIND_SIGILS = { core: '✧', secondary: '✹', branch: '✦', passive: '◇', auxiliary: '⌁' };

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

export function SurvivalControls({ compact = false }: { compact?: boolean }) {
  return <div className={compact ? 'survival-controls compact' : 'survival-controls'}>
    <p><kbd>A</kbd><kbd>D</kbd> 移动 <kbd>W</kbd> 跳跃 / 二段跳 <kbd>S</kbd> 快降 / 下平台 <kbd>H</kbd> 闪避</p>
    <p><kbd>J</kbd> 普攻 <kbd>K</kbd> 重击 <kbd>L</kbd> 元素技能 <kbd>I</kbd> 战技 <span>· 全手动释放</span></p>
    {!compact && <p className="survival-control-note">两招独立冷却、独立升级，最高 5 级。L 在 4 级选择进化。钟离岩柱与芙宁娜沙龙成员仅在手动释放 L 后持续行动。升级时战场暂停，选择后继续。<kbd>Esc</kbd> / <kbd>P</kbd> 暂停，<kbd>M</kbd> 静音。魈先起跳再按 <kbd>L</kbd> 下坠；<kbd>I</kbd> 可在地面或空中水平突进。</p>}
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
  const character = CHARACTERS[options.player];
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

  useEffect(() => {
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
  useMobileBattleLifecycle(gameRef, mobile.enabled, mobile.portrait, phase);
  useEffect(() => {
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
    if (editingControls || (mobile.enabled && mobile.portrait)) return;
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
  }, [hasOverlay, phase, choicesKey, editingControls, mobile.enabled, mobile.portrait]);

  const hp = snapshot?.hp ?? 100;
  const maxHp = snapshot?.maxHp ?? 100;
  const level = snapshot?.level ?? 1;
  const xp = snapshot?.xp ?? 0;
  const xpNeeded = snapshot?.xpNeeded ?? 1;
  const secondaryLevel = snapshot?.secondaryLevel ?? 1;
  const secondaryForm = getSecondaryProfile(character.id, secondaryLevel).description.split('；')[0];
  const summonStatus = character.id === 'zhongli' || character.id === 'furina' ? <div className="survival-summon-status" aria-label="召唤状态">
    {character.id === 'zhongli' ? <><span>盾 {Math.ceil(snapshot?.shieldHp ?? 0)}{(snapshot?.shieldRemaining ?? 0) > 0 ? ` · ${Math.ceil(snapshot!.shieldRemaining)}s` : ''}</span><span>岩柱 {snapshot?.summonCount ?? 0} · {Math.ceil(snapshot?.summonRemaining ?? 0)}s</span></> : <><span>沙龙 {snapshot?.summonCount ?? 0}/3 · {Math.ceil(snapshot?.summonRemaining ?? 0)}s</span><span>喝彩 {(snapshot?.buffRemaining ?? 0) > 0 ? `${Math.ceil(snapshot!.buffRemaining)}s` : '未开启'}</span></>}
  </div> : null;
  const skillLoadout = <div className="survival-skill-loadout"><div><kbd>L</kbd><span>{character.special.name} · Lv.{snapshot?.skillLevel ?? 1}<small>{snapshot?.branchName || '基础形态 · 4 级可进化'}</small></span></div><div><kbd>I</kbd><span>{character.secondary.name} · Lv.{secondaryLevel}<small>{secondaryForm}</small></span></div></div>;
  return <main className="survival-main">
    {mobile.enabled && <MobileControls gameRef={gameRef} snapshot={snapshot} character={character} active={snapshot?.phase === 'playing' && !mobile.portrait} editing={editingControls && !mobile.portrait} onCloseEditor={() => setEditingControls(false)}/>}
    {mobile.enabled && mobile.portrait && <RotateDeviceGuide onExit={onExit}/>}
    <div className="arena-toolbar survival-toolbar">
      <div><span className="tiny-label">ENDLESS TIDES · TEN MINUTES</span><h1>秘境生存 <span>· 千岩浮境</span></h1></div>
      <div className="arena-actions">{mobile.enabled && <button className="quiet-button" disabled={phase === 'upgrade' || isResult} onClick={openControlEditor}>触控布局</button>}<button className="quiet-button" disabled={phase === 'upgrade' || isResult} onClick={() => { if (phase === 'paused' && !(mobile.enabled && mobile.portrait)) { unlockBattleAudio(); gameRef.current?.resume(); } else gameRef.current?.pause(); }}>{phase === 'paused' ? '▷ 继续' : 'Ⅱ 暂停'}<kbd>Esc</kbd></button><button className="quiet-button" onClick={onExit}>返回大厅 <span>↗</span></button></div>
    </div>
    <section className="survival-status" aria-label="生存状态">
      <div className="survival-hero-status"><div className="survival-avatar"><img src={CHARACTER_ART[character.id]} alt=""/></div><div className="survival-vitals"><div className="survival-name"><strong>{character.name}</strong><span>LV. {level}</span></div><div className="survival-health" role="progressbar" aria-label="生命值" aria-valuenow={Math.ceil(hp)} aria-valuemin={0} aria-valuemax={maxHp}><i style={{ width: `${Math.max(0, hp / maxHp) * 100}%` }}/><span>{Math.ceil(hp)} / {maxHp}</span></div>{summonStatus}</div></div>
      <div className="survival-clock"><span>坚持至秘境关闭</span><strong>{formatTime(snapshot?.remaining ?? 600)}</strong><small>{snapshot?.waveName || '初入秘境'}</small></div>
      <div className="survival-run-stats"><div><span>击败敌人</span><strong>{snapshot?.kills ?? 0}</strong></div><div className="survival-route"><span>L · 元素 Lv.{snapshot?.skillLevel ?? 1}</span><strong>{snapshot?.branchName || '尚未进化'}</strong></div></div>
    </section>
    <div className="survival-experience" role="progressbar" aria-label="升级经验" aria-valuenow={xp} aria-valuemin={0} aria-valuemax={xpNeeded}><i style={{ width: `${Math.min(100, xp / xpNeeded * 100)}%` }}/><span>经验 {Math.floor(xp)} / {xpNeeded}</span></div>
    <div className="arena-frame survival-arena"><canvas ref={canvasRef} tabIndex={-1} onPointerDown={() => canvasRef.current?.focus({ preventScroll: true })} aria-label={`${character.name}的秘境生存战场，A D移动，W跳跃，J K手动攻击，L元素技能，I战技，H闪避`}/></div>
    <div className="survival-actionbar">
      <SurvivalControls compact/>
      <div className="survival-cooldowns"><Cooldown label={character.special.name} hotkey="L" remaining={snapshot?.skillCooldown ?? 0} maximum={snapshot?.skillCooldownMax ?? 1} description={character.desc}/><Cooldown label={character.secondary.name} hotkey="I" level={secondaryLevel} remaining={snapshot?.secondaryCooldown ?? 0} maximum={snapshot?.secondaryCooldownMax ?? character.secondaryCooldown} description={secondaryForm}/><Cooldown label="闪避" hotkey="H" remaining={snapshot?.dodgeCooldown ?? 0} maximum={snapshot?.dodgeCooldownMax ?? 1}/></div>
    </div>
    <div className="survival-bottomline"><span>{character.id === 'xiao' ? '魈：W 起跳 → L 枪尖向下戳刺。凌空路线返还跳跃，由你决定何时再起跳。' : '攻击方向随你的朝向。沿坡道穿行高地与谷地，利用浮台拉开距离。'}</span><span>10:00 存活通关 · 首领奖励额外计算</span></div>
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
          <div className="survival-summary-sigil">◇</div><span className="tiny-label">THE TIDES CAN WAIT</span><h2 id="survival-dialog-title">暂歇片刻</h2><p className="survival-dialog-intro">战场为你停留。准备好，就再度出发。</p>
          <div className="survival-pause-build"><span>{character.name} · Lv.{level}</span>{skillLoadout}<small>已生存 {formatTime(snapshot?.elapsed ?? 0)} · 击败 {snapshot?.kills ?? 0} 名敌人</small></div>
          <SurvivalControls/>
          {mobile.enabled && <button className="quiet-button mobile-pause-settings" onClick={openControlEditor}>触控布局</button>}
          <AudioSettings muted={muted} onMutedChange={onMutedChange} inline onResume={() => gameRef.current?.resume()}/>
          <button className="start-button" onClick={() => { unlockBattleAudio(); gameRef.current?.resume(); }}>继续挑战 <span>→</span></button><button className="overlay-back" onClick={onExit}>结束本局，返回大厅</button>
        </> : <>
          <div className="survival-result-portrait"><img src={CHARACTER_ART[character.id]} alt=""/></div><span className="tiny-label">{phase === 'victory' ? 'DOMAIN CONQUERED' : 'UNTIL THE NEXT DAWN'}</span><h2 id="survival-dialog-title">{phase === 'victory' ? '十分钟，破局而归' : '此行暂告一段落'}</h2><p className="survival-dialog-intro">{phase === 'victory' ? '风浪已息。你的元素之力，刻下了新的战绩。' : '记住这次选择，下次从新的招式中寻找答案。'}</p>
          <div className="survival-result-stats"><div><span>生存时间</span><strong>{formatTime(snapshot?.elapsed ?? 0)}</strong></div><div><span>击败敌人</span><strong>{snapshot?.kills ?? 0}</strong></div><div><span>最终等级</span><strong>{level}</strong></div><div><span>精英击败</span><strong>{snapshot?.eliteKills ?? 0}</strong></div></div>
          <div className="survival-result-route">{skillLoadout}<small>{snapshot?.bossKilled ? '✦ 已击败秘境首领' : '秘境首领未击败'} · 总伤害 {Math.round(snapshot?.damageDealt ?? 0).toLocaleString()}</small></div>
          <button className="start-button" onClick={() => { unlockBattleAudio(); lastSelectionAt.current = 0; gameRef.current?.rematch(); if (gameRef.current) pauseForMobileEnvironment(gameRef.current); if (gameRef.current) setSnapshot(gameRef.current.getSnapshot()); }}>再次挑战 <span>→</span></button><button className="overlay-back" onClick={onExit}>返回大厅，选择新的斗士</button>
        </>}
      </div>
    </div>}
  </main>;
}
