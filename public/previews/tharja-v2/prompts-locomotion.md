# Tharja v2 待机与移动动画：生成记录

## 范围与方法

本组以用户批准的 `D:/Program/ai/genshin-smash/output/imagegen/tharja-stance-v3.png` 为唯一身份、服装和自然松弛站姿母版。参照芙宁娜每张 2 × 2 四姿态、整张固定身高标尺的生成模式，以及芙宁娜/优菈跑步的接触、下沉、交会、腾空腿部过渡方法。没有把其他角色图作为 Tharja 的造型参考。

内置 `image_gen__imagegen` 生成，所有调用设 `transparent_background: true`。最终 PNG 是生成原图逐字节副本，没有通过脚本改像素、抠图、拉伸头部/腿部或擦背景。Python/Pillow 只读取 alpha 与边界作核验，登记脚本只写 JSON。

只修改 `public/previews/tharja-v2` 独立美术预览和本组登记脚本；未修改 v1、正式游戏角色、战斗输入或玩法，没有 commit/push。

## 最终资产与时序

| 动作 | PNG | 真绘制姿态 | 动作时长 | 周期 |
| --- | --- | --- | --- | --- |
| 静候咒文 | idle-a / idle-b | 8 | 2190 ms | 连续循环 |
| 携书疾行 | run-a / run-b | 8 | 680 ms | 连续循环 |
| 轻跃落定 | jump-a / jump-b | 8 | 830 ms | 500 ms 休息 |
| 携卷避让 | dodge-a | 4 | 520 ms | 500 ms 休息 |

共 7 张 1254 × 1254 RGBA PNG，28 个源姿态，总 6,138,831 字节。完整源路径、SHA-256、透明像素计数、每帧 alpha > 32 包围盒与裁框边距见 `locomotion-validation.json`。源文件副本一致、所有帧不切边/串格与脚锚范围检查均通过；最小可见轮廓到裁框边界余量 12px。提示中 6% 留白是生成方向，最终接受标准是完整透明轮廓与安全裁框，不宣称模型精确执行全部像素数值。

## 登记与动画说明

`python scripts/register-tharja-locomotion-v2.py` 可重新生成本组四个动作 JSON。每张 PNG 使用唯一 `standingBodyHeight`；不能根据每帧外包围框动态撑高，也没有单独改变头/躯干/腿的倍率。手动 `pivot` 是接地支撑中心或骨盆投影对应的虚拟地面，既不是含披风的外轮廓中心，也不把空中最低鞋底钉在地面。

- 待机：源帧 `A1,A2,A3,A4,B3,B1,B2,B4`。按实际闭眼姿势把眨眼段集中，避免中途反复闭眼；指尖、书页、发梢和披风有轻微次级运动。
- 跑步：`A1–4,B1–4`。左手稳托半开书靠近躯干，右臂平衡。A 与 B 的不同原始像素密度按各自固定站姿标尺 455 / 510 换算；同图所有帧保持同尺度。第4/8帧鞋底分别高于该排虚拟地面约24/33源像素，保持短暂腾空。
- 跳跃：`A1–4,B1,B3,B2,B4`。B 的接触和更深膝部压缩按实际图稿排列；下降帧 `rootOffset:[0,-20]` 保留少量浮空。A 的虚拟地面是各格 y610，起跳后鞋底自然抬高，最高点并非鞋底重新对齐地面。
- 闪避：`A1–4`。该图实际透明行缝按 y650 分格；少量根横移为 0/34/52/42 源像素，随朝向镜像，用于独立审片展示短侧移，不代表实际游戏碰撞或无敌机制。

根偏移、身体标尺和脚锚是美术审片配准数据，不是精密人体测量。实际动画连续性与左右镜像由父任务浏览器审片验证。

## 完整提示与来源

所有原生成文件位于 `C:/Users/46637/.codex/generated_images/01a1345a-0409-7392-acbc-b0863b44fa11/`。

### 待机 A 初稿（未采用）

原图：`exec-13790072-0d5a-4fbf-98ba-67cb9245b0b3.png`。

人物占格过满，最终使用下列留白修正版。

