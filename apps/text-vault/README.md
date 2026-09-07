# Text Vault

一个搜索优先、只在浏览器内解密的纯文本工具。所有条目以平级全文河流展示；编辑或新增后按 `Esc`，才进入页面内存并立即加密保存。其他已打开页面和设备通过增量读取看到变化。

## 当前功能

- 无标题纯文本条目，按创建时间从旧到新平铺全文
- 电脑和手机使用同一种河流界面
- 搜索保存在 URL fragment 中，一个浏览器标签页就是一个查询现场
- `j` / `k` 选择条目，`i` / `Enter` 原地编辑，`o` 新增
- `/` 实时搜索，`:` 输入命令，`Esc` 提交编辑或退出输入模式
- 选中正文后按 `Ctrl+Enter`（macOS 为 `Cmd+Enter`）在新标签搜索
- `:changepwd` 与右上角齿轮打开同一个独立改密对话框
- `Esc` 后立即保存，每两秒增量读取一次
- 同一浏览器已有页面解锁时，新标签页自动取得内存密钥
- 同一条目发生并发编辑时保留冲突副本，不静默覆盖
- 9 位时间顺序 memo ID，SQLite 主键继续提供唯一性保护
- PBKDF2-SHA-256 + AES-256-GCM 客户端加密；服务器收不到主密码和正文
- SQLite WAL、对象历史版本、乐观并发、事务提交和一致性备份

这是在线优先的单用户版本。当前不支持离线、附件、表格、多人共同编辑或忘记主密码后的恢复。

## 本地运行

生产只需要 Go；Node.js 和 Chrome 只用于测试。

```sh
cd apps/text-vault
go run ./cmd/text-vault serve \
  -listen 127.0.0.1:8080 \
  -database ./data/text-vault.db \
  -secure-cookie=false
```

打开 `http://127.0.0.1:8080`。首次进入时创建至少 16 个字符的主密码。公网部署必须使用 HTTPS，并删除 `-secure-cookie=false`。

### 旧开发数据库

本版条目 ID 改为 9 位 memo ID，没有加入旧格式兼容层。旧数据库里如果只有测试数据，停止程序后直接换一个新的数据库路径最简单：

```sh
go run ./cmd/text-vault serve \
  -listen 127.0.0.1:8080 \
  -database ./data/text-vault-v2.db \
  -secure-cookie=false
```

原数据库不会被修改，可以继续作为备份保留。若里面已有需要的数据，先用旧版本解锁并导出明文，再手工录入或编写一次性转换脚本；当前代码有意不承担永久迁移逻辑。

## 使用

页面默认处于 Normal。底部输入框承载新增、搜索和命令三种用途：

```text
o           新增条目；输入后 Esc 创建并保存
/           实时搜索；Esc 保留当前查询现场
:           输入命令
:changepwd  打开独立的改密对话框
```

Normal 下用 `j` / `k` 移动，`i` 或 `Enter` 编辑当前条目。只有 `Esc` 会提交 Edit/Add 草稿；点击页面其他地方不会提交或切换正在编辑的条目。浏览器崩溃时，未按 `Esc` 的草稿可能丢失。

顶部 4px 细条表示全局状态：绿色为 Edit/Add 草稿，灰色为正在保存，与背景融为一体表示服务器已确认，红色表示离线、同步失败或冲突。它没有可点击操作。

搜索词位于 `#q=...`，不会随 HTTP 请求发送给 Go 或 Caddy，但浏览器历史、会话恢复、扩展和当前页面脚本仍可能读取它。不要在搜索框输入密码或密钥。

自动解锁只发生在同源、同浏览器存储分区的仍存活页面之间。没有已解锁页面、换浏览器、换配置目录、隐私窗口或手机冻结后台页面时，会正常要求输入主密码。密钥不写入 URL、localStorage、sessionStorage 或 IndexedDB。

## 构建与测试

```sh
CGO_ENABLED=0 go build -trimpath -o text-vault ./cmd/text-vault
go test ./...
npm install
npm run test:unit
npm run test:e2e
```

VanJS 已固定在 `web/vendor`；生产二进制不访问 CDN，也不需要 Node.js。

## 备份与恢复

运行中的服务可以生成一致性 SQLite 快照：

```sh
./text-vault backup \
  -database ./data/text-vault.db \
  -output ./backups/text-vault-2026-09-06.db
```

目标文件必须不存在，避免意外覆盖。备份仍是密文，恢复后必须使用对应的主密码。建议保留多个日期、至少两个独立位置的备份，并定期实际演练解锁。

## 生产部署

程序只监听回环地址，由 Caddy 提供 HTTPS。示例见 `deploy/Caddyfile.example` 和 `deploy/runit/run`。

- 使用专用低权限用户和权限为 `0700` 的数据目录。
- 公网保持 `-secure-cookie=true`。
- 独立备份 SQLite 数据库，不把浏览器中已解锁的明文当作安全边界。

## 数据边界

SQLite 保存加密对象、认证凭据散列、版本、类型、更新时间和加密参数。条目正文、主密码、搜索词和数据密钥明文不会写入数据库。

代码仍保持“数据 → 查询 → 视图”的边界。`entry` 是当前数据，全文匹配是当前查询，河流是当前视图；以后可以沿同一边界加入 TSV、附件引用和专用查看器。
