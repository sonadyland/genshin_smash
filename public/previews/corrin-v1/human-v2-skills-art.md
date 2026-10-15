# Corrin human K / I redraw — master-proportions-v2

2026-10-14. This package supplies 24 newly drawn human skill frames for the independent art preview. It does not integrate Corrin into gameplay. The original `assets/human-master.png`, dragon artwork, and earlier sheets remain unchanged.

## Design and active assets

| Clip | Frames | Active source | Source dimensions | Fixed standing-equivalent ruler |
| --- | --- | --- | --- | --- |
| K / preparation | 1–4 | `assets/human-v2-smash-a-proportions.png` | 1363 × 1154 | 360 px |
| K / downstroke | 5–8 | `assets/human-v2-smash-b-proportions-safe.png` | 1363 × 1154 | 390 px |
| K / recovery | 9–12 | `assets/human-v2-smash-c-proportions.png` | 1363 × 1154 | 445 px |
| I / preparation | 1–4 | `assets/human-v2-secondary-a-proportions.png` | 1408 × 1117 | 490 px |
| I / thrust | 5–8 | `assets/human-v2-secondary-b-proportions.png` | 1408 × 1117 | 445 px |
| I / restoration | 9–12 | `assets/human-v2-secondary-c-proportions.png` | 1408 × 1117 | 500 px |

K now has an explicit physical sequence: reach the hilt with the second hand, slowly lift, load the sword behind the head, then cut forward from overhead through horizontal to down-right. Recovery absorbs the weight, straightens the body, and releases the second hand. The attack is a downward cut rather than a stationary charging pose with a detached light arc. The release sheet has four distinct blade angles. Zero-based active frames are 4, 5, 6; preparation and ordinary recovery have no attack arc.

I leaves the right hand holding Yato low behind the body. The anatomical left arm changes gradually from human hand to ivory-and-black claw, then a coiled dragon forearm/fang. It extends horizontally to the right through the shoulder and elbow, recoils, and restores the human hand. This is a continuous anatomical transformation, not a separately held spear. Zero-based active frames are 5 and 6. The later downward-to-forward Yato repositioning is recovery, not a sword attack.

The character sheets contain no large sword arcs, motion streaks, beams, or independently painted light trails. Any attack effect must be composed separately from the registered weapon or arm geometry.

## Identity and proportions

Every generation and corrective edit used the immutable original master as the first image reference. The approved `human-v2-idle.png` initially supplied the in-game palette and rendering reference; subsequent sheets supplied continuity only. The prompt targets the master's approximately 6.9-head adult anatomy, narrow waist, long thighs and shins, silver-gray fitted armor and hair, and muted navy/gray-blue cape with pale motifs. The anatomy is not made to match by stretching the sprite.

The initial K/I drafts still had oversized heads. All six sheets received a separate image-model edit requesting a roughly 10% reduction of skull, face, ears, ornament, and hair near the scalp, with natural neck connection. Long flowing hair, cape length, limbs, grip, and skill direction were preserved as constraints. The model also changed overall drawing coverage on some sheets, so final registration was measured from the actual final PNGs rather than copied from the drafts. K downstroke received one additional source edit to preserve the long raised blade and restore cell margins.

The fixed ruler in the table is an anatomical standing-equivalent estimate for a whole sheet. It is not the pose's opaque bounding-box height. Knees bent in a lunge and arms raised overhead must not cause the character to grow or shrink. Exact numeric equality of all generated anatomical ratios is not asserted. The final browser comparison against the master passed independent visual review.

## Prompt set and provenance

Tool: built-in `image_gen__imagegen`, with `transparent_background: true`. No API/CLI fallback. Every final PNG is a byte-for-byte copy of its generated original. No programmatic image editing, cropping, recoloring, scaling, or alpha rewriting was applied. Source paths and SHA-256 are recorded in `human-v2-skills-registration.json`.

Shared generation specification:

> True transparent 2 × 2 sheet with four separate complete poses. Original Corrin master is the mandatory identity, anatomy, weapon, palette, and soft-painting authority. Slender adult 6.9-head anatomy; small head approximately 0.145 standing height, hip to foot approximately 0.54, narrow waist approximately 0.105. Fitted silver-gray armor, silver hair, black ornament, red eyes, bare feet, muted gray/navy cape. Full gold Yato with red inlay. Same bones and head scale across frames; ample transparent clearance. No background, labels, weapon glow, sword arc, trail, sparks, or beam.

Per-sheet pose instructions:

1. **K A:** neutral right-hand low sword → second hand joins and blade lifts → both hands overhead with blade behind → charged overhead stance, ready to strike down-right.
2. **K B:** overhead near-vertical blade → forward horizontal downstroke → down-right impact → deeper down-right follow-through. Distinct sequential angles; real weight transfer through the long legs.
3. **K C:** absorb the low strike → straighten → release left hand near chest → restore the natural master stance and right-hand down-right sword.
4. **I A:** right sword low behind; left human hand raises → ivory/black dragon claw forms → short forearm fang → bent elbow, fang coiled beside shoulder before release.
5. **I B:** aim the coiled fang → partially extend with a step → full horizontal anatomical arm thrust → recoil and bend the elbow. Right-hand sword remains low behind.
6. **I C:** fold the dragon arm close → shorten it to a claw → restore human hand and move the sword back toward the front → relaxed master idle.

Final proportion-correction instruction, applied to every sheet with master first and the target sheet second:

> Reduce the cranium, face, ears, ornament, and scalp-hair mass about ten percent in width and height, naturally reconnecting to the same neck. Do not shrink the complete figure or alter its long legs, waist, pelvis, grip, or action. Preserve long flowing hair and cape length, identity, muted colors, and transparent isolation. No new effects. Target the master's elegant small-head adult proportions.

The K B safety edit then requested uniform extra cell clearance and restoration of the long near-vertical blade. The accepted active file is the `-proportions-safe.png` sibling; the earlier `-proportions.png` is history only.

## Registration and validation

`human-v2-skills-registration.json` contains two clips, 12 frames each, actual image dimensions, SHA-256, generated-source paths, cell rectangles, root pivots, duration, phase, and zero-based active-frame lists. Coordinates under `anchors` are cell-local. `weaponBase` is the visible blade root ahead of the guard, not the hand. `castOrigin` is the left elbow/forearm root; `fangTip` and its compatibility alias `dragonFangTip` are the visible anatomical end.

Read-only pixel checks confirmed all six active images are RGBA with alpha extrema 0/255, are byte-identical to the originals, and have isolated visible alpha > 32 silhouettes inside their declared cells. The smallest measured cell margin is 10 pixels. Every declared anchor lies inside its frame rectangle. Hand and tip coordinates remain manual drawing measurements; browser geometry overlays, clean compositions and mirrored views confirmed the K blade trail and I fang-tip light follow their physical release axes, with no new emission during recovery.

Browser integration, master comparison at a shared scale, and the blade/fang-to-effect overlay are separate acceptance steps. File counts, alpha checks, and valid coordinates do not prove animation quality.
