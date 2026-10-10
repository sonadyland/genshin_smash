import { CHARACTERS } from './data';
/** Shared rules for the manual-combat, ten-minute survival mode. */
export type SurvivalPhase = 'playing' | 'paused' | 'upgrade' | 'victory' | 'defeat';
export interface SurvivalOptions { player: number }
export interface UpgradeChoice {
  id: string;
  name: string;
  description: string;
  kind: 'core' | 'secondary' | 'branch' | 'passive' | 'auxiliary';
  level: number;
  maxLevel: number;
  color?: string;
}
export interface SurvivalProgress {
  charId: string;
  skillLevel: number;
  secondaryLevel: number;
  branch: string | null;
  upgrades: Record<string, number>;
}
export interface SurvivalSnapshot {
  phase: SurvivalPhase;
  muted: boolean;
  charId: string;
  elapsed: number;
  remaining: number;
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpNeeded: number;
  kills: number;
  eliteKills: number;
  bossKilled: boolean;
  skillLevel: number;
  secondaryLevel: number;
  branch: string | null;
  branchName: string | null;
  choices: UpgradeChoice[];
  upgrades: { id: string; name: string; level: number }[];
  waveName: string;
  damageDealt: number;
  skillCooldown: number;
  skillCooldownMax: number;
  secondaryCooldown: number;
  secondaryCooldownMax: number;
  dodgeCooldown: number;
  dodgeCooldownMax: number;
  notice: string;
  rerollsRemaining: number;
  shieldHp: number;
  shieldRemaining: number;
  summonCount: number;
  summonRemaining: number;
  buffRemaining: number;
}

export const SURVIVAL_DURATION = 600;
export const SURVIVAL_BASE_HP = 100;
export const SURVIVAL_WORLD = {
  width: 4600,
  height: 1080,
  groundY: 920,
  // Continuous solid ground: two raised terraces connected by walkable slopes.
  terrain: [
    { x: 0, y: 920 }, { x: 250, y: 920 },
    { x: 650, y: 800 }, { x: 1050, y: 800 },
    { x: 1450, y: 920 }, { x: 2650, y: 920 },
    { x: 3050, y: 760 }, { x: 3650, y: 760 },
    { x: 4150, y: 920 }, { x: 4600, y: 920 },
  ],
  platforms: [
    { x: 240, y: 650, w: 390 },
    { x: 700, y: 610, w: 310 },
    { x: 1100, y: 650, w: 370 },
    { x: 1510, y: 610, w: 330 },
    { x: 1920, y: 750, w: 550 },
    { x: 2330, y: 570, w: 370 },
    { x: 2750, y: 600, w: 300 },
    { x: 3160, y: 530, w: 340 },
    { x: 3570, y: 605, w: 390 },
    { x: 4070, y: 610, w: 300 },
  ],
};

/** Shared collision/rendering surface, clamped safely at the world boundaries. */
export function groundHeightAt(x: number): number {
  const points = SURVIVAL_WORLD.terrain;
  const position = Math.max(0, Math.min(SURVIVAL_WORLD.width, x));
  for (let i = 1; i < points.length; i++) {
    if (position <= points[i].x) {
      const a = points[i - 1], b = points[i];
      return a.y + (b.y - a.y) * (position - a.x) / (b.x - a.x);
    }
  }
  return points[points.length - 1].y;
}
export const SURVIVAL_LIMITS = { enemies: 110, gems: 150, effects: 140, projectiles: 100 };
export const SURVIVAL_WAVES = [
  { start: 0, name: '初入秘境', interval: 1.5, enemyTypes: ['walker'] },
  { start: 120, name: '风中暗影', interval: 1.15, enemyTypes: ['walker', 'flyer'] },
  { start: 240, name: '元素涌动', interval: 0.9, enemyTypes: ['walker', 'flyer', 'shooter'] },
  { start: 360, name: '重围渐起', interval: 0.7, enemyTypes: ['walker', 'flyer', 'shooter'] },
  { start: 480, name: '终末围攻', interval: 0.48, enemyTypes: ['walker', 'flyer', 'shooter'] },
] as const;

const branch = (id: string, name: string, description: string, color: string): UpgradeChoice =>
  ({ id, name, description, color, kind: 'branch', level: 1, maxLevel: 1 });

