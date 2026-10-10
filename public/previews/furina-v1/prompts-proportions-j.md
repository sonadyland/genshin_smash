# Furina J proportion revision — source and prompt record

Generated with the **built-in image_gen tool** using transparent_background: true. No CLI/API fallback and no scripted pixel edits, rescaling, background removal, or repainting. Final generated PNGs were copied byte-for-byte into the project. Original jab-thrust.png is preserved.

## Scope

Replace J artwork only for the independent Furina preview. The approved master.png is the sole anatomy authority. The old sprite sheet was inspected for pose order, not supplied as an image reference to generation. Pet assets and production gameplay are outside this revision.

The 8 poses are split into two 2×2 sheets so the one-handed silver-blue rapier can fit completely: guard, raise, retract, initial extension, full lunge, withdrawal, nearly recovered, neutral guard.

## Selected files

| File | Built-in original | Resolution | Alpha |
|---|---|---|---|
| assets/jab-thrust-proportions.png | C:/Users/46637/.codex/generated_images/01a124d4-29f6-7571-8ed1-8ff51ad7dfce/exec-155e4ef7-8fdb-4645-81d6-b1a6386f6329.png | 1254×1254 RGBA | extrema 0..255; 1,199,468 fully transparent pixels |
| assets/jab-thrust-proportions-b.png | C:/Users/46637/.codex/generated_images/01a124d4-29f6-7571-8ed1-8ff51ad7dfce/exec-fec8ce6b-449c-4a26-b458-7c8ebd860ebb.png | 1254×1254 RGBA | extrema 0..255; 1,279,006 fully transparent pixels |

Source portrait: assets/master.png.

## Visual inspection and render guidance

The earlier 4×2 attempt was rejected because frame 4's sword touched the right edge and frame 5 overlapped its neighbour. The first 2×2 attempts retained too-large heads. The final corrections explicitly reduced the head/hair/hat group relative to the torso, keeping long adult limbs.

Use the natural hair/skull crown to chin for the head unit; **do not count the top hat or decorative curl**. Approximate visual landmarks are guides, not mathematically precise anatomical measurements. Final A's neutral natural crown-to-sole is roughly 488 px; B's neutral crown-to-sole is roughly 400 px. B has more whitespace and needs one uniform sheet-scale calibration to A. Never enlarge individual crouching frames to equal standing height, nor stretch width/height independently. Root reviewed the A neutral/master equal-height comparison and accepted its proportions. Full-sheet and playback acceptance is recorded by the preview review.

Suggested [x, y, width, height] source rectangles, in animation order:

```json
{
  "sheetA": [
    [0, 0, 600, 627],
    [600, 0, 654, 627],
    [0, 627, 600, 627],
    [600, 627, 654, 627]
  ],
  "sheetB": [
    [0, 0, 700, 627],
    [700, 0, 554, 627],
    [0, 627, 627, 627],
    [627, 627, 627, 627]
  ]
}
```

Alpha > 32 bounds relative to these rectangles (read-only Pillow analysis):

- A1: [126, 69, 484, 607]; A2: [110, 64, 537, 605].
- A3: [101, 66, 573, 568]; A4: [24, 91, 629, 570].
- B1: [115, 137, 641, 534]; B2: [101, 121, 484, 548].
- B3: [202, 96, 502, 536]; B4: [182, 94, 489, 542].

All eight silhouettes have nonzero margins with these custom rectangles; entire sword tips, hats and shoes are inside their source regions. These coordinates are rendering crops, not modified PNGs.

## Generation history and exact prompts

- Attempt 1 output: exec-4bf59b13-9ce6-4628-9696-9d1484ad607e.png (discarded, not copied to project).
- Attempt 2 output: exec-6c23943b-5c84-48bb-992c-59cfe715c13e.png (superseded).
- Final A: exec-155e4ef7-8fdb-4645-81d6-b1a6386f6329.png; references attempt 2 + master.
- Attempt 3 output: exec-c63f6ed1-d91e-4e84-818e-58c1cfd25271.png (superseded); references final A + master.
- Final B: exec-fec8ce6b-449c-4a26-b458-7c8ebd860ebb.png; references attempt 3 + master.

All outputs are in the same built-in generated_images directory listed above.

### Attempt 1 — 8 frames in a 4×2 sheet (discarded)

