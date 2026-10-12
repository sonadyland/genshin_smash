# 优菈 v6：松籁武器与握持统一

以已确认的新立绘 `output/imagegen/portrait-weapons-review-v1/eula.png` 为武器比例参考，对 v4 当前实际使用的十张图集进行定向重绘。新图位于 `public/assets/animations/eula-v6/`；共 80 帧，保留旧版帧序、名称、duration、phase、trail 和所有玩法判定。

武器统一为松籁响起之时的金色双翼护手、蓝白长剑刃与深蓝双手握柄。只改武器及必要的手指接触；保留既有腿部循环、站姿、转身与施法。L 仍是十二帧旋转横斩，I 仍是空手抬起与推出的冰元素施法，J/K 的下斩和头顶下劈变体保留。没有为雷电将军生成或替换资源。

全部图像通过内置 image_gen 生成，未使用外部 API/CLI，也未用程序修改或拼接人物像素。五张图的二次生成只处理长剑扩展后图格留白，防止剑尖跨入邻帧。完整提示词、参考图和工具原始输出路径见 `eula-v6-imagegen-prompts.json`；正式 PNG 均已复制到项目中，不依赖用户目录中的生成原件。

`scripts/register-eula-v6.py` 只读取 RGBA 图像、写注册 JSON：以新图 alpha≥128 的主体连通区域定位姿态，随后扩展裁框，为 alpha>32 的抗锯齿轮廓保留至少 3px 透明余量。身体特征对应估计旧姿态到新姿态的缩放和平移，继承原有脚/骨盆物理基点。空中帧保留虚拟地面基点，不移到长剑尖或蜷缩的膝盖。每组 clip 使用一份人体高度，不用每帧 alpha 外框缩放角色；刀尖另按新图实测。

`eula-v6-registration-measurements.json` 保存 80 帧的对应点数量、拟合残差、新脚点及刀尖；`eula-v6-art-validation.json` 保存真实透明比例、裁切余量、图像 SHA256 和逐图尺寸验证。旧 v4 图集保留，运行入口由 `src/game/animation-packs.json` 选择。