```text
Use case: stylized-concept.
Asset type: production transparent sprite sheet, FIRST FOUR FRAMES of an eight-frame breathing idle loop for a 2D anime action game.
Image 1 is the USER-APPROVED THARJA STANCE V3 and the ONLY authority for anatomy, face, costume, slim elongated body, long legs, small adult head, relaxed leg spacing and book. Copy its exact proportions; do NOT fall back to a shorter or big-headed game-sprite style. This fully clothed adult character is Tharja, with long straight black hair, blunt bangs, gold headband and collar, complete dark long-sleeved outfit and covered dark legs, gold trim, black shoulder cape with muted burgundy lining and gold-trimmed dark shoes.
Create EXACTLY FOUR full-body sequential subtle idle animation poses in a strict TWO COLUMN by TWO ROW invisible grid on a square transparent canvas. Read row-major. Each full figure is about 78% cell height, with at least6% genuinely transparent clearance on every side. Same camera scale, identical skull size and leg lengths all four cells. Full crown, hair, fingers, book, cape and shoes visible with no inter-cell overlap. No labels, grid, text, effects or shadows.
Common stance in ALL FOUR: exactly the reference's relaxed screen-RIGHT three-quarter view. Same natural narrow-but-not-squeezed relaxed foot spacing, one knee softly relaxed and approximately60/40 weight balance; not wide-legged, not military straight, not crossed legs. Both feet remain in precisely the same planted positions throughout the idle loop. Body center stays steady. LEFT hand visibly supports ONE open dark/gold spell book at lower chest/upper waist; RIGHT hand hovers by the near page. Book has reference's size and opening direction and remains connected to left fingers, never floating, mirrored or changed hands. Cape and long hair drape under gravity.
FRAME 1 top-left: copy the approved V3 calm neutral stance, open eyes looking right, right fingertips poised above the near page, relaxed shoulders and soft knees.
FRAME 2 top-right: begin a quiet breath, only chest and shoulders lift a tiny natural amount; right wrist relaxes slightly and fingers shift over the page. Root, feet, long-leg anatomy stay stable. Page corner begins lifting.
FRAME 3 bottom-left: near breath crest, eyelids half-close in a natural blink, upper chest lifted slightly, right fingers gently curved as the page corner settles. Hair and cape hem lag with a tiny shift.
FRAME 4 bottom-right: breath crest, eyes closed for ONE short blink frame, shoulders relaxed rather than shrugged; the right wrist is a finger-width higher above pages. Tiny delayed cape/hair response, stable hips and feet.
These are real anatomical redraws with subtle breathing/blink/finger changes, not translations or scale changes of one cutout. Exact same head/body ratio as the approved single figure, do not widen hips, shorten legs, enlarge head or close the feet together. No spell emission in idle, no ground, no background glow, no painted checkerboard. Real transparent alpha in every empty pixel. One clean complete adult figure per cell only, exactly two hands and two legs.
```

### 待机 A 定稿：留白修正

原图：`exec-e4906caa-1e29-4aef-85a7-0f1cb2860900.png`。

只修图格占比，保留 v3 身形与松弛站姿。

```text
Use case: precise-object-edit.
Image1 is a transparent four-frame Tharja idle sheet. Preserve all FOUR exact poses, identity, slim elongated body ratios, head sizes RELATIVE to bodies, same feet spacing, costume, left-hand open book/right-hand page contact, blink progression and rendering.
Change ONLY the per-cell layout padding. The current figures fill too much of their cells and shoes nearly touch bottom edges.
Uniformly reduce the ENTIRE character plus book/hair/cape/shoes in EACH of the four cells to EIGHTY PERCENT (80%) of its current overall pixel size. Use exactly the SAME reduction for all four figures. Do NOT independently change anatomy or head/leg ratio. Then center each complete reduced figure inside its equal cell of the same strict2x2 square sheet.
There MUST be at least 45px fully transparent padding both ABOVE THE CROWN and BELOW THE SOLES in each approximately627px cell, plus generous side space. Each character including cloak occupies only about80% cell height, NOT ninety-eight percent. Leave genuine empty transparent space. Do NOT enlarge again to fill the space.
Preserve the original pixel-style drawing identity and exact chronological poses: neutral open eyes, quiet inhale, half blink, blink crest. All knees/feet and hands stay as drawn, only the whole-frame occupation and placement change. Exactly four complete characters in2x2, no overlap, no clipping, no lines, labels, border, shadow, glow, matte or background. True alpha transparency.
```

### 待机 B 定稿

原图：`exec-56e45407-282c-405b-83c4-45df2e7cc212.png`。

