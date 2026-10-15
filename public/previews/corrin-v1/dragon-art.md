# 女神威白龙待机美术 — 内置 imagegen 生成记录

本轮仅交付独立美术预览资源，不注册游戏角色。使用内置 `image_gen__imagegen`，请求 `transparent_background: true`。最终 PNG 为生成原图的逐字节复制，无脚本绘画、抠图、缩放或像素修正。Pillow 只读取尺寸和 alpha 边界。

## 最终资源

| 工作区文件 | 内置生成原图 | 尺寸与通道 |
| --- | --- | --- |
| `assets/dragon-master.png` | `C:/Users/46637/.codex/generated_images/01a139ab-3e1d-7a62-a263-0aa6c3933815/exec-23891817-553e-429f-8ce3-c32c02eca8bd.png` | 1536 × 1024 RGBA |
| `assets/dragon-idle-a.png` | `C:/Users/46637/.codex/generated_images/01a139ab-3e1d-7a62-a263-0aa6c3933815/exec-81b78730-bd7d-4976-a1d9-15250a455db3.png` | 1254 × 1254 RGBA |
| `assets/dragon-idle-b.png` | `C:/Users/46637/.codex/generated_images/01a139ab-3e1d-7a62-a263-0aa6c3933815/exec-8e625e98-b637-4207-a422-99ddee3229e5.png` | 1254 × 1254 RGBA |

造型母版：`output/imagegen/corrin-dual-form-portrait-v1.png` 中已批准的白龙。仅用 `output/imagegen/tharja-stance-v3.png` 参考游戏的精细线条与右向读图质量，不借用人物/服装/道具。沿用 Tharja 每张 2 × 2 四帧的真实绘制方法。

## 姿态与循环

横板右向略三分之二侧面，水平躯干、四足承重；白银甲壳、深色颈腹/爪足、红眼、分叉角、卷尾保持母版身份。待机允许头颈抬起，后续攻击可独立压低瞄准。禁止变成翼龙、普通蜥蜴、鹿或添加第五足。

每表行优先（左上、右上、左下、右下）：
1. A1：呼气基线，睁眼、放松。
2. A2：轻吸气，胸腹微张。
3. A3：接近吸气峰，半眨眼。
4. A4：吸气峰，短眨眼。
5. B1：呼气开始，眼睑回开，尾尖有延迟。
6. B2：睁眼，胸腹与颈部回落。
7. B3：接近基线，尾尖归稳。
8. B4：回到 A1 基线。

建议初始时序 `600, 500, 80, 80, 100, 550, 500, 590` ms，总计 3000 ms。以浏览器审片为准，图内眨眼较克制。身体只做轻呼吸和头颈变化，四爪位置应通过固定脚底锚点登记，不做逐帧外轮廓归一化、不拉伸四肢。

## 只读测量

每格 627 × 627；alpha > 32 的局部边界（left, top, right, bottom，右/下不包含）：

- A：`(50,151,576,552)`、`(66,149,591,552)`、`(49,127,576,527)`、`(68,128,593,527)`。
- B：`(48,148,579,553)`、`(60,150,593,553)`、`(48,127,579,528)`、`(59,128,592,529)`。
- A 全透明像素：1,105,431；B 全透明像素：1,102,780；两表 alpha 均覆盖 0–255。
- A 约 526 × 400 主体，B 约 531 × 403。每表可以采用一个固定标尺；不同格的排版落点偏移需用脚底锚点处理。
- A/B 主体四周均有透明留边，无跨格或边缘裁切。
- 内置图片展示可能显示 alpha=0 的隐藏灰色 RGB 底图；如母版坐标 `(10,500)`、`(750,300)`、`(800,800)` 的 alpha 均为0。应以浏览器 alpha 合成判断，不以忽略 alpha 的 RGB 展示判定有背景。

## 修订记录

母版首稿 `exec-0c519421-b238-4e96-be14-e22b78bdaddd.png` 完整四足；进行一次图像模型透明背景定向清理后采用当前 master，未更改构形。
A 首稿 `exec-9f3e46fa-39b7-43ea-879f-9a3849a1f15f.png` 横向占格过满而未采用，通过图像模型统一缩小和增加透明留边一次修正，采用当前 A。
B 同时参考最终 A 与 master，未额外变体。

