import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, PointerEvent as ReactPointerEvent, RefObject } from 'react';
import type { BattleAction } from '../../game/input';
import type { VisualQuality } from '../../game/visual-quality';
import type { ControlMode } from '../../hooks/useMobileGame';
import { setControlMode } from '../../hooks/useMobileGame';
import './MobileControls.css';

type TouchGame = { setTouchAction: (action: BattleAction, source: string, down: boolean) => void; clearTouchInput: () => void; setVisualQuality: (quality: VisualQuality) => void };
type TouchSnapshot = { onGround?: boolean; canSpecial?: boolean; canSecondary?: boolean; canDodge?: boolean; skillCooldown?: number; skillCooldownMax?: number; secondaryCooldown?: number; secondaryCooldownMax?: number; dodgeCooldown?: number; dodgeCooldownMax?: number };
type Layout = { size: number; opacity: number; left: number; right: number; bottom: number; upJump: boolean; visualQuality: VisualQuality };
const DEFAULT_LAYOUT: Layout = { size: 60, opacity: .68, left: 2, right: 2, bottom: 5, upJump: true, visualQuality: 'standard' };
const LAYOUT_KEY = 'elemental-clash-touch-layout-v1';
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
function readLayout(): Layout {
  try {
    const saved = JSON.parse(localStorage.getItem(LAYOUT_KEY) || '{}');
    const number = (key: keyof Layout, min: number, max: number) => typeof saved[key] === 'number' && Number.isFinite(saved[key]) ? clamp(saved[key], min, max) : DEFAULT_LAYOUT[key] as number;
    return { size: number('size', 44, 76), opacity: number('opacity', .35, 1), left: number('left', 0, 15), right: number('right', 0, 15), bottom: number('bottom', 0, 24), upJump: typeof saved.upJump === 'boolean' ? saved.upJump : true, visualQuality: saved.visualQuality === 'low' ? 'low' : 'standard' };
  } catch { return { ...DEFAULT_LAYOUT }; }
}

export function ControlModeSetting({ mode }: { mode: ControlMode }) {
  return <label className="control-mode-setting">操作方式<select aria-label="操作方式" value={mode} onChange={event => setControlMode(event.target.value as ControlMode)}><option value="auto">自动识别</option><option value="touch">触屏按键</option><option value="keyboard">键盘</option></select></label>;
}

export function RotateDeviceGuide({ onExit }: { onExit: () => void }) {
  return <div className="rotate-device-guide" role="dialog" aria-modal="true" aria-label="请横持设备"><div className="rotate-device-icon" aria-hidden="true">↻</div><h2>请横持设备</h2><p>横屏展开战场，双手释放元素之力。<br/>当前战斗已暂停，横持后点击继续。</p><button className="quiet-button" onClick={onExit}>返回大厅</button></div>;
}

function TouchButton({ action, sourceName, label, glyph, hint, description, cooldown = 0, maximum = 1, unavailable = false, gameRef, editable, className = '' }: { action: BattleAction; sourceName: string; label: string; glyph: string; hint?: string; description?: string; cooldown?: number; maximum?: number; unavailable?: boolean; gameRef: RefObject<TouchGame | null>; editable: boolean; className?: string }) {
  const pointers = useRef(new Set<number>());
  const [held, setHeld] = useState(false);
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!pointers.current.delete(event.pointerId)) return;
    gameRef.current?.setTouchAction(action, `touch:${sourceName}:${event.pointerId}`, false);
    setHeld(pointers.current.size > 0);
  };
  useEffect(() => {
    const active = pointers.current;
    const game = gameRef.current;
    return () => {
      for (const pointer of active) game?.setTouchAction(action, `touch:${sourceName}:${pointer}`, false);
      active.clear();
    };
  }, [gameRef, action, sourceName]);
  const ratio = clamp(cooldown / Math.max(.01, maximum), 0, 1);
  return <button type="button" className={`touch-key ${className} ${held ? 'held' : ''} ${unavailable ? 'unavailable' : ''}`} aria-label={`触屏${label}${description ? `，${description}` : ''}${hint ? `，${hint}` : ''}`} aria-disabled={unavailable || editable} data-action={action} style={{ '--cooldown': `${ratio * 360}deg` } as CSSProperties}
    onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      event.preventDefault();
      // Snapshot flags are visual hints; the engine validates the action now.
      // In particular, jump + Xiao's plunge may happen before the next HUD poll.
      if (editable || (event.pointerType === 'mouse' && event.button !== 0)) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pointers.current.add(event.pointerId);
      setHeld(true);
      gameRef.current?.setTouchAction(action, `touch:${sourceName}:${event.pointerId}`, true);
    }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
    <span className="touch-glyph" aria-hidden="true">{glyph}</span><span className="touch-label">{label === '元素技能' ? '元素' : label}</span>{cooldown > 0 ? <span className="touch-cooldown">{cooldown < 1 ? cooldown.toFixed(1) : Math.ceil(cooldown)}</span> : hint && <span className="touch-hint">{hint}</span>}
  </button>;
}

