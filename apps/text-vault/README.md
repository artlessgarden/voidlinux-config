# Text Vault

这是一个全新的 Node.js 版本：界面和产品交互沿用已经喜欢的 Text Vault，服务端按 Node + Hono + SQLite 重新实现。它不承担旧数据库、旧部署或旧实现迁移；`../text-vault-go/` 只是另一个并列目录。

## 运行

需要 Node 22.5 或更新版本：

```sh
npm install
npm run dev
```

打开 <http://127.0.0.1:8787>，第一次使用时创建主密码。数据库会在第一次启动后写入 `data/text-vault.sqlite`。

局域网测试：

```sh
HOST=0.0.0.0 npm run dev
```

然后在手机或另一台设备打开这台电脑的局域网地址，例如 `http://192.168.1.20:8787`。默认只监听 `127.0.0.1`，需要局域网访问时才显式设置 `HOST=0.0.0.0`。

## 局域网 HTTPS

浏览器加密 API 要求安全上下文。项目提供了 Caddy 配置：

```sh
HOST=127.0.0.1 npm run dev
caddy run --config deploy/Caddyfile.lan
```

手机访问 <https://192.168.1.136:8443>。首次使用前，需要把 Caddy 的本地根证书安装到手机：

```text
~/.local/share/caddy/pki/authorities/local/root.crt
```

如果你的局域网地址变化，把 `deploy/Caddyfile.lan` 里的 IP 一起改掉。

## 结构

```text
src/server.js   Hono 路由、认证入口、静态文件和 SSE
src/db.js       SQLite schema、对象版本、generation 和事务
src/auth.js     内存 session、Cookie token 和 CSRF token
web/            无构建的 HTML/CSS/VanJS 前端
```

数据密钥和正文仍只在浏览器解密；服务器保存 vault header、认证 credential 的 SHA-256 和加密对象。普通同步通过 `/api/changes`，SSE 只发送 generation 变化提醒。
