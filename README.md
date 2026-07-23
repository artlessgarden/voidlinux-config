# ASUS TX Air FA401KM 安装 Void Linux

使用 Void Linux `x86_64 glibc base` 镜像安装最小 Niri 系统。

## 1. U 盘安装

启动 Base 镜像后登录：

```text
login: root
password: voidlinux
```

运行：

```sh
void-installer
```

安装器设置：

```text
Keyboard: us

Network:
  选择无线网卡 wlp99s0
  输入 SSID
  Encryption: wpa
  输入 Wi-Fi 密码

Source: Network
Mirror: 选择可用且较近的镜像
Hostname: xiangVoid
Locale: en_US.UTF-8
Timezone: Asia -> Bangkok
RootPassword: 设置 root 密码

UserAccount:
  Login name: xiang
  Display name: xiang
  Groups: 保留默认

BootLoader:
  Disk: /dev/nvme0n1
  Use a graphical terminal?: Yes
```

分区使用现有 GPT：

```text
/dev/nvme0n1p1  1G    已有 EFI System
/dev/nvme0n1p4  128G  Void 根分区
```

`Filesystems`：

```text
/dev/nvme0n1p4
  Filesystem: ext4
  Mount point: /
  Create new filesystem: Yes

/dev/nvme0n1p1
  Filesystem: vfat
  Mount point: /boot/efi
  Create new filesystem: No
```

EFI 分区的 `Create new filesystem` 一定选 `No`，否则会删除已有系统的
引导文件。不创建 swap，不单独划分 `/home`。

通过 `Settings` 确认只有根分区显示 `NEW FILESYSTEM`，然后选择
`Install` 并重启。

## 2. 更新并下载配置

登录普通用户后：

```sh
sudo xbps-install -Syu
sudo xbps-install -S git
git clone https://github.com/artlessgarden/voidlinux-config.git ~/voidlinux-config
cd ~/voidlinux-config
```

## 3. 配置系统

运行基础配置：

```sh
sh setup.sh
```

它依次运行：

```sh
# 安装免密 sudo 规则（这里输入最后一次密码）
sh links.sh
sh packages.sh
sh services.sh
sh hardware.sh
```

- `links.sh`：将仓库配置软链接到 Home 和 `/etc/keyd`。
- `setup.sh` 首先安装独立的 sudoers 规则，后续命令不再询问密码。
- `packages.sh`：只安装启动 Niri 所需的基础软件。
- `services.sh`：启用五个服务，只保留 tty1、tty2，并加入 `_seatd` 组。
- `hardware.sh`：加入本机开机参数并更新 GRUB。

## 4. 重启并启动 Niri

```sh
sudo reboot
```

登录 tty1：

```sh
ni
```

进入 Niri 后安装日常应用：

```sh
cd ~/voidlinux-config
sh apps.sh
sh helium.sh
```

- `apps.sh`：安装通知、启动器、截图、文件、媒体、PDF 和命令行工具。
- `helium.sh`：下载最新正式版 Helium，验证成功后删除旧版并替换。

退出并重新进入 Niri 后，Mako 等新安装的自启程序开始运行。

`ni` 使用 `dbus-run-session niri --session`。Niri 和 Helium 都指定 AMD
`renderD129`，避免默认探测 NVIDIA `renderD128` 导致启动失败或延迟。
