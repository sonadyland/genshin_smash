# Tharja · 待机与远程普攻样板

本目录是独立美术审片页，未注册正式角色，未修改攻击判定、伤害、技能或幸存者模式。

预览地址：`http://127.0.0.1:3101/previews/tharja-v1/index.html`。普攻直接入口加 `?clip=jab`。

## 美术与登记方式

- 母版来自用户已批准的 `output/imagegen/tharja-awakening-portrait-v1.png`，原样复制到 `assets/master.png`。
- 待机 8 帧拆为两张 2×2 图，远程普攻 12 帧拆为三张 2×2 图。使用内置图像模型绘制真实姿态，保持每张图有足够空间。
- 参考芙宁娜 `public/previews/furina-v1/README.md` 的比例修订方法：以批准立绘保持造型和头身比；每张源图以自然站姿标定一个 `standingBodyHeight`；同张图全部帧共用固定缩放。
- `idle.json` / `jab.json` 各自登记 `sheets[].src`、`sheets[].standingBodyHeight`、`frames[].rect`、脚底 `pivot`、`durationMs`、`phase`。`jab.releaseFrame` 的 `castOrigin` 为该帧裁切矩形内的实际右掌位置。
- 不对单帧外框归一化，不单独缩放头部或拉伸四肢，不将立绘整体平移、缩放、摆动当作动画。源 PNG 不经脚本改像素。

## 审片方式

默认批准立绘与连续动作并排，脚底对齐，同一站姿身高。可以切换：

- 待机 / 普攻；暂停、前后逐帧、拖动时间轴、1× / 0.5× / 0.25×；
- 朝左 / 朝右；350px 审片 / 224px 放大 / 112px 游戏尺寸；
- 立绘比例对照、对齐参考线、法球演示和循环。

立绘为接近正面的造型参考，动作采用朝右三分之二侧面；头顶、肩、胯、膝的辅助线是肉眼标定参考，不代表精密测量。动作自然的前倾或呼吸保留真实高度变化。只有脚底位置与源图统一比例参与配准。

普攻法球是独立 Canvas 演示：按已登记的第 6 帧（395 毫秒），从实际手掌位置立即射向当前朝向。放咒前不提前在未来手掌位置显示悬空法球。预览轨迹和循环间隔不代表未来正式战斗数值。图片缺失或登记越界时明确报错，不用立绘代替动作。配置与图片分别设置 15 秒 / 60 秒超时，失败时可以点击「重新加载」。

## 检查

```powershell
node --check public/previews/tharja-v1/preview.js
node scripts/tharja-preview-regression.mjs
```

专项检查包含：母版原样复制、20 帧真实图片裁切、同源图固定比例、脚底定位、时轴末端/逐帧循环、掌心起点与朝向镜像、缺失与越界契约拒绝。

本页仅使用浏览器已有的 Canvas、DOM 与 `requestAnimationFrame`，没有新增依赖。实现前核对官方文档：

- [MDN drawImage：源矩形裁切和目标矩形绘制](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)
- [MDN requestAnimationFrame：按时间戳驱动动画](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)
- [MDN AbortController.abort：终止超时的配置请求](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort)

## 资源与生成记录

| 资源 | 文件 | 时序 |
| --- | --- | --- |
| 批准立绘 | [master.png](./assets/master.png) | 原图副本 |
| 待机前半 / 后半 | [idle-a.png](./assets/idle-a.png) / [idle-b.png](./assets/idle-b.png) | 8 帧共 2.24 秒 |
| 普攻起势 / 释放 / 回收 | [jab-a.png](./assets/jab-a.png) / [jab-b.png](./assets/jab-b.png) / [jab-c.png](./assets/jab-c.png) | 12 帧共 1 秒；循环间隔 0.5 秒 |

- [待机完整提示词与原始输出](./prompts-idle.md) · [待机像素检查](./idle-validation.json)。
- [普攻完整提示词与原始输出](./prompts-jab.md) · [普攻像素检查](./jab-validation.json)。
- 内置 `image_gen` 生成；不使用外部 API 或 CLI 生图。
- 2026-10-13：JS 语法检查与 6 项专项回归通过。直接运行测试文件避免受限环境中 `node --test` 的子进程隔离权限问题。
- 独立美术与架构审核通过：5 张图集 / 20 帧、头身比例、手书接触、掌心释放点、固定源图比例、左右镜像及加载错误处理无阻断项。
- 主代理完成最终 IAB 浏览器验证：待机 / J 资源加载、暂停、上一帧、时间轴定位 395 毫秒、0.5× 慢放、350px / 112px 与左右朝向切换均正常。第 6 帧从实际掌心释放，第 5 帧没有提前悬空的法球；112px 向左轮廓正常，待机首尾姿态稳定。最终标签页 warn / error 日志为空。
- 审片页全页截图保存为项目内 `output/imagegen/tharja-animation-preview-v1.jpg`，供本轮交付展示。
