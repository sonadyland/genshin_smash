# 钟离美术与动画样板：生成记录

本目录仅供独立视觉预览，尚未注册为可玩角色，也未修改现有角色、美术资源或战斗逻辑。

## 生成方式

使用内置 `image_gen__imagegen`，每次传入 `transparent_background: true`。保留生成的 RGBA alpha；未使用脚本擦背景、抠图或重绘像素。使用 Python/Pillow 只读取尺寸、alpha 范围与包围盒作为质量检查。项目资源是原生成 PNG 的直接副本。

| 资源 | 实际尺寸 | 透明性 | 动画 |
| --- | --- | --- | --- |
| assets/master.png | 1024 × 1536 | RGBA，alpha 0–254 | 单张角色身份参考 |
| assets/l-skill.png | 1254 × 1254 | RGBA，alpha 0–255 | 地心，16 帧，4 × 4 |
| assets/jab-thrust.png | 1774 × 887 | RGBA，alpha 0–255 | 长枪直刺，8 帧，4 × 2（局部自定义裁切） |

## 帧与裁切说明

- L 图：每格边界按整张宽高四等分并取整。强 alpha（>100）人物包围盒约 302px 高，局部脚底 y=311–312；顶部 y=9–11。脚底透明余量较小，但强 alpha 未越格，人物和手势完整。
- J 图：完成一次针对布局的生成修正。最终第 5 帧枪尖仍略越均等列界，但未碰到邻帧；使用自定义源矩形即可保留完整武器。
- J 第一排按四等分，y=0，h=443。第二排四帧矩形依次为 `[0,443,510,444]`、`[510,443,377,444]`、`[887,443,443,444]`、`[1330,443,444,444]`。
- J 顶排脚底全图 y=419–425，底排约 y=837–838；应使用逐帧脚底 pivot。身体比例不能用包含长枪的整体包围盒归一化。
- 参考立绘带少量外围金色辉光；施法/枪术动画图已去掉大面积背景光雾。L 手掌保留少量近距离金光。
- 渲染器可以使用源矩形、缩放和脚底配准；源 PNG 本身保持原样。

## Master：原始提示词

```text
Use case: stylized-concept
Asset type: transparent full-body reference sprite for a polished 2D side-scrolling anime fantasy action game.
Primary request: Zhongli from Genshin Impact, immediately recognizable and faithful to his established character outfit and dignified persona. One single full-body adult male character only.
Subject: tall mature slim athletic man, composed amber eyes, layered dark brown hair with amber ends and a short narrow tied tail, recognizable Zhongli face. Original black and deep brown long split-tail coat with gold angular Geo ornament, light shirt, high collar, dark trousers, formal black boots, elegant gloves. Neat costume detail, amber geometric accents.
Pose: facing SCREEN RIGHT, side-on three-quarter view readable in a side-scrolling game. Calm standing combat-ready posture, head turned to right. Both feet fully visible on the same ground baseline. One gold-and-dark-brown polearm inspired by Vortex Vanquisher in the rear hand, shaft held diagonally behind the body and spearhead upwards, not over the face. Full spear visible within canvas.
Style: high-quality Japanese anime game illustration, clean precise line art and cel shading with restrained painterly highlights, readable silhouette, realistic anime proportions about 7 heads tall. Similar visual density to an existing 2D Genshin fan game, not photorealism, not chibi.
Composition: isolated single character centered with generous transparent margins on all sides. Full body and entire polearm within the frame. Portrait canvas if needed.
Lighting: neutral softly lit face, subtle warm gold highlights, no dramatic glow hiding anatomy.
Scene/backdrop: genuinely transparent alpha background; no ground, no scenery, no colored background, no checkerboard painted into the image.
Constraints: exactly two arms and two legs, anatomically sound hands, no extra characters, no duplicated weapon, no lettering or labels, no watermark, no frame, no contact shadow, no particles outside the silhouette. This is the identity reference for later animation sprites.
```

输入图片：无。生成文件：`exec-5bcb4bd1-8cf2-45ba-99f9-ae5063ad72bb.png`。

## L 地心：原始提示词

