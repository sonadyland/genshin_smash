# Tharja · 暗流咒击 / Flux 普攻动作样板 v1

日期：2026-10-13（Asia/Shanghai）。仅用于独立美术与动画预览，未接入正式战斗角色。

## 模式与范围

使用**内置 image_gen**，三次生成完成三张 2×2 透明动作图，每张四个真实姿势，共十二帧。未使用 CLI/API 备用路径。原始 PNG 直接复制，未脚本重绘、剪贴、缩放、去背景或修改像素。

动作：左手持续托住打开的魔导书，右手从书页引咒、收肘、前送、展掌释放，然后落回书页。人物保持原地自然前后脚站姿，膝和肩随承重轻动，没有近战冲刺、挥砍或拳击。飞行法球与短接触光完全由独立预览层绘制，人物图集不包含烘焙法球。

## 参考与生成方法

- 身份/服饰母版：`output/imagegen/tharja-awakening-portrait-v1.png`，用户已确认。
- 同一套侧身、比例、持书与脚间距参考：`assets/idle-a.png` 第一格。
- 钟离：`public/previews/zhongli-v1/prompts-art.md`，借鉴完整动作分镜、逐帧脚底锚点、保留完整手/脚/服饰和单独特效。
- 芙宁娜：`public/previews/furina-v1/prompts-proportions-j.md`、`README.md`，借鉴每张仅四姿势、母版固定比例、每张统一身高校准；不按每帧外框撑满高度。
- B 额外参考 A 衔接收肘待发；C 额外参考 A 中立和 B 收势。全部参考在生成前已查看。

## 输出

| 动作阶段 | 项目文件 | 内置原图 |
|---|---|---|
| 1–4 引咒/蓄势 | `assets/jab-a.png` | `C:/Users/46637/.codex/generated_images/01a1345a-add7-7580-8e7d-ce760c2a87a3/exec-da6b7e9f-fd3b-4fb2-ba0d-221625dd6652.png` |
| 5–8 前送/展掌/回卷 | `assets/jab-b.png` | `C:/Users/46637/.codex/generated_images/01a1345a-add7-7580-8e7d-ce760c2a87a3/exec-b8552e27-0e27-4910-b97f-6a574e5c1094.png` |
| 9–12 收手/归位 | `assets/jab-c.png` | `C:/Users/46637/.codex/generated_images/01a1345a-add7-7580-8e7d-ce760c2a87a3/exec-fc6941be-a269-4e98-9288-799e9ea2f008.png` |

全部 1254×1254 RGBA，每格 627×627。预览元数据：`jab.json`。可重跑登记脚本：`python scripts/register-tharja-jab-v1.py`。详细像素/哈希证据：`jab-validation.json`。

## 比例、锚点与时序

- 每张统一自然站姿身高：A 540px、B 552px、C 562px；按头顶到鞋底判断，未把举手、书或披风宽度纳入身高。
- 四帧共用同一张图的标定，不做逐帧或逐轴身体拉伸。局部略微屈膝和低头保留真实高度变化。
- 十二帧分别用两只承重鞋底的中点作为 pivot；避免披风随势摆动导致角色左右跳动。
- 十二帧 1,000ms，间隔 500ms。时长序列：70、80、90、90、65、100、60、70、75、85、95、120ms。
- 第六帧（0-based `releaseFrame=5`）在395ms展掌放咒，停留100ms。B2 的实际右掌中心位于格内 `[504,182]`，alpha252；不是书、透明点或假设投射点。
- 手势末端和中立姿态服饰、握书方向保持一致；正式攻击帧率和硬直留待用户确认后设计。
- 同一镜头小幅姿态变化来自实际重绘；没有用整体立绘移动来代替动作。

## 验证

登记脚本实测：十二格均有至少11px的 alpha>32 透明留边，人物/书/手/鞋/披风未跨格或裁断；三张源图与内置输出逐字节相同；登记运行不改变任何 PNG 像素。三张文件总计3,302,569字节。

工具查看时部分手指附近显示的亮红边，是极低 alpha RGB 残留。A/B 红色样本 alpha 仅1–4（不高于1.6%不透明度）；没有 alpha>16 的红色实体。原始透明通道保留，未脚本清理。最终以浏览器正常 alpha 合成检查为准。

## 完整生成提示词

三次调用都使用 `transparent_background: true`，引用图均通过 `referenced_image_paths` 传入。以下为实际完整提示词。

### A：引用批准立绘、idle-a

