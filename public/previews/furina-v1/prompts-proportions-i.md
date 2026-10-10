# Furina I proportion revision — sources and exact prompts

Generated with the **built-in image_gen tool**, transparent_background: true. No CLI/API fallback, scripted pixel edits, background removal, recoloring or rescaling. Each selected generated PNG was copied byte-for-byte into the project. The original assets/i-burst.png remains preserved.

## Scope and anatomy review

This is the independent art-preview revision only, with no production combat integration. The approved master.png remains the body/face/outfit authority. Approved J's neutral frame was used to reinforce the already accepted smaller-head, longer-body proportions, without using the old large-head I sprite sheet as a generation reference.

The initial I A candidate passed root's equal-standing-height comparison against the master: shoulder position and hair volume differ slightly in the drawing, but the overall adult proportions are close. No blind percentage head reduction was then applied. B, C and D use approved A + master as their references to preserve its skeleton.

Hat remains worn in every pose. Right hand always holds a lowered one-handed silver-blue rapier pointing diagonally down-right. The left hand introduces, announces, conducts a downbeat, releases and returns. **Exactly two hands** were checked visually in every generated frame; the chest has only white cravat and blue gem when the left hand is away. The full left arm must not remain extended when the hand returns to chest.

## Selected files

All four files are **1254×1254, RGBA**, with alpha extrema **0..255**. Original directory:

C:/Users/46637/.codex/generated_images/01a124d4-29f6-7571-8ed1-8ff51ad7dfce/

| Project file | Original generated file | Fully transparent pixels |
|---|---|---:|
| assets/i-burst-proportions-a.png | exec-00c78236-9004-4778-b282-9337c363736a.png | 1,076,231 |
| assets/i-burst-proportions-b.png | exec-88e69dfc-703c-4acc-9404-9eecde92c120.png | 1,064,322 |
| assets/i-burst-proportions-c.png | exec-29e606e1-37cd-4856-8771-634326481035.png | 1,043,012 |
| assets/i-burst-proportions-d.png | exec-72380def-fbaa-4b01-b273-5fc68ed71bdf.png | 1,070,277 |

Each image contains four poses arranged 2×2. Total: 16 poses.

## Action order

1. Quiet guard, left hand lightly at chest.
2. Deliberate hand-to-chest introduction.
3. Lifted chin and opened shoulders announcing.
4. Left hand opens away from chest.
5. Left forearm rises.
6. Palm rises above shoulder and opens out.
7. Full diagonally raised declaration.
8. Hold declaration.
9. Turn wrist to prepare downbeat.
10. Hand drops to shoulder level.
11. Decisive forward open-palm release — external water-curtain effect timing.
12. Hold release.
13. Relax fingers and begin bending elbow.
14. The same left hand returns to chest.
15. Settling shoulders and coat.
16. Neutral guard matching A1.

## Source rectangles and consistent sizing

Raw rows are not exactly mathematically centred. Suggested large safe source rectangles below are [x, y, width, height]; preview may use tighter manually inspected bounds and foot pivots. These are renderer crop coordinates, not edits to the PNG pixels.

```json
{
  "A": [[0,0,627,638],[627,0,627,638],[0,638,627,616],[627,638,627,616]],
  "B": [[0,0,627,620],[627,0,627,620],[0,620,627,634],[627,620,627,634]],
  "C": [[0,0,627,640],[627,0,627,640],[0,640,627,614],[627,640,627,614]],
  "D": [[0,0,627,635],[627,0,627,635],[0,635,627,619],[627,635,627,619]]
}
```

Read-only alpha > 32 silhouette bounds relative to the rectangles:

- A: [135,34,513,631], [128,35,511,631], [137,7,521,593], [127,5,511,596].
- B: [154,7,547,605], [104,7,496,605], [155,16,555,613], [98,16,495,614].
- C: [125,28,512,634], [102,29,496,634], [124,6,551,594], [107,6,537,594].
- D: [125,17,548,633], [124,17,526,633], [124,3,526,610], [124,3,526,610].

Complete hats, hands, sword tips and feet are present within these source rectangles. D has a narrow gutter and B hats approach the top edge, so applying a blind equal-grid crop would be inappropriate.

Use one uniform size calibration per sheet, anchored at manually inspected foot positions. Match natural skull/hair crown to sole; exclude hat/raised hand/weapon from standing height. Never independently stretch width and height or normalize each action's outside bounding box to the same height.

## Exact prompts