export const SURVIVAL_BRANCHES: Record<string, [UpgradeChoice, UpgradeChoice]> = {
  raiden: [
    branch('raiden-chain', '连锁雷鸣', '雷光斩命中后向附近敌人传导雷电，清理密集怪群。', '#bd9aff'),
    branch('raiden-return', '断空雷刃', '巨型穿透雷刃飞出后折返，再次斩击沿途敌人。', '#bd9aff'),
  ],
  jean: [
    branch('jean-vortex', '聚风领域', '手动释放风压剑后留下旋风，吸附附近敌人并持续切割。', '#8adecf'),
    branch('jean-sanctuary', '蒲公英守护', '风压剑留下恢复风场，在场内恢复生命并伤害敌人。', '#8adecf'),
  ],
  eula: [
    branch('eula-orbit', '霜轮旋舞', '手动出招后，冰刃短暂环绕自身，持续切割并减速敌人。', '#a5e7ff'),
    branch('eula-shatter', '碎冰终奏', '手动攻击叠加霜印，冰潮旋舞引爆印记，造成大范围爆发。', '#a5e7ff'),
  ],
  diluc: [
    branch('diluc-trail', '燎原之路', '手动火焰突进沿途留下火径，持续灼烧追来的敌人。', '#ffae78'),
    branch('diluc-burst', '逆焰连斩', '火焰突进追加火弹与爆破区域，集中打击精英。', '#ffae78'),
  ],
  xiao: [
    branch('xiao-pillars', '镇岳', '下坠落地后掀起扩散冲击，并留下持续伤敌的风柱。', '#6ce8ce'),
    branch('xiao-aerial', '凌空', '下坠命中后返还跳跃次数、缩短技能冷却；由你再次起跳。', '#6ce8ce'),
  ],
  zhongli: [
    branch('geo-twin', '双柱共鸣', '地心召唤两根岩柱，分别持续共鸣，扩大封锁范围。', '#e8bd63'),
    branch('geo-shield', '磐岩守护', '地心强化护盾，并在护盾持续期间向自身周围释放岩震。', '#e8bd63'),
  ],
  furina: [
    branch('hydro-ranged', '万众喝彩', '乌瑟勋爵加快发射泡泡，海薇玛夫人扩大水线射程。', '#8ccfff'),
    branch('hydro-crab', '盛宴时刻', '谢贝蕾妲小姐扩大扑击水花的范围，强化近身清场。', '#8ccfff'),
  ],
};

const SURVIVAL_SKILL_CAP = 5;

const UPGRADE_DEFINITIONS: UpgradeChoice[] = [
  { id: 'core', name: '元素精修', description: '提升招牌技能的伤害与范围；达到 4 级后选择进化方向。', kind: 'core', level: 1, maxLevel: 5, color: '#e8cf92' },
  { id: 'secondary', name: '新技精修', description: '', kind: 'secondary', level: 1, maxLevel: 5, color: '#a9e9d7' },
  { id: 'damage', name: '锋芒', description: '所有手动攻击及其追加效果伤害提高 15%。', kind: 'passive', level: 0, maxLevel: 5 },
  { id: 'speed', name: '轻盈步伐', description: '移动速度提高 8%，更灵活地穿越地形。', kind: 'passive', level: 0, maxLevel: 3 },
  { id: 'range', name: '余波', description: '近战与技能范围提高 10%。', kind: 'passive', level: 0, maxLevel: 3 },
  { id: 'vitality', name: '生生不息', description: '生命上限提高 25，并恢复 25 点生命。', kind: 'passive', level: 0, maxLevel: 4 },
  { id: 'armor', name: '磐石', description: '受到的伤害降低 12%。', kind: 'passive', level: 0, maxLevel: 3 },
  { id: 'magnet', name: '灵识', description: '经验吸取范围扩大 35，减少拾取负担。', kind: 'passive', level: 0, maxLevel: 3 },
  { id: 'aux-lightning', name: '追雷', description: '手动出招时触发追击雷电；提高等级增强伤害。', kind: 'auxiliary', level: 0, maxLevel: 3, color: '#bd9aff' },
  { id: 'aux-frost', name: '霜华', description: '手动出招时触发冰霜冲击，伤害并减速附近敌人。', kind: 'auxiliary', level: 0, maxLevel: 3, color: '#a5e7ff' },
  { id: 'aux-flame', name: '流焰', description: '手动出招时向前发射火弹；提高等级增强伤害。', kind: 'auxiliary', level: 0, maxLevel: 3, color: '#ffae78' },
];

export function makeInitialProgress(charId: string): SurvivalProgress {
  return { charId, skillLevel: 1, secondaryLevel: 1, branch: null, upgrades: {} };
}