```text
Use case: stylized-concept.
Asset type: high-quality hand-painted transparent character animation sprites for a 2D side-scrolling anime game. Technical animation model sheet, not a poster.
Image 1 is the approved Tharja portrait, the identity/costume/anatomy authority. Image 2 is the approved neutral idle sheet, the camera angle, standing skeleton, foot spacing, tome size/position and sprite lighting reference.
Character: the adult Tharja from Fire Emblem Awakening, reserved serious expression, straight black hair to upper hips, blunt bangs, narrow gold circlet, dark eyes. Preserve the approved fully covering fitted black clothing with fine dark fabric texture, intact opaque base layer over torso/hips/legs, antique-gold collar/wrist/waist accents, dark navy-black rounded shoulder cape with muted purple lining and gold edge, slim gold-strapped shoes. Same costume, no new exposed skin, no embellishments.
ANATOMY LOCK: exact same slender adult skeleton, small refined head and long legs as the approved references, approximately 7.5 anatomical heads tall. Same head pixel size in all four poses. Natural crown to sole is the body height, not a raised hand or cape end. No cartoon enlarged head, no compact/chibi proportions, no broadened hips or chest, no deep crouch. Cloth and hair follow the body with tiny delayed movement only.
CAMERA AND CONTACT LOCK: three-quarter side view facing SCREEN RIGHT, no turning toward the viewer. Both feet planted with modest front/back spacing, no crossing legs. No translation/lunge/step; knees only softly flex to shift weight. Anatomical LEFT hand continuously supports the same open dark-bound grimoire at upper waist/lower chest with real visible palm under its spine/lower cover; book never floats or changes hands. Open book width about 24 percent of natural standing body height; keep its size stable. Anatomical RIGHT arm is free and gestures toward screen right; show the wrist and fingers clearly. One book, two arms, two legs.
LAYOUT: EXACTLY FOUR complete figures in a regular TWO-COLUMN TWO-ROW invisible grid, row-major order. Square high-resolution canvas, generous equal square cells, fixed virtual camera scale. Each figure natural head-to-sole height about 74 percent of cell height. Supporting feet baseline at about 87 percent of cell height. Feet midpoint around 44 percent of cell width, leaving ample space for the right arm. Whole head, hair, cape hems, both hands, book, both shoes fully inside each cell with clear transparent margins; no neighboring silhouettes overlap.
Render clean detailed cel-painted anime artwork matching portrait/idle reference, readable edges, restrained soft cool separation light across dark hair/cape/body. Keep genuine transparent alpha in all empty space. No background, ground, shadow, mist, halo, grid, frame borders, lettering, labels, numbers, watermarks. NO spell ball, NO magical glow, NO rings or flying projectiles: those will be drawn as separate layers. Hands and costume must remain fully readable.

PRIMARY REQUEST: the first FOUR successive poses (frames 1–4 of a 12-frame single ranged magic basic attack). Do not depict swordplay, punches, claws at an enemy, or melee lunges. This is precise, controlled tome-based spellcasting.
1. Neutral ready posture MATCHING the idle reference: tall composed stance, eyes right, LEFT hand supports open tome near upper waist/lower chest, RIGHT fingertips rest lightly above the pages. Feet fixed, relaxed shoulders.
2. Draw the spell: RIGHT wrist rises just above the open page with fingers gently curling, right elbow bends slightly; head dips toward the page a little. Left book stays steady.
3. Gather: RIGHT hand lifts to mid-chest just forward of the tome, fingers draw together and wrist turns outward; slight weight shift to rear foot and tiny shoulder coil, no large body turn. Book stays at same height.
4. Anticipation: right elbow drawn gently back toward ribs, right hand poised next to lower chest with fingers ready to open toward screen right. Chin lifts toward target, front knee soft, small cloth lag. End ready to extend the casting forearm.
Each pose must be separately drawn and anatomically progressive; no duplicate translated cutouts. Main differences are wrist/elbow/shoulder configuration. Keep the fixed skeleton, foot placement and readable hand-to-book contact in all four frames.
Match the visible scale relationships of the neutral sprite in reference image 2; the sprite reference establishes the exact hand grip and forward-foot relationship. Keep the SAME gold circlet silhouette, hair length and cape construction.
```

### B：引用批准立绘、idle-a、jab-a