A references master.png + approved jab-thrust-proportions.png. B/C/D reference approved i-burst-proportions-a.png + master.png. B/C/D were generated as independent built-in calls in parallel after root approved A.

### Sheet A

```text
Use case: identity-preserve. Four full-body sequential action illustrations with transparent alpha for an adult character animation.
IMAGE 1 is Furina's approved MASTER PORTRAIT: it is the ONLY anatomical proportion authority. IMAGE 2 is an approved sword animation sheet: its TOP-LEFT standing figure demonstrates the correct small head versus slender adult body. Use that same head/neck/shoulder/torso/hip/knee/ankle scale relationship. Do not inherit the other sword action poses.
Make sheet A of a 16-pose magical performance, ONLY the first FOUR poses. Arrange in strict TWO COLUMNS x TWO ROWS on a large square transparent canvas, one figure in each cell, all facing RIGHT three-quarter profile, all SAME body scale and same planted feet.
Anatomy must retain the reference master's small refined head, narrow adult face, elongated slim torso and LONG thighs and calves. This is a refined FASHION ILLUSTRATION adult model sheet, not a cute enlarged-head game sprite. Never enlarge the head to improve small-scale readability, never compress the legs to fit multiple poses. Match master body landmarks visually; do not invent a different skeleton. Keep the skull/hair/hat group distinctly small relative to the body, like approved image 2 top-left.
Furina wears her dark navy/gold aristocratic coat with blue flowing tails, white cravat and blue gem, dark shorts, asymmetric dark stockings and heeled navy shoes. Short white-blue hair and ornate navy top hat. The hat REMAINS ON HER HEAD in EVERY FRAME of this sequence. RIGHT HAND HOLDS A ONE-HANDED SILVER-BLUE RAPIER LOW AT HER RIGHT HIP, blade diagonally DOWN-RIGHT, passively lowered the whole sequence. The sword never attacks.
Exactly TWO arms and TWO hands per figure. Right sword-hand at low hip. Left hand alone performs gestures. When left hand leaves chest, show ONLY WHITE RUFFLED CRAVAT AND BLUE GEM at chest, NEVER a leftover black hand on chest. No extra detached gloves.
Four poses read top-left, top-right, bottom-left, bottom-right:
1 Elegant quiet guard matching the approved standing anatomy; right sword-hand low, left fingertips resting lightly on upper chest; calm face.
2 Left hand draws slightly higher and flattens over upper chest in a deliberate introduction, slight breath and lifted sternum; right sword-hand stays low; BOTH feet stay planted.
3 Proud theatrical declaration: shoulders open and chin rises slightly, left hand still gently at chest, body subtly extends upward without changing bone lengths; right sword-hand still low.
4 The SAME LEFT HAND leaves the chest and opens outward toward screen-right at upper chest height, palm open in invitation and elbow softly bent. Chest is now bare of hands, only white cravat and blue gem. Right hand still down by hip holding sword. Exactly these TWO hands.
Each COMPLETE figure including full sword tip, hat, hair and shoes has wide transparent margins within its own cell. Frame height including hat uses around 75% of each cell, never touch cell boundaries. Identical camera scale, no perspective zoom, no cropping. No background, floor shadow, grid, labels, text, effects, glows or duplicates. Polished crisp anime linework and shaded costume detail matching the approved master. True transparent background.
```

### Sheet B

