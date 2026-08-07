# ASUS TX Air FA401KM — Void Linux

开箱步骤见 [`flow.txt`](flow.txt)。配置风格对齐 msi-void 的编号脚本。

## void-installer 备忘

```text
login: root / voidlinux
Keyboard: us
Network: wlp99s0 + WPA
Hostname: xiangVoid
Locale: en_US.UTF-8
Timezone: Asia -> Bangkok
User: xiang（保留默认组）
BootLoader: /dev/nvme0n1，graphical terminal Yes
```

现有 GPT（勿格式化 EFI）：

```text
/dev/nvme0n1p1  1G    EFI  → /boot/efi  Create new filesystem: No
/dev/nvme0n1p4  128G  Void → /           ext4，Create new filesystem: Yes
```

无 swap、无单独 `/home`。Settings 里确认只有根分区是 `NEW FILESYSTEM` 再 Install。

## 装完后

```sh
sudo xbps-install -Syu
sudo xbps-install -S git
git clone https://github.com/artlessgarden/voidlinux-config.git ~/voidlinux-config
cd ~/voidlinux-config
# 按 flow.txt 依次执行
```

默认浏览器为 qutebrowser（`Mod+c`）。核显用 AMD `amdgpu`（nouveau 已屏蔽）。
默认进 Windows；Esc 选 `void_grub` 进 Void，tty1 执行 `ni`。

### qutebrowser 速查

| 键 | 作用 |
|---|---|
| `,p` | 离线学习页（原文/译文/双语）→ `~/Documents/qute-learn/` |
| `,e` | hint：在元素下方实时插入译文 |
| `,y` | 选区 → 底栏 + 剪贴板 |
| `v` | hint 文本元素 → caret |
| `f` / `F` | JS 真点可点元素（含 cursor:pointer）；`F` 新标签 |
| Esc | 回 normal 并切英文键盘（fcitx5） |

可选：`export QUTE_DEEPL_KEY='…:fx'` 走 DeepL，否则用 Google gtx。  
广告：EasyList + China + Fanboy Annoyance（`python3-adblock`）。  
油猴：`~/.config/qutebrowser/greasemonkey/`（如 bilibili-ip）。
