# 镜花水月 × Tidal Echo · 前端 PWA 部署文档

手机上那一端——把它「添加到主屏幕」就是一个独立的私密聊天 App，和你电脑上的 AI 伴侣（Claude Code + channel 插件）通过你自己的 relay 后端对话。

> 这是从一对 AI 伴侣的自用系统里抽出来、**彻底脱敏**的可复用前端。没有任何域名、密钥、私人称呼写死在代码里——名字走 `CONFIG`，地址走相对路径 + 你的 nginx 前缀。

纯静态：`index.html`（聊天引擎自带全部 CSS/JS，无构建步骤）+ `moon.css` / `moon.js`（镜花水月皮肤与内页）+ `sw.js` + `manifest.webmanifest`。丢进 nginx 能跑，也能直接放 GitHub Pages。

> 这一版把外壳换成了**镜花水月**：水色玻璃、月相、日记、愿望、专注、周期、呼吸、药丸提示都做成了真页面（本地存储）；聊天仍然是 Tidal Echo 原来的引擎，走你的 relay。

---

## 0. 前置

先把 **后端** 跑起来（见 `../backend/DEPLOY.md`）：relay 在 `https://你的域名/relay` 应答、冒烟测试通过。前端只是它的客户端。

> **HTTPS 必须**：PWA 安装、Service Worker、Web Push 三者都强制要求 https。

---

## 1. 放文件

把本目录（`web/`）整个部署到你 nginx 指向的静态目录，例如 `/var/www/companion-web/`：

```bash
rsync -av web/  root@你的VPS:/var/www/companion-web/
```

nginx 把它挂在 `/chat/`（见 `../backend/nginx-companion.conf.example` 里的 `location /chat/`）。改静态文件**即时生效、无需重启**。

对外地址：`https://你的域名/chat/` → 在手机浏览器打开 → 分享菜单「添加到主屏幕」。

---

## 2. 配置（改一处就够）

打开 `index.html`，顶部 `<script>` 里有**唯一的配置块**：

```js
const CONFIG = {
  APP_NAME:   "Tidal Echo",  // App / 菜单标题（manifest 里也改一下，见下）
  AI_NAME:    "Claude",       // 你 AI 伴侣的显示名（顶栏 / 通话 / 推送 / 旁白）
  HUMAN_NAME: "你",           // 旁白里怎么称呼你（很少露出）
  SINCE:      "2026/01/01",   // 菜单页「在一起多少天」的起点 YYYY/MM/DD（留空 "" 则隐藏计数）
};
```

- `AI_NAME` 建议和后端 `relay.env` 的 `RELAY_AI_NAME` 一致（推送标题由后端发，用的是后端那个名字）。
- 顶栏名字用户还能在「个人信息」页就地改备注，存本机，不影响别人。
- 想换 App 名字：同时改 `manifest.webmanifest` 的 `name` / `short_name`，和 `sw.js` 顶部的 `AI_NAME`（推送兜底标题）。

**路径**：`const API_BASE = "/relay"` —— 同源相对路径，对应后端 `RELAY_PUBLIC_PREFIX`。若你把 API 挂在别的前缀，改这一处即可（别写死域名）。

**头像 / 图标**：`avatar-sea.png` 是默认头像（抽象海面，用户可在 App 里自己换）；`icon-192/512.png`、`apple-touch-icon.png`、`favicon.png` 是占位「潮汐」图标，换成你自己的同名文件即可。

---

## 3. 它和后端的契约（新前端必须对齐这些）

| 方向 / 事件 | 约定 |
|---|---|
| 消息方向 | `from: "human" \| "ai"`（人类 / AI） |
| 戳一戳事件 | `{ type:"reaction", id, reactions:{ai:"❤️"}, by:"ai" }` |
| API 基址 | `/relay/`（后端 `RELAY_PUBLIC_PREFIX`） |
| PWA 静态 | `/chat/`（后端 `RELAY_APP_PATH`，推送点开就回到这里） |
| 历史 / 实时 / 发送 | `GET /app/history` · `SSE /app/stream` · `POST /app/send` |
| 在线心跳 | `POST /app/ping`（前台每 60s） |
| 推送 | 公钥 `GET /app/vapid_public` · 订阅 `POST /app/subscribe` / `/app/unsubscribe` |
| 语音 / 通话 / TTS | `POST /app/voice` · `/app/call` · `/app/tts`（后端没配则自动降级） |
| 鉴权 | 每个请求带 `Authorization: Bearer <RELAY_SECRET>`；SSE 用 `?token=`（浏览器 EventSource 设不了头） |