function DirectionPad({ gameRef, editable, upJump }: { gameRef: RefObject<TouchGame | null>; editable: boolean; upJump: boolean }) {
  const fingers = useRef(new Map<number, { action: BattleAction | null; beganOnJump: boolean }>());
  const [held, setHeld] = useState<BattleAction[]>([]);
  const syncHeld = () => setHeld(Array.from(fingers.current.values()).flatMap(finger => finger.action ? [finger.action] : []));
  const release = (event: ReactPointerEvent<HTMLDivElement>) => {
    const finger = fingers.current.get(event.pointerId);
    if (!finger) return;
    if (finger.action) gameRef.current?.setTouchAction(finger.action, `touch:direction:${event.pointerId}`, false);
    fingers.current.delete(event.pointerId);
    syncHeld();
  };
  useEffect(() => {
    const active = fingers.current;
    const game = gameRef.current;
    return () => {
      for (const [id, finger] of active) if (finger.action) game?.setTouchAction(finger.action, `touch:direction:${id}`, false);
      active.clear();
    };
  }, [gameRef]);
  const directionAt = (target: Element | null): BattleAction | null => {
    const value = target?.closest<HTMLElement>('[data-direction]')?.dataset.direction;
    return value === 'left' || value === 'right' || value === 'down' || (value === 'jump' && upJump) ? value : null;
  };
  const key = (action: BattleAction, label: string, glyph: string, position: string) => <button type="button" className={`touch-key direction-${position} ${held.includes(action) ? 'held' : ''}`} data-direction={action} data-action={action} aria-label={`触屏${label}`} aria-disabled={editable}><span className="touch-glyph" aria-hidden="true">{glyph}</span><span className="touch-label">{label}</span></button>;
  return <div className="touch-dpad" aria-label="触屏方向键" onContextMenu={event => event.preventDefault()}
    onPointerDown={event => {
      event.preventDefault();
      if (editable || (event.pointerType === 'mouse' && event.button !== 0)) return;
      const action = directionAt(event.target as Element);
      if (!action) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      fingers.current.set(event.pointerId, { action, beganOnJump: action === 'jump' });
      gameRef.current?.setTouchAction(action, `touch:direction:${event.pointerId}`, true);
      syncHeld();
    }} onPointerMove={event => {
      const finger = fingers.current.get(event.pointerId);
      if (!finger) return;
      const target = document.elementFromPoint(event.clientX, event.clientY);
      let next = target && event.currentTarget.contains(target) ? directionAt(target) : null;
      // Jump is a deliberate initial press. Sliding across the top never triggers it.
      if (next === 'jump' && (!finger.beganOnJump || finger.action !== 'jump')) next = null;
      if (next === finger.action) return;
      if (finger.action) gameRef.current?.setTouchAction(finger.action, `touch:direction:${event.pointerId}`, false);
      finger.action = next;
      if (next) gameRef.current?.setTouchAction(next, `touch:direction:${event.pointerId}`, true);
      syncHeld();
    }} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release}>
    {upJump && key('jump', '上跳', '▲', 'up')}{key('left', '向左', '◀', 'left')}<span className="dpad-center" aria-hidden="true">✦</span>{key('right', '向右', '▶', 'right')}{key('down', '下落', '▼', 'down')}
  </div>;
}