参考待机 A 与 v3；播放按实际眨眼状态重排后半四帧。

```text
Use case: stylized-concept.
Asset type: SECOND four poses of an eight-frame quiet breathing idle animation, production transparent2x2 sprite sheet.
Image1 is final idle sheet A: match its physical character pixel size and EXACT2x2 framing/padding, same small adult head to long slim body ratio, calm right-facing3/4 angle, costume, book and hand roles. Image2 is user-approved Tharja stance V3, sole anatomy/identity authority. Complete dark long-sleeved clothing and covered legs, black/gold outfit, gold headband and collar, long straight black hair, shoulder cape with burgundy lining, gold-trimmed dark shoes. Preserve V3 relaxed narrow foot spacing and soft knees. Do not enlarge head or compress legs.
Create ONLY FOUR distinct sequential full-body poses completing the idle cycle, row-major:
5 upper-left: just after A4, begin exhale; eyelids half-open, fingertips lowering gently toward near book page, shoulders relax a little, long hair/cape reach small delayed sway.
6 upper-right: eyes reopen looking screen-right, right fingers gently brush page corner as it settles; book stays stable in left palm, chest begins relaxing.
7 lower-left: nearly at neutral, right wrist and fingers return to their idle curve, shoulders low, cloth and hair settle closer to body, same planted soft knees.
8 lower-right: closely matches A1 neutral for seamless repeat, eyes open rightward, left hand cradles open book and right fingers hover near page, calm tall posture with narrow relaxed legs.
Root/pelvis horizontal center and feet position fixed per cell, no stepping. Real subtle shoulder/breath/finger/blink differences rather than sprite translation/zoom. Both hands always attached correctly, book never changes size or grip. Exactly same body-segment lengths as A, no wide stance or crossed legs.
Layout EXACT2columns x2rows; same square canvas and scale as A. Complete standing body about450px in a627px cell (around72%cell height), not filling the cell. Generous clear alpha above crown and below soles at least45px; whole cape/book/shoes fit their own cell. Do not increase occupancy relative to A. Exact four complete figures, no labels, grid, borders, scenery, floor, shadows, magic, glow or painted background. Genuine transparent alpha.
```

### 跑步 A 初稿（未采用）

原图：`exec-a3ee8bc3-99fb-4bca-911b-c51ebf8701a2.png`。

四阶段已成立，最终使用下列占格修正版。

```text
Use case: stylized-concept.
Asset type: FIRST HALF of an eight-frame practical RUN cycle for a 2D side-scrolling anime action game, transparent sprite sheet.
Image1 is approved Tharja V3 single master: sole identity and elongated adult anatomy authority. Image2 is approved idle sheet: copy its small head relative to long slender body, exact costume, book design, crisp rendering and generous2x2 layout. The character is an adult dark mage, straight black hair/blunt bangs, gold headband and collar, fully dark clothed arms/legs, black/gold torso, long black shoulder cloak with burgundy lining, gold-trimmed heeled dark shoes. Same long thigh/calf lengths and slim torso in every pose; no chibi.
Make EXACTLY FOUR distinct sequential full-body running drawings, strict TWO COLUMNS by TWO ROWS, read row-major. Whole figures occupy only about70-75%cell height, at least40px empty alpha around all parts in each roughly627-square cell. Fixed camera and figure scale, all head sizes identical, no perspective zoom. Entire cape, hair, book, fingers and shoes visible and separated.
VIEW and PROP: all face screen RIGHT, fixed sideward three-quarter angle, calm focused head. Small forward lean from ankles, low bounce. LEFT forearm keeps ONE half-open spell book securely close to ribs/chest; its cover and visible left supporting fingers consistent. Book never floats, changes hand, changes size or flips cover direction. RIGHT arm is free for small bent-elbow counterbalance BELOW shoulder height, no dramatic gestures. Hair/cloak softly trail screen-left and do not hide the legs.
Gait is light controlled moderate-short stride running, not a walk, march, dance, skip or enormous split. Preserve head/thigh/calf/shoe lengths even when knees bend. Show distinct contact/compression/passing/shortflight; the legs genuinely exchange front/back.
FRAME1 top-left, RIGHT CONTACT: anatomical right camera-near leg reaches modestly forward to SCREEN RIGHT, right shoe just meets imaginary ground. Left leg extends diagonally behind with heel beginning to recover. Near right arm slightly behind for balance, LEFT arm continues securing book.
FRAME2 top-right, RIGHT COMPRESSION: right supporting knee flexes naturally under pelvis as weight lands; left knee folds behind, heel rising toward back. Body settles a very small amount, right free elbow swings through low neutral.
FRAME3 bottom-left, RIGHT PASSING: right support leg has moved under/slightly behind pelvis, shoe in push-off; left thigh swings forward and left knee passes under hips, left shoe lifted near the opposite lower calf. Feet pass without fusing. Right forearm begins moving gently forward.
FRAME4 bottom-right, LEFT PRECONTACT / LOW FLIGHT: left leg now extends forward to right for next landing, right leg behind after push-off with knee softly bent. Both shoes just above virtual ground by a small amount. This is visibly the opposite leg configuration from frame1; right free arm slightly forward.
Registration: keep pelvis projection at the same horizontal location within each cell. Same virtual ground at local y≈560px in627px cells; contact shoes touch it, flight shoes remain visibly10–20px ABOVE it. Do not vertically reposition each pose to make its lowest shoe touch ground. Standing-equivalent natural crown-to-sole scale about450px matching idle, bending must lower silhouette rather than enlarge figure.
No spell emission, smoke, floor, shadows, scenery, glow backdrop, grid, numbers, text or borders. Exactly two arms, two legs, one book per pose. Real transparent alpha in empty areas. Cloth follows motion, no giant wind gust or cloak hiding leg phases.
```

