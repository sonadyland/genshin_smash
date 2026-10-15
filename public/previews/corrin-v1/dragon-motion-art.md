# 女神威白龙完整动作美术生成记录

内置 image_gen__imagegen，transparent_background=true。最终PNG逐字节复制，未脚本绘画/抠图/缩放/修改像素。Pillow仅只读尺寸与alpha。master与idle未改。空白显示灰雾时应检查alpha，不能误把隐藏RGB当作半透明背景。

表格及脚底/虚拟地面位置由只读图像测量与视觉手工登记，bodyHeight固定按骨骼尺度估计，待动态预览校准，不逐帧按外轮廓高度放大蹲姿。

## run-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-4a06b9f1-12a5-4b45-9909-3312b132cb4c.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference image 1 is the APPROVED idle sheet and PRIMARY size/proportions identity reference, reference image 2 the anatomy detail master. Same white/silver armored quadruped dragon from Fire Emblem Fates female Corrin, red eye, branching swept-back horns, graphite neck/belly and FOUR dark clawed paws, compact curled armored tail. Preserve exact anatomy and exquisite clean linework and silver shading. Facing SCREEN RIGHT, nearly side-on with slight three-quarter view, unchanged camera in every frame. Exactly four connected legs: distinguish near/far forelegs and near/far hindlegs, never five limbs or merged paws. NO wings, human, sword, writing, labels, frame, grid or shadows.
Create exactly FOUR actual distinct chronological drawings in a square TWO COLUMNS by TWO ROWS sheet, row-major. Transparent alpha canvas, equal cells; if canvas 1254 square cells627 square. Each entire creature must stay inside its own cell, generous 8% transparent margins each side. Match approved idle physical scale: roughly shoulder-to-hip length180px, standing height400px including horns and totalwidth530px in627cell. Pose may LOWER total height, NEVER enlarge squat/low poses to fill cell. Keep head, torso, paws and horns the same physical size across frames. Position relative pelvis root consistently. Do not zoom. Fixed neutral lighting. Any outside physical silhouette must be alpha0, no fog, aura, soft mist or checkerboard. Only narrow antialias edges translucent. All horns and claws and tail uncut, no cross-cell overlap. Tail curl compact to save room. Motion comes from real drawn joint articulation, not translating or rotating the whole body.
Animation: RUN CYCLE FIRST HALF frames1-4 of8, medium agile quadruped trot at combat-ready pace. Keep shoulders around same height and neck tilted slightly forward, modest spine rebound, compact tail acts as counterbalance. Body moves in-place, paws cycle relative to torso with actual elbow/knee/hock bends.
Frame1 upperleft CONTACT: near forepaw reaches right and plants, far hindpaw steps forward under hip; far foreleg flexes beginning its backward push, near hindleg stretches back pushing.
Frame2 upperright DOWN: near forepaw supporting weight, near foreleg bends at elbow; far hindpaw supports diagonal pair, far forepaw lifts behind chest, near hindpaw lifts from rear. Chest lowers only slightly.
Frame3 lowerleft PASSING: near foreleg travels back under chest with planted paw, far foreleg bends and passes forward clearly airborne. Near hindleg swings folded forward, far hindleg pushes back.
Frame4 lowerright UP: far forepaw reaches forward about to contact, near hindpaw reaches under hips ready to plant; near forepaw rises from rear contact, far hindleg finishes push. Subtle torso rise, head/horns stable, tail curl flexes slightly delayed.
Make the four paw arrangements unambiguously different, no four-paw sliding or identical legs. Run progression only, no magic.
```

## run-a-layout-fix

源文件：Generated images are saved to C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d as C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-4a06b9f1-12a5-4b45-9909-3312b132cb4c.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

```text
Use case: precise-object-edit. Edit reference1 ONLY layout: keep its four running dragon drawings, exact anatomy, distinct leg positions, white silver armor, dark paws, red eye, right-facing camera, linework, shading. This is a 2x2 four-frame transparent sheet. The TOP LEFT frame's front paw crosses central boundary. Correct by uniformly shrinking EACH complete dragon to 83% of its current physical size within its OWN quadrant, preserving all limb proportions and all action poses. Restore clipped top-left paw if needed using intact matching anatomy from reference2 identity. Center each complete dragon within its own quadrant with 45px minimum clear alpha margin left/right on627cell. Entire width max520px and standing height340px. This intentional blank margin MUST remain empty, never zoom dragon to refill quadrant. All four complete dragons separate, 100px transparent vertical gutter across middle. Keep every foot/horn/tail fully visible. No other design change; no rearrangement of chronological frames. Truly transparent alpha0 outside dragon, no haze/shadow/gray background/checkerboard/labels/grid. Reference2 is approved idle anatomy only.
```

## run-b

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-3212cb91-ee68-4a6f-aa89-5607a283d1a4.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference image 1 is the APPROVED idle sheet and PRIMARY size/proportions identity reference, reference image 2 the anatomy detail master. Same white/silver armored quadruped dragon from Fire Emblem Fates female Corrin, red eye, branching swept-back horns, graphite neck/belly and FOUR dark clawed paws, compact curled armored tail. Preserve exact anatomy and exquisite clean linework and silver shading. Facing SCREEN RIGHT, nearly side-on with slight three-quarter view, unchanged camera in every frame. Exactly four connected legs: distinguish near/far forelegs and near/far hindlegs, never five limbs or merged paws. NO wings, human, sword, writing, labels, frame, grid or shadows.
Create exactly FOUR actual distinct chronological drawings in a square TWO COLUMNS by TWO ROWS sheet, row-major. Transparent alpha canvas, equal cells; if canvas 1254 square cells627 square. Each entire creature must stay inside its own cell, generous 12% transparent margins each side. Match approved idle physical scale: roughly shoulder-to-hip length150px, standing height330px including horns and totalwidth470px in627cell. Pose may LOWER total height, NEVER enlarge squat/low poses to fill cell. Keep head, torso, paws and horns the same physical size across frames. Position relative pelvis root consistently. Do not zoom. Fixed neutral lighting. Any outside physical silhouette must be alpha0, no fog, aura, soft mist or checkerboard. Only narrow antialias edges translucent. All horns and claws and tail uncut, no cross-cell overlap. Tail curl compact to save room. Motion comes from real drawn joint articulation, not translating or rotating the whole body.
Animation: RUN CYCLE SECOND HALF frames5-8 of8. Reference3 shows run frames1-4 to match body size and motion styling. Keep torso horizontal, head/horns stable, slight spine rebound, curled tail counterbalance. Running in place, leg articulation truly changes.
Frame5 upperleft opposite CONTACT: FAR forepaw reaches forward and plants (visible slightly behind near leg), NEAR hindpaw under hip plants; NEAR foreleg toward rear finishes pushing, FAR hindleg stretched back pushes.
Frame6 upperright opposite DOWN: far foreleg bends supporting weight, near hindleg bears load; near forepaw lifted behind chest, far hindpaw lifting from rear. Chest lowers slightly.
Frame7 lowerleft opposite PASSING: far foreleg planted under chest travels back; near foreleg bent and swings forward visibly. Far hindleg folded swinging forward; near hindleg pushing back.
Frame8 lowerright opposite UP: NEAR forepaw reaches forward ready to contact, FAR hindpaw advances under hips ready to plant; far forepaw rises, near hindleg completes push. This leads smoothly into reference3 top-left frame1.
Distinguish these near/far leg phases, don't repeat first-half leg positions. NO extra legs. Keep entire four-paw creature and tail INSIDE each cell with wide transparent gutter. Do not fill empty margins.
```

