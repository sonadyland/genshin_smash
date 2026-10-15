# 女神威人形战斗动画 v2 — 母版比例与真实兵器轨迹

状态：J1/J2/J3 共 24 帧已生成并登记实际手、刃根、剑尖与出手时段，已通过浏览器同尺度合成、出手/回收时机和独立视觉复核。K/I 登记在 human-v2-skills-registration.json。左右镜像与游戏尺寸已检查；这里只是独立美术预览。

2026-10-14 选用源：J1 = human-v2-jab1-a.png + human-v2-jab1-b-longblade.png；J2 = human-v2-jab2.png；J3 = human-v2-jab3-refined.png 的 F1/F2/F7/F8 + human-v2-jab3-thrust-wide.png 的四个中段帧。J3 改用宽格承载水平长剑，避免窄格使出手时剑刃突然缩短。仅真正释放索引 3、4 开启武器效果，蓄势与回撤不闪光。每 sheet 使用固定站立骨架标尺，不逐帧按包围盒缩放。

原画仍保留少量手绘投影差异，不宣称武器几何绝对等长。配准记录 bladeLengthPixels 与 bladeToStandingHeight，供同尺度动态复核；未用程序拉伸武器或改 PNG 像素。

本轮唯一身份、骨架、服装、配色及夜刀造型权威为 `assets/human-master.png`。旧版动作只用于问题分析，不用于身份和比例参考。使用内置 `image_gen__imagegen`，透明 PNG 原样复制；不进行像素级程序修图。

## 固定约束

- 成年修长身形，约 6.9–7 头身；髋至足约身高 54.3%，窄肩、细腰、薄型银甲。不得用大头、粗腿或短腿来填满画格。
- 同一动作所有画格使用固定解剖尺度。弯腰或下蹲意味着占画高度降低，不能拉大人物补齐。
- 披风外层低饱和灰蓝，内褶深靛蓝，原白纹样固定；不出现宝蓝高饱和色块或风格交替。
- 右手握在护手后的真实柄部。夜刀长度与母版一致，刃长约站立身高 53.5%，含柄总长约 70%。
- 原角色图不绘制任何剑弧、刃光、发光拖尾；由独立图层按实际刃根与剑尖轨迹叠加。
- 每格保留透明边距；完整头发、脚、披风和武器必须在所属画格内。

## 分镜与释放节奏

| 动作 | 帧数 | 设计 |
| --- | ---: | --- |
| J1 斜劈 | 8 | 自然准备 → 肩后抬剑 → 小步蓄势 → 剑向前下方切过 → 前低随动 → 收剑 → 回到准备 |
| J2 反手横斩 | 8 | 右手回收到腰侧 → 躯干小幅反转蓄势 → 在腰胸高度横向反手切过 → 横向随动 → 收势；不变成竖挥 |
| J3 直刺 | 8 | 握柄收肘 → 剑刃转为水平 → 小步前送 → 手臂伸直，水平短促刺出 → 撤步回收 → 准备 |
| K 双手下劈 | 12 | 双手慢举至头顶并停顿 → 快向前下劈 → 剑尖在前方低处停顿 → 双手收剑 → 准备；无上挑 |
| I 龙牙 | 12 | 右手收剑在侧后 → 左肘抬起 → 左前臂连续白甲黑纹局部龙化 → 肩肘发力向前刺 → 龙牙回收 → 恢复左手 |

实际 activeFrames、手/刃根/剑尖锚点以最终图像逐帧测量为准，不按预设角度臆造。

## 原始生成记录

后续逐张追加实际提示词、引用图、原始路径、交付路径、尺寸与复核结论。

## J1B long blade selected

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-1f9aa9c9-fed1-4aff-a1c9-2b0fb6eeb638.png

交付：assets/human-v2-jab1-b-longblade.png

```text
Precise object edit. Image1 original Corrin master authority. Image2 2x2 J1B target. Keep exactly the four mature slender longlegged figures and same muted slate-blue cape, fixed face/head proportions, frame poses and sword angles. Fix only the metal blade length in top-left and top-right: they are too short compared to the lower row. Extend top-left blade by45percent along its current down-right line and top-right blade by30percent, same slim steel Yato design, fixed hands/guards. Upper and lower swords must now ALL have guard-front-to-tip length .535of standing stature, physical length same and no perspective foreshortening. Lower-row weapons unchanged.
To fit these complete extended weapons without crossing any cell, uniformly scale all four WHOLE figures to75percent their current size and center full figure with sword within equal627square cells on1254squarecanvas. Keep all heads and bones at the same relative scale, no body-part rescaling. At least55px transparent margin all sides. No cropped tips, foot or hair, no overlap. No new glow/arcs/trails/effects/text/shadow/grid, pure transparent alpha.
```

