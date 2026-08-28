# tri — 左主 + 右列手风琴

River ≥0.4 上的 Zig 窗口管理器。配置与二进制在 `voidlinux-config/wm/tri/`。会话 `rv` → `session.sh` → `exec zig-out/bin/tri`。

---

## 布局

- 左主 + 右列手风琴（栈最多 **10** 扇，序号 **0…9**）
- 可选 **0 槽特殊模式**（`Super+`）：`stack[0]` 在右列顶部常驻一块区域（默认 **40%** 高），像更高的 chip；**焦点在 0 上时铺满剩余**，与平时展开一样
- `stack_len < 2` 时特殊模式自动关闭；关闭后布局与原先完全一致

---

## 焦点模型

| 焦点列 | Super+e/d、Super+0…9 | Super+Shift+… |
|--------|----------------------|---------------|
| **左主** | 只改 `expanded` | 移动右列 **展开项**（e/d）或对应槽位 |
| **右列** | 改 `expanded` 且跟焦 | 移动 **当前焦点窗** |

- **Super+s**：左主 ↔ 右列  
- 点 chip：展开 + 右列焦点  

---

## 0 槽特殊模式（Super+`）

| 状态 | `stack[0]` |
|------|------------|
| 模式关 | 普通手风琴一格 |
| 模式开，焦点不在 0 | 顶 band **40%**（`slot0_ratio`） |
| 模式开，焦点在 0（右列） | **铺满剩余**（其余为 chip） |

- **Super+0…9** 对应栈槽 **0…9**  
- 开着特殊模式时，下面 1…9 手风琴逻辑不变  

---

## Monocle / 省界面

| 键 | 行为 |
|----|------|
| Super+f | Monocle |
| Super+Shift+f | 省界面（每窗独立；忽略 app 退出全屏） |

---

## 快捷键摘要

| 键 | 动作 |
|----|------|
| Super+` | 切换 0 槽特殊模式 |
| Super+0…9 | 展开/导航到对应槽 |
| Super+Shift+0…9 | 移动当前对象到槽位 |
| Super+s / e / d | 焦点列、展开 |
| Super+Shift+s / e / d | 交换主↔展开、栈内移动 |

完整键位见 `CODE.md`。

---

## 配置（`config`）

```ini
master_ratio = 0.62
slot0_ratio = 0.4
term = alacritty
browser = helium
output = eDP-1
mode = 2560x1600@60Hz
scale = 1.5
```

---

## 构建

```bash
cd ~/voidlinux-config/wm/tri && ./rebuild.sh
```