```text
Use case: identity-preserve. Transparent sequential character action illustration sheet for an adult magical stage performance.
IMAGE 1 is APPROVED SHEET A. Copy its EXACT same anatomy, head size relative to body, long torso and long legs, costume proportions, identical camera scale, facing direction and grounded stance. IMAGE 2 is the approved MASTER PORTRAIT, sole anatomical identity authority. No altered skeleton, no big head, no shortened limbs. Refined adult fashion illustration proportions, not exaggerated cute game-sprite proportions. Match approved A rather than reinventing her design.
Furina in navy/gold fitted aristocratic coat with blue tails, white ruffled cravat and blue gem, dark shorts, asymmetric dark stockings and heeled navy shoes, short white-blue hair, delicate refined small adult face. TALL NAVY/GOLD HAT REMAINS WORN IN ALL FOUR POSES. Facing RIGHT in a slight three-quarter profile. Keep both feet planted, same figure scale and physical dimensions across all four poses; subtle torso motion is okay but no zoom.
RIGHT HAND HOLDS HER ONE-HANDED SLENDER SILVER-BLUE RAPIER LOW BESIDE RIGHT HIP, PASSIVELY POINTING DIAGONALLY DOWN-RIGHT THROUGHOUT. Only the LEFT ARM gestures. Exactly TWO ARMS AND TWO HANDS. The right sword hand stays low and the one left hand moves. NEVER leave a leftover black glove/hand on the chest when left arm is raised or extended. On exposed chest, render ONLY white ruffled cravat, blue gem and fitted coat, with NO extra black hand. Absolutely no detached hands, duplicate sleeves or third arm.
Strict TWO COLUMNS x TWO ROWS square transparent sheet. Exactly FOUR full-body poses read top-left, top-right, bottom-left, bottom-right. Each complete figure including full sword tip, hat, finger tips and shoes must have clear transparent padding, no overlap/cropping or parts crossing a neighbouring pose. Reserve generous row gutters. The figures do NOT have to fill cells. All four figures same body scale as approved A; do not resize a pose because its arm is raised. Frame bottoms maintain same standing footing. Sharp, polished detailed anime illustration with clean outlines matching approved A and master. No effects, weapon swings, smoke, glow, floor, shadows, text, grid or labels. Genuine transparent alpha.
This is SHEET B, poses 5–8 of the magical gesture sequence. It follows sheet A's final pose where left hand has just opened away from chest. In ALL B POSES the left hand is AWAY FROM CHEST; chest has NO black glove, only white cravat and blue gem.
5 Left forearm sweeps upward, palm open at face height and slightly forward to screen-right, elbow bent softly; head turns slightly toward the audience.
6 Left palm rises above shoulder level and moves further out toward screen-right, graceful opening declaration, elbow unfolding.
7 Full announcing pose: left arm extends diagonally up-right about forty-five degrees, open palm and five relaxed fingers pointing outward/upward. Shoulders confident, chest open, right sword-hand still low.
8 Hold the SAME announcing pose with tiny wrist/finger flourish, coat tail lags slightly; do not make a radically new pose. Hat stays worn.
Four DISTINCT successive stages of the same left arm lifting movement. NO sword attack.
```

### Sheet C

```text
Use case: identity-preserve. Transparent sequential character action illustration sheet for an adult magical stage performance.
IMAGE 1 is APPROVED SHEET A. Copy its EXACT same anatomy, head size relative to body, long torso and long legs, costume proportions, identical camera scale, facing direction and grounded stance. IMAGE 2 is the approved MASTER PORTRAIT, sole anatomical identity authority. No altered skeleton, no big head, no shortened limbs. Refined adult fashion illustration proportions, not exaggerated cute game-sprite proportions. Match approved A rather than reinventing her design.
Furina in navy/gold fitted aristocratic coat with blue tails, white ruffled cravat and blue gem, dark shorts, asymmetric dark stockings and heeled navy shoes, short white-blue hair, delicate refined small adult face. TALL NAVY/GOLD HAT REMAINS WORN IN ALL FOUR POSES. Facing RIGHT in a slight three-quarter profile. Keep both feet planted, same figure scale and physical dimensions across all four poses; subtle torso motion is okay but no zoom.
RIGHT HAND HOLDS HER ONE-HANDED SLENDER SILVER-BLUE RAPIER LOW BESIDE RIGHT HIP, PASSIVELY POINTING DIAGONALLY DOWN-RIGHT THROUGHOUT. Only the LEFT ARM gestures. Exactly TWO ARMS AND TWO HANDS. The right sword hand stays low and the one left hand moves. NEVER leave a leftover black glove/hand on the chest when left arm is raised or extended. On exposed chest, render ONLY white ruffled cravat, blue gem and fitted coat, with NO extra black hand. Absolutely no detached hands, duplicate sleeves or third arm.
Strict TWO COLUMNS x TWO ROWS square transparent sheet. Exactly FOUR full-body poses read top-left, top-right, bottom-left, bottom-right. Each complete figure including full sword tip, hat, finger tips and shoes must have clear transparent padding, no overlap/cropping or parts crossing a neighbouring pose. Reserve generous row gutters. The figures do NOT have to fill cells. All four figures same body scale as approved A; do not resize a pose because its arm is raised. Frame bottoms maintain same standing footing. Sharp, polished detailed anime illustration with clean outlines matching approved A and master. No effects, weapon swings, smoke, glow, floor, shadows, text, grid or labels. Genuine transparent alpha.
This is SHEET C, poses 9–12 of the magical gesture sequence. It follows a high diagonally up-right left-hand announcing pose. In ALL C POSES left hand is AWAY FROM CHEST; chest has NO black glove, only white cravat and blue gem.
9 Left arm remains diagonally upward-right; rotate the left wrist so palm angles down, a clear brief preparatory gesture before conducting the downbeat. Head proud and focused.
10 A quick short downbeat: left elbow softens and left hand drops to shoulder level in front/right of the character, palm down. No ghost arms or motion blur; show ONE exact pose.
11 RELEASE POSE: left arm fully extends decisively toward screen-right SLIGHTLY BELOW SHOULDER HEIGHT, open palm facing forward/right as if commanding water curtains. Left fingers firm and separated naturally; body subtly leans into the gesture. Right hand still low with diagonal-down rapier. This exact pose triggers the magical effect externally, but draw NO special effects.
12 HOLD RELEASE: same forward extended left arm and open palm, tiny finger relaxation and settling coat, feet unchanged. No sword swing. Hat stays worn.
The sequence must visibly progress from high wrist preparation to a crisp lowered forward command. Exactly two hands per character.
```

