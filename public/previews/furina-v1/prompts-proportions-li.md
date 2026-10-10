# Furina L proportion regeneration — final selection

Built-in `image_gen` only. The approved master `assets/master.png` remains unchanged. New PNGs are copied byte-for-byte from the generated sources; no pixel warping, head resizing by script, background removal or re-encoding was used. I assets are documented separately in `prompts-proportions-i.md`.

## Final usable drawings and timeline

All four final files are **1254 × 1254 RGBA PNGs**, alpha range **0–255**, arranged as 2 × 2 drawings. Same-height visual review against the master passed for the selected anatomy. Independent Architect review confirmed D1–3 have no extra chest hand.

| File | Selected generated source filename | Usable drawing cells |
|---|---|---|
| `assets/l-skill-proportions-a.png` | `exec-05fbfba1-2c6d-4a99-9052-13510108b81e.png` | **A1 only**, relaxed idle |
| `assets/l-skill-proportions-b.png` | `exec-374896a7-5885-4c00-961c-d5b63c835a9c.png` | B1–4, hat lowered and bow |
| `assets/l-skill-proportions-c.png` | `exec-b42d2dc3-dc6b-463a-8304-3271d91f92b6.png` | C1–4, rise and invitation |
| `assets/l-skill-proportions-d.png` | `exec-f1c99905-7635-4c23-973c-c8f7c2617d4b.png` | **D1–3 only**, hat above head / seating / brim press |

All source files are under `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/`.

**Never render A2–4:** the model repeatedly retained a disconnected chest glove. **Never use D4 as idle:** the cleanup changed it to brim-touch. These unused cells remain in generated PNGs for provenance, but are excluded from the preview's animation mapping.

The 16-position L timeline uses **12 distinct approved drawings**, with natural reuse of the hat removal/replacement poses and closing idle. It does not claim 16 independently redrawn pictures:

```text
Timeline: 01 02 03 04 05 06 07 08 09 10 11 12 13 14 15 16
Drawing:  A1 D3 D2 D1 B1 B2 B3 B4 C1 C2 C3 C4 D1 D2 D3 A1
```

Release remains at timeline **11 = C3**, the full hat invitation. Hat is worn at 1–3 and 14–16, lifted/carried at 4–13. Exactly one hat and two real hands are present in selected drawings. The same D poses in reverse portray removal and replacement, a normal animation reuse rather than image manipulation.

Only source rectangles, feet anchors and uniform whole-figure scale are used for placement; each sheet may have a different uniform display scale to match the same anatomical standing height. Bow frames retain their naturally lowered head instead of being stretched.

## Generation and rejected iteration record

Built-in `image_gen` only. Original master is sole anatomical authority. Original `l-skill.png` and `i-burst.png` are preserved. All new PNGs are copied byte-for-byte from generated files; no pixel transforms/background removal/re-encoding. Code may isolate frames with source rectangles and uniformly scale whole figures only.

## Review basis

Exclude tall hat, ornaments and ahoge when comparing head/body. Compare hair crown, chin, shoulders, crotch/hips, knees and soles against master at the same standing height. Numerical head counts are prompt guidance, not evidence of correctness. Rendering screenshots determine acceptance.

