# 女神威人形 v2 基础动作重绘

## 浏览器复核后的定向修复

run第3/7帧替换为 `human-v2-run-passing.png` 的左上/左下，分别为右腿支撑左膝前越、左腿支撑右膝前越。保持其它接触/承重帧，不用时间调整掩盖重复轮廓。新cycle为 near1→near2→passing1→opposite3→opposite1→opposite2→passing3→near4。

dodge仅末帧使用 `human-v2-dodge-headfix.png` 的右下；原前三帧仍用原图。全身标尺保持516，头颏竖向标尺约76（.147H），只通过imagegen定向改小头/脸，未renderer单帧缩放。

### 定向修复 human-v2-run-passing.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-cf3a3853-2817-4d16-96a5-15f6215a4e0a.png`

```text
Use case: stylized-concept. Generate a precise RUNNING PASSING-POSE supplement for female Corrin; Image1 original master is anatomy/face/armor/slateblue cape authority, Image2 and3 only establish same run sword carry and body leaning. Four NEW articulated poses, square2x2, no contact striding poses. Same small adult head0.145H, narrowwaist0.105H, longslimlegs0.543H and white/silver fittedarmor. Same standing equivalentH600px and head87px in all4, same pixel-sized skeleton. Standard Yato held in right/near hand low behind hip, blade pointsback-left, full length. Real transparentbackground, noFX/shadows/text. Keep fullsword/body inside eachcell with30pxmargin.
EXACT MISSING POSE: one SUPPORT LEG is nearly vertical from hip to floor; OTHER knee has already swung FORWARD in front of hip, the lifted thigh points forward-right almost horizontal, lifted shin folds back/down underneath its kneecap. Do not draw lifted thigh behind the torso, and do not draw a long leg reaching to frontcontact. This is midstride, NOT a stretched stride/contact.
Camera faces right3/4, anatomical RIGHT side nearestcamera (same sideas swordarm); nearesthip at leftsideofpelvis. Near leg overlaps far where theycross.
FRAME1 top-left RIGHT LEG SUPPORT / FAR LEFT KNEE FORWARD: NEAR right hip→right knee→right foot make an almost VERTICAL support column underbody. FAR left thigh extends forward-right from otherhip to kneepoint IN FRONT of pelvis; far leftshin folds downward and back with heel tucked beneath liftedknee. Thus FAR LEFT KNEE is visibly in front of the nearleg, but farthigh is occluded at hip behind nearthigh. The liftedbarefoot is forward of rear silhouette, NOT behind buttock. Head/torso upright-forwardlean10degrees, cape flowsleft.
FRAME2 top-right: same right support leg begins pushing rearward on its toe, FAR left knee still ahead and shin begins opening for nextleftcontact. Both feet may lift a little, no change in overall bodybone dimensions.
FRAME3 bottom-left LEFT LEG SUPPORT / NEAR RIGHT KNEE FORWARD: FAR left hip→left knee→left foot make a nearly VERTICAL support column underbody. NEAR right thigh starts left/nearhip and extends FORWARD-RIGHT horizontally infront of torso, rightknee infront, rightshin folds downward/back. NEARrightthigh overlaps and covers partof supportleftthigh at crossing. Nearrightbarefoot tucked beneath/below forwardknee, not behindbuttock. This is opposite leg passing fromframe1, make armor overlap proveit.
FRAME4 bottom-right: leftsupportleg starts toeoffbehind, NEAR rightknee remains liftedfront and shin opens forward to nextcontact. Sameface/posecamera/cloth colors/headsize in everyframe, no mirroring body or switching swordhands. Focus on genuine knee-forward OVERPASS. No frame with BOTH knees behind hips.
```

### 定向修复 human-v2-dodge-headfix.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-19fd4778-03dd-4860-ae53-de41d6ea9698.png`

```text
Use case: precise-object-edit. Edit ONLY the BOTTOM-RIGHT fourth figure in Image1 (4frame Corrin dodge sheet). That bottom-right finalstandingpose has a head/face visibly12%too large comparedto master Image2 and approved idle Image3. Redraw its HEAD AND FACE about11% SMALLER relative to her unchanged body, keeping silverhair roots/blackornament scaled together around anatomical neck attachment. Match precisely master headshape, maturefine smallface, crown-to-chin0.145 of standingbodyheight. Current imagefigure is about0.163H. Do NOT scale the entire sprite, torso, limbs, cape, sword or standingheight. DO NOT change the other3figures, any pose, any handgrip, sword direction/length, torso/armor thickness, feet or cape palette. Keep headposition attachednaturally at neck, avoidstretchingneck. Preserve originalsize and2x2 arrangement, all existing surrounding transparent space, same muted slate/navy cape and master white/silverarmor shading. No newFX/shadows/text. TRUE alpha background. Only targeted face/head proportion correction in fourth frame, allotherbodypixels visually unchanged.
```