```text
Use case: stylized-concept.
Asset type: production transparent sprite animation sheet for a 2D side-scrolling anime action game.
Reference image 1 is the APPROVED CHARACTER MASTER and the ONLY authority for anatomy, head size, body proportions, outfit, color and face. Furina from Genshin Impact in dark navy outfit, white and pale blue short hair, ornate navy/gold tall hat, blue eyes, asymmetric navy stockings and heeled ankle boots, blue and gold long coat tails, right hand wielding a delicate long silver-blue rapier. She is a slender ADULT with long limbs and an elegant torso.
Primary request: 8 sequential distinct full-body sword-thrust animation frames, facing RIGHT with slight three-quarter profile, laid out in EXACTLY 4 columns x 2 rows, read left to right top to bottom. Each frame is isolated in its OWN generously sized tall rectangular cell. A wide landscape sheet approximately 2048 x 1536 is suitable. Transparent background, no text, no numbers, no grid lines, no borders, no scenery, no ground, no shadows, no effects.
CRITICAL ANATOMY: Match the reference master's slim elongated body, NOT a chibi game sprite. Measure head from natural skull crown under hair to chin, EXCLUDING the tall hat, ribbons and decorative hair curl. Standing figure from natural crown to soles must be about 7.3 anatomical heads tall; head width about half shoulder width. Anatomical shoulder line 1.2 heads down, hip/groin line about 3.6 heads, knees about 5.3 heads, soles 7.3 heads. Long elegant thigh and shin lengths; keep adult head small and refine face rather than exaggerating eyes. Do not compress body to fit. Same skeleton, same head SIZE in all frames. Cropped character, childlike figure, stubby legs, massive head, bobble head are forbidden. Keep slim torso and long legs even in lunges, bent joints change vertical height naturally.
8 poses:
1 neutral elegant right-facing guard, feet beneath hips, rapier held low down-right, free left hand close to chest.
2 deliberate preparation: right sword elbow bends, sword tip rises diagonally forward, left hand opens outward, slight weight shift to rear leg.
3 wind-up: right hand draws rapier back near right hip, left hand lifts for counterbalance, feet widen, long front leg ready to step.
4 quick forward step begins: front knee bends lightly, right arm extends the rapier almost horizontally, rear leg lengthens, torso leans forward gently.
5 full clean fencing thrust: right arm straight forward and silver-blue rapier points horizontally RIGHT; front knee bent about ninety degrees, rear leg stretched fully back, left arm extended back for balance. Full complete weapon tip with at least 7% empty space before its cell right edge. Do not shorten the rapier or the legs.
6 withdrawal: draw sword back with elbow bent, straighten the front leg partly and recover weight; left hand floats back toward torso, long coat tails follow momentum.
7 nearly returned to guard, feet drawing closer, rapier lowering diagonal, head/body tall again.
8 matches frame 1 neutral guard for a clean loop.
COMPOSITION: fixed virtual camera scale across all cells; same anatomical head pixel size across all 8 frames. Center the character's feet at about 45% of cell width so thrust can extend to the right. Full hat, hair, boots, trailing coat and ENTIRE LONG WEAPON fit in each cell with generous transparent margins on all four sides. No silhouette may touch or cross a cell boundary. The lunge may be wider and lower than standing but MUST retain long limbs. In the standing frames body height including hat about 78% of cell height, leaving generous margins. Consistent studio anime clean linework and careful shaded painted details matching the master, polished full-resolution sprite artwork. No painterly blur, no double limbs, no afterimages, no glow around silhouette.
```

### Attempt 2 — sheet A, 4 frames in 2×2 (superseded)

