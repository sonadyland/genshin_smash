import { CHARACTERS } from './data';
/** Shared rules for the manual-combat, ten-minute survival mode. */
export type SurvivalPhase = 'playing' | 'paused' | 'upgrade' | 'victory' | 'defeat';
export type SurvivalVariant = 'survival' | 'tactical' | 'expedition';
export type TacticalMapId = 'wind-ruins' | 'broken-bridge' | 'mechanism-hall';
export interface SurvivalOptions { player: number; variant?: SurvivalVariant; mapId?: TacticalMapId }
export interface TacticalStats { windRides: number; layerChanges: number; guardsBroken: number; chargesEvaded: number }
export interface SurvivalWorld {
  width: number; height: number; groundY: number;
  terrain: { x: number; y: number }[];
  platforms: { x: number; y: number; w: number }[];
}
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
  variant: SurvivalVariant;
  mapId: TacticalMapId;
  mapName: string;
  duration: number;
  encounterName: string;
  encounterIndex: number;
  tacticalStats: TacticalStats;
  tacticalHazards: TacticalHazardSnapshot[];
  expedition: ExpeditionSnapshot | null;
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
export const SURVIVAL_WORLD: SurvivalWorld = {
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
export function groundHeightAt(x: number, world: SurvivalWorld = SURVIVAL_WORLD): number {
  const points = world.terrain;
  const position = Math.max(0, Math.min(world.width, x));
  for (let i = 1; i < points.length; i++) {
    if (position <= points[i].x) {
      const a = points[i - 1], b = points[i];
      return a.y + (b.y - a.y) * (position - a.x) / (b.x - a.x);
    }
  }
  return points[points.length - 1].y;
}
export const TACTICAL_DURATION = 90;
/** Three stacked fighting lanes, with a continuous walking route up the east slope. */
export const TACTICAL_WORLD: SurvivalWorld = {
  width: 2200, height: 1080, groundY: 900,
  terrain: [
    { x: 0, y: 900 }, { x: 1150, y: 900 }, { x: 1500, y: 700 },
    { x: 1680, y: 700 }, { x: 2000, y: 500 }, { x: 2200, y: 500 },
  ],
  platforms: [
    { x: 230, y: 700, w: 720 }, { x: 1050, y: 700, w: 460 },
    { x: 560, y: 500, w: 600 }, { x: 1280, y: 500, w: 730 },
  ],
};
export interface TacticalWind { x: number; width: number; bottom: number; top: number }
export const TACTICAL_WIND: TacticalWind = { x: 790, width: 112, bottom: 900, top: 440 };
export type TacticalEnemyRole = 'guard' | 'charger' | 'sniper';
export interface TacticalSpawn { role: TacticalEnemyRole; x: number; y: number }
export interface TacticalEncounter { start: number; name: string; hint: string; enemies: TacticalSpawn[] }
export interface TacticalLandmark { x: number; y: number; number: string; name: string; detail: string; color: string }
export interface TacticalHazard {
  id: string; name: string; x: number; y: number; width: number; height: number;
  periodFrames: number; offsetFrames: number; warningFrames: number; activeFrames: number; damage: number;
}
export interface TacticalHazardSnapshot extends TacticalHazard {
  state: 'off' | 'warning' | 'active'; phaseRemaining: number; cycleIndex: number;
}
export interface TacticalMapDefinition {
  id: TacticalMapId; name: string; subtitle: string; description: string;
  world: SurvivalWorld; wind: TacticalWind | null; spawnX: number;
  encounters: TacticalEncounter[]; landmarks: TacticalLandmark[]; routeHint: string;
  routeLabel: { x: number; y: number };
  hazards?: TacticalHazard[];
}
export const TACTICAL_ENCOUNTERS: TacticalEncounter[] = [
  { start: 0, name: '01 · 破阵登高', hint: '风井登高，优先压制射手 · 重击 K 可破盾', enemies: [
    { role: 'guard', x: 550, y: 700 }, { role: 'charger', x: 1060, y: 900 }, { role: 'sniper', x: 1010, y: 500 },
  ] },
  { start: 30, name: '02 · 两翼夹击', hint: '冲锋锁定后跳过或闪避 · S 下穿并压住风井', enemies: [
    { role: 'guard', x: 1180, y: 700 }, { role: 'charger', x: 300, y: 900 },
    { role: 'sniper', x: 1470, y: 500 }, { role: 'guard', x: 800, y: 500 },
  ] },
  { start: 60, name: '03 · 三线合围', hint: '变换楼层切断射线 · 抓住蓝色恢复窗口反击', enemies: [
    { role: 'guard', x: 600, y: 700 }, { role: 'charger', x: 1080, y: 900 },
    { role: 'sniper', x: 960, y: 500 }, { role: 'charger', x: 1560, y: 700 }, { role: 'sniper', x: 2080, y: 500 },
  ] },
];
export const TACTICAL_MAPS: Record<TacticalMapId, TacticalMapDefinition> = {
  'wind-ruins': {
    id: 'wind-ruins', name: '风井遗迹', subtitle: '三层地形 · 公共风井',
    description: '借风井快速登高，在三层遗迹之间切换，压制射手并绕后破盾。',
    world: TACTICAL_WORLD, wind: TACTICAL_WIND, spawnX: 400, encounters: TACTICAL_ENCOUNTERS,
    landmarks: [
      { x: 325, y: 500, number: '03', name: '风蚀高台', detail: '压制射手', color: '#b9d9f1' },
      { x: 130, y: 700, number: '02', name: '遗迹廊桥', detail: '绕后破盾', color: '#e2d4a3' },
      { x: 120, y: 900, number: '01', name: '元素谷地', detail: '诱导冲锋', color: '#a1d8c8' },
    ],
    routeHint: '沿坡道步行登高 →', routeLabel: { x: 1420, y: 817 },
  },
  'broken-bridge': {
    id: 'broken-bridge', name: '断桥回廊', subtitle: '断桥两岸 · 中央落脚台',
    description: '二段跳跨过断桥，或下穿桥面进入谷地。中央平台与两侧缓坡提供回桥路线。',
    world: {
      width: 2200, height: 1080, groundY: 900,
      terrain: [
        { x: 0, y: 580 }, { x: 300, y: 580 }, { x: 780, y: 900 },
        { x: 1420, y: 900 }, { x: 1900, y: 580 }, { x: 2200, y: 580 },
      ],
      platforms: [
        { x: 300, y: 580, w: 690 }, { x: 1210, y: 580, w: 690 }, { x: 970, y: 740, w: 260 },
      ],
    },
    wind: null, spawnX: 200,
    encounters: [
      { start: 0, name: '01 · 断桥试探', hint: '桥面重击破盾 · 二段跳跨断口，也可下穿桥面', enemies: [
        { role: 'guard', x: 610, y: 580 }, { role: 'charger', x: 1130, y: 900 }, { role: 'sniper', x: 840, y: 580 },
      ] },
      { start: 30, name: '02 · 上下夹击', hint: '中央台二段跳回桥 · 沿两侧缓坡也能返回高处', enemies: [
        { role: 'guard', x: 1530, y: 580 }, { role: 'charger', x: 780, y: 900 },
        { role: 'sniper', x: 1370, y: 580 }, { role: 'guard', x: 1100, y: 740 },
      ] },
      { start: 60, name: '03 · 两岸合围', hint: '落差避开冲锋 · 抓住射手与盾卫的蓝色恢复窗口', enemies: [
        { role: 'guard', x: 910, y: 580 }, { role: 'charger', x: 1220, y: 900 },
        { role: 'sniper', x: 680, y: 580 }, { role: 'charger', x: 1570, y: 580 }, { role: 'sniper', x: 1770, y: 580 },
      ] },
    ],
    landmarks: [
      { x: 320, y: 580, number: '01', name: '西岸廊桥', detail: '重击破盾 · 下穿转线', color: '#e2d4a3' },
      { x: 1040, y: 740, number: '02', name: '中央落脚台', detail: '二段跳返回桥面', color: '#a1d8c8' },
      { x: 1450, y: 580, number: '03', name: '东岸回廊', detail: '压制射手 · 跨岸反击', color: '#b9d9f1' },
    ],
    routeHint: '← 两侧缓坡回桥 · 中央二段跳 ↑', routeLabel: { x: 1100, y: 935 },
  },
  'mechanism-hall': {
    id: 'mechanism-hall', name: '机关回廊', subtitle: '错峰地火 · 避险高台',
    description: '黄纹预警后地火喷发，跳上避险台或暂退，等待熄火再穿行。地火不伤敌人。',
    world: {
      width: 2200, height: 1080, groundY: 900,
      terrain: [{ x: 0, y: 900 }, { x: 2200, y: 900 }],
      platforms: [
        { x: 380, y: 790, w: 450 }, { x: 960, y: 790, w: 280 },
        { x: 1420, y: 790, w: 400 }, { x: 825, y: 590, w: 550 },
      ],
    },
    wind: null, spawnX: 240,
    hazards: [
      { id: 'west-fire', name: '西侧地火', x: 520, y: 900, width: 260, height: 48, periodFrames: 960, offsetFrames: 360, warningFrames: 120, activeFrames: 120, damage: 8 },
      { id: 'east-fire', name: '东侧地火', x: 1430, y: 900, width: 260, height: 48, periodFrames: 960, offsetFrames: 840, warningFrames: 120, activeFrames: 120, damage: 8 },
    ],
    encounters: [
      { start: 0, name: '01 · 识破机关', hint: '黄纹预警 → 红色喷发 · 跳上避险台或暂退，地火不伤敌人', enemies: [
        { role: 'guard', x: 650, y: 790 }, { role: 'charger', x: 1100, y: 900 }, { role: 'sniper', x: 1170, y: 590 },
      ] },
      { start: 30, name: '02 · 错峰转线', hint: '两侧地火交错启动 · 等熄火后转线，平台上也要提防盾卫', enemies: [
        { role: 'guard', x: 1570, y: 790 }, { role: 'charger', x: 340, y: 900 },
        { role: 'sniper', x: 1730, y: 790 }, { role: 'guard', x: 1010, y: 790 },
      ] },
      { start: 60, name: '03 · 高低合围', hint: '借高台避开地火 · 压制射手，再趁蓝色恢复窗口反击', enemies: [
        { role: 'guard', x: 760, y: 790 }, { role: 'charger', x: 1130, y: 900 },
        { role: 'sniper', x: 945, y: 590 }, { role: 'charger', x: 1660, y: 900 }, { role: 'sniper', x: 1530, y: 790 },
      ] },
    ],
    landmarks: [
      { x: 410, y: 790, number: '01', name: '西侧避险台', detail: '黄纹预警 → 红色喷发', color: '#ecd097' },
      { x: 870, y: 590, number: '02', name: '中央制高点', detail: '二段跳登高 · 压制射手', color: '#b9d9f1' },
      { x: 1450, y: 790, number: '03', name: '东侧避险台', detail: '错峰穿行 · 地火不伤敌人', color: '#ecd097' },
    ],
    routeHint: '黄纹预警 → 红色喷发 · 跳上避险台或暂退 · 地火不伤敌人', routeLabel: { x: 1100, y: 937 },
  },
};

/** Unknown persisted or external IDs always fall back to the original arena. */
export function getTacticalMap(id?: TacticalMapId | string): TacticalMapDefinition {
  return id === 'broken-bridge' || id === 'mechanism-hall' ? TACTICAL_MAPS[id] : TACTICAL_MAPS['wind-ruins'];
}

export interface ExpeditionRegion {
  id: TacticalMapId; name: string; startX: number; endX: number; offsetX: number;
  color: string; objective: string;
}
export interface ExpeditionSnapshot {
  regionId: TacticalMapId; regionName: string; visitedRegions: TacticalMapId[];
  objective: string; bossStarted: boolean;
}
export const EXPEDITION_REGIONS: ExpeditionRegion[] = [
  { id: 'wind-ruins', name: '风井遗迹', startX: 0, endX: 2300, offsetX: 0, color: '#95d8c1', objective: '借风井登高，沿东侧坡道前往断桥 →' },
  { id: 'broken-bridge', name: '断桥回廊', startX: 2300, endX: 4800, offsetX: 2400, color: '#c7d0e8', objective: '跨过断桥或走谷底，继续向东探索机关 →' },
  { id: 'mechanism-hall', name: '机关回廊', startX: 4800, endX: 7200, offsetX: 5000, color: '#e5bd88', objective: '观察地火节拍，在高台之间往返作战' },
];
/** Authored arenas retain their geometry; adjoining endpoints form walkable links. */
export const EXPEDITION_WORLD: SurvivalWorld = {
  width: 7200, height: 1080, groundY: 900,
  terrain: EXPEDITION_REGIONS.flatMap(region => TACTICAL_MAPS[region.id].world.terrain.map(point => ({ ...point, x: point.x + region.offsetX }))),
  platforms: EXPEDITION_REGIONS.flatMap(region => TACTICAL_MAPS[region.id].world.platforms.map(platform => ({ ...platform, x: platform.x + region.offsetX }))),
};
export function getExpeditionRegion(x: number): ExpeditionRegion {
  return EXPEDITION_REGIONS.find(region => x < region.endX) ?? EXPEDITION_REGIONS[EXPEDITION_REGIONS.length - 1];
}
/** Shared absolute-coordinate capabilities used by physics and rendering. */
export const EXPEDITION_MAPS: TacticalMapDefinition[] = EXPEDITION_REGIONS.map(region => {
  const map = TACTICAL_MAPS[region.id];
  return { ...map, world: EXPEDITION_WORLD, spawnX: map.spawnX + region.offsetX,
    wind: map.wind ? { ...map.wind, x: map.wind.x + region.offsetX } : null,
    hazards: map.hazards?.map(hazard => ({ ...hazard, x: hazard.x + region.offsetX })),
    landmarks: map.landmarks.map(label => ({ ...label, x: label.x + region.offsetX })),
    routeLabel: { ...map.routeLabel, x: map.routeLabel.x + region.offsetX },
    encounters: map.encounters.map(encounter => ({ ...encounter, enemies: encounter.enemies.map(enemy => ({ ...enemy, x: enemy.x + region.offsetX })) })),
  };
});
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
  tharja: [
    branch('tharja-coven', '群咒牵引', '吸命同时额外牵引 2 名敌人，扩大前方范围；只有造成伤害后才恢复生命。', '#c5a2ef'),
    branch('tharja-vital', '噬命回响', '吸命强化伤害，每次施法的恢复上限增加 12 点；空放不恢复生命。', '#c5a2ef'),
  ],
  corrin: [
    branch('corrin-yato', '夜刀共鸣', '手动人形剑技伤害提高；白龙水弹增加穿透，强化切换后的定向突破。', '#b5e7f5'),
    branch('corrin-tide', '奔涌水脉', '白龙水弹化为扇形三连弹，高压水息增加一次脉冲，水爆范围扩大。', '#9ddfee'),
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

const THARJA_UPGRADE_DEFINITIONS: UpgradeChoice[] = [
  { id: 'tharja-flux', name: 'J · 暗流精修', description: '', kind: 'passive', level: 0, maxLevel: 3, color: '#c5a2ef' },
  { id: 'tharja-ruin', name: 'K · 重咒精修', description: '', kind: 'passive', level: 0, maxLevel: 3, color: '#d0b1f1' },
];

const CORRIN_UPGRADE_DEFINITIONS: UpgradeChoice[] = [
  { id: 'corrin-jab', name: 'J · 夜刀与水弹', description: '', kind: 'passive', level: 0, maxLevel: 3, color: '#b5e7f5' },
  { id: 'corrin-smash', name: 'K · 断空与水息', description: '', kind: 'passive', level: 0, maxLevel: 3, color: '#9ddfee' },
];
export function getCorrinSurvivalProfile(progress: SurvivalProgress) {
  const jab = Math.max(0, Math.min(3, progress.upgrades['corrin-jab'] ?? 0));
  const smash = Math.max(0, Math.min(3, progress.upgrades['corrin-smash'] ?? 0));
  const level = Math.max(1, Math.min(5, progress.skillLevel)), secondary = Math.max(1, Math.min(5, progress.secondaryLevel));
  return { jabDamage: 1 + jab * .15, smashDamage: 1 + smash * .15,
    masteryDamage: 1 + (level - 1) * .09, yatoDamage: progress.branch === 'corrin-yato' ? 1.25 : 1,
    orbCount: progress.branch === 'corrin-tide' ? 3 : jab >= 3 ? 2 : 1,
    orbPierce: 1 + (jab >= 2 ? 1 : 0) + (progress.branch === 'corrin-yato' ? 2 : 0),
    beamTicks: smash >= 3 || progress.branch === 'corrin-tide' ? 4 : 3,
    burstRadius: 90 + (secondary - 1) * 12 + (progress.branch === 'corrin-tide' ? 25 : 0) };
}

/** The same form data drives upgrade copy and the manual spell adapter. */
export function getTharjaSurvivalProfile(progress: SurvivalProgress) {
  const flux = Math.max(0, Math.min(3, progress.upgrades['tharja-flux'] ?? 0));
  const ruin = Math.max(0, Math.min(3, progress.upgrades['tharja-ruin'] ?? 0));
  const main = Math.max(1, Math.min(5, progress.skillLevel));
  const secondary = Math.max(1, Math.min(5, progress.secondaryLevel));
  return {
    fluxCount: flux >= 3 ? 2 : 1,
    fluxPierce: flux >= 2 ? 3 : flux >= 1 ? 2 : 1,
    fluxDamage: 1 + flux * .12,
    ruinCount: ruin >= 3 ? 2 : 1,
    ruinDamage: 1 + ruin * .2,
    ruinBlast: 78 * (1 + ruin * .15),
    drainTargets: (main >= 5 ? 3 : main >= 3 ? 2 : 1) + (progress.branch === 'tharja-coven' ? 2 : 0),
    drainRange: progress.branch === 'tharja-coven' ? 1.25 : 1,
    drainDamage: progress.branch === 'tharja-vital' ? 1.25 : 1,
    drainHealCap: 12 + (main - 1) * 2 + (progress.branch === 'tharja-vital' ? 12 : 0),
    fieldDuration: 240 + (secondary - 1) * 30,
    fieldRadius: 116 + (secondary - 1) * 10.5,
    fieldTickFrames: 40 - (secondary - 1) * 3,
  };
}

function tharjaUpgradeDescription(id: string, level: number): string {
  const profile = getTharjaSurvivalProfile({ ...makeInitialProgress('tharja'), upgrades: { [id]: level } });
  return id === 'tharja-flux'
    ? `${profile.fluxCount} 枚手动暗流咒弹，每枚最多穿透 ${profile.fluxPierce} 名敌人；伤害 +${Math.round((profile.fluxDamage - 1) * 100)}%。`
    : `${profile.ruinCount} 枚手动重咒，命中爆破半径 ${Math.round(profile.ruinBlast)}；伤害 +${Math.round((profile.ruinDamage - 1) * 100)}%。`;
}

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
  const definitions = progress.charId === 'tharja' ? [...UPGRADE_DEFINITIONS, ...THARJA_UPGRADE_DEFINITIONS] : progress.charId === 'corrin' ? [...UPGRADE_DEFINITIONS, ...CORRIN_UPGRADE_DEFINITIONS] : UPGRADE_DEFINITIONS;
  return definitions.flatMap(definition => {
    const current = definition.kind === 'core' ? progress.skillLevel : definition.kind === 'secondary' ? progress.secondaryLevel : (progress.upgrades[definition.id] || 0);
    const maximum = definition.kind === 'core' || definition.kind === 'secondary' ? SURVIVAL_SKILL_CAP : definition.maxLevel;
    if (current >= maximum) return [];
    if (definition.kind === 'auxiliary' && !current && auxiliaryCount >= 2) return [];
    if (progress.charId === 'corrin') {
      const next = current + 1;
      const copy = definition.kind === 'core' ? { name: '人龙精修', description: `两形态手动攻击伤害 +${(next - 1) * 9}%，L 冷却缩短；4 级选择夜刀共鸣或奔涌水脉。` }
        : definition.kind === 'secondary' ? { name: 'I · 龙牙与水爆', description: getSecondaryProfile('corrin', next).description }
        : definition.id === 'corrin-jab' ? { description: `两形态 J 伤害 +${next * 15}%；${next >= 3 ? '白龙水弹双发并穿透 2 名敌人' : next >= 2 ? '白龙水弹穿透 2 名敌人' : '强化三段夜刀与单发水弹'}。` }
        : definition.id === 'corrin-smash' ? { description: `两形态 K 伤害 +${next * 15}%；${next >= 3 ? '高压水息在同一吐息时段增加至 4 次脉冲' : '强化人形下劈与白龙贯穿水息'}。` } : {};
      return [{ ...definition, ...copy, maxLevel: maximum, level: next }];
    }
    return [{ ...definition, maxLevel: maximum, level: current + 1, ...(definition.kind === 'secondary' ? { name: CHARACTERS.find(c => c.id === progress.charId)!.secondary.name, description: getSecondaryProfile(progress.charId, current + 1).description } : {}), ...(definition.kind === 'core' && progress.charId === 'zhongli' ? { description: '提升岩柱共鸣伤害、范围和护盾吸收量；4 级选择双柱或护盾岩震。' } : definition.kind === 'core' && progress.charId === 'furina' ? { description: '提升沙龙成员的伤害和蟹形水爆范围；4 级选择远程水弹或蟹形范围扑击。' } : definition.kind === 'core' && progress.charId === 'tharja' ? { name: '吸命精修', description: `提升吸命伤害、范围和恢复上限；${current + 1 >= 5 ? '同时牵引 3 名敌人' : current + 1 >= 3 ? '同时牵引 2 名敌人' : '牵引前方 1 名敌人'}，4 级选择群咒或噬命进化。` } : {}), ...(definition.id.startsWith('tharja-') ? { description: tharjaUpgradeDescription(definition.id, current + 1) } : {}) }];
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
  const result = [{ id: 'core', name: progress.charId === 'corrin' ? '人龙精修' : progress.charId === 'tharja' ? '吸命精修' : '元素精修', level: progress.skillLevel }, { id: 'secondary', name: progress.charId === 'corrin' ? 'I · 龙牙与水爆' : CHARACTERS.find(c => c.id === progress.charId)!.secondary.name, level: progress.secondaryLevel }];
  const chosenBranch = SURVIVAL_BRANCHES[progress.charId]?.find(choice => choice.id === progress.branch);
  if (chosenBranch) result.push({ id: chosenBranch.id, name: chosenBranch.name, level: 1 });
  for (const definition of [...UPGRADE_DEFINITIONS, ...THARJA_UPGRADE_DEFINITIONS, ...CORRIN_UPGRADE_DEFINITIONS]) {
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
  if (charId === 'corrin') {
    return { level, count: 1, piercing: true, damageMultiplier: 1 + (level - 1) * .18, rangeMultiplier: 1 + (level - 1) * .07, cooldownMultiplier: 1 - (level - 1) * .05,
      description: `人形龙牙贯穿前方敌人，白龙抛射水爆半径 ${90 + (level - 1) * 12}；两形态 I 伤害 +${(level - 1) * 18}%，共享冷却缩短 ${(level - 1) * 5}%。` };
  }
  if (charId === 'tharja') {
    const form = getTharjaSurvivalProfile({ ...makeInitialProgress('tharja'), secondaryLevel: level });
    const damageMultiplier = 1 + (level - 1) * .18;
    const cooldownMultiplier = 1 - (level - 1) * .05;
    return { level, count: 1, piercing: false, damageMultiplier, rangeMultiplier: form.fieldRadius / 116, cooldownMultiplier,
      description: `地面咒阵半径 ${Math.round(form.fieldRadius)}，持续 ${(form.fieldDuration / 60).toFixed(1)} 秒，每 ${(form.fieldTickFrames / 60).toFixed(2)} 秒脉冲；伤害 +${Math.round((damageMultiplier - 1) * 100)}%，冷却缩短 ${Math.round((1 - cooldownMultiplier) * 100)}%。` };
  }
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