## J3 wide first

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-046d0ce6-bb98-47c7-b29e-12e0bbd06442.png

交付：assets/human-v2-jab3-thrust-wide-draft.png

```text
Use case stylized-concept. FOUR female Corrin full-body horizontal sword-thrust animation poses in TWO COLUMNS TWO ROWS on a WIDE LANDSCAPE2:1 canvas. Each of4cells is a WIDE RECTANGLE twice as wide as high, to leave ample room for a full-length outstretched sword. NOT four columns! Image1 original human-master is sole character, body proportions, costume and Yato weapon authority. Image2 corrected J3 sheet is matching slim adult build and gray-blue cape style; it has too-short thrust swords, do NOT copy weapon shortening. Preserve its small head/longleg refined anatomy.
Slender adult6.9–7head figure: head.145H, shoulder width.186H, waist.105H, hip-to-sole.543H, thin fitted silver armor/blackundersuit, silver longhair, black ornament, red eyes, BARE FEET. Muted desaturated slate-blue cape with deep indigo folds and same white motifs, delicate soft rendering. Same fixed anatomical scale all4frames (standing body about300px if1774x887canvas). Each full complete figure INCLUDING WHOLE YATO has generous transparent blank margin allaround, especially at screen-right swordtip. Character fits in left-center of widecell so blade has space on right. No cross-cell overlap or crop, no text/grid/floor/shadow/FX/glow/trail/arcs.
All4character faces3/4side RIGHT. Right hand holds actual black handle behind golden guard; empty left hand balances. Very important: a LONG THIN rigid standard Yato blade .535of standingbodyheight (approx160px if300px body), totalweapon.70H. Exactly the same blade length in allfour drawings. Arms extended do NOT turn sword into a dagger. The entire sword axis is perfectly HORIZONTAL to screen RIGHT, in pure image plane, absolutely no perspective shortening, no angling toward viewer.
Four consecutive frames J3 F3–6:
TOP LEFT F3 windup: right elbow back and bent, hilt pulled beside lower ribs, long horizontal blade out front RIGHT, frontfoot starting smallstep.
TOP RIGHT F4 release: right arm extends halfway forward, same long horizontal blade now advancing, shoulder/hip carry smallforwardmotion, no deep squat.
BOTTOM LEFT F5 full thrust: right arm fully extends shoulder-to-hand, a LONG full-sized blade beyond hand horizontallyRIGHT, small lunge, slim long legs still recognizable. Leftarm balances back.
BOTTOM RIGHT F6 retract: right elbow begins bending back, sword remains horizontal, stance begins narrowing, hand and blade pull back together.
Match exact torso/legs/head sizes across4. These4 clearly different stages of the SAME linear thrust, no sideways swing.
```

## J3 wide shorten all

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-4c77bf24-49a4-4d6e-97f5-06daf75346bb.png

交付：assets/human-v2-jab3-thrust-wide-mid.png

```text
Precise object edit. Reference1 original master Corrin establishes the true Yato sword length. Image2 EDIT TARGET 4-pose WIDE2x2thrust. Preserve EXACTLY the four figures, head/body proportions, poses, position/scale, clothing/hair/cape color, hand/guard locations and blade HORIZONTAL direction. Change ONLY the metal sword blades: they are now TOO LONG. Shorten EVERY one of the four steel blades to70percent its present guard-to-tip length (about240px blade for450px standing body). Keep hilt/grip/guard unchanged, replace distal point along same horizontal axis, preserve same thin width and correct standard Yato gold/ivory/red design. All4blade lengths identical, .535of anatomical standingbodyheight. These are conventional swords, not huge lances. Do not add effects or resize heads/bodies, no rewriting poses. Keep full feet/hair/capes and each blade inside its cell, source transparent background unchanged. No glow/trail/arc/text/grid/shadow/floor.
```

## J3 wide equalize

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-1949cc2c-b5b2-4439-8b24-d7fbc2ef8eec.png

交付：assets/human-v2-jab3-thrust-wide-equal.png