登录页输入的「连接密钥」= 后端 `RELAY_SECRET`，存在本机 `localStorage`（key 全部以 `companion_` 开头）。

---

## 4. 主题

两套，存 `localStorage.companion_theme`，在「个人信息 → 主题」切换：

- **珍珠**（`light`，默认）—— 暖白珍珠潮汐
- **海港**（`harbor`）—— 中性冷调，适合做基调再改色

要加新主题：在 `<style>` 里照 `:root[data-theme="harbor"]{…}` 复制一段、给 `THEMES`/`WALLS` 加一项、菜单里加个按钮、配一张 `chat-xxx.webp` + `menu-xxx.webp` 壁纸即可。

---

## 5. Service Worker / 缓存（**改前端必读**）

`sw.js` 顶部：

```js
const CACHE = "companion-v1";   // ← 每次改前端都要 bump（v1 → v2 → …）
```

- 策略：导航请求 **network-first**（在线刷新即拿最新 `index.html`），其余同源 GET **cache-first**，`/relay/` 全程不拦截。
- **不 bump 版本号，已装到主屏的用户会一直停在旧壳**（预缓存的旧 `index.html` 不更新）。bump → SW 重装 → 重新 precache → activate 清旧 cache。
- 验证：在线刷新一次即为新版（SW 后台换代）；偶尔需刷第二次让 SW 完全切过去。

---

## 6. 锁屏推送（可选）

后端配好 VAPID 后（见 `../backend/DEPLOY.md` §4），在「个人信息 → 锁屏通知」开启：

- iOS 只在「添加到主屏」的 standalone PWA 里能收推送，普通 Safari 标签页不行（App 内已有提示）。
- 逻辑：只有 PWA 不在前台时，AI 的回复才推一条锁屏通知；前台开着就不打扰。

---

## 7. 这一版有什么 / 什么是本地的

菜单（左上角返回键）现在是镜花水月的主页，卡片进这些页：

| 页 | 数据在哪 | 说明 |
|---|---|---|
| 水 · 说话 | relay 后端 | 原来的聊天引擎：文字、图片、文件、语音、通话、推送 |
| 月 | 本机 | 按日期算月相，留言存本地 |
| 影 | 本机 IndexedDB | 相册，照片压缩后只存这台设备 |
| 记 | 本机 | 每天一段，输入即存 |
| 愿 / 钟 / 潮 / 息 | 本机 | 愿望、番茄钟、周期、4-7-8 呼吸 |
| 药 | 本机 + 下一句 | 挑一颗提示，随下一条消息发给 AI，不进历史 |
| 存 | 本机 | 导出 / 导入 JSON、改「在一起」的起点 |

设置页（右上角「⋮」）里新增「服务器」：换 relay 地址、测连通、换密钥。原来老师的模型 / effort / 上下文 / 终端面板仍然保留（需要后端 `api_loop.py` 才有数）。

---

## 8. 安全

- 别把填好的密钥、你的域名、真实头像/图标提交进公开仓库。
- `companion_secret` 存在用户浏览器本机；它等于后端 `RELAY_SECRET`，泄露=别人能读你们全部对话。这是单用户模型，一把钥匙代表「就你和你的 AI」。


---

## 9. 部署到 GitHub Pages（静态前端 + 远程 relay）

GitHub Pages 只托管静态文件，**没有一个同源的 `/relay`**，所以前端必须知道你的后端完整地址。

### 9.1 开启 Pages（`gh-pages` 分支）

GitHub 的 Pages 只允许从仓库根或 `/docs` 发布，而这个仓库的前端在 `web/`。所以把 `web/` 镜像到一个 `gh-pages` 分支，页面根目录就是 `web/` 的内容。

