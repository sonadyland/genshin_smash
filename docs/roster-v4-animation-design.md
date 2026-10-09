# 五角色动作升级

本轮以实际技能的攻击方向、位移和效果为动作依据；手动输入、伤害、范围、攻速升级、冷却和幸存者受伤不中断操作的规则保持不变。

后续雷电将军按旧版关键姿势重构为 [v5 动作包](raiden-v5-animation-design.md)。其余四人继续使用 v4 包目录，并在[四角色动作剧本 v5](roster-action-choreography-v5.md)中重绘部分动作、以带 `-v5` 后缀的图集接入。在用包由 `src/game/animation-packs.json` 指定，具体图集由各包 manifest 指定。本页的动作描述与末尾验证结果保留为 v4 阶段记录，当前动作与验收以 v5 文档为准。

## 动作与技能对应

|角色|J 轻击与变化形态|K 重击与变化形态|L 主技能|I 战技|
|---|---|---|---|---|
|优菈|短挥斩／斜下斩|旋身重挥／过顶重劈|原有旋转横斩，两侧冰环；固定原 special|原低位挥剑向前送出扇形冰晶；固定原 secondary|
|雷电将军（v5）|短横斩／变化斩击|过顶重斩／变化重斩|胸前竖刀蓄势，前向拔刀横斩并放出雷光波|单臂举刀引雷，召前方竖直雷柱|
|琴|短横斩／踏步直刺|踏步重刺／重挥压制|收剑聚风、前推剑锋，对前方强推风压|低位上挑剑锋，召升流风场|
|迪卢克|大剑横挥／斜砍|重斜劈／过顶劈砍|持剑前压烈焰突进，保留实际 dash 行为|低位上挑火剑，放出向前火鸟|
|魈|水平枪刺／短横扫|枪舞横扫／斜上挑|空中蓄势、枪尖向下直坠、落地两侧风浪、收枪|水平持枪突进，枪尖朝前，地面和空中均可使用|

优菈旧的 L/I 下劈变体 PNG 和 JSON 保留作历史素材，但不再登记、加载或播放。J/K 在成功出招时交替，各技能保持符合其机制的单一形态。每名角色使用 64 张基础动作及 16 张 J/K 变化动作；旧帧资源保留作完整回退与预览对照。

雷电沿用项目现有的 `weapon: sword`，动作取自刀剑战斗风格。此项目没有复刻原作长柄常态与爆发刀态切换。迪卢克 L 的名称沿用旧项目，但动作依据现有突进机制；原作火鸟的意象用于本项目 I。

## 实现与资源

- `clip-animation.ts` 以模拟时钟选择动作，所有角色共用脚点、距离步态与相位映射。绘制不会推进时钟，命中停顿和暂停均冻结动作。
- 魈 L 单独读取 `windup/dive/impact/recover`。下坠长度取决于真实地面碰撞，任意长坠落都只播放枪尖朝下的 dive 组；对战与幸存者分别传入现有收招时长。
- `art.ts` 按出战或审片选中的角色加载新包。通用资源与各角色有独立 pending Promise；多个 clip 指向同一 PNG 时共用解码图像与惰性白闪副本。基础 8 clip 全部验证后才启用；某角色失败只回退该角色，损坏的可选 J/K 变体分别回退原形态。
- 刀枪余光按角色主题色及 `trail: arc/thrust/none` 选择弧线、直线或不绘制。魈下坠继续使用专门的纵向风枪效果，召雷不添加无关刀弧。
- 新包 J/K 已登记实际剑尖余光时，两模式停止重复绘制旧的通用月牙斩；幸存者效果记录出招当时的动作形态，因此收招后也不会误套下一招。命中火花、L/I 实际技能效果与旧包回退保持原样。
- `?animation=eula|raiden|jean|diluc|xiao` 打开旧新对照。支持角色、动作、有效形态、速度、方向、坡面、模式、大小及单步；魈 L 预览先跳跃再下坠。
- 雷电目录为 `public/assets/animations/raiden-v5/`；琴、迪卢克、魈目录为 `public/assets/animations/<id>-v4/`。每人 6 张图集：`locomotion`、`aerial`、`basic`、`basic-variants`、`special`、`secondary`。图片由内置 image_gen 生成；登记数据仅裁切显示，不修改生成图。
- 坡面仍为单个支撑点及轻微姿态补偿，没有双脚骨骼 IK。

## 原设定参考与生成记录

使用官方角色拾枝杂谈作为角色、武器及技能风格来源。网页核对确认官方影片及说明，不把文字索引当作逐帧观看证据；本项目的具体动作安排以现有机制为准。