```text
Use case: stylized-concept. Production transparent 2D side-scroller animation sprite sheet.
Reference: the supplied Furina master portrait is the ONLY source of body proportions, facial structure, costume and style. Copy her tall slender adult body exactly. Her slim elongated torso and long thighs/calves are essential; her head is small in relation to the body. Do not redraw her as a short or cute game sprite.
Create ONLY FOUR full-body action poses in EXACTLY TWO COLUMNS AND TWO ROWS on a square large transparent canvas. Wide spacious equal square cells, camera scale identical in all four cells. Each pose must have 10% clear transparent padding around its WHOLE silhouette, including sword tip and tall hat. Do not let any object touch another pose or cell. Standing figures including hat should occupy ONLY 70% of cell height and about 30% of cell width, with ample horizontal room for weapon. Smaller characters with empty space are BETTER than clipped swords. No text, grid, borders, backgrounds, shadows or effects.
Character: Furina adult woman, slim anime anatomy matching reference, short silvery white/light blue hair, small refined adult face, tall blue/gold top hat, fitted navy/gold coat, white cravat, dark shorts, asymmetric dark stocking, long legs, navy heeled shoes, flowing split coat tails. Right hand holds her LONG slender silver-blue rapier; left hand free.
PROPORTION LOCK: Approximately 7.5 head units from natural skull crown to sole, NOT counting hat or hair decorations. The head from crown to chin is about 13% of standing body height. SMALL head, elongated elegant body, long legs. Maintain same head pixel size all frames; head should be visibly smaller than most anime sprite sheet styles. Pelvis to floor about 53% of standing height. This is NOT chibi, NOT super-deformed, NOT big-head short-body. Do not shorten the torso or legs to fit the grid.
Four sequential poses, reading left to right then next row:
1 Neutral guard facing RIGHT in slight three-quarter profile, standing tall, right hand by hip holds rapier pointing diagonally down-right, left hand near chest.
2 Preparation: right elbow draws slightly back while rapier points diagonally upward-right, left hand opens, weight shifts to rear leg. Remain tall.
3 Wind-up: right hand draws rapier hilt back by hip, blade aims diagonally forward-right, free left hand raised gracefully, feet separate. Mild bending of knees only.
4 Beginning forward thrust: right arm extends horizontally RIGHT, forward foot steps with only a moderate knee bend; back leg long, left arm moves back for balance. ENTIRE LONG RAPIER AND ITS TIP MUST BE VISIBLE WITH AMPLE RIGHT MARGIN. All sword, hand, foot and hat anatomy crisp and clear.
Strict isolated 2x2 layout, no overlap, each frame fully inside its own square with transparent margins. Clean polished detailed anime art matching the master, consistent adult anatomy. Genuine transparent alpha.
```

### Final sheet A — targeted head proportion and margin correction

```text
Use case: identity-preserve. Proportions correction of a transparent four-frame action illustration sheet.
IMAGE 1 is the edit target with four poses. IMAGE 2 is the approved Furina portrait and sole anatomy authority.
Correct Image 1: its head is still far too large compared with the body. REDUCE THE ENTIRE HEAD, HAIR AND HAT GROUP IN EACH POSE BY TWENTY-FIVE PERCENT (25%) RELATIVE TO ITS OWN BODY, keeping its neck attachment anatomically correct. This must be an obvious reduction, not a subtle cosmetic alteration. Retain the exact long limbs, adult slender torso, pose, costume and rapier shapes. Skull crown to sole should now be about 8 anatomical heads; exclude hat from that measurement. Use an elegant adult FASHION ILLUSTRATION model-sheet skeleton, NOT cute enlarged-head game-sprite anatomy. The small refined face must match Image 2. Do not increase breast size or change outfit. Do not shorten legs. Do not make the figure wider.
The four pose sequence stays the same: standing guard, raising rapier, drawing rapier back, forward rightward thrust. Weapons are one-handed blue-silver rapiers, not poles. Keep long sword tips complete.
Additionally make all four figures 85% of the original overall cell occupancy, leaving a genuine generous transparent padding around each WHOLE pose. Fourth-frame extended sword currently almost touches right canvas edge: give its COMPLETE TIP at least 8% empty cell-width to the right, and keep the tip sharp. Arrange in strict 2x2 separate equal square cells; no overlapping cells. Keep same character scale across all frames, consistent head size. Transparent background with alpha preserved. No text, gridlines, shadows, weapon streaks, duplicate limbs or added effects. Match the original crisp detailed anime shading, but MOST IMPORTANTLY match Image 2's small head relative to tall slender adult body.
```

### Attempt 3 — sheet B, 4 continuation frames (superseded)

