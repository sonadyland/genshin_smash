# 第二技能美术资源

五名角色的第二技能使用独立动作图集，不扩充或覆盖原有 4×4 动作图集。所有图像均由内置 `image_gen` 生成，保留模型输出的原始 RGBA 像素；布局修正同样通过图像模型完成，没有裁剪、缩放、去底或其他像素后处理。生成日期：2026-10-08。

| 技能 | PNG（相对于本目录） | 实际尺寸 | 布局 | 站立身体高度标尺 |
| --- | --- | --- | --- | --- |
| 雷电将军 · 雷罚·天光 | `animations/raiden-secondary-v1.png` | 1254×1254 | 2×2，4 帧 | 260 px |
| 琴 · 风起·升流 | `animations/jean-secondary-v1.png` | 1254×1254 | 2×2，4 帧 | 387 px |
| 优菈 · 霜华·断浪 | `animations/eula-secondary-v1.png` | 1254×1254 | 2×2，4 帧 | 334 px |
| 迪卢克 · 赤羽·燎空 | `animations/diluc-secondary-v1.png` | 1254×1254 | 2×2，4 帧 | 380 px |
| 魈 · 风轮两立 | `animations/xiao-secondary-v1.png` | 1254×1254 | 2×2，4 帧 | 284 px |
| 五种技能效果和通用命中效果 | `effects/secondary-effects-v1.png` | 1536×1024 | 3×2，6 格 | 不适用 |

每张 PNG 都有同名 JSON。运行时先验证解码后的真实尺寸与 JSON 一致，再验证帧数、格序、取样区域和脚底锚点；验证失败时使用战斗系统的几何备用绘制，不把旧技能动作当作新动作。

## 人物动作

四帧按行排列：左上 `windup`（蓄势）、右上 `contact`（释放）、左下 `followthrough`（动作延伸）、右下 `recover`（收招）。每格为 627×627。所有原始人物朝右，只在最终绘制时镜像一次；JSON 的 `sourceRect` 指定原图区域，`footAnchor` 是该区域内归一化的支撑脚中心。四帧共用 `standingBodyHeightPixels`，下蹲不会被误放大为站姿。受击闪白复用完全相同的源区域。动作只读取模拟时钟，暂停和顿帧期间不会自行切换。

魈的新技能是水平持枪突进：锐利的玉色枪尖朝右，左端为钝帽；朝左释放时整体镜像。原有空中下落技能仍使用 `xiao-actions-v3` 与 `xiao-plunge-v3`，枪尖向下的规则不变。

## 技能效果

每格为 512×512，按行排列：

1. `raiden`：紫色雷柱与底部电环。
2. `jean`：向上盘旋的青绿色风场。
3. `eula`：向右发射的扇形冰晶，用作释放瞬间的整束效果；实际独立弹丸保持各自清晰的晶体轮廓。
4. `diluc`：向右飞行、尾焰向左的赤焰火鸟。
5. `xiao`：向右的水平青绿色风枪轨迹。
6. `impact`：通用青白色放射命中效果。

`drawSecondaryEffect` 使用中心锚点，支持朝向、旋转和透明度。`impact: true` 选择第六格。没有有效资源时返回 `false`，由战斗代码绘制备用效果。

这些文件具有真实 alpha 通道。透明像素可能保留彩色 RGB 值，查看器忽略 alpha 时会显示背景色；游戏必须保留 RGBA 的正常透明合成。`scripts/art-regression.mjs` 直接解码全部六张 PNG，核验真实尺寸、透明背景、所有 26 个独立格内的有效像素，以及格边缘无可见越界像素。

## 完整提示词记录

- [雷电将军、琴、魈的初始及布局修正提示词](../../output/imagegen/secondary-art-a-prompts.json)
- [优菈、迪卢克、六格特效的初始及布局修正提示词](../../output/imagegen/secondary-art-b-prompts.json)

上述提示词记录保存在项目根目录 `output/imagegen/`。这是生成过程文档，不参与游戏运行时加载。