## 当前选择与复核范围

当前36帧登记见 `human-v2-motion-registration.json`。使用：`human-v2-idle.png`（与idle-draft原图byte-identical）、`human-v2-jump.png`、`human-v2-dodge.png`、`human-v2-hurt.png`、`human-v2-defeat.png`；run使用 `human-v2-run-near.png` 与 `human-v2-run-opposite-draft.png`，次序为 near1、near2、near3、opposite3、opposite1、opposite2、opposite4、near4。后者文件名保留draft历史名，不代表选入了先前的8格同相run。其他calibration、run-draft、run.png及idle-margin-rejected均不用于正式动画。

已按原始alpha读数验证源尺寸/裁框/文件哈希；未程序修改像素。run两张sheet每张固定解剖标尺690/620，近远腿接触遮挡可区分，仍需预览0.25倍速复核过步衔接（near2→near3、opposite2→opposite4）与整表比例。jump使用虚拟地面而非逐帧脚底归零；两行分别裁框，上排2/3在x786接壤，帧2剑尖止于785、帧3披风从786开始。此处边界有alpha，不代表把人物常规格裁断。alpha为0的RGB灰烟不可当可见背景。

内置 image_gen。所有PNG原图直接byte-copy，未程序修改像素。`human-master.png` 是身份/骨骼/灰蓝披风唯一权威；refined calibration仅辅助相同造型尺度。

母版人工近似标尺：站高1131、头164=.145H、肩骨210=.186H、腰115–125=.10–.11H、骨盆185–205=.164–.181H、髋到足614=.543H；Yato刃605=.535H、全长790=.70H。标尺不用于逐帧扭曲缩放。

## 1. human-v2-calibration.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-63a683aa-0f18-4155-a668-5e642a7fb185.png`

```text
Use case: stylized-concept. A production transparent four-pose MODEL CALIBRATION sheet for adult female Corrin from Fire Emblem Fates in our refined hand-painted anime side-scrolling game. Image 1 is the ONLY authority: preserve precisely her slender adult anatomy, relatively small face/head, long slim legs, narrow rib cage/waist and delicate shoulders, face, silver hair, armor design, bare feet, cape fabric and standard Yato. This is the SAME woman redrawn in four poses, not a cute/chibi or bulky reinterpretation. Measured source proportions: standing height H; crown-to-chin 0.145H, 3/4 visible bony shoulder width0.186H excluding hair/cape, waist0.105H, solid pelvis0.17H excluding flared skirt armor, hip-joint-to-sole0.543H. Sword blade0.535H and full sword0.70H. Copy source dark charcoal undersuit, fitted white/silver armor (not puffy), the SAME desaturated slate/dusty blue cape with deep navy shadows and muted white trim motif, no electric royal blue, same soft neutral lighting in all poses. Face and body point right 3/4. Draw exactly 4 independent figures in a square 2 columns x2 rows sprite sheet, equal square cells, without borders/labels/text. All heads are identical size, skeleton segments identical length, armor plates identical size; do not enlarge a bent/running pose to fill its cell. At 1254x1254 sheet, each equal627pxcell uses standing-equivalent H=460px, head crown-to-chin67px, shoulder86px, waist48px, legs250px. Ground baseline y565 inside every cell. At least30px clear transparency around head, feet, hair and sword. TRUE transparent alpha; no floor/shadow/background/smoke/glow. Full unclipped sword and body.
F1 top-left: same natural upright ready stance as master, feet a little apart, knees relaxed, right hand grips the black sword handle behind gold guard, blade points down-right, empty left hand relaxed.
F2 top-right: light forward-lean RUN contact pose; near/right leg forward almost extended with heel touching floor, far/left leg extends behind on toe. Near/right sword hand holds Yato low beside/back hip, blade diagonally BACK-LEFT kept clear of legs and floor, free left forearm swings forward. Cape trails left in compact folds, no huge sail.
F3 bottom-left: same run's passing phase; right supporting leg under hip with knee flexed, left knee folds and passes forward, no foot swap artifacts; pelvis slightly lower, same-length torso/thighs/shins; sword held low backward by right hand consistently.
F4 bottom-right: OPPOSITE run contact phase, FAR/LEFT leg forward at heel-touch, NEAR/RIGHT leg back extended toe-off, free left arm counter-swings backward, same right hand sword hold. Clearly distinguish which bare leg is near vs far across F2/F4, do not mirror the whole figure or switch sword hands. Hair/cape folds vary gently but keep exact colors/material and shape. The model must remain tall-looking and slender in all poses. No motion blur, effects, extra limbs or weapons.
```

