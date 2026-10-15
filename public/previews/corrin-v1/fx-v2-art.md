# 女神威 · 剑术特效 v2

2026-10-14。全部使用内置 `image_gen`，`transparent_background: true`。无 API fallback。四张 PNG 从工具输出逐字节复制；没有裁图、调色、透明化或重绘原图。`fx-v2-registration.json` 仅记录源矩形、真实几何锚点与 SHA-256。

新版不把一个静态弧光挂在所有动作的剑尖上。斜斩、横扫、下劈、直刺各使用独立绘制的纹理。斜斩与下劈纹理的刃根、前缘剑尖、拖尾剑尖三个点，投影到人物当前刃根／当前剑尖／上一攻击帧剑尖；直刺采用当前尖端、刃根与刃线法向。只变换特效纹理，人物始终使用同一横纵比例。

横扫单独处理共线的剑刃：将上一尖端投影到当前刃轴，薄扫面从该后缘延伸至当前尖端，厚度仅为刃长的 6%，并置于人物后方。它不会因三点近乎共线而塌缩、翻面或把弧光剪切到当前剑尖前面。下劈和斜斩的消散帧保留完整轨迹半径作为几何参照；发亮的线段缩短时，不把剩余短光放大至整个剑长。

I 龙牙穿刺沿当前帧 `castOrigin → fangTip` 轴，在真实尖端连接短蓝光；只延伸 14–22 世界像素。复用已批准的龙牙独立原画，不在收臂时留下新的尖光。

锚点从原图观察登记，附于每帧的 `origin`、`bladeTip`、`trailTip`。实际攻击的激活帧和几何坐标以新角色原画为准。准备阶段不显示大面积剑光，回收阶段不再挂随剑尖移动的弧光。全局朝向镜像同时作用于人物和纹理，不单独二次翻转。

## 源文件

默认输出目录：`C:/Users/46637/.codex/generated_images/01a13ae0-252f-77f2-9ad4-9f489ab02655/`。

| 项目文件 | 原始输出文件 | 尺寸 | 帧数 |
| --- | --- | --- | --- |
| `assets/fx-v2-yato-diagonal.png` | `exec-50f7090a-1c5b-4603-8587-2383818a8318.png` | 1536 × 1024 | 4 |
| `assets/fx-v2-yato-sweep.png` | `exec-fc2ea826-52be-4ef7-a1e8-1892b0c5eccf.png` | 1536 × 1024 | 4 |
| `assets/fx-v2-yato-downstroke.png` | `exec-deb390da-3ed5-4a86-bd7a-3295f35bc3aa.png` | 1536 × 1024 | 4 |
| `assets/fx-v2-yato-thrust.png` | `exec-d04c93b7-3ba6-4d27-a22f-b54a45819254.png` | 1536 × 1024 | 4 |

## 完整提示词

### 斜下斩迹

Use case: stylized-concept. Asset type: transparent 2D action game sword motion-trail sprite sheet, ONLY separate weapon VFX, absolutely no character or sword. Create a clean 2 by 2 sheet with four successive cels of a restrained ivory-gold diagonal slash AFTERIMAGE. Each cell has generous 12% completely transparent margin, no dividers, no text or coordinate marks. Thin finely painted pale gold/white energy with warm faint golden rim, no blue, no fire, no smoke clouds, no huge explosion, no solid filled background. Geometry is deliberately in canonical local sword coordinates for later mapping to actual blade: the imaginary hand pivot is at lower-left quadrant of each cell; the CURRENT blade extends horizontally from this invisible pivot toward the RIGHT at lower-right, so the bright current leading edge is a thin nearly horizontal straight line at the LOWER edge. A curved tapered crescent TRAILING behind this edge sweeps upward to upper-right, like a narrow curved triangular blade fan open toward the lower-left pivot, showing clockwise travel from upper-right down to lower-right. Do not draw any actual weapon. The visible arc must connect the previous tip in upper-right to current tip in lower-right; most area inside fan remains transparent. All four cels share that exact same directional geometry and radius. Top-left: small fine onset with faint tail. Top-right: clear thin curved full trailing crescent and sharp straight lower leading edge. Bottom-left: bright leading edge shortened, trail breaks into 3 delicate threads. Bottom-right: fading wisps along same arc, very few tiny sparks, not an impact star. Each effect fully contained in its cell, isolated on genuine transparent alpha. Crisp controlled anime fantasy game paint, no typography, no checkerboard.

### 横扫薄弧