```text
Precise object edit. Image1 original Corrin master identity authority. Image2 EDIT TARGET:4pose2x2WIDE sheet. Preserve exact figure positions/anatomy/proportions/colors/heads/grips, no resizing or moving. TOP LEFT sword is CORRECT and must stay exactly unchanged. Match all other metal blade lengths to it: TOP RIGHT and BOTTOM LEFT blades are currently visibly shorter. Extend ONLY those two rightward horizontal steel blades by30percent until their guard-to-tip length equals TOP LEFT blade. BOTTOM RIGHT blade extend10percent, also same length. ALL FOUR blades need about235pixels between front of golden guard and tip at current1774x887resolution, the same rigid object. Extend distal tips into existing empty rightward space, do not change hands/guard/hilt, do not widen blades. Do NOT shorten top-left to match others. Same standard thin Yato design, horizontal axes exactly. Do not use foreshortening or rotation toward camera to explain a short sword. Nothing else changes. Real transparency, no text/FX/glow/trails/shadows.
```

## J3 wide final selected

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-e5ac5896-b7a7-4dca-8d3e-3bd99ebcfbbd.png

交付：assets/human-v2-jab3-thrust-wide.png

```text
Precise tiny object edit. Image1 original Corrin master authority. Image2 EDIT TARGET. Change ONLY the steel blade in BOTTOM RIGHT cell: shorten its guard-to-tip length by30percent so it is EXACTLY same length as TOP LEFT sword, about235pixels. The bottom-right current sword is too long; replace distal tip along same horizontal rightward axis, guard and hand stay exactly fixed. Top-left, top-right and bottom-left sword blades MUST remain unchanged. Every character pose, face, longleg/slimbody/headsize, costume, hair, slate-blue cape color, canvas layout and scale MUST remain unchanged. No global resizing or repainting, no additional effects, glow, trail, arc, text, background or shadows. Genuine transparent alpha.
```

## J3 anatomy fix

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-fb14e61b-987a-4da5-8cf6-987e5e92348d.png

交付：assets/human-v2-jab3-anatomy.png

```text
Use case: identity-preserve anatomy correction. Image1 original human-master is the ONLY exact female Corrin proportion/identity/costume authority. Image2 approved idle is matching slender adult anatomy. Image3 is the EDIT TARGET:8-pose J3 sword thrust sheet. In image3 the heads are TOO LARGE and legs TOO SHORT relative to approved master/idle. REDRAW ONLY the anatomy proportions while retaining the exact8 animation poses, same eight right-hand sword positions/angles, full blade lengths/grips, same slate-blue cape colors and fine silver armor details.
For EVERY figure reduce head including face skull and head hair volume by about8percent relative to torso. Keep same mature facial identity, no baby cheeks. Extend upper leg and lower leg bone lengths by about8percent without thickening thighs/calves; final hip-to-sole span is54.3% of standing stature. Narrow shoulder width18.6%H, thin waist10.5%H, pelvis17%H, head exactly14.5%H; about6.9–7head standing anatomy, elegant LONG legs and small adult head matching image1. Preserve all elbows/knees posture angles, actual hand-to-handle contacts, straight thin long sword with no telescoping. Only skeletal proportions corrected, no added movement or new action. Keep consistent fixed anatomical scale across all8frames, even lunging frames. Frame1 and8 should look identical in body build to master, NOT shorter or broader.
Keep all 8 complete figures on a WIDE2:1 transparent4column2row sheet, generous blank gutters, no cropping of full weapons/feet/hair/capes. Slightly smaller whole drawings to fit longer legs is okay but never keep head large while shrinking torso. No effects/glows/trails/arcs/text/grid/floor/shadows. True transparent alpha.
```

## J3 anatomy framed

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-2c482bc2-1989-4cb4-9d55-bcaa14c52930.png

交付：assets/human-v2-jab3-refined.png

```text
Use case: precise-object-edit. Image1 human master is ONLY anatomy/identity authority. Image2 EDIT TARGET has corrected8 human J3 thrust poses, now keep these exact slender long-legged anatomy proportions, small heads and soft low-saturation slate-blue cape, same poses, same sword shape/grip/size relative to body. Correct ONLY layout: scale every whole figure UNIFORMLY down to65percent current linear size about its own cell center. Do not change head or limb proportions at all. Keep a2:1 wide canvas with4columns2rows, all equal square cells, blank broad transparent gutters; every full figure and every COMPLETE sword must have at least40px clear alpha border in its cell. Restore the fully visible sword point in frame4 and any clipped cape edge without changing blade length. Every blade is a thin straight steel Yato .535of anatomical standingheight. Do not let any sword extend into another cell. Do not resize individual bodyparts, do not enlarge back tofill. No new effects/arcs/glows/trails/text/grid/shadows/floor. Real transparent alpha.
```

## J3 final blade experiment

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-a371b4a7-59e8-4c97-93f4-ebaa67b3b1dc.png

交付：assets/human-v2-jab3-blade-final.png

