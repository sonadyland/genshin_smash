# Furina character asset generation

Built-in `image_gen` tool; genuine transparent PNG output. Images are copied byte-for-byte into this project. No post-generation pixel edits or background removal. This is an independent art and animation review prototype, not a production character integration.

## Master

Reference images: `public/previews/zhongli-v1/assets/master.png` and `public/assets/characters/eula-v2.png` for style only.

Saved asset: `assets/master.png`.

Source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-0b97fc4a-515a-4305-b61b-8184443446a5.png`.

QA: 1024 × 1536, RGBA, alpha range 0–254; complete full-body silhouette and sword within canvas. Soft generated aura remains in alpha for portrait use.

Exact prompt:

```text
Use case: stylized-concept
Asset type: transparent full-body character master for a polished 2D side-scrolling action game.
Primary request: Create Furina from Genshin Impact, Ousia form, in a refined Japanese fantasy anime game illustration style. This is a character art prototype, not a redesign.
Input images: Image 1 Zhongli and Image 2 Eula are STYLE REFERENCES ONLY. Match their refined clean linework, controlled cel shading, detailed yet readable costume and mature anime proportions. Do not copy their faces, weapons, palettes, poses or magical haze.
Subject: one adult Furina, recognizable short silver-white bob with pale blue inner locks, short hair ONLY (no long Pneuma tails), lively mismatched blue eyes, small tilted dark navy top hat with white ruffle and blue ornament, elegant dark navy Fontaine tailcoat with light blue accents, crisp white ruffled shirt/cravat, dark shorts, black gloves, asymmetrical dark/white legwear, blue heeled shoes. Her silhouette should be readable at small game scale. She carries one slim elegant blue-and-silver single-handed Hydro rapier in her RIGHT hand, tip angled down and to screen-right. LEFT hand relaxed near chest, ready for a theatrical greeting. Exactly one hat worn on head and one sword.
Composition: full body including entire hat, shoes, hands and sword tip, 3/4 profile facing SCREEN RIGHT. Neutral stable elegant combat idle with feet planted. Use generous transparent clear margin all around; character occupies about 82% of image height. Adult slender proportions, not chibi, no sexual emphasis.
Scene/backdrop: genuinely TRANSPARENT alpha, no colored background, no floor, no glow halo, no ground shadow, no frame or grid.
Style: refined Japanese fantasy 2D game key art, sharp clean outlines, polished cel shaded satin and cloth, refined facial details, restrained highlights. Cool navy cobalt white silver palette.
Constraints: one character only, 2 arms, 2 legs, one sword, one hat. No text, no watermark, no summoned animals, no particles, no slash trails. Preserve complete silhouette and transparent padding.
```

## L: hat greeting and summoning invitation

Reference: `assets/master.png`. Planned asset: `assets/l-skill.png`.

Exact prompt:

```text
Use case: stylized-concept
Asset type: production transparent sprite sheet, 16 real sequential animation drawings of Furina performing a theatrical hat-removal greeting and summoning invitation for a 2D sidescrolling action game.
Input image: the supplied master is the EXACT character identity/costume/weapon reference. Keep her face, adult anime proportions, short white-blue bob hair, small navy top hat ornament, navy Fontaine tailcoat, shorts, mismatched stockings, blue shoes and blue/silver slender rapier consistent in EVERY frame. No costume redesign.
Layout: EXACTLY 4 columns × 4 rows, 16 complete full-body figures, strictly evenly spaced uniform 384×384 cells on a 1536×1536 transparent canvas. Read left-to-right then top-to-bottom. Every complete figure has same scale, feet on each cell's y=350 baseline, average body+hat height 300px; x=175 hip anchor. Allow clear padding: entire hat, head, hand, shoes, full sword tip inside own cell with at least 16px transparent gap to edges, no neighboring overlap. Make drawing slightly SMALLER if necessary. No visible grid, no labels.
Camera: fixed side-game three-quarter facing SCREEN RIGHT, camera never changes. Clean cel shaded refined Japanese fantasy anime sprites with crisp outline, readable silhouette, no motion blur.
Critical continuity: Exactly ONE hat total in each frame. RIGHT hand holds SAME sword low down throughout, pointing diagonally down-right but complete blade remains within cell. LEFT hand alone handles hat. Hat is on head in frames1-3 and14-16; visibly in LEFT hand frames4-13; NO hat remains on head while it is in hand. Head retains SAME short bob hair volume without hat. Only 2 arms/2 hands. Hands stay attached to arms.
Sequential poses:
01 idle as master, hat worn, right sword low, left relaxed chest.
02 left elbow lifts hand toward hat brim.
03 left fingers grasp hat brim, hat still seated.
04 hat lifted just clear of hair by left hand, visibly same single hat.
05 left arm lowers hat past face to upper chest side.
06 hat arrives chest-side, hips steady; tiny polite forward inclination.
07 gently bow from waist 12 degrees, left hand holds hat at chest-side, right sword remains low.
08 lowest shallow bow, head inclined, full feet planted.
09 torso rises; left hat-hand starts unfolding outward toward screen-right.
10 left arm extends hat in a graceful inviting arc at shoulder height.
11 invitation fully reached: hat held to screen-right of face in left hand, arm extended, bare head unmistakable; summoning RELEASE pose.
12 hold invitation with confident expression, coat tails lag slightly.
13 left elbow bends carrying hat back ABOVE head, hand and hat in continuous return path, head remains bare.
14 single hat lowered onto hair by left hand, visibly touching brim.
15 left hand presses brim lightly into final tilted position then starts lowering.
16 return to the same idle as01, hat worn, left hand near chest.
Each pose must be genuinely redrawn with anatomical arm and torso changes, not moved/rotated copies.
No pets, particles, magic circles, glow halos, effects, floor/shadows, background, checkerboard pixels, text, borders or watermarks. GENUINE transparent alpha around every figure.
```

## I: stage declaration and conducting downbeat

Reference: `assets/master.png`. Planned asset: `assets/i-burst.png`.

Exact prompt:

```text
Use case: stylized-concept
Asset type: transparent sprite sheet, EXACTLY16 real sequential full-body animation drawings for Furina's theatrical Hydro burst: a stage declaration and conductor downbeat, NOT a sword attack.
Input image: exact identity/costume/weapon reference. Preserve Furina's short silver-white pale-blue bob, adult slender anime proportions, one tilted navy top hat, navy Fontaine tailcoat and shorts, mismatched stockings, blue shoes, slim blue-silver rapier, face and refined clean cel shaded Japanese fantasy style. No redesign.
Layout: EXACT uniform 4columns×4rows=16cells, 1536×1536 transparent canvas, 384×384 cells. Every full character same scale and feet baseline y=350 in each cell, body+hat height300px, centered at cell x175. Entire head/hat, raised hand, shoes and sword tip stay inside own cell with minimum16px transparent gap. Make character slightly smaller if necessary. No crop, no neighboring overlap, no visible grid or labels.
Fixed camera 3/4 profile facing SCREEN RIGHT.
Critical invariants: Hat STAYS WORN on head all16frames, LEFT hand conducts, RIGHT hand keeps sword low safely angled down-right in all frames. One hat, one sword, two arms. Show whole hand and sword. No hat removal in this action.
Sequence:
01 poised idle, left hand relaxed chest.
02 left palm gently settles over chest/cravat, proud face.
03 shoulders draw back and chin slightly rises, formal declaration anticipation.
04 left hand opens away from chest, elbow begins rising.
05 left forearm sweeps upward in an elegant arc.
06 left hand reaches above shoulder with palm outward, announcing opening.
07 left arm fully extended diagonally up-forward, palm open, proud upright silhouette.
08 hold raised invitation, eyes toward right, coat tails still settling.
09 left wrist turns and fingers begin conductor cue, elbow readies quick downbeat.
10 decisive LEFT hand downbeat slicing a short conducting arc down to shoulder level, torso follows slightly; no sword swing.
11 strong release: left forearm/palm firmly extended screen-right slightly below shoulder level, feet stable, open commanding posture.
12 hold commanding release, chin high, balanced two feet.
13 left fingers relax, elbow folds inward gradually.
14 left hand returns near chest, shoulders soften.
15 subtle cloth follow-through, posture settles.
16 idle matching01.
Anatomical real pose-to-pose changes, stable scale, no camera zooms. No pets or effects, no bubble rings, no magical particles, no glow around body, no floor shadow/background, no text. True transparent alpha.
```

## J: quick rapier thrust

Reference: `assets/master.png`. Planned asset: `assets/jab-thrust.png`.

Exact prompt:

```text
Use case: stylized-concept
Asset type: transparent animation sprite sheet for Furina in 2D side-scrolling action game, exactly8 sequential full-body drawings of one quick elegant rapier thrust.
Input image is EXACT character design reference. Preserve short white/pale-blue bob, single tilted navy top hat worn at all times, adult anime proportions, navy Fontaine tailcoat, shorts, mismatched stockings, blue heeled shoes, refined Japanese fantasy cel shading. Sword is exact same slim single blue-and-silver rapier in RIGHT hand. No redesign.
Layout: exactly4columns×2rows=8 cells on wide1536×768 transparent canvas. Uniform384×384 cells. Whole figure SAME scale throughout, feet baseline350, standing head+hat heightabout270 to leave room for sword. Hips anchor x145. Full thrust swordtip must stay at least18px before right edge of own cell, hat/head/shoes likewise padded. Absolutely no overlap with neighboring cell. No labels/grid/background.
Fixed3/4 camera facing SCREEN RIGHT. Adult slender poised swordswoman, elegant fencing based on wrist/elbow, no huge heavy overhead slash. Hat stays on head.
Frame01 balanced idle with sword low at right hand, left hand near chest.
Frame02 weight rocks slightly back, right wrist lifts sword point forward; left elbow folds gracefully away.
Frame03 right elbow retracts to waist loading horizontal thrust, knees soft, front toe begins light step screen-right.
Frame04 rapid push, right elbow opening, front foot moves forward, torso inclines slightly.
Frame05 full clean thrust at chest-height horizontally screen-right, right arm extended but elbow not locked, leading knee bent, back heel light, left arm counterbalances behind. Entire blade/tip visible.
Frame06 immediate withdrawal, right elbow bends drawing hilt back, front knee starts releasing, coat tail trails.
Frame07 short recovery step, sword returns toward low guard, torso rises.
Frame08 idle matching01 with cloth settled.
True redrawn body/arm positions every frame, stable identity and scale. Exactly two arms/twolegs, one sword. No sword trails/effects, no pets, no glows, no floor shadow, no text/watermark. Real transparent alpha.
```

## Targeted spacing repair and final outputs

Original sheets had cramped margins and J frame 4's sword tip beyond the canvas. Each sheet was edited with the built-in model using its own first output as reference. Only generation was used to repair pixels. The final PNGs replace first-pass prototype files, preserving the approved gesture design.

### L final

- Original generated source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-1bcf8e0e-4407-413c-b88f-33ebf23a51f9.png`
- Selected final generated source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-c9aef146-4fe4-481c-b13a-230a9b95a6b3.png`
- Saved file: `assets/l-skill.png`

Exact repair prompt:

```text
Use case: precise-object-edit
Edit the supplied 16-frame Furina hat greeting sprite sheet. KEEP EXACTLY these sixteen sequential poses, face, identity, costume, sword, handedness, hat removal and replacement story, colors and refined style. The poses are already approved. Change ONLY spatial packing and transparent edge quality.
Each figure is currently too large. REDRAW EACH FULL FIGURE AT 74% OF ITS CURRENT SIZE INSIDE ITS OWN CELL, keeping shoes on a common row baseline. A much larger clear transparent margin is mandatory: leave at least 35px completely empty at TOP and BOTTOM of every row and 28px on each side of every cell. Exactly 4columns×4rows, equally sized square cells, output square canvas. ALL hats including raised hats, head ornaments, hair, hands, shoes, coat, and ENTIRE sword tip inside that figure's cell. NO part at canvas edges. Smaller compact drawings surrounded by lots of genuine clear alpha. Do not enlarge figures again to fill space.
Ensure row1 frames1–3 hat worn,frame4 hat lifted by LEFT hand; row2 frames5–8 NO hat on head, same hat at chest; row3 frames9–12 hat extends as invitation in LEFT hand, bare head; row4frame13 hat lifted over head returning,14 seated,15 brim press,16 idle.
Exactly one hat per pose, right hand always low sword. No glow, aura, particles, blue/cyan speckles outside silhouettes, floor, shadows, background, lines, numbers or text. Real transparent alpha, crisp antialiasing. Preserve all sixteen poses while shrinking inside evenly spaced grid.
```

### I final

- Original generated source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-85167113-ed2a-4c35-bd17-ff1fb9399776.png`
- Selected final generated source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-7b9bd94a-b695-44c5-8a42-c2cc046fc7b3.png`
- Saved file: `assets/i-burst.png`

Exact repair prompt:

```text
Use case: precise-object-edit
Edit supplied16-frame Furina stage declaration animation sheet. Keep EXACT sixteen poses, costume, identity, colors, right-hand low sword, left-hand conducting, hat always worn and fixed right-facing camera. Repair only figure spacing, upper canvas clipping and edge quality.
Make ALL16 complete figures 72% of their present size inside an exact 4×4 uniform cell grid on square transparent canvas. Deliberately leave LARGE EMPTY SPACE between figures: at least35px clear at each row's top/bottom,at least28px at each cell's sides. Tops of hats and raised fingers must have substantial blank margin, entire sword and shoes visible. No body part or weapon cut by a canvas or cell edge. All figures same scale, anchored feet to a shared baseline within each row. Don't fill blank space.
Frame11 is commanding LEFT palm release, RIGHT sword stays low. Remove external blue/cyan speckle aura and keep only crisp character silhouettes, clean genuine transparent alpha. No particles, effects, shadows, floor, background, text, labels or grid. This is 16 separately redrawn cel-animation poses; no camera movement.
```

### J final

- Original generated source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-14fc9004-2f44-44ef-9601-381717864b6b.png`
- Selected final generated source: `C:/Users/46637/.codex/generated_images/01a124a9-0b22-7f83-b68b-58e1fda56dd1/exec-dc7c22ad-36cd-4948-8d7b-0deff0735969.png`
- Saved file: `assets/jab-thrust.png`