- [Raiden Shogun: Tranquil Thunder](https://www.youtube.com/watch?v=oBrEFOdSfy8)
- [Jean: Guiding Breeze](https://www.youtube.com/watch?v=_FOkixTeAaA)
- [Diluc: Dawn](https://www.youtube.com/watch?v=1TfbiDo7N4k)
- [Xiao: Conqueror of Demons](https://www.youtube.com/watch?v=kCmvCpYL34U)
- [Eula: Surging Frost](https://www.youtube.com/watch?v=deByypNHedI)
- [React useEffect 文档](https://react.dev/reference/react/useEffect)：预览时钟清理、稳定依赖与快速切换时忽略旧请求。

已有优菈素材记录：[基础动作](eula-v4-animation-design.md)、[J/K 变化及历史 L/I](eula-v4-attack-variants.md)。新角色的生成与验证记录：

|角色|提示词与原生图记录|美术登记检查|
|---|---|---|
|雷电将军（v5）|[身体与普通攻击](raiden-v5-body-prompts.json)、[技能](raiden-v5-skills-prompts.json)|[raiden-v5-art-validation.json](raiden-v5-art-validation.json)|
|琴|[jean-v4-prompts.json](jean-v4-prompts.json)|[jean-v4-art-validation.json](jean-v4-art-validation.json)|
|迪卢克|[diluc-v4-prompts.json](diluc-v4-prompts.json)|[diluc-v4-art-validation.json](diluc-v4-art-validation.json)|
|魈|[xiao-v4-prompts.json](xiao-v4-prompts.json)|[xiao-v4-art-validation.json](xiao-v4-art-validation.json)|

[v4 阶段 400 帧只读像素报告](roster-v4-art-validation.json)记录当时每张 PNG 的 SHA-256、透明比例、最小主体边距及解码规模。四个新角色各为 6 个图集、约 35.99 MiB RGBA；优菈沿用分片图集，为 10 个图集、约 60.01 MiB。运行时只按需要加载角色，并复用已经加载的图像。雷电 v5 的实际图集尺寸及检查另见其更新说明。

## 验证

源码回归覆盖全角色相位、J/K 变化与 L/I 固定形态、魈空中前置和实际落地、并发按需加载、共享图集解码一次、基础包原子回退和变体独立回退。`scripts/verify-eula-art.py` 保留历史文件名，现支持指定角色或默认全部五人，只读检查 PNG 透明度、帧差异、边缘、锚点及显存解码规模。

最终集成验证（2026-10-09）：

- 动作回归 18/18：真实五角色全部攻击图片在对战及幸存者各攻速等级可达，包含魈独立下坠相位；L/I 不混入普通攻击变化。
- 美术回归 29/29：全部 400 帧在左右朝向使用正确裁切，共享 PNG 仅解码一次；新包失败原子回退，变体失败独立回退。魈 L 每张枪尖与物理支点误差小于 0.01px，落地不把长枪画入地面。最终权重修正后重跑对应实图与落地点检查 2/2 通过。
- 对战回归 52/52、幸存者非压力回归 55/55 通过。此前已通过五角色各十分钟高密度完整模拟，本阶段没有重复运行该压力项。
- TypeScript、定向 ESLint、生产构建及 `git diff --check` 通过。400 帧只读像素检查覆盖真实 RGBA、透明边缘、帧哈希差异及元数据；没有对生成 PNG 做程序化修改。
- 独立审查发现最高当前攻速下雷电 J 末帧和魈 I 最后一张起手帧不可达；已只调整相位内图片权重：雷电 J 两个收招帧从 `[3,2]` 改为 `[2,2]`，魈 I 四个起手帧从 `[4,4,3,2]` 改为 `[3,3,3,2]`。实际攻击时长、冷却、伤害和击中时刻保持原值。
- 修正后独立 Architect 最终签收 PASS，并从真实引擎首渲染 `t=1` 再次穷举五角色、两模式及所有当前攻速等级，缺失图片列表为空。
- 主代理实际预览与实战检查确认优菈 L 横向旋转、琴前刺与上挑、迪卢克前冲与火鸟、雷电直刺及召雷、魈向下坠刺及水平突进。最新截图位于 `output/playwright/`；两个浏览器检查均为零 console 错误／警告。

开发过程中曾出现热更新保留旧 RAF 回调，导致新 UI 对应旧渲染闭包；完整刷新后五角色新包正常。没有为此改变正式资源加载逻辑。坡面仍使用单支点补偿，移动出招时可能有少量滑步。