```text
Use case precise-object-edit. Image1 master identity and rigid long Yato design. Image2 target, exact current8-frame4x2sheet. Keep ALL character anatomy, small heads long legs, stance, shading, cape colors and every pixel position unchanged except the following weapon corrections. Do not resize the canvas or the figures. The full sword must not shrink when extended: all8metal blades are approximately175px from FRONT of guard to point on this1774x887canvas.
Frame4 TOP RIGHT: its blade is only110px. Move this WHOLE figure left50pixels inside its cell, unchanged anatomy/scale, then extend the blade horizontally RIGHT to175px.
Frame5 BOTTOM LEFT: blade currently110px; extend horizontally right to175px, no arm change.
Frame6 BOTTOM SECOND: blade currently110px; extend horizontally right to175px, no arm change.
Frame2 TOP SECOND andFrame3 TOP THIRD: increase blade only10percent to175px.
Frame1 TOP LEFT, Frame7 BOTTOM THIRD andFrame8 BOTTOM RIGHT: shorten only distal tip of diagonal blade approximately18percent to175px, all handles/guards unmoved.
Keep thin steel blade width and exact gold/red standard Yato motifs, no glow. Maintain wide blank gutters; no clipping, no overlap into another figure. All8figures remain exactly as supplied in form and proportions. No effects/arcs/trails/text/shadow/grid. Genuine transparent alpha.
```

## J3 draft

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-217506c3-9cc4-46c5-a5f9-00b7fcd95b9e.png

交付：assets/human-v2-jab3-draft.png

```text
Production 2D sprite contact sheet. WIDE LANDSCAPE2:1, EIGHT full-body drawings in FOUR COLUMNS TWO ROWS on real transparent background. Image1 original human-master sole identity/anatomy/costume/standard Yato authority; image2 approved idle painting/colors. Exact same female Corrin, adult and tall slender7heads, small head.145H, shoulder width.186H, waist.105H, long slim hip-to-sole.543H, delicate fitted silver plate armor, black inner suit, long silver hair, black head ornament, red eyes, BARE FEET. Never stocky or chibi. Muted desaturated slate-blue cape/deep indigo folds/white markings consistent all8frames.
IMPORTANT COMPOSITION: SMALL figures with LOTS of empty transparent space. Each cell is square. Upright skeletal body height only58percent cell height, head8.4percent cell height, all8same fixed skeleton scale. Center the FULL silhouette INCLUDING SWORD within its cell, complete hair/cape/feet/swordtip with10percent transparent margin all sides. Poses bent/lunged not enlarged. Clear blank gutters, no overlap. No text/grid/floor/shadow/effects.
Action J3 short horizontal sword THRUST toward screen right, 8 consecutive distinct frames. Right-facing3/4side view. Right hand always correctly holds black Yato handle behind gold guard, left hand empty balancing. Same constant sword blade length.535H, total weapon.70H. A thin long steel sword, not dagger, no apparent telescoping because blade always lies in picture plane. No sword glow, arcs, trails or FX.
F1 ready stance sword diagonal down-right.
F2 right hand draws to hip, elbow back, sword turns almost horizontal right.
F3 final anticipation sword perfectly horizontal right at lower chest height, elbow sharply bent behind body, front foot begins small step, relaxed narrow stance.
F4 fast release: right arm extends forward halfway and torso inclines slightly, sword still exactly horizontal right, front foot advances.
F5 full straight thrust: right arm reaches fully forward at chest height, sword horizontal right, small athletic lunge but do NOT squat deep or spread legs widely. Empty left arm extends slightly behind for balance.
F6 retract: elbow pulls back a little, same horizontal sword and height, front knee softens.
F7 return foot underneath body, blade lowered diagonally down-right, right elbow comes to hip.
F8 same slender idle stance as master, cape settles, sword down-right.
Distinct changes in elbow, shoulder, weight and foot progression, no stationary copies.
```

## J3 framing

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-a5167571-cb86-413e-975a-1eb778d7c9e3.png

交付：assets/human-v2-jab3-layout.png