## run-b-layout-fix

源文件：Generated images are saved to C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d as C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-3212cb91-ee68-4a6f-aa89-5607a283d1a4.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

```text
Use case: precise-object-edit. Reference1 is TARGET 2x2 running dragon sheet. Reference2 is desired LAYOUT and fixed creature size. Preserve EXACTLY the four distinct running poses in reference1, their leg positions, creature identity, armor, horn, tail and all anatomy. SHRINK each complete dragon uniformly to match the SMALL complete dragons in reference2. Put them into LANDSCAPE 1536x1024 canvas divided into 2cols2rows768x512cells. Every dragon totalwidth <=480px, totalheight<=340px, center in each cell, HUGE intentional blank clear alpha margins of at least120px left/right and60px top/bottom. Top-left current foot crosses cellboundary and is clipped: restore paw from reference2 anatomy; four full connected paws perdragon. DO NOT zoom to fill cells. Same chronological row-major four poses, all parts visible, no other changes. Transparent alpha0 background and gaps, no haze/shadow/labels/grid.
```

## jump-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-9c61a619-662c-431f-afe1-1c04655cded7.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation: JUMP FIRST HALF 4 of8 distinct poses. Reference2 idle gives anatomical details. Keep same size perpart as reference1, long elegant connected limbs. Frame1 upperleft crouch anticipation: bend both rear knees/hocks deeply, lower hips, forelegs bend but paws planted, neck extends forward for balance, head remains upright.
Frame2 upperright launch: hindlegs extend strongly backward/down pushing ground, forelegs lift and reach forward, torso angled upward just10degrees, neck forward, tail gently sweeps down.
Frame3 lowerleft rising airborne: all four paws off ground, forelegs fold at elbows under chest, hindlegs bent under pelvis, body gently curved, neck stretched forward. Clear gap below paws, no hovering wings.
Frame4 lowerright apex: airborne compact tuck, forepaws curled beneath chest and hindpaws tucked near belly, head looking right, tail curled behind, four limb connections remain visible.
Keep body physical size equal to reference1, no enlargement of tucked frame. Place pelvis at similar screenroot; airborne poses naturally higher than standing baseline so feet not forced back to floor. Huge transparent margins. NO magic/speedlines/floor.
```

## jump-b

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-b6793699-3f15-4198-85cb-b0ae4ee66136.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation: JUMP SECOND HALF frames5-8 of8; reference2 is actual jumpfirsthalf, preserve creature body and head sizes. Frame5 upperleft DESCENT: four feet airborne, front legs extend downward-forward preparing contact, rear legs still flexed under hips, neck slightly lowers, tail counterbalances up. Body moves down but doesn't change size.
Frame6 upperright FOREPAW CONTACT: both forepaws touch implied ground, foreleg elbows bend to cushion, hindfeet are still slightly above ground moving forward; head gently dips with neck, no face impact.
Frame7 lowerleft LANDING COMPRESSION: all four paws down, hindknees deep bend and belly lowers, forelegs support compressed chest, neck curves forward and head low but alert, tail curls tighter.
Frame8 lowerright RECOVERY: legs extend partway back to normal upright quadruped idle, head returns to relaxed forward alert. Looks like approved neutral idle, feet grounded.
Each cell wholebody has generous transparent margin, no floor, no dust, no magic, no gravity lines. Actual articulated landing, not global squashing or zooming.
```

