# Tharja v2：远程普攻、重咒与吸取动作

## 范围和来源

基于用户批准的 `output/imagegen/tharja-stance-v3.png` 重建3种施法动作，每种12帧，合计36个实际绘制姿势、9张2×2源图。仅供 `public/previews/tharja-v2` 美术预览；未改正式角色/技能/游戏战斗。使用内置 `image_gen__imagegen`，每次 `transparent_background: true`，没有CLI/API回退。PNG复制自生成结果并保持逐字节一致；没有脚本缩放、拉伸、重绘、抠图或改alpha。

固定母版：`D:/Program/ai/genshin-smash/output/imagegen/tharja-stance-v3.png`。
共同相机、站姿参考：`D:/Program/ai/genshin-smash/public/previews/tharja-v2/assets/idle-a.png`（J A首张时尚未生成，直接用母版；后续均参考新idle）。连续段另引用同动作前一张，或以J A/idle作为归位参照。

## 动作分镜与时序

- J / Flux：书页引咒→收肘准备→伸掌放咒→收手回页。12帧1000ms，第6帧（零基5）/395ms释放，掌心坐标[498,188]。保持v3修长身形和自然小站距。
- 重击 / Ruin：右手覆书凝缩、左手稳托书→短促开放手掌前推→披风随势、掌回书前。12帧1350ms，第6帧（零基5）/615ms释放，掌心坐标[494,162]。肩部发力和余势强于J，不用近战拳击。
- 技能 / Nosferatu：抬腕摊掌向上→合指锁定→屈肘向胸前牵引→归页。12帧1500ms，第5帧（零基4）/460ms起效，第7帧（零基6）开始回流，第9帧（零基8）收至胸前；4–8帧分别登记真实右掌皮肤锚点，alpha252–253。

所有动作 `loop: false`，预览可选择循环，动作末尾间歇500ms。法球、重咒与吸取流由预览独立图层绘制，人物PNG不烘焙发射物/咒阵/光晕。此动作时序为审片用，不代表未来正式游戏硬直或伤害。

## 登记及验证

运行 `python scripts/register-tharja-combat-v2.py`。元数据在 `combat-registration.json`，生成3个动作JSON和3个 `*-validation.json`。

- 每张图固定一个 `standingBodyHeight`，不逐帧追边界缩放，保持身体尺度。J=465/535/542；重击=554/564/578；吸取=556/551/558。
- `rect`手工选2×2图的实际行间空隙。模型部分行间空隙偏离数学中线：J B/C使用646，重击B/C使用642，吸取B/C使用637/643，保留四个人物完整，并未改变源图。
- `pivot`登记脚底地面及两支撑脚之间的身体根位置，避开披风/书/施法手的外接框。全帧统一尺度和真实支撑点，不依赖手臂伸出长度自动居中。
- 三动作最小alpha>32透明留边分别21/14/11px；手、书、鞋和披风无裁断/串格。全部源图1254×1254 RGBA。
- 生成工具显示的透明区偶有红/黄RGB残留，保留原透明通道，以浏览器alpha合成显示为准。
- 9张最终图合计9,345,924字节。红色阈值检查的高alpha命中每张0–2个像素，位置都在脸部或手部阴影，不是透明区红块；大面积红色透明残留的alpha不超过4。登记运行前后文件哈希及原输出逐字节核对通过。
- J A首次结果人贴近格边，重生仅改留白；J B首次鞋跨数学行中线，重生改善留白后按实际空隙登记。其余7图一次生成。总计11次内置调用、9张最终源图。

## 最终源文件

- `assets/jab-a.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-6bf89067-258b-4fdd-a23c-9b59ed98cd43.png`
- `assets/jab-b.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-dcadace5-f4a9-4532-83b2-d8937867ff54.png`
- `assets/jab-c.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-8b154beb-2552-42c2-9674-185784c4e7b4.png`
- `assets/smash-a.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-335a51c9-3fc9-4b24-ab6a-4e9888d64ab8.png`
- `assets/smash-b.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-4d444fa6-aa0a-43e4-812a-b62b920ff983.png`
- `assets/smash-c.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-b793e915-bcd0-42be-b365-64a75bc7b443.png`
- `assets/special-a.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-9960cb4d-5375-4e38-8534-0a7b3d9523c9.png`
- `assets/special-b.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-f472dc2b-a4cd-48ec-a986-4e0a409cdbbe.png`
- `assets/special-c.png` ← `C:/Users/46637/.codex/generated_images/01a134b2-0708-73e3-afa5-421da9b7b981/exec-8a8163c2-8f6e-4304-9b2c-d8fe239b723b.png`

## 完整实际提示词

### jab-a-first

