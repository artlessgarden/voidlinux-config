# 条目系统同步标准

最小标准：

```text
很多条目, 能搜
```

SQLite 版只定义两个核心对象：

```text
Entry = 一条内容
Op = 对 Entry 的一次变更
```

同步不传数据库文件，只传 `Op`。

## Entry

```text
id          全局唯一 id
content     文本内容
created_at  创建时间, epoch millis
updated_at  更新时间, epoch millis
deleted     软删除标记
version     server 确认后的版本号
```

## Op

```text
op_id        全局唯一 id
device_id    产生操作的设备
client_seq   设备内递增序号
server_seq   server 接收后分配的全局递增序号
type         create_entry | update_entry | delete_entry
entry_id     目标 Entry
base_version 客户端编辑时看到的版本
payload      JSON
created_at   客户端创建时间
```

## 同步

server 是全局顺序的裁判。客户端可以离线写入本地 SQLite 和 outbox。

恢复连接后：

```text
1. pull: GET /api/sync/pull?after=<last_server_seq>
2. push: POST /api/sync/push  上传本地 outbox
3. pull: 再拉一次补齐
4. 在线时继续通过 WebSocket/轮询接收新 op
```

## 冲突

第一版不做 CRDT。规则是：

```text
如果 update 的 base_version 等于当前 entry.version:
  正常更新

如果 base_version 小于当前 entry.version:
  不覆盖当前内容
  创建一条 conflict copy entry
```

这保证：

```text
0 数据丢失
不用弹复杂冲突解决 UI
最终所有设备一致
```

## 发现

server 在局域网用 mDNS 广播：

```text
_entry-system._tcp.local
```

Android 用 NSD 自动发现。同一 Wi-Fi 或手机热点下不需要账号和配对码。