```text
Use case: identity-preserve. Create continuation sheet B of a transparent adult-character sword animation.
IMAGE 1 is APPROVED SHEET A: copy its exact small head/body proportion, physical character size, costume, rendering style, and 2x2 layout. IMAGE 2 is the approved Furina master portrait, sole character anatomy authority. Sheet B contains the NEXT FOUR poses, no duplicates of the wind-up poses.
The character is Furina in dark navy aristocratic outfit, refined SMALL adult face, short white-blue hair, tall navy/gold hat, elegant fitted long coat with blue tails, white cravat, shorts, asymmetric dark stockings and heeled shoes. Right hand always holds one LONG slender blue-silver RAPIER, left hand free. Same right-facing three-quarter side view as sheet A.
CRITICAL CONSISTENCY: match image 1's corrected SMALL head, slim elongated torso and long legs EXACTLY. Natural hair crown to chin (hat excluded) about 1/8 of standing natural crown-to-sole height, approximately 7.5–8 head units. This is an adult fashion-illustration model sheet, NOT big-headed game sprite anatomy. Do not enlarge the head because there are fewer figures, or shorten legs during poses. Skull and head pixel dimensions must remain identical to approved sheet A neutral pose. Standing full figure with hat about 535 pixels on a 1254 square canvas (each cell 627 square); preserve this same camera scale even when lunging lowers the character. The lunge is lower, never enlarged to fill the cell.
Four distinct sequential poses in EXACTLY TWO COLUMNS x TWO ROWS, in reading order:
5 top-left: clean full forward fencing lunge, right arm extends a long slender rapier horizontally RIGHT at upper-torso height, forward right knee bends deeply, left rear leg extends long backward, left arm stretches backward for counterbalance. Body lean modest and purposeful. Draw the entire sword from hilt to sharp tip, with at least 35 pixels clear padding inside its own cell at the right. Long rear leg and coat tails fully visible. No cropped boots. This is ONE RIGHT HAND holding a rapier, not a two-handed pole.
6 top-right: begin withdrawal, right elbow retracts rapier hilt near waist, tip still points to right but slightly down, front knee rises as weight returns, left hand floats forward toward chest.
7 bottom-left: recovered nearly tall, feet drawing closer, long rapier lowered diagonally down-right, left hand at chest, coat tails settling.
8 bottom-right: exact matching neutral guard to sheet A frame 1 — standing tall adult posture, small head, long elegant legs, right hand beside hip, long rapier diagonal down-right, left hand near chest. Identical skeleton and proportions, closes the loop.
All four complete silhouettes isolated within their own generous square cell. Keep character roots left of center so sword can fit on right. No overlap between cells. Ensure all hat, hair, boots, cape tips and full sword tips have transparent padding. Foreground figures only. Pure true transparent alpha, no background, shadow, grid, labels, numbers, text, energy effects, motion trails, duplicate body parts or blue glow border. Clean polished anime shading and crisp delicate outlines matching both references.
```

### Final sheet B — targeted head proportion and cell spacing correction

```text
Use case: identity-preserve. Correct only anatomy and frame separation in a transparent four-pose character sheet.
Image 1 is the sheet being edited. Image 2 is the approved Furina portrait and exact body proportion authority.
Preserve the four action poses, adult costume, right-hand blue-silver rapier, face, shading and full body parts.
FIRST FIX: the heads are still too large. REDUCE THE ENTIRE HEAD, HAIR AND HAT GROUP IN EACH POSE BY 25% RELATIVE TO ITS OWN BODY, reconnecting neck naturally. Do NOT shrink body or shorten legs as compensation. The adult body must become clearly tall and elegant relative to a small refined head, matching the portrait. Maintain long slim thighs, long calves and torso.
SECOND FIX: the upper-left sword crosses the middle of the canvas. Redesign the LAYOUT ONLY so all figures are much smaller on a much emptier transparent canvas. Four separate equal cells in a strict 2x2 grid. Take ALL FOUR complete figures including weapons and scale each equally to 65% of its current overall pixel size, then place one centered in each cell. This creates a huge empty transparent gutter both between columns and between rows. The widest upper-left lunging figure, including its full sword, must fit entirely inside left half, with its sword tip nowhere near the central boundary. Leave wide generous margins on every side. Keep exactly the same relative body scale between frames so standing and lunging character share the same bone length. The characters SHOULD LOOK SMALL on this sprite sheet, not fill the cells. Do not re-enlarge them to use empty space.
Upper-left retains full rightward thrust lunge, upper-right withdraws rapier, lower-left nearly returned to guard, lower-right neutral tall guard with rapier low diagonally. Complete sword tips, hat and boots. No overlap, text, labels, gridlines, effects, shadows or background. True transparent alpha. Same crisp detailed anime art, same corrected small adult head size across all frames.
```