```text
Use case: stylized-concept.
Asset type: high-quality hand-painted transparent character animation sprites for a 2D side-scrolling anime game. Technical animation model sheet, not a poster.
Image 1 is the approved Tharja portrait, the identity/costume/anatomy authority. Image 2 is the approved neutral idle sheet, the camera angle, standing skeleton, foot spacing, tome size/position and sprite lighting reference.
Character: the adult Tharja from Fire Emblem Awakening, reserved serious expression, straight black hair to upper hips, blunt bangs, narrow gold circlet, dark eyes. Preserve the approved fully covering fitted black clothing with fine dark fabric texture, intact opaque base layer over torso/hips/legs, antique-gold collar/wrist/waist accents, dark navy-black rounded shoulder cape with muted purple lining and gold edge, slim gold-strapped shoes. Same costume, no new exposed skin, no embellishments.
ANATOMY LOCK: exact same slender adult skeleton, small refined head and long legs as the approved references, approximately 7.5 anatomical heads tall. Same head pixel size in all four poses. Natural crown to sole is the body height, not a raised hand or cape end. No cartoon enlarged head, no compact/chibi proportions, no broadened hips or chest, no deep crouch. Cloth and hair follow the body with tiny delayed movement only.
CAMERA AND CONTACT LOCK: three-quarter side view facing SCREEN RIGHT, no turning toward the viewer. Both feet planted with modest front/back spacing, no crossing legs. No translation/lunge/step; knees only softly flex to shift weight. Anatomical LEFT hand continuously supports the same open dark-bound grimoire at upper waist/lower chest with real visible palm under its spine/lower cover; book never floats or changes hands. Open book width about 24 percent of natural standing body height; keep its size stable. Anatomical RIGHT arm is free and gestures toward screen right; show the wrist and fingers clearly. One book, two arms, two legs.
LAYOUT: EXACTLY FOUR complete figures in a regular TWO-COLUMN TWO-ROW invisible grid, row-major order. Square high-resolution canvas, generous equal square cells, fixed virtual camera scale. Each figure natural head-to-sole height about 74 percent of cell height. Supporting feet baseline at about 87 percent of cell height. Feet midpoint around 44 percent of cell width, leaving ample space for the right arm. Whole head, hair, cape hems, both hands, book, both shoes fully inside each cell with clear transparent margins; no neighboring silhouettes overlap.
Render clean detailed cel-painted anime artwork matching portrait/idle reference, readable edges, restrained soft cool separation light across dark hair/cape/body. Keep genuine transparent alpha in all empty space. No background, ground, shadow, mist, halo, grid, frame borders, lettering, labels, numbers, watermarks. NO spell ball, NO magical glow, NO rings or flying projectiles: those will be drawn as separate layers. Hands and costume must remain fully readable.
Input Image 3 is the IMMEDIATELY PREVIOUS four-frame attack sheet. Continue its last lower-right pose smoothly. Preserve exactly that sheet's standing feet positions, book orientation, head/body ratio and outfit; do not copy its poses. Main viewpoint remains right-facing and the book stays supported by the anatomical LEFT hand.
PRIMARY REQUEST: the middle FOUR progressive action poses (frames 5–8 of a 12-frame single ranged spell basic attack). This is the decisive outward release: the right hand performs a measured short forward casting gesture, not punching. Draw complete actual elbow/wrist/finger/shoulder changes.
5. Start from anticipation: RIGHT elbow unfolds and forearm advances toward screen right at lower shoulder/chest height, fingers just beginning to open, wrist leading the controlled gesture. Arm extends about halfway. Left hand and open book stay at lower chest. Tiny forward weight transfer through knees, fixed feet.
6. Main release KEYFRAME: RIGHT arm extends fully toward SCREEN RIGHT at lower shoulder height with a slightly soft elbow, palm angled outward toward the distant enemy and fingers spread elegantly. Right hand clearly outside the body/book silhouette with visible palm and all fingers, no fist. Head looks straight toward target, shoulder follows a little; torso remains upright. This open palm is the ranged projectile emission point. No drawn projectile or magical effects.
7. Release followthrough: right wrist softly dips and fingers narrow together, arm still nearly extended but relaxed. Cape/hair now softly respond backward a few pixels, head remains level. No body lunge, no step. Left hand remains firmly under the same open book.
8. Start recovering: right elbow bends and returns halfway toward the ribs, hand still facing forward but fingers soften, shoulders ease back toward neutral. Book stays in exactly same supported position.
No spell effects on ANY frame: only the character and one open book. Keep right palm clean enough for precise emitter-anchor registration. Four distinct chronological poses, exactly two by two, matching input A and idle body scale relationships.
```