## 母版提示词

```text
Use case: stylized-concept.
Asset type: ONE transparent full-body master idle sprite for a polished hand-painted 2D side-scrolling action game, Corrin's white dragon form from Fire Emblem Fates.
Reference image 1 is the APPROVED character and white-dragon design. Use ONLY the DRAGON as the identity and anatomy authority. Preserve its long elegant armored head with red eyes, branching swept-back silver-white antler-like horns, silver-white segmented overlapping armor plates, dark graphite flexible underside running from jaw through neck/chest/belly, long elegant quadruped legs with dark clawed feet, pointed armor layered along limbs and back, and long tapered armored tail. Reference image 2 shows the game's refined anime linework/render quality and practical right-facing three-quarter side view ONLY: do not include this woman, book, or her clothing.
New pose: convert the approved dragon into a compact, playable HORIZONTAL quadruped combat-idle stance facing SCREEN RIGHT, mostly side view with a small 3/4 angle showing the chest and near-side legs. Long torso extends horizontally from hips on left to shoulders on right. Exactly FOUR legs, two forelegs connected to shoulders and two hind legs connected to pelvis, all four claws grounded. Near and far legs are separately readable but naturally overlap in perspective; every limb has a continuous connected hip/shoulder, joint, shin and clawed paw. No extra legs or dangling disembodied claws.
Neck curves FORWARD and only modestly upward, head stretches toward screen right, jaw approximately at shoulder-and-chest level so lowering it slightly could aim a horizontal water projectile. It must NOT copy the tall upright neck / regal sitting sculpture pose from reference 1. Body and shoulder mass held horizontally with modest knee/elbow bends and balanced planted paws, relaxed closed mouth, attentive red eye, no snarling.
Tail extends from left hip rearward then curls modestly back inward and upward, staying close to body, not a gigantic banner occupying empty space. Tail is anatomically distinct from hind legs. Horns swept back as in approved design. Total silhouette width approximately 1.7 to 1.9 times its height, counting horns, body and tail. Keep the full head/horns, torso, all four legs/paws and complete tail visible with generous transparent padding, centered on a LANDSCAPE canvas. No need to fill every pixel: preserve 7% clear alpha margin around the full silhouette.
Style: same crisp delicate illustrated anime outlines, polished silver plate shading and dark under-scales as approved, legible slightly simplified details for small gameplay scale, not photorealistic or toy-like. Consistent soft neutral lighting. Exact creature identity, not an ordinary lizard, deer, horse or winged dragon. NO wings. Not chibi. No human, weapon, dragonstone, spell book, particles, water effects, aura, ground, floor, shadows, labels, text, frame, grid, checkerboard or background. Genuinely transparent alpha background, empty space transparent. This is a calm baseline idle pose, not an attack or jump.
```

## 母版透明背景定向清理提示词

```text
Use case: background-extraction.
Input image 1 is the edit target, an approved right-facing white/silver armored quadruped dragon. Preserve the dragon EXACTLY: same pose, size, head and horns, red eye, four legs and all claws, armor plates, dark neck/belly/feet, tail curl, shading and linework. Do not redesign, move, resize or crop any dragon part.
REMOVE ONLY the broad smoky gray-white translucent halo / mist / soft ambient glow surrounding the dragon. This asset will be composited directly over a game stage: ALL space outside the physical silhouette must have alpha=0. No translucent smoke, hazy aura, soft shadow, background glow, floating speckles or painted black background is allowed. The only semi-transparent pixels may be the narrow 1-2 pixel antialias edge immediately touching the actual dragon silhouette. Internal holes between horn branches, between all legs, under the belly and within the tail curl must also be entirely transparent. Keep solid dragon surfaces opaque. No checkerboard painted into the image.
Deliver the same full-body dragon in the same landscape framing as a clean genuinely transparent PNG cutout. Keep every horn, paw, tail and edge exactly intact; only remove the surrounding gray mist and background haze.
```

## A 前半循环提示词

