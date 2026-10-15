# 私有 OSS 美术资源与签名下载

生产游戏入口为 `http://180.76.101.97:18021`。Bucket 保持私有；Node 签名服务返回短期 GET URL，浏览器直接向 OSS 下载图片和动作 JSON，图片正文不经过游戏服务器。CORS 仅允许浏览器跨源读取，不授予匿名 OSS 读取权限。没有有效签名的私有对象 URL 仍应返回 403。

## 配置与部署

`.env` 填写 `OSS_BUCKET`、`OSS_REGION`、`OSS_ENDPOINT`、`OSS_ART_PREFIX`、`OSS_ACCESS_KEY_ID`、`OSS_ACCESS_KEY_SECRET`；可选 `OSS_SESSION_TOKEN` 和 `OSS_SIGNED_URL_TTL_SECONDS=3600`。不要修改为 `VITE_` 变量，不要提交 `.env`。凭据仅供 Node 服务和上传进程使用，不写入静态产物或浏览器配置。

`GAME_ART_MODE=auto` 在完整 OSS 配置下使用签名模式，无 OSS 配置则使用本地资源；部分配置会报错。`signed` 强制私有签名，`local` 强制同源。`direct` 为另行配置的公开 CDN 方式，需要 `GAME_ASSET_BASE_URL`；当前私有 OSS 用 `auto` 或 `signed`，公开基址留空。

```sh
npm ci
npm run build
node scripts/upload-art.mjs --dry-run
npm run upload:art
node scripts/configure-oss-cors.mjs --dry-run
node scripts/configure-oss-cors.mjs --inspect
# 审阅合并方案后，仅更新 CORS
node scripts/configure-oss-cors.mjs --apply
docker compose up -d --build
docker compose ps
```

本地或发布机需要 Node.js 22.12+ 与官方 ossutil 2.x；Docker 内自带 Node。上传工具逐文件校验 SHA-256，将 `dist/assets/cache/` 写入 `OSS_ART_PREFIX/assets/cache/`，设置 MIME 和 `public,max-age=31536000,immutable`，不删除旧对象。HTTP 缓存声明不会改变 OSS 私有权限。先上传资源，再更新游戏和 signer，确保二者来自同一构建。

构建会将动作 JSON 的 CRLF 换行统一为 LF，再用同一份字节生成哈希、产物和下载长度；图片保持原始二进制。这样 Windows 上传机与 Linux/Docker 构建得到相同的资源路径。首次更新此规则时，先重新 build 并上传新产物，再重建部署，补齐新的 JSON 对象；只更新代码和 `.env` 不会自动上传资源。后续每次修改美术也按此顺序发布。

Compose 启动 Nginx 和内部 Node 签名服务，对外只开放 18021。同源 `/api/art-urls` 返回构建清单中的短期 URL、有效期及服务器时间，响应不缓存；服务不接受任意对象键。浏览器直接从 OSS 下载并刷新到期签名。服务端身份只需指定资源前缀的 `oss:GetObject`；上传身份另需写权限；配置 CORS 的运维身份需 `oss:GetBucketCors`、`oss:PutBucketCors`。

`OSS_REGION` 接受 `cn-hangzhou` 或 `oss-cn-hangzhou`。浏览器签名 URL 必须使用公网 HTTPS endpoint。中国内地新用户可能需要绑定自定义域名：先按阿里云要求配置 CNAME 和 HTTPS，再设置 `OSS_ENDPOINT=https://资源域名`、`OSS_ADDRESSING_STYLE=cname`；上传工具和签名服务都支持该寻址（默认 `virtual`）。不能在签名后随意替换域名。

STS 签名实际有效期取 URL TTL 与令牌剩余有效期较短者。更新临时凭据后重新创建 signer。修改 `.env` 后执行 `docker compose up -d --force-recreate game signer`；restart 不会更新容器环境。设置 `GAME_ART_MODE=local` 并重新创建服务可恢复同源加载。

## CORS 控制台字段