```text
Use case: stylized-concept
Asset type: production animation sprite sheet for an existing 2D side-scrolling Japanese anime fantasy action game.
Input image 1: exact Zhongli character identity and costume reference. Keep the same face, hair, black/deep-brown split-tail long coat, gold Geo ornament, white shirt, dark trousers and black boots. Use the same clean line art and cel shading. REMOVE THE POLEARM for every frame: he is casting with empty hands.
Primary request: one perfectly regular FOUR-COLUMN by FOUR-ROW sheet containing EXACTLY SIXTEEN distinct sequential full-body frames of Zhongli casting Dominus Lapidis / Stone Stele and Jade Shield. Read frames left to right, then top to bottom.
Canvas: square 2048 by 2048 if possible. Every cell 512 by 512, no gutters. Invisible grid: do not draw lines, borders, labels or numbers. Every body remains entirely within its own cell, with at least 20 pixels transparent clearance on all sides. His boots lie near y=466 within EVERY cell. Character head near y=65, constant about 400 pixel full body height. Feet anchor horizontally centered consistently. Same body scale across all sixteen frames.
View: always screen-right-facing three-quarter side view suitable for a side-scroller. Fixed camera, no camera motion, no zoom, no ground shadow. Head generally looks right. Mature elegant measured motions, not a sword slash or punch.
Animation choreography with REAL changing arm/elbow/hand/torso poses:
1 calm idle, arms resting, feet a modest distance apart.
2 draw right elbow back, lift forearm slightly, gather focus.
3 bend right elbow more, raise palm to chest, slight torso anticipation.
4 lift right palm open to shoulder level, poised fingers.
5 reach right palm forward, torso leans subtly forward.
6 extend right hand palm downward to designate the ground in front.
7 deliberate downward press at waist height, weight shifts into front foot.
8 finish the downward press, left hand starts to lift.
9 withdraw right hand slightly as both elbows open away from torso.
10 spread both forearms broadly, palms opening outward, coat tails start to flare.
11 arms fully opened diagonally at waist-to-chest height, proud upright stance, elegant shield-summoning key pose.
12 hold the open-arm pose with subtle cloth follow-through, wrists turn gently outward.
13 lower both forearms gradually, cloth settles.
14 elbows relax toward torso, hands lowering.
15 arms nearly resting, feet settle.
16 return to frame-1 calm idle to make transition continuous.
Effects: ONLY a very tiny restrained golden light close to the right palm in frames4–8. No full shield, no pillar, no rocks, no meteor, no aura, no glow background, no ground ring. The large effects will be composited separately in the game.
Scene/backdrop: real transparent alpha throughout all empty space. No black matte, no color fill, no painted checkerboard.
Constraints: same recognizable character in all cells; precisely two arms and two legs; complete hands and boots; all sixteen frames must be individually drawn, not reused idle cutouts. No character copies outside the 4x4 grid. No text/watermarks. Do not crop heads, hands, feet or coat tails. Do not include the spear from the reference image.
```

身份参考：`assets/master.png`，在生成前通过 view_image 检查。生成文件：`exec-2e6282d6-65ff-4845-bed9-71c71de9790e.png`。

## J 长枪直刺：初始提示词

