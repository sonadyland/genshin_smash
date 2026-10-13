# Tharja · v3 造型全动作审片 v2

预览：`http://127.0.0.1:3101/previews/tharja-v2/index.html`。直接选择动作可用 `?clip=run`、`?clip=jab`、`?clip=secondary` 等。

这是独立美术样板，不注册游戏角色，不改正式伤害、操作或缓存。原 `tharja-v1` 保留。本目录母版原样复制自用户批准的 `output/imagegen/tharja-stance-v3.png`。

## 动作与观看

| 语义 | 动作 | 真实帧数 |
| --- | --- | --- |
| idle | 松弛待机、呼吸与眨眼 | 8 |
| run | 持书疾行、两腿交替承重 | 8 |
| jump | 起跳、腾空、下落与缓冲 | 8 |
| dodge | 收身、侧移、制动与回稳 | 4 |
| jab / J | Flux：引符、前送、远程咒弹 | 12 |
| smash / K | Ruin：凝缩、短促推掌、重咒 | 12 |
| special / L | Nosferatu：探掌、牵引、收掌回流 | 12 |
| secondary / I | Mire：抬书读咒、举手描符、压掌成域 | 16 |
| hurt | 缩肩护书、短暂后仰、回稳 | 4 |

动作列表来自本目录 `manifest.json`，每个动作单独登记为 JSON。进入先载入母版与选中动作，其他动作按选择或轮播顺序载入；已加载图保存在当前页内存中复用。进度逐图显示；缺图、请求失败、超时或登记越界均明确提示，不能用静态立绘替代动作。

动作加载以独立批次登记；失败后同批迟到的图片不会覆盖错误或新重试进度。母版未就绪时禁用动作选择和快捷键，初始化失败时保留「重新加载预览」入口。

支持暂停、逐帧前后、时间轴、0.25× / 0.5× / 1×、左右朝向、112px / 224px / 350px、母版对照、参考线、独立法术开关、单动作循环及全动作轮播。J / K / L / I 可切换施法。手机布局按窗口方向调整。

## 比例与根定位

- 内置图像模型生成真实姿态；通常每张图 2×2 四帧，源 PNG 逐字节复制，不脚本抠图或扭曲身体。
- `sheets[].standingBodyHeight` 是每张图统一的自然站姿标尺，所有同图姿势共用。弯膝、举手、跃起不能按当前外框强行撑高。
- 每帧 `rect` 使用实际透明分界，`pivot` 是源裁框内的支点。移动/跳跃可采用虚拟地面与骨盆投影，不把每帧最低鞋底钉在地上。
- 可选 `rootOffset` 为源像素，随整张图同倍率缩放；用于保留向前移动与离地幅度。角色整幅等比显示，不单独拉长腿或压缩头。
- 法术按 `releaseFrame` 与该帧 `castOrigin` 真实掌心发出；释放前不在未来掌心处提前画悬空法球。生命回流按 `returnFrame` 开始，后续使用对应动作帧的掌心位置。

Flux / Ruin / Nosferatu / Mire 的法球、重咒、回流与咒域由原生 Canvas 分层演示，不代表未来正式战斗数值。hurt 仅审查姿态，不改变幸存者模式受击不打断操作的既有要求。

## 资源与验证

- [Mire / hurt 完整提示词和内置原输出](./prompts-mire-hurt.md) · [20 帧登记检查](./mire-hurt-validation.json)。
- [待机与移动完整提示词](./prompts-locomotion.md) · [28 帧登记检查](./locomotion-validation.json)。
- [J / K / L 完整提示词](./prompts-combat.md) · [J 检查](./jab-validation.json) · [K 检查](./smash-validation.json) · [L 检查](./special-validation.json)。
- `scripts/register-tharja-mire-hurt-v2.py` 只读取 PNG 并输出登记 JSON，不修改源图像素。

```powershell
node --check public/previews/tharja-v2/preview.js
node --check public/previews/tharja-v2/preview-model.js
node --check public/previews/tharja-v2/preview-loading.js
node scripts/tharja-preview-v2-regression.mjs
```

素材尚在生成时可加 `--partial`，此模式明确跳过「全部 84 帧存在」断言，不能作为完整交付通过记录。完整验证涵盖母版原样复制、真实图裁框、同图固定比例、虚拟根、时序边界/逐帧闭环、释放时刻/镜像掌心与错误契约拒绝。

实现复用已核对的官方接口：[drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)、[requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)、[AbortController.abort](https://developer.mozilla.org/en-US/docs/Web/API/AbortController/abort)。

2026-10-13 定向验证：9 个动作、84 帧完整到齐；完整回归 11 项全部通过（无跳过），三份预览 JavaScript 语法检查通过。新增用可控异步图片和真实页面入口检查失败后迟到成功、重试交叠、初始化失败保留错误/重试以及成功初始化恢复控件。

独立审核已完成：21 张动作图全量视检无必须重绘问题；审核代理复读加载批次和初始化门禁实现，独立重跑三份 JavaScript 语法检查及 11 项专项，全部通过。

浏览器已逐一确认 9 个动作正确帧数，J 的 395ms 掌心释放、Mire 的 1310ms 压掌后地面阵和 Nosferatu 的 800ms 牵引正常；跳跃 330ms 第 4 帧离地、112px 左右朝向、0.25× 慢放、暂停及落地第 6 帧正常，日志无 warn/error。

18:32:08 加载修复后已刷新最终代码并重跑 11 项专项，全部通过。浏览器开启全动作轮播后实际进入后续 hurt 动作，9 个动作按钮均显示已就绪，warn/error 日志为空。全页截图保存在 `output/imagegen/tharja-full-motion-preview-v2.jpg`；交付页保留 1×、350px、向右、母版对照和全动作轮播。未进行设备 viewport 覆盖或手机浏览器实测。

服务复用现有 3101 静态 public 服务，不覆盖 3000 开发服务或 dist。
