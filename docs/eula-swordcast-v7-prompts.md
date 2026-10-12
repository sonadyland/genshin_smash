# Eula sword-directed frost cast v7 — generation log

Date: 2026-10-12. Mode: built-in `image_gen`, real transparent RGBA. Raster pixels are not changed by registration scripts.

The approved design restores the early two-handed sword-point casting animation, combines it with the large Song of Broken Pines, and adds twelve continuous poses. The old four-pose sheet supplies anatomy, costume and action intent. The v6 portrait supplies only weapon design. Existing timing and the L horizontal spin remain unchanged.

## Generation 1

Inputs, in order:

- `public/assets/animations/eula-secondary-v1.png`: primary anatomy/action reference.
- `public/assets/characters/eula-v6.png`: weapon reference only.
- `public/assets/animations/eula-v6/secondary.png`: layout reference only.

Output: `C:/Users/46637/.codex/generated_images/01a130b6-14b4-7f93-8cb5-d04be4790b9e/exec-5399d2df-eb25-4752-818e-f2daa37e3479.png`

Assessment: correct two-handed action and forward lunge; middle-row sword length and gutters require correction.

### Exact prompt

```text
Use case: stylized-concept.
Asset type: production transparent 2D side-view game animation sprite atlas, Eula sword-directed frost casting.
Create ONE clean 4-column by 3-row sheet containing exactly TWELVE full-body animation cels, chronological left-to-right then top-to-bottom. Wide landscape sheet, generous transparent gutters. The same Eula, same camera, same body scale in EVERY cel. No labels/grid/text. Real transparent RGBA.
Reference 1 (eula-secondary-v1.png): PRIMARY reference for character design, slender anatomy, costume, head/body ratio, and the four key action silhouettes. Recreate that exact heroic blue-haired woman in this crisp painted anime side-scroller style. Keep her face, hair, fitted white/black/navy costume, thigh-high boots, long pale-blue flowing cape. Movement faces screen RIGHT in every cel. Reference 2 (eula-v6.png): WEAPON ONLY reference. Use the large Song of Broken Pines claymore: broad elongated icy blue/white blade with gold ornate crossguard, long narrow handle behind guard. Entire sword about 90 percent of her full standing height, NOT the short sword of reference 1. Reference 3 (secondary.png): ONLY four-by-three layout and rendering consistency reference. Do NOT copy its palm-casting choreography.
Action is a powerful two-handed SWORD-POINT magical release, never open-hand spellcasting, never overhead slash. Both gloved hands remain visibly wrapped around the single straight HANDLE, adjacent but separated grip positions BEHIND the crossguard. Hilt, hands, blade form coherent continuous structure. Never grip blade or have floating sword. Full blade tip always visible with generous clear margins.
Cel 1: standing ready with weight lowering, both hands on handle at right hip, blade points down/back to screen-left, shoulders turning into windup.
Cel 2: knees bend slightly further, hip turns back left, hands draw rearwards, heavy blade diagonally low behind body left; head still looks right.
Cel 3: deepest deliberate windup, low stable side-on stance, sword fully behind at hip height/down-left, arms close, cape lagging.
Cel 4: initiate release by driving back leg and hip forward, sword begins passing low beside body towards right, both elbows still bent; NOT cutting upwards.
Cel 5: contact/release start, right/front knee bends into forward lunge, both arms thrust broad claymore ahead RIGHT nearly horizontal at waist/chest level; left/rear leg extends, blade tip clear and sharp.
Cel 6: peak spell release, deepest grounded forward lunge, upper body fully committed and both hands pushing sword RIGHT, arms extended and point slightly above horizon. A very small contained icy highlight at the blade tip, no large effect.
Cel 7: strong follow-through, sword still fully forward RIGHT, front knee stable and rear heel starts settling, cape flows backward.
Cel 8: follow-through settles; both elbows soften only slightly, sword still aimed forward right; chest raises a little.
Cel 9: start withdrawing the sword from the forward direction, torso gradually returns vertical, blade lowering a little but still RIGHT, reduce lunge.
Cel 10: recovery, front foot retracts partially, elbows visibly bend bringing handle toward waist, long sword diagonally down-right.
Cel 11: almost upright balanced ready stance, blade down-right and both hands close, cape settling.
Cel 12: fully upright neutral ready stance matching initial standing body dimensions, blade down-right, same Eula.
CRITICAL: Natural slow anticipation, decisive extension, smooth recover shown in distinct anatomical poses. All 12 have exactly the same limb lengths, adult slender anatomy and head size; a crouch lowers head but never shrinks character. Preserve original character design of Reference 1. Large sword with reference 2 styling throughout, no sword length change between cells (perspective foreshortening minimal). Room in each cell for full horizontal blade and cape, no clipping, no crossing another cell. No ground, backdrop, typography, UI, contact shadow, lens flare, detached effects, frost waves, hand orbs, extra arms, duplicate weapons, giant head.
```

## Generation 2

Input: generation 1 as the edit target.

Output: `C:/Users/46637/.codex/generated_images/01a130b6-14b4-7f93-8cb5-d04be4790b9e/exec-86513d1e-688f-4c4b-8147-be171ba5b4f4.png`

