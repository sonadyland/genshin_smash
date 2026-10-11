# Chrome / Edge 美术缓存

生产构建把角色立绘、背景、动作图集、召唤物和帧注册 JSON 映射到 `assets/cache/<文件内容 SHA-256>.png`、`.webp` 或 `.json`。Nginx 对存在的这些文件返回 `Cache-Control: public, max-age=31536000, immutable`。文件内容没有变化时，重新构建仍使用完全相同的 URL；更换一张图片只改变那张图片的 URL。图集、逐帧额外图集和 JSON 分别计算指纹，不把 PNG 指纹当成 JSON 指纹。

首次访问先下载首页的背景与七张立绘，完成后才按雷电将军、琴、优菈、迪卢克、魈、钟离、芙宁娜的顺序在后台准备完整角色资源。进入游戏会优先下载本局角色和公共特效，完成下载与必要解码后才开始倒计时或十分钟生存流程。战斗期间不继续派发其他角色下载；回大厅继续。当前正在传输的文件可以完成，以免丢弃已接收字节。角色卡和入战准备画面共用按源文件字节加权的进度，完成后隐藏；失败可以重试，离开准备页可返回大厅。

后台只预热浏览器 HTTP 缓存，不解码所有角色图集。退出战斗仍释放图片解码和 Canvas 内存，之后再进入时浏览器可从 HTTP 磁盘或内存缓存取压缩文件，无需再次传输完整图片。大厅立绘与战斗 HUD、背景共用同一批显示尺寸的 WebP；原始 PNG、历史动作与审片图保留在服务器，不进入后台队列。所有当前基础动作、J/K 变体、额外帧图、魈特效、钟离岩柱与天星、芙宁娜召唤物都由实际登记清单收集，公共特效只准备一次。

正常进入、刷新、关闭再打开页面时，Chrome / Edge 会按 HTTP 缓存规则复用资源。浏览器仍可能在普通刷新时重新验证部分资源，此时可用 ETag / Last-Modified 返回轻量 304；只有未命中或被强制忽略的缓存需要重新传输文件。不同浏览器和用户配置文件各有自己的缓存。

HTML 与未带指纹的旧美术审片地址、音乐配置 `assets/audio/music.json` 返回 `no-cache`，每次使用时可重新验证。JS / CSS 已由 Vite 生成内容指纹并长期缓存。新版 HTML 会指向新版 JS，JS 内的新资源映射会选取新图片；未变化的图片继续命中原缓存。更新部署期间已经打开的旧页面若请求已被移除的旧资源，准备界面会提示失败，刷新页面取得新版本即可；审片页保留原有备用绘制。不把丢失的旧图片静默换成不同版本的新图，以免与旧帧注册混用。

没有 Service Worker，不依赖 HTTPS 或额外安装；使用局域网 IP 加端口的 HTTP 地址也有效。这不是离线模式或永久存储承诺：浏览器磁盘空间压力、用户清除缓存、隐私模式结束、强制刷新、开发者工具勾选 **Disable cache** 都可能触发重新下载。第三方音乐服务器的响应缓存由该服务商决定。

## 部署

上传本次代码后执行 `docker compose up -d --build`，保持外部端口 **18021** 不变。仅重启旧容器不会重新生成指纹文件或加载新 Nginx 配置。反向代理 / CDN 如覆盖响应缓存头，应同步放行这些缓存策略。构建插件位于 `build/public-asset-cache.ts`，已列入 Docker 构建上下文。

`npm run dev` 保留可即时修改的原文件 URL，不使用一年缓存；`npm run preview` 只用于查看构建，不模拟 Docker 的缓存响应头。缓存验收请在 Docker / Nginx 服务上进行。原 `public/assets` 和 `public/previews` 仍保留供美术审片使用，因此构建产物会同时保存原文件与指纹副本，增加服务器静态文件磁盘占用；游戏只请求指纹副本，不主动下载双份。`public/assets/cache` 为构建保留目录，不能手动放入文件。

## 首页图片与资源清单

七张立绘从 1024×1536 生成 640×960 的透明 WebP，使用 quality 90 和无损 alpha；背景保持原本的 1672×941 分辨率，不放大。生成脚本为 `python scripts/generate-lobby-art.py`，需要带 WebP 支持的 Pillow 11+；脚本不是生产构建依赖，提交生成后的 `public/assets/lobby/*.webp` 即可部署。需要对比图时增加 `--review-dir output/loading-art-review`。动画图集、帧坐标和原始 PNG 没有被缩小或改写。

当前八张首屏图片合计从 **15,683,006 bytes（14.96 MiB）降到 1,138,348 bytes（1.09 MiB）**，减少约 **92.74%** 的冷启动图片正文。该数值不包括 JS、字体、音乐或后续角色图集；后台顺序加载改善优先级，但不会消除后续动作资源本身的下载量。

`build/art-inventory.ts` 在 Vite 启动和生产构建时读取 `animation-packs.json`、当前角色 manifest 与召唤登记，生成 `ART_CATALOG` 及实际文件字节数；不维护人工大小表。`build/public-asset-cache.ts` 在生产环境额外生成每个资源的内容指纹。开发模式修改相关资源会重新生成目录；批量重新生成美术后如编辑器没有触发变更事件，重启开发服务器即可刷新清单。

## 检查方法

1. Chrome 或 Edge 打开游戏，开发者工具 Network 面板取消勾选 **Disable cache**。冷启动时首页八张 WebP 应先加载，之后才出现雷电将军的动作资源。网络限速时角色卡显示进度；点击其他角色开战会优先准备当局资源。
2. 查看 PNG / WebP / JSON 的请求 URL 应为 `/assets/cache/<64位十六进制>.png`、`.webp` 或 `.json`，成功响应包含一年 `max-age` 与 `immutable`。
3. 回大厅再次进入同一角色，或正常刷新页面。观察 Size / Transferred 中的 `memory cache`、`disk cache`，或零正文的 `304`；这类响应不会重新下载整张图片。
4. 更新某一图片并重新构建，检查该图片 URL 改变、未修改图片 URL 保持不变，界面显示最新图片。缺失的指纹文件应返回真实 `404`，且不携带一年缓存头。

本地回归：`node scripts/asset-cache-regression.mjs`、`node scripts/art-regression.mjs`、`npm run build`。缓存回归覆盖逐文件失效、去重、恢复稳定 URL、根目录 / 相对 / 子路径 base、开发与生产清单、真实字节总量、七角色多图集及召唤物加载、旧图集备用加载和解码资源释放。

参考：[MDN HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching)、[Vite 7 public assets](https://v7.vite.dev/guide/assets.html#the-public-directory)、[Vite 7 plugin API](https://v7.vite.dev/guide/api-plugin.html)、[Nginx add_header](https://nginx.org/en/docs/http/ngx_http_headers_module.html#add_header)。