## L A first generation

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-f8f321b1-aacf-4f62-a8ac-152d3161ad29.png`.

QA: Rejected: frame4 lifted hat clipped at top; head/body still required same-height review.

Exact prompt:

```text
Use case: stylized-concept.
Asset type: a high-resolution transparent sprite sheet with EIGHT full-body sequential animation drawings, Furina's hat-removal greeting, sequence part A, frames 1–8 of 16.
REFERENCE IMAGE 1 is the ONE EXACT CHARACTER AND ANATOMY MASTER. Closely redraw the SAME elegant slender adult woman, SAME small refined head, long torso and VERY LONG LEGS, exact short white-blue bob, navy Fontaine tailcoat, dark shorts, asymmetrical dark/white stockings, blue heeled shoes, hat and blue-silver rapier. Do NOT simplify her proportions for sprites. She must look like this master illustration doing different poses.
CRITICAL ANATOMY LOCK: natural crown of hair to chin excludes hat and ornaments. Standing body from that crown to soles is about 7.5–8 anatomical head heights. Head is SMALL and delicate, not round and large. Shoulder line about 1.4 heads below crown; crotch at about 3.5 heads; knees about 5.8 heads; ankles about 7.3 heads. Hip-to-floor about 55% of overall anatomical height. Keep the long thighs and long lower legs of master. Adult fashion-illustration anime body. No chibi, no SD, no petite child-body, no short limbs, no enlarged sprite head. Preserve SAME anatomical scale all eight frames; gestures change upper arms/torso, never limb length.
LAYOUT: exactly 4 columns × 2 rows = EIGHT figures on a large 2048×1536 transparent canvas. Each cell 512×768, portrait-shaped space. Each standing body crown-to-sole about 540px tall, tiny head about 70px tall; each figure has whole hat and WHOLE sword visible. Keep feet at local y=705, hip near x=235. Safe clear margins at least 28px on ALL sides of EVERY cell, including sword tip/raised hat. Do not make figures larger to fill cells. No cropped feet, no overlapping neighbors, no visible grid, labels, words or numbers.
Fixed three-quarter profile facing SCREEN RIGHT, crisp polished Japanese fantasy anime cel shading like reference, static camera.
HAND/PROP CONTINUITY: RIGHT hand holds rapier low pointing diagonally down-right in all frames; sword long slim and complete. LEFT hand handles ONE hat. Hat cannot remain on head when held in hand. Precisely two arms/two hands, no ghosts.
Read left to right, top to bottom:
1 elegant idle, right sword low, left hand near cravat, hat worn.
2 left elbow lifts, left fingers approach hat brim; body remains tall.
3 left hand grips brim, hat still worn.
4 left hand lifts the SAME hat visibly clear of hair, bare hair below; right sword low.
5 left hand lowers hat to chest side, bare head; long body unchanged.
6 hat held at chest side, begins courteous small forward bend from waist.
7 shallow elegant bow about 12 degrees, left hat at chest side, right sword low; knees barely soften, long legs retain length.
8 deepest shallow bow, head inclined but legs tall, hat clearly held at chest side.
Genuine distinct redrawn body poses. No effects, no pets, no aura, no colored glow, no shadows, no floor or scenery. GENUINE TRANSPARENT ALPHA, clean detached silhouettes, no opaque checkerboard. Do not copy background haze from reference.
```

## L A spacing correction

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-1c8da02f-e171-4a2e-bf9b-30e10c62c54e.png`.

QA: Full silhouettes available; same-height UI comparison showed head/hair bulk about15–20% larger than master. Not selected as final.

Exact prompt:

```text
Use case: precise-object-edit.
Input image1 is the character MASTER: its small head, long torso and long legs are authoritative. Image2 is the 8-frame action sheet to repair. Preserve EXACT refined adult anatomical proportions, face, costume, colors, eight sequential poses, right-hand low rapier and left-hand hat action from image2. Do NOT make heads larger or legs shorter.
Change ONLY the sheet packing and repair the cropped hat on top-right pose. Redraw all eight complete figures at 70% OF THEIR CURRENT OVERALL SIZE within their individual cells (uniform scaling of whole figure, NOT limb deformation). Leave deliberately VERY LARGE EMPTY TRANSPARENT PADDING above/below/beside every full body. Exactly 4 columns ×2 rows, equally sized portrait-shaped cells, landscape 4:3 canvas. Cell boundaries must have clear gaps: at least45px blank above hat and below shoes, and35px blank at sides. Full body, whole sword tip, lifted hat ornaments must fit INSIDE EACH CELL. All eight characters identical anatomy size; feet share row baseline. No drawing touches canvas edges or neighboring cells.
Poses1–3 wear hat; pose4 lifts SAME single hat fully above bare hair with LEFT hand, reconstruct entire hat crown ornaments now cropped. Poses5–8 hold same hat chest-side while bare-headed, gradually bowing. RIGHT hand low sword throughout. No duplicate hat, no ghost limb.
Do not recompose anatomy. Keep small face and naturally long legs just as current corrected sheet and original master. Keep thin precise outline/refined anime shading. Remove external colored pixel speckles/glow, no magic aura. Real transparent alpha. No background, floor, shadows, labels, numbers, borders, pets, effects. Make character illustrations smaller within cells instead of filling all empty space.
```