### 跑步 A 定稿：留白修正

原图：`exec-cfa85fb7-5ef3-464b-8cc0-b0b83f7b2d68.png`。

保留原腿部与持书动作；接触/承重/交会/腾空。

```text
Use case: precise-object-edit.
Image1 is an otherwise approved four-frame Tharja running sheet. Preserve the EXACT same four running poses, left-hand book grip, right free arm positions, consistent long slim adult anatomy, costume, head size relative to body, camera angle and all leg phases.
Correct ONLY image layout padding. Uniformly shrink EACH ENTIRE figure (hair, cloak, body, book and shoes together) to80% of its present pixel size, with the SAME factor in all four2x2 cells. Recenter each in its own equal cell. Do not change individual limbs or head proportions and do not enlarge again.
Use a fixed imaginary ground inside every cell at local y≈555px on a627px cell. Contact shoe soles in poses1-3 touch this level, pose4 flight shoes remain20px above this ground. Complete crowns must have at least45px clear alpha above; complete shoes at least45px clear alpha below. Cloak tips and extended front shoe must stay at least45px away from left/right cell borders. Preserve true low-flight relation, don't pin fourth shoe to ground.
All4figures remain complete, no overlap or cropping. Keep authentic alpha transparency. No added content, no labels, grid, floor, shadow, effects or matte. Only generous padding and common placement change; body proportions/poses stay intact.
```

### 跑步 B 定稿

原图：`exec-b4de86ef-ec1e-415e-ae2f-11c3f026d04f.png`。

后半周期与另一侧腿交替；来源像素密度不同，整张统一尺度标定。