## jump-b-layout-fix

源文件：Generated images are saved to C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d as C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-b6793699-3f15-4198-85cb-b0ae4ee66136.png by default.
If you need to use a generated image at another path, copy it and leave the original in place unless the user explicitly asks you to delete it.
The generated image is already displayed to the user. There is no need to render it in the final response as a Markdown image or file link.

```text
Use case: precise-object-edit. Target is reference1 four-frame transparent quadruped dragon jump landing sheet. Preserve the EXACT four poses, anatomy, identity, head/paw sizes relativebody, right-facing camera, silver armor, tail and linework. ONLY correct layout: the top-right paw slightly crosses horizontal quadrant line. UNIFORMLY shrink EACH complete dragon to85% of current physical size, center each in its own quadrant with at least55pixels clear margin on EVERY side. Restore any cut paw as fullpaw. Keep canvas1536x1024 two columns/two rows,768x512 cells; full silhouette max470pixels wide and330pixels tall. All 4creatures fullycontained, no cross-cell pixels. Do NOT refill intentional blank space, do not change landing chronology. Actual transparent alpha0 background outside physical silhouette, no fog/shadows/labels.
```

## dodge-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-8b0fb5a1-d562-4cec-b932-42e2c83769dc.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation DODGE,4 chronological poses:1 anticipation all four legs bend, chest lowers, head tucked forward, tail draws close.2 powerful low forward spring: rearlegs extend pushing back, frontlegs reach forward, spine elongates mildly, head low and horizontal, NOT a rotated idle.3 low skim/recoil: frontpaws contact and elbows bend, rearlegs swing tucked underneath, compact head/neck aligned forward.4 recover: hindpaws land, chest begins rising to idle, tail settles. Whole body low but same physical head/torso sizes, motion in place with actual limbs, no speedlines. Full paw/horn/tail within cell.
```

## hurt-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-0cde24a0-2dd8-48d6-9763-a59e8fbbf893.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation HURT small recoil,4chronological poses:1 alert stance reacts shoulders pulling back a little, neck shortened, red eye squints.2 very brief strongest flinch: knees slightly flex, chin recoils, four paws remain planted; no thrownback body.3 neck/chest release tension and head begins returning.4 close to original calm combat idle, eye open. Same footpositions and fixed scale, mild frame-to-frame deformation, NO damage blood/wounds/magic. This will play briefly; not a dramatic interrupt or collapse.
```

