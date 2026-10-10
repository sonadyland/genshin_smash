// ============================================================
// 提瓦特大乱斗 — 数据定义：角色 / 招式 / 道具 / 地图
// ============================================================

export interface MoveDef {
  name: string;
  dmg: number;      // 伤害百分比
  kb: number;       // 基础击飞力
  kbs: number;      // 击飞成长（随对手百分比）
  angle: number;    // 击飞角度（度，0=水平，90=正上方）
  startup: number;  // 前摇帧
  active: number;   // 判定帧
  endlag: number;   // 后摇帧
  reach: number;    // 判定距离（像素）
  height: number;   // 判定高度
  kind: 'jab' | 'smash' | 'special' | 'secondary';
  effect?: 'projectile' | 'dash' | 'spin' | 'gust' | 'plunge' | 'thunder' | 'updraft' | 'frost' | 'phoenix' | 'thrust' | 'geo-pillar' | 'geo-meteor' | 'salon' | 'revelry';
}

export interface CharDef {
  id: string;
  name: string;
  title: string;
  color: string;      // 主题色
  dark: string;       // 深色
  hair: string;       // 发色
  weight: number;     // 体重（越大越难击飞）
  speed: number;      // 地面速度
  jump: number;       // 跳跃力
  airDrift: number;   // 空中机动
  gravMul: number;    // 重力系数（<1 更飘）
  weapon: 'sword' | 'claymore' | 'polearm';
  jab: MoveDef;
  smash: MoveDef;
  special: MoveDef;
  secondary: MoveDef;
  secondaryDesc: string;
  secondaryCooldown: number;
  specialCooldown?: number;
  desc: string;
}

