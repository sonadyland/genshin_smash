import { useEffect, useRef, useState } from 'react';
import { attackPhase } from '../game/animation';
import type { ClipCharacterId, ClipName, RequiredClipName } from '../game/clip-animation';
import { CHARACTER_CLIPS } from '../game/clip-animation';
import { advancePreviewClock, createPreviewClock, previewFrame } from '../game/animation-preview-state';
import type { PreviewSettings } from '../game/animation-preview-state';
import { acquireGameArt, drawFighterArt, getCharacterAnimationStatus, getTharjaCastOrigin, getCharacterCastOrigin } from '../game/art';
import { TharjaRuntime, drawTharjaEffects, isTharjaSpell } from '../game/tharja';
import type { FighterAnimation } from '../game/animation';
import { CHARACTERS } from '../game/data';
import './AnimationPreview.css';

const movementChoices: { id: ClipName; label: string }[] = [
  { id: 'idle', label: '待机' }, { id: 'run', label: '跑步' }, { id: 'jump', label: '跳跃与落地' }, { id: 'dodge', label: '闪避' },
];
const attackChoices = [['jab', 'J'], ['smash', 'K'], ['special', 'L'], ['secondary', 'I']] as const;
const usesStandingReference = (id: string) => id === 'zhongli' || id === 'furina' || id === 'tharja';
const choicesFor = (id: string) => {
  const character = CHARACTERS.find(character => character.id === id)!;
  return [...movementChoices, ...attackChoices.map(([kind, key]) => ({ id: kind, label: `${key} · ${character[kind].name}` })), ...(id === 'tharja' ? [{ id: 'hurt' as const, label: '受击与护书' }] : [])];
};

function drawDarkMagicPreview(context: CanvasRenderingContext2D, x: number, feetY: number, height: number, animation: FighterAnimation, facing: 1 | -1) {
  const attack = animation.attack;
  if (!attack || attack.t < attack.def.startup) return;
  const character = CHARACTERS.find(item => item.id === 'tharja')!, effect = character[attack.def.kind].effect;
  if (!isTharjaSpell(effect)) return;
  // Reconstruct from the paused simulation tick; drawing never advances gameplay.
  const runtime = new TharjaRuntime(), scale = height / 112;
  const origin = getTharjaCastOrigin(0, 0, 112, attack.def.kind, facing);
  if (!origin) return;
  const owner = { id: 0, x: 0, feetY: 0, facing, alive: true };
  const target = { id: 1, ownerId: 1, x: facing * 190, feetY: 0, width: 26, height: 90, alive: true };
  const environment = { owners: [owner], targets: [target], surfaceAt: () => 0 };
  runtime.cast(effect, owner, origin, environment);
  for (let tick = 0; tick < attack.t - attack.def.startup; tick++) runtime.step(environment);
  const palm = getCharacterCastOrigin('tharja', 0, 0, 112, animation, facing);
  if (palm) for (const spell of runtime.effects) if (spell.kind === 'nosferatu') { spell.originX = palm.x; spell.originY = palm.y; }
  context.save(); context.translate(x, feetY); context.scale(scale, scale); drawTharjaEffects(context, runtime.effects); context.restore();
}