```text
Use case: precise-object-edit. Image1 is original Corrin master and sole slender adult anatomy/identity/costume authority. Image2 EDIT TARGET is eight-frame J3 straight sword thrust. Preserve its eight real joint poses, silver hair and muted slate-blue cape with soft painting. Correct subtle proportions: keep head small and adult, head-to-sole exactly6.9–7head lengths standing, hip-to-sole54.3% of standingheight, narrow shoulders18.6%H, waist10.5%H. No short thick thighs; keep fitted thin plate rather than bulky armor. All8frames same skeleton lengths/headsize. Same mature figure as master.
Fix weapon consistency: every Yato sword has the same slim full-length blade .535H from guard front to point, total weapon .70H. Frames4/5/6 straight rightward blades are currently too short: lengthen steel blades by25percent, rigid parallel to pictureplane, hand/guard positions unchanged. Redraw frame4 currently clipped sword point completely. Frame1/7/8 diagonal blade can be slightly shortened to same .535H. Keep correct hand gripping behindguard, never gripping blade. No added sword glows/trails/arcs/FX.
IMPORTANT spacing: uniformly shrink ALL8whole figures including sword down to60percent current linear size, center each in its own4x2cell, with at least10percent cell transparent margin allaround including the furthest blade tip. Make the whole sheet2:1 landscape with broad absolutely blank gutters. Do NOT enlarge tofill. Preserve complete feet hair cape swords, no neighboring frame overlap. Real alpha transparency, no labels/grid/shadow/floor.
```

## J3 blade fix selected

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-e1535746-d202-4879-8ab6-0ca1b3e74247.png

交付：assets/human-v2-jab3.png

```text
Precise object edit. Image1 original master reference sole identity/slender anatomy authority; image2 EDIT TARGET8-frame J3 thrust sheet. Preserve EXACT8 poses and fixed anatomical scale. Final weapon correction: all swords are the SAME long thin Yato, not compact daggers. Every metal blade measured from FRONT of GOLD GUARD to POINT is exactly.535of standing anatomical height. TOP RIGHT(frame4), BOTTOM LEFT(frame5), BOTTOM SECOND(frame6) horizontal swords are visibly too short. Extend ONLY those three blades by40percent along their current rightward horizontal axis, hands/guards unchanged, redrawing whole rigid Yato shape with gold edge and central red inset as reference. Other blade sizes/angles unchanged. To fit, move these three whole figures LEFT inside own cells and make ALL eight figures uniformly15percent smaller, preserving same small head and very long slim legs; never change one figure scale alone. All heads and limb lengths remain same physical scale. Keep entire blade tips within owncell with blank gutter, no clipping.
Same low saturation slate-blue cape and deep-indigo innerfolds, silver armor, no color changes. No FX, bladeglow, arcs, trail, aura, text, grid, floor, shadow. Real transparent alpha. Maintain wide2:1 landscape4columns2rows composition.
```

## J2 draft

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-84aa3cb4-11fe-4567-8333-1dbadd954ac4.png

交付：assets/human-v2-jab2-draft.png

```text
Use case: stylized-concept. Production sprite contact sheet, WIDE LANDSCAPE2:1 canvas, exactly EIGHT NEW full-body female Corrin sword poses in FOUR COLUMNS and TWO ROWS. Transparent alpha. Reference1 original human-master is sole identity/proportion/costume/weapon authority; reference2 approved idle style/color. SAME slender adult7-head anatomy: small head .145H, narrow shoulders .186H, thin waist .105H, hip-to-foot long slim legs .543H. Do not make stocky, thick-legged or chibi. Long silver hair, red eyes, black hair ornament, fitted thin silver armor and black suit, BARE FEET. Muted slate-blue cape, deep indigo folds, same white shapes and soft rendering; no bright blue.
Each pose is a SMALL figure with upright standing equivalent only60percent of cell height, leaving large transparent blank margins. Same exact anatomical pixel scale all8frames. Each equal square cell must contain its whole pose including ALL sword tips/hair/cape/feet, at least10percent blank margin. No overflow or touching any neighboring frame, no grid/text/shadow/ground.
Right-facing three-quarter side view, real continuous anatomy. STANDARD YATO right hand grasps black handle behind gold guard. Straight blade physically CONSTANT length .535H, total weapon .70H, same size allframes, all sword axes parallel to picture plane (NO perspective shortening), accurate connected hand grip. Absolutely NO blade glows, trails, arcs or effects.
Eight-frame J2 BACKHAND HORIZONTAL SLASH, NOT vertical chopping and NOT thrusting. Read top row left-to-right then bottom row.
F1 ready low down-right sword, narrow natural stance.
F2 right elbow bends across chest, right hand brings handle to LEFT waist, blade extends nearly horizontal toward LEFT, left empty hand lifted near chest.
F3 anticipation torso turns slightly left, hand near left ribs, sword exactly horizontal LEFT, weight settles back; no big squat.
F4 active backhand cut begins: rotate torso right, right hand sweeps across torso at waist/chest height, blade points RIGHT only slightly UP5degrees, same full long blade.
F5 active wide follow-through: right hand extends right at chest height, blade horizontal RIGHT, small right step, left hand behind for balance, torso turns with arm.
F6 follow-through deceleration: right elbow soft, sword RIGHT and10degrees DOWN, body rises naturally.
F7 recovery: hand draws to right hip, blade rotates to30degrees DOWN-RIGHT, cape gently falls.
F8 original slender ready stance, blade45degrees DOWN-RIGHT, legs naturally narrow.
The sweep is a horizontal plane generated by torso rotation, no sword over head. Retain exact same face/head size/leg length and cape color across all8.
```

