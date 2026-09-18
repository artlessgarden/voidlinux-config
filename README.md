# Void Linux configuration

两台笔记本共用的 Niri 配置。按重装步骤手动运行，不使用总入口或自动依赖调度。

## 目录与运行方式

| 阶段／脚本 | 内容 |
| --- | --- |
| `modules/01-system.sh` | 软件源、hostname、sudo、Shell、时间同步、Wi-Fi |
| `modules/02-hardware/asus.sh` | ASUS 图形、独显开关、电源、Wi-Fi 特殊设置 |
| `modules/02-hardware/msi.sh` | MSI 图形、微码、固件、电源 |
| `modules/03-desktop.sh` | Niri、终端、字体、输入法、keyd、音频蓝牙、idle/锁屏、截图、Fuzzel、Mouseless |
| `modules/04-apps/lf.sh` | LF、portal 文件选择器、默认打开方式 |
| `modules/04-apps/vis.sh` | 官方 Git Vis，本地 XBPS 构建安装 |
| `modules/04-apps/qutebrowser.sh` | qute 及硬解 QtWebEngine |
| `modules/04-apps/editors.sh` | 只链接 Emacs/Nvim，不安装应用 |
| `modules/05-optional/mihomo.sh` | 需要代理才运行，也可提前运行 |

先完成 Void 基础安装，以普通用户登录，确保 sudo 和临时网络可用，设置好 `/etc/hostname` 和本机 Wi-Fi 凭据。进入仓库后执行：

```sh
sh modules/01-system.sh
sh modules/02-hardware/asus.sh  # MSI 改为 msi.sh，只选一个
sh modules/03-desktop.sh
```

退出登录再重新登录，使用户组生效；涉及驱动、固件或内核参数时重启。TTY 运行 `ni` 进入 Niri，再按需安装应用：

```sh
sh modules/04-apps/vis.sh
sh modules/04-apps/lf.sh
sh modules/04-apps/qutebrowser.sh
```

编号只说明通常顺序，不是强制流程。应用快捷键在安装对应应用后可用。GRUB 独立放在 `modules/02-hardware/asus/boot.sh` 和 `modules/02-hardware/msi/boot.sh`，不随硬件阶段执行，运行前必须核对本机引导项。

每个脚本直接包含该阶段操作，不调用其他模块。重复运行会重新应用配置：系统阶段会重写 hosts；桌面阶段会重载 keyd、更新 Mouseless。平时更新 Vis 或 qute，只运行对应脚本，不必重跑桌面阶段。

- `root/etc/`：按模块复制到 /etc，不整体覆盖。
- `root/home/`：链接到当前用户；路径未因模块重组改变，现有链接继续有效。
- `xray.md`、`waydroid.md`：手动安装说明。
- `apps/`：个人项目，不参与桌面安装。

已有实体配置目录一般不会强行覆盖；Emacs、qute 和 htop 的链接迁移会保留备份。密码、SSH 密钥、网络凭据、历史、缓存、浏览器登录和 Mihomo 节点留在仓库外。不自动提交或推送。

## 设备差异

ASUS：
- hardware：AMD Mesa 和 VA-API；不默认安装 Vulkan。
- gpu：ASUS 固件独显开关，默认关闭；接口不存在会退出，不回退到黑名单。
- power：80% 电池上限、quiet；安装本机 rc.local 开机入口。
- wifi：本机 wlp99s0 / iwlwifi 参数和唤醒重连；开机入口由同一硬件脚本安装。
- boot：本机 GRUB/EFI 启动顺序；运行前检查 efibootmgr 编号，不能照抄到陌生机器。

MSI：
- hardware：Intel 图形、微码及 SOF 音频固件；直接安装 mesa-dri，不使用会带入 Vulkan 的 mesa-intel-dri 元包；intel-ucode 需要 nonfree。
- power：TLP 安静电源设置。
- boot：本机 GRUB/EFI 启动顺序；先核对引导项。

内屏设置仍在 Niri 中按精确 EDID 分别匹配：两条规则不会互相覆盖，其他输出使用 Niri 默认设置，无需机器预设或额外屏幕模块。亮度和音量键每次 1%。

当前两台不使用 NVIDIA，软件源模块安装 `ignorepkg=linux-firmware-nvidia`，避免依赖再次拉入固件。已安装的包需正常卸载，忽略依赖不等于冻结已安装版本。将来启用独显时先删除本机忽略文件及仓库对应规则，再安装固件。qute 明确安装 Qt Wayland 客户端、TLS 插件及硬解接口 libva，不依赖其他应用偶然带入；TLS 虽在定制包依赖中，当前 XBPS 仍将它列为孤立项，因此保留手动标记。不默认安装 qt6-imageformats，基础 JPEG/PNG 支持不依赖它。