export default function MobileControls({ gameRef, snapshot, character, active, editing, onCloseEditor }: { gameRef: RefObject<TouchGame | null>; snapshot: TouchSnapshot | null; character: { id: string; special: { name: string }; secondary: { name: string } }; active: boolean; editing: boolean; onCloseEditor: () => void }) {
  const [layout, setLayout] = useState(readLayout);
  const editorRef = useRef<HTMLElement>(null);
  useEffect(() => { try { localStorage.setItem(LAYOUT_KEY, JSON.stringify(layout)); } catch { /* Session preferences remain usable. */ } }, [layout]);
  useEffect(() => { gameRef.current?.setVisualQuality(layout.visualQuality); }, [gameRef, layout.visualQuality, active, editing]);
  useEffect(() => {
    const game = gameRef.current;
    if (!active || editing) game?.clearTouchInput();
    return () => game?.clearTouchInput();
  }, [active, editing, gameRef]);
  useEffect(() => {
    if (!editing) return;
    const editor = editorRef.current;
    if (!editor) return;
    if (!editor.contains(document.activeElement)) editor.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); onCloseEditor(); return; }
      if (event.key !== 'Tab') return;
      const fields = Array.from(editor.querySelectorAll<HTMLElement>('button,input,select'));
      const index = fields.indexOf(document.activeElement as HTMLElement);
      event.preventDefault();
      fields[(index + (event.shiftKey ? -1 : 1) + fields.length) % fields.length]?.focus();
    };
    document.addEventListener('keydown', keyboard, true);
    return () => document.removeEventListener('keydown', keyboard, true);
  }, [editing, onCloseEditor]);
  if (!active && !editing) return null;
  const xiaoGrounded = character.id === 'xiao' && snapshot?.onGround !== false;
  const style = { '--touch-size': `${layout.size}px`, '--touch-opacity': layout.opacity, '--touch-left': `${layout.left}vw`, '--touch-right': `${layout.right}vw`, '--touch-bottom': `${layout.bottom}dvh` } as CSSProperties;
  const shared = { gameRef, editable: editing };
  const slider = (key: 'size' | 'opacity' | 'left' | 'right' | 'bottom', label: string, min: number, max: number, step = 1, unit = '') => <label>{label}<input aria-label={label} type="range" min={min} max={max} step={step} value={layout[key]} onChange={event => setLayout(value => ({ ...value, [key]: Number(event.target.value) }))}/><output>{key === 'opacity' ? `${Math.round(layout[key] * 100)}%` : `${layout[key]}${unit}`}</output></label>;
  return <div className={`mobile-control-layer ${editing ? 'is-editing' : ''}`} style={style} data-mobile-controls>
    <DirectionPad gameRef={gameRef} editable={editing} upJump={layout.upJump}/>
    <div className="touch-actions" aria-label="触屏战斗按键">
      <TouchButton {...shared} action="special" sourceName="special" label={character.id === 'zhongli' ? '地心' : character.id === 'furina' ? '沙龙' : '元素技能'} glyph="✦" description={character.special.name} hint={xiaoGrounded ? '空中' : undefined} cooldown={snapshot?.skillCooldown} maximum={snapshot?.skillCooldownMax} unavailable={!editing && (xiaoGrounded || snapshot?.canSpecial === false)}/>
      <TouchButton {...shared} action="secondary" sourceName="secondary" label={character.id === 'zhongli' ? '天星' : character.id === 'furina' ? '开幕' : '战技'} glyph="✧" description={character.secondary.name} cooldown={snapshot?.secondaryCooldown} maximum={snapshot?.secondaryCooldownMax} unavailable={!editing && snapshot?.canSecondary === false}/>
      <TouchButton {...shared} action="dodge" sourceName="dodge" label="闪避" glyph="»" cooldown={snapshot?.dodgeCooldown} maximum={snapshot?.dodgeCooldownMax} unavailable={!editing && snapshot?.canDodge === false}/>
      <TouchButton {...shared} className="touch-attack" action="jab" sourceName="jab" label="普攻" glyph="⚔"/>
      <TouchButton {...shared} action="smash" sourceName="smash" label="重击" glyph="◆"/>
      <TouchButton {...shared} action="jump" sourceName="jump" label="跳跃" glyph="↑"/>
    </div>
    {editing && <section ref={editorRef} className="touch-layout-editor" role="dialog" aria-modal="true" aria-label="触控布局设置" data-mobile-editor><header><div><strong>触控布局</strong><small>战斗已暂停 · 按键覆盖画面两侧</small></div><button onClick={onCloseEditor} aria-label="完成触控布局设置">完成</button></header><div className="touch-layout-fields">{slider('size', '按键大小', 44, 76, 2, 'px')}{slider('opacity', '按键透明度', .35, 1, .05)}{slider('left', '方向键内移', 0, 15, 1, '%')}{slider('right', '攻击键内移', 0, 15, 1, '%')}{slider('bottom', '底部距离', 0, 24, 1, '%')}<label className="touch-up-setting"><input type="checkbox" checked={layout.upJump} onChange={event => setLayout(value => ({ ...value, upJump: event.target.checked }))}/>十字键上键跳跃</label><label className="touch-quality-setting">画面特效<select aria-label="画面特效" value={layout.visualQuality} onChange={event => setLayout(value => ({ ...value, visualQuality: event.target.value as VisualQuality }))}><option value="standard">标准特效</option><option value="low">轻量特效</option></select></label></div><button className="touch-reset" onClick={() => setLayout({ ...DEFAULT_LAYOUT })}>恢复默认布局</button></section>}
  </div>;
}
