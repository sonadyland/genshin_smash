# 魈、优菈、迪卢克武器美术实装

使用用户已认可的新立绘统一三人的首页/HUD 形象，并将对应游戏动作图集更新为 `xiao-v6`、`eula-v6`、`diluc-v6`。共 24 张新图集、每人 80 个活动帧。雷电将军的立绘、图集和活动映射保持原样。

| 角色 | 认可立绘 / 活动动作包 | 提示词与登记证据 |
| --- | --- | --- |
| 魈 | [立绘](../public/assets/characters/xiao-v6.png) · [6 图/80 帧](../public/assets/animations/xiao-v6/manifest.json) | [移动提示词](xiao-v6-locomotion-prompt.txt) · [登记脚本](../scripts/register-xiao-v6.py) · [美术验证](xiao-v6-art-validation.json) |
| 优菈 | [立绘](../public/assets/characters/eula-v6.png) · [10 图/80 帧](../public/assets/animations/eula-v6/manifest.json) | [完整提示词](eula-v6-imagegen-prompts.json) · [登记脚本](../scripts/register-eula-v6.py) · [逐帧测量](eula-v6-registration-measurements.json) |
| 迪卢克 | [立绘](../public/assets/characters/diluc-v6.png) · [8 图/80 帧](../public/assets/animations/diluc-v6/manifest.json) | [所有提示词索引](diluc-v6-weapons.md) · [登记脚本](../scripts/register-diluc-v6.py) · [逐帧测量](diluc-v6-registration-measurements.json) |

这次只替换美术与注册坐标，保留每人的 idle/run/jump/dodge、J/K/L/I 和 J/K 变化动作，共 80 个活动帧；所有动作名称、顺序、phase、duration、trail 和战斗判定沿用原版。新武器变长后的裁框、脚基点、身体高度与剑/枪尖由各自登记脚本按实际新图重新测量。魈 L 仍以向下枪尖对齐落地支点。

运行时只需通过 `src/game/animation-packs.json` 选择新包；素材队列和内容哈希缓存清单会从活动 manifest 自动派生，不增加旧新两套同时预下载。首页仍加载小尺寸 WebP，完整 PNG 立绘不加入首页请求。已缓存但未改动的资源继续复用；替换后的 WebP 和新图集按内容哈希下载一次。

新版立绘源文件为 `public/assets/characters/{xiao,eula,diluc}-v6.png`，发布版为 `public/assets/lobby/{xiao,eula,diluc}.webp`。可运行以下命令只更新三人，避免重编码其他角色与背景：

```text
python scripts/generate-lobby-art.py --only xiao eula diluc
```

旧 v4 图集和历史立绘仍保存，供比较和回退。`art-regression.mjs` 与 `clip-animation-regression.mjs` 改为读取活动包映射，避免只验证已退出使用的旧美术。

本轮尚未提交 Git commit 或推送远端。

2026-10-12 最终验证：

- 新三包 240 帧、24 图的真实 RGBA、尺寸、裁框、脚点、刀/枪尖与阶段校验通过；逐帧对比旧包确认名称、phase、duration、trail 均保持原样。
- 美术回归 **39/39**（含全部 532 个活动帧双向渲染）；动作回归 **21/21**；加载队列回归 **10/10**；内容哈希缓存回归 **8/8**。
- 三份登记脚本重跑后，24 PNG + 33 JSON 共 **57 文件 SHA-256 完全一致**。独立美术/架构复核通过，`git diff --check` 通过。
- `npm run build -- --base=/` 通过。生产预览 HTTP 实取 3 manifest + 24 图集 + 3 首页 WebP 共 **30 资源**，哈希全部匹配最终文件；页面脚本与最终构建一致。
- 浏览器实际检查优菈跑步、左向 L 横斩、I 施法，迪卢克 I 抬剑放鸟、左向 K 变化；魈实际战斗 J/I、跳跃 L 与移动输入正常。最终构建的魈 L impact 在平地及左向上坡均以枪尖接地，112px 左向跑步也通过，手与枪杆共轴，整杆连续；控制台无警告或错误。
- 生产预览在跨构建切换时曾暂留旧加载状态，正常刷新后恢复“新动作已就绪 · 80 帧”，无控制台错误；未为此修改缓存逻辑。

验证入口：

```text
python scripts/verify-eula-art.py xiao eula diluc
node scripts/art-regression.mjs
node scripts/clip-animation-regression.mjs
node scripts/asset-loading-regression.mjs
node scripts/asset-cache-regression.mjs
npm run build -- --base=/
```
