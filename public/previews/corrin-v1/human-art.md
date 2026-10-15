# 女神威人形待机美术 v1

本轮只用于独立待机预览，未注册正式游戏角色。使用内置 `image_gen__imagegen`，每次请求 `transparent_background: true`。所有 PNG 均为生成原文件逐字节复制；未程序绘画、抠图、改像素、缩放或变形。

## 参考与文件

身份服装武器母版：`D:/Program/ai/genshin-smash/output/imagegen/corrin-dual-form-portrait-v1.png`。
仅视角、修长比例与自然站姿参考：`D:/Program/ai/genshin-smash/output/imagegen/tharja-stance-v3.png`。
工作流参考：Tharja 的两张 2×2 四帧图、固定每图身体标尺与逐帧脚底配准。

| 交付 | 生成原图 | 尺寸 / 通道 |
| --- | --- | --- |
| assets/human-master.png | C:/Users/46637/.codex/generated_images/01a139aa-bce3-7861-be53-31eb171a5ad3/exec-6cdd61d1-f16a-44c1-9d56-06d2f4a5cfca.png | 1254 × 1254 RGBA |
| assets/human-idle-a.png | C:/Users/46637/.codex/generated_images/01a139aa-bce3-7861-be53-31eb171a5ad3/exec-1dbb96d4-489a-4ccf-9bd9-607a6432ee07.png | 1254 × 1254 RGBA |
| assets/human-idle-b.png | C:/Users/46637/.codex/generated_images/01a139aa-bce3-7861-be53-31eb171a5ad3/exec-718e57ff-44a0-414c-9c69-b861d36512cf.png | 1254 × 1254 RGBA |

A 初稿 `exec-751cd36a-3d31-45ae-9fe0-78a545556ceb.png` 未交付：脚底边距过窄、两脚底高低差明显。仅做一次定向图像编辑，统一增大四格透明留白并调整双脚地面，定稿保留原始输出像素。

## 绘制与检查

- 人形朝右 3/4 侧面、成年修长小头比例，白银甲与黑内衬、银发黑饰、蓝披风、赤足，右手握夜刀神，左手空手放松。
- 不持发光龙石、不外放魔法。剑柄与右手相接，剑尖向前右斜下且完整显示。
- A/B 每张四格：左上、右上、左下、右下；完整人形和剑互不跨格。
- A：中立 → 轻吸气 → 眨眼进入 → 闭眼顶点。
- B：眨眼结束过渡 → 呼气 → 发尾衣摆回落 → 中立。B 左上眼睑仍较闭合，应使用短时长；后续三格为睁眼。
- 脚底在定稿中基本同线；不得按每帧外轮廓归一化，下一步以脚底配准及每张固定人体高度标尺登记动画。
- 读取检查：三图 alpha 范围均 0–255；完全透明像素数分别 master 1,130,795，A 1,116,702，B 1,141,703。尺寸均实际读取而非假定提示词尺寸。Pillow 仅用于读取尺寸和 alpha 统计，没有写图。
- 尚需在浏览器里按脚底锚点循环验收相位衔接。后半保持前半造型，未进行无目的反复重生。

## 母版提示词

```text
Use case: stylized-concept.
Asset type: approved character master for a refined 2D side-scrolling action game's in-game idle sprite. Generate ONE single complete full-body character on a genuinely transparent alpha background.
Input image 1 is the APPROVED Female Corrin from Fire Emblem Fates dual-form portrait, the sole identity/costume/weapon reference. Recreate ONLY its adult human woman. Keep her silver-white long hair, small black head ornament, red eyes, pointed ears, white-silver fitted light armor over black inner suit, dark blue cape panels, silver arm and shin armor, original bare feet, and the same ornate conventional Yato sword. No dragon in this image. Input image 2 is Tharja's approved game-stance reference ONLY for the adult slender small-head proportion, natural relaxed stance, right-facing three-quarter side camera and polished sprite rendering. Do NOT copy Tharja's face, outfit, book, shoes, colors, or background.
Viewpoint: entire torso, face, hips, legs and feet face SCREEN RIGHT in a coherent side-on three-quarter view, looking toward an enemy to the right, not looking at viewer. Calm kind but determined expression. Adult slender anatomy about 7.3-7.5 heads tall, head not oversized, long balanced legs, tasteful faithful fine anime linework and restrained painted cel shading matching a premium game sprite.
A natural grounded ready stance, both feet stay on one invisible horizontal floor. Feet point mostly right. Rear foot a little left, front foot a little right, foot centers separated about one bare foot length horizontally, no crossed legs, no wide battle squat and no rigid military pose. Knees softly relaxed, shoulders relaxed, hip above support center. Arms not symmetrical.
RIGHT hand correctly grips the black-and-gold Yato handle, visible fingers wrapped around the grip immediately behind its guard, thumb opposite fingers. Right elbow slightly bent in front of the waist. The sword angles diagonally down and forward toward SCREEN RIGHT; the full blade and tip are visible, tip well above the floor and outside her shin. Keep sword proportional to approved portrait, about 65-70 percent her height from pommel to point. No bent blade, floating handle or wrong hand on blade. LEFT arm relaxed with elbow bent, empty left hand near waist/lower ribs, natural loose fingers. No dragonstone held up during idle, no glowing crystal and no magic.
Long hair and blue cape hang downward behind her to the left, with a slight natural curl; no strong wind, no huge flying cape. Keep full crown, hair, cape, blade, hands, bare feet and all toes comfortably inside canvas. Use a square canvas, suggested 1536x1536, full figure including weapon centered and standing height about 80 percent canvas. Generous transparent margins, at least 8 percent below soles and above crown. NO text, labels, scene, floor, floor shadow, haze, particles, water effects, aura, border or checkerboard painted into image. Genuine transparency in all empty space. Exactly two arms and two legs, coherent hands and feet.
```