## 2. human-v2-calibration-refined.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-7508a165-c6ab-4890-8598-9acc4aadb85b.png`

```text
Use case: identity-preserve. Correct the four-pose calibration sheet (Image2) so its anatomy EXACTLY MATCHES original master Image1. Keep all four pose intentions, same armor/cape colors and style. The current sheet still has a head about7% too large and legs about7% too short compared with Image1. Redraw each head/face 7% smaller relative to its torso; anatomically lengthen thigh and shin together by7%, keeping knees/ankles slim. Keep shoulder and waist widths unchanged. NO raster stretch: redraw real proportions matching original master. Image1 is sole identity, body and cloth authority. Each frame is same slim tall adult woman. Preserve slate-muted-blue cape (not royal blue), white/silver armor, barefoot, same right-hand Yato. Keep head the SAME absolute size and legs same segment lengths in all poses, including bent knees. Running F2/F4 thighs should be no thicker than F1 standing thighs.
Change layout to comfortably fit 2 columns x2 rows: EACH figure is uniformly smaller in its own equal627pxcell, so at least45px EMPTY TRANSPARENT MARGIN on every edge, including sword and feet. Nominal uprightH480px. Upper left F1 crown y70 and sole550, no outline past y575. Bottom row starts y627, no outline above y672. Never clip/cross a cell. Keep the sword full length. TRUE TRANSPARENT PNG, no backgrounds/shadows/FX. Full reference-guided anatomical correction, no text or labels.
```

## 3. human-v2-run-draft.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-df148a39-c036-414a-997d-b8911a5ce644.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
Draw a SINGLE WIDE sheet, exactly4 columns x2 rows = EIGHT frames of one running cycle, row major. Same pixel scale and head size in all8, standing-equivalentH=355px and head52px in each512px-square cell; within each cell center the pelvis atx275 and virtual floor y450. All body, flowing cape, sword fit inside each cell with minimum32px empty margins; no overlap between adjacent cells. Do NOT draw too large. Sword held by right/near hand low beside rear hip, blade points diagonally BACK LEFT throughout, slightly swinging with wrist, always full same length. Left empty hand counter-swings gently. Light forward torso lean, no hunched huge shoulders. Every cape remains the same muted slate/navy cloth, trails backward in small gradual waves.
Eight genuine alternating-leg running drawings:
F1 TOP row col1: NEAR/RIGHT leg reaches FRONT with heel contact, FAR/LEFT leg behind extends on toe-off. Near right knee almost straight. Left arm in front.
F2 top col2: near/right stance leg now below pelvis and flexes under load, far/left knee swings forward tightly and passes behind near thigh.
F3 top col3: near/right leg pushes off behind on toes; FAR/LEFT knee lifts forward at right; left arm begins backward swing.
F4 top col4: short flight: FAR/LEFT leg extends toward front-right, NEAR/RIGHT knee folds back-left with heel near buttock, both feet off ground; near right thigh visibly points BACK LEFT (this is opposite F1).
F5 BOTTOM row col1: FAR/LEFT foot (the slightly darker/farther leg) contacts in FRONT-right while NEAR/RIGHT bare upper thigh points BACK-left and right foot pushes behind. This MUST be opposite anatomical leg from F1; no mirroring the whole figure, same face/right-hand sword/camera.
F6 bottom col2: far/left leg under pelvis bears load, NEAR/RIGHT knee bends and passes forward, shoulder/torso same height as F2.
F7 bottom col3: far/left toe pushes off behind, NEAR/RIGHT knee lifts forward at right.
F8 bottom col4: short flight: NEAR/RIGHT leg extends forward-right for F1 heel contact, FAR/LEFT knee tucked behind-left. Loop smoothly to F1.
F1 and F5 cannot show the same leg in front. Use armor overlap correctly to identify near/far legs. Height naturally changes with knee flexion at identical bone length. Natural articulated bare feet, not ice-skating or identical repeated strides. All8 fully clean silhouettes, zero motion lines or attack FX.
```

## 4. human-v2-run.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-b9918be8-3502-47d0-bd0b-741a1a427db5.png`