```text
Use case: stylized-concept.
Asset type: FIRST HALF of an eight-frame genuine hand-drawn breathing idle animation, transparent 2x2 sprite sheet for a polished 2D side-scrolling anime game.
Input image 1 is the APPROVED DRAGON MASTER. Preserve precisely this creature identity, white/silver segmented armor, dark graphite underneck/belly/feet, delicate red eyes, branched swept-back horn shapes, four connected legs, long neck, curled armored tail, body proportions, rendering and the SAME screen-right side/three-quarter viewpoint. No human character.
Create EXACTLY FOUR chronological full-body frames in TWO COLUMNS by TWO ROWS, read row-major. Square transparent canvas. Each equal square cell contains one complete dragon, matching scale and camera across all four. Use about 86% of cell width and 60% of cell height, centered with generous clear transparent space. Full horns, muzzle, four paws and tail entirely within their own cell. At least 5% cell margin at all edges, no clipping or cross-cell contact. No grid, numbers or labels.
LOCKED PHYSICAL STANCE: horizontal torso, pelvis and shoulder height fixed; head and jaw gently forward, alert relaxed closed mouth; front paws under chest, rear paws under hips, exactly FOUR legs and four dark clawed paws. All four paws remain in the EXACT same planted positions relative to each cell throughout the cycle. In perspective far-side paw baseline is slightly above near-side baseline as in master. Clear connected near/far limbs, no fifth leg, no merged or detached joints. Keep near and far legs distinguishable. Tail curls back inward on the screen-left behind rump, the same length and root position. Do not scale the whole body or make a walking pose.
This is a calm 3-second loop, very SUBTLE anatomically drawn breathing with chest/neck flexion and secondary tail-tip motion. No new big pose, no jump, no steps, no whole-body bobbing.
Frame 1 top-left: exhale baseline, calm open red eye looking screen right. Chest soft, head lightly forward, tail at neutral curl.
Frame 2 top-right: inhale starts; chest plates rise just slightly, flexible underneck expands slightly, chin retracts a tiny amount. Feet, pelvis, body lengths and head size stay fixed. Tail tip still near neutral.
Frame 3 bottom-left: gentle inhale approaches crest; eye begins a natural short blink, lid halfway lowered. Neck bends slightly more at its base without moving shoulders or changing length. Tail tip trails with a tiny inward curl.
Frame 4 bottom-right: inhale crest; eye softly shut for one blink frame, relaxed jaw remains closed, chest very slightly expanded. Tail tip reaches delayed inward curl. Paw coordinates and torso scale unchanged.
Preserve exact master face/head/horn structure, four-legged anatomy, long graceful limbs and armored tail. Motion must be 4 actually illustrated in-between drawings, not copies shifted up/down. Same lighting/palette/line quality across every frame. Genuine transparent alpha empty space, no matte/background/checkerboard/halo, no scene, floor or shadows, no effects/water/glow/particles/weapons/humans. Idle only. Keep physical proportions and fixed camera, do not zoom to fill cells.
TRANSPARENCY CRITICAL: Any empty space must have alpha=0. No translucent gray-white smoky haze or ambient glow around body. Only physical dragon and narrow antialias edges may be nonzero alpha. Do not include any background gradient, drop shadow or fog.
```

## A 留边修正提示词