1. 打开 **Settings → Pages → Build and deployment**。
2. Source 选 **Deploy from a branch**。
3. Branch 选 **`gh-pages`**，目录 **`/ (root)`**，Save。
4. 等一分钟，地址：`https://<你的用户名>.github.io/Tidal_Echo/`

以后改完 `web/`，发布一行命令：

```bash
bash scripts/deploy-pages.sh
```

它会用 `web/` 重建 `gh-pages`（附 `.nojekyll`，不会被 Jekyll 拦），Pages 自动重新构建。

> 想用 Actions 发布也行：自己新建 `.github/workflows/pages.yml`（参考 `actions/upload-pages-artifact`，`path: ./web`），Source 选 GitHub Actions。注意推带 workflow 文件的提交，token 需要 `workflow` 权限。

### 9.2 让 relay 允许这个来源

浏览器跨域请求 + SSE 都需要后端放行。到服务器上改 `relay.env`：

```bash
RELAY_ALLOW_ORIGINS=https://<你的用户名>.github.io
```

> 只写 **origin**：`https://water1014.github.io`，**不要**带 `/Tidal_Echo`，也不要结尾斜杠。
> 改完 `systemctl restart companion-relay`，然后：

```bash
curl -i -H 'Origin: https://<你的用户名>.github.io' https://你的域名/relay/healthz | grep -i access-control
# 期望看到 access-control-allow-origin: https://<你的用户名>.github.io
```

### 9.3 第一次打开

打开 Pages 地址 → 登录页填两样东西：

- **中继地址**：`https://你的域名/relay`（必须带 `/relay`，必须是 HTTPS）
- **连接密钥**：`RELAY_SECRET`

点「连接」。连上以后地址和密钥都存在这台设备的 localStorage 里，下次直接进。

### 9.4 几个容易踩的点

- **页面是 HTTPS，后端也必须 HTTPS**：混内容会被浏览器直接拦掉，表现为「连不上」。
- **上传的图片**返回的是 `/relay/uploads/xxx`，前端会自动补上后端域名；如果后端 `RELAY_PUBLIC_PREFIX` 不是 `/relay`，记得同步改。
- **推送**：iPhone 必须先从 Safari「添加到主屏幕」，再从主屏图标打开才能订阅；后端还要配好 `VAPID_*`。
- **改了前端记得 bump** `sw.js` 里的 `CACHE`（现在是 `moonwater-v1`），否则装到主屏的旧壳会赖着不走。
- **地址不要带 `/web`**：发布源选了 `/web` 后，站点根就是 `web/` 里的内容。


---

## 10. 没有后端也能用：直连模型 / 只看本地

登录页底部给了两条不依赖 relay 的路，数据都只在这台设备上。

### 10.1 直连模型（推荐）

点「没有后端？直接用模型 API」→ 自动进聊天页并弹出设置 → 「直连模型」卡片：

1. 点 **DeepSeek** 预置（或自己填任何 OpenAI-compatible 地址）。
2. 填 **API Key**（`sk-...`），模型名会自动带出来。
3. 点「测一下」→ 看到「通了」再「保存」。

之后每条消息由浏览器**直接**发给模型接口，不经过任何服务器；对话存在本机 IndexedDB，刷新还在。

> 跨域提醒：DeepSeek 的接口允许浏览器直连（已实测 `access-control-allow-origin` 回显）。OpenAI 官方接口不返回 CORS 头，浏览器里会失败——这种情况要么换成支持 CORS 的中转地址，要么用 relay / `examples/api_loop.py`。

### 10.2 只看本地

点「只看本地」→ 聊天输入栏收起，月、影、记、愿、钟、潮、息、药、存照常可用，全部存本机。

### 10.3 三种模式怎么切

| 模式 | 入口 | 聊天 |
|---|---|---|
| 中继 relay | 登录页填地址 + 密钥 | 走后端，支持附件 / 推送 / 通话 |
| 直连 direct | 登录页第二条路，或设置 → 直连模型 | 浏览器直连模型，无附件上传 |
| 本地 local | 登录页第三条路 | 无聊天，只有本地页面 |

设置页的「直连模型」卡片里：`用中继` 清掉模式并回到登录页，`只看本地` 切到本地模式；中继模式的「服务器」卡片里点「换密钥」也会回到登录页。