```text
Use case: precise-object-edit. Image1 original master is identity/proportion/color authority; image2 is edit target 8-frame run sheet. Keep exactly4 columns and2rows. Keep its muted cape colors, faces, arm positions and sword. Repair two defects: (A) missing opposite-leg halfcycle, (B) too-close cell edges. Redraw ALL figures uniformly15% smaller within their own cells with minimum30px transparent margins; do not alter head/body ratio. Match master face/head smallness: head height must stay0.145 of standing-equivalent anatomy, long slim legs .543H.
CRITICAL LEG EDIT IN ENTIRE BOTTOM ROW ONLY: the exposed NEAR RIGHT upper thigh currently slopes down-right (forward) in every frame. It must instead slope DOWN-LEFT (BACKWARDS) in frames5 and6. The near/right knee must be LEFT of the pelvis center, not right. The front right-side leg belongs to the FAR LEFT leg and passes BEHIND the pelvis/near thigh. Draw overlapped armor correctly. Frame5 bottom-left: near right hip to right knee direction down-left about45degrees, near shin continues back-left with near toes pushing off at rear farleft. Far left thigh slopes down-right, far knee nearly straight, far foot at front-right heel contact. Thus right leg BACK, left leg FRONT, opposite of frame1. Frame6 bottom col2: near/right knee remains back-left, near/right heel lifts upward behind buttock, far/left leg supports directly under hip. Frame7 bottom col3: near/right knee now passes forward underneath pelvis, far/left heel begins toeoff behind. Frame8 bottom col4: near/right knee forward and shin forward ready for frame1 contact, far left leg folds back. Keep same right-facing camera and same right-hand sword, do not mirror the whole body. At least frame5 must clearly show the near RIGHT thigh and knee BEHIND the pelvis, so player sees alternate feet. Four bottom poses are not copies of top poses. TRUE transparent alpha, no FX or shadows.
```

## 5. human-v2-idle-draft.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-762a4228-807c-44c9-b1b2-ab41fd7c51c6.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
Exactly8 distinct consecutive relaxed idle poses on one wide4columns x2rows sheet, rowmajor. Same character scale in all8, full standing-equivalentH350px in nominal512cells, head51px. Crown aroundy80, feet aroundy430 in each cell, at least40px blank alpha around everything. Long slender legs and small face exactly source. Upright same original master pose: feet a natural small distance apart, hips balanced, knees soft; right hand holds sword low with blade diagonally DOWN RIGHT, left hand slightly forward relaxed. Sword tip clear of ground and calf. Do not redesign pose into a wide fighting crouch.
F1 calm relaxed exhale, eyes open; F2 chest breath rises subtly, chin stays level, cape edge begins gently lifting; F3 inhale reaches peak, tiny fingers relax, same spine/leg lengths; F4 slight settling, eyelids lower halfway; F5 eyes closed in single natural blink, unchanged face size; F6 reopen halfway; F7 eyes fully open and exhale lowers shoulder subtly; F8 settle ready to loop, lower hair/cape recover. Breathing tiny realistic joint motion and subtle hair/cape followthrough, no change in viewpoint or zoom, keep feet fixed. Standard master proportions, mature calm expression, armor does not inflate with breath. Keep desaturated blue cape pixel colors/material and white trim pattern continuous. No smoke/weapon glow/trail or cast shadow.
```

## 6. human-v2-idle-margin-rejected.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-8771fa28-e6a7-4424-a7cc-720d48df184f.png`

```text
Use case: precise-object-edit. Preserve this exact 8-frame Corrin idle sheet artwork including same mature slim proportions, small head, long legs, slate-blue cape colors, standard Yato length and all different breathing/blink drawings. Change only layout: independently and UNIFORMLY reduce EACH figure to80% of its current size inside its own cell (4columns,2rows), reposition with fully transparent margins at least35px on every side. Entire canvas remains same2:1 aspectratio, equal square cells. Toprow soles stop at roughly90% of first row height, bottomrow soles at90%of secondrow height. Sword tips must have at least35px clear alpha to everycell boundary. No missing toes. No change to relative anatomy or body segments, not thinner/fatter, no recoloring. Original master is second reference solely to prevent drift. TRUE alpha transparent, no text/borders/background or floor.
```

