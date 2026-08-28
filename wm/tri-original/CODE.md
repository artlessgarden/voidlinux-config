# tri — 代码结构与实现备忘

---

## 文件

| 文件 | 作用 |
|------|------|
| `src/main.zig` | 布局、焦点、键鼠 |
| `src/titlebar.zig` | chip（序号左、标题右；列镜像时反过来） |
| `src/config.zig` | 读 `config` |
| `config` | 默认配置 |

---

## 状态

```text
master, stack[10], expanded, focus_side, stack_on_left, monocle, special_0
```

- `special_0`：`Super+` toggle；`stack_len < 2` 时强制 false  
- `layoutManage`：`special0Active` 时 `stack[0]` 顶 band + `layoutStackRow(..., start: 1)`  
- `focusOnSlot0`：`focus_side==stack && expanded==0` → 顶 band 用满剩余高度  

---

## 键位

- `Super+0…9` → `expand_slot_0…9`  
- `Super+Shift+0…9` → `move_slot_0…9`  
- `Super+grave` → `toggle_special_0`  

---

## chip

- `setChip(slot_ch, title, kind)`；`stack_on_left` 时序号与标题左右对调  
- 无 `chip_align` 配置  

---

## 构建

```bash
./rebuild.sh   # → zig-out/bin/tri
```