Exact repair prompt:

```text
Use case: precise-object-edit
Repair the supplied8-frame Furina rapier thrust sprite sheet. Preserve all eight poses, costume, face, single worn hat, right-handed sword, Japanese cel shaded style, 3/4 right-facing view. Crucial current error: frame4 sword extends beyond canvas edge and frame5 sword crosses its cell. Repair this by making EVERY FULL FIGURE including FULL WEAPON about65% OF CURRENT SIZE, not by shortening/cutting the sword.
Exactly4columns×2rows of equal square cells, wide2:1 canvas. Place each complete character and whole sword in CENTER of their OWN cell, with large clear margin on all4sides. At least30px transparent padding around full silhouette including thrust swordtips. Every frame's body same anatomical scale. Frame4 and5 must display complete unbroken sword to final point and fit within cell. Leave extra empty space as intended; do not fill frame. Anchor feet at same row baseline. Keep frame05 the deepest full thrust and06 withdrawing.
No ghost sword or hand duplicates, no sword streaks/effects, no cyan speckles or glow outside character, no floor, shadow, background, text, labels or grid. True transparent alpha with clean crisp edges. 8 frames only.
```

## Pixel-preserving inspection

Pillow was used only to read PNG metadata and alpha bounds, never to edit or resave image pixels. All final sheets are RGBA with alpha range 0–255. There is extremely faint residual alpha around some cells; complete strong-alpha character silhouettes (alpha >16) stay inside the image. Rendering uses custom source rectangles and feet anchors to accommodate generated spacing.