## 7. human-v2-jump.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-022aac24-483e-459e-a01c-7fa43d6458fe.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
One wide sheet4columns x2rows, eight sequential jump action poses. Each cell fixed standing anatomyH350px, head51px, same sword0.70H. Fixed camera and virtual ground at y430 in each cell; high flying poses use MORE empty area below, NEVER zoom them up. All sword/feet/hair must fit cell with at least35px padding. Sword right hand low at hip, blade angles forward-down clear of body and ground, free left hand balances.
F1 top-left prepare: grounded shallow squat, knees bend and hips sitback, chest tips forward about15degrees, head stays small.
F2 top-second push: extend hips/knees, both heels rise with only toes touching virtualfloor, arms begin balance.
F3 top-third rise: body upright, both knees gently bend, feet tuck below pelvis and are visibly off virtualfloor, cape/hair trails downward/back.
F4 top-fourth apex: both thighs slightly forward and knees softly bent, feet tucked below hips, no torso swelling. Maintain tall skeletal anatomy even compact pose.
F5 bottom-left fall: legs extend down toward virtualfloor, left hand out at chestheight, cape floats above shoulder slightly.
F6 bottom-second contact: front foot lands, back toes just meetfloor, knees begin flex, hips low; sword kept away from thigh and floor.
F7 bottom-third deepcushion: squat deeper into landing, both knees flex, torso forward, cape/hair settle forward; NOT shorter bones or larger head.
F8 bottom-fourth return: original master upright relaxed narrow stance, sword down-right, same true anatomy as master, longlegs and narrowwaist.
Pose8 must visually resemble original master at the SAME anatomy scale as allother7. No jumping effects, smoke or shadow. Show real joint motion and preserve same pale slate/navy cape cloth.
```

## 8. human-v2-run-opposite-draft.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-3be97592-3cad-4b4e-b9ba-46ab29b0ffc6.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
Draw FOUR new right-facing running poses on a2x2 square sheet. These four poses are the OPPOSITE HALF of the usual run silhouette. DO NOT reuse the calibration run poses. All body/sword/cape inside cell with40px clear padding. Standing equivalentH450px and head65px, same scale all4. Sword right hand low behind, blade diagonally down-back-left; left empty arm balancing. Torso same small slim one as master, legs0.543H.
Pose1 top-left: show a very clear animation key pose with NEAR RIGHT LEG EXTENDED BACKWARDS. Right femur travels from hip down-left, right knee is visibly to LEFT of hip; right shin extends farther down-left and near barefoot farleft pushes toe off. FAR LEFT leg reaches FRONT-RIGHT, knee nearly straight, left heel lands infront. The front leg is behind the rear leg at pelvis overlap; near thigh behind must cross in front. We need the opposite leg forward from calibration. Near arm is right sword hand so near leg is same anatomicalside as sword hand. Rear near thigh must point toward the sword blade tip/back-left, NEVER toward screen-right.
Pose2 top-right: farleft supporting knee under hip flexed, NEAR RIGHT knee bent BACK-LEFT with near heel raised behind hips. Right thigh still visibly behind hip.
Pose3 bottom-left: near right knee swings forwards under hip while farleft leg supports then pushes off; hips pass over leftfoot. Right lowerleg tucks to pass.
Pose4 bottom-right: near right leg now extends forward preparing oppositecontact, farleft knee folds back behind. Both feet float slightly. This completes halfcycle returning near/right foot forward.
All four should show gradual knee/ankle articulation and DIFFERENT silhouette. Keep original gray/slate blue cape not brightblue, identical head and bone lengths. TRUE alpha/no shadow/effects/no labels.
```

