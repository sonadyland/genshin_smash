# 优菈 v4 动画样板

## 设计依据

- 官方角色演示「优菈：闪灼的烛光」：https://www.youtube.com/watch?v=Go7SeJ-yOL4
- 官方拾枝杂谈「优菈」：https://www.youtube.com/watch?v=deByypNHedI
- 依据优菈的舞蹈气质、大剑重量感与冰元素识别设计横板动作，不是原作逐帧复刻，也不改变本项目现有技能机制。
- 保留浅蓝短发、黑白蓝骑士装、蓝白大剑和成年角色比例。所有姿势朝右；运行时统一镜像朝左。
- J：踏步转髋短横斩；K：支撑脚蓄力、回身重扫；L：本项目「冰潮旋舞」双侧环扫；I：压低重心低横扫、释放扇形冰晶。L 不替换成原版元素爆发的延时光降之剑机制。

## 资源与生产记录

素材位于 `public/assets/animations/eula-v4/`，运行入口为 `manifest.json`。八张透明图集包含 64 张独立生成姿势：idle 4、run 8、jump 8、dodge 4、jab 8、smash 8、special 12、secondary 12。

生成方式为内置 `image_gen`，未使用外部 API/CLI。大厅立绘 `public/assets/characters/eula-v2.png` 仅作角色身份参考，没有修改。先生成 idle 图集作为其他图集的共同视觉参考，再按动作独立生成。原始输出仍保留在 Codex 的 `generated_images` 目录；交付 PNG 已复制进项目，不依赖用户目录。

- 移动动作的完整提示词、修图提示词与原始生成路径：`docs/eula-v4-locomotion-prompts.json`。
- 战斗动作的完整提示词与原始生成路径：`docs/eula-animation-prompts-combat.json`；逐帧像素注册证据：`docs/eula-combat-asset-validation.json`。
- run / jump 首版的剑尖或鞋尖触及格线，使用内置图像模型定向缩小与补足边缘。没有用代码变形人物或伪造中间帧。
- jump 第 7 张落地姿势的长剑略跨理论等宽列界，但与相邻人物完全分离，因此使用独立整数 sourceRect 保留完整剑尖；不假定所有帧必须使用等宽网格。

## 注册规则

每个图集使用单一 `standingBodyHeightPixels`，以同一角色的站立人体比例（头部/躯干/四肢比例）为基准；不将剑、披风计入人体高度，不逐帧拉伸屈膝姿势。每帧 `footAnchor` 是相对于 sourceRect 的归一化物理注册点。地面动作注册到支撑/地面基准，空中帧使用虚拟脚底基准，保留屈膝与腾空姿态。

每张攻击图按 windup/contact/followthrough/recover 分组。J/K 各阶段 2/2/2/2 帧；L/I 根据实际姿态为 4/2/3/3 帧，第 5 张才开始接触阶段。duration 是阶段内相对权重，由播放器适配现有攻击 startup/active/endlag 与攻速升级，不能为了多帧延长判定时间。基准总时长分别为 J 26、K 63、L 56、I 44 tick。武器尖端使用 sourceRect 内像素坐标，供程序刀光随剑刃移动。

## 验证

`python scripts/verify-eula-art.py` 只读检查实际 RGBA、透明比例、整数裁切框、脚锚范围、独立帧指纹、主体不贴裁切边、攻击阶段数量，以及武器尖端范围。该脚本不会保存或修改图像。

部分原生 PNG 预览可见蓝色散点。对 idle 右上格最外侧孤立蓝点的读数为 alpha 0–1（613 个 alpha=1 像素），run 取样边缘 alpha 2–3；极低 alpha 的 RGB 不作为人物边界或脚锚。注册与边界校验采用 alpha ≥128 的主体像素，最终颜色和尺度以游戏实际 alpha 合成结果复核。

最终浏览器验收与独立架构审核已完成。新旧八类动作预览已核验正常速度、0.5 倍速、0.25 倍速、暂停和单步，以及 112px / 224px 显示；切换镜像和斜坡时保留暂停 tick。幸存者模式实机约 60 FPS，已体验移动上坡、空中 L、I 冰晶和受伤后继续操作，非致命受伤不打断动作的规则同时由回归测试保证。双人模式 J/K/L/I、跳跃和闪避显示正常，暂停恢复正常。Headless 浏览器检查为 0 错误，回归、构建与独立架构审核通过。

当前坡面处理是整体姿态与位置补偿，不是双脚独立 IK；任意方向移动出招时仍可能出现滑步。刀光采用接触阶段贴合剑尖的短贝塞尔弧，随后保留尾部淡出。这些是本轮样板的实际实现范围。
