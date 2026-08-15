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

默认浏览器为 Helium（`Mod+c` → `helium`）。二进制在 `~/.local/opt/helium`，数据在 `~/.config/net.imput.helium`。  
`xbg`：xbps 系统更新 + 检查/更新 Helium。核显用 AMD `amdgpu`（nouveau 已屏蔽）。  
mouseless：`~/.local/bin/mouseless`，niri 自启（无 sudo）；配置 `~/.config/mouseless/config.yaml`。
默认进 Windows；Esc 选 `void_grub` 进 Void，tty1 执行 `ni`。