/** Isolated review surface: it never changes gameplay balance or game state. */
export default function AnimationPreview({ initialCharacter = 'eula' }: { initialCharacter?: ClipCharacterId }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [characterId, setCharacterId] = useState<ClipCharacterId>(initialCharacter);
  const [clip, setClip] = useState<ClipName>(() => {
    const requested = new URLSearchParams(window.location.search).get('clip');
    return requested === 'hurt' && initialCharacter === 'tharja' ? 'hurt' : CHARACTER_CLIPS.includes(requested as RequiredClipName) ? requested as ClipName : 'run';
  });
  const [form, setForm] = useState<NonNullable<PreviewSettings['form']>>('new');
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(false);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [slope, setSlope] = useState(0);
  const [survival, setSurvival] = useState(false);
  const [displayHeight, setDisplayHeight] = useState<112 | 224>(224);
  const [status, setStatus] = useState('正在加载动作资源');
  const [variantKinds, setVariantKinds] = useState<string[]>([]);
  const [clock, setClock] = useState('');
  const step = useRef(0);
  const character = CHARACTERS.find(character => character.id === characterId)!;
  const choices = choicesFor(characterId);
  const playback = useRef<PreviewSettings & { displayHeight: number }>({ character: characterId, clip, form, survival, speed, paused, facing, slope, displayHeight });
  useEffect(() => { playback.current = { character: characterId, clip, form, survival, speed, paused, facing, slope, displayHeight }; }, [characterId, clip, form, survival, speed, paused, facing, slope, displayHeight]);
  useEffect(() => {
    let active = true;
    const art = acquireGameArt([characterId], { legacy: !usesStandingReference(characterId) });
    void art.ready.then(() => {
      if (!active) return;
      const loaded = getCharacterAnimationStatus(characterId);
      setVariantKinds(loaded.variantKinds);
      setStatus(loaded.status === 'ready' ? `新动作已就绪 · ${loaded.frames} 帧${loaded.variants ? ' · 普攻变化形态' : ' · 使用基础形态'}` : '新资源未就绪 · 当前使用旧动作回退');
    });
    return () => { active = false; art.release(); };
  }, [characterId]);
  useEffect(() => {
    const context = canvas.current?.getContext('2d');
    if (!context) return;
    let timeline = createPreviewClock(), currentClip = playback.current.clip, currentMode = playback.current.survival, currentCharacter = playback.current.character;
    let last = 0, raf = 0, lastLabel = '', labelAt = 0, active = true;
    const draw = (timestamp: number) => {
      if (!active) return;
      if (!last) last = timestamp;
      const settings = playback.current;
      if (settings.clip !== currentClip || settings.survival !== currentMode || settings.character !== currentCharacter) {
        timeline = createPreviewClock(); currentClip = settings.clip; currentMode = settings.survival; currentCharacter = settings.character;
      }
      advancePreviewClock(timeline, timestamp - last, settings, step.current); step.current = 0; last = timestamp;
      const { animation, t, cycle, y } = previewFrame(timeline, settings);
      const { facing, slope } = settings;
      const selectedCharacter = CHARACTERS.find(character => character.id === settings.character)!;
      context.clearRect(0, 0, 1200, 540);
      const background = context.createLinearGradient(0, 0, 0, 540); background.addColorStop(0, '#122b39'); background.addColorStop(1, '#234c51');
      context.fillStyle = background; context.fillRect(0, 0, 1200, 540);
      for (const [i, legacy] of [true, false].entries()) {
        const x = 300 + i * 600, feetY = 440;
        context.strokeStyle = '#829da1'; context.lineWidth = 2; context.beginPath(); context.moveTo(x - 270, feetY - 270 * slope); context.lineTo(x + 270, feetY + 270 * slope); context.stroke();
        context.strokeStyle = '#4b6a75'; context.lineWidth = 1; context.beginPath(); context.moveTo(x, 120); context.lineTo(x, 480); context.stroke();
        const standingReference = legacy && usesStandingReference(selectedCharacter.id);
        context.fillStyle = '#e9f6fa'; context.font = '600 24px system-ui'; context.textAlign = 'center'; context.fillText(legacy ? standingReference ? '批准站姿 · 同一人物尺寸' : '旧动作 · 4 个攻击姿势' : `${selectedCharacter.name} · 连续动作序列`, x, 48);
        context.fillStyle = '#b0cbd2'; context.font = '15px system-ui'; context.fillText(`${settings.displayHeight === 112 ? '游戏原尺寸 112px' : '放大至 224px'} · 相同物理时钟与攻击判定时刻`, x, 78);
        const comparedAnimation = standingReference ? { ...animation, state: 'free' as const, attack: null, onGround: true, vx: 0, vy: 0, dodgeTimer: 0, motion: undefined, time: 0 } : animation;
        drawFighterArt(context, selectedCharacter.id, x, feetY + (standingReference ? 0 : y), settings.displayHeight, comparedAnimation, { facing, legacy: legacy && !standingReference });
        if (!legacy && selectedCharacter.id === 'tharja') drawDarkMagicPreview(context, x, feetY + y, settings.displayHeight, animation, facing);
      }
      const alternateReady = animation.attack?.visualVariant === 'alternate' && getCharacterAnimationStatus(selectedCharacter.id).variantKinds.includes(settings.clip);
      const label = `${choicesFor(selectedCharacter.id).find(choice => choice.id === settings.clip)!.label} · 第 ${t} / ${cycle - 1} tick${animation.attack ? ` · ${alternateReady ? '变化形态' : '基础形态'} · ${animation.attack.plunge?.phase ?? attackPhase(animation.attack).phase}` : settings.character === 'xiao' && settings.clip === 'special' && !animation.onGround ? ' · 先跳跃' : ''}`;
      if (label !== lastLabel && (settings.paused || timestamp - labelAt >= 100 || t === 0)) { setClock(label); lastLabel = label; labelAt = timestamp; }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => { active = false; cancelAnimationFrame(raf); };
  }, []);
  return <main className="animation-preview">
    <header><div><p>动作审片台</p><h1>{character.name} · {character.title}</h1><span>{status}</span></div><a href={import.meta.env.BASE_URL}>返回游戏</a></header>
    <section className="animation-preview-controls" aria-label="动作预览设置">
      <label>角色<select value={characterId} onChange={event => {
        const id = event.target.value as ClipCharacterId; setCharacterId(id); if (clip === 'hurt' && id !== 'tharja') setClip('idle'); setStatus('正在加载动作资源'); setVariantKinds([]);
        const url = new URL(window.location.href); url.searchParams.set('animation', id); window.history.replaceState(null, '', url);
      }}>{CHARACTERS.map(character => <option key={character.id} value={character.id}>{character.name}</option>)}</select></label>
      <label>动作<select value={clip} onChange={event => setClip(event.target.value as ClipName)}>{choices.map(choice => <option key={choice.id} value={choice.id}>{choice.label}</option>)}</select></label>
      <label>攻击形态<select value={variantKinds.includes(clip) ? form : 'original'} disabled={!variantKinds.includes(clip)} onChange={event => setForm(event.target.value as NonNullable<PreviewSettings['form']>)}><option value="original">基础形态</option><option value="new">变化形态</option><option value="alternate">连续交替</option></select></label>
      <label>播放速度<select value={speed} onChange={event => setSpeed(Number(event.target.value))}><option value={1}>正常 1×</option><option value={0.5}>慢放 0.5×</option><option value={0.25}>慢放 0.25×</option></select></label>
      <label>朝向<select value={facing} onChange={event => setFacing(Number(event.target.value) as 1 | -1)}><option value={1}>向右</option><option value={-1}>向左</option></select></label>
      <label>地面<select value={slope} onChange={event => setSlope(Number(event.target.value))}><option value={0}>平地</option><option value={-0.24}>上坡</option><option value={0.24}>下坡</option></select></label>
      <label>动作时序<select value={survival ? 'survival' : 'pvp'} onChange={event => setSurvival(event.target.value === 'survival')}><option value="pvp">对战</option><option value="survival">幸存者</option></select></label>
      <label>人物尺寸<select value={displayHeight} onChange={event => setDisplayHeight(Number(event.target.value) as 112 | 224)}><option value={224}>放大 224px</option><option value={112}>游戏 112px</option></select></label>
      <button onClick={() => setPaused(value => !value)}>{paused ? '继续播放' : '暂停播放'}</button><button disabled={!paused} onClick={() => { step.current++; }}>前进 1 tick</button>
    </section>
    <canvas ref={canvas} width={1200} height={540} aria-label={`${character.name}${usesStandingReference(characterId) ? '站姿与连续动作' : '新旧动作'}并排预览`} />
    <p className="animation-preview-clock" aria-live="off">{clock}</p>
    <p>{characterId === 'tharja' ? '左侧是批准造型的持书待机，右侧展示正式游戏使用的 84 帧动作。J / K 从掌心发出远程咒弹，L 牵引回流，I 压掌铺设远端咒域；特效复用游戏渲染，示范目标不影响实际战斗。受击护书用于对战，幸存者受击仍不打断操作。' : usesStandingReference(characterId) ? '左侧以批准的持武器站姿作同尺寸对照，右侧展示游戏实际动作。轻击与重击使用不同蓄力和冲击节奏的突刺；技能使用已批准的施法动作。' : '左侧保留旧动作作对照。轻击与重击可选基础形态、变化形态或连续交替；技能使用符合其效果的固定动作。'}暂停时切换形态保留当前 tick。魈的 L 先跳跃，再展示悬停蓄势、枪尖朝下坠刺、落地和收招。伤害、范围、冷却与操作保持一致；坡面只做支撑点与轻微重心补偿。</p>
  </main>;
}
