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

配置与脚本都在 `~/.config/qutebrowser/`（`config.py`、`userscripts/`、`js/`、`greasemonkey/`）。  
`~/.local/share/qutebrowser/` 只放运行时数据（历史、缓存）；其中 `js` 是指回 config 的软链。

| 键 | 作用 |
|---|---|
| `,p` | 离线学习页（原文/译文/双语）→ `~/Documents/qute-learn/` |
| `,e` | hint：在元素下方实时插入译文 |
| `,y` | 选区 → 底栏 + 剪贴板 |
| `,d` | 切换网页 dark mode 并刷新 |
| `v` | hint 文本元素 → caret（原 `v` 直接进 caret；行选 caret 仍是 `V`） |
| `f` / `F` | JS 真点可点元素（含 cursor:pointer）；`F` 新标签 |
| Esc | 回 normal 并切英文键盘（fcitx5） |

搜索（`:open` / `o` 后）：`g` Google（默认）、`gi` 图、`d` DDG、`b` B 站、`yt` YouTube、`gh` GitHub、`w`/`we` 维基中/英、`so` SO、`mdn`、`aw` Arch Wiki、`vd` Void 文档、`xp` Void 包、`m` 地图、`tr` 网页翻译、`npm`、`py`。只打前缀（如 `o b`）开站点首页。

可选：`export QUTE_DEEPL_KEY='…:fx'` 走 DeepL，否则用 Google gtx。  
广告：EasyList + China + Fanboy Annoyance（`python3-adblock`）。  
油猴：`~/.config/qutebrowser/greasemonkey/`（如 bilibili-ip）。  
历史：启动时自动删「超过 30 天未再访问」的条目（每天最多一次）；`QUTE_HISTORY_DAYS` 改天数；手动 `:spawn --userscript history-prune --force`。  
会话：退出后下次自动恢复标签（点到才加载）；无会话时才开 startpage。最后一个标签 `d` / `ZZ` 在底栏确认后再退（页面还在）。
