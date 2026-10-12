# 迪卢克「赤羽·燎空」v7 技能样板

本轮只重做 I 技能的 12 帧，供确认旧人物形态与新版狼的末路的组合效果。
其余动作维持 v6；不批量改人物，不涉及雷电将军，也不改技能伤害、冷却或命中时序。

## 设计与参考

- 主参考：`public/assets/animations/diluc-secondary-v1.png`。恢复原版较修长的头身、窄腰长腿、束起的马尾、黑金长外套与红内衬。
- 武器参考：`public/assets/characters/diluc-v6.png`。只继承新版狼的末路的黑红宽刃、银色锯齿刃缘、狼徽护手与长握柄。
- 原 `diluc-v6/secondary-v5.png` 只作 4×3 布局参考，原 JSON 提供阶段与时序，不继承宽厚人物和持续下蹲动作。
- 动作从双手低位后引与短促下沉，进入腿腰肩展开的大弧上举，再过肩随势、重剑沉回低位。
- 主火鸟与剑尖释放光由引擎绘制。图集中去掉预烘焙火光，避免它混入相邻帧或和运行时特效重复。

## 交付资源

- PNG：`public/assets/animations/diluc-v6/secondary-firebird-v7.png`
- 独立 clip：`public/assets/animations/diluc-v6/secondary-firebird-v7.json`
- 可重现登记：`scripts/register-diluc-firebird-v7.py`
- 几何报告：`docs/diluc-firebird-v7-registration.json`
- 最终图 SHA-256：`bd353ddd28990998f887d22c3a242f2b5907e7358c644202e5cb53e62dcff90a`

使用内置 `image_gen`，真实透明 RGBA，1448×1086，12 帧。共 3 次生成：主稿、移除火光、补留白；最终直接复制模型输出，没有程序绘画、合成或后处理像素。
三份完整提示词分别为 `diluc-firebird-v7-prompt.txt`、`diluc-firebird-v7-glow-repair-prompt.txt`、`diluc-firebird-v7-framing-prompt.txt`。
最终原始生成路径：`C:/Users/46637/.codex/generated_images/01a130b6-7e62-7f41-875b-d1e63fb24265/exec-41ed7926-c1a2-4c80-9706-9b5fad673c5e.png`。

## 登记与验证

- 12 帧的 `name`、`phase`、`duration`、`sourceScale` 和 clip 的 `trail` 全部沿用当前 I 技能，4/2/3/3 帧对应蓄力/接触/随势/收招。
- 使用最终图实际透明间隙确定每帧裁框，不假定绘图恰好位于名义网格内；裁框彼此不重叠，`alpha > 32` 的图像内容与裁框每边至少相隔 5 像素。
- 每帧剑尖坐标根据实际尖端位置登记，再吸附到附近 `alpha >= 128` 的真实像素；无需把旧图枪剑端点比例复制过来。
- 整段统一 `standingBodyHeightPixels = 276`，避免剑举得越高人物反而缩小；不逐帧缩放人物。
- 地面基线按排统一，脚锚沿两靴支撑中点登记，保持蓄力下沉是姿势变化而非画布缩放。
- root 已目视检查最终稿的旧版人物形态、衣装、大幅上举、完整鞋尖和剑尖。运行时集成与全项目回归由集成者记录。
- 优菈美术代理完成独立交叉复核：对照原四姿态，人物衣装、比例、刀路与两手握柄通过；直接读取最终 PNG 复核 12 帧的裁框余边均为 5px、剑尖像素透明度 130–203、48 ticks 和原时序完全一致。
- 登记脚本重复运行后，独立 clip JSON 的 SHA-256 不变，结果可重现。

本轮未提交 commit 或推送。