### C：引用批准立绘、idle-a、jab-a、jab-b

```text
Use case: stylized-concept.
Asset type: high-quality hand-painted transparent character animation sprites for a 2D side-scrolling anime game. Technical animation model sheet, not a poster.
Image 1 is the approved Tharja portrait, the identity/costume/anatomy authority. Image 2 is the approved neutral idle sheet, the camera angle, standing skeleton, foot spacing, tome size/position and sprite lighting reference.
Character: the adult Tharja from Fire Emblem Awakening, reserved serious expression, straight black hair to upper hips, blunt bangs, narrow gold circlet, dark eyes. Preserve the approved fully covering fitted black clothing with fine dark fabric texture, intact opaque base layer over torso/hips/legs, antique-gold collar/wrist/waist accents, dark navy-black rounded shoulder cape with muted purple lining and gold edge, slim gold-strapped shoes. Same costume, no new exposed skin, no embellishments.
ANATOMY LOCK: exact same slender adult skeleton, small refined head and long legs as the approved references, approximately 7.5 anatomical heads tall. Same head pixel size in all four poses. Natural crown to sole is the body height, not a raised hand or cape end. No cartoon enlarged head, no compact/chibi proportions, no broadened hips or chest, no deep crouch. Cloth and hair follow the body with tiny delayed movement only.
CAMERA AND CONTACT LOCK: three-quarter side view facing SCREEN RIGHT, no turning toward the viewer. Both feet planted with modest front/back spacing, no crossing legs. No translation/lunge/step; knees only softly flex to shift weight. Anatomical LEFT hand continuously supports the same open dark-bound grimoire at upper waist/lower chest with real visible palm under its spine/lower cover; book never floats or changes hands. Open book width about 24 percent of natural standing body height; keep its size stable. Anatomical RIGHT arm is free and gestures toward screen right; show the wrist and fingers clearly. One book, two arms, two legs.
LAYOUT: EXACTLY FOUR complete figures in a regular TWO-COLUMN TWO-ROW invisible grid, row-major order. Square high-resolution canvas, generous equal square cells, fixed virtual camera scale. Each figure natural head-to-sole height about 74 percent of cell height. Supporting feet baseline at about 87 percent of cell height. Feet midpoint around 44 percent of cell width, leaving ample space for the right arm. Whole head, hair, cape hems, both hands, book, both shoes fully inside each cell with clear transparent margins; no neighboring silhouettes overlap.
Render clean detailed cel-painted anime artwork matching portrait/idle reference, readable edges, restrained soft cool separation light across dark hair/cape/body. Keep genuine transparent alpha in all empty space. No background, ground, shadow, mist, halo, grid, frame borders, lettering, labels, numbers, watermarks. NO spell ball, NO magical glow, NO rings or flying projectiles: those will be drawn as separate layers. Hands and costume must remain fully readable.
Input Image 3 is the FIRST attack sheet; use its UPPER LEFT neutral pose as the exact final pose.
Input Image 4 is the IMMEDIATELY PREVIOUS release sheet; continue its lower-right pose gently.
PRIMARY REQUEST: the final FOUR progressive recovery poses (frames 9–12 of the 12-frame single ranged spell basic attack). The spell has already been fired; there is NO new attack, no new spell, no arm re-extension. Settle the right hand toward the book smoothly and naturally.
9. The right elbow has bent back toward ribs. Right hand hovers loosely just above/right of the open pages at lower-chest height, wrist bent slightly outward after releasing. All fingers relaxed. Left palm continues to support book. Weight remains a little on the front leg, feet unmoved.
10. Right wrist rotates inward/down to face the book; fingertips descend toward the upper book page, elbow relaxes closer to waist. Neck/shoulders soften a little. Cape begins settling.
11. Right fingertips lightly hover over the open page, the pose approaches the neutral in the first sheet. Body returns to balanced weight on both feet, head slightly dips then eyes continue looking right. Tiny residual cloth and hair motion only.
12. MATCH THE FIRST SHEET'S UPPER-LEFT NEUTRAL POSE precisely for loop continuity: tall composed stance, left hand holding the same open tome at upper-waist/lower-chest, right fingertips resting just above pages. Same head angle, feet spacing, torso orientation, book size/angle and hand grip as the neutral reference. Eye gaze calmly to screen right, cape settles behind.
Do not introduce a new gesture or wave. Four individually drawn progressive settling poses with fixed head/body pixel scale and the same planted feet. Hands and book are the focus; no effects of any kind.
```
