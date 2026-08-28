# tri

tri 是面向 River 0.4 的个人窗口管理器：左侧主窗口，右侧为一个展开窗口与若干标题 chip 组成的手风琴栈。

## 支持边界

tri 冻结现有功能，不计划加入 workspace、IPC、动画、窗口规则或传统浮动布局。正式支持单输出、单 seat；多输出环境只使用 River 报告的第一个有效输出。

完整键位见 `CODE.md`，布局语义见 `DESIGN.md`。

## 构建

```sh
./rebuild.sh
```

脚本先运行单元测试，再在仓库内的临时目录生成 ReleaseSafe 候选文件。构建成功后保存当前 `zig-out/bin/tri` 为 `tri.previous`，最后通过同一文件系统上的重命名原子替换日用二进制。

键位可在 `config` 通过 `bind.<action> = Super+key` 覆盖；缺失项使用内建默认值，`none` 禁用对应动作。完整默认表见 `config`。

## 版本策略

固定已经实机验证的 River 0.4、Zig 0.16 和 `build.zig.zon` 中的依赖提交。依赖升级应单独进行，并在进入日用会话前完成测试和冒烟验证。

## River 实机会话检查

自动测试不能模拟 compositor。更新日用版本前应在可恢复的 River 会话中检查：

- 启动、退出以及 WM 重新启动后已有窗口仍可管理；
- 新增和关闭 master、展开窗及折叠窗；
- `Super+s/e/d`、对应的 Shift 移动操作及数字槽位；
- `Super+f` 和列镜像；
- 点击每个 chip 后展开和焦点同步；
- 连续改变窗口标题及快速展开多个槽时 chip 无闪退或绘制损坏；
- 锁屏、熄屏、恢复以及触摸板和音量/亮度按键。

发生问题时先运行 `zig-out/bin/tri.previous`，并保留终端或 journal 中的 tri 日志。