## L B first generation

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-2f911f9c-a5ef-47f3-b2ef-54d12c0fbff7.png`.

QA: Rejected: final column's extended hat clipped at right.

Exact prompt:

```text
Use case: stylized-concept.
Asset type: EIGHT transparent sequential full-body animation drawings, Furina hat greeting PART B, frames9–16.
REFERENCE1 is exact character/master anatomy: same small refined adult face, slim long torso and long legs, approximately7.5 anatomical heads tall excluding hat/ahoge. REFERENCE2 is approved PART A animation: preserve EXACT costume detail, colors, drawing style, scale of head relative to shoulders and thighs, camera and lighting. Make a matching continuation, never chibi or big head. Underlying body and limbs always same lengths as master.
LAYOUT exactly4columns×2rows EIGHT full bodies on4:3 landscape transparent sheet. Equal portrait-shaped cells. Give EVERY figure substantial blank padding: about50px above highest hat,45px below shoes,30px to sides of full sword. Draw WHOLE character smaller within cells to keep clear separation; never crop to fill page. Small head, long waist, very long elegant legs. Stable size all8; same feet baseline within row. Fixed3/4 right-facing camera.
RIGHT hand holds one complete slim blue/silver rapier LOW DIAGONALLY DOWN-RIGHT throughout. LEFT hand handles ONE hat. Bare head remains short white-blue bob when hat carried.
Read left-to-right then next row:
9 rises from shallow bow, torso almost upright, bare-headed LEFT hand holds hat beside chest.
10 left arm extends forward toward screen-right carrying hat in welcoming invitation, bare head, hand has firm grip on hat brim.
11 FULL INVITATION RELEASE: upright tall stance, left arm elegantly fully extended shoulder-level to screen-right, holding SAME hat at end, proud bare head. Keep hat within cell.
12 hold invitation, elbow softens slightly, coat tails settle, bare head.
13 left elbow bends, carries hat back up beside and just above head, continuous return trajectory. Bare hair visible under hat held above. Never duplicate.
14 LEFT hand gently seats the single hat onto hair; fingers remain on brim.
15 left fingers press brim into tilted pose, left elbow lowering, hat worn.
16 relaxed upright idle identical to reference2 frame1, hat worn, left hand near cravat and right swordlow.
True separate redrawn pose-to-pose anatomy. Match reference small head and longlegs. Not miniature/chibi interpretation. No magic effects, pets, trails, particles, aura, glow, floor, shadow, scenery, text, numbers or grid. Genuine clear transparent alpha, crisp silhouettes without external speckles. Full sword and hat decorations entirely inside every cell.
```

## L B spacing correction

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-77f0b77a-959d-433b-8495-69e6d34ee7f6.png`.

QA: Complete silhouettes with clear margins, but still pending head/body consistency correction.

Exact prompt:

```text
Use case: precise-object-edit.
Repair ONLY spacing and clipped hat in supplied Furina8-frame sheet. Keep exact eight poses, small adult head, long legs, face, costume, hat story, handedness, blade length and anatomical proportions. No anatomy redesign.
Redraw each ENTIRE FIGURE uniformly HALF ITS PRESENT SIZE inside its own one-eighth panel. 4 columns ×2 rows on same4:3 landscape transparent canvas. This means HAT, HEAD, BODY, ARMS, LEGS and SWORD all get the SAME whole-figure scale. Massive deliberate transparent padding on ALL four sides of each figure; don't refill the empty space! Every full figure including its rightmost hat MUST be clearly separated from neighboring panel and canvas edge. Top-right figure's hat is cut by right edge: restore the full hat and ornaments, then fit it with at least50px clear space to canvas right. Row2 top-left raised hat must also be separate from row1 shoes by at least45px clear.
Same foot baseline and anatomical scale all8. Preserve bare head on first5, hat worn on final3. Full continuous long sword inside every cell. Original character is a slim adult, approximately7.5 anatomical heads tall excluding hat; don't reintroduce big-head miniature sprite proportions.
No effects/halos/particles/background/floor/shadows/text/grid or numbers. Genuine transparent alpha, clean silhouettes. Smaller FULL figures with large transparent margins are essential.
```