## defeat-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-41a77bc4-ca57-4e91-b686-1653cb2744a4.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation DEFEAT,4chronological poses:1 knees give way under weight, chest dips and head droops.2 forelegs fold at elbows as chest sinks near floor, hindlegs bend inward, head lowers, tail slackens.3 belly rests on implied ground, all FOUR legs folded naturally alongsidebody, chin lowered almost to paws, red eye halfclosed.4 final still defeated pose with head resting low near forepaws, eyes closed, body curled compactly, tail relaxed. No gore, dismemberment or blood. Physically articulate collapse, no globalrotation, no overall resize. Same torso/head scale as all referenceframes, lower pose leaves more emptyspace.
```

## jab-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-b4430990-01d8-44a4-8085-5f0f24f41484.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation J WATER BOLT normalattack FIRST HALF4 of8. This is a LOW AIMED projectile from actual mouth, distinct from upright idle. The dragon NEVER conjures with its feet. Four paws planted, shoulders and hips fixed; head/neck articulate strongly DOWN AND FORWARD without resizing.
Frame1 upperleft: begin bending neck forward, jaw lowers from idle toward shoulder height; red eye looks horizontallyright.
Frame2 upperright: neck curves almost horizontal, head reaches forward, muzzle at CHEST height aboutone foreleg-length above ground, so shot hits smallenemies; all fourfeet steady.
Frame3 lowerleft: maintain this LOW muzzle, chin draws back fewpixels as throat expands briefly; tiny cyan-white glow visible INSIDE mouth andunder jaw, head silhouette readable, mouth slightly open.
Frame4 lowerright: quick head forward twitch with open jaw, same LOW horizontal muzzle axis, one SMALL compressed cyan water orb just leaving lips, diameter no bigger than snoutwidth, short jet less than halfheadlength. No large beam and no water groundpool. Torso mild recoil.
Crucial lowmuzzle position: dragon's jaw must be around lower chest, about halfnormal idlejawheight abovefeet, neck makes deep forward curve. Whole extended neck/horns stay withincell; if more width needed leave extra room not shrink head.
```

## jab-b

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-773d239b-2517-462d-9983-45524b6c4520.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation J WATER BOLT SECOND HALF frames5-8 of8. Reference2 is firsthalf, start from its low extendedneck bottomright pose, exact physicalsize. Allfourfeet grounded, torso at samelevel, head/neck actually changes, no resizing.
Frame5 upperleft: immediately after shot, jaw stillopen but there is NO floating waterball. Neck recoils gently toward shoulders at LOW chestheight, small cyan glint insidejaw only. Frontknees slightly bend to absorb recoil.
Frame6 upperright: mouth closes, cyan glint dies, neck begins unfolding upward, muzzle half-way to neutralidle.
Frame7 lowerleft: head rises toward neutral alertidle, knees straighten, tailtip follows with slight delayedcurl.
Frame8 lowerright: original relaxed combatidle, closed mouth, head forward/upright, fourlegs planted, no magic.
NEVER add big floatingprojectile to thissheet. Mouth geometry clear, none of muzzle/horns/paws clipped. Keep complete dragon smallwithwide margins.
```

## smash-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-142a29f2-54ac-4cfc-a583-fa5cd19772af.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation K PIERCING WATER CANNON FIRST4 of12, stronger fullbody force than J. Fourpaws brace wider, shoulders and chest active. Reference2 shows lowheadaim only, no projectile shouldbe copied.
Frame1 top-left: from idle, nearforepaw steps a little forward tobrace, hindpaws widen underhips, neckstarts lowering.
Frame2 top-right: bothforelegs rigidly angled out front, rearlegs flex toanchor, chestdrops, neck lowforward.
Frame3 bottom-left: dragon draws neck BACK toward shoulders like a compressedspring, jawstillaims HORIZONTALLYRIGHT at lower chestheight, head pulledback not facingup; chestexpanded, spine slightlyhunched.
Frame4 bottom-right: deepest chest/neck compression, red eye focused, jawpartially opens, small concentratedcyan-white glow INSIDEthemouth, fourpaws gripground, horns sweptback. No beam yet.
Physical head/torso size constant, no wholecharacter scaling. Keep generous alpha margins, no floor, no shadow, no waterhalo.
```