```text
Use case: stylized-concept.
Asset type: SECOND half of eight-frame Tharja running animation, EXACT FOUR full-body poses in2x2 transparent sheet.
Image1 is APPROVED RUN A. Match its exact physical skeleton scale, slender adult small-head body, right-facing side-three-quarter camera, clothes, half-open book firmly held in LEFT hand at ribs, and cloak/hair drawing style. Image2 is approved V3 master for identity and exact long adult proportions. Same Tharja black hair/blunt bangs, gold crown/collar/trim, fully covered dark outfit, black/burgundy cloak and gold-trimmed dark shoes. No costume changes.
These are NEW poses5–8, the OPPOSITE LEG HALF-CYCLE, not repeats of A.
Keep anatomical right camera-near leg visually in front of far leg where they cross; NEVER mirror the torso/book/face. Feet must genuinely alternate front/back.
5 top-left LEFT CONTACT: FAR LEFT leg reaches forward screen-right and touches virtual ground; NEAR RIGHT leg trails diagonally behind. This follows A4's left pre-contact. RIGHT free arm now slightly forward; LEFT hand keeps supporting book unchanged.
6 top-right LEFT COMPRESSION: FAR LEFT leg bends under pelvis to accept weight, near RIGHT heel folds up behind with knee bent. Small hip lowering only, same bone lengths.
7 bottom-left LEFT PASSING: FAR LEFT support leg pushes behind under pelvis, NEAR RIGHT knee swings forward under hip and feet pass without merging. Right forearm crosses neutral toward back; left book stays near chest.
8 bottom-right RIGHT PRECONTACT / LOW FLIGHT: NEAR RIGHT leg extends forward screen-right, FAR LEFT leg trails after push-off. Both shoes10–20px above virtual ground, ready to meet A1 right contact. Right free elbow subtly behind, book secure in left arm.
A moderate-short light practical run, small consistent forward lean and low vertical bounce; no marching high knee, enormous split, leaning head dive or stiff same legs copied. Head, hips and torso size constant. Exactly two legs and two hands per pose.
Layout: strict2columns x2rows; character small in spacious square cells with at least45px clear alpha margin above crown, below both shoes and beyond cloak/book. Match A's whole-character pixel size, not its placement errors. Natural standing-equivalent body about420px on1254 square canvas, each627cell. Common imaginary ground at local y540 in each cell; contact shoes at540, fourthflight shoe ABOVE this same baseline. Never enlarge bent poses to fill cell.
Preserve entire silhouette, no overlapping neighboring cells. No labels, text, grids, border, ground, shadow, magic, particles or glow. True transparent alpha.
```

### 跳跃 A 定稿

原图：`exec-0c5ea58d-89db-4356-956c-43063f6b268d.png`。

屈膝、蹬地、上升、最高点。

```text
Use case: stylized-concept.
Asset type: first four poses of an eight-pose jump and landing animation, transparent2x2 sprite sheet for a side-scrolling anime game.
Image1 USER-APPROVED Tharja V3 is the sole identity, costume and long slim adult anatomy authority. Image2 approved idle A gives physical body scale, exact mature small-head drawing style, book and right-facing3/4 camera. Keep the same face, long black hair/blunt bangs, gold crown/collar, complete dark long-sleeved bodysuit and covered legs, gold trims, black shoulder cloak burgundy inside, and gold-strapped dark shoes. Keep same long thigh/calf lengths, head size and slim torso across every pose.
Create ONLY FOUR consecutive full-body drawings in exactly2columns x2rows, reading row-major. Generous transparent cells; whole standing-equivalent body about430-450px in627px square cells; never enlarge bent poses to fill cell. Full cloak/hair/book/shoes visible, no edge crossing. At least30–40px blank alpha from all borders.
Common fixed camera facing SCREEN RIGHT3/4; she jumps gracefully with restrained practical movement, no acrobatics or offensive gestures. LEFT arm keeps ONE half-open dark/gold spell book against ribs with clearly connected supporting fingers throughout; RIGHT arm lightly balances. No book change of hand or floating. The pelvis projection stays near cell horizontal center.
Frames:
1 top-left PREPARE: in the approved relaxed narrow stance, lower weight by flexing BOTH knees and hips a modest amount, torso leans only slightly, left book close, right elbow drops and palm hovers near waist. Both complete shoes remain on common imaginary floor.
2 top-right PUSH-OFF: legs extend powerfully but naturally; forefeet/toes still meet imaginary floor, heels lifted just before leaving it; torso taller, right forearm begins floating forward for balance, cloak starts lagging downward.
3 bottom-left RISE: both feet clearly leave floor, knees loosely fold under/behind body, one knee a little forward and other slightly lower. Tall torso, no crouched ball. Right forearm loosely forward at low chest, left book stable. Hair and cape follow ascent with a small lag.
4 bottom-right APEX: weightless at top of short jump, torso upright and calm, both knees softly bent with feet separated naturally below hips, right arm gently open for balance, left book hugged to ribs. Cape lightly lifts but does not hide legs.
Registration IMPORTANT: imaginary ground same relative location per cell at abouty565 on627px cell. Frame1 foot soles meet this floor, frame2 toe tips meet it. Frame3 feet visibly35px above floor, frame4feet about55px above floor. Do NOT move airborne drawings down to pin lowest shoe to ground. Head can rise naturally but all parts fit with margins; fixed skeleton/camera scale. No cartoon stretching of legs, no compressed oversized head, no huge spread-leg split.
No drawn ground line, no scene, shadow, background, glow, magic, motion trails, labels, numbers, borders, grids or extra poses. Real transparent alpha in all empty space.
```

