# 优菈剑尖施法与迪卢克火鸟动作样板

本轮根据用户确认的方向，只替换优菈「霜华·断浪」和迪卢克「赤羽·燎空」各 12 帧的 I 技能。优菈保留松籁大剑，恢复双手收剑、前送剑尖引导冰元素、弓步释放和收剑；迪卢克参考早期四姿势的修长比例、束发和黑金红内衬外套，用新版狼的末路完成低位双手蓄剑、向前上方大弧上提、展开释放火鸟和回正。

优菈 L 旋转横斩、两人的其他动作、魈和雷电将军等其他角色保持本轮开始时的资源。迪卢克整体其他动作的人物比例统一仍待用户确认本轮样板后另行实施。

## 资源与登记

| 角色 | 新图集 / 独立登记 | 生成方式 |
| --- | --- | --- |
| 优菈 | `public/assets/animations/eula-v6/secondary-swordcast-v7.png` / 同名 `.json` | 内置 imagegen，参考旧动作与已认可的新武器；[完整三轮提示词](eula-swordcast-v7-prompts.md)、[逐帧登记证据](eula-swordcast-v7-validation.json) |
| 迪卢克 | `public/assets/animations/diluc-v6/secondary-firebird-v7.png` / 同名 `.json` | 内置 imagegen，参考旧人物/动作与狼的末路；[完整三轮生成记录与提示词](diluc-firebird-v7.md)、[逐帧登记证据](diluc-firebird-v7-registration.json) |

每张图按实际透明区域、靴底支点、站立身体高度和真实剑尖重新登记。活动资源由各自 `manifest.json` 的 `clips.secondary` 选择；旧 I 图集留作历史对比，不加入新版角色的活动加载清单。不要直接重跑旧 `register-eula-v6.py` / `register-diluc-v6.py` 覆盖这两个新 clip。

复现登记仅需下列两个 v7 脚本（只读像素、写独立 JSON，不生成或编辑图片），然后把独立 clip 应用至 manifest。命令可重复执行，不改其他 clip：

```powershell
python scripts/register-eula-swordcast-v7.py
python scripts/register-diluc-firebird-v7.py
node -e 'const fs=require("fs"); for (const [id,name] of [["eula","secondary-swordcast-v7"],["diluc","secondary-firebird-v7"]]) { const dir=`public/assets/animations/${id}-v6`, p=`${dir}/manifest.json`, m=JSON.parse(fs.readFileSync(p)); m.clips.secondary=JSON.parse(fs.readFileSync(`${dir}/${name}.json`)); fs.writeFileSync(p,JSON.stringify(m,null,2)+"\n"); }'
```

## 技能视觉与玩法边界

`registeredWeaponTip` 复用人物绘制的裁框、脚基点、均匀缩放，供武器残影与技能锚点共同使用。只有优菈和迪卢克的 I 在 contact 阶段绘制剑尖释放光；朝左时与人物一起镜像。其他角色、其他招式及旧素材加载失败的 fallback 不受影响。

投射物在实际释放时刻记录剑尖位置，仅渲染短时间从剑尖接回既有飞行轨迹。使用 smoothstep，至少 8 tick；长剑的前伸距离和升级火鸟的垂直分路距离会延长过渡，避免弹体倒退或突然换道。对战和幸存者的投射物物理坐标、速度、伤害、半径、寿命、数量、穿透、升级、命中检测与冷却均不变。对战原本身体中央的两招旧云团，以及幸存者优菈的固定位置寒潮，仅在新剑尖锚点可用时替换。

## 查看

- 优菈：`http://127.0.0.1:3000/?animation=eula&clip=secondary`
- 迪卢克：`http://127.0.0.1:3000/?animation=diluc&clip=secondary`

审片台默认直接选择 I，并排对照旧四姿势与连续动作，可切换左右朝向、游戏 112px / 放大 224px、正常 / 慢速和对战 / 幸存者时序。真实冰晶和火鸟在游戏中检查。

本轮不提交 commit 或推送远端。

## 2026-10-12 验证

- 两张原始 RGBA 图共 2,721,736 字节；每人 12 帧。优菈主体 alpha>32 最小裁框余边 3px，迪卢克 5px；24 个登记剑尖均落在真实不透明剑尖像素上，裁框不重叠。新图分别经过作者、交叉美术代理与集成代理目视复核。
- 两 I 的逐帧 `name/phase/duration/sourceScale/trail` 与替换前相同。替换前后对两包其余 14 个 clip 和 4 个 J/K variant 做 SHA-256 语义快照比较，全部一致。
- 首 contact 剑尖在 112px 人物局部坐标下：优菈 `(110.208, -60.928)`，迪卢克 `(65.739, -137.565)`。这些值由实际登记生成，运行时不硬编码。
- 美术回归 **41/41**、动作时序 **21/21**、对战 **64/64**、相关幸存者 **13/13**、加载队列 **10/10**、内容哈希缓存 **8/8**、画质档位 **4/4**。新增测试覆盖左右镜像、112/224px、所有 contact tick、其他招式不串、缺图完整 fallback、hitstun/dodge 拒绝锚点、长刀光弹前向单调、升级火鸟平滑分路，以及真实物理路径/命中定义保持一致。
- 独立代码 Architect 复核通过，复核建议的缺图测试已用真正的 I contact 状态验证。
- TypeScript 和 Vite 生产构建成功，当前预览脚本 `index-du8RR0PS.js`。3000 端口 HTTP 读取两份内容哈希 manifest、两张内容哈希 PNG 与页面脚本，与最终文件逐一 SHA-256 相符。生产预览沿用后台进程，未启动开发 HMR。
- 根代理完成浏览器最终验收：新旧并排预览确认优菈 I 双手前送长剑，迪卢克 I 恢复修长比例、长外套、束发及完整举剑动作；真实幸存者模式中优菈 I 击杀 3 个敌人并获得 6 XP，迪卢克 I 截图确认举剑释放火鸟、火鸟继续向前飞行和随后收招。两个浏览器页的 warn/error 日志均为空。临时实战页已关闭，保留用户的优菈 I 预览页，恢复向右、正常 1× 播放。
- 收尾时观察到一次预览加载延迟：关闭临时实战页后导航回优菈 I，标题停留在“正在加载动作资源”，两侧人物暂未显示，但 tick 持续变化、warn/error 日志为空。正常刷新后约一分钟恢复“新动作已就绪 · 80 帧”，最终截图确认两侧人物和播放正常。同期只读诊断确认后台预览进程与 3000 监听健康；页面、当前 manifest、全部 10 张优菈活动图均在 18–143ms 内 HTTP 200，图像哈希一致。审片台直接等待图片解码与资源就绪，不经过首页下载队列，也没有内置一分钟缓存超时。延迟原因尚未确定，未据此修改源码或缓存策略。

```text
node scripts/art-regression.mjs
node scripts/clip-animation-regression.mjs
node scripts/game-regression.mjs
node scripts/survival-regression.mjs "sword release|secondary|manual"
node scripts/asset-loading-regression.mjs
node scripts/asset-cache-regression.mjs
node scripts/visual-quality-regression.mjs
npm run build
```