Use case: stylized-concept. Asset type: genuine transparent 2D game VFX sprite sheet, 2 by 2 four frames. Create ONLY an ivory white and muted gold, thin PERSPECTIVE HORIZONTAL sword sweep ribbon. No character, no sword, no scenery, no lettering, no panel lines. Each cell has 14% empty transparent safety margin. An imaginary hand pivot near the LEFT at the vertical middle; an imaginary current blade extends horizontally RIGHT. Draw the current leading blade light as a fine nearly straight horizontal lower rim from left to right, and the TRAILING slash as a shallow curved elliptical ribbon only slightly ABOVE it. The arc should be very WIDE and FLAT, like a horizontal backhand sweep seen side-on, NOT a vertical crescent, NOT a circle, NOT lightning or fire. Its previous sword tip is above-left of its current sharp right-hand tip; the ribbon tapers toward both ends, predominantly transparent. Keep that common local axis and center across all four frames. Top-left faint narrow start arc; top-right brightest clean broad shallow sweep with two thin filaments; bottom-left ribbon begins fragmenting into delicate threads along same curve; bottom-right thin rapidly fading remnants and very few specks. Refined anime fantasy action game paint, restrained luminous whites and gold with only slight transparent bloom, no blue, no explosion, no smoky cloud. Use real alpha transparency, not a black or checkerboard background. All four effects separately fully contained and readable.

### 下劈残迹

Use case: stylized-concept. Asset type: transparent sprite sheet ONLY sword afterimage VFX for a forceful overhead DOWNWARD sword chop in a 2D anime game. Four chronological frames in a 2 by 2 sheet, no lines, no labels, each cell generous 14% transparent margins. No character, no actual sword, no background, no ring explosion. Pale ivory-white blade light and restrained muted gold threads, very slight alpha bloom. Fixed canonical shape for runtime mapping: invisible sword pivot lower-left, sharp CURRENT BLADE line extends from lower-left to lower-right. A narrow thick-at-tip curved slash TRAIL rises backward from current lower-right tip toward previous upper-right tip, a tall quarter-circle-ish crescent following clockwise/downward motion. This is heavier than a light attack but remains slender, open and mostly transparent, NOT an opaque golden fan. The lower current blade edge is straight and sharp; the curved fading tail sits ABOVE the edge and outside near the tips, no light extending behind hand pivot. Top-left frame: taut fine blade-edge glint beginning the downward cut with short tail. Top-right: decisive long narrow crescent, bright thin lower edge, thin overlapping striation. Bottom-left: shorter current edge with falling threadlike trail, 2 small falling sparks. Bottom-right: fading interrupted tail, no fresh burst. Identical geometry axis/radius across four cells so it can be aligned to a real weapon sweep. Genuine transparent alpha, not black backdrop or checkerboard. Beautiful precise painted game VFX, no blue or red, no smoke.

### 直刺光迹

Use case: stylized-concept. Asset type: transparent game VFX sheet for a SHORT STRAIGHT SWORD THRUST, 2 by 2 four animation cels. Only an elegant ivory-white pale-gold streak, no character, no real sword, no text, no panel lines. Each isolated effect fully contained in its cell with at least 15% transparent margin. All four share a perfectly HORIZONTAL left-to-right axis through the center. The sharp leading spear-like tip of LIGHT is at the RIGHT, and slender parallel fading threads trail straight LEFT behind it. No circular arc, no curved crescent, no explosion, no big impact star, no ring, no fire, no blue magic. Top-left: a tiny bright pointed narrow onset streak. Top-right: a longer needle-like thin thrust streak, white center and muted golden margin, fine parallel trailing lines to left. Bottom-left: leading point softer, 2-3 fine straight threads lag behind to left. Bottom-right: quickly fading short horizontal threads, a few fine specks following the same horizontal direction. Design should reinforce a physical sword point for 40-100ms, not overwhelm body art. Polished anime fantasy game paint, only subtle transparent bloom; preserve the straight axis and small height. Genuine transparent alpha, no black backdrop or checkerboard.

## 渲染契约资料

- [MDN Canvas transform](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform)：仿射矩阵字段和坐标变换顺序。
- [MDN Canvas drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)：源矩形与目标矩形绘制。

## 实际激活区间与复核

以下帧号从 1 开始：J ①／②／③仅第 4–5 帧，K 第 5–7 帧，I 第 6–7 帧。对应 `human-v2-weapon-effects.json` 使用从 0 开始的索引。蓄力、回撤及收势均无新释放的光。

已在 Chrome 以 0.25 倍速、逐帧冻结、同尺度母版和左右朝向检查 J ①／②／③、K、I。调试图同时显示当前刃轴、上一刃轴和真实纹理映射点；普通图检查透明纹理的可见扫面，避免仅凭坐标误差为零判断。截图位于 `output/playwright/corrin-v2-weapon-*-debug.png`、`*-clean.png`、`*-left.png`。变形资源到齐后，普通默认 32 组 / 228 帧完整目录与窄屏回归通过。