## J2 action fix

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-6ae449f1-f03d-4dc5-85f8-722a2cf60e1b.png

交付：assets/human-v2-jab2-action.png

```text
Use case: precise-object-edit. Image1 original master is sole human anatomy/identity/costume authority. Image2 is EDIT TARGET eight-frame four-column two-row animation sheet. Preserve all eight heads, long slim legs, body scale, soft silver armor and muted slate-blue cape. Fix ONLY the J2 action arm/sword direction and sheet spacing. This is BACKHAND HORIZONTAL SLASH, not a forward stab. TOP ROW FRAME2 and FRAME3: the RIGHT arm must cross her torso, its hand grips sword behind guard at LEFT waist/ribs, and the entire straight blade points horizontally toward SCREEN LEFT, opposite her gaze. Tilt at most5degrees down. Handle points right behind fist, guard and blade extend left in front of fist. The right elbow is visibly bent across chest, empty left hand raised to balance. Show clear sideways windup with sword behind LEFT side, do not point it right in these two frames. Frame4 is release swinging to the right at chest height, bottom row frame1 is horizontal right follow-through, other poses remain as supplied. ALL swords keep same physical blade length .535 of standing bodyheight, never shorten those two windup swords into daggers.
Uniformly shrink each of the8 ENTIRE figures including sword to75percent of current scale, centered inside own equal square cell, so every sword tip and cape is at least40px from cell edges with broad blank transparent gutters. Keep a2:1 landscape canvas,4columns2rows, no cropped or overlapping figures. Do NOT make heads larger or thicken legs. No effects, trails, glow, arc, floor, text or grid. Transparent alpha.
```

## J2 blade fix selected

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-6b7e4390-7577-450c-bf63-e82705ffdf75.png

交付：assets/human-v2-jab2.png

```text
Precise object edit. Image1 is sole master of Corrin slender adult proportions, costume and SAME rigid Yato sword. Image2 is 4column2row animation EDIT TARGET. Retain exact8 poses and every sword angle including top2/3 pointing LEFT. Fix visibly telescoping weapon: the blade from gold guard front to point must be .535 of standing skeletal bodyheight in EVERY frame. Currently horizontal right-facing swords in frames4/5/6 are too short and thick: extend these STEEL blades to a slim full-length sword, about40percent longer with same thin width; do not move hand/guard, only tip extends. Frame3 left blade lengthen10percent. Frames1/7/8 diagonal blades slightly shorten10percent. No perspective foreshortening: these blades all lie along image plane. Retain actual standard ivory-steel/gold/red Yato design, no glowing weapons.
To fit these long swords, use SMALL figures and huge transparent margins: uniformly reduce all eight whole characters by50percent around cell centers BEFORE redrawing longer blades. Each figure head and body same pixel scale across frames. Equal4x2 cells with large clear transparent gutters, no character touches cell border, and all long sword tips visible. Do not crop or zoom characters back up. No background/text/grid/floor/shadows/effects. Keep exact muted slate-blue cape and thin silver armor; no character redesign, head enlargement or shorter legs.
```

## J1B

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-1d7a7a2b-2b64-43d1-8c1a-c8977ea65fb3.png

交付：assets/human-v2-jab1-b-draft.png

