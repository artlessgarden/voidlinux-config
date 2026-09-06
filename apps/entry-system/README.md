# Entry System

最小标准：

```text
很多条目, 能搜
```

这是 SQLite-first 的第一版实现：

```text
server/   Hono + better-sqlite3 + WebSocket + mDNS
client/   React + Vite Web UI
android/  Android 原生 Kotlin + SQLite + NSD + HTTP sync
docs/     同步标准
```

## Server + Web

安装依赖：

```sh
npm run install:all
```

构建 Web：

```sh
npm run build
```

启动 server：

```sh
npm run start --prefix server
```

启动后终端会打印局域网地址，例如：

```text
entry-system server: http://192.168.x.x:38521
```

浏览器打开这个地址即可使用 Web UI。

SQLite 数据库默认在：

```text
server/data/entry-system.db
```

## Android

Debug APK：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

构建：

```sh
npm run android:build
```

安装：

```sh
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Android app 会用 NSD 自动发现局域网里的 `_entry-system._tcp` 服务。手机和电脑需要在同一个 Wi-Fi，或手机开热点给电脑连接。

## 同步

同步不传 SQLite 文件，只传 op log：

```text
client outbox -> server ops -> clients pull
```

server 是全局顺序的裁判。Android 离线时可以本地写入，连上 server 后会 push outbox 并 pull server ops。

第一版 Android 使用 HTTP 轮询同步；Web 使用 WebSocket 实时刷新。

## 当前限制

- 第一版是纯文本编辑，不是富文本。
- Android 暂时没有 WebSocket，只做 NSD + HTTP sync 轮询。
- 冲突策略在 server 端保留 conflict copy，不做 CRDT。
- 没有账号、没有配对码，适合个人局域网使用，不要直接暴露公网。