/** First levels arrive early; later levels require progressively larger groups. */
export function xpForLevel(level: number): number {
  const safeLevel = Math.max(1, Math.floor(level));
  return Math.round(8 + safeLevel * 5 + Math.pow(safeLevel - 1, 1.45) * 2);
}

function eligibleChoices(progress: SurvivalProgress): UpgradeChoice[] {
  const auxiliaryCount = Object.keys(progress.upgrades).filter(id => id.startsWith('aux-') && progress.upgrades[id] > 0).length;
  return UPGRADE_DEFINITIONS.flatMap(definition => {
    const current = definition.kind === 'core' ? progress.skillLevel : definition.kind === 'secondary' ? progress.secondaryLevel : (progress.upgrades[definition.id] || 0);
    const maximum = definition.kind === 'core' || definition.kind === 'secondary' ? SURVIVAL_SKILL_CAP : definition.maxLevel;
    if (current >= maximum) return [];
    if (definition.kind === 'auxiliary' && !current && auxiliaryCount >= 2) return [];
    return [{ ...definition, maxLevel: maximum, level: current + 1, ...(definition.kind === 'secondary' ? { name: CHARACTERS.find(c => c.id === progress.charId)!.secondary.name, description: getSecondaryProfile(progress.charId, current + 1).description } : {}), ...(definition.kind === 'core' && progress.charId === 'zhongli' ? { description: '提升岩柱共鸣伤害、范围和护盾吸收量；4 级选择双柱或护盾岩震。' } : definition.kind === 'core' && progress.charId === 'furina' ? { description: '提升沙龙成员的伤害和蟹形水爆范围；4 级选择远程水弹或蟹形范围扑击。' } : {}) }];
  });
}

/** A branch is an explicit mutually exclusive decision, never a random drop. */
export function getUpgradeChoices(progress: SurvivalProgress, random: () => number = Math.random): UpgradeChoice[] {
  if (progress.skillLevel >= 4 && !progress.branch && SURVIVAL_BRANCHES[progress.charId]) {
    return SURVIVAL_BRANCHES[progress.charId].map(choice => ({ ...choice }));
  }
  const pool = eligibleChoices(progress);
  const choices: UpgradeChoice[] = [];
  for (const kind of ['core', 'secondary']) {
    const index = pool.findIndex(choice => choice.kind === kind);
    if (index >= 0) choices.push(...pool.splice(index, 1));
  }
  while (pool.length && choices.length < 3) {
    const roll = Math.max(0, Math.min(0.999999, random()));
    choices.push(...pool.splice(Math.floor(roll * pool.length), 1));
  }
  return choices;
}

/** Return a genuinely different ordinary offer, or null without spending a reroll. */
export function rerollUpgradeChoices(progress: SurvivalProgress, current: UpgradeChoice[], random: () => number = Math.random): UpgradeChoice[] | null {
  if (current.length !== 3 || current.some(choice => choice.kind === 'branch') || (progress.skillLevel >= 4 && !progress.branch)) return null;
  const pool = eligibleChoices(progress);
  const next: UpgradeChoice[] = [];
  for (const kind of ['core', 'secondary']) {
    const index = pool.findIndex(choice => choice.kind === kind);
    if (index >= 0) next.push(...pool.splice(index, 1));
  }
  const unseen = pool.filter(choice => !current.some(previous => previous.id === choice.id));
  if (!unseen.length) return null;
  const index = (length: number) => Math.floor(Math.max(0, Math.min(0.999999, random())) * length);
  const replacement = unseen[index(unseen.length)];
  next.push(replacement);
  pool.splice(pool.findIndex(choice => choice.id === replacement.id), 1);
  while (pool.length && next.length < 3) next.push(...pool.splice(index(pool.length), 1));
  return next;
}

/** Pure transaction: unknown, stale, maxed, cross-character and unoffered picks fail. */
export function applyChoice(progress: SurvivalProgress, choiceId: string, offeredChoices: UpgradeChoice[]): SurvivalProgress | null {
  const offered = offeredChoices.find(choice => choice.id === choiceId);
  if (!offered) return null;
  const branchChoices = progress.skillLevel >= 4 && !progress.branch ? SURVIVAL_BRANCHES[progress.charId] : null;
  const allowed = branchChoices || eligibleChoices(progress);
  const valid = allowed.find(choice => choice.id === choiceId && choice.level === offered.level);
  if (!valid) return null;
  const next = { ...progress, upgrades: { ...progress.upgrades } };
  if (valid.kind === 'core') next.skillLevel = valid.level;
  else if (valid.kind === 'secondary') next.secondaryLevel = valid.level;
  else if (valid.kind === 'branch') next.branch = valid.id;
  else next.upgrades[valid.id] = valid.level;
  return next;
}