### 跳跃 B 初稿（未采用）

原图：`exec-e9b245d4-c1e1-4d80-bac7-66e8a3eebd1c.png`。

审查上排与下排尺度后作定向修正。

```text
Use case: stylized-concept.
Asset type: final four poses5–8 of Tharja short JUMP/LAND sequence, transparent2x2 sheet.
Image1 is APPROVED JUMP A. Match its same character skeleton scale, long slim adult legs and small head, exact book, costume, right-facing3/4 view and drawing finish. Image2 is user-approved V3 master; sole identity and long-body proportion authority. Same mature Tharja, complete black/gold clothing, covered legs, black long hair with blunt bangs, gold collar/headband, black cape with burgundy inside, gold-trimmed dark shoes. No shortened limbs or oversized head.
Create EXACTLY FOUR distinct sequential full-body poses continuing jump A4 apex. Image3 idle A gives final neutral stance shape only, not a different identity.
5 top-left DESCENT: after apex, body drops; knees start extending beneath hips, toes angle toward ground, both shoes still about40px ABOVE common virtual floor; cape/hair float slightly upward from lag. Torso upright, left arm securely holds ONE half-open book near ribs, right hand low for balance.
6 top-right FIRST CONTACT: front shoe forefoot reaches ground while opposite shoe follows very close; knees begin flexing to cushion, head stays steady, right forearm gently floats down. Book supported left at all times.
7 bottom-left ABSORB: both shoes grounded with original narrow modest separation, knees and hips flex noticeably but not into a squat; torso leans slightly, shoulders absorb weight, cape settles after landing. No crossed knees or forced wide stance.
8 bottom-right RECOVER: stand back to approved V3 relaxed narrow stance matching idle A1, soft knees, slim long legs, left hand open book at lower chest and right fingers near page, calm rightward eyes. Cloth returns toward gravity.
CRUCIAL: same long skeleton and head pixel size all four. Bent pose7 is naturally lower, NEVER scaled up or legs shortened to match standing external height. Same perspective and camera. Body scale as jump A, standing-equivalent height approximately540px on1254sheet if matching that resolution; if not enough padding uniformly use smaller fixed scale for all4, never crop or rescale one frame.
Layout exact2columns x2rows, generous square cells and transparent padding around whole hair/book/cape/shoes. Virtual ground at local y570 for627px cells: poses6,7,8 shoes at570; pose5feet40px above570. All crown and soles entirely inside with visible space. Natural jump not dance, no landing shockwave or spell. No backgrounds, shadows, motion lines, labels, grid or borders. Real transparent alpha.
```

### 跳跃 B 修正尝试（未采用）

原图：`exec-33149a7f-2328-4768-ad3c-f7e1db4566be.png`。

上排缩得过多，未用于最终预览。

```text
Use case: precise-object-edit.
Image1 is a transparent four-pose jump landing sheet. Make ONLY one targeted size-consistency repair. Preserve exact character identity, all four poses, two legs/arms, left hand book, clothing, right-facing3/4 camera, rendering and true alpha. Do not redesign anatomy or alter bottom-row drawings.
Problem: TOP TWO figures are visibly larger in camera scale than bottom figures: head, hand, book and all bones are oversized. The BOTTOM-RIGHT recovered neutral figure is the authoritative physical body scale.
Fix BOTH complete TOP-ROW figures only: uniformly reduce each ENTIRE figure including head/hair/book/cape/body/shoes to84% of its present pixel dimensions. Same factor for both. Keep their own correct body proportions, do not shrink just their heads or legs. Reposition them within their top-left/top-right cells so they fit fully and do not overlap. Do NOT grow them back to fill whitespace. Bottom-left and bottom-right remain unchanged in shape, scale and position.
Repositioning baseline: first top-left descending pose should have its lowest shoe approximately25px ABOVE the imaginary ground y≈610px; top-right contact pose front shoe should meet y≈610px. Preserve their existing descending/landing anatomy, lower the smaller drawings if needed to align this ground. Keep full crown and shoes with real transparent padding. Place roots horizontally where they were, same2x2 arrangement.
All heads, hands and book sizes should now be approximately the same physical scale across all4poses. The crouching bottom-left retains naturally lower height, not enlarged. No effects, floor, shadows, labels, grids, extra poses, background or matte.
```

### 跳跃 B 定稿：小幅尺度修正