```text
Use case: stylized-concept. A SQUARE transparent game animation sheet, FOUR poses in a 2x2 equal square-cell grid. Image1 original human-master is sole identity, anatomy, outfit color and weapon authority. Image2 approved idle locks slender adult 6.9-head figure with narrow shoulders (.186H), waist(.105H), long thin legs(hip to sole .543H), small head(.145H), soft anime rendering and muted SLATE BLUE cape with deep indigo folds/white pattern. Image3 preceding J1A supplies movement continuity only. Preserve exactly same adult silver-haired female Corrin, silver fitted thin armor, black underclothes, black head ornament, red eyes, BARE FEET. No thicker limbs, no bulky armor, no bright blue cape.
FOUR NEW consecutive J1 frames5–8 after preceding sword swing, right-facing 3/4 side view. Maintain FIXED standing-equivalent body scale approx420px on1254square canvas; same head/limb dimensions in every cell, bent pose not scaled up. Each cell627square, full figure all hair/feet/cape/weapon inside with at least50px empty alpha margin. A clear broad transparent gutter between rows. No text/grid/shadow/ground. Yato right hand grasps handle behind gold guard. Rigid blade length .535H (225px), full weapon .70H, identical each frame with no foreshortening. No baked weapon glow, arcs, trails or any FX.
F5 top-left: fast actual downward diagonal slash continues from prior upper-right blade through to blade now pointing25degrees DOWN-RIGHT; right arm extended forward at lower chest height, rightward short lunge, left hand balances near sternum. F6 top-right: follow-through at front LOW position, blade points50degrees DOWN-RIGHT, right elbow slightly soft, chest beginning rise, left foot moves under body; sword tip clear of floor. F7 bottom-left: recovery, right hand withdraws toward right hip, sword still low diagonally DOWN-RIGHT, legs draw back to natural narrow stance, cape settles but identical colors. F8 bottom-right: nearly the original idle stance, right hand beside hip, complete Yato diagonal DOWN-RIGHT, same relaxed slender long-legged posture as master. No blade turns upward in these4frames: it finishes downward then returns along the low side. Distinct anatomically credible poses, no redundant generated blade, no independent floating sword.
```

## J1B layout

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-61968bb0-b220-43ee-82e5-7aa3061f6f89.png

交付：assets/human-v2-jab1-b.png

```text
Use case: precise-object-edit. Image1 master sole identity/anatomy/cape color authority. Image2 EDIT TARGET is 2x2 J1 four-frame follow-through sheet. Preserve exact four poses and slender long-legged body proportions, slim thin armor, face, SAME desaturated slate blue cape, blade orientation and hand positions. Fix ONLY frame isolation/framing: proportionally reduce each ENTIRE figure including sword to65percent current linear dimensions and center each in its own EQUAL627px square cell on1254px SQUARE transparent canvas. Current top-left sword reaches into neighbor cell; draw entire blade including its point cleanly within top-left cell. All four blade lengths remain physically the same relative to body: guard-front-to-tip .535H. Keep at least65pixels fully transparent margin on all sides of each whole figure. Do NOT zoom to fill. Keep broad transparent gutter between rows and columns. No parts over cell boundaries, no omitted feet or sword point. Full original four poses unchanged, no effects, arcs, glow, motion streak, shadow, floor, text or grid, genuine transparent alpha.
```

## J1A

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-b9ba6210-c6b6-4045-a7d6-274532fa831c.png

交付：assets/human-v2-jab1-a-draft.png

```text
Use case: stylized-concept. Production 2D side-scrolling action game sprite sheet: adult female Corrin / Kamui. Image1 is the ONLY identity, costume, exact slim anatomy, color and Yato weapon authority. Image2 first/top-left standing figure ONLY is the approved anatomy calibration. Do not copy its running poses. Draw the SAME tall slender adult woman, not a chibi, with small head, narrow shoulders, thin waist and LONG slender legs: 6.9–7 heads tall; head .145 of standing height, shoulder width .186, waist .105, pelvis .17, hip-to-sole .543. Delicate fitted thin silver armor, not bulky. Same silver long hair, black ornament, red eyes, bare feet. Cape outer surface muted desaturated slate blue, inner folds deep indigo, same white patterns, soft detailed anime painting EXACTLY image1, never saturated cobalt.
Exactly FOUR full-body animation drawings in equal TWO-COLUMN TWO-ROW grid, reading top-left, top-right, bottom-left, bottom-right. True transparent alpha background, NO text, grid lines, shadow, smoke or ground. Use generous transparent blank space. Each full figure and WHOLE sword inside own cell with 6% margin. Fixed camera right-facing three-quarter side view and FIXED anatomical scale across all 4 frames: if standing upright her body would occupy 63% of a cell height, head 9% cell height. Keep that skeleton and head size in crouched poses; do not enlarge to fill cell. Complete feet/hair/sword, no boundary overlap.
Weapon: standard Yato identical to image1, right hand holds BLACK HANDLE BEHIND GOLD GUARD, blade .535 of standing body-height and full weapon .70. Straight rigid steel blade, same length every frame. No sword glow, no arc, no streak, no trails, no FX whatsoever. Real joints and correct anatomical hands.
CLIP J1 FIRST FOUR of eight: a single one-handed descending diagonal slash toward screen RIGHT. F1 top-left: relaxed narrow ready stance, sword at low front pointing diagonally down-right as reference, left hand relaxed, knees soft. F2 top-right: right elbow bends, hand draws back beside right shoulder, blade angled up/back to upper LEFT, torso turns slightly back, left arm balances near chest, feet still narrow. F3 bottom-left: small rightward step and body weight loads back foot, right hand just above/rear of right shoulder, blade tip upper LEFT, clear anticipation. F4 bottom-right: actual fast slash halfway through DOWNWARD toward screen RIGHT, right hand moves FORWARD to chest height, blade now pointing upper RIGHT at roughly30degrees above horizontal as it cuts downward; lean and small lunge but no squat/stocky body. Hair and cape lag behind to LEFT subtly, head and leg lengths unchanged. Four distinct frames with natural motion, absolutely no painted sword effect.
```