```text
Use case: stylized-concept
Asset type: production 2D animation sprite sheet, a grounded spear thrust, for a polished anime side-scrolling action game.
Input image1 is exact character identity and costume reference: Zhongli from Genshin Impact. Keep same amber eyes, dark brown hair with gold ends, black/deep brown split-tail coat with gold geometric trim, formal shirt, dark trousers and black boots. Same elegant adult proportions, crisp line art, cel shading. Keep his one gold-and-dark-brown spear inspired by Vortex Vanquisher; NO other weapons.
Primary request: exactly EIGHT genuinely distinct full-body animation poses in a strict FOUR-COLUMN by TWO-ROW invisible grid. Row-major animation sequence left-to-right top-to-bottom. This is a rapid forward HORIZONTAL long-spear thrust, not a swing, not an upward slash.
Canvas landscape 2048x1024 if possible; all eight cells square equal size 512x512. No grid lines. Each full character and complete long spear must fit their cell with generous transparent clearance. Boots always at local y450. Body center x200, character approximately240px tall (to provide room for full horizontal spear). Same scale and fixed camera across all frames, always facing SCREEN RIGHT three-quarter side view.
Frame1: relaxed ready stance, right foot modestly forward, spear diagonal from lower left to upper right. Hands naturally apart on shaft.
Frame2: lower spear to chest level, right shoulder rotates back, knees flex, rear foot loads weight.
Frame3: strongest anticipation, spearhead pulled close to front, both hands grip the horizontal shaft, torso coils slightly backward.
Frame4: drive forward from back foot; front knee bends; both arms begin extending the spear toward the right. Coat tails lag behind.
Frame5: maximum reach KEYFRAME, long spear perfectly horizontal pointing right at enemy torso height, arms strongly extended, clear forward lunge, back leg straight, the entire gold spearhead visible with empty margin beyond it. No weapon trail hiding the spear.
Frame6: recover from lunge, bend elbows and draw spear back, front leg still bent, coat tails now swing forward.
Frame7: straighten torso and shift weight back toward balanced stance, spear tilts gently upward, elbows settle.
Frame8: return toward frame1 ready stance, relaxed knees, same hand positions as start.
Character acts with Zhongli's composed, precise martial economy, not wild rage. Face composed, mouth closed. Substantial actual anatomy and weapon pose changes in every frame; no simply translated/rotated same portrait. Anatomically correct two arms and two legs, exactly two hands on one spear, no duplicate shafts.
Scene/backdrop: real transparent alpha in every empty pixel. No halos, no gold mist, no background gradient, no ground or shadow, no environment. No large FX at all, weapon itself provides the action silhouette.
Constraints: nothing crops or crosses cell boundaries. Entire boots, hair, hands, coat tails and spear in every cell. Exactly8 sprites, no labels, no text, no watermark, no painted checkerboard. Preserve identity and costume across all frames.
```

身份参考：`assets/master.png`。初始生成文件：`exec-4605f29e-8b4f-4797-83d3-ab8b8d28ad47.png`，因跨格过大未作为最终资产复制。

## J 长枪直刺：一次定向修正

```text
Use case: precise-object-edit.
Input image1: eight-frame Zhongli spear-thrust animation spritesheet, edit target.
Keep exactly the same Zhongli identity, clothing, right-facing direction, one golden spear, clean cel-shaded anime visual style and eight action sequence. Keep real transparent background.
Correct ONLY the layout, per-frame size consistency and safe margins. The current sheet has frames crossing cell boundaries. Recompose ALL eight figures 30 percent smaller WITHIN A PRECISE REGULAR FOUR COLUMN BY TWO ROW grid. Each cell is an equal-width/equal-height rectangle. The entire spear and coat tails in every pose must lie inside its own cell with a visible transparent gap of at least 8 percent of cell width on left and right. NO sprite or weapon may intersect a neighboring cell. The fifth pose (second row first column) has a long extended spear: shrink the entire sprite sufficiently to fit, do not cut or shorten the spear. Give the SAME proportional reduction to all other figures, maintaining same anatomical head/body scale. Do not fill empty space; leave generous blank alpha padding.
Use a 2048x1024 wide canvas if possible, each frame512x512. Feet bottom at local y425 consistently, and standing body only about240 pixels high, leaving substantial blank space above and below. NO need to fill the cell with a giant character. Most of each cell should be empty transparent space.
Eight chronological actions should remain:1 ready diagonal spear;2 knees flex and lower spear;3 coil and retract horizontal spear;4 extend into lunge;5 maximum horizontal thrust to right;6 pull spear back;7 straighten and reset;8 ready diagonal spear. Distinct true anatomy poses, complete boots, complete spear. No drawn grid, no text/numbers, no ground shadows, no background effects, no ghosts, no second spear. The precise 4x2 registration and transparent spacing is the most important change.
```

编辑目标：上述初始 J 图，在生成前通过 view_image 检查。最终生成文件：`exec-cad1972c-d031-4352-afee-ae00443e928f.png`。
