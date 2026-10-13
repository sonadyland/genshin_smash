# Tharja 待机动画 — 生成与登记记录

本轮仅用于独立美术预览，不注册正式可玩角色。使用内置 `image_gen__imagegen`，请求 `transparent_background: true`。PNG 是生成原图的逐字节副本，没有脚本绘图、抠图、拉伸或背景擦除。

## 最终资源

| 资源 | 内置生成原图 | 实际尺寸 | 标定站姿高度 |
| --- | --- | --- | --- |
| `assets/idle-a.png` | `C:/Users/46637/.codex/generated_images/01a1345a-0409-7392-acbc-b0863b44fa11/exec-60cbcf32-4842-4c9b-b888-ead584b1aa18.png` | 1254 × 1254 RGBA | 535 px |
| `assets/idle-b.png` | `C:/Users/46637/.codex/generated_images/01a1345a-0409-7392-acbc-b0863b44fa11/exec-161bd983-abcd-4050-9114-673772d9c414.png` | 1254 × 1254 RGBA | 538 px |

唯一造型母版：`D:/Program/ai/genshin-smash/output/imagegen/tharja-awakening-portrait-v1.png`。第二张图同时参考第一张定稿，以保持脸、书、衣装和中立站姿一致。

## 方法与验收

参照芙宁娜修订版的每张 2 × 2 四帧方式，将 8 个待机姿态分为两张图。固定成年人小头长腿比例、朝右三分之二侧面、左手托打开魔导书、右手停留在近侧书页。首张初稿沿用立绘交叉腿且下排脚边距不足，已通过一次图像模型定向编辑修为双腿自然分开并增加透明留白；初稿不进入预览。

`idle.json` 使用实测四等分源矩形与手工脚底支撑中心。每张图只用一个站姿高度倍率；不逐帧按外轮廓归一化，不对头部或腿部作程序变形。不同姿态保留其原有细微高低变化。站姿高度是审片用像素标定，并非精密人体测量。

8 帧时序共 2240 ms：静候 500 → 吸气 400 → 眨眼进入 70 → 眨眼顶点 60 → 睁眼过渡 80 → 呼气 380 → 衣摆回落 350 → 归稳 400。眨眼段较短，长发、披风和书页有不同于身体的轻微变化。无待机外放魔法效果。

Pillow 只用于读取 alpha 与坐标测量；`idle-validation.json` 记录透明像素、各格 alpha > 32 / 128 的边界、留白、源文件哈希与图集不重叠检查。实际动画连贯性仍需浏览器播放确认。

## A 初始提示词