## smash-b

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-073eea46-cbd4-4763-9ef8-23ca8eb639fd.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation K PIERCING WATER CANNON MIDDLE4 frames5-8 of12. Reference2 cannon anticipation, continue its bottomright bracedstance. Fourpaws plantedwide; knee/elbow compression transmits force, not merely jawopen. NO gigantic effect: beam willbe composited separately.
Frame5 upperleft final compression: chestexpanded, neckcoiled back, mouthopen and bright cyan-white tinycore inside, head LOW atchestlevel facingstrictlyright.
Frame6 upperright explosive release: neck SNAPS FORWARD nearlyhorizontal, jawswideopen, frontlegsrigid brace, shoulders lower, tiny straight cyan-white jet ONLY 35pixels long fromactual mouth; no giant external beam.
Frame7 lowerleft followthrough: neck remains extended, bodymass pushes slightlyback onto rearlegs, foreclaws holdfirm; jaw stillopen and 20pixelthin jet remains atmouth.
Frame8 lowerright recoil: frontelbows bend and chestmoves back, neck recoils somewhat while muzzle stays LOW horizontal, mouthpartlyclosing, cyan glow fading.
Full anatomy unchanged, only articulatedpose. Mouth and snout clear, no effectscover face. Each complete dragon plus tiny jet staysinsidecell with margin.
```

## smash-c

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-da3005d0-9227-4180-9082-b2b247edff1d.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation K PIERCING WATER CANNON LAST4 frames9-12 of12. Reference2 is release middlehalf; continue bottomright lowmouth recoil, no projectile or beam.
Frame9 upperleft: mouth closes aftershot, neck still horizontal lowbut shortercoiled, shoulders lowered, elbows slightlybent, fourfeet widebraced.
Frame10 upperright: chest slowlyrises with straighteningforelegs, neck archesup halfway towardidle, jawclosed, focus relaxes, tailtiprecoils delayed.
Frame11 lowerleft: head almostback toidle, nearforepaw subtlydraws back to comfortablebaseline, rearlegs ease theirwidebrace, neckupright.
Frame12 lowerright: complete returntoapproved calm quadrupedidle, alertforwardhead, fourfeetplanted, tailcurlsettled. Samephysicalhead/torso size asfirst3frames, don't enlargeuprightpose.
A real stagedrecovery ofweightandneck, no globaltranslation. No glow, particlesor magic.
```

## secondary-a

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-590f6e15-3cf2-4810-938c-55d3ca7b4394.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation I LOBBED WATER BURST FIRST4 of12. DISTINCT fromJ/K: dragon lifts head UP and casts a forward-UP lobbed waterball, not straightbeam. Frame1 top-left neutralfourfeet alertstance starts raisingchin, chestexpands a little.
Frame2 top-right longneck rises taller, head tilted 25degrees upward-right, forelegs straighten and hindknees bend slightly to counterbalance, tailcurl dips.
Frame3 bottom-left neck bends fartherBACK at itsbase, muzzle looks45degrees upward-right, throat expanded, jaws slightlyopen, small cyanwaterlight INSIDE mouth.
Frame4 bottom-right peak backcoil: upperneck archedback, snout tilted55degrees upward-right, fourfeet firmlyplanted, chest full, smallbright watercore visible INSIDEmouth only. Do not createfloatingorb yet.
Head and horns must neverhit celltop; generous transparentpadding. Same physical body/neck length, the change is articulatedneckbend not longgiraffestretch. No extra limbs or wings. Keep torsolevel and practical compacttail.
```

## secondary-b

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-5943ec18-b86d-4c97-98e1-ce58910ef82a.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation I LOBBED WATER BURST MIDDLE4 frames5-8 of12. Reference2 first4frames is neck-up anticipation, continue its lastframe. Clear distinction from horizontalcannon: projectile launches DIAGONALLYUP-RIGHT from mouth.
Frame5 upperleft: neck at peak backwardarch, muzzle55degrees upwardright, jawopen with compactcyan watercore inside, chestexpanded, all4feet braced.
Frame6 upperright: forceful neckthrows forward while muzzle stays35degreesup-right, neck flexes atbase, jawswideopen; ONE tinywaterball at the lip, about30pixelsdiameter; no distantorb orlongtrail.
Frame7 lowerleft: follow-through neck extendsup-forward, jaw35degreesup-right, waterballhasleft so nofloatingball, just tinycyan residue inside mouth; shoulders gentlyforward and rearlegsbrace, fourfeet remainonfloor.
Frame8 lowerright: neck starts recoiling towarduprightneutral, jaw partlycloses, snout20degreesup-right, glowfading, chest contracts.
Keep complete horns and allclaws fullywithincell. Body cannotjump orstandonhindlegs. No beam, no ray, no bigwatercloud or bigbaked projectile. Actual articulatedneckthrow while torso remainsstable.
```