```text
Use case: precise-object-edit.
Image 1 is the edit target: a transparent TWO COLUMNS by TWO ROWS 4-frame idle sprite sheet of an elegant silver/white quadruped dragon facing screen RIGHT. Keep the exact same identity, face, antlers, red eye, segmented armor, four legs with dark clawed paws, curved tail, proportions, gentle inhale progression, render style and viewpoint.
CRITICAL FIX: sprites currently fill too much cell width, crossing the vertical midline and clipping rightmost muzzle/paw. SHRINK EACH OF THE FOUR COMPLETE DRAGONS uniformly to 78% of its current size, including every horn, head, body part, all FOUR paws and tail, preserving its exact aspect ratio. Center each complete dragon INSIDE its own equal square quadrant. Reconstruct any missing clipped extreme muzzle/paw from image2 MASTER without changing design. NO individual limb resizing.
Required layout: a square sheet partitioned mentally at 50% horizontal and 50% vertical, four equal cells. Each complete dragon must fit strictly between 10% and 90% of its cell width, and approximately between 20% and 80% of cell height. If 1254 square canvas, cells are 627 square: each dragon entire width at most 500 pixels and height about360 pixels, with at least50px transparent margin LEFT AND RIGHT. Every paw and muzzle stays safely inside quadrant. Completely clear transparent vertical gutter at least100px wide centered on image midline. DO NOT enlarge the sprites to fill empty space. Empty space is intentional.
Retain FIRST HALF of quiet breathing cycle: top-left open-eyed baseline; top-right open-eyed gentle inhale; bottom-left half-closed eyelid blink begins; bottom-right closed eyelid blink crest. All four paws fixed to matching cell coordinates; body scale fixed; only very small chest/neck flex and tail-tip change. Exactly four legs and paws, no added appendages.
Keep genuine alpha transparency. ALL outside physical silhouette alpha0, including holes between horns and paws and tail loop. No backdrop, haze, fog, glow, shadow, floor, watermark, labels, numbers, borders or grid. Preserve whole physical dragon opaque with narrow antialias edge. Reference2 is the dragon master identity ONLY.
```

## B 后半循环提示词

```text
Use case: stylized-concept.
Asset type: SECOND HALF of the eight-frame true drawn breathing idle animation of Corrin white dragon, exactly FOUR new consecutive frames in a TWO COLUMNS by TWO ROWS transparent sprite sheet.
Reference image1 is the approved IDLE SHEET A: match its EXACT physical dragon scale within each 2x2 cell, pose, four planted paws, head size, antlers, torso length, neck proportions, tail curl, armor details, small red eyes, style, lighting, perspective and cell composition. Reference image2 is its master dragon for identity details only. Same elegant silver white segmented armored quadruped with dark graphite neck/belly/clawed feet, no wings, no human.
These frames continue image1 BOTTOM-RIGHT and then return seamlessly to its TOP-LEFT. Four genuinely illustrated subtle in-betweens, NOT new poses or whole-sprite bouncing.
Same layout as image1: square1254 canvas, cells627square. Physical full dragon in each cell approximately526pixelswide by400pixelshigh; keep all body parts at identical scale as A. Leave at least35-50px transparent left/right margin, 100+px above and 60+px below, no crossing cell boundaries or clipping. Fixed viewpoint facing screen RIGHT in mostly side view with slight three-quarter chest exposure. Keep horizontal body, attentive neck, closed relaxed mouth, long tail curved inward behind on screen-left, exactly FOUR anatomically connected legs and four dark clawed paws.
PAWS: every paw remains planted at the same relative coordinates as its corresponding position in A. Fixed pelvis, shoulders and torso lengths, no steps or rotation or root shift. Head and horns remain same physical size. Only delicate breathing chest/neck flex and tiny tail-tip secondary motion.
Frame5 top-left: start exhale directly after A frame4 crest. Eye opens halfway from blink, chest still gently expanded, neck begins softly relaxing; tail tip reaches its small delayed inward sway.
Frame6 top-right: red eye fully open looking right, chest relaxes slightly, neck eases forward a tiny amount, tail tip starts returning.
Frame7 bottom-left: nearly resting neutral, open eye, torso settled; head alignment is close to A frame1, tail tip finishes following the breath. Paws and whole body size fixed.
Frame8 bottom-right: closely matches A TOP-LEFT frame1 baseline for seamless loop. Open attentive red eye, relaxed closed jaw, same neutral head position, chest relaxed, same curled tail and fixed four paws. No shrink or grow.
Preserve stable anatomy, no fifth limb, no extra claws, no split tails, no changed horn branches or kinked joints. Fine clean anime game illustration, consistent restrained highlights, no photorealism. All physical body opaque, all empty space genuine alpha0. No broad soft transparency haze around silhouette; only narrow antialias edges. No gray background, glow, mist, smoke, cast shadow, floor, scene, effects, water, particles, sword, person, text, labels, numbers, grid or borders. Intentional empty margins around each full isolated sprite; do not enlarge to fill space.
```