## L A anatomical correction

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-086684c0-1eff-45ef-83fa-8a1d8aa30cce.png`.

QA: Pending same-height review; generated packing again leaves lifted hat close to top.

Exact prompt:

```text
Use case: precise-object-edit.
Image1: ORIGINAL MASTER, exact anatomical target. Image2: current8-frame sprite sheet to CORRECT. Image3: reviewer comparison: LEFT figure is correct original master, RIGHT is current sheet; use only to understand mismatch, never draw its UI.
The current sprite heads are STILL ABOUT20% TOO LARGE RELATIVE TO THEIR BODIES. Correct real anatomical proportions, NOT overall image or character display size.
For EVERY one of the eight figures in image2 REDRAW HEAD, HAIR AND HAT GROUP about18% SMALLER relative to the existing torso/legs. Reduce head width and height together naturally, maintaining face identity, same silver-blue bob and details. Keep body's long torso and legs at their existing size. Naturally reconnect slimmer neck to head, lift neck/shoulder connection slightly toward master's posture. Master LEFT in comparison has narrower, more refined head and clear long neck; match that.
For frames1–3 the worn hat shrinks coherently with head. In frame4 raised hat and frames5–8 held hat should likewise shrink to SAME real hat size. Naturally adjust LEFT fingertips/wrist/arm so they still grip the brim and connect, never floating hands or broken wrists. RIGHT low rapier unchanged. All16? NO, exactly EIGHT poses from image2, same4×2 layout, same safe padding, same transparent canvas.
Do not merely shrink entire figures! Actual ratio of head to shoulders and legs must change. Maintain complete sword/boots/hat and eight gesture stages: idle,reach,grip,lift,lower,bow-start,bow,bow-low. Preserve all facial/costume details and clean refined Japanese anime style.
Genuine transparent alpha. No new background, UI, text, number, frame, guide, pets, effects, aura or shadow. Output ONLY repaired8-pose transparent sheet.
```

## Four-pose continuation workflow

Each final sheet uses only four drawings (2×2) to preserve adult proportions. I generation was delegated separately; see `prompts-proportions-i.md` when finalized. Do not infer acceptance from a numerical head count.

### L four-pose sheet A first pass

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-9f3084bd-7d8a-42a1-984d-2484d828ea56.png`.

QA: Rejected: small-head target not yet met.

Exact prompt:

```text
Use case: stylized-concept.
Create FOUR full-body sequential Furina drawings on a transparent sprite sheet, 2 columns ×2 rows. Square canvas.
Image1 ORIGINAL MASTER is exact character identity and small-head/long-body anatomy authority. Image2 APPROVED sprite sheet is matching style and successful anatomy example. Use image2 TOP-LEFT idle figure's precise body and head proportions for all four new poses. The other image2 poses are NOT requested here.
CRITICAL preserve the SAME SMALL DELICATE HEAD and SAME LONG TORSO AND LEGS as image2 top-left and master. Never enlarge head for sprites. The apparent head width versus shoulder/chest width must remain identical; no chibi or child-body. Do not invent a numeric head count. Real anatomy already defined in reference.
Four new poses, fixed3/4 facing SCREEN RIGHT:
1 relaxed elegant idle matching image2 top-left exactly: hat worn, RIGHT hand same complete rapier low diagonal down-right, LEFT hand near chest.
2 LEFT elbow rises, fingertips approach hat brim; hat remains worn. Right sword stays low.
3 LEFT fingers grasp brim of hat, elbow lifted, preparing to remove; hat still on head.
4 LEFT hand lifts SAME single hat just clear of hair, bare crown below. Entire hat and ornament complete; no duplicate hat on head. Right sword low.
Only these4 consecutive gestures. Maintain skeletal proportions and same body scale in each frame. Both feet anchored on same baseline per row, full figure including hat/hand/rapier/shoes.
Layout:2×2 equal cells on1536×1536 canvas. Deliberately roomy: characters occupy only about70% cell height, wide transparent margins at least50px around all silhouettes and weapon tips. Raised hat4 must remain inside its own panel, well below row division. Never crop or overlap neighboring figures.
Refined clean Japanese anime fantasy cel shading, same short silver-blue bob, navy Fontaine coat and shorts, asymmetric stockings, blue shoes, exact tilted hat and blue/silver rapier. No effects, aura, external pixel speckles, glow, shadows, floor, pets, background, text, grid, labels or numbers. Genuine transparent alpha.
```