## 9. human-v2-dodge.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-385ae86f-8490-4dc9-b572-a48e90282106.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
Exactly4drawings on square2columns x2rows, fullbody from crown to toes and full sword. Draw character small enough for45px clear alpha padding all around each equalcell, standing-equivalentH440px with head64px. Fixed same skeleton/camera every pose. This is a low evasive sidestep-dash to SCREEN RIGHT, no roll and no jump. Sword hand holds Yato low-back so blade points left behind her, freeleft hand slightly front for balance.
F1 top-left anticipation: soft crouch, weight on backfoot, knees bent, torso slightlyforward.
F2 top-right dash launch: nearfront foot reaches right low, backleg pushes long behind, torso inclined forward35degrees, hips lowered, hair/cape trail left; distinct extended athletic stance but keep legs slender and torso narrow.
F3 bottom-left pass: low balanced glide on lead foot, rear knee draws underneath hips, torso begins rising, shoulder level still low; different leg configuration.
F4 bottom-right recovery: plant feet a small normal distance apart, return toward original upright master stance, right hand with sword angles down-right, cape settles left.
Never enlarge crouched body to fill cell. Preserve original fine adult face and long thigh/shin lengths, no bulky helmet/head/chest. No baked FX, motion trails or castshadows, only real body and clothing drawings.
```

## 10. human-v2-hurt-draft.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-b02f50ca-e1cc-4430-9a34-b0933a435986.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
Exactly4 individual drawings on square2x2sheet with generous empty transparent margin. NOT caricature. All4 have original master's tall anatomy, head .145H and longlegs .543H; crown-chin head visibly SMALL, do not enlarge expressiveface. Same upright bodyheight around470px and head68px in eachcell. Small non-disruptive hurt recoil for an action game, no violent launch, no gore.
F1 top-left: master standing stance, right sword hand holds Yato down-right; slight tension shoulder, eyes startled.
F2 top-right: struck torso tilts back about8degrees, near shoulder draws back a little, knees bend slightly; face grimaces with eyes shut, feet remain planted.
F3 bottom-left: body rocks gently forward into balance, freeleft palm presses just above ribs, sword grip stays secure and blade kept out of legs.
F4 bottom-right: shoulders/stance recover to master calm ready, eyes open, cape returns. No large displacement or kneeling. Exact same fixed headsize/shoulderwidth/waist/armorplates/slimthighs in all4. Complete head/cape/feet and long sword fit with30pxblank alpha eachcell. No sparks, weapon FX, aura, blood, shadows or backgrounds.
```

## 11. human-v2-hurt.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-0c9a8fbc-680b-4d79-9f5f-756da1727b41.png`

```text
Use case: precise-object-edit. Correct only crowding in Image1 four-frame hurt sprite sheet: retain exact SAME four poses, face/body shapes, master-like slender proportions, clothing palette and sword. Make a taller PORTRAIT 4:5 composition with2columns x2rows, increase transparent empty space BETWEEN the two rows. Everytoprow foot must end at least60px ABOVE everybottomrow head. Each figure has40pxblank alpha allaround. This is a re-layout, not an anatomy edit: retain exact head/body ratio (master secondimage), same bodybone pixel lengths in all4. If scaling tofit, scale head/body/weapon UNIFORMLY, not bodyonly. Repaint no new expression or pose. Keep allfeetand swords whole. Do not let any outline cross its individual cell. No shadows, no floor/background/effects/text. Real transparency. Master image2 is anatomy authority.
```

## 12. human-v2-defeat.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-8894f9a2-a707-40c9-8b46-bfeae4092a37.png`