Assessment: same choreography retained, but the outer-right tips still too close to the canvas. Discarded.

### Exact prompt

```text
Use case: precise-object-edit.
Edit the supplied twelve-frame Eula sprite atlas. Keep the TWELVE poses, the exact character identity/face/slender anatomy, costume, all four-by-three chronology, and the two-handed sword-point casting concept. Real transparent RGBA. No text or lines.
Two tightly related production fixes:
1. Lock ONE large Song of Broken Pines claymore size across all 12 cels. In the middle row (frames 5,6,7,8) the blade is presently too SHORT. The visible straight BLUE BLADE from gold crossguard to tip should be approximately 0.68 of Eula's full standing head-to-ground height; whole sword with handle about 0.90. For example the initial upright figure is about 320 pixels tall, the blue blade should be about 220 pixels long in every cel, including the horizontal forward-directed ones. Do NOT simply enlarge crossguard; lengthen the actual blue/white blade section to that consistent length. Keep both hands on the straight grip behind crossguard, tip on the sword centerline. No perspective foreshortening. Middle row sword must be a broad LONG greatsword, not a one-handed shortsword.
2. Use a WIDER roomy landscape canvas with four equal spacious columns and three rows, so every single full character and its long weapon fits within its OWN cell. Center each entire character-plus-weapon silhouette in the cell, use consistent absolute head size/body length across every pose, at least 24 transparent pixels on all four edges around every cel's full silhouette, including long blade tips and capes. Shrink ALL figures uniformly if needed to create gutters. Never individually shrink only the long-sword poses. No blade or cape crosses into a neighboring cell.
Preserve each cel's pose exactly: row1 gradual knees-bent low-left windup, row2 rightwards sword thrust and forward lunge (peak frame6), row3 settling recovery with sword gradually down-right. In row2 arms extended along the sword axis to propel frost from the TIP; no palm casting or separate energy orb. The same face and anatomy as input, no added details, no extra weapons, no huge trails. Clean silhouette and truly transparent outside.
```

## Generation 3

Input: generation 2 as the edit target. Extend horizontal blades and enlarge margins.

Output: `C:/Users/46637/.codex/generated_images/01a130b6-14b4-7f93-8cb5-d04be4790b9e/exec-ac4afddc-9225-4fe2-a258-67f0501c483a.png`

Selected, copied byte-for-byte to `public/assets/animations/eula-v6/secondary-swordcast-v7.png`. The 1684 × 934 RGBA atlas has twelve independent sprites; the actual alpha channel has transparent outside margins despite hidden blue RGB around its silhouettes. The horizontal blue-white blade now remains a large claymore. Root independently reviewed the character, two-handed grip, poses and weapon scale.

Registration: `scripts/register-eula-swordcast-v7.py` writes only the standalone clip JSON and `docs/eula-swordcast-v7-validation.json`. It does not write the active manifest or alter pixels. One fixed 250 px standing body height maps all poses to game scale. Supporting-boot midpoint anchors exclude cape/sword bounds; twelve manually inspected weapon tips exclude soft outer particles. All twelve names/phases/durations and the 44-tick total are unchanged. Alpha > 32 crop margin is at least 3 px, crops do not overlap, and no crop contains another frame's body.

### Exact prompt

```text
Use case: precise-object-edit. Correct this Eula animation atlas for production. Return a 4 columns x 3 rows TRANSPARENT sheet. Keep precisely these twelve poses, identical character costume and anatomy, face and hair, both hands tightly clasping the sword handle. Same chronological sequence and two-handed swordpoint frost casting.
Current defects are that the sword in the MIDDLE ROW is much too short, and some edges touch the canvas. Fix these now:
Make the blue blade in frames 5,6,7,8 (entire middle row) 1.5 TIMES its current length. Extend ONLY the blade toward screen RIGHT beyond its current tip, leave the hilt and hands and human pose in place. This is a long two-handed CLAYMORE: the blue blade from gold crossguard to sharp tip must be as long as Eula's entire torso AND thighs combined. No shortened rapier/short sword. Keep a straight perfectly coherent axis from hands through gold crossguard to centered tip. Preserve blade width and the exact blue-white/gold ornamentation.
Re-layout the twelve whole sprites on a BIGGER CANVAS with WIDE empty transparent gutters all around and between sprites. This is NOT a contact sheet filling every pixel. Each cell must have at least 12 PERCENT of its width as empty margin on the left AND right, and at least 10 percent of its height as margin on top AND bottom. The entire sprite including all sword, hair and cape must fit within the inner rectangle. Make the characters smaller compared with the overall large canvas, NOT relative to their swords. All twelve heads must have same physical size and every limb same length; maintain fixed anatomy and no perspective scale changes. Long horizontal sword release frames must not force their humans to shrink individually. Final sheet should have a lot of clean blank transparency.
Do not cut off ANY sword tip. No neighboring sprites touching, no noisy wisps or cast shadows in the gutters. No floor/background/border/numbers/text. Character and weapon only. Keep minimal ice sparkle only immediately on tip. Real transparent alpha output.
```