### L four-pose A anatomy correction

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-789c1d64-cc8e-4925-8bfa-5508b9ca8a6d.png`.

QA: Same-height proportion review passed. Extra chest glove was found in poses2–4.

Exact prompt:

```text
Use case: identity-preserve.
Edit image1: a four-pose Furina action illustration sheet. Image2 is original Furina character/master, the only anatomical authority.
REDUCE THE ENTIRE HEAD, HAIR AND HAT GROUP IN EACH POSE BY TWENTY-FIVE PERCENT (25%) RELATIVE TO ITS OWN BODY, keeping its neck attachment anatomically correct. This must be an obvious reduction, not a subtle cosmetic alteration. Retain the exact long limbs, adult slender torso, pose, costume and rapier shapes. Use an elegant adult FASHION ILLUSTRATION model-sheet skeleton, NOT cute enlarged-head game-sprite anatomy. Match image2's small head and refined facial proportion.
Head includes whole skull/face, hair, and headwear, not just face features. The hair and hat MUST become visibly smaller against shoulders and legs. Keep body/leg lengths unchanged relative to one another. For fourth pose, separately held hat must shrink to same physical hat size as all worn hats; naturally reconnect fingertips so hand still grips brim. No duplicate hat.
After correcting this anatomy, render each COMPLETE corrected figure at 85% overall scale inside its own cell to leave proper blank margins. 2 columns×2rows=4 complete poses in same order, square transparent canvas. All hats, raised hands, full sword tips and boots inside cells with generous transparent gaps; second-row lifted hat cannot overlap first-row shoes.
Same four consecutive actions: idle, reach to brim, hold brim, lift hat just above bare head. RIGHT hand low rapier throughout, LEFT hand alone handles hat.
Preserve refined clean anime art and exact identity/costume colors. NO background, labels, number, border, glows, particles, ground shadow or UI. GENUINE transparent alpha.
```

### L four-pose B (frames5–8)

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-374896a7-5885-4c00-961c-d5b63c835a9c.png`.

QA: Same-height proportion review passed. Hat held by one left hand; bareheaded; complete silhouettes.

Exact prompt:

```text
Use case: identity-preserve.
Create a FOUR-POSE ACTION ILLUSTRATION SHEET of Furina, a continuation of input image1's exact character. Image1 is the APPROVED small-head/long-body animation model; image2 is original MASTER identity/anatomy. Preserve EXACT relative size of tiny refined head, hair and hat to long torso and long legs from image1. Do not enlarge head, add hair volume, shorten body, or make cute game-sprite proportions. Use adult fashion illustration model-sheet anatomy as input1.
Fixed3/4 facing screen RIGHT, same refined Japanese anime cel shading, exact short silver-blue bob, navy Fontaine coat/shorts, asymmetric stockings, blue shoes, same slim blue/silver rapier and ornate tilted hat.
LAYOUT exactly2columns×2rows FOUR full-body figures, square transparent canvas. Same anatomical figure scale and row footbaseline, lots of clear padding around every hand, hat, sword and shoe. Give figures only70% of their cell height. No crop or overlap. RIGHT hand always holds one complete rapier low angled down-right. Exactly TWO ARMS AND TWO HANDS: one right hand on sword, one left hand on hat. NO third hand or leftover gloved hand on chest. When left hand moves, the chest shows only WHITE CRAVAT and BLUE BROOCH.
ONE physical hat only. Hat cannot be worn and held at once. Render head/hat at approved reference1's SMALL scale.
No pets, magic, effects, aura, shadows, scenery, grid, labels, text, numbers, borders or UI. GENUINE transparent alpha and crisp edge silhouettes.
Sequence PART B, frames5–8 of16, left-to-right then nextrow:
5 Bareheaded left hand carries single removed hat down past cheek toward upper chest side; proud upright torso. Right swordlow.
6 Hat now held at chest-side in LEFT hand, bare head, tiny forward bend begins from waist. Longlegs mostly straight.
7 Polite shallow bow about12 degrees, head slightly lowered, left hat remains chest-side. Legs stay same long length, only natural soft knee bend.
8 Lowest shallow courteous bow, inclined head, hat at chest-side. The long neck and smallhead remain adult. No hat on head in ANY of these4 figures. Draw no glove on chest except the single real left hat-gripping hand.
```