export const CHARACTERS: CharDef[] = [
  {
    id: 'raiden',
    name: '雷电将军',
    title: '一心净土',
    color: '#9b6dd8',
    dark: '#4b2a78',
    hair: '#7a4fc0',
    weight: 95,
    speed: 4.6,
    jump: 12.6,
    airDrift: 0.38,
    gravMul: 1.0,
    weapon: 'sword',
    jab:     { name: '连突',     dmg: 4,  kb: 2.2, kbs: 0.055, angle: 30, startup: 6,  active: 4, endlag: 10, reach: 54, height: 40, kind: 'jab' },
    smash:   { name: '无想的一刀', dmg: 13, kb: 5.4, kbs: 0.098, angle: 40, startup: 20, active: 6, endlag: 26, reach: 80, height: 52, kind: 'smash' },
    special: { name: '梦想一刀', dmg: 10, kb: 4.2, kbs: 0.070, angle: 35, startup: 14, active: 4, endlag: 18, reach: 60, height: 46, kind: 'special', effect: 'projectile' },
    secondary: { name: '雷罚·天光', dmg: 17, kb: 5, kbs: 0.075, angle: 78, startup: 17, active: 7, endlag: 23, reach: 140, height: 230, kind: 'secondary', effect: 'thunder' },
    secondaryDesc: '向前方召下一道雷罚光柱，贯穿上下空间。', secondaryCooldown: 4.5,
    desc: '均衡迅捷的雷之剑士，特殊技可放出远程雷光斩。',
  },
  {
    id: 'jean',
    name: '琴',
    title: '蒲公英骑士',
    color: '#6fb7e8',
    dark: '#2d5a86',
    hair: '#e8cf8a',
    weight: 88,
    speed: 4.2,
    jump: 13.0,
    airDrift: 0.46,
    gravMul: 0.88,
    weapon: 'sword',
    jab:     { name: '西风剑术', dmg: 3.5, kb: 2.0, kbs: 0.050, angle: 30, startup: 5,  active: 4, endlag: 9,  reach: 52, height: 38, kind: 'jab' },
    smash:   { name: '压制之剑', dmg: 11, kb: 5.0, kbs: 0.090, angle: 42, startup: 18, active: 6, endlag: 24, reach: 74, height: 50, kind: 'smash' },
    special: { name: '风压剑',   dmg: 5,  kb: 8.0, kbs: 0.055, angle: 16, startup: 12, active: 8, endlag: 16, reach: 160, height: 70, kind: 'special', effect: 'gust' },
    secondary: { name: '风起·升流', dmg: 10, kb: 7.5, kbs: 0.06, angle: 88, startup: 12, active: 8, endlag: 20, reach: 145, height: 180, kind: 'secondary', effect: 'updraft' },
    secondaryDesc: '上挑剑锋唤起升流风场，将前方敌人抬起。', secondaryCooldown: 5,
    desc: '身法飘逸的风之骑士，风压剑可将敌人远远推开。',
  },
  {
    id: 'eula',
    name: '优菈',
    title: '浪沫的旋舞',
    color: '#7fd4e8',
    dark: '#2e6a80',
    hair: '#a8d8e8',
    weight: 112,
    speed: 3.6,
    jump: 11.6,
    airDrift: 0.30,
    gravMul: 1.05,
    weapon: 'claymore',
    jab:     { name: '挥斩',     dmg: 5,  kb: 2.6, kbs: 0.058, angle: 32, startup: 8,  active: 5, endlag: 13, reach: 58, height: 44, kind: 'jab' },
    smash:   { name: '浪沫旋斩', dmg: 17, kb: 6.2, kbs: 0.108, angle: 44, startup: 26, active: 7, endlag: 30, reach: 86, height: 56, kind: 'smash' },
    special: { name: '冰潮旋舞', dmg: 14, kb: 5.6, kbs: 0.082, angle: 62, startup: 20, active: 12, endlag: 24, reach: 128, height: 120, kind: 'special', effect: 'spin' },
    secondary: { name: '霜华·断浪', dmg: 5, kb: 2.8, kbs: 0.045, angle: 25, startup: 15, active: 7, endlag: 22, reach: 210, height: 100, kind: 'secondary', effect: 'frost' },
    secondaryDesc: '挥动大剑释放三枚扇形冰晶，命中后减速。', secondaryCooldown: 4,
    desc: '沉重强悍的冰之大剑，旋转斩击可命中两侧敌人。',
  },
  {
    id: 'diluc',
    name: '迪卢克',
    title: '晨曦的暗面',
    color: '#e86a4a',
    dark: '#7a2a1a',
    hair: '#c03a28',
    weight: 105,
    speed: 4.0,
    jump: 11.9,
    airDrift: 0.34,
    gravMul: 1.0,
    weapon: 'claymore',
    jab:     { name: '淬炼之剑', dmg: 4.5, kb: 2.4, kbs: 0.056, angle: 30, startup: 7,  active: 5, endlag: 12, reach: 56, height: 42, kind: 'jab' },
    smash:   { name: '逆焰之刃', dmg: 15, kb: 5.8, kbs: 0.100, angle: 40, startup: 24, active: 7, endlag: 28, reach: 82, height: 54, kind: 'smash' },
    special: { name: '黎明',     dmg: 12, kb: 5.2, kbs: 0.078, angle: 32, startup: 12, active: 12, endlag: 20, reach: 64, height: 56, kind: 'special', effect: 'dash' },
    secondary: { name: '赤羽·燎空', dmg: 16, kb: 5.4, kbs: 0.08, angle: 42, startup: 18, active: 8, endlag: 25, reach: 300, height: 100, kind: 'secondary', effect: 'phoenix' },
    secondaryDesc: '上挑火剑放出向前飞行的赤焰火鸟。', secondaryCooldown: 5,
    desc: '烈焰缠身的大剑斗士，特殊技向前烈火突进。',
  },
  {
    id: 'xiao',
    name: '魈',
    title: '降魔大圣',
    color: '#55e4c2',
    dark: '#164f52',
    hair: '#244f54',
    weight: 90,
    speed: 4.7,
    jump: 14.1,
    airDrift: 0.46,
    gravMul: 0.96,
    weapon: 'polearm',
    jab:     { name: '卷积微尘', dmg: 4, kb: 2.2, kbs: 0.052, angle: 28, startup: 7, active: 4, endlag: 12, reach: 72, height: 32, kind: 'jab' },
    smash:   { name: '靖妖枪舞', dmg: 13, kb: 5.4, kbs: 0.094, angle: 55, startup: 22, active: 6, endlag: 27, reach: 88, height: 56, kind: 'smash' },
    special: { name: '靖妖傩舞·坠星', dmg: 15, kb: 5.8, kbs: 0.092, angle: 68, startup: 9, active: 6, endlag: 28, reach: 108, height: 76, kind: 'special', effect: 'plunge' },
    secondary: { name: '风轮两立', dmg: 12, kb: 4.5, kbs: 0.075, angle: 28, startup: 7, active: 12, endlag: 16, reach: 82, height: 90, kind: 'secondary', effect: 'thrust' },
    secondaryDesc: '地面或空中向当前朝向水平持枪突进；不会自动起跳或转向。', secondaryCooldown: 3.5,
    desc: '仅在空中释放：短暂蓄势后持枪垂直下坠，刺穿下方敌人，落地掀起两侧风浪。',
  },
  {
    id: 'zhongli', name: '钟离', title: '尘世闲游', color: '#e4b65b', dark: '#674421', hair: '#49382e',
    weight: 116, speed: 3.8, jump: 12.0, airDrift: 0.32, gravMul: 1.02, weapon: 'polearm',
    jab: { name: '岩雨·贯虹', dmg: 4.5, kb: 2.5, kbs: 0.055, angle: 30, startup: 10, active: 5, endlag: 15, reach: 81, height: 38, kind: 'jab' },
    smash: { name: '贯虹重刺', dmg: 14, kb: 5.8, kbs: 0.096, angle: 38, startup: 22, active: 6, endlag: 24, reach: 105, height: 48, kind: 'smash' },
    special: { name: '地心', dmg: 7, kb: 3.2, kbs: 0.04, angle: 60, startup: 48, active: 8, endlag: 22, reach: 160, height: 160, kind: 'special', effect: 'geo-pillar' },
    secondary: { name: '天星', dmg: 19, kb: 5.5, kbs: 0.07, angle: 70, startup: 50, active: 8, endlag: 24, reach: 290, height: 205, kind: 'secondary', effect: 'geo-meteor' },
    specialCooldown: 8, secondaryCooldown: 10,
    secondaryDesc: '向前方降下天星，造成范围岩伤与短暂石化。',
    desc: '交叉蓄力后展开玉璋护盾，立起持续共鸣的岩柱。护盾吸收伤害，岩柱不会阻挡移动。',
  },
  {
    id: 'furina', name: '芙宁娜', title: '不休独舞', color: '#71c7f4', dark: '#234b83', hair: '#d8eafb',
    weight: 87, speed: 4.2, jump: 12.8, airDrift: 0.41, gravMul: 0.94, weapon: 'sword',
    jab: { name: '独舞·致意', dmg: 4, kb: 2.1, kbs: 0.052, angle: 28, startup: 9, active: 4, endlag: 13, reach: 68, height: 37, kind: 'jab' },
    smash: { name: '水幕重刺', dmg: 12, kb: 5.1, kbs: 0.091, angle: 38, startup: 20, active: 6, endlag: 23, reach: 92, height: 48, kind: 'smash' },
    special: { name: '孤心沙龙', dmg: 5, kb: 2.6, kbs: 0.035, angle: 42, startup: 46, active: 8, endlag: 28, reach: 100, height: 105, kind: 'special', effect: 'salon' },
    secondary: { name: '万众狂欢', dmg: 13, kb: 4.3, kbs: 0.065, angle: 52, startup: 42, active: 8, endlag: 26, reach: 235, height: 175, kind: 'secondary', effect: 'revelry' },
    specialCooldown: 8, secondaryCooldown: 10,
    secondaryDesc: '展开水幕打击前方，并暂时强化自身与沙龙成员；没有宠物时同样有效。',
    desc: '脱帽致意后请出三位沙龙成员，分别发射泡泡、穿刺水流与蟹钳水爆。重召会刷新成员。',
  },
];