集中日志属于本机临时排障，不纳入装机配置。模块不清旧配置、不改 TTY 数量、不批量开关独立日志；当前本机已有服务状态不会因为重组自动改变。

## LF 与打开方式

完整 LF 配置及专用脚本都在 `root/home/.config/lf/`：
- `lfrc`：日常操作；Esc 取消选择、文件剪贴板及临时界面状态。
- `preview`：预览。
- `xdg-file.lfrc`、`xdg-directory.lfrc`：文件选择器确认操作。
- `scripts/detach`、`open-with`、`archive`、`chooser`：LF 专用辅助脚本，不链接到全局 PATH。

只保留 LF portal 文件选择器，不安装 GTK portal 后端，也不提供 FileManager1 精确定位服务。GTK 后端原本提供的 Settings/OpenURI 等接口不再保留；Niri 的 gsettings 主题切换仍保留所需 schemas。`lf.desktop` 和两处 portal 配置是系统入口，必须放在各自规定位置。LF 普通文本（含 CSV/TSV）用 Vis；图片用 imv，音视频用 mpv，PDF 用 zathura。退出 Vis 返回 LF；Ctrl-f 找路径，Ctrl-g 搜内容。

LF 的 `D` 把选中文件或目录移到 `~/.trash`，名称末尾加删除时间，文件保留扩展名（如 `照片_20260917-130000-123456789.jpg`）。不依赖 GVfs，不永久删除或覆盖同名文件。目录按 ctime 倒序，最近移动的在前，原文件 mtime 保留；再次改名或修改属性会更新 ctime。恢复时自行移动并去掉时间后缀，不记录原路径。GVfs 的手机／网络文件访问和桌面磁盘挂载也不再提供。

`mimeapps.list` 首次从示例复制，之后保持本机独立；不会每次设置默认浏览器。Helium、Firefox、Chrome 不纳入安装、快捷键或更新，不卸载本机现有浏览器、不动迁移中的用户数据。qute 仍用 Mod+x，其他已安装应用从 Fuzzel 打开。

## 按需安装、默认不装的依赖

根目录 `packages.list` 固定记录包分组，改配置时同步维护。`xbr` 按清单顺序显示已装手动包，组名前缀可搜索；清单之外的包放在末尾，只显示包名。共享包只在首次出现的分组显示，Tab 多选、包信息预览和卸载确认保持。孤儿包仍用 `xbo` 查看。

| 用途 | 手动安装 |
| --- | --- |
| LF 文本彩色预览 | `sudo xbps-install -S bat`；未装时用 sed |
| LF 图片终端预览 | `sudo xbps-install -S chafa`；未装时显示文件类型 |
| LF 音视频信息预览 | `sudo xbps-install -S mediainfo-cli`；未装时显示文件类型 |
| LF PDF 文本预览 | `sudo xbps-install -S poppler-utils`；未装时显示文件类型 |
| LF ZIP 打包／解压 | `sudo xbps-install -S zip unzip` |
| LF 7z 解压 | `sudo xbps-install -S 7zip` |
| LF tar.xz 解压／预览 | `sudo xbps-install -S xz`；其他包可能已带入 |
| 进程查看／系统信息 | `sudo xbps-install -S htop fastfetch` |
| AMD Vulkan 应用 | `sudo xbps-install -S mesa-vulkan-radeon`；桌面和 VA-API 不需要 |
| LF 图片打开 | `sudo xbps-install -S imv` |
| LF 音视频打开 | `sudo xbps-install -S mpv`；不保留 mpv 自身配置 |
| LF PDF 打开 | `sudo xbps-install -S zathura zathura-pdf-poppler` |
| Emacs | `sudo xbps-install -S emacs-pgtk`；插件可能首次启动下载，语言工具按使用安装 |
| Neovim | `sudo xbps-install -S neovim`；插件可能首次启动下载 |
| Vis Lua 格式化 | `sudo xbps-install -S StyLua` |
| Vis Shell 格式化 | `sudo xbps-install -S shfmt` |
| Vis Python 格式化 | `sudo xbps-install -S ruff` |
| Vis Go 格式化、开发 | `sudo xbps-install -S go`，提供 gofmt |
| Vis JS/TS/HTML/CSS/JSON/YAML/Markdown 格式化 | `sudo xbps-install -S nodejs`，再 `npm install -g prettier`；.npmrc 指定用户安装目录 |
| Telegram | `sudo xbps-install -S telegram-desktop`；保留原 Niri Mod+z，不自动安装 |
| Firefox／Chrome 等迁移期浏览器 | 手动安装并从 Fuzzel 打开；不纳入公共配置 |
| Kimi CLI | 手动安装；Shell 仅保留用户目录 PATH |
| Xray 服务器 | [手动安装记录](xray.md)：curl/unzip/OpenSSL、官方安装器及核对过的发布包 |
| Waydroid | [手动安装记录](waydroid.md)：MSI 按需安装，镜像及转译依赖见文档 |
| apps 个人项目 | 各项目自身 README、package.json/go.mod 等列明开发依赖，不作为桌面依赖自动安装 |