```text
Use case: stylized-concept. Production transparent animation artwork of adult female Corrin from Fire Emblem Fates. Image1 human-master is the sole authority for face, proportions, armor, cape palette and Yato; image2 calibration sheet shows the corrected slender body (head and legs now closely match master), not final locomotion. Preserve the SAME mature slender woman: small head, narrow shoulders/ribcage/waist, long slim thighs and shins, silver hair, black floral hair ornament, red eyes, pointed ears, fitted white/silver armor over charcoal undersuit, bare feet. Master ratios to standing height H: crown-chin0.145H, visible3/4 bony shoulder0.186H, waist0.105H, solid pelvis0.17H, hip joint to sole0.543H, Yato blade0.535H/full sword0.70H. EXACT SAME skeletal length, head dimensions and armor thickness in every frame. Do not enlarge heads/torso or shorten legs for action poses; bent poses occupy less height. Same desaturated slate/dusty blue cape with deep navy shadows and SAME muted white trim motifs, soft neutral lighting unchanged. No bright royal-blue hue changes. Right-facing3/4 camera. Each drawing has right hand holding black handle behind gold guard with fingers wrapped round it, physically straight Yato, no extra weapons or limbs. TRUE TRANSPARENT ALPHA, no background/checkerboard/floor/cast shadow, no paint clouds, no text/grid marks, no aura/sparks/trails/weapon effects. All hair/sword/feet wholly inside each assigned cell with visible blank margin. Genuine redraws of articulated joints and cloth, not duplicated/warped images.
Draw4 consecutive defeated-recovery/downed poses, arranged2columns x2rows in a PORTRAIT4:5 sheet with generous clear alpha space betweenrows. Same mature thin anatomy as master, head.145of standingheight and longlegbones. Fixed standing-equivalent anatomyH500px, head72px in everyframe; a crouch occupies lessheight, NEVER enlarged. Emptyalpha margins45px allaround. At virtualground eachcell y85%height.
F1 top-left: stagger into a shallow kneel, shoulders tired, left knee lowering, rightfoot staysfront planted; righthand still grasps sword blackhandle, blade lowforward clearof legs.
F2 top-right: one knee touchesfloor, torso bows slightly, left empty palm reaches tobrace ground, sword righthand low besidebody with tip pointingdownforward but clear.
F3 bottom-left: lower to both knees, left palm braces floor, face downcast, longsilverhair falls forward, rightarm holds sword besideher with blade resting diagonallyforward.
F4 bottom-right: seated/kneeling low on heels, tired shoulders and loweredchin, leftpalm onground, swordstill safely held toside; calm unconscious or exhausted, no violent death or injuries.
Long slender thigh/shin anatomy must remain identifiable folded, no chunky/chibi shortlegs. Armor/cape retain exactly same grayblue palette and fine white trim. Fullweapon+barefeet+hair insidecell. NO blood/gore/damageFX/particles/shadows/environment/text.
```

## 13. human-v2-run-near.png

原图：`C:/Users/46637/.codex/generated_images/01a13adf-918d-75b1-b9a1-b08a39da93ca/exec-cf2163d7-15ef-4c6f-9809-e74c393a2472.png`

```text
Use case: stylized-concept. 2x2 transparent animation sheet FOUR distinct poses of adult female Corrin RUNNING screenright. Original MASTER reference is sole appearance/proportion/costume authority. Same slender adult 6.9headbody (headheight0.145H, shoulders0.186H, waist0.105H, hips0.17H, hip-to-sole legs0.543H), white/silver armor and charcoalunderclothes, small delicate face, barefeet, longsilverhair, blackhairornament, red eyes. Copy MASTER's muted slate/navy cape exactly, no brightroyalblue. Same standard Yato right-hand handlegrip, swordlow at rearhip and bladeback-left. Entirecharacter/sword with30px margin eachcell, truealpha, no FX/background/text. Same anatomicalsize inall4.
CAMERA: right-facing 3/4 view showing her anatomical RIGHT side. Her sword arm is the near RIGHT arm, on the left side of her torso in image. The near RIGHT hip is directly below that sword-arm shoulder, at the LEFTSIDE of pelvis inimage. The near rightthigh must originate from THAT LEFT HIP, then travel diagonally FORWARD-RIGHT across the other thigh in poses1–3. It OVERLAPS IN FRONT and covers partof thefar LEFT thigh where theycross. Do not choose leg identity bywhich foot is screenleft. Do notswap legattachment.
Pose1 top-left: NEAR RIGHT leg from leftpelvis reaches to screenRIGHT front, nearest long thigh diagonal down-right OVERLAPPING thefarleg; nearbareheel at front-right touchesfloor. Far LEFT thigh emerges from rightpelvis and points LEFTBACK BEHIND thenearthigh, farfoot back-left toeoff. This is a natural stride with near leg IN FRONT acrossbody, contrasting master’s nearleg underleft.
Pose2 top-right: NEAR RIGHT knee flexes beneath pelvis bearingweight, far LEFT knee bends behind with heel lifting behind hips. Nearrightthigh still overlies farleftthigh.
Pose3 bottom-left: NEAR RIGHT leg supports just below hips, far LEFT knee swings forward frombehind, crossing BEHIND nearthigh. Right shoulder and head not enlarged.
Pose4 bottom-right: near RIGHT leg extends backward/toeoff, far LEFT knee swings ahead and begins extending shin infront, preparing itscontact.
Make hip-to-knee-to-ankle identities readable. Four changing knee poses, NOT four high-knee duplicates. Whole armor plates and cape hue stable. Draw all4at same scale with every head same size, no chibi, no foreshortened legs.
```