### L four-pose C (frames9–12)

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-b42d2dc3-dc6b-463a-8304-3271d91f92b6.png`.

QA: Same-height proportion review passed. Frame11 is invitation release. Clean white chest; two hands.

Exact prompt:

```text
Use case: identity-preserve.
Create a FOUR-POSE ACTION ILLUSTRATION SHEET of Furina, a continuation of input image1's exact character. Image1 is the APPROVED small-head/long-body animation model; image2 is original MASTER identity/anatomy. Preserve EXACT relative size of tiny refined head, hair and hat to long torso and long legs from image1. Do not enlarge head, add hair volume, shorten body, or make cute game-sprite proportions. Use adult fashion illustration model-sheet anatomy as input1.
Fixed3/4 facing screen RIGHT, same refined Japanese anime cel shading, exact short silver-blue bob, navy Fontaine coat/shorts, asymmetric stockings, blue shoes, same slim blue/silver rapier and ornate tilted hat.
LAYOUT exactly2columns×2rows FOUR full-body figures, square transparent canvas. Same anatomical figure scale and row footbaseline, lots of clear padding around every hand, hat, sword and shoe. Give figures only70% of their cell height. No crop or overlap. RIGHT hand always holds one complete rapier low angled down-right. Exactly TWO ARMS AND TWO HANDS: one right hand on sword, one left hand on hat. NO third hand or leftover gloved hand on chest. When left hand moves, the chest shows only WHITE CRAVAT and BLUE BROOCH.
ONE physical hat only. Hat cannot be worn and held at once. Render head/hat at approved reference1's SMALL scale.
No pets, magic, effects, aura, shadows, scenery, grid, labels, text, numbers, borders or UI. GENUINE transparent alpha and crisp edge silhouettes.
Sequence PART C, frames9–12 of16, left-to-right then nextrow:
9 Rising from bow, almost upright torso, bare head; LEFT hand carries hat from chest-side outward.
10 LEFT arm starts extending toward screenright at shoulderheight, holding single hat at brim; bare head.
11 FULL INVITATION RELEASE: tall upright torso, LEFT arm fully extends almost horizontally screenright, hat held at its end, proud bareheaded face; right swordlow. Entire extended hat must fit with generous blank margin to rightedge.
12 Hold same full invitation, elbow a little softer, coat tails follow through; still bareheaded. NO hat on head in ANY of these4 figures. The chest shows only cravat and bluebrooch, NO residual black glove. If extended pose needs room, make all four COMPLETE figures uniformly smaller inside panels, never shorten limbs or hat, never enlarge head.
```

### L four-pose D first pass

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-b68f52e3-a98c-477f-9cbf-af4cb71e4c1d.png`.

QA: Rejected: top-left lifted hat ornament touches/crops top; chest glove artifact in middle poses.

Exact prompt:

