# 迪卢克 v6：狼的末路与真实握持

本轮用内置 `image_gen` 编辑 v4 的实际活动图集，以已认可的[新版立绘](../public/assets/characters/diluc-v6.png)和真实狼的末路图像为形制参考。调整长刃体量、黑红刃面、银灰切边和双手握柄；身体姿态、腿部过渡、J/K 刀路、L 前冲、I 掀剑放鸟保持原设计。未改伤害、动作阶段、时序、渲染代码或雷电将军资源。

| 图集 | 活动帧 | 生成提示词 |
| --- | ---: | --- |
| [locomotion.png](../public/assets/animations/diluc-v6/locomotion.png) | 12 | [移动](diluc-v6-locomotion-prompt.txt) |
| [aerial.png](../public/assets/animations/diluc-v6/aerial.png) | 12 | [空中](diluc-v6-aerial-prompt.txt) |
| [jab-v5.png](../public/assets/animations/diluc-v6/jab-v5.png) | 8 | [J](diluc-v6-jab-v5-prompt.txt) |
| [basic.png](../public/assets/animations/diluc-v6/basic.png) | 8 | [K](diluc-v6-basic-prompt.txt) |
| [jab-variant-v5.png](../public/assets/animations/diluc-v6/jab-variant-v5.png) | 8 | [J 变化](diluc-v6-jab-variant-v5-prompt.txt) |
| [smash-variant-v5.png](../public/assets/animations/diluc-v6/smash-variant-v5.png) | 8 | [K 变化](diluc-v6-smash-variant-v5-prompt.txt) |
| [special-v5.png](../public/assets/animations/diluc-v6/special-v5.png) | 12 | [L 初稿](diluc-v6-special-v5-prompt.txt)、[全姿态留白修正](diluc-v6-special-repair-prompt.txt) |
| [secondary-v5.png](../public/assets/animations/diluc-v6/secondary-v5.png) | 12 | [I](diluc-v6-secondary-v5-prompt.txt) |

总计 8 张图集、80 个活动帧。`basic.png` 保留旧版的 16 格布局，活动 K 使用后 8 格；其前 8 格未被运行时使用。L 初稿存在长剑跨格，因此仅该图追加一次图像模型重排留白，最终各姿态相互分离。原始 v4 文件完整保留。

[登记脚本](../scripts/register-diluc-v6.py)只读 PNG 并写 JSON：先读取新图 alpha 主体边界，再用新旧身体纹理对应测量脚/骨盆参考位置和每个 clip 的固定身体高度，最后从新剑刃轮廓单独记录剑尖。没有逐帧缩放补偿，也没有程序重绘、切图导出或改写生成图片。

[逐帧测量记录](diluc-v6-registration-measurements.json)包含新的裁框、脚基点、剑尖、身体对应内点数和残差。80 帧各有至少 10 个身体对应内点，中位残差最大 1.788 像素；裁框按 alpha 大于 32 的半透明轮廓测量，最小透明余量 2 像素（渲染仅内缩 1 像素），且包含虚拟脚基点所需的透明区域。跳跃/蹲姿的虚拟脚基点保留原有身体相对含义，不强行挪到当帧最高或最低的靴底。

验证命令（活动映射切到 v6 后）：

```text
python scripts/verify-eula-art.py diluc
node scripts/art-regression.mjs
node scripts/clip-animation-regression.mjs
```

[美术验证记录](diluc-v6-art-validation.json)包含真实尺寸、透明比例、图集 SHA-256 和注册结果；另由优菈资源作者独立复核全部 8 图、80 帧的握持、时序、裁框和子 JSON 一致性。

原作参考来源记录：`output/imagegen/portrait-weapons-review-v1/references/sources.json`。模型输出保留轻微发梢/衣缘抗锯齿颗粒；本轮重点是武器比例、握持与完整刀路，而不是重新设计角色服饰或动作。