```text
Use case: stylized-concept.
Asset type: production transparent animation sprite sheet for a polished hand-painted 2D side-scrolling fantasy action game. This is a neutral adult character model-sheet exercise.
Input image 1 is the APPROVED Tharja from Fire Emblem Awakening master portrait and sole authority for identity, body proportions, outfit, book and rendering. Preserve the same adult black-haired woman: straight blunt bangs, long straight black hair, small refined face, dark eyes, gold angular headband and collar, complete dark bodysuit and long dark sleeves and leggings with quiet mesh texture, gold geometric trim, shoulder-draped black cape with muted burgundy lining, light gold-strapped dark heeled shoes, old dark gold-edged spell book. Keep opaque dark clothing coverage and neutral practical posture. Do not add long front skirt panels, armor, hats or weapons. Faithful fine anime linework and restrained cel-painted shading.
Create exactly FOUR distinct consecutive full-body frames of the FIRST HALF of a quiet breathing idle cycle, in exactly TWO COLUMNS by TWO ROWS, read left to right then top to bottom. Square large transparent sheet, suggested 1536 square. NO text, grid, labels, scene or shadows.
Fixed viewpoint: always facing SCREEN RIGHT at a side-on three-quarter angle, gaze toward an enemy to the right, eye line calm and serious. Relaxed combat readiness, no fashion posing. Adult body approximately 7.5 anatomical head units tall, small head, long slim legs, same head pixel size and skeleton all four frames. Do NOT enlarge the head, shorten the legs, or inflate the torso. Complete character occupies about 76% cell height with generous clear transparent padding on every side; full crown, cape, shoes and book fit within each own cell. Character roots consistently at cell horizontal middle. Fixed virtual camera distance.
SHARED NEUTRAL STANCE: left leg slightly forward toward screen right, right leg half a shoe-length behind, both soles grounded on same baseline, legs separated naturally not crossed. Left forearm cradles the bottom/spine of ONE open spell book at lower chest / upper waist, open pages angled upward. A modest book: open spread about the width of shoulders, not oversized. Left fingers are visibly under the book edge; right elbow relaxed beside ribs, right wrist bent gently over the near book pages, two right fingers poised near text. Book remains in the same left hand throughout. Spine/pelvis location stays stable. Cape hangs behind and to screen-left with lower edges around calves, no gust.
Frames:
1 top-left: neutral exhale start; open eyes looking right, right fingertips just above near page, shoulders low, knees relaxed, balanced stable feet.
2 top-right: gentle inhale begins, upper chest and shoulders rise a tiny amount, chin rises fractionally, right wrist unfolds just slightly, near page corner lifts. Hip and feet unchanged; this is a subtle anatomical drawing change, not a translated cutout.
3 bottom-left: breath near crest, eyelids lower halfway in a brief natural blink, fingers extend a little over the raised page edge; hair tips and cape edge begin a subtle delayed outward motion. Head size fixed.
4 bottom-right: full gentle inhale crest, eyes softly closed for one blink frame, right hand lifts only a finger-width above pages, book angle barely follows breathing; chest gently lifted but waist and feet unchanged, cloth trails the preceding motion.
CRITICAL: coherent chronological in-betweens not four different poses. Preserve precise SAME proportions, costume details, book size, hand ownership, stance and face across all four. Motion is quiet breathing, blink, fingers/page and secondary cape/hair motion. No whole-sprite bob/zoom, no stepping or floating. No spell energy or projectile in idle. Exactly two arms, two hands, two legs; anatomically clear fingers and grounded heels/toes. Genuine transparent alpha background in all empty space, no painted checkerboard, no matte, no halo, no gradients, no ground. All four complete sprites stay safely inside their own cells, at least 6% clear padding from every border.
```

初稿来源：`exec-9203e010-94e3-48aa-a33f-fcc09709d273.png`；因交叉腿和脚底边距未采用。

## A 定向修正提示词

```text
Use case: precise-object-edit.
Image 1 is the edit target: a transparent four-frame 2x2 idle animation of an adult Tharja, black hair and complete black/gold long-sleeved clothing, shoulder cape, gold shoes, and a spell book. Keep her exact face, adult small-head body proportion, outfit, same book size, clean anime rendering, screen-right three-quarter view, all upper body/hand positions and gentle inhale/blink progression.
Correct ONLY the lower-body stance and empty margins:
1. Uncross the legs in EVERY frame. This must be a stable grounded combat idle, not a crossed-leg portrait. BOTH KNEES AND CALVES MUST REMAIN SEPARATE, with visible empty space between them from knees downward. Place rear foot LEFT and front foot RIGHT, with a gap about one shoe-width between their centers. Rear right hip connects through a nearly straight rear leg down to the LEFT shoe; front left leg drops to the RIGHT shoe with a mild knee bend. Neither shin crosses in front of the other. Both shoes point generally RIGHT, heels and forefeet grounded on a horizontal imaginary floor. Feet remain on the same positions in all four frames. No crossed thighs/knees/calves/ankles, no step, no floating.
2. Reduce ALL FOUR complete figures uniformly to 82% of their existing size in their equal 2x2 cells. Keep the exact same head/body ratio and book/hand ratio, don't shrink legs separately. Place each complete figure with at least 7% cell-height clear transparent margin above crown AND below soles and generous side space. The current bottom shoes are too close to sheet edge: fix this. Every sprite fully isolated within own equal square cell. No overlap or clipped shoes, hair or cape. Do not enlarge any frame to fill whitespace.
Everything else unchanged: left hand cradles open spell book, right fingers hover above page, frames1-2 open eyes, frame3 half blink, frame4 blink crest, subtle breathing and cape/hair motion. No extra characters, effects, shadows, text, grids or background. Keep genuine transparent alpha.
```

