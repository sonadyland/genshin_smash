# 钟离地心：双臂交叉蓄力 / 水平展臂护盾

## 目标与范围

按用户确认修改地心：双手缓慢抬起，双前臂在胸前构成清晰的 X 形蓄力，再快速向左右平直展开释放护盾。只更换独立动作样板，不接入正式战斗。天星、枪术和其他角色素材均保留。

## 生成方式与文件

- 生成日期：2026-10-10。
- 生成方式：内置 `image_gen`，透明背景开启；未使用外部 API 或 CLI。
- 主造型参考：`assets/master.png`。
- 风格 / 网格参考：`assets/l-skill.png`（只参考外观和布局，不沿用旧的单掌动作）。
- 原始生成文件：`C:/Users/46637/.codex/generated_images/01a1248f-d048-7131-bb8a-83ebd92580e0/exec-bd3f743e-f4f3-455a-b5d9-776c2a3a8e2d.png`。
- 项目保存文件：`assets/l-skill-cross-charge.png`。
- 原文件直接复制，未裁切、缩放、去背或改写像素。旧 `l-skill.png` 保留供对比。

## 动作内容与阅读

1. 待势。
2. 双肘抬起，双前臂向胸前移动。
3. 前臂靠拢。
4. 双前臂形成 X 形。
5–8. 手在对侧肩附近，高位 X 形持续蓄力；低头和衣摆收拢表现蓄势。
9. 双肘向外突破，开始快速展开。
10. 双臂已伸直至肩高，是护盾释放到位帧。
11–13. 水平展开定势，衣摆甩动。
14–16. 双臂回收，恢复待势。

PNG 不包含护盾、岩柱、震波和烘焙光效；由独立预览 Canvas 在释放到位帧同步绘制。

## 素材 QA / 渲染建议

- 尺寸：1254 × 1254，RGBA，alpha 范围 0–255。
- 完全透明像素占比：约 54.75%。
- 共 16 个完整人物姿态，4 列 × 4 行；相机、面向和人物比例延续旧素材。
- 生成的实际行距略微偏离数学等分，必须使用非破坏性 source rectangle，而不要直接等高切成 313/314 px。
- 列边界：`[0, 313, 627, 940, 1254]`。
- 行边界：`[0, 319, 630, 941, 1254]`。
- 各行主体 alpha > 32 的局部垂直范围分别为：第 1 行 4–315；第 2 行 3–309；第 3 行 1–308；第 4 行 2–311。上述边界完整保留人物，不出现实轮廓串帧。
- 透明边缘带极低 alpha 噪点，锚点/主体范围检测使用大于 32 的 alpha；不改写 PNG 像素。
- 建议统一 displayScale 并按双脚落点对齐，不按各行源矩形高度重新缩放，以免人物呼吸式变大缩小。
- 展开到位为第 10 帧（零基 index 9），护盾爆发不能晚于此帧。

## 精确生成提示词

```text
Use case: stylized-concept.
Asset type: production 2D side-scrolling action game character animation sprite sheet, transparent PNG.
Primary request: Recreate Zhongli's hold-elemental-skill shield release as a 16-frame animation, clearly reading as SLOW BOTH-ARM X-CROSS CHARGE, then FAST POWERFUL HORIZONTAL DOUBLE-ARM OPENING.
Input images: Image 1 (master.png) is the authoritative identity / clothing / anime rendering reference. Image 2 (old l-skill.png) is a style, body-size and 4x4 layout reference ONLY. Replace the old action with the precise new choreography below.
Character: Zhongli from Genshin Impact, adult tall elegant male, long dark-brown coat with amber/gold lining and geometric trim, silver shoulder panels, black trousers and gloves, dark hair with long amber-ended tail. No polearm in this spell animation. Maintain the exact identity, outfit, adult proportions, detail level of the references.
Composition: EXACTLY 16 isolated complete full-body drawings, regular 4 columns × 4 rows, read left-to-right then top-to-bottom. Square canvas, equal cells; ALL figures must have matching head/body size, feet at same baseline per row, torso center fixed per column, same three-quarter body facing screen-right. No camera zoom, no crop, no overhead view. Generous transparent gutters between ALL cells, including above head and below boots; arms/hands/coattails remain fully inside each own cell. Deliver the largest clear high-resolution sheet available, target 2048 square.
Choreography, every numbered item is one cell (DO NOT DRAW NUMBERS):
1. Calm poised stance, arms lowered, feet planted.
2. BOTH upper arms rise together, elbows move outward/up, both forearms begin coming in toward the chest.
3. BOTH forearms approach upper chest, elbows away from ribs, wrists beginning to overlap.
4. BOTH forearms visibly cross diagonally in front of sternum, an obvious X.
5. The X tightens: right hand near left shoulder and left hand near right shoulder, forearms crossing over upper chest. Chin lowers slightly.
6. Strong sustained raised X-shaped crossed-forearm charging pose, wrists close to opposing shoulders, elbows lifted and pointed down/out, shoulders tensed. NOT a relaxed folded-arms pose.
7. Same clear X charge with slightly deeper grounded knees / shoulders braced; coat settles inward.
8. Peak charge: both forearms still a distinct X before chest, chin low, energy physically restrained, hands ready to forcefully push apart.
9. Explosive opening transitional pose: BOTH elbows drive laterally away from chest, forearms rapidly unfolding together.
10. Arms almost fully extended laterally to left and right, elbows nearly straight, chest expands, coat flares outward.
11. POWER RELEASE KEY: BOTH ARMS STRAIGHT OUT TO THE SIDES AT SHOULDER HEIGHT, left hand reaches far screen-left and right hand far screen-right, palms facing out, fingers naturally open. A strong near-horizontal line through both hands and shoulders. This is an assertive outward shield-push, NOT shrugging, NOT palms-up waist-height welcoming gesture.
12. Hold the same shoulder-height horizontal open-arm powerful pose, coat and hair at peak outward follow-through.
13. Continue horizontal straight-arm pose; weight firm, proud and serene face.
14. Begin controlled recovery: both elbows relax slightly and arms lower from shoulder height.
15. Arms return toward sides, coat settles.
16. Original calm poised stance restored.
Style/medium: crisp exquisite Japanese fantasy anime game sprites, clean hand-drawn ink contours, richly shaded cel painting, readable limbs and five-finger hands. Match the provided art closely. Small individual anatomy and cloth changes across frames; do not repeat one static figure translated or rotated.
Scene/backdrop: genuinely transparent alpha, no background.
Constraints: EXACTLY sixteen frames, equal regular grid, no drawn grid, no text, no numbers, no watermarks, no additional characters, no weapons, no pillar, no shield bubble, no magical ring, no particles, no glows around hands, no baked motion streaks. Effects will be rendered separately. Keep arm silhouettes completely legible. Never cut feet, head, hair or horizontal hands. Do not use the old single-palm press animation. Do not replace the X charge with ordinary relaxed folded arms. Do not open arms at waist height.
```