## secondary-c

源文件：C:\Users\46637\.codex\generated_images\01a139ca-d0d8-7221-93f2-f5bf0d7a0a6d\exec-29befb54-09f8-4b46-9490-15910af7d372.png

```text
Use case: stylized-concept. Asset type: production transparent 2D anime game animation sprite sheet. Reference1 APPROVED run-sheet is the PRIMARY layout, physical size and identity reference. Match its small complete creature size and generous empty space exactly. Elegant female Corrin silver-white armored quadruped dragon from Fire Emblem Fates, red eye, swept branched horns, graphite neck/belly/feet, compact curled armored tail, four connected legs. Same crisp delicate outlined anime silver rendering, camera right-facing slight three-quarter side. Exactly FOUR chronological drawings in TWO COLUMNS TWO ROWS, row-major, like reference1. Keep full character in each cell, no zoom. Use LANDSCAPE 1536x1024 layout with 768x512 cells. Each creature must be at most480px wide and340px high in each768x512 cell; center in cell with125px clear margin on left/right and60px top/bottom. For lower poses keep same physical anatomy scale and MORE vertical empty space; no normalizing to fill cell. Never crop horns, feet or tail, never crosscell. All four legs anatomically continuous and distinguishable. Real articulated drawings not globally moved or rotated copies. NO wings, human, text, grid, floor, shadow, smoke, aura. Genuine alpha0 empty background, narrow antialias edge only. Neutral lighting. In any attack mouth microglow only, independent large FX added elsewhere.
Animation I LOBBED WATER BURST LAST4 frames9-12 of12. Reference2 shows launchmidcycle, continue its lower-right neckupfollowthrough. Allfourpaws grounded, no lingering projectiles.
Frame9 upperleft: jawcloses afterlob, snout still20degreesup-right, necktension releases, chestbeginsexhale.
Frame10 upperright: headnods forward/down slowlyto horizontalfacingright, neck beginsfolding into relaxedS-curve, foreknees easeslightly.
Frame11 lowerleft: returnnearoriginal neutralidleshape, eyecalm, headslightlylower thanneutral fromfollow-through, tailtip easesback.
Frame12 lowerright: matching calmcombatidleheadheight, mouthfullyclosed, fourlegsplanted stable, tailcurlatrest. Fixedphysicalhead/torso size,no resizing.
No glowingmouth, water, beam, orb, ground, effectsor background. Headmotion andlongneck visible, exactsame silver-white dragon.
```

## 完成与验证

本轮白龙追加 15 张四格表 / 60 个独立绘制帧：run8、jump8、dodge4、hurt4、defeat4、jab8、smash12、secondary12。原已批准master和idle未修改。所有15个最终PNG与内置生成源逐字节相同。所有表为RGBA，每张alpha0像素超过110万，alpha>32主体边界均在各自格内，无跨格或裁切。

`dragon-motion-registration.json`包含全部sheet实际尺寸、alpha边界、SHA256、原图来源、建议时序、固定骨骼标尺、格内pivot和JKI口部坐标。run-a尺寸1551×1014，其左/右格宽分别775/776；其他表1536×1024。所有坐标都使用源图像素；mouth按全图视觉估计，需用预览叠层进一步核准。不能把口边亮点误作外部弹体起点。释放帧J4、K6、I6（1-based）。J口部前伸压低；K水平发射；I上前方抛射。跳跃腾空阶段用虚拟地面pivot保留空中高度，不把每帧脚底强制落地。

run-a、run-b、jump-b分别经过一次内置模型留边修正。修正只用于未交付临时稿，未覆盖已批准待机。其他表没有二次生成。实际帧不可能仅凭不同hash判定流畅；本登记尚待浏览器动态审片。