// ============================================================
// 道具（共 5 个）
// ============================================================

export interface ItemDef {
  id: string;
  name: string;
  color: string;
  kind: 'instant' | 'holdable';
  desc: string;
}

export const ITEMS: ItemDef[] = [
  { id: 'heal',  name: '仙跳墙',     color: '#f0c040', kind: 'instant',  desc: '回复 30% 伤害' },
  { id: 'bomb',  name: '蹦蹦炸弹',   color: '#e04838', kind: 'holdable', desc: '投掷后爆炸，大范围高击飞' },
  { id: 'gust',  name: '风神之恩惠', color: '#58d8b0', kind: 'instant',  desc: '6 秒移动与跳跃提升' },
  { id: 'power', name: '武人的酒杯', color: '#e87898', kind: 'instant',  desc: '6 秒攻击力提升 30%' },
  { id: 'slime', name: '史莱姆凝液', color: '#68c048', kind: 'holdable', desc: '投掷命中使敌人减速 3 秒' },
];

// ============================================================
// 地图：浮空岛「群玉之巅」（唯一地图）
// ============================================================

export const STAGE = {
  name: '群玉之巅',
  // 主平台（实心，两侧可坠落）
  main: { x: 340, y: 540, w: 600, h: 70 },
  // 软平台（可从下方穿过，按下下落）
  soft: [
    { x: 420, y: 410, w: 150 },
    { x: 710, y: 410, w: 150 },
    { x: 565, y: 285, w: 150 },
  ],
  // 边界（击杀区域在边界外）
  blast: { left: -140, right: 1420, top: -260, bottom: 900 },
};

export const WORLD = { w: 1280, h: 720 };