原图：`exec-fe66e691-99eb-42a3-bbc3-4fbf88a0c773.png`。

从原始 B 重新作小幅修正，保留自然下降和膝部缓冲；播放顺序按实际接触/压缩姿势登记。

```text
Use case: precise-object-edit. This is a very SMALL camera-scale correction of the ORIGINAL four-pose Tharja landing sheet.
Keep all four existing poses, character identity, face, long body anatomy, left-hand book, garments, viewpoint and transparent background. Bottom two figures are correct and must remain unchanged.
The TOP-ROW two figures are only slightly too large. Reduce each COMPLETE top figure uniformly to exactly NINETY-FOUR PERCENT (94%) of its current size — ONLY a6%small reduction, not20%, not a dramatic shrink. All parts scale together so skull/face/book/hands/bone lengths are preserved in proportion. The TOP and BOTTOM heads should appear essentially the SAME physical size after repair, around100px natural crown-to-chin; top should NOT look small relative to bottom. Do not shorten legs or repaint anatomy. Leave bottom figures exactly at existing scale.
Keep top figures horizontal root locations; adjust their vertical placement only so top-right contacting shoe reachesy630 and top-left descending shoe ends near y610 on the1254sheet. Full silhouettes must stay inside top half separated from bottom row. This maintains natural descent and first landing. Top-left legs are elongated toward landing so its silhouette may remain slightly taller than bottom neutral; do not force all bounding boxes to equal height.
Everything else untouched. Exact2x2 four figures, no text, grid, effects, backgrounds, shadows or extra figures. Genuine alpha transparency.
```

### 闪避定稿

原图：`exec-7b72e604-1e6c-420c-a653-e8f2bfc59467.png`。

低身、侧移、刹停、回书；透明行缝实际位于650px，登记使用自定义裁框。

```text
Use case: stylized-concept.
Asset type: four-frame short evasive sidestep animation for a2D anime fantasy game, transparent2x2 sprite sheet.
Image1 user-approved Tharja V3 is sole identity, adult slim long-body/head proportion and costume authority. Image2 approved idle A gives the exact common neutral stance, book, hands and clean production shading. Preserve her small mature face, long black straight hair and blunt bangs, gold headband/collar, fully dark clothed arms/legs, black/gold details, black shoulder cape burgundy lining and gold-strapped dark shoes. No costume changes, no enlarged head or shortened legs.
Create EXACTLY FOUR genuinely distinct sequential full-body drawings,2columns x2rows, read left to right then bottom. Fixed camera right-facing3/4 side view, same bones/head/body scale every frame, same calm focused expression. LEFT arm keeps ONE half-open spell book securely against torso at all times with visible natural fingers, no floating book or changing hands. RIGHT hand balances then returns to page.
1 upper-left PREPARE: soften knees and slightly lower hips from V3 neutral, tiny torso lean toward screen right, right hand drops a little beside waist, left elbow secures book. Narrow stable feet, grounded.
2 upper-right SLIDE: quick low sidestep toward screen RIGHT, front foot reaches only a moderate step and rear foot pushes from ball/toe, torso leans10–15degrees forward but long spine stable. Knees bend naturally, no deep lunge or split. Right forearm extends slightly back for balance; book stays tight in left forearm. Hair/cape briefly lag left. Both shoes remain close to ground, no rolling or teleporting.
3 lower-left BRAKE: front knee accepts weight, rear foot draws closer; torso rises halfway, right free hand turns toward book, cloak swings a little past the body's deceleration.
4 lower-right RESET: return to EXACT approved idle relaxed narrow stance and book hand placement, tall slim adult proportions, knees soft, right fingertips above near page, left palm supporting open tome. Calm gaze screen-right.
Layout: each whole character only about72% of square cell height on1254square sheet, around450px standing-equivalent height; at least40px empty alpha around crown, cape, book and shoes, strict separate2x2 cells. Root stays same horizontal location in drawings so game can animate travel separately; common virtual ground at localy565px within627pxcells. Do not enlarge low or bent poses to match standing outer height. All whole limbs and props fully visible, no neighboring overlap.
No magic, shadow clone, smoke, particles, trails, ground, shadows, setting, grids, text, labels or borders. Genuine transparent background with alpha; do not paint checkerboard or matte. This is restrained practical mage evasion, not a melee attack, dance or exaggerated athletic split.
```