### Sheet D

```text
Use case: identity-preserve. Transparent sequential character action illustration sheet for an adult magical stage performance.
IMAGE 1 is APPROVED SHEET A. Copy its EXACT same anatomy, head size relative to body, long torso and long legs, costume proportions, identical camera scale, facing direction and grounded stance. IMAGE 2 is the approved MASTER PORTRAIT, sole anatomical identity authority. No altered skeleton, no big head, no shortened limbs. Refined adult fashion illustration proportions, not exaggerated cute game-sprite proportions. Match approved A rather than reinventing her design.
Furina in navy/gold fitted aristocratic coat with blue tails, white ruffled cravat and blue gem, dark shorts, asymmetric dark stockings and heeled navy shoes, short white-blue hair, delicate refined small adult face. TALL NAVY/GOLD HAT REMAINS WORN IN ALL FOUR POSES. Facing RIGHT in a slight three-quarter profile. Keep both feet planted, same figure scale and physical dimensions across all four poses; subtle torso motion is okay but no zoom.
RIGHT HAND HOLDS HER ONE-HANDED SLENDER SILVER-BLUE RAPIER LOW BESIDE RIGHT HIP, PASSIVELY POINTING DIAGONALLY DOWN-RIGHT THROUGHOUT. Only the LEFT ARM gestures. Exactly TWO ARMS AND TWO HANDS. The right sword hand stays low and the one left hand moves. NEVER leave a leftover black glove/hand on the chest when left arm is raised or extended. On exposed chest, render ONLY white ruffled cravat, blue gem and fitted coat, with NO extra black hand. Absolutely no detached hands, duplicate sleeves or third arm.
Strict TWO COLUMNS x TWO ROWS square transparent sheet. Exactly FOUR full-body poses read top-left, top-right, bottom-left, bottom-right. Each complete figure including full sword tip, hat, finger tips and shoes must have clear transparent padding, no overlap/cropping or parts crossing a neighbouring pose. Reserve generous row gutters. The figures do NOT have to fill cells. All four figures same body scale as approved A; do not resize a pose because its arm is raised. Frame bottoms maintain same standing footing. Sharp, polished detailed anime illustration with clean outlines matching approved A and master. No effects, weapon swings, smoke, glow, floor, shadows, text, grid or labels. Genuine transparent alpha.
This is SHEET D, poses 13–16, returning from a forward-left-hand magical release to quiet neutral.
13 Left arm still reaches toward screen-right slightly below shoulder height, fingers start relaxing, elbow just begins to bend. The left hand has NOT reached the chest; show no chest glove. Right sword hand stays low.
14 The ONE left hand returns along a graceful inward arc and lightly contacts the upper chest. Left elbow now bent, no other extended left arm remains. Only that ONE left hand on the white cravat; right hand still low.
15 Quiet settling pose: left fingers rest lightly on chest, shoulders relax, blue coat tails still sway subtly behind. No duplicate gloves, no extra arm.
16 EXACT CLOSED-LOOP NEUTRAL TO MATCH IMAGE 1 FRAME 1: same natural crown, chin, shoulders, waist, hip, knees and soles, same small head vs long adult body, same right low diagonal rapier, same left hand resting lightly at chest. Return to the same planted foot positions as first frame. Hat remains on head. Do not make her younger, shorter or bigger-headed as she settles.
No theatrical bow or hat removal; this skill is a conductor's declaration and downbeat, not the hat-summon skill.
```