```text
Use case: identity-preserve.
Create a FOUR-POSE ACTION ILLUSTRATION SHEET of Furina, a continuation of input image1's exact character. Image1 is the APPROVED small-head/long-body animation model; image2 is original MASTER identity/anatomy. Preserve EXACT relative size of tiny refined head, hair and hat to long torso and long legs from image1. Do not enlarge head, add hair volume, shorten body, or make cute game-sprite proportions. Use adult fashion illustration model-sheet anatomy as input1.
Fixed3/4 facing screen RIGHT, same refined Japanese anime cel shading, exact short silver-blue bob, navy Fontaine coat/shorts, asymmetric stockings, blue shoes, same slim blue/silver rapier and ornate tilted hat.
LAYOUT exactly2columns×2rows FOUR full-body figures, square transparent canvas. Same anatomical figure scale and row footbaseline, lots of clear padding around every hand, hat, sword and shoe. Give figures only70% of their cell height. No crop or overlap. RIGHT hand always holds one complete rapier low angled down-right. Exactly TWO ARMS AND TWO HANDS: one right hand on sword, one left hand on hat. NO third hand or leftover gloved hand on chest. When left hand moves, the chest shows only WHITE CRAVAT and BLUE BROOCH.
ONE physical hat only. Hat cannot be worn and held at once. Render head/hat at approved reference1's SMALL scale.
No pets, magic, effects, aura, shadows, scenery, grid, labels, text, numbers, borders or UI. GENUINE transparent alpha and crisp edge silhouettes.
Sequence PART D, frames13–16 of16, left-to-right then nextrow:
13 LEFT elbow bends bringing single hat back ABOVE bare head, held at brim. Full hat ornaments visible in panel, small barehead below hat.
14 LEFT hand lowers single hat onto hair, fingers still onbrim, hat now seated. NO duplicate on head.
15 LEFT fingers press brim gently into final tilted pose, elbow starts lowering. White cravat visible, NO extra black hand onchest.
16 Settled upright idle matching input1 TOP-LEFT exactly: single hat worn, left hand nearcravat in ONLY this fourth pose, right rapierlow.
Keep full hat safe within cell, feetbaseline stable; no frame13 raised hat overlaps previous row. Same small-head adult silhouette as approved input1. All four figures same anatomical scale.
```

### L A chest cleanup attempt1

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-869b7bbb-65dd-43b0-98ef-d196af6bb141.png`.

QA: Rejected for frames2–4: chest glove remains.

Exact prompt:

```text
Use case: precise-object-edit.
Repair ONLY the EXTRA THIRD HAND in this four-pose Furina action sheet. Keep the already approved SMALL HEAD / LONG ADULT BODY anatomy, facial identity, every limb length, costume, pose, canvas packing and positions EXACTLY unchanged.
TOP-LEFT pose1: correct two hands, RIGHT sword hand low and LEFT black-gloved hand genuinely at chest. LEAVE THIS POSE UNCHANGED.
TOP-RIGHT pose2 and BOTH LOWER poses3/4: the REAL LEFT HAND is raised at hat/hatbrim, and REAL RIGHT HAND is down gripping rapier. BUT a third BLACK GLOVE WITH HORIZONTAL FINGERS is still on the CHEST just below the chin/across the white cravat. ERASE ONLY THAT DISCONNECTED CHEST GLOVE completely in these THREE poses. Reconstruct white ruffled CRAVAT/CHEST FABRIC and blue brooch beneath it. There must be NO black fingers, black palm, black wrist, or third hand across chest. Keep coat lapels naturally navy, distinguish them from fingers. EXACTLY TWO hands per figure remain: sword and raised hat hand.
Do not remove real raised left hand, real right rapier hand, sword or hat. Do not change proportions, poses, head scale, feet location, transparent margins, number4 or layout2×2. Preserve complete tiny head and all clothing details.
Output the same4-pose square transparent sheet with this localized chest correction ONLY. No new elements, no text/grid/background/glow/shadow. Genuine alpha.
```

### L D hat padding and chest cleanup1

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-e1abaa80-ff94-4d21-8e0b-ed386a13825d.png`.

QA: Hat now complete. Chest cleanup required further review.

Exact prompt:

