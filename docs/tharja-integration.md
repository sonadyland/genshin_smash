# Tharja 正式接入记录

## 美术与动作

正式角色使用已批准 `public/previews/tharja-v2/` 的全部 84 帧：待机 8、跑步 8、跳跃 8、闪避 4、J / K / L 各 12、I 16、受击 4。生产包在 `public/assets/animations/tharja-v1/`，21 张 1254×1254 透明 WebP；没有重新生图或重绘。首页和 HUD 使用已批准的标准立绘，原始文件按字节保存为 `public/previews/tharja-v2/portrait.png`，显示版为 `public/assets/lobby/tharja.webp`（640×960，82,528 字节）。动作保持 v3 的持书形象。打包与素材验证直接读取版本控制中的原图，不依赖本机 ignored 输出目录。

所有图集保持原尺寸、裁框与每张图固定人体标尺。WebP 采用 quality 92 / method 6，逐张核验 alpha 与原 PNG 完全一致；首页立绘单独使用 quality 90 和等比缩小。相关参数依据 [Pillow WebP 官方文档](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp)。源图 SHA-256、输出 SHA-256、透明度和大小记录在 [tharja-art-registration.json](./tharja-art-registration.json)。

源素材共 **22,906,649 字节**；生产图集、立绘和 manifest 共 **4,809,079 字节（4.59 MiB）**，约为源文件的 21%。源 PNG 留在审片目录，不进入战斗资源队列。

跑步保留虚拟地面登记和腾空步态。跳跃由游戏物理决定高度；三张空中姿势使用骨盆投影的身体支点，不再叠加审片的整个人物升空。闪避同样不重播审片横向 `rootOffset`，避免引擎位移叠加。没有逐帧按外框拉高人物。新增可选 hurt 片段；已绘制的受击姿势不再叠加旧版旋转/拉伸，幸存者受击不打断操作的规则保留。

Tharja 攻击以 `releaseFrame` 锚定实际 startup；释放前按原前摇帧时长播放，释放后按剩余原时长映射到 active + endlag。长时间存在的法术判定不会把人物停留在接触姿势。J/K/L/I 释放帧分别为零基 5/5/4/10；L 的 `returnFrame=6`、`effectEndFrame=8` 保留。一般对战时 L 的第 7 帧回拉出现在 startup + 16 tick，与实际生命回流时刻一致。其他角色继续使用原四阶段动画映射。

## 掌心与加载接口

- `art.getTharjaCastOrigin(x, feetY, height, kind, facing)`：返回释放帧掌心的世界坐标，资源尚未载入时为 undefined。
- `art.getCharacterCastOrigin(id, x, feetY, height, animation, facing)`：按当前动作帧返回掌心，供吸取回流随手移动。两个接口均使用与角色绘制一致的等比缩放和一次镜像，不借用武器尖端。
- `FighterAnimation.hitstunAge / hitstunDuration`：可选模拟时间，选择 4 张护书受击帧；不读取墙钟，也不在绘制时推进状态。

第八角色加入角色动作枚举、pack 索引、首页立绘、加载清单和选角详情。首页既有四列布局直接容纳第八卡片，移动端继续复用现有按钮。`?animation=tharja` 可查看正式动作，包括受击、左右朝向、112/224 尺寸和原生暗术特效；独立审片 v2 保留。

首页仍先加载背景与全部显示尺寸立绘；后台完整角色下载依次为雷电→琴→优菈→迪卢克→魈→钟离→芙宁娜→Tharja。进入战斗仍优先准备所选角色，并复用已经完成或在途请求；后台不会解码并常驻所有图集。Tharja 的新增帧、包括 hurt，全部进入该角色的完整资源清单。

缓存继续逐文件 SHA-256，不更改全局版本号。原七角色包及首页立绘共 142 个跟踪文件通过 Git 对象哈希比对（JSON 比较 Git 规范化换行，图像按原始字节）；基线见 [tharja-existing-art-baseline.json](./tharja-existing-art-baseline.json)。打包脚本只写 Tharja 新路径，不重新编码旧角色，因此其资源 URL 不因增加角色而变化。

## 可复现命令与验证

注册脚本只读取仓库内 PNG，并以生成时记录的 SHA-256 校验批准素材。v1/v2 审片测试分别固定标准立绘与 stance-v3 母版哈希；历史提示词中的本机路径仅记录生成来源，不是运行依赖。Python 图像脚本需要 Pillow，普攻/战斗登记还需要 NumPy。

```powershell
python scripts/register-tharja-jab-v1.py
python scripts/register-tharja-locomotion-v2.py
python scripts/register-tharja-combat-v2.py
python scripts/register-tharja-mire-hurt-v2.py
python scripts/build-tharja-art.py
# 仅重新登记元数据时，仍验证原图和生产透明度，但不重新编码：
python scripts/build-tharja-art.py --registration-only
node scripts/tharja-art-regression.mjs
node scripts/tharja-preview-regression.mjs
node scripts/tharja-preview-v2-regression.mjs
node scripts/clip-animation-regression.mjs
node scripts/asset-loading-regression.mjs
node scripts/asset-cache-regression.mjs
npx tsc -b --pretty false
```

本代理验证：Tharja 美术专项 **7/7**、所有角色动作 **21/21**、加载 **11/11**、缓存 **8/8**，TypeScript 检查通过。专项涵盖 84 帧实际裁框绘制、左右掌心、释放/回流/归位时间边界、攻速变化、hurt、生产压缩报告与旧素材内容哈希。

全量 `art-regression.mjs` **41/41 通过**。既有生存渲染测试替身已补齐真实 `SURVIVAL_WORLD`、地面查询、空地图能力/危险区和空暗术状态，适配目前世界接口；原有轨迹与技能显示断言保持不变。

2026-10-13，主代理完成 `npm run build`，并在实际 `http://127.0.0.1:3000/` 页面完成以下验收：

- 第八张 Tharja 选角卡及标准立绘正常显示；选择角色后，Tharja 与 shared 共 7.4 MB 素材加载成功，完成后加载进度消失。
- 经典幸存者模式的触屏 I 按钮可释放咒域并进入冷却；J 击杀 1 只敌人，获得 2 点经验，记录 22 点伤害。
- 键盘双 Tharja 对战中，J 显示独立紫色法球并使 P2 受伤增加 6%；K 可击飞直至 KO；L 可跨高度命中并增加目标 13% 受伤；I 显示贴地紫色咒域。
- 浏览器控制台 warning / error 均为空。验收结束停在已选择 Tharja 的经典幸存者大厅，控制方式恢复为自动识别。

截图：[正式游戏验收](../output/imagegen/tharja-gameplay-integration.jpg)。本次为桌面浏览器中的实际页面与触屏按钮路径检查，没有在真实手机设备或多种浏览器上进行实机验证。

独立架构审核最终结论为 **PASS**：核心 15 项、幸存者 12 项、美术 7 项、缓存 8 项及加载 11 项，共 **53/53 通过**，未发现当前阻断问题。玩法、时序和自动验证详情见 [tharja-gameplay.md](./tharja-gameplay.md)。未创建提交或推送，未修改根 README。