Vis 构建只安装 GCC、make、pkg-config、binutils 和自身功能所需开发包，不安装整套 base-devel。`sh modules/04-apps/vis.sh` 获取官方 master，在 `/tmp/vis.*` 构建本地 XBPS 包，存入 `/var/cache/xbps/vis` 后安装；包记录运行依赖及源码提交号（`/usr/share/doc/vis/source-commit`），并锁定本地仓库，避免系统更新换回发行版。其他同架构 Void glibc 设备可通过 XBPS 安装生成的包，依赖由包管理器处理。旧散装文件迁移到 `~/.local/state/vis-install-backup.*`，个人配置仍独立链接，不进入包。重新打开 Vis 使用新版，不关闭已有编辑器。Vis 按 `=` 手动格式化，不自动保存；缺少 formatter 时保留原文并提示失败。完整主题、状态、输入法、剪贴板、补全、光标记忆及并发编辑提示保持。

下载与构建使用专属 `/tmp/{vis,mouseless,mihomo,qutebrowser}.*`，不主动清理，可能占用磁盘直到系统清理。Vis 源码保留在 `~/.local/src/vis`，qute 下载缓存和本地 XBPS 包也保留以便复用；这些不是临时清理模块。

## Wi-Fi 凭据

本机单独维护 `/etc/wpa_supplicant/wpa_supplicant.conf`，不入库。可用 `wpa_passphrase SSID` 交互输入密码生成条目，删除输出中的明文密码注释后以 root、600 权限保存，再运行 01-system.sh。不要把含密码的命令提交到配置或历史。

## 跳板

不覆盖 ssh/scp，不保留 sshw/scpw 或确认提示。全手动：
```sh
ssh -J 跳板用户@跳板地址 目标用户@目标地址
scp -o ProxyJump=跳板用户@跳板地址 本地文件 目标用户@目标地址:/路径
```
SSH 密钥及已有私有 ~/.ssh/config 不动。

## Mihomo
首次 `sh modules/05-optional/mihomo.sh` 只创建 /etc/mihomo/config.yaml 示例，不启用未填写的代理。填入完整节点并删除 REPLACE_STATIC_NODE_VALUES 后再次运行，验证后启用服务；重跑保留私有节点。可用 `MIHOMO_BIN=/路径/mihomo sh modules/05-optional/mihomo.sh` 安装本地二进制。

The controller is deliberately a thin wrapper over Mihomo's native API:

```sh
mihomoctl status
mihomoctl use rule split
mihomoctl use global hk
mihomoctl use global cn
mihomoctl use global 'exact node name'
mihomoctl use direct
mihomoctl nodes
mihomoctl update  # explains how static nodes are updated
mihomoctl adblock on
mihomoctl adblock off
mihomoctl adblock status
mihomoctl check
mihomoctl log
```

In the normal `rule split` mode, Mihomo's TUN sends Firefox, Google Chrome and
Telegram through the split rules (China through `国内`, everything else
through `香港`). Other applications fall through to `DIRECT`. Use
`mihomoctl use global cn` or `mihomoctl use global hk` temporarily when the
split mode is unsuitable, then restore it with `mihomoctl use rule split`.
In split mode, `GEOSITE,category-ads-all` provides lightweight blocking for
the three work applications. `mihomoctl adblock off` disables that rule until
Mihomo restarts; `mihomoctl adblock on` enables it again.

进程管理用 runit：`sudo sv up/down/restart mihomo`。这些是用户按需执行的命令，不是自动安装流程。

## qutebrowser 内核及配置
`sh modules/04-apps/qutebrowser.sh` 将验证过的 Homebrew Linux QtWebEngine 重新打包成原生 qt6-webengine XBPS，再安装 Void qutebrowser；不安装 Homebrew，不编译 Qt。SHA256 校验保持，其他 Qt 库仍使用 Void 包。


完整 qute 配置、书签、quickmarks、自定义首页、Bilibili 推荐/IP 脚本和输入状态处理保持原样。历史、cookies、会话和 App 授权凭据在仓库外。配置改动可在 qute 执行 `:config-source --clear`；Qt 参数或内核更换需重新打开浏览器。首次及规则更新执行 `:adblock-update`。内部 API、跨发行版 ABI 和私有网站接口仍可能随上游改变，硬解是否生效须以实际播放解码器为准。