状态：rejected insufficient transparent margin

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~76% cell height, feet baseline ~87% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.
PRIMARY REQUEST: frames 1–4 of twelve-frame ranged BASIC ATTACK, same accepted old casting choreography but revised v3 taller/slender body and natural closer standing legs. Subtle precise tome-based action, not punching/melee.
1 neutral reference stance: left palm supports open book, right fingertips hover by pages, calm gaze right, shoulders relaxed.
2 right wrist rises a little above pages, right fingers softly curl, gaze dips to text, tiny elbow bend. Left hand steady.
3 right hand lifts toward chest, fingers gather; elbow draws gently back, slight rearward weight shift only, feet do not move.
4 anticipation: right hand beside lower chest ready to open, elbow tucked near ribs; chin lifts to target, right shoulder prepared for short forward gesture. No wide legs, no lunge, no crouch.
Retain tall slim v3 body rather than stylizing to a big head.
```

### jab-a

```text
Use case: precise-object-edit. Input is a four-pose transparent adult Tharja animation sheet. Preserve the exact four drawings, each face/outfit/hand gesture and anatomy and planted stance. Change ONLY layout/framing: every figure is TOO LARGE in its quadrant now. Redraw/reframe the same 2 by 2 arrangement with EACH COMPLETE FIGURE approximately 18 percent smaller, centered within its own equal square quadrant, creating a clearly visible generous transparent moat around ALL sides of each figure. Head-to-sole height must be at most 78 percent of a quadrant height, feet at 88 percent height. Top head margin at least 10 percent, bottom shoes margin at least 10 percent in all four cells. Preserve right-facing tall/slender body proportions; no physical/anatomical compression. No pose alterations. Absolutely no background, glow, shadow, floor, grid, text, letters, numbers, frames or new effects. Real transparent alpha. Keep every shoe and fingertip complete with clear margin.
```

### jab-b

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~76% cell height, feet baseline ~87% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~75% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: middle FOUR consecutive frames5–8 of 12-frame ranged magic BASIC ATTACK. Continue image3 lower right pose. Feet and head height stay fixed, no step.
5. Right elbow unfolds halfway and right forearm advances screen right at lower shoulder height, fingertips begin opening, palm not yet fully extended. Left supports book.
6. Release keyframe: right arm comfortably extended almost straight screen right, palm faces distant target, fingers spread elegantly and visible, wrist outside book silhouette. Shoulders slightly advance while body remains upright. Both feet remain v3 naturally close modest stance; absolutely no lunge.
7. Follow-through: right wrist dips a little and fingers ease, elbow softly bends, arm still out, delayed slight cape/hair sway backward.
8. Recover: right elbow now bent halfway to ribs, right hand returning toward book and shoulder relaxes. Left hand unchanged supporting open book.
Palm fully visible all poses; do not draw ANY orb, glow, fog or magic. Whole figure with generous margins and height comparable reference2/3.
```

### jab-b-margin-correction

```text
Use case: precise-object-edit. Preserve these exact four adult character poses, anatomy, identities, book support and outfits. Correct framing ONLY. Each figure now nearly touches row boundaries. Scale/reframe every whole figure into its own square quadrant at only SEVENTY PERCENT quadrant height, centered with transparent clear space above and below and sides. Exact 2x2 equal invisible grid. Large transparent gutters: crown around16% of each cell height, soles around84%. No cropping. No physical proportion/pose changes, no short limbs, no style changes. Transparent alpha background, no shadow/halo/grid/labels. Four complete independent figures in their own cells. Keep hands readable.
```

### jab-c

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: final FOUR consecutive poses9–12 of ranged BASIC ATTACK, gentle recovery ONLY. Image3 is the first four poses: match its upper-left neutral at end. The right arm has just returned from casting. Keep each figure relatively small in its square quadrant with lots of transparent clear space above head and below feet as in image3.
9 right hand just above/right of book, elbow returning near ribs, wrist tilted outward, fingers relaxed.
10 right wrist turns toward pages, fingertips descend slightly, shoulder settles.
11 fingertips hover close to pages, subtle residual hair/cape lag, head eases into neutral gaze.
12 exact relaxed tall natural neutral as image2/3 with left supports book and right fingers near page. Front knee softly relaxed.
No new forward gesture, no pulse, no magic. Maintain long slim v3 legs, modest natural foot spacing, small adult head. EXACTLY2x2 four separate complete figures, not large enough to touch cell edges.
```

### smash-a

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: FIRST FOUR consecutive poses1–4 of 12-frame HEAVY MAGIC CAST (Ruin). Unlike light jab, this is deliberate compression and forceful push, not a punch. Image2 new neutral idle reference. Exactly FOUR tall slender full figures with very large safe empty margins.
1 relaxed neutral, left supports open book at chest, right fingertips near page.
2 concentrating: right hand cups down above book, fingers slightly curled, wrist rotates down, eyes focused on page. Left supports tome steadily and brings it only slightly closer torso.
3 right palm cups above left-supported book as if compressing an invisible sphere BETWEEN palm and pages, elbow rises slightly; fingers curl closer. Chin lowered, shoulders coil subtly. Do not draw the sphere.
4 deepest quiet charge: right palm cupped near sternum just above book with fingers tensed but no fist, elbow pulled back; body sinks only 2–3 percent and weight shifts back slightly without moving feet. Long legs stay mostly upright and modestly separated.
Hold left hand under book in ALL4. No projectile/effects drawn. No ballet, lunging or spread legs. Cape only minor delayed movement. Slim long-leg physique is crucial.
```

