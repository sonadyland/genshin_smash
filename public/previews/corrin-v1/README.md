# 女神威 · 人与白龙动作工坊

本目录是独立 Canvas 美术预览，当前批准素材已实装到正式游戏。新版以已批准的人形母版为比例、服装和配色基准，重绘全部 84 帧人形动作、22 帧变形的人形端，并加入四类独立剑光。循环播放只用于审片，游戏仍采用手动攻击。正式集成与验证详见[美术接入](../../../docs/corrin-art-integration.md)、[双形态玩法](../../../docs/corrin-gameplay.md)及[界面与浏览器验收](../../../docs/corrin-ui-integration.md)。

预览：[母版比例 v2](http://127.0.0.1:3101/previews/corrin-v1/index.html?revision=master-proportions-v2&form=human&clip=idle)。普通默认入口也使用本版，无需 `review` 参数。

## 在用资源

当前目录为 **32 组 / 228 帧**：人物与变形原画 192 帧，独立特效 36 帧。历史候选文件保留，但不参与新版播放。

| 类别 | 动作 | 帧数 |
| --- | --- | --- |
| 人形 | 待机 8、跑动 8、跳跃 8、闪避 4、受击 4、倒下 4、J 斜斩／反手横斩／短突刺各 8、K 双手下劈 12、I 龙牙突刺 12 | 84 |
| 白龙 | 待机 8、跑动 8、跳跃 8、闪避 4、受击 4、倒下 4、J 水弹 8、K 高压水束 12、I 仰首抛射 12 | 68 |
| L 变形 | 地面双向各 12，空中双向各 8；22 帧新版人形端，18 帧保留的龙形端 | 40 |
| 独立特效 | 水弹 4、水束 4、水爆 8、龙牙尖光 4、夜刀神斜斩／横扫／下劈／直刺各 4 | 36 |

`human-v2-manifest.json` 定义当前版本、必要动作清单和替换文件。它退役旧的泛用 `fx-yato-slash`，不以旧目录数量限制新增效果。

## 比例和动作

原始 `assets/human-master.png` 与白龙母版保持原样。人形以约 6.9 头身、细肩腰和修长腿部为视觉标尺，披风保持灰蓝与深靛蓝。每张图表使用固定的解剖站高 `bodyHeight`，人物始终等比绘制，不用每帧轮廓高度归一化，也不拉伸图片来修体型。

跑步的左右接地与承重相位交替；第 3、7 帧重新生成真正的膝部经过位，修正此前连续使用同一支撑轮廓的问题。闪避末帧定向重绘头部，保持躯体和脚底尺度。跳跃与空中变形使用虚拟地面根节点，允许根节点在源矩形以外，以保留收腿和下落姿态。

空中人变龙的一张源图包含两个不同形态的绘制标尺，登记为同 PNG 的人形和龙形两条固定 sheet；浏览器仍只下载一次图片。它不是逐帧按包围盒填满画面。

J ①是斜下劈，J ②是反手横扫，J ③是水平短刺，K 是慢举剑后快速下劈，I 是左臂龙化后刺出。新版人物攻击原画不烘焙剑光；当前刃根、剑尖、上一帧尖端决定独立光迹的放置。横扫使用很浅的后向扫面，直刺只有轴向细光，龙牙的短蓝光连接实际尖端。准备与回收阶段不提前释放大片剑光。详见 [特效生成与几何说明](fx-v2-art.md)。

## 操作

- 人形、白龙、双形态和独立特效四种视图，下拉菜单切换动作。
- 播放／暂停、前后逐帧、时间条、1／0.5／0.25 倍速、左右镜像和游戏实际尺寸。
- 母版支持同尺度并排或半透明叠合；变形也可与人形母版并排。冻结当前帧后可继续逐帧，比较支撑腿和服装相位。
- “骨骼／剑刃与轨迹”显示头、髋等标尺；青线为当前刃轴或龙牙轴，橙虚线为上一刃轴及尖端路径，浅绿点为纹理对应点。
- 空格播放／暂停，左右方向键逐帧。关闭循环后播完停住。“技能特效”可在同一帧开关。
- `?form=human&clip=jab1` / `jab2` / `jab3` 为三段普攻；`smash` 为 K，`secondary` 为 I。
- `?form=human&clip=transform-to-dragon-ground` 为地面人变龙；相反方向为 `transform-to-human-ground`，空中使用 `-air`。
- “刷新资源”重新读取登记；PNG 以 SHA 内容版本作缓存键。

游戏基准为人形 112 CSS px、白龙含角 135 CSS px。审片使用相同世界倍率；舞台按整段动作及特效预留边界，播放中不会随姿势抽动。窄屏空间不够时整体等比缩小，并显示实际尺寸。

## 加载与原图出处

新开双待机页面只加载 **3 张 PNG**：新版人形待机、白龙待机 A／B。切换动作才加载其图表与相关特效；开启单形态母版对照才加载母版。没有预下载所有动作。

新增原画全部通过内置 `image_gen` 生成，输出 PNG 逐字节复制到项目，未通过代码裁图、调色、改透明度或补绘人物。源矩形仅用于运行时 `drawImage`。浏览器与检查脚本读取 alpha 以测量边界，不重写图片。

| 当前登记 | 完整实际提示词、原始输出路径与修订记录 |
| --- | --- |
| `human-v2-motion-registration.json` | [基础动作](human-v2-motion-art.md) |
| `human-v2-combat-registration.json` | [J 三段](human-v2-combat-art.md) |
| `human-v2-skills-registration.json` | [K／I 技能](human-v2-skills-art.md) |
| `human-v2-transform-registration.json` | [变形人形端](human-v2-transform-art.md) |
| `fx-v2-registration.json`、`human-v2-weapon-effects.json` | [四类剑光与实际绑定](fx-v2-art.md) |
| `dragon-idle.json`、`dragon-motion-registration.json` | [白龙母版](dragon-art.md)、[白龙动作](dragon-motion-art.md) |
| `transform-fx-registration.json` 中保留的龙形／水息原画 | [原变形与特效](transform-fx-art.md) |
| 原始人形母版 | [人形母版](human-art.md) |

`preview-registration-overrides.json` 只修正已复核的白龙地面支撑爪坐标。所有人工点位仍有视觉测量误差；实际母版合成和动作连续性是验收依据，不把估读数值当成精密解剖证明。

## 验证记录 · 2026-10-15

- 普通默认页面实际 32 组 / 228 帧；必要动作逐项覆盖、逐帧遍历、源图尺寸与矩形验证、舞台边界检查通过，目录错误和浏览器控制台错误为 0。
- 同尺度母版检查、跑步 8 帧腿部交替及披风颜色、闪避末帧、J／K／I 准备与释放、左右镜像和 40 帧变形接口均已实际浏览器审看，并经过独立视觉复核。
- 检查真实的干净合成与调试线叠合，未仅凭资源数量或锚点误差为零判定剑光正确。K 的轨迹沿上方旧尖端至前方当前剑刃；J ②为浅横扫，J ③为直线光，I 只在刺出阶段连接龙牙尖。
- 桌面 1400 × 1120、窄屏 390 × 844；窄屏镜像跑动、J ②、K、I、空中人变龙和地面回人无页面横向溢出或舞台裁切。冻结帧与叠合对照通过交互检查。
- `node --check public/previews/corrin-v1/preview.js` 通过。`scripts/corrin-preview-audit.js` 遍历必要动作；`corrin-v2-motion-review.js`、`corrin-v2-weapon-review.js`、`corrin-v2-transform-review.js`、`corrin-v2-controls-review.js` 与 `corrin-v2-final-review.js` 复现对应浏览器检查。通过 `playwright-cli run-code --filename <脚本>` 执行。
- 最终截图在 `output/playwright/`：`corrin-v2-final-idle-master.png`、`corrin-v2-final-jab1-f5.png`、`corrin-v2-final-smash-f6.png`、`corrin-v2-final-run-f3.png`，以及 `corrin-v2-final-transform-to-human-air-f3.png` / `f4.png`。

以上记录保留独立美术预览阶段的验证范围；当前批准素材已完成正式角色接入，游戏碰撞、伤害、移动输入及浏览器验证详见[玩法](../../../docs/corrin-gameplay.md)与[界面集成记录](../../../docs/corrin-ui-integration.md)。工具查看原 PNG 时可能显示 alpha 为零的隐藏 RGB 灰雾或边缘颜色，以浏览器合成与 alpha 数据判断。

## 实现依据

- [MDN drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)：按原始尺寸读取 source rectangle。
- [MDN transform](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform)：独立特效的仿射映射；人物保持等比缩放。
- [MDN requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame)：时间戳驱动真实动作帧。
- [MDN getImageData](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/getImageData)：只读取同源图像 alpha 测量排版边界。
