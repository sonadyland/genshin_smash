import { drawArenaBackground, drawFighterArt, drawElementEffect, drawXiaoPlungeEffect, drawSecondaryEffect, hasRegisteredMeleeTrail, drawSwordCastRelease } from './art';
import { projectileVisualPosition } from './cast-visual';
import type { SurvivalGame, SurvivalEnemy, SurvivalField } from './survival-engine';
import { effectGlow } from './visual-quality';
import type { VisualQuality } from './visual-quality';
import { drawSummonArt } from './summoner-art';
import { drawTharjaEffects } from './tharja';
import { drawCorrinWaterEffect } from './art';
import { EXPEDITION_REGIONS, EXPEDITION_MAPS } from './survival-data';
import type { TacticalMapDefinition } from './survival-data';

const W = 1280, H = 720;
const visible = (game: SurvivalGame, x: number, padding = 140) => x > game.camera.x - padding && x < game.camera.x + W + padding;
const supportBelow = (game: SurvivalGame, x: number, y: number) => Math.min(game.groundHeightAt(x), ...game.world.platforms.filter(p => x >= p.x && x <= p.x + p.w && y <= p.y + 2).map(p => p.y));

/** Paints only simulation-owned time so paused/upgrade frames remain perfectly still. */
export function renderSurvival(game: SurvivalGame) {
  const c = game.context, camera = game.camera;
  c.clearRect(0, 0, W, H);
  c.fillStyle = '#183b46'; c.fillRect(0, 0, W, H);
  c.save(); c.translate(-camera.x * 0.022, -camera.y * 0.018);
  drawArenaBackground(c, W + 105, H + 35); c.restore();
  const atmosphere = c.createLinearGradient(0, 0, 0, H);
  atmosphere.addColorStop(0, 'rgba(10,27,38,.20)'); atmosphere.addColorStop(0.65, 'rgba(20,48,46,.02)'); atmosphere.addColorStop(1, 'rgba(8,27,33,.55)');
  c.fillStyle = atmosphere; c.fillRect(0, 0, W, H);
  c.save(); c.translate(-camera.x, -camera.y);
  scenery(game);
  for (const map of game.getMapCapabilities()) drawTacticalLandmarks(game, map);
  drawTacticalHazards(game);
  if (game.variant === 'expedition') drawExpeditionLinks(game);
  drawSummons(game);
  for (const field of game.fields) if (visible(game, field.x, field.radius)) drawField(c, field, game.visualQuality);
  for (const orb of game.orbs) if (visible(game, orb.x)) {
    const bob = Math.sin(game.frame * 0.06 + orb.x) * 2;
    c.save(); c.translate(orb.x, orb.y + bob);
    c.shadowColor = orb.heal ? '#a8f4be' : '#71deed'; c.shadowBlur = effectGlow(game.visualQuality, 12);
    c.fillStyle = orb.heal ? '#b8f5af' : orb.value > 12 ? '#d5b3ff' : '#83eff1';
    if (orb.heal) { c.fillRect(-3, -8, 6, 16); c.fillRect(-8, -3, 16, 6); }
    else {
      const size = Math.min(10, 5 + Math.log2(orb.value + 1));
      c.beginPath(); c.moveTo(0, -size); c.lineTo(size * 0.65, 0); c.lineTo(0, size); c.lineTo(-size * 0.65, 0); c.closePath(); c.fill();
      c.shadowBlur = 0; c.strokeStyle = '#e9fffb'; c.lineWidth = 1; c.stroke();
    }
    c.restore();
  }
  for (const enemy of game.enemies) if (visible(game, enemy.x)) drawEnemy(game, enemy, game.frame);
  drawTharjaEffects(c, game.tharja.effects);
  for (const effect of game.corrinWater.effects) {
    const beam = effect.kind === 'water-beam', width = beam ? Math.abs(effect.originX - effect.x) : effect.radius * 2;
    if (visible(game, effect.x, width)) drawCorrinWaterEffect(c, effect.kind, effect.x, effect.y, width, effect.radius * 2, effect.age, effect.facing);
  }
  for (const shot of game.shots) if (visible(game, shot.x)) {
    const visual = projectileVisualPosition(shot);
    c.save(); c.translate(visual.x, visual.y);
    if (shot.secondary) { c.scale(shot.vx < 0 ? -1 : 1, 1); c.rotate(Math.atan2(shot.vy, Math.abs(shot.vx))); }
    else c.rotate(Math.atan2(shot.vy, shot.vx));
    c.shadowColor = shot.color; c.shadowBlur = effectGlow(game.visualQuality, 15);
    if (shot.secondary) {
      // The surrounding transform follows shot direction, while the source art faces right.
      const id = shot.kind === 'wind' ? 'xiao' : 'diluc';
      if (shot.kind === 'frost') {
        c.fillStyle = '#bcefff'; c.strokeStyle = '#f1fcff'; c.lineWidth = 1.5;
        c.beginPath(); c.moveTo(shot.radius * 1.5, 0); c.lineTo(-shot.radius * 0.5, -shot.radius * 0.42); c.lineTo(-shot.radius, 0); c.lineTo(-shot.radius * 0.5, shot.radius * 0.42); c.closePath(); c.fill(); c.stroke();
      } else if (!drawSecondaryEffect(c, id, 0, 0, shot.radius * 3.8, shot.radius * 2.2, { alpha: Math.min(1, (shot.life - shot.age) / 10) })) {
        c.fillStyle = shot.color; c.beginPath(); c.moveTo(shot.radius, 0); c.lineTo(-shot.radius, -shot.radius * 0.5); c.lineTo(-shot.radius * 0.5, 0); c.lineTo(-shot.radius, shot.radius * 0.5); c.closePath(); c.fill();
      }
    } else if (shot.owner === 'player' && shot.kind === 'blade') {
      if (!drawElementEffect(c, game.char.id, false, 0, 0, shot.radius * 2.9, shot.radius * 2.45, 0.94, Math.PI / 2)) {
        c.strokeStyle = shot.color; c.lineWidth = 7; c.beginPath(); c.arc(-12, 0, 40, -1.2, 1.2); c.stroke();
      }
    } else {
      c.fillStyle = shot.color; c.beginPath(); c.ellipse(0, 0, shot.radius, shot.radius * 0.6, 0, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#fff4d9'; c.beginPath(); c.arc(3, 0, shot.radius * 0.38, 0, Math.PI * 2); c.fill();
      c.globalAlpha = 0.35; c.fillStyle = shot.color; c.beginPath(); c.moveTo(-5, -9); c.lineTo(-38, 0); c.lineTo(-5, 9); c.fill();
    }
    c.restore();
  }
  for (const effect of game.effects) if (visible(game, effect.x, effect.size)) {
    if (effect.kind === 'slash' && effect.melee && hasRegisteredMeleeTrail(game.char.id, effect.melee.kind, effect.melee.variant)) continue;
    const t = effect.age / effect.life;
    c.save(); c.globalAlpha = 1 - t;
    if (effect.kind === 'chain') {
      c.strokeStyle = effect.color; c.lineWidth = 3; c.shadowColor = effect.color; c.shadowBlur = effectGlow(game.visualQuality, 10);
      c.beginPath(); c.moveTo(effect.x, effect.y);
      for (let i = 1; i <= 5; i++) c.lineTo(effect.x + ((effect.x2 ?? effect.x) - effect.x) * i / 6 + (i % 2 ? 7 : -7), effect.y + ((effect.y2 ?? effect.y) - effect.y) * i / 6);
      c.lineTo(effect.x2 ?? effect.x, effect.y2 ?? effect.y); c.stroke();
    } else if (effect.kind === 'secondary') {
      drawSecondaryEffect(c, game.char.id, effect.x, effect.y, effect.size, effect.size * 0.42, { facing: effect.facing ?? 1, alpha: 1 - t });
    } else if (effect.kind === 'plunge') drawXiaoPlungeEffect(c, 'impact', effect.x, effect.y, effect.size * (0.7 + t * 0.3), effect.size * 0.38, 0.75);
    else if (effect.kind === 'ring') {
      c.strokeStyle = effect.color; c.lineWidth = 4 * (1 - t) + 1; c.beginPath(); c.ellipse(effect.x, effect.y, effect.size * (0.22 + t * 0.35), effect.size * (0.12 + t * 0.18), 0, 0, Math.PI * 2); c.stroke();
    } else drawElementEffect(c, game.char.id, effect.kind === 'impact', effect.x, effect.y, effect.size, effect.size * 0.65, 0.88);
    c.restore();
  }
  const p = game.player;
  const shield = game.summons.getShield(0);
  if (shield) {
    c.save(); c.globalAlpha = Math.min(0.75, shield.life / 30); c.strokeStyle = '#f4d080'; c.fillStyle = '#e3b45318'; c.lineWidth = 2.5;
    c.shadowColor = '#dfb757'; c.shadowBlur = effectGlow(game.visualQuality, 12);
    c.beginPath(); c.ellipse(p.x, p.y - 52, 40, 66, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.globalAlpha *= 0.6; c.beginPath(); c.moveTo(p.x - 24, p.y - 87); c.lineTo(p.x, p.y - 108); c.lineTo(p.x + 24, p.y - 87); c.stroke(); c.restore();
  }
  if (game.summons.getBuff(0)) {
    c.save(); c.strokeStyle = '#9bdfff'; c.globalAlpha = .55; c.lineWidth = 2;
    c.beginPath(); c.ellipse(p.x, p.y - 2, 44, 12, 0, 0, Math.PI * 2); c.stroke(); c.restore();
  }
  if (p.attack?.plunge?.phase === 'dive') drawXiaoPlungeEffect(c, 'descent', p.x, p.y - 90, 150, 230, 0.58);
  c.save();
  const shadowY = supportBelow(game, p.x, p.y);
  c.fillStyle = `rgba(9,25,31,${Math.max(0.06, 0.23 - (shadowY - p.y) / 1600)})`; c.beginPath(); c.ellipse(p.x, shadowY + 3, 35, 8, 0, 0, Math.PI * 2); c.fill();
  if (p.dodge > 0) {
    c.globalAlpha = 0.2;
    drawFighterArt(c, game.char.id, p.x - p.facing * 35, p.y, 112, { ...game.playerAnimation(), state: 'free', attack: null }, { facing: p.facing });
  }
  const hurtFlash = game.hitstop > 0;
  c.globalAlpha = !hurtFlash && p.invuln > 0 && Math.floor(game.frame / 4) % 2 ? 0.58 : 1;
  const rendered = drawFighterArt(c, game.char.id, p.x, p.y, 112, game.playerAnimation(), { facing: p.facing, flash: hurtFlash });
  if (!rendered) {
    c.fillStyle = hurtFlash ? '#fff7ef' : game.char.color; c.fillRect(p.x - 16, p.y - 80, 32, 68); c.beginPath(); c.arc(p.x, p.y - 91, 13, 0, Math.PI * 2); c.fill();
    if (game.char.id === 'xiao') {
      c.strokeStyle = '#ddffe7'; c.lineWidth = 4; c.beginPath();
      if (p.attack?.plunge) { c.moveTo(p.x + 17, p.y - 130); c.lineTo(p.x + 17, p.y + 17); c.stroke(); c.fillStyle = '#75f1ba'; c.beginPath(); c.moveTo(p.x + 8, p.y + 7); c.lineTo(p.x + 26, p.y + 7); c.lineTo(p.x + 17, p.y + 32); c.fill(); }
      else { c.moveTo(p.x, p.y - 48); c.lineTo(p.x + p.facing * 72, p.y - 51); c.stroke(); }
    }
  }
  c.restore();
  // A small position marker remains readable in dense elemental effects.
  drawSwordCastRelease(c, game.char.id, p.x, p.y, 112, game.playerAnimation(), p.facing);
  c.fillStyle = '#e6edbd'; c.beginPath(); c.moveTo(p.x, p.y - 131); c.lineTo(p.x - 5, p.y - 139); c.lineTo(p.x + 5, p.y - 139); c.fill();
  for (const text of game.texts) if (visible(game, text.x)) {
    c.save(); c.globalAlpha = Math.min(1, (48 - text.age) / 17); c.font = `${text.big ? '700 22' : '600 16'}px system-ui`; c.textAlign = 'center'; c.lineWidth = 3; c.strokeStyle = '#20303c'; c.fillStyle = text.color;
    c.strokeText(text.text, text.x, text.y - text.age * 0.7); c.fillText(text.text, text.x, text.y - text.age * 0.7); c.restore();
  }
  c.restore();
  drawNavigation(game);
  if (game.notice) {
    c.save(); c.font = '500 15px system-ui'; c.textAlign = 'center';
    const width = c.measureText(game.notice).width + 48;
    c.fillStyle = 'rgba(13,36,43,.84)'; c.beginPath(); c.roundRect((W - width) / 2, 24, width, 37, 18); c.fill();
    c.strokeStyle = 'rgba(219,204,155,.35)'; c.stroke(); c.fillStyle = '#f3e8bd'; c.fillText(game.notice, W / 2, 48); c.restore();
  }
}

function drawSummons(game: SurvivalGame) {
  const c = game.context, p = game.player;
  const attack = p.attack;
  if (game.char.id === 'zhongli' && attack?.def.kind === 'secondary' && attack.t < attack.def.startup && attack.t > attack.def.startup * .42) {
    const progress = (attack.t / attack.def.startup - .42) / .58;
    const x = p.x + p.facing * 145;
    const floor = Math.min(game.groundHeightAt(x), ...game.world.platforms.filter(platform => x >= platform.x && x <= platform.x + platform.w && platform.y >= p.y - 12).map(platform => platform.y));
    if (visible(game, x, 180)) drawSummonArt(c, 'geo-meteor', x - p.facing * (1 - progress) * 90, floor - (1 - progress) * 360, 190, { age: attack.t, facing: p.facing, alpha: Math.min(1, progress * 4) });
  }
  for (const entity of game.summons.entities) if (visible(game, entity.x, entity.height)) {
    const alpha = Math.min(1, entity.life / 35, entity.age / 9);
    const rise = entity.kind === 'geo-pillar' ? Math.min(1, entity.age / 10) : 1;
    const floating = entity.kind === 'usher' || entity.kind === 'chevalmarin';
    const feet = entity.feetY - (floating ? 22 + Math.sin(entity.age * .065) * 4 : 0);
    if (!drawSummonArt(c, entity.kind, entity.x, feet, entity.height * rise, { age: entity.age, attackProgress: entity.attackProgress, facing: entity.facing, alpha })) {
      c.save(); c.globalAlpha = alpha; c.fillStyle = entity.kind === 'geo-pillar' ? '#af8651' : '#83d3f5'; c.strokeStyle = '#e6f5ff'; c.lineWidth = 2;
      if (entity.kind === 'geo-pillar') { c.fillRect(entity.x - 18, feet - entity.height * rise, 36, entity.height * rise); c.strokeRect(entity.x - 18, feet - entity.height * rise, 36, entity.height * rise); }
      else { c.beginPath(); c.ellipse(entity.x, feet - 25, 24, 26, 0, 0, Math.PI * 2); c.fill(); c.stroke(); }
      c.restore();
    }
  }
  for (const effect of game.summons.effects) if (visible(game, effect.x, effect.radius * 2)) {
    const t = effect.age / effect.maxLife;
    const geo = effect.kind.startsWith('geo-');
    c.save(); c.globalAlpha = Math.min(1, effect.life / 12); c.strokeStyle = geo ? '#f0c573' : '#92e2ff'; c.fillStyle = geo ? '#d9a25038' : '#80d9ff24';
    c.lineWidth = 3; c.shadowColor = geo ? '#e3b45f' : '#65c7ff'; c.shadowBlur = effectGlow(game.visualQuality, 12);
    if (effect.kind === 'geo-meteor') {
      if (t < .28) drawSummonArt(c, 'geo-meteor', effect.x, effect.feetY, 190 * (1 - t), { age: effect.age, alpha: 1 - t * 3 });
      c.beginPath(); c.ellipse(effect.x, effect.feetY - 5, effect.radius * (.45 + t * .55), 18 + t * 24, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      for (let i = 0; i < 7; i++) { const angle = i * Math.PI * 2 / 7; const x = effect.x + Math.cos(angle) * effect.radius * (.2 + t * .55); c.fillRect(x - 4, effect.feetY - Math.sin(t * Math.PI) * (32 + i % 3 * 18), 9, 12); }
    } else if (effect.kind === 'bubble') {
      c.beginPath(); c.arc(effect.x, effect.feetY, effect.radius, 0, Math.PI * 2); c.fill(); c.stroke(); c.fillStyle = '#f0fcff'; c.beginPath(); c.arc(effect.x - 5, effect.feetY - 5, 4, 0, Math.PI * 2); c.fill();
    } else if (effect.kind === 'water-pierce') {
      c.lineWidth = 6; c.beginPath(); c.moveTo(effect.x - effect.vx * 3, effect.feetY - effect.vy * 3); c.lineTo(effect.x, effect.feetY); c.stroke(); c.strokeStyle = '#effcff'; c.lineWidth = 2; c.stroke();
    } else {
      c.beginPath(); c.ellipse(effect.x, effect.feetY - 8, effect.radius * (.5 + t * .5), effect.kind === 'hydro-wave' ? effect.height * .4 * (1 - t * .35) : 16 + t * 18, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      if (effect.kind === 'crab-splash') for (let i = 0; i < 6; i++) { const dx = (i - 2.5) * effect.radius / 3; c.beginPath(); c.arc(effect.x + dx * t, effect.feetY - Math.sin(t * Math.PI) * (35 + (i % 2) * 20), 4 * (1 - t) + 1, 0, Math.PI * 2); c.fill(); }
    }
    c.restore();
  }
}

function scenery(game: SurvivalGame) {
  const c = game.context;
  const earth = c.createLinearGradient(0, 745, 0, game.world.height);
  earth.addColorStop(0, '#627c69'); earth.addColorStop(0.05, '#344c48'); earth.addColorStop(0.35, '#243b3e'); earth.addColorStop(1, '#142b32');
  const traceGround = () => { c.beginPath(); for (const [i, point] of game.world.terrain.entries()) { if (!i) c.moveTo(point.x, point.y); else c.lineTo(point.x, point.y); } };
  traceGround(); c.lineTo(game.world.width, game.world.height); c.lineTo(0, game.world.height); c.closePath(); c.fillStyle = earth; c.fill();
  traceGround(); c.strokeStyle = '#adbea0'; c.lineWidth = 5; c.stroke();
  traceGround(); c.strokeStyle = '#e0e4b8'; c.lineWidth = 1; c.stroke();
  for (let x = Math.floor(game.camera.x / 120) * 120; x < game.camera.x + W + 120; x += 120) {
    const ground = game.groundHeightAt(x);
    c.strokeStyle = 'rgba(174,184,144,.16)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, ground + 9); c.lineTo(x + 18, ground + 27); c.lineTo(x + 108, ground + 27); c.stroke();
    const grassY = game.groundHeightAt(x + 33);
    c.strokeStyle = '#708e72'; c.beginPath(); c.moveTo(x + 33, grassY); c.lineTo(x + 28, grassY - 13); c.moveTo(x + 34, grassY); c.lineTo(x + 40, grassY - 9); c.stroke();
    if (x % 360 === 0) {
      const rockY = game.groundHeightAt(x + 75);
      c.fillStyle = '#96a990'; c.beginPath(); c.moveTo(x + 60, game.groundHeightAt(x + 60)); c.lineTo(x + 68, rockY - 12); c.lineTo(x + 82, rockY - 10); c.lineTo(x + 91, game.groundHeightAt(x + 91)); c.fill();
    }
  }
  for (const platform of game.world.platforms) if (platform.x + platform.w > game.camera.x - 30 && platform.x < game.camera.x + W + 30) {
    const { x, y, w } = platform;
    c.fillStyle = 'rgba(11,35,42,.18)'; c.beginPath(); c.ellipse(x + w / 2, game.groundHeightAt(x + w / 2) + 6, w / 2, 10, 0, 0, Math.PI * 2); c.fill();
    const stone = c.createLinearGradient(0, y, 0, y + 38); stone.addColorStop(0, '#acb69b'); stone.addColorStop(0.17, '#6d897b'); stone.addColorStop(1, '#34534f');
    c.fillStyle = stone; c.beginPath(); c.moveTo(x, y); c.lineTo(x + w, y); c.lineTo(x + w - 20, y + 30); c.lineTo(x + w * 0.63, y + 38); c.lineTo(x + 23, y + 28); c.closePath(); c.fill();
    c.fillStyle = '#d3d9b2'; c.fillRect(x, y, w, 3);
    c.strokeStyle = '#b9cda3'; c.lineWidth = 1; c.beginPath(); c.moveTo(x + 12, y + 8); c.lineTo(x + w - 12, y + 8); c.stroke();
    for (let tx = x + 35; tx < x + w - 20; tx += 78) {
      c.strokeStyle = 'rgba(24,61,58,.35)'; c.beginPath(); c.moveTo(tx, y + 10); c.lineTo(tx + 8, y + 25); c.stroke();
    }
    c.strokeStyle = '#5d9b7c'; c.lineWidth = 3;
    for (const offset of [22, w - 36]) { c.beginPath(); c.moveTo(x + offset, y + 15); c.quadraticCurveTo(x + offset - 12, y + 47, x + offset + 2, y + 57); c.stroke(); }
  }
  // Visible world boundaries turn the lane around without lethal edge drops.
  for (const x of [18, game.world.width - 18]) if (visible(game, x)) {
    const ground = game.groundHeightAt(x);
    c.fillStyle = '#45615f'; c.fillRect(x - 13, ground - 110, 26, 110); c.fillStyle = '#c7cea7'; c.fillRect(x - 20, ground - 113, 40, 9);
    c.fillStyle = '#9fe1cd'; c.shadowColor = '#7ffad5'; c.shadowBlur = effectGlow(game.visualQuality, 12); c.fillRect(x - 4, ground - 96, 8, 38); c.shadowBlur = 0;
  }
}

function drawTacticalLandmarks(game: SurvivalGame, map: TacticalMapDefinition) {
  const c = game.context, wind = map.wind;
  c.save();
  if (wind && visible(game, wind.x)) {
    const glow = c.createLinearGradient(wind.x - wind.width / 2, 0, wind.x + wind.width / 2, 0);
    glow.addColorStop(0, '#88f4dc00'); glow.addColorStop(.5, '#a3f2dc25'); glow.addColorStop(1, '#88f4dc00');
    c.fillStyle = glow; c.fillRect(wind.x - wind.width / 2, wind.top - 60, wind.width, wind.bottom - wind.top + 60);
    c.strokeStyle = '#98e9d18c'; c.lineWidth = 1.5;
    for (let i = 0; i < 9; i++) {
      const y = wind.bottom - ((game.frame * 2.5 + i * 58) % (wind.bottom - wind.top));
      const spread = 30 + Math.sin(game.frame * .025 + i) * 12;
      c.beginPath(); c.moveTo(wind.x - spread, y + 14); c.quadraticCurveTo(wind.x, y - 4, wind.x + spread, y + 14); c.stroke();
    }
    c.fillStyle = '#466c64'; c.strokeStyle = '#cae3b7'; c.lineWidth = 3;
    c.beginPath(); c.ellipse(wind.x, wind.bottom, 64, 13, 0, 0, Math.PI * 2); c.fill(); c.stroke();
    c.strokeStyle = '#a2f1d8'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(wind.x, wind.bottom - 3, 38, 7, 0, 0, Math.PI * 2); c.stroke();
    c.textAlign = 'center'; c.font = '600 13px system-ui'; c.fillStyle = '#cef6dd';
    c.fillText('公共风井 ↑', wind.x, wind.bottom + 25);
    c.font = '11px system-ui'; c.fillStyle = '#a6cabc'; c.fillText('左右离开 · S 下行', wind.x, wind.bottom + 44);
  }
  for (const label of map.landmarks) {
    if (!visible(game, label.x, 220)) continue;
    c.textAlign = 'left'; c.fillStyle = label.color;
    c.globalAlpha = .55; c.font = '500 31px Georgia, serif'; c.fillText(label.number, label.x, label.y - 80);
    c.globalAlpha = .9; c.font = '600 14px system-ui'; c.fillText(label.name, label.x, label.y - 54);
    c.globalAlpha = .65; c.font = '11px system-ui'; c.fillText(label.detail, label.x, label.y - 34);
    c.strokeStyle = label.color; c.lineWidth = 1; c.beginPath(); c.moveTo(label.x, label.y - 24); c.lineTo(label.x + 78, label.y - 24); c.stroke();
  }
  c.globalAlpha = .8; c.font = '12px system-ui'; c.fillStyle = '#d4dfb7'; c.textAlign = 'center';
  if (visible(game, map.routeLabel.x, 250)) c.fillText(map.routeHint, map.routeLabel.x, map.routeLabel.y);
  c.restore();
}

function drawExpeditionLinks(game: SurvivalGame) {
  const c = game.context;
  for (const [index, region] of EXPEDITION_REGIONS.entries()) {
    if (index === 0 || !visible(game, region.startX, 250)) continue;
    const y = game.groundHeightAt(region.startX);
    c.save(); c.strokeStyle = region.color; c.lineWidth = 2; c.globalAlpha = .7;
    c.beginPath(); c.moveTo(region.startX, y); c.lineTo(region.startX, y - 110); c.stroke();
    c.fillStyle = '#153441e8'; c.fillRect(region.startX - 150, y - 119, 300, 34);
    c.fillStyle = region.color; c.font = '600 13px system-ui'; c.textAlign = 'center';
    c.fillText(`← ${EXPEDITION_REGIONS[index - 1].name}   ·   ${region.name} →`, region.startX, y - 97);
    c.restore();
  }
}

function drawTacticalHazards(game: SurvivalGame) {
  const c = game.context;
  for (const hazard of game.getTacticalHazards()) {
    if (!visible(game, hazard.x + hazard.width / 2, hazard.width / 2 + 80)) continue;
    const { x, y, width, height, state } = hazard, top = y - height;
    c.save();
    // Grates remain visible while dormant so players can plan a route before the tell.
    c.fillStyle = '#27343a'; c.fillRect(x, y - 5, width, 16);
    c.strokeStyle = state === 'active' ? '#ffe0a0' : state === 'warning' ? '#f1cd6e' : '#9d9580';
    c.lineWidth = 2; c.strokeRect(x, y - 5, width, 16);
    c.fillStyle = '#788383';
    for (let grateX = x + 7; grateX < x + width - 4; grateX += 16) c.fillRect(grateX, y - 2, 6, 10);
    if (state === 'warning') {
      c.save(); c.beginPath(); c.rect(x, top, width, height); c.clip();
      c.fillStyle = '#f8c85424'; c.fillRect(x, top, width, height);
      c.strokeStyle = '#f6d27599'; c.lineWidth = 6;
      for (let stripeX = x - height; stripeX < x + width + height; stripeX += 25) {
        c.beginPath(); c.moveTo(stripeX, y); c.lineTo(stripeX + height, top); c.stroke();
      }
      c.restore(); c.strokeStyle = '#ffdf87'; c.lineWidth = 2; c.setLineDash([8, 5]);
      c.strokeRect(x, top, width, height); c.setLineDash([]);
    } else if (state === 'active') {
      const heat = c.createLinearGradient(0, top, 0, y);
      heat.addColorStop(0, '#fb5d4a55'); heat.addColorStop(.4, '#f96836bb'); heat.addColorStop(1, '#ffe1a4');
      c.fillStyle = '#ef563c38'; c.fillRect(x, top, width, height);
      c.fillStyle = heat;
      for (let fireX = x; fireX < x + width; fireX += 20) {
        const reach = height * (.68 + .32 * Math.abs(Math.sin(game.frame * .16 + fireX)));
        c.beginPath(); c.moveTo(fireX, y); c.quadraticCurveTo(fireX + 2, y - reach * .52, fireX + 10, y - reach);
        c.quadraticCurveTo(fireX + 12, y - reach * .35, Math.min(x + width, fireX + 20), y); c.closePath(); c.fill();
      }
      // A solid outline shows the true collision volume even between flame tongues.
      c.strokeStyle = '#ffb183'; c.lineWidth = 2; c.strokeRect(x, top, width, height);
      c.fillStyle = '#ffebbc'; c.fillRect(x, y - 3, width, 3);
    }
    const label = hazard.phaseRemaining === 0 && game.variant === 'expedition' ? `${hazard.name} · 已停机` :
      `${hazard.name} · ${state === 'warning' ? '⚠ 预警' : state === 'active' ? '▲ 喷发' : '熄火'} ${Math.ceil(hazard.phaseRemaining)}秒`;
    c.font = '600 12px system-ui'; c.textAlign = 'center';
    const labelWidth = c.measureText(label).width + 18, center = x + width / 2;
    c.fillStyle = '#152e39e8'; c.beginPath(); c.roundRect(center - labelWidth / 2, top - 24, labelWidth, 20, 5); c.fill();
    c.fillStyle = state === 'active' ? '#ffd2b5' : state === 'warning' ? '#ffe49a' : '#b9c6c3';
    c.fillText(label, center, top - 10);
    c.restore();
  }
}

function drawTacticalEnemy(game: SurvivalGame, e: SurvivalEnemy) {
  const c = game.context, role = e.role!, facing = e.facing ?? 1;
  const gold = role === 'guard' ? '#e6cf8b' : role === 'charger' ? '#edaa80' : '#b7cbea';
  const dark = role === 'guard' ? '#7f744e' : role === 'charger' ? '#925b4f' : '#4d6983';
  const arriving = e.state === 'arriving', recover = e.state === 'recover', active = e.state === 'active', tell = e.state === 'windup';
  c.save();
  if (arriving) {
    c.globalAlpha = .4 + Math.sin(game.frame * .18) * .15;
    c.strokeStyle = gold; c.lineWidth = 2; c.setLineDash([5, 5]);
    c.beginPath(); c.ellipse(e.x, e.y, 48, 12, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.globalAlpha = .4;
  }
  if (tell && role === 'sniper') {
    c.strokeStyle = '#ffcc95bd'; c.lineWidth = 1.5; c.setLineDash([9, 7]);
    c.beginPath(); c.moveTo(e.x + facing * 25, e.y - 40); c.lineTo(e.aimX, e.aimY); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#ffe1a9'; c.beginPath(); c.arc(e.aimX, e.aimY, 20, 0, Math.PI * 2); c.stroke();
    for (const delta of [-1, 1]) { c.beginPath(); c.moveTo(e.aimX + delta * 14, e.aimY); c.lineTo(e.aimX + delta * 27, e.aimY); c.stroke(); }
  } else if (tell && role === 'charger') {
    const start = e.x, finish = e.aimX;
    c.fillStyle = '#eda27c20'; c.fillRect(Math.min(start, finish), e.y - 13, Math.abs(start - finish), 16);
    c.strokeStyle = '#ffd69ac2'; c.lineWidth = 2; c.setLineDash([13, 8]); c.beginPath(); c.moveTo(start, e.y - 7); c.lineTo(finish, e.y - 7); c.stroke(); c.setLineDash([]);
    c.beginPath(); c.moveTo(finish - facing * 16, e.y - 17); c.lineTo(finish, e.y - 7); c.lineTo(finish - facing * 16, e.y + 3); c.stroke();
  } else if (tell && role === 'guard') {
    c.fillStyle = '#ebbd792b'; c.strokeStyle = '#f0cc89'; c.lineWidth = 2;
    c.beginPath(); c.ellipse(e.x + facing * 56, e.y - 33, 66, 34, 0, 0, Math.PI * 2); c.fill(); c.stroke();
  }
  c.translate(e.x, e.y);
  c.fillStyle = '#0a263633'; c.beginPath(); c.ellipse(0, supportBelow(game, e.x, e.y) - e.y + 3, 35, 8, 0, 0, Math.PI * 2); c.fill();
  c.save(); c.scale(facing, 1);
  if (recover) c.rotate(-.075);
  if (tell && role === 'charger') c.translate(Math.sin(game.frame * .8) * 1.3, 3);
  const body = c.createLinearGradient(-22, -65, 23, -4); body.addColorStop(0, e.flash ? '#fff8de' : e.petrify ? '#c5b27b' : gold); body.addColorStop(1, e.petrify ? '#7c7257' : dark);
  c.fillStyle = body; c.strokeStyle = gold; c.lineWidth = 1.5;
  if (role === 'guard') {
    c.beginPath(); c.moveTo(-23, -52); c.lineTo(-17, -16); c.lineTo(-24, -6); c.lineTo(-7, -3); c.lineTo(0, -18); c.lineTo(10, -3); c.lineTo(26, -5); c.lineTo(17, -23); c.lineTo(24, -52); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-20, -51); c.lineTo(-16, -76); c.lineTo(4, -83); c.lineTo(23, -65); c.lineTo(18, -48); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#243c3d'; c.fillRect(-5, -64, 22, 6); c.fillStyle = '#f9e9a0'; c.fillRect(5, -63, 9, 3);
    c.strokeStyle = '#f2d798'; c.lineWidth = 4; c.beginPath(); c.moveTo(-18, -37); c.lineTo(active ? 79 : 8, active ? -29 : -100); c.stroke();
    const shieldY = recover ? -21 : -48;
    c.fillStyle = recover ? '#65695a' : '#728785'; c.strokeStyle = recover ? '#a9e6d7' : '#edce86'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(14, shieldY - 25); c.lineTo(41, shieldY - 16); c.lineTo(39, shieldY + 17); c.lineTo(28, shieldY + 29); c.lineTo(13, shieldY + 13); c.closePath(); c.fill(); c.stroke();
    c.lineWidth = 1.5; c.beginPath(); c.moveTo(27, shieldY - 16); c.lineTo(34, shieldY); c.lineTo(27, shieldY + 17); c.lineTo(20, shieldY); c.closePath(); c.stroke();
  } else if (role === 'charger') {
    c.beginPath(); c.moveTo(-38, -16); c.bezierCurveTo(-50, -56, -18, -63, 17, -51); c.lineTo(40, -40); c.lineTo(47, -18); c.lineTo(22, -12); c.closePath(); c.fill(); c.stroke();
    for (const x of [-25, 18]) { c.fillStyle = dark; c.fillRect(x, -18, 12, 17); c.fillStyle = gold; c.fillRect(x - 2, -4, 15, 4); }
    c.fillStyle = '#f4e5bc'; c.beginPath(); c.moveTo(25, -39); c.lineTo(48, -69); c.lineTo(43, -31); c.closePath(); c.fill();
    c.strokeStyle = '#653b3e'; c.lineWidth = 5; c.beginPath(); c.moveTo(-27, -45); c.lineTo(-13, -32); c.lineTo(1, -46); c.lineTo(15, -32); c.stroke();
    c.fillStyle = '#fff1bc'; c.beginPath(); c.arc(30, -32, 3, 0, Math.PI * 2); c.fill();
  } else {
    c.beginPath(); c.moveTo(-14, -49); c.lineTo(-28, -5); c.quadraticCurveTo(0, 3, 22, -7); c.lineTo(12, -48); c.closePath(); c.fill(); c.stroke();
    c.beginPath(); c.moveTo(-21, -46); c.lineTo(-11, -76); c.lineTo(0, -85); c.lineTo(22, -63); c.lineTo(20, -48); c.closePath(); c.fill(); c.stroke();
    c.fillStyle = '#193943'; c.beginPath(); c.moveTo(-4, -65); c.lineTo(14, -62); c.lineTo(12, -51); c.lineTo(-5, -53); c.fill();
    c.fillStyle = '#e5fbfb'; c.fillRect(4, -60, 9, 3);
    c.strokeStyle = '#d8d4b4'; c.lineWidth = 3; c.beginPath(); c.moveTo(28, -70); c.quadraticCurveTo(53, -39, 28, -15); c.stroke();
    c.lineWidth = 1; c.beginPath(); c.moveTo(28, -70); c.lineTo(tell ? 5 : 27, -41); c.lineTo(28, -15); c.stroke();
    c.strokeStyle = '#f6d69c'; c.lineWidth = 2; c.beginPath(); c.moveTo(4, -41); c.lineTo(55, -41); c.stroke();
  }
  c.restore();
  if (recover) { c.strokeStyle = '#a3e8dc'; c.lineWidth = 1.5; c.setLineDash([4, 5]); c.beginPath(); c.ellipse(0, -40, 49, 48, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]); }
  const stateLabel = arriving ? '即将入场' : recover ? '破绽 · 可反击' : tell ? role === 'sniper' ? '瞄准 · 可打断' : role === 'charger' ? '蓄势 · 跳跃闪避' : '挥击预警' : role === 'guard' ? '举盾 · K 破盾' : '';
  c.textAlign = 'center'; c.font = '600 12px system-ui'; c.fillStyle = recover ? '#afece0' : tell ? '#ffdb9e' : gold;
  c.fillText(role === 'guard' ? '岩盾卫' : role === 'charger' ? '冲锋兽' : '高台射手', 0, -116);
  c.font = '10px system-ui'; c.fillText(stateLabel, 0, -101);
  c.fillStyle = '#132d38cc'; c.fillRect(-29, -93, 58, 4); c.fillStyle = recover ? '#a7e3d7' : gold; c.fillRect(-29, -93, 58 * Math.max(0, e.hp / e.maxHp), 4);
  c.restore();
}

function drawEnemy(game: SurvivalGame, e: SurvivalEnemy, frame: number) {
  const c = game.context;
  if (e.role) { drawTacticalEnemy(game, e); return; }
  if (e.state === 'arriving') {
    c.save(); c.globalAlpha = .65 + Math.sin(frame * .12) * .2;
    c.strokeStyle = e.boss ? '#ffc58b' : '#c3d8b0'; c.lineWidth = e.boss ? 3 : 2; c.setLineDash([8, 6]);
    c.beginPath(); c.ellipse(e.x, e.y, e.radius + 24, 14, 0, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
    c.fillStyle = e.boss ? '#ffc58b' : '#c3d8b0'; c.font = `${e.boss ? 700 : 500} ${e.boss ? 16 : 12}px system-ui`; c.textAlign = 'center';
    c.fillText(e.boss ? '秘境霸主即将现身' : '增援将至', e.x, e.y - e.radius * 2 - 20);
    c.restore(); return;
  }
  const r = e.radius, colors = e.boss ? ['#ffc58b', '#994c5c'] : e.elite ? ['#f5d887', '#8b7549'] : e.kind === 'slime' ? ['#9ddbd1', '#317c79'] : e.kind === 'flyer' ? ['#d3bcf2', '#715796'] : ['#eab793', '#906258'];
  const bob = e.petrify ? 0 : Math.sin(frame * 0.085 + e.id) * (e.kind === 'flyer' ? 5 : 2);
  c.save(); c.translate(e.x, e.y);
  c.fillStyle = 'rgba(8,26,34,.2)'; c.beginPath(); c.ellipse(0, supportBelow(game, e.x, e.y) - e.y + 3, r * 0.95, 7, 0, 0, Math.PI * 2); c.fill();
  c.translate(0, -r * 0.72 + bob);
  const gradient = c.createRadialGradient(-r * 0.3, -r * 0.45, 2, 0, 0, r * 1.25);
  gradient.addColorStop(0, e.flash > 0 ? '#fffbe9' : e.petrify ? '#d2bd87' : colors[0]); gradient.addColorStop(1, e.petrify ? '#877756' : colors[1]);
  c.fillStyle = gradient; c.strokeStyle = colors[0]; c.lineWidth = 1.5;
  if (e.kind === 'slime') {
    c.beginPath(); c.moveTo(-r, r * 0.5); c.bezierCurveTo(-r * 1.15, -r * 0.3, -r * 0.68, -r, 0, -r * 0.94); c.bezierCurveTo(r * 0.76, -r, r * 1.1, -r * 0.23, r, r * 0.5); c.quadraticCurveTo(0, r * 0.91, -r, r * 0.5); c.fill(); c.stroke();
    c.fillStyle = 'rgba(238,255,242,.35)'; c.beginPath(); c.ellipse(-r * 0.3, -r * 0.52, r * 0.28, r * 0.12, -0.6, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#203f4d'; c.beginPath(); c.ellipse(-r * 0.29, 0, 3.5, 5, 0, 0, Math.PI * 2); c.ellipse(r * 0.29, 0, 3.5, 5, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = '#275756'; c.lineWidth = 2; c.beginPath(); c.arc(0, 3, 5, 0.2, Math.PI - 0.2); c.stroke();
  } else {
    c.save(); c.rotate(frame * 0.015 * (e.kind === 'flyer' ? 1 : -1));
    c.beginPath(); for (let i = 0; i < 6; i++) { const angle = i * Math.PI / 3; const x = Math.cos(angle) * r, y = Math.sin(angle) * r; if (!i) c.moveTo(x, y); else c.lineTo(x, y); } c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = `${colors[0]}99`; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r * 1.35, 0, Math.PI * 1.45); c.stroke(); c.restore();
    c.fillStyle = '#fff0da'; c.beginPath(); c.moveTo(0, -r * 0.52); c.lineTo(r * 0.33, 0); c.lineTo(0, r * 0.52); c.lineTo(-r * 0.33, 0); c.closePath(); c.fill();
    if (e.kind === 'flyer') { c.strokeStyle = colors[0]; c.lineWidth = 3; c.beginPath(); c.moveTo(-r, 0); c.lineTo(-r * 1.75, -12); c.lineTo(-r * 1.35, 10); c.moveTo(r, 0); c.lineTo(r * 1.75, -12); c.lineTo(r * 1.35, 10); c.stroke(); }
  }
  if (e.slow > 0) { c.strokeStyle = '#bdf5ff'; c.lineWidth = 2; c.beginPath(); c.arc(0, 0, r + 4, 0, Math.PI * 2); c.stroke(); }
  if (e.stacks) { c.fillStyle = '#ecfaff'; c.font = '700 12px system-ui'; c.textAlign = 'center'; c.fillText(`❄ ${e.stacks}`, 0, -r - 14); }
  c.restore();
  if (e.tell > 0) {
    c.save(); c.strokeStyle = `rgba(255,184,123,${0.4 + e.tell / 110})`; c.lineWidth = e.boss ? 3 : 1.5; c.setLineDash([8, 9]); c.beginPath(); c.moveTo(e.x, e.y - r); c.lineTo(e.aimX, e.aimY); c.stroke(); c.setLineDash([]);
    c.strokeStyle = '#ffd799'; c.beginPath(); c.arc(e.aimX, e.aimY, 18, 0, Math.PI * 2); c.stroke(); c.fillStyle = '#fff0c3'; c.font = 'bold 23px system-ui'; c.textAlign = 'center'; c.fillText('!', e.x, e.y - r * 2 - 15); c.restore();
  }
  if (e.elite || e.boss || e.hp < e.maxHp) {
    const width = e.boss ? 150 : e.elite ? 90 : 44;
    c.fillStyle = 'rgba(12,28,34,.8)'; c.fillRect(e.x - width / 2, e.y - r * 2 - 14, width, 5);
    c.fillStyle = e.boss ? '#edaf8b' : e.elite ? '#eed086' : '#bddfc5'; c.fillRect(e.x - width / 2, e.y - r * 2 - 14, width * Math.max(0, e.hp / e.maxHp), 5);
    if (e.elite || e.boss) { c.font = '600 13px system-ui'; c.textAlign = 'center'; c.fillText(e.boss ? '秘境霸主' : '元素精英', e.x, e.y - r * 2 - 23); }
  }
}

function drawField(c: CanvasRenderingContext2D, field: SurvivalField, quality: VisualQuality) {
  const fade = Math.min(1, (field.life - field.age) / 30), t = field.age * 0.055;
  c.save(); c.globalAlpha = 0.8 * fade; c.translate(field.x, field.y);
  if (field.kind === 'thunder' || field.kind === 'updraft') {
    const thunder = field.kind === 'thunder', height = field.height ?? 200;
    const color = thunder ? '#c4a4ff' : '#a5f1d5';
    c.shadowColor = color; c.shadowBlur = effectGlow(quality, 18);
    if (!drawSecondaryEffect(c, thunder ? 'raiden' : 'jean', 0, 0, field.radius * 2.5, height, { alpha: fade })) {
      c.strokeStyle = color; c.lineWidth = thunder ? 7 : 3; c.beginPath();
      if (thunder) { c.moveTo(-9, -height / 2); c.lineTo(13, -height * 0.12); c.lineTo(-8, 0); c.lineTo(7, height / 2); }
      else for (let i = 0; i < 4; i++) { const y = height * (i / 4 - 0.4); c.moveTo(-field.radius, y); c.quadraticCurveTo(0, y - 40, field.radius, y - 18); }
      c.stroke();
    }
    c.strokeStyle = color; c.lineWidth = 2; c.beginPath(); c.ellipse(0, height / 2, field.radius * (0.8 + Math.sin(t) * 0.08), 12, 0, 0, Math.PI * 2); c.stroke();
    c.restore(); return;
  }
  const color = field.kind === 'flame' ? '#f7a270' : field.kind === 'orbit' ? '#b5eaff' : '#9ae6cb';
  if (quality !== 'low') {
    const glow = c.createRadialGradient(0, 0, 5, 0, 0, field.radius); glow.addColorStop(0, `${color}20`); glow.addColorStop(0.8, `${color}13`); glow.addColorStop(1, `${color}00`);
    c.fillStyle = glow; c.beginPath(); c.arc(0, 0, field.radius, 0, Math.PI * 2); c.fill();
  }
  c.strokeStyle = color; c.lineWidth = 2;
  if (field.kind === 'pillar') {
    for (let i = 0; i < 3; i++) { c.beginPath(); c.moveTo(-35 + i * 30, 55); c.quadraticCurveTo(55 * Math.sin(t + i), -25, -15 + i * 20, -120); c.stroke(); }
    drawXiaoPlungeEffect(c, 'descent', 0, -35, 140, 200, fade * 0.4);
  } else if (field.kind === 'flame') {
    for (let i = -2; i <= 2; i++) {
      c.fillStyle = i % 2 ? '#ffe0a299' : '#ee945d88'; c.beginPath(); c.moveTo(i * field.radius / 3 - 18, 20); c.quadraticCurveTo(i * field.radius / 3 - 26, -18, i * field.radius / 3 + Math.sin(t + i) * 10, -40 - 14 * Math.sin(t * 2 + i)); c.quadraticCurveTo(i * field.radius / 3 + 20, -6, i * field.radius / 3 + 18, 20); c.fill();
    }
  } else if (field.kind === 'orbit') {
    for (let i = 0; i < 3; i++) {
      const angle = t * 2 + i * Math.PI * 2 / 3; c.save(); c.translate(Math.cos(angle) * field.radius * 0.8, Math.sin(angle) * field.radius * 0.55); c.rotate(angle); c.fillStyle = '#c2f1ff'; c.beginPath(); c.moveTo(-8, -20); c.lineTo(8, -8); c.lineTo(5, 28); c.lineTo(-5, 10); c.closePath(); c.fill(); c.restore();
    }
    c.globalAlpha *= 0.35; c.beginPath(); c.ellipse(0, 0, field.radius, field.radius * 0.65, 0, 0, Math.PI * 2); c.stroke();
  } else {
    for (let i = 0; i < 3; i++) { c.beginPath(); c.ellipse(0, 0, field.radius * (0.55 + i * 0.15), field.radius * (0.25 + i * 0.1), t + i * 0.4, 0, Math.PI * 1.6); c.stroke(); }
    if (field.kind === 'sanctuary') { c.fillStyle = '#dcffd2'; c.fillRect(-3, -15, 6, 30); c.fillRect(-15, -3, 30, 6); }
  }
  c.restore();
}

function drawNavigation(game: SurvivalGame) {
  const expedition = game.variant === 'expedition', tactical = game.variant === 'tactical';
  const c = game.context, x = 32, y = H - 30, width = expedition ? 360 : 204;
  c.save(); c.fillStyle = 'rgba(9,32,40,.7)'; c.beginPath(); c.roundRect(x - 14, y - (expedition ? 75 : tactical ? 55 : 27), width + 28, expedition ? 94 : tactical ? 74 : 46, 12); c.fill();
  c.fillStyle = '#abc9c2'; c.font = '10px system-ui'; c.textAlign = 'left';
  c.fillText(expedition ? `遗迹漫游 · 已探索 ${game.getExpeditionSnapshot()?.visitedRegions.length ?? 0}/3` : tactical ? `战术试炼 · ${game.tacticalMap.name}` : '秘境长廊', x, y - (expedition ? 58 : tactical ? 38 : 11));
  if (expedition) for (const region of EXPEDITION_REGIONS) {
    const rx = x + region.startX / game.world.width * width, rw = (region.endX - region.startX) / game.world.width * width;
    c.fillStyle = `${region.color}20`; c.fillRect(rx, y - 48, rw - 2, 57);
    c.fillStyle = region.color; c.font = '10px system-ui'; c.textAlign = 'center'; c.fillText(region.name, rx + rw / 2, y - 35);
  }
  const miniY = (height: number) => y + (height - game.world.groundY) * 0.045;
  c.strokeStyle = '#71958a'; c.lineWidth = 3; c.beginPath();
  for (const [i, point] of game.world.terrain.entries()) { const px = x + point.x / game.world.width * width; if (!i) c.moveTo(px, miniY(point.y)); else c.lineTo(px, miniY(point.y)); } c.stroke();
  if (tactical || expedition) {
    c.lineWidth = 1; c.strokeStyle = '#adbd96';
    for (const platform of game.world.platforms) { c.beginPath(); c.moveTo(x + platform.x / game.world.width * width, miniY(platform.y)); c.lineTo(x + (platform.x + platform.w) / game.world.width * width, miniY(platform.y)); c.stroke(); }
    const wind = game.getMapCapabilities().find(map => map.wind)?.wind;
    if (wind) {
      c.strokeStyle = '#97efcf'; c.lineWidth = 2; const wx = x + wind.x / game.world.width * width;
      c.beginPath(); c.moveTo(wx, miniY(wind.bottom)); c.lineTo(wx, miniY(wind.top)); c.stroke();
    }
    const activeHazards = game.getTacticalHazards();
    const hazards = activeHazards.length ? activeHazards : expedition ? (EXPEDITION_MAPS[2].hazards ?? []).map(hazard => ({ ...hazard, state: 'off' as const })) : [];
    for (const hazard of hazards) {
      const hx = x + hazard.x / game.world.width * width, hw = hazard.width / game.world.width * width, hy = miniY(hazard.y);
      c.fillStyle = hazard.state === 'active' ? '#ff916b' : hazard.state === 'warning' ? '#ffe093' : '#939b99';
      c.fillRect(hx, hy - (hazard.state === 'off' ? 1 : 3), hw, hazard.state === 'off' ? 2 : 6);
      if (hazard.state !== 'off') {
        c.font = 'bold 9px system-ui'; c.textAlign = 'center'; c.fillText(hazard.state === 'warning' ? '!' : '▲', hx + hw / 2, hy - 5);
      }
    }
  }
  for (const enemy of game.enemies) if (enemy.elite || enemy.role) { c.fillStyle = '#f2b473'; c.fillRect(x + enemy.x / game.world.width * width - 2, miniY(enemy.y) - 3, 4, 6); }
  c.fillStyle = '#dbe6ae'; c.beginPath(); c.arc(x + game.player.x / game.world.width * width, miniY(game.player.y), 4, 0, Math.PI * 2); c.fill();
  c.restore();
}