| Asset | Size | Strong-alpha bounding box (x1,y1,x2,y2) | Animation frames |
|---|---|---|---|
| L | 1254×1254 | (98,75,1193,1236) | 16 |
| I | 1254×1254 | (69,56,1215,1245) | 16 |
| J | 1774×887 | (41,38,1752,855) | 8 |

L summon-release: frame 11 (1-based), invitation reached with hat in left hand. I downbeat release: frame 11, left hand commands while right hand keeps sword low. J thrust impact: frame 5. These are a game adaptation, not a claim of frame-for-frame official choreography.

L first-pass/final hat continuity visually checked: hat worn 1–3, lifted at 4, carried 5–12, returned 13, worn 14–16. I hat always worn. J weapon complete after repair. Final L row 4 figures are about 18% smaller than preceding rows and need approximately 1.22 render scale normalization; final I row 4 needs approximately 1.07. Such renderer normalization does not edit PNG pixels.

## Suggested source rectangles (inspection coordinates)

Coordinates below are strong-alpha bounds `[x1,y1,x2,y2]`, not `x,y,width,height`. A renderer may add 5 pixels of padding while respecting neighboring silhouettes. Use feet and torso anchors rather than centering on the bounding box; extended hat/sword must not shift the body's apparent position.

- L nonuniform row boundaries: `[0,389,705,993,1254]`; columns: `[0,330,625,940,1254]`.
- I rows: `[0,350,659,969,1254]`; columns: `[0,313,627,940,1254]`.
- J rows: `[0,455,887]`; columns: `[0,495,887,1330,1774]`. Frame 5's blade reaches x468; do not cut it at x443.

L:
```json
[[106,87,263,348],[400,87,555,348],[695,89,848,349],[999,75,1150,349],
[107,430,267,673],[399,433,560,675],[681,436,845,674],[998,443,1155,677],
[98,738,296,976],[388,738,595,976],[680,740,889,976],[979,738,1193,976],
[110,1006,255,1236],[411,1019,556,1235],[708,1018,853,1235],[1009,1022,1153,1236]]
```

I:
```json
[[74,56,229,340],[385,56,542,340],[699,56,856,340],[1005,56,1190,340],
[69,364,255,649],[381,364,567,649],[694,365,894,649],[1005,365,1196,649],
[69,673,251,956],[380,672,581,956],[687,672,896,957],[1000,672,1215,956],
[72,979,227,1244],[383,979,536,1245],[695,979,850,1244],[1004,979,1160,1244]]
```

J:
```json
[[66,38,275,431],[509,54,858,431],[953,67,1284,431],[1377,88,1752,431],
[41,530,468,853],[534,494,854,853],[972,488,1205,854],[1417,477,1619,855]]
```