### smash-b

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: middle FOUR consecutive frames5–8 of HEAVY MAGIC CAST. Continue image3 lower-right charged cupped-hand pose, but DO NOT draw another neutral/cupped sequence. Deliberate visible explosive shoulder/elbow change, a magic push with OPEN PALM, not fist or melee.
5. Drive starts: right palm rotates from cupped to forward-facing, elbow unfolds halfway, fingers begin broadening; torso leans slightly forward 5 degrees from ankles; left firmly supports book, knees soft, feet remain natural narrow stance.
6. HEAVY RELEASE: right arm thrusts strongly SCREEN RIGHT at chest/shoulder height, elbow nearly extended, open palm squarely faces target and fingers widely spread. Shoulder and torso follow with decisive slight forward inclination, neck/head align toward target. Left hand holds same book close under chest. Clear right palm outside silhouette. No actual drawn magic.
7. Followthrough: right arm still extended, palm lowered a little with wrist flexed, fingers relax; cape/hair lag out backward more than jab, torso begins to recover. No stepping.
8. Recoil/recover: right elbow pulls halfway back, hand still open near chest side, shoulders settle, book steady. Legs stay slender mostly vertical.
Clearly different poses. Draw full feet and fingers with transparent safe gap on all edges and between rows. No wave, arc, orb, ring or spell effects.
```

### smash-c

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: final FOUR consecutive frames9–12 of HEAVY MAGIC CAST. This is recovery from forceful push, no further attack. Image3 is preceding release/recoil sheet, image2 idle is destination. Match taller slender v3 body, gentle natural relaxed feet as ready posture.
9 right elbow just back near ribs, wrist partly open above book's near edge, slight residual forward shoulder tension. Left still supports open book.
10 right palm rotates down, fingers loosen, forearm lowers a little toward pages. Body eases upright. Cape still slightly swept backward.
11 right fingertips near page, book settles close to chest, shoulders relax, cloth falling by gravity.
12 exact calm idle pose matching image2: left hand supports book, right hand near pages, relaxed natural slightly separated stance and tiny soft knee, no rigid legs together.
Four individually drawn progressive return poses, no big body movement or step. No magic. Keep heads and shoes entirely in each quarter cell with clear empty transparent margin, four figures only.
```

### special-a

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: first FOUR consecutive poses1–4 of twelve-frame NOSFERATU LIFE-DRAIN CAST. This motion is summoning/beckoning and drawing energy BACK, explicitly different from forward palm-push. Upright ritual gesture, left hand holds tome throughout. No magic effects baked in.
1 calm neutral v3 stance, left supports open book, right fingertips near pages.
2 right hand leaves page and rises diagonally up beside face, palm turning upward and fingers softly spread; right elbow bent, eyes turn toward target.
3 right forearm lifts to head height and moves slightly forward, palm faces UP toward sky, fingers gracefully open, elbow keeps bend. Left supports book firmly at chest.
4 invocation anticipation: right hand held just forward and ABOVE forehead, palm still upward and fingers open like receiving something; gaze beneath hand toward screen right. Neck straight, shoulders softly raised on right only.
Tall slender adult anatomy and modest natural relaxed stance, no lunges or legs spreading. Full lifted hand/entire fingers stay inside quadrant: make full figures SMALLER if needed while maintaining one body scale throughout all four, generous upper and bottom empty margins. Do not make upper-arm huge; anatomically plausible bent elbow. Right hand visibly attached, left book contact intact.
```

### special-b

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: middle FOUR consecutive frames5–8 of NOSFERATU LIFE DRAIN. Continue image3 lower-right raised UPWARD palm. DO NOT use forward open-palm projectile push, DO NOT draw the light attack pose. This gesture locks distant target, closes fingers, then PULLS INWARD. Left continuously supports tome.
5. Invocation release: right hand raised above and just forward forehead, palm UP with elegant spread fingers; elbow bent ~90deg, wrist tilted back. Torso upright, right shoulder slightly lifted. Palm unobscured with all fingers. No drawn effect.
6. Lock target: maintain raised hand height while right fingertips CURL INWARD halfway as if gripping invisible thread, thumb approaches fingers but no tight fist. Wrist turns inward toward her own face a little. Eyes focused right.
7. Begin drain: right elbow lowers and draws back, hand descends to eye/cheek level, palm now cups inward toward her chest, fingers curved in beckoning pose. Shoulder comes down.
8. Draw closer: right hand travels down/in to upper chest just in front of collarbone, elbow bends near ribs, palm faces inward/up and fingers gently curved. Head follows target, calm concentrated expression.
Make these four DIFFERENT chronological joint configurations from raised open palm through finger closure to descending inward hand. No straight punch, no claw strike, no cast forward. Natural slender legs/feet remain grounded as v3. Cloak tiny delayed sway. Leave room above raised fingers and below shoes.
```