## B 后半循环提示词

```text
Use case: stylized-concept.
Asset type: the SECOND HALF of an eight-frame transparent breathing-idle sprite animation for a polished 2D side-scrolling anime fantasy game.
Image 1 is APPROVED IDLE SHEET A. Match its exact adult character identity, small head / long slim body proportion, physical character size in each cell, facing angle, feet, cape length, face, book scale and open-book orientation, left/right hand roles, lighting, rendering, and 2x2 sheet layout. Image 2 is the approved master portrait for costume details ONLY; do not copy its crossed-leg pose.
Adult Tharja from Fire Emblem Awakening: same straight black hair, blunt bangs, small calm serious face, gold headband and collar, complete dark bodysuit with long sleeves and dark leggings, gold geometric trims, shoulder cloak black outside / muted burgundy inside, light gold-strapped dark shoes. Neutral fully clothed practical combat model sheet.
Produce EXACTLY FOUR genuinely drawn consecutive NEW frames, numbered conceptually 5,6,7,8 (do NOT draw numbers). TWO COLUMNS x TWO ROWS, square transparent canvas. They FOLLOW image 1 frame4 in the bottom-right and smoothly return to image1 frame1 at the end.
COMMON STANCE IN ALL FOUR: right-facing 3/4 side view with the face and chest partially visible; legs uncrossed naturally apart, rear foot on left and front foot on right, both feet planted, same heel/toe coordinates relative to each cell. Spine/pelvis barely shifts. LEFT forearm cradles the exact same ONE open book at lower chest / upper waist; cover remains facing viewer with page fan pointing upper-right. LEFT fingers under front bottom book edge. RIGHT hand calmly above near page; right wrist stays by book, never outstretched casting. Book spread about shoulder width, no giant tome.
SEQUENCE, row-major:
5 upper-left: exhale starts immediately after image1 frame4 inhale crest; half-open eyes, chin still slightly down, right fingers begin lowering toward pages, shoulders gently relax. Hair tips and cloak reach their small delayed sway outward.
6 upper-right: eyes reopened toward right, shoulders lower slightly, right fingertips lightly touch near page as one page corner settles. Cape and long hair begin falling inward; hands stay connected anatomically, book hardly moves.
7 lower-left: almost at relaxed neutral, eyes open rightward, right wrist restores neutral curve above near page, chin level, left supporting elbow relaxed; hair and cloak continue gently settling behind.
8 lower-right: matches image1 TOP-LEFT neutral pose as closely as possible for seamless loop. Calm open eyes looking right, right fingers just above near page, same book angle, same left hand placement, low relaxed shoulders, planted separated feet, cloak quiet. It should transition directly back to image1 frame1 without a jump.
CRITICAL: keep all four actual head/skull sizes and body segment lengths identical to sheet A. Fixed camera, no zoom, no whole-character bob, no stretch, no stance changes. Reference A neutral natural crown-to-sole height about535px on1254x1254 sheet; keep every silhouette the SAME scale and same cell occupancy. Use about535px standing height within627-square cells if matching this resolution. Keep more than30px completely clear alpha below soles and above crown. Every full sprite including cape, hands, book and shoes is fully within its cell with no overlap; character centers match A.
Subtle breathing is drawn in upper chest/shoulder/elbow, not resizing the portrait. Secondary movement in page corner, cape and hair, no spell or glow effects. Same mature slender about7.5-head anatomy, no big head/chibi. Exactly two arms/hands/legs. No cross-legged stance. Genuine transparent alpha, no background or painted transparency pattern, no floor, cast shadow, labels, text, grid, borders, particles or magic.
```
