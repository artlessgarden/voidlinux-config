# tri — 代码结构与实现备忘

---

## 文件

| 文件 | 作用 |
|------|------|
| `src/main.zig` | 布局、焦点、键鼠 |
| `src/titlebar.zig` | chip（序号左、标题右；列镜像时反过来） |
| `src/config.zig` | 读 `config` |
| `src/bindings.zig` | 默认键位、配置解析与冲突处理 |
| `config` | 默认配置 |

---

## 状态

```text
master, stack[9], expanded, focus_side, stack_on_left, monocle
```

- `layoutManage`：右列始终只有一个展开窗，其余槽显示 chip

---

## 键位

当前完整默认值写在 `config` 的 `bind.*` 中；代码内保留相同默认值，删掉配置项也能正常使用。

- `Super+a / c / v` → 终端 / 浏览器 / 备忘
- `Super+w` → 全屏截图
- `Super+Shift+q / Super+Ctrl+Shift+q` → 关闭窗口 / 退出会话
- `Super+s / e / d` → 切换焦点列 / 上一个 / 下一个
- `Super+Shift+s / e / d` → 主窗与展开窗交换 / 向上 / 向下移动
- `Super+f` → Monocle（只改变 WM 布局）
- 应用可自行切换全屏界面，但 WM 不改变窗口尺寸和位置
- `Super+r / Super+Shift+r` → 交换左右宽度 / 镜像列位置
- `Super+1…9` → `expand_slot_1…9`
- `Super+Shift+1…9` → `move_slot_1…9`
- `Super+Escape` → 开关屏幕；亮度、音量和静音使用硬件键

覆盖格式：`bind.close = Super+Shift+q`。修饰键支持 `Super/Ctrl/Shift/Alt`；写 `none` 可禁用动作。无效值回退到该动作默认键，重复组合只启用动作表中靠前的一项并记录警告，避免坏配置终止 WM。

---

## chip

- `setChip(slot_ch, title, kind)`；`stack_on_left` 时序号与标题左右对调  
- 无 `chip_align` 配置  

---

## 构建

```bash
./rebuild.sh   # → zig-out/bin/tri
```