## J1A layout

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-caa64fa2-0505-4ee9-8e2c-60e2a105e887.png

交付：assets/human-v2-jab1-a-layout.png

```text
Use case: precise-object-edit. Image1 original master is the sole character/costume/slender-proportion authority. Image2 is the EDIT TARGET: a four-pose Corrin J1 sword attack sprite sheet. Preserve the four exact poses, delicate slim anatomy, facial identity, low-saturation slate-blue cape colors, rigid sword, and right hand holding behind guard. Change ONLY spatial layout and size to remove overflowing frame contents. Output a SQUARE canvas with a TWO-BY-TWO equal SQUARE grid, no visible grid. Uniformly scale each WHOLE character including hair cape and sword down to 65% of current linear size; do NOT change body proportions or any relative body part size. Center each whole figure within its own square cell with AT LEAST 12% cell-width transparent blank margin on every side. Make the upper and lower rows separated by a broad absolutely empty transparent horizontal gutter. All four swords, feet and hair must be completely isolated in own cell, especially top-row feet and bottom-left sword tip: none may approach any cell border. Empty space is intentional; do not enlarge subjects to fill it. Same anatomical scale across all frames, small heads long thin legs and narrow waist exactly master. Do not add FX, blade glow, motion streaks, shadow, ground, text, checkerboard or background. Genuine transparent alpha.
```

## J1A weapon

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-a8929195-4e74-419e-982b-8380ea1a0a33.png

交付：assets/human-v2-jab1-a-weapon.png

```text
Use case: precise-object-edit. Image1 is original female Corrin master and sole identity/weapon authority. Image2 is EDIT TARGET, a SQUARE transparent four-frame J1 sword animation in2x2. Change ONLY the lengths of the metal Yato blades in the four cells so the SAME rigid sword does NOT shrink across frames. Keep exact every character pixel anatomy/pose/head/hair/cape colors, handle/guard positions, sword angles, framing and cell layout. Do NOT resize the whole figures. The bodies have a fixed standing equivalent of390px on1254x1254canvas. All four metal blades measured from the FRONT of golden guard to TIP must be approximately210pixels, .535 of standing body height. Current raised blades TOP RIGHT and BOTTOM LEFT are too short: lengthen these by about45percent, extending ONLY the far tip upward-left along their existing straight axes, handles remain exactly where held. In TOP LEFT shorten only far blade tip about10percent along current down-right axis. BOTTOM RIGHT lengthen tip slightly10percent along existing up-right axis. Preserve exact conventional Yato design, thin ivory steel and gold edge with central reddish inset, same width, never a glowing beam. No perspective foreshortening because all blade axes lie in screen plane. No added effects, trails, aura, background or text. All feet and swords remain within their cells with roomy alpha margin. Real transparent background.
```

## J1A final

源：C:/Users/46637/.codex/generated_images/01a13ae6-3d06-72c0-91f6-a187afb98c9f/exec-6d66ef12-cbb3-4cd2-a283-f94dd8f99eb3.png

交付：assets/human-v2-jab1-a.png

```text
Use case: precise-object-edit. Image1 master identity authority. Edit image2 only. Preserve every one of the four exact character poses, head/body proportions and slate-blue costume shades. Fix the sword lengths as a rigid constant object: BOTTOM LEFT raised sword blade is still too short, extend its upper-left tip by20percent so guard-to-tip length equals top-right blade. TOP LEFT downward blade is slightly too long, shorten only the tip by10percent. Leave top-right and bottom-right weapons exactly unchanged. Keep all hands/handles/guards unmoved. No effect glow/trail. Then keep the entire same 2x2 composition but shrink ALL FOUR whole figures with swords uniformly to85percent their present size around their own cell centers, making equal wide blank gutters with at least50px space around all content. Important: don't enlarge any frame to fill space, don't make heads larger or legs shorter. Same1254square canvas, each cell627square, proper alpha transparency. Each whole sword/feet/cape inside own cell. No text/grid/ground/shadow.
```
