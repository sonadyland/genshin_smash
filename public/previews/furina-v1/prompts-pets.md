# 芙宁娜三宠美术与动作生成记录

这些资源用于独立美术预览，不代表正式游戏中的召唤物实现已完成。所有图像都由内置 `image_gen` 生成，透明背景开启。图像从 Codex 生成目录复制到本项目，未对像素进行裁剪、重排、描绘、去背景或重编码。

## 参考与改编范围

- 角色及三宠名称/物种参考：[HoYoWiki — Furina](https://wiki.hoyolab.com/pc/genshin/entry/4376)。
- 造型视觉参考：官方角色演示截图所在的 [HoYoLAB 原贴](https://www.hoyolab.com/article/22809295)，原图来源 `https://upload-os-bbs.hoyolab.com/upload/2023/11/07/87440989/d9f8bda8f7c0005309f1fff577a24a2c_3183377260237345883.png`，已保存至 `references/furina-official-salon.png`。
- 视觉参考先经过人工查看，确认乌瑟的高礼帽与章鱼轮廓、海薇玛的贵妇帽与卷尾、谢贝蕾妲的荷叶帽/蝴蝶结及双蟹钳。生成稿对饰品细节及二维线条作了适合横版画面的改编，并非直接复用原游戏贴图。
- 三宠动作根据已批准方案设计；泡泡、水弹、地面水花由预览层单独绘制，不烘焙到角色 PNG 中。

## 最终资源

| 文件 | 大小 | 内容 | 出手节点 |
| --- | --- | --- | --- |
| `assets/pets-master.png` | 1536×1024 RGBA | 三宠各一只，全身造型对照 | 无 |
| `assets/usher.png` | 1448×1086 RGBA | 12 帧，1–4 游动，5–8 收拢/蓄势，9–12 伸展推动/回收 | 第 9 帧 |
| `assets/chevalmarin.png` | 1448×1086 RGBA | 12 帧，1–4 游动，5–8 俯首/昂首蓄势，9–12 前伸吐弹/回收 | 第 9 帧 |
| `assets/crabaletta.png` | 1448×1086 RGBA | 12 帧，1–4 横步，5–7 下压举钳，8–10 快速落钳/压地，11–12 恢复 | 第 9 帧（落钳起于第 8 帧） |

原始生成位置统一为 `C:/Users/46637/.codex/generated_images/01a124a9-3d98-7e32-9761-743ca8909a2b/`：
- 母版：`exec-f74dcaa4-fd35-4434-9633-e5f4efcb4aa0.png`
- 乌瑟：`exec-ed2ca1c8-f0f4-4bb3-811d-d4a3292df49f.png`
- 海薇玛：`exec-bba9da1c-3f04-4e01-87d6-113a74974a53.png`
- 谢贝蕾妲：`exec-71643f1f-930c-4d54-bf44-616ee0b66368.png`

## 透明与轮廓检查

只读检查 Pillow/NumPy，不修改图片：
- 母版 alpha=0 像素比例约 67.5%；三张动作图分别约 50.7%、53.7%、48.1%。
- 三张动作图四条画布边上均没有 alpha > 100 的主体像素。
- 乌瑟主体范围 [43,34]–[1420,1071]，底部 10 像素 alpha 最大仅为 1，所见最底端微弱青色是极低透明光晕，主体完整。
- 海薇玛主体范围 [29,15]–[1420,1078]，完整尾巴距底部 7 像素。
- 谢贝蕾妲主体范围 [13,48]–[1444,1056]，完整右钳距右边 3 像素。
- 三图均是 4×3 的视觉排版，但某些大幅动作跨过数学等距格线。预览使用 `metadata.json` 中逐帧 source rect 隔离完整角色，原图片像素保持不变。勿改回简单等距切格，否则可能截断章鱼触手或海马尾巴。
- 实际查看确认：乌瑟有触手收拢与扇形推展；海薇玛有抬首蓄势与横向吐弹；谢贝蕾妲有举钳、下砸和重心压低。

## Exact prompt — pets master

```text
Use case: stylized-concept. Asset type: transparent PNG character model sheet for a polished hand-painted anime 2D side-scrolling game.
Input image: reference for the THREE aquatic Salon Solitaire companions from Genshin Impact. Use ONLY the pets from the reference, not Furina, typography, panels, starbursts or background. Primary request: one complete clean lineup, three separate full-body pets, one each, spaced very widely apart horizontally against a truly transparent background. LEFT Gentilhomme Usher, a round ball octopus water spirit with dark navy gentleman top hat, blue Hydro motif, small golden eyes and pale curled moustache-like mouth detail, multiple broad flowing translucent cyan tentacles. CENTER Surintendante Chevalmarin, a graceful small seahorse water spirit in pale pearl-cyan, curled tail, elongated seahorse muzzle, navy aristocratic bonnet with blue bow and round cyan ornament, subtle golden eye. RIGHT Mademoiselle Crabaletta, a wide armored crab water spirit with pale white-blue shell, navy panel edges, small eyes on stalks, proper paired claws and several segmented legs, a neat dark navy chest bow and frilled navy-and-white bonnet.
Adapt their recognizable official silhouettes into detailed crisp Japanese fantasy anime sprite art: elegant controlled cel painting, clean fine dark-blue contours, readable shape at small scale, coherent cool blue palette, bright cyan rim highlights, delicate translucent edges but opaque-enough bodies. All three face to screen right in 3/4 side view, poised neutral, full silhouette visible. Each is roughly same visual height, crab wider than others. No humans. No text. No watermarks. No floor. No shadows underneath. No bubbles outside bodies. No effects, rings, UI, contact sheets or borders. All limbs, hat tops, tails fit with ample transparent margin. One-row 3-character lineup, canvas landscape approx 1536x1024. Genuine transparent alpha, do not paint a checkerboard.
```

## Exact prompt — Gentilhomme Usher

```text
Use case: stylized-concept. Asset type: production sprite-sheet PNG for a polished hand-painted anime 2D side scrolling game. Reference image is a pet model lineup; select ONLY the specified pet. Match its body colors, clothes, hat and fine line style, but REMOVE ALL soft outer glow/aura from the reference. Genuinely transparent background, clean alpha edges, no backdrop, no checkerboard drawn. EXACTLY 12 separate complete poses arranged STRICTLY in 4 COLUMNS and 3 ROWS of EQUAL square cells. Canvas 1536 by 1152 if possible. Read row-major left-to-right then top-to-bottom. All 12 cells SAME scale and SAME body/root anchor. Each whole silhouette MUST fit inside its cell with at least 10% transparent padding on all four sides. No labels, numbers, grid lines, text, extra creatures, water surface, floor, shadows, outlines outside pet, particles, bubbles or projectiles. Only body/hat/limbs; page adds water attacks later. Three-quarter side view toward SCREEN RIGHT throughout, no camera changes. Real distinct drawings with intentional articulation/squash/recoil; NOT 12 identical images, not just rotations or translations. Body size stays consistent.
Subject: Gentilhomme Usher, LEFT pet in reference ONLY, round ball octopus water spirit with gentleman navy top hat, golden eyes, small white curled moustache-like mouth, broad translucent cyan tentacles. Keep hat reasonably compact to allow active tentacles to fit. Animation: row1 four idle-swim keyframes: 1 neutral tentacles gently curled; 2 upper tentacles extend and lower tentacles gather; 3 lower tentacles fan as upper curl; 4 return neutral. Row2 attack anticipation: 5 begins contracting tentacles toward body; 6 tentacles fold inward tighter, body squashes slightly; 7 fully compressed charge, front tentacles curled inward; 8 begins uncoiling forward. Row3 attack and recovery: 9 front tentacles snap open toward screen right, body stretches forward to push a bubble (DO NOT DRAW projectile); 10 follow-through arms/tentacles spread forward, hat lags slightly; 11 body recoils, tentacles loosely curl back; 12 neutral matching pose1. Attack snap MUST show a distinctly larger outward tentacle fan than anticipation. Each eight arm silhouette can overlap anatomically but not merge with neighboring cells. Keep the entire top hat and tentacle tips inside each cell.
```

## Exact prompt — Surintendante Chevalmarin

```text
Use case: stylized-concept. Asset type: production sprite-sheet PNG for a polished hand-painted anime 2D side scrolling game. Reference image is a pet model lineup; select ONLY the specified pet. Match its body colors, clothes, hat and fine line style, but REMOVE ALL soft outer glow/aura from the reference. Genuinely transparent background, clean alpha edges, no backdrop, no checkerboard drawn. EXACTLY 12 separate complete poses arranged STRICTLY in 4 COLUMNS and 3 ROWS of EQUAL square cells. Canvas 1536 by 1152 if possible. Read row-major left-to-right then top-to-bottom. All 12 cells SAME scale and SAME body/root anchor. Each whole silhouette MUST fit inside its cell with at least 10% transparent padding on all four sides. No labels, numbers, grid lines, text, extra creatures, water surface, floor, shadows, outlines outside pet, particles, bubbles or projectiles. Only body/hat/limbs; page adds water attacks later. Three-quarter side view toward SCREEN RIGHT throughout, no camera changes. Real distinct drawings with intentional articulation/squash/recoil; NOT 12 identical images, not just rotations or translations. Body size stays consistent.
Subject: Surintendante Chevalmarin, CENTER pet in reference ONLY: graceful pearl-cyan seahorse water spirit, golden eye, long horse-like curved head and small muzzle, navy aristocratic bonnet with white frill and blue bow, cyan/gold jewel, curled watery tail and delicate back fins. Ensure obvious seahorse, not human or dragon. Animation: row1 4 idle-swim keyframes: 1 upright gentle S-curve tail; 2 tail extends lower and back fins flex outward; 3 tail curls tighter and fins fold; 4 returns to neutral tail curve. Row2 charge: 5 head dips forward slightly; 6 draws neck back and tail coils tighter; 7 head rises nose skyward with throat gently expanded; 8 neck begins to sweep muzzle forward. Row3 shoot and recover: 9 muzzle thrusts toward screen right horizontally, tail sweeps back, body extends to spit a water bolt (DO NOT DRAW projectile); 10 neck recoils upward, muzzle opens just a little; 11 eases head back upright and tail curls; 12 neutral matching pose1. Bonnet and ribbon subtly lag behind body action. Strong difference between raised-neck anticipation and forward release. Full bonnet and curled tail entirely inside every cell.
```

## Exact prompt — Mademoiselle Crabaletta

```text
Use case: stylized-concept. Asset type: production sprite-sheet PNG for a polished hand-painted anime 2D side scrolling game. Reference image is a pet model lineup; select ONLY the specified pet. Match its body colors, clothes, hat and fine line style, but REMOVE ALL soft outer glow/aura from the reference. Genuinely transparent background, clean alpha edges, no backdrop, no checkerboard drawn. EXACTLY 12 separate complete poses arranged STRICTLY in 4 COLUMNS and 3 ROWS of EQUAL square cells. Canvas 1536 by 1152 if possible. Read row-major left-to-right then top-to-bottom. All 12 cells SAME scale and SAME body/root anchor. Each whole silhouette MUST fit inside its cell with at least 10% transparent padding on all four sides. No labels, numbers, grid lines, text, extra creatures, water surface, floor, shadows, outlines outside pet, particles, bubbles or projectiles. Only body/hat/limbs; page adds water attacks later. Three-quarter side view toward SCREEN RIGHT throughout, no camera changes. Real distinct drawings with intentional articulation/squash/recoil; NOT 12 identical images, not just rotations or translations. Body size stays consistent.
Subject: Mademoiselle Crabaletta, RIGHT pet in reference ONLY: wide armored white-blue crab water spirit with navy shell panels, two small eyes on stalks, two strong pincers and paired segmented legs, navy chest bow and white-frilled navy bonnet. Preserve this clearly recognizable elegant crab identity, not a lobster or insect. Body/root stays over same central x pivot, ground contact y is consistent for all walking poses. Animation: row1 4 lateral step/idle keyframes: 1 neutral claws low; 2 near legs bent and far legs stretch in crab side-step; 3 mirrored leg step with small body rise; 4 legs neutral. Row2 heavy attack windup: 5 body crouches low and claws begin lift; 6 paired claws rise above shell, knees bend; 7 maximum preparation claws up high (still fit cell), body low, eyes focused; 8 claws swing powerfully downward toward screen right. Row3 impact and recovery: 9 both claws contact ground/front, body squashed forward from heavy impact (no drawn ground, no water FX); 10 impact settles with pincers pressed down and legs wide; 11 claws rise slowly back to rest; 12 neutral matching pose1. Massive readable overhead-to-ground claw motion with 6 and7 showing claws above shell and9 below front. Keep bonnet attached and intact. Entire limbs and raised claws fit each cell.
```