### special-c

```text
Use case: stylized-concept. Asset type: hand-painted transparent animation sprite sheet for a 2D side-scrolling anime game. Image 1 is the APPROVED Tharja stance-v3 model and the absolute identity, physique, outfit, stance, camera authority. Adult Tharja from Fire Emblem Awakening, black straight hair/blunt bangs/gold angular circlet, reserved face, gold collar and cuffs, fully covering fitted dark gray-black textured cloth over torso/hips/legs, short gold waist ornament, rounded shoulder cape navy-black exterior/muted burgundy-purple lining, gold strapped shoes, one dark bound open tome. Preserve costume exactly; no new exposure or accessories.
ANATOMY LOCK: match Image 1's tall slender silhouette and long slim legs, small refined adult head, approximately 8 heads crown to sole. Do NOT revert to short thick-legged game proportions or broad stance. Relaxed natural feet separation as v3 (foot center spacing ~one head width), knees gently soft, one foot very slightly ahead. Hip width/head size/thigh and calf lengths identical all poses. LEFT hand always supports the same open tome with visible real contact beneath spine/cover at upper waist/lower chest. RIGHT hand alone casts. Camera right-facing 3/4, looking screen right, fixed camera scale.
LAYOUT: exactly 4 whole figures in a regular invisible 2x2 grid, read top-left, top-right, bottom-left, bottom-right. Square canvas. Equal cells. Body crown-to-sole ~66% cell height, feet baseline ~82% cell height, torso center ~46% cell width. Keep ALL hair, fingers, book, cape and shoes inside cell with ample transparent margin (at least 6% cell). No crossing/overlap of cells. Common body scale and planted feet relationship through frames. No motion blur or duplicated smear limbs.
STYLE: finely finished clean anime cel-paint matching model. Actual transparent alpha background; no backdrop, halo, floor/shadow, labels, text, grid or border. NO baked magical effects, no projectiles, no glow, no orbs, no magic ring; hands/book fully visible, effects are separate layer later. Exactly 2 arms,2 legs,one book. Each pose individually drawn with genuinely different joint configuration where described, not translated copies. Preserve long-leg anatomy and natural modest stance throughout.

ADDITIONAL REFERENCES: Image 2 when supplied is the new idle sheet, exact camera and natural relaxed stance reference. Image 3 when supplied is preceding attack sheet: match its character and framing and continue the last pose. Sheet figures should occupy ~66% cell height, with generously empty transparent margins all sides. Never fill a quadrant edge to edge.
PRIMARY REQUEST: FINAL FOUR consecutive poses9–12 of NOSFERATU LIFE DRAIN. Image3 lower-right is preceding pose with inward cupped right hand at upper chest. Continue receiving and calmly settling to book, no new spell.
9. Right hand pulls the last short distance to sternum/chest with palm turned toward herself and fingers delicately curled, elbow close to ribs; shoulders relaxed downward, concentrated gaze right. This is the energy absorption keyframe. The left palm supports book slightly forward, not touched by the right hand.
10. Absorption complete: right fingers gently open, wrist rotates downward toward book, hand lowers from chest to just above pages, head eases.
11. Right forearm relaxes and fingertips approach page, posture returns to natural relaxed v3 idle, long legs steady, shoulders settle.
12. Exact neutral ending as image2: right fingertips hover at page, left supports open tome, relaxed small natural foot separation and softly bent one knee. Tall slender anatomy.
No magical effect at chest, NO drawn orb, trail or runes. Emphasize smooth progression from receiving at chest into normal book-reading stance. Keep all faces/books/fingers/shoes fully visible and isolated each of4cells by transparent space.
```
