import { drawArenaBackground, drawFighterArt, drawElementEffect, drawXiaoPlungeEffect, drawSecondaryEffect } from './art';
import { SURVIVAL_WORLD, groundHeightAt } from './survival-data';
import type { SurvivalGame, SurvivalEnemy, SurvivalField } from './survival-engine';

const W = 1280, H = 720;
const visible = (game: SurvivalGame, x: number, padding = 140) => x > game.camera.x - padding && x < game.camera.x + W + padding;
const supportBelow = (x: number, y: number) => Math.min(groundHeightAt(x), ...SURVIVAL_WORLD.platforms.filter(p => x >= p.x && x <= p.x + p.w && y <= p.y + 2).map(p => p.y));

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
  for (const field of game.fields) if (visible(game, field.x, field.radius)) drawField(c, field);
  for (const orb of game.orbs) if (visible(game, orb.x)) {
    const bob = Math.sin(game.frame * 0.06 + orb.x) * 2;
    c.save(); c.translate(orb.x, orb.y + bob);
    c.shadowColor = orb.heal ? '#a8f4be' : '#71deed'; c.shadowBlur = 12;
    c.fillStyle = orb.heal ? '#b8f5af' : orb.value > 12 ? '#d5b3ff' : '#83eff1';
    if (orb.heal) { c.fillRect(-3, -8, 6, 16); c.fillRect(-8, -3, 16, 6); }
    else {
      const size = Math.min(10, 5 + Math.log2(orb.value + 1));
      c.beginPath(); c.moveTo(0, -size); c.lineTo(size * 0.65, 0); c.lineTo(0, size); c.lineTo(-size * 0.65, 0); c.closePath(); c.fill();
      c.shadowBlur = 0; c.strokeStyle = '#e9fffb'; c.lineWidth = 1; c.stroke();
    }
    c.restore();
  }
  for (const enemy of game.enemies) if (visible(game, enemy.x)) drawEnemy(c, enemy, game.frame);
  for (const shot of game.shots) if (visible(game, shot.x)) {
    c.save(); c.translate(shot.x, shot.y);
    if (shot.secondary) { c.scale(shot.vx < 0 ? -1 : 1, 1); c.rotate(Math.atan2(shot.vy, Math.abs(shot.vx))); }
    else c.rotate(Math.atan2(shot.vy, shot.vx));
    c.shadowColor = shot.color; c.shadowBlur = 15;
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
    const t = effect.age / effect.life;
    c.save(); c.globalAlpha = 1 - t;
    if (effect.kind === 'chain') {
      c.strokeStyle = effect.color; c.lineWidth = 3; c.shadowColor = effect.color; c.shadowBlur = 10;
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
  if (p.attack?.plunge?.phase === 'dive') drawXiaoPlungeEffect(c, 'descent', p.x, p.y - 90, 150, 230, 0.58);
  c.save();
  const shadowY = supportBelow(p.x, p.y);
  c.fillStyle = `rgba(9,25,31,${Math.max(0.06, 0.23 - (shadowY - p.y) / 1600)})`; c.beginPath(); c.ellipse(p.x, shadowY + 3, 35, 8, 0, 0, Math.PI * 2); c.fill();
  if (p.dodge > 0) {
    c.globalAlpha = 0.2;
    drawFighterArt(c, game.char.id, p.x - p.facing * 35, p.y, 112, { state: 'free', attack: null, onGround: p.onGround, vx: p.vx, vy: p.vy, dodgeTimer: p.dodge, time: game.frame }, { facing: p.facing });
  }
  const hurtFlash = game.hitstop > 0;
  c.globalAlpha = !hurtFlash && p.invuln > 0 && Math.floor(game.frame / 4) % 2 ? 0.58 : 1;
  const rendered = drawFighterArt(c, game.char.id, p.x, p.y, 112, { state: p.attack ? 'attack' : 'free', attack: p.attack, onGround: p.onGround, vx: p.vx, vy: p.vy, dodgeTimer: p.dodge, time: game.frame }, { facing: p.facing, flash: hurtFlash });
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

function scenery(game: SurvivalGame) {
  const c = game.context;
  const earth = c.createLinearGradient(0, 745, 0, SURVIVAL_WORLD.height);
  earth.addColorStop(0, '#627c69'); earth.addColorStop(0.05, '#344c48'); earth.addColorStop(0.35, '#243b3e'); earth.addColorStop(1, '#142b32');
  const traceGround = () => { c.beginPath(); for (const [i, point] of SURVIVAL_WORLD.terrain.entries()) { if (!i) c.moveTo(point.x, point.y); else c.lineTo(point.x, point.y); } };
  traceGround(); c.lineTo(SURVIVAL_WORLD.width, SURVIVAL_WORLD.height); c.lineTo(0, SURVIVAL_WORLD.height); c.closePath(); c.fillStyle = earth; c.fill();
  traceGround(); c.strokeStyle = '#adbea0'; c.lineWidth = 5; c.stroke();
  traceGround(); c.strokeStyle = '#e0e4b8'; c.lineWidth = 1; c.stroke();
  for (let x = Math.floor(game.camera.x / 120) * 120; x < game.camera.x + W + 120; x += 120) {
    const ground = groundHeightAt(x);
    c.strokeStyle = 'rgba(174,184,144,.16)'; c.lineWidth = 1;
    c.beginPath(); c.moveTo(x, ground + 9); c.lineTo(x + 18, ground + 27); c.lineTo(x + 108, ground + 27); c.stroke();
    const grassY = groundHeightAt(x + 33);
    c.strokeStyle = '#708e72'; c.beginPath(); c.moveTo(x + 33, grassY); c.lineTo(x + 28, grassY - 13); c.moveTo(x + 34, grassY); c.lineTo(x + 40, grassY - 9); c.stroke();
    if (x % 360 === 0) {
      const rockY = groundHeightAt(x + 75);
      c.fillStyle = '#96a990'; c.beginPath(); c.moveTo(x + 60, groundHeightAt(x + 60)); c.lineTo(x + 68, rockY - 12); c.lineTo(x + 82, rockY - 10); c.lineTo(x + 91, groundHeightAt(x + 91)); c.fill();
    }
  }
  for (const platform of SURVIVAL_WORLD.platforms) if (platform.x + platform.w > game.camera.x - 30 && platform.x < game.camera.x + W + 30) {
    const { x, y, w } = platform;
    c.fillStyle = 'rgba(11,35,42,.18)'; c.beginPath(); c.ellipse(x + w / 2, groundHeightAt(x + w / 2) + 6, w / 2, 10, 0, 0, Math.PI * 2); c.fill();
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
  for (const x of [18, SURVIVAL_WORLD.width - 18]) if (visible(game, x)) {
    const ground = groundHeightAt(x);
    c.fillStyle = '#45615f'; c.fillRect(x - 13, ground - 110, 26, 110); c.fillStyle = '#c7cea7'; c.fillRect(x - 20, ground - 113, 40, 9);
    c.fillStyle = '#9fe1cd'; c.shadowColor = '#7ffad5'; c.shadowBlur = 12; c.fillRect(x - 4, ground - 96, 8, 38); c.shadowBlur = 0;
  }
}

function drawEnemy(c: CanvasRenderingContext2D, e: SurvivalEnemy, frame: number) {
  const r = e.radius, colors = e.boss ? ['#ffc58b', '#994c5c'] : e.elite ? ['#f5d887', '#8b7549'] : e.kind === 'slime' ? ['#9ddbd1', '#317c79'] : e.kind === 'flyer' ? ['#d3bcf2', '#715796'] : ['#eab793', '#906258'];
  const bob = Math.sin(frame * 0.085 + e.id) * (e.kind === 'flyer' ? 5 : 2);
  c.save(); c.translate(e.x, e.y);
  c.fillStyle = 'rgba(8,26,34,.2)'; c.beginPath(); c.ellipse(0, supportBelow(e.x, e.y) - e.y + 3, r * 0.95, 7, 0, 0, Math.PI * 2); c.fill();
  c.translate(0, -r * 0.72 + bob);
  const gradient = c.createRadialGradient(-r * 0.3, -r * 0.45, 2, 0, 0, r * 1.25);
  gradient.addColorStop(0, e.flash > 0 ? '#fffbe9' : colors[0]); gradient.addColorStop(1, colors[1]);
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

function drawField(c: CanvasRenderingContext2D, field: SurvivalField) {
  const fade = Math.min(1, (field.life - field.age) / 30), t = field.age * 0.055;
  c.save(); c.globalAlpha = 0.8 * fade; c.translate(field.x, field.y);
  if (field.kind === 'thunder' || field.kind === 'updraft') {
    const thunder = field.kind === 'thunder', height = field.height ?? 200;
    const color = thunder ? '#c4a4ff' : '#a5f1d5';
    c.shadowColor = color; c.shadowBlur = 18;
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
  const glow = c.createRadialGradient(0, 0, 5, 0, 0, field.radius); glow.addColorStop(0, `${color}20`); glow.addColorStop(0.8, `${color}13`); glow.addColorStop(1, `${color}00`);
  c.fillStyle = glow; c.beginPath(); c.arc(0, 0, field.radius, 0, Math.PI * 2); c.fill();
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
  const c = game.context, x = 32, y = H - 30, width = 204;
  c.save(); c.fillStyle = 'rgba(9,32,40,.7)'; c.beginPath(); c.roundRect(x - 14, y - 27, width + 28, 46, 12); c.fill();
  c.fillStyle = '#abc9c2'; c.font = '10px system-ui'; c.textAlign = 'left'; c.fillText('秘境长廊', x, y - 11);
  const miniY = (height: number) => y + (height - SURVIVAL_WORLD.groundY) * 0.045;
  c.strokeStyle = '#71958a'; c.lineWidth = 3; c.beginPath();
  for (const [i, point] of SURVIVAL_WORLD.terrain.entries()) { const px = x + point.x / SURVIVAL_WORLD.width * width; if (!i) c.moveTo(px, miniY(point.y)); else c.lineTo(px, miniY(point.y)); } c.stroke();
  for (const enemy of game.enemies) if (enemy.elite) { c.fillStyle = '#f2b473'; c.fillRect(x + enemy.x / SURVIVAL_WORLD.width * width - 2, miniY(groundHeightAt(enemy.x)) - 3, 4, 6); }
  c.fillStyle = '#dbe6ae'; c.beginPath(); c.arc(x + game.player.x / SURVIVAL_WORLD.width * width, miniY(game.player.y), 4, 0, Math.PI * 2); c.fill();
  c.restore();
}