export function getUpgradeSummary(progress: SurvivalProgress): { id: string; name: string; level: number }[] {
  const result = [{ id: 'core', name: '元素精修', level: progress.skillLevel }, { id: 'secondary', name: CHARACTERS.find(c => c.id === progress.charId)!.secondary.name, level: progress.secondaryLevel }];
  const chosenBranch = SURVIVAL_BRANCHES[progress.charId]?.find(choice => choice.id === progress.branch);
  if (chosenBranch) result.push({ id: chosenBranch.id, name: chosenBranch.name, level: 1 });
  for (const definition of UPGRADE_DEFINITIONS) {
    const level = progress.upgrades[definition.id];
    if (level > 0) result.push({ id: definition.id, name: definition.name, level });
  }
  return result;
}

export function getSurvivalStats(progress: SurvivalProgress) {
  const level = (id: string) => progress.upgrades[id] || 0;
  return {
    damageMultiplier: 1 + level('damage') * 0.15,
    speedMultiplier: 1 + level('speed') * 0.08,
    rangeMultiplier: 1 + level('range') * 0.1,
    maxHp: SURVIVAL_BASE_HP + level('vitality') * 25,
    armorMultiplier: 1 - level('armor') * 0.12,
    magnetRadius: 72 + level('magnet') * 35,
  };
}

/** One source for upgrade copy and actual secondary-skill form/scaling. */
export function getSecondaryProfile(charId: string, rawLevel: number) {
  const level = Math.max(1, Math.min(SURVIVAL_SKILL_CAP, Math.floor(rawLevel)));
  if (charId === 'zhongli' || charId === 'furina') {
    const geo = charId === 'zhongli';
    const damageMultiplier = geo ? (19 + level * 3) / 22 : (13 + level * 2.5) / 15.5;
    const rangeMultiplier = geo ? (145 + level * 12) / 157 : (155 + level * 10) / 165;
    const cooldownMultiplier = 1 - (level - 1) * .05;
    return { level, count: 1, piercing: false, damageMultiplier, rangeMultiplier, cooldownMultiplier,
      description: geo ? `天星半径 ${145 + level * 12}，石化普通敌人 ${((45 + level * 4) / 60).toFixed(1)} 秒（精英缩短，首领免疫）；伤害 +${Math.round((damageMultiplier - 1) * 100)}%，冷却缩短 ${Math.round((1 - cooldownMultiplier) * 100)}%。`
        : `水幕半径 ${155 + level * 10}，自身与沙龙成员伤害提高 ${Math.round((.2 + level * .035) * 100)}%，持续 ${(6 + level * .4).toFixed(1)} 秒；未召宠也可造成开场伤害，冷却缩短 ${Math.round((1 - cooldownMultiplier) * 100)}%。` };
  }
  const count = charId === 'raiden' ? (level >= 5 ? 3 : level >= 3 ? 2 : 1)
    : charId === 'jean' ? (level >= 3 ? 2 : 1)
    : charId === 'eula' ? (level >= 5 ? 7 : level >= 3 ? 5 : 3)
    : charId === 'diluc' ? (level >= 5 ? 2 : 1) : level >= 5 ? 2 : level >= 3 ? 1 : 0;
  const piercing = charId === 'diluc' && level >= 3;
  const forms: Record<string, string> = {
    raiden: `${count} 道贯穿雷柱`,
    jean: `${count} 道升流风场${level >= 5 ? '，风场大幅扩展' : ''}`,
    eula: `${count} 枚扇形冰晶，命中减速 1.8 秒`,
    diluc: `${count} 只赤焰火鸟${piercing ? '，穿透沿途敌人' : '，命中后消散'}`,
    xiao: `水平枪突${count ? `，追加 ${count} 道穿透风刃` : ''}`,
  };
  const damageMultiplier = 1 + (level - 1) * 0.18;
  const rangeMultiplier = 1 + (level - 1) * 0.07 + (charId === 'jean' && level >= 5 ? 0.32 : 0);
  const cooldownMultiplier = 1 - (level - 1) * 0.05;
  return { level, count, piercing, damageMultiplier, rangeMultiplier, cooldownMultiplier,
    description: `${forms[charId]}；伤害 +${Math.round((damageMultiplier - 1) * 100)}%，范围 +${Math.round((rangeMultiplier - 1) * 100)}%，冷却缩短 ${Math.round((1 - cooldownMultiplier) * 100)}%。` };
}
