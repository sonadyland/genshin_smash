# 女神威 · 正式游戏美术接入

本次使用用户确认的 `master-proportions-v2` 美术，未重新生成、裁掉或修改人物。正式角色 ID 为 `corrin`，人形与白龙共用角色选择、资源队列和生命周期。

## 资源

- `public/assets/animations/corrin-v1/manifest.json`：32 组、228 帧；人形 84、白龙 68、四组变形 40、独立特效 36。
- 57 张唯一 WebP 图表。原始像素尺寸保持不变，RGB quality 92，透明度逐像素无损验证。原 PNG 共 86,995,820 字节，生产资源含清单和首页立绘共 17,632,285 字节，减少约 79.7%。
- 首页 `public/assets/lobby/corrin.webp` 使用已批准的人与龙双形态立绘。其原图归档在 `public/previews/corrin-v1/portrait.png`，构建不依赖被忽略的 `output/`。
- 所有源文件与生产文件 SHA256、尺寸、字节数记录于 `docs/corrin-art-registration.json`。现有八名角色的 279 份已跟踪图像与清单由 `docs/corrin-existing-art-baseline.json` 保存 Git 对象校验值，本轮保持一致。
- 生产清单只包含当前批准目录实际引用的源图。历史候选图不进入下载队列。文件名含 `draft` 的跑步源是批准目录选用的部分帧，登记而不是文件名称决定生产来源。

重新打包：`python scripts/build-corrin-art.py`。只验证现有 WebP 并重建登记：`python scripts/build-corrin-art.py --registration-only`。后者逐像素检查 alpha，可重复运行。

## 绘制与仿真契约

`FighterAnimation.corrin` 接收仿真的当前 `form`、三连 `combo` 和锁定的 `transform {from,to,airborne,elapsed,duration,commit}`。`attack.corrinForm` 与 `attack.corrinCombo` 保存攻击输入时的形态与段数。渲染不推进这些状态。

人物调用 `drawFighterArt(..., height=112, ...)`，内部使用人形 112 / 白龙 135 的游戏标尺，并除以源图固定 `bodyHeight`。所有人物绘制保持等比；不按各帧轮廓重新填满画面，不重播审片的空中 -32 偏移、镜头移动或其他整体 root 动画。空中收腿使用批准的虚拟地面根坐标，允许在源矩形之外。

- 待机按仿真时间；跑步按实际位移；跳跃根据真实上升、顶点、下降和落地阶段选帧。
- 人形 J 依次使用斜斩、反手横斩、短突刺三个独立 8 帧动作。K / I 各 12 帧。
- 原画的准备、释放、随动、收招分别映射战斗 `startup / active / endlag`。升级改变动作速度时，释放帧仍对齐真正伤害开始。
- L 地面双向各 12 帧、空中双向各 8 帧，整个过程保持起手时的地面或空中路线。物理落地不会中途跳到另一套图表。
- 人形 J / K 及 I 的独立光迹在 contact 帧绘制。刃根、剑尖与上一帧尖端确定剑光矩阵；横扫用浅扫面避免边缘视角夸张拉扯，突刺只沿剑轴，龙牙光连接真实尖端。此仿射矩阵仅用于光纹，人物从不使用它。
- `getCorrinCastOrigin()` 返回当前绘制帧的龙嘴或左臂施法点；`getCorrinFangSegment()` 返回 contact 阶段实际龙牙根到尖端。镜像只计算一次。
- `drawCorrinWaterEffect()` 使用战斗仿真的位置、范围和年龄。水球、水爆保持等比；持续水束以嘴为原点沿射程轴增长。贴图透明边距不会算成攻击半径。
- `defeated / defeatAge` 可播放两个形态的倒地帧；幸存者普通受伤的白闪不切换为 hurt，继续保留攻击和跳跃。

独立 `CorrinManifest` 校验器保留全部 32 组动作；旧角色的 8 动作清单规则不因变形放宽。资源跟随 `acquireGameArt()` 引用计数，在比赛或审片结束后释放；离开页面后迟到的清单不会再开启整包图片下载。

## 检查

- `node scripts/corrin-art-regression.mjs`：7 项通过。覆盖原登记与源文件哈希、228 帧、57 图表解码去重、279 旧资源不变、三段普攻、两形态技能全部帧可达、四种变形、人物等比、真实嘴与龙牙的镜像坐标、水特效。
- `node scripts/clip-animation-regression.mjs`：21 项通过，包括所有旧角色及 Corrin 在对战和升级速度下的攻击帧覆盖。
- `npx tsc -b --pretty false`：通过。
- 浏览器实际游戏、移动布局和独立架构复核由本轮集成验证覆盖；以上脚本不代替实际画面检查。

## 实现依据

- [MDN drawImage](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/drawImage)：按原始像素 source rectangle 绘制。负宽高不会镜像，左右朝向使用一次上下文 scale。
- [MDN transform](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/transform)：独立剑光三点仿射映射。
- [Pillow WebP](https://pillow.readthedocs.io/en/stable/handbook/image-file-formats.html#webp)：WebP 编码选项；读取原图与解码输出的 alpha 实际比较验证透明度。
