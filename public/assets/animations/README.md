# 战斗动作图集 · v3

每名角色有一张 4 列 × 4 行的透明 PNG，共五名角色、80 个独立绘制姿态。日系幻想角色沿用各自的立绘作为参考，由内置图像模型生成。同名 JSON 保存逐帧注册信息、生成提示词和原文件来源。

## 素材与生成记录

| 素材 | 图像 | 注册信息与完整生成提示词 |
| --- | --- | --- |
| 雷电将军 · 16 帧动作 | [PNG](./raiden-actions-v3.png) | [JSON](./raiden-actions-v3.json) |
| 琴 · 16 帧动作 | [PNG](./jean-actions-v3.png) | [JSON](./jean-actions-v3.json) |
| 优菈 · 16 帧动作 | [PNG](./eula-actions-v3.png) | [JSON](./eula-actions-v3.json) |
| 迪卢克 · 16 帧动作 | [PNG](./diluc-actions-v3.png) | [JSON](./diluc-actions-v3.json) |
| 魈 · 16 帧动作 | [PNG](./xiao-actions-v3.png) | [JSON](./xiao-actions-v3.json) |
| 雷、风、冰、火 · 8 格元素特效 | [PNG](../effects/elemental-bursts-v3.png) | [JSON](../effects/elemental-bursts-v3.json) |
| 魈 · 下坠枪风与落地冲击 | [PNG](../effects/xiao-plunge-v3.png) | [JSON](../effects/xiao-plunge-v3.json) |

## 图集布局与运行方式

| 行 | 第 1 格 | 第 2 格 | 第 3 格 | 第 4 格 |
| --- | --- | --- | --- | --- |
| 0 | 待机 | 跑步 A | 跑步 B | 跳跃 |
| 1 | 普攻前摇 | 普攻接触 | 普攻挥击收尾 | 普攻恢复 |
| 2 | 重击前摇 | 重击接触 | 重击挥击收尾 | 重击恢复 |
| 3 | 技能前摇 | 技能释放 | 技能收尾 | 技能恢复 |

运行时读取同名 JSON 的 `sourceRect` 与每帧 `footAnchor`，并校验图片天然尺寸和注册范围。每名角色只使用一个 `standingBodyHeightPixels` 作为缩放基准；姿态改变时仅按实测脚锚平移，不对每帧 alpha 边界重新归一化，避免挥剑、弯腰造成角色忽大忽小。绘制 source rectangle 内缩 1 像素以避免邻格采样，同时按完全相同的像素比例计算目标位置，保持脚锚准确。

普攻、重击、技能分别在对应行选取前摇、有效判定、后摇前半及恢复帧。原有四名角色动画以 `attack.t` 驱动，接触帧只在现有判定起点出现，原有招式时序及伤害没有调整。跑步、呼吸使用角色自身模拟时钟，受击停顿和暂停时该时钟冻结。空中攻击优先使用攻击动作。受击和闪避复用跳跃、奔跑姿态并增加姿态变化；不会冒充新增的专用受击或闪避手绘帧。

魈的第 3 行为专用下坠技能：空中蓄势、枪尖向下戳刺、落地震击、收枪恢复。选帧读取 `attack.plunge.phase`（`windup`、`dive`、`impact`、`recover`）与阶段内计时；下坠帧一直保持到真实着地，再显示落地与收枪，避免高处起手时提前播放落地动作。动作图集缩放与脚锚规则保持一致。

元素斩击与命中特效另有 4 列 × 2 行的透明图集 `../effects/elemental-bursts-v3.png`，按雷、风、冰、火排列，上排为招式、下排为命中。魈的普通攻击显式映射到风元素列；下坠技能使用独立的 2 列 × 1 行 `../effects/xiao-plunge-v3.png`，左格下坠枪风、右格落地冲击，按同名 JSON 的 `sourceRect` 裁切，中心锚定绘制，不会读取旧图集中不存在的第 5 列。程序轨迹与图集叠加并随招式阶段淡出。缺失或注册无效时，角色退回对应立绘，进一步退回程序绘制；特效保留 Canvas 绘制。

执行 `node scripts/game-regression.mjs` 与 `node scripts/art-regression.mjs` 可检验玩法、动作阶段、暂停/停顿、图集区域、镜像与资源失败回退。