## A 初始提示词

```text
Use case: stylized-concept.
Asset type: production transparent idle animation sprite sheet for a polished 2D side-scrolling anime fantasy action game.
Input image 1 is the APPROVED Female Corrin in-game human idle master. It is the SOLE authority for identity, adult slender body proportions, face, silver-white hair, black head ornament, red eyes, white silver armor over black suit, blue cape panels, bare feet, sword, right and left hand roles, three-quarter right-facing viewing angle and rendering. Match it extremely faithfully. Create exactly FOUR distinct consecutive full-body frames of the FIRST HALF of a gentle breathing idle loop in exactly TWO COLUMNS by TWO ROWS, read left to right then top to bottom. Square transparent sheet, suggested 1536x1536. No text, grid, labels or shadows.
Keep the same mature small-head long-legged approximately7.3-head body. Entire character faces SCREEN RIGHT toward enemy, not viewer. Same eye size, face silhouette, feet anatomy, armor plate and costume seams in all frames.
Shared neutral stance matches master, except make both foot soles reach the SAME imaginary horizontal floor baseline while retaining natural slight foot stagger. Knees never cross; rear foot slightly left and front foot right, modest natural foot spacing, no wide squat or military rigidity. Feet and pelvis fixed across all frames. Right hand grips black-and-gold Yato handle tightly just behind ornate guard, sword hangs diagonally down and forward RIGHT at the same angle as master, complete sword tip safely above ground, right hand never holds blade, no duplicate weapon. Left arm gently bent with EMPTY left hand relaxed near waist/ribs, no crystal. Long hair and cape remain same silhouettes, quiet downward drape behind body. Only minute delayed breathing movement, no large gust.
Frame1 upper-left: neutral exhale start, eyes open gazing right, shoulders low, fingers in relaxed neutral pose, knees soft.
Frame2 upper-right: inhale begins, upper chest and shoulders gently expand/lift only a few pixels, neck and face remain same size. Left wrist relaxes a little. Feet/hips anchored.
Frame3 lower-left: inhale near crest, eyelids halfway closed entering a blink, chin lowers just slightly, hair tips and cape edge begin subtly trailing breath. Same hand grip, sword angle and grounded feet.
Frame4 lower-right: inhale crest, BOTH eyes softly fully closed for one blink frame, shoulders slightly lifted, left fingertips curled a fraction more; hair tips and cape edges a finger-width outward at most. Chest/shoulder drawing changes with breathing while hips/feet remain fixed.
Crucial: real anatomical in-between drawings, not four copies, not translated or stretched sprites. Preserve exact head dimensions, segment lengths and sword length across all frames. Fixed camera scale. Same complete figure occupancy and center placement in each equal cell. Character crown-to-sole height about78percent cell height; include the full sword, cape and hair within every independent cell. At least7percent clear alpha margin above crown/below soles and at all cell edges. Long sword extends right but does not touch cell borders. No clipping, overlap between cells, altered clothes, short legs, big/chibi heads, magic, projectile, glowing crystal, water effects or new accessories. Genuine transparent alpha background in every empty region, no painted checkerboard, haze, gradient, ground, shadow or border. Exactly two arms, two hands and two legs per character.
```

## A 定向修正提示词