```text
Use case: precise-object-edit.
Repair only TWO defects in this four-pose Furina action illustration sheet; keep approved SMALL HEAD and long adult body anatomy, face, gestures, costume and colors.
1) TOP-RIGHT pose2 and LOWER-LEFT pose3 have an EXTRA DISCONNECTED BLACK GLOVE across white chest cravat. Their real LEFT hand is already raised touching hat and real RIGHT hand is low gripping rapier. ERASE the extra horizontal black fingers/palm on chest in ONLY these two poses; reconstruct white ruffled cravat, blue brooch and costume below. There must be exactlyTWO hands per figure, never a third on chest. Keep raised hat-hand and rapier-hand intact. LOWER-RIGHT pose4's genuine left chest-hand stays because pose4 is idle. TOP-LEFT left hand above head stays.
2) TOP-LEFT raised hat is clipped by canvas top. Restore complete tip/ornaments, then render EVERY ENTIRE FIGURE uniformly at80% of present size inside its own cell. Same2×2 layout square canvas, generous clear margin at least45px above tallest raised hat, below shoes and around full sword. Same scale all4, shared baseline perrow. Do NOT alter relative head/body proportions or shorten limbs. Complete figures must be separated by blank alpha and away from canvas edges.
Preserve pose1hatheld above barehead,pose2hatseating,pose3brimpress,pose4idle. Exactlyonehat in each, correct real hand connections.
Real transparent alpha. No background, grid, text, frame, shadow, aura or particles.
```

### L A chest cleanup attempt2

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-05fbfba1-2c6d-4a99-9052-13510108b81e.png`.

QA: First idle pose valid. Poses2–4 rejected for persistent chest glove; do not render them.

Exact prompt:

```text
Use case: precise-object-edit.
Local costume/hand cleanup on this four-pose Furina illustration only. DO NOT change head sizes, bodies, gesture limbs, clothing proportions, layout or transparent background.
TOP-LEFT figure stays entirely unchanged.
For TOP-RIGHT, BOTTOM-LEFT and BOTTOM-RIGHT figures, look directly BELOW THE CHIN and ABOVE THE BLUE CHEST GEM/WHITE RUFFLED CRAVAT. There is a BLACK HORIZONTAL SHAPE with FINGER-LIKE STRIPES crossing the neck/front chest. It is a leftover disembodied glove from the idle pose. REMOVE THAT WHOLE BLACK SHAPE, do not merely soften it or keep its finger outlines. Replace that area with clean WHITE RUFFLED ASCOT FABRIC continuously down from chin to blue jewel. No black glove/palm/fingers/band is allowed across the front chest in these three figures. Keep natural navy outer coat lapels at far sides, but inner chest/neckline under chin must read as WHITE RUFFLES WITH A BLUE GEM. This visible white replacement is the ONLY change.
The actual left arm continues from shoulder upward to a black-gloved hand at hatbrim. Keep that raised glove untouched. The right glove at swordhilt also stays. There are only two real gloves in each pose. Do not regenerate the lost third chest glove.
Keep same4 poses2×2, complete hat/sword/boots, same approved small-head adult anatomy, same feet and canvas positions. Output transparent PNG without guides, text or new background.
```

### L D chest cleanup2

Source: `C:/Users/46637/.codex/generated_images/01a124d3-e09b-7c82-8675-d48905fa140f/exec-f1c99905-7635-4c23-973c-c8f7c2617d4b.png`.

QA: First3 poses show restored white chest. Pose4 inadvertently changed to brim-touch, so it cannot serve as idle. Final selection pending Architect.

Exact prompt:

```text
Use case: precise-object-edit.
Local cleanup ONLY on TOP-RIGHT and BOTTOM-LEFT figures of this four-pose Furina illustration.
In each specified figure, REMOVE THE BLACK HORIZONTAL SHAPE WITH FINGER-LIKE STRIPES crossing front neck/chest directly UNDER CHIN and OVER WHITE RUFFLED CRAVAT. This is an unwanted extra disembodied glove. Replace entire dark horizontal palm/finger area with WHITE RUFFLED ASCOT FABRIC, show blue brooch and white fabric naturally. No black hand/palm/fingers or stripe is allowed across inner front chest. Keep outer navy coat lapels away at sides. This must be a visibly clean WHITE neck-to-chest ascot instead of retained glove silhouette.
Keep actual raised left glove touching hat and right glove gripping sword. Exactlytwo realhands. LOWER-RIGHT idle figure keeps its genuine chest glove; TOP-LEFT raisedhat pose otherwise unchanged.
Do not change ANY figure's head/face proportions, longlegs, torso, current completehat, sword, poses, positions, rowbaselines, margins or image layout. Current small-head adult anatomy is approved. Only remove stated dark chest remnants from two figures. Preserve real transparent alpha; no text/effects/background.
```