OSS 控制台 → Bucket → 跨域设置：保留原有规则，新增以下规则。

| 字段 | 值 |
| --- | --- |
| 来源 Origin（每行一个） | `http://180.76.101.97:18021`、`http://localhost:3000`、`http://127.0.0.1:3000` |
| 允许 Methods | GET、HEAD |
| 允许 Headers | 留空，游戏使用无自定义头的简单 GET |
| 暴露 Headers | 留空，游戏不依赖额外响应头 |
| 缓存时间 | 3600 秒 |
| 返回 Vary: Origin | 新配置建议勾选；已有配置保留现值 |

Origin 包含协议和端口，不含路径。localhost 与 127.0.0.1 是不同来源。图片使用 anonymous CORS，JSON 请求不附带 OSS Cookie；查询签名负责鉴权，仍须匹配 CORS。新标签能打开图片不能证明 Canvas 可读。

工具默认 dry run 无网络；`--inspect` 只读完整云配置和合并方案；`--apply` 先读再追加缺失来源的 GET/HEAD 规则。保留全部旧规则和已有 ResponseVary；原配置没有该字段时设置 true。SDK 6.23.0 高层 CORS 方法丢弃 ResponseVary，所以使用同一 SDK 的签名请求层处理官方 REST XML。仅 `NoSuchCORSConfiguration` 视为空；权限和网络错误均停止。超过 20 条、16 KiB XML 或出现未知字段时拒绝写入，绝不通过删旧规则满足限制。工具不调用 ACL 或 Bucket policy API。整套规则是覆盖写入，应避免多人同时修改。

临时测试端口需明确追加，例如 `node scripts/configure-oss-cors.mjs --inspect --origin http://localhost:18151`，审阅后以相同 `--origin` 配合 `--apply`。不自动允许任意端口，不增加 PUT/DELETE 或通配 Origin。

若使用 CDN，最终 CDN 域名也必须正确配置或透传 CORS；更新后清理旧缓存。不要开启改变图片正文、尺寸、格式的自动图片处理，前端按构建字节数据验证资源。OSS 存储、请求、下载流量与 CDN 下行/回源分别计费。

## 验收

本地开发先 `npm run build` 生成服务端资源清单，再开两个终端：第一个运行 `npm run serve:art`（默认 3001），第二个运行 `npm run dev`（默认 3000）。Vite 将 `/api/art-urls` 代理到本地签名服务；浏览器访问 `http://localhost:3000`。开发模式也必须配置对应 OSS CORS Origin。改动美术后重新 build 并重启签名服务以更新白名单。

`/api/art-urls` 应返回 `mode: signed`，URL 含 `x-oss-signature-version=OSS4-HMAC-SHA256` 与 `x-oss-expires`；不要在公共日志记录完整签名 URL。图片和 JSON 在 Network 中应直连 OSS，响应含匹配游戏 Origin 的 `Access-Control-Allow-Origin`。确认大厅和战斗资源完整，控制台无 CORS 或 Canvas 污染错误；裸私有对象 URL 返回 403。

任何持有有效签名 URL 的人均可在到期前读取对应资源；游戏 API 提供播放所需的临时读取权限，不等于用户登录授权。独立工具回归：`node scripts/configure-oss-cors.test.mjs`。

官方资料：[Node.js V4 签名下载](https://www.alibabacloud.com/help/en/oss/developer-reference/download-objects-using-a-presigned-url-generated-with-oss-sdk-for-node-js)、[PutBucketCors（覆盖、20 条、ResponseVary）](https://help.aliyun.com/zh/oss/developer-reference/putbucketcors)、[CORS 控制台字段](https://www.alibabacloud.com/help/en/oss/user-guide/configure-cross-origin-resource-sharing/)、[SDK CORS 源码](https://github.com/ali-sdk/ali-oss/blob/master/lib/bucket.js)、[ossutil 上传](https://help.aliyun.com/zh/oss/developer-reference/cp-upload-file)。