```text
Use case: precise-object-edit.
Image1 is the target: transparent 2x2 four-frame idle animation sheet of adult Female Corrin. Keep her exact face, long-legged adult small-head body proportions, armor, black headpiece, silver hair, dark blue cape, sword, right hand grasp, left empty hand, right-facing three-quarter camera, the four breathing/blinking phases and painting style.
Make ONLY these corrections:
1. Uniformly reduce each complete character INCLUDING sword, hair and cape to 82 percent of its existing size WITHIN its unchanged equal square cell. Keep anatomical proportions exactly. Recenter in each cell, leaving substantial transparent margins above crown and below soles. Minimum48 pixels completely empty above crown AND below soles in each627x627 cell. Sword point and cape also need at least45pixels to side cell borders. The bottom row currently almost touches sheet edge: fix this. Do NOT enlarge to fill whitespace.
2. Ground BOTH bare feet on the SAME horizontal baseline in every cell. The rightmost forward foot currently floats higher: extend/relax its leg slightly downward so its sole rests at the same vertical level as the leftmost rear foot. Maintain natural mild foot spacing, uncrossed legs, soft knees and the same hip width. No cross-legged stance. Keep both foot positions identical in all four frames.
3. Empty regions must be pristine genuine alpha transparency, including isolated colored artifacts near sword tips and feet: no colored specks, aura, painted gray/white checkerboard or halo. Do not erase the character itself or alter any approved outfit details.
Four frames remain row-major:1 neutral open eyes;2 inhale open eyes;3 eyelids half closed;4 eyes fully closed at blink crest. Same sword angle downward-right with blade safely clear of the floor. Fine hand grip and blade continuity preserved. Do NOT add text, borders, grid, ground, shadows, particles or effects. Keep every full figure safely inside its equal quarter.
```

## B 后半循环提示词

```text
Use case: stylized-concept.
Asset type: SECOND HALF of an eight-frame transparent breathing-idle sprite animation for a polished2D side-scrolling anime fantasy game.
Input image1 is APPROVED IDLE SHEET A. Match its EXACT adult Female Corrin identity, small-head long-legged proportion, crown-to-sole height, armor, blue cape, white hair, face, bare feet, right hand sword grip, empty left hand, lighting, rendering, right-facing three-quarter view and2x2 sheet arrangement. Image2 is her master for costume/weapon details ONLY; do not copy its tall canvas occupancy. Image1 must determine frame scale and planted foot spacing.
Produce exactly FOUR genuinely drawn new consecutive frames5,6,7,8, without written numbers. TWO COLUMNS by TWO ROWS, square transparent canvas matching1254x1254 if possible. Frames continue from image1 bottom-right inhale/blink crest and return to its top-left neutral pose.
COMMON STANCE: same slim mature white-armored silver-haired woman facing RIGHT, looking offscreen right rather than viewer. Black head ornament, red eyes, original silver-black armor, dark blue cape, original bare feet. Both soles grounded on SAME horizontal floor baseline, uncrossed naturally spaced legs, slightly soft knees; identical pelvis and foot placements. No stepping. Right hand holds same gold-black Yato handle behind guard at upper thigh, full sword extends diagonally down-forward RIGHT, tip above floor; no altered blade length or sword hand. LEFT hand EMPTY and softly curled near waist/ribs. No dragonstone, glow or magic.
SEQUENCE ROW-MAJOR:
5 upper-left: exhale starts right after sheetA frame4, eyelids halfway open after blink, chin still slightly lowered, shoulders begin relaxing, empty left fingers begin loosening slightly; hair and cape reach tiny delayed sway.
6 upper-right: eyes fully open gazing right, shoulders relax fractionally lower, left wrist restores its neutral curve; hair/cape begin falling gently inward, sword angle and feet unchanged.
7 lower-left: nearly neutral, eyes open rightward, chest lowers slightly through quiet exhale, left fingertips settle, hair/cape continue their subtle delayed return.
8 lower-right: visually matches image1 TOP-LEFT neutral pose as closely as possible for seamless loop: calm open eyes looking right, chin level, low relaxed shoulders, same empty left hand near waist and same right hand gripping sword, fixed uncrossed grounded feet. Hair and cape quiet.
CRITICAL SCALE/FRAME FIT: image1 uses standing body height roughly495px in each627px square cell. Match that same scale EXACTLY, never enlarge frames to use whitespace. Full crown, cape, hair, bare feet and sword fit inside each equal quarter. Keep clear alpha margins at least50px above crown and at least30px below soles in ALL four cells, at least45px beyond sword point. Keep frame centers consistent with reference. Natural breathing is a tiny drawn change in shoulders/ribs/wrist, NEVER whole-sprite translation, zoom, warping, rescaling or stretched limbs. Head skull dimensions and limb bone lengths identical across frames and sheets. No strong wind or cape spread.
Genuine transparent alpha background in ALL empty areas. No scene, floor, cast shadow, colored specks or halo, checkerboard texture, text, labels, grid, borders, particles, water or effects. Exactly two arms/hands/legs per figure, coherent grip, feet and fingers.
```
