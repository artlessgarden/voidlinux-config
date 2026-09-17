# Void Linux configuration

两台笔记本共用的 Niri 配置。按功能选脚本手动运行，不使用 flow、总入口、设备检测、配置生成器或自动依赖调度。

## 目录与运行方式

- `modules/`：通用功能，选择需要的运行；Mihomo 也通用，不用代理的设备不运行。
- `modules/asus/`、`modules/msi/`：确实不同的硬件、GPU、电源和引导设置。
- `root/etc/`：安装到 /etc 的配置文件，模块按需复制，不整体覆盖 /etc。
- `root/home/`：链接到当前用户的配置文件，修改仓库文件就是修改实际配置。
- 根目录 `xray.md`、`waydroid.md`：手动安装说明。
- `apps/`：个人项目，原样保留，不参与桌面安装。

在普通用户终端执行，例如：
```sh
sh modules/lf.sh
sh modules/mihomo.sh
sh modules/asus/hardware.sh
```
每个脚本注明功能、前提和生效方式，并自行安装该功能的软件包、链接对应配置、设置必要服务。不会运行其他模块，不默认更新整个系统，也不改其他设备配置。重复运行可更新安装和链接。已有真实配置目录不会强行覆盖：链接遇到实体目录会报错，先自行备份再处理。

密码、SSH 密钥、网络凭据、个人文档、历史、缓存、浏览器登录和 Mihomo 节点都留在仓库外。不自动提交或推送。

## 功能索引

| 脚本 | 内容／前提 |
| --- | --- |
| hostname | 首次装机补齐 hosts；先设置 /etc/hostname |
| repositories | Fastly 主源及 nonfree |
| sudo | 当前用户免密码 sudo；个人设备权限取舍 |
| shell | Bash、历史、补全、fd/fzf/rg、htop、fastfetch、查包及 xbg 更新命令 |
| fonts | Inconsolata、文泉驿和 fontconfig |
| terminal | Alacritty |
| time | chrony 时间同步及服务 |
| keyd | 原有键盘映射及服务 |
| mouseless | 官方 x86_64 二进制、用户 input/uinput 权限；Niri 用户自启 |
| input-method | Fcitx5/Rime、英文默认和 Nord 主题 |
| niri | Niri/dbus/seatd、壁纸、色温、布局、亮度键；下面各桌面功能按需先安装 |
| idle-lock | 180 秒锁屏、240 秒关闭屏幕；不自动休眠；依赖 Niri 自启 |
| screenshot | grim/slurp/Swappy/wl-clipboard；依赖 Niri 快捷键 |
| launcher | Fuzzel；依赖终端及 Niri Mod+Space |
| audio | PipeWire/WirePlumber/PulseAudio 接口；由 Niri 启动用户进程 |
| bluetooth | BlueZ 和蓝牙音频插件；耳机需要 audio |
| wifi | wpa_supplicant、dhcpcd、iw；凭据本机填写 |
| lf | LF、预览、搜索、回收站、压缩、portal 文件选择器；依赖终端及 Vis |
| vis | 官方 Git master 完整构建与配置；不安装 XBPS Vis |
| qutebrowser | qute、硬解 QtWebEngine 二进制适配及完整配置；x86_64 glibc Void |
| mimeapps | 仅首次初始化打开方式；默认 qute，已有本机选择不覆盖 |
| optional-editors | 只链接 Emacs/Nvim，不安装应用 |
| mihomo | 官方通用二进制、私有配置、runit、mihomoctl；需要时才运行 |

初次完整桌面需要自行先选好包源、终端、字体、输入、音频、锁屏、启动器和 Mouseless 等，再运行 niri；硬件模块按设备选择。`ni` 在 TTY 中用 `dbus-run-session niri --session` 启动会话。用户组和自启变化需退出整个会话重新登录，不是只关闭终端。配置通常自动重载，驱动、模块参数、微码及 GRUB 在下次重启生效。

模块之间的公共依赖允许重复声明，XBPS 会跳过已安装的；没有统一装包阶段。Niri 的通用配置保存现有快捷键及各功能的启动引用，删掉某个功能时也需移除对应引用，不做额外配置层。

## 设备差异

ASUS：
- hardware：AMD Mesa、VA-API、Vulkan。
- gpu：ASUS 固件独显开关，默认关闭；接口不存在会退出，不回退到黑名单。
- power：80% 电池上限、quiet；安装本机 rc.local 开机入口。
- wifi：本机 wlp99s0 / iwlwifi 参数和唤醒重连；开机入口依赖 power。
- boot：本机 GRUB/EFI 启动顺序；运行前检查 efibootmgr 编号，不能照抄到陌生机器。

MSI：
- hardware：Intel 图形、微码及 SOF 音频固件；intel-ucode 需要 nonfree。
- power：TLP 安静电源设置。
- boot：本机 GRUB/EFI 启动顺序；先核对引导项。

内屏设置仍在 Niri 中按精确 EDID 分别匹配：两条规则不会互相覆盖，其他输出使用 Niri 默认设置，无需机器预设或额外屏幕模块。亮度和音量键每次 1%。

集中日志属于本机临时排障，不纳入装机配置。模块不清旧配置、不改 TTY 数量、不批量开关独立日志；当前本机已有服务状态不会因为重组自动改变。

## LF 与打开方式

完整 LF 配置及专用脚本都在 `root/home/.config/lf/`：
- `lfrc`：日常操作；Esc 取消选择、文件剪贴板及临时界面状态。
- `preview`：预览。
- `xdg-file.lfrc`、`xdg-directory.lfrc`：文件选择器确认操作。
- `scripts/detach`、`open-with`、`archive`、`chooser`：LF 专用辅助脚本，不链接到全局 PATH。

只保留 portal 文件选择器，不提供 FileManager1 精确定位服务。`lf.desktop` 和两处 portal 配置是系统入口，必须放在各自规定位置。LF 普通文本（含 CSV/TSV）用 Vis；图片用 imv，音视频用 mpv，PDF 用 zathura。退出 Vis 返回 LF；Ctrl-f 找路径，Ctrl-g 搜内容。

`mimeapps.list` 首次从示例复制，之后保持本机独立；不会每次设置默认浏览器。Helium、Firefox、Chrome 不纳入安装、快捷键或更新，不卸载本机现有浏览器、不动迁移中的用户数据。qute 仍用 Mod+x，其他已安装应用从 Fuzzel 打开。

## 按需安装、默认不装的依赖

| 用途 | 手动安装 |
| --- | --- |
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

Vis 按 `=` 手动格式化，不自动保存；缺少 formatter 时保留原文并提示失败。完整主题、状态、输入法、剪贴板、补全、光标记忆及并发编辑提示保持。构建在 `/tmp/vis.*`，安装时写 `~/.local/bin/vis.new`，最后在同目录原子改名，不覆盖正在运行的程序到一半。

下载与构建使用专属 `/tmp/{vis,mouseless,mihomo,qutebrowser}.*`，不主动清理，可能占用磁盘直到系统清理。Vis 源码保留在 `~/.local/src/vis`，qute 下载缓存和本地 XBPS 包也保留以便复用；这些不是临时清理模块。失败留下的 `vis.new` 下次安装覆盖。

## Wi-Fi 凭据

本机单独维护 `/etc/wpa_supplicant/wpa_supplicant.conf`，不入库。可用 `wpa_passphrase SSID` 交互输入密码生成条目，删除输出中的明文密码注释后以 root、600 权限保存，再运行 wifi 模块。不要把含密码的命令提交到配置或历史。

## 跳板

不覆盖 ssh/scp，不保留 sshw/scpw 或确认提示。全手动：
```sh
ssh -J 跳板用户@跳板地址 目标用户@目标地址
scp -o ProxyJump=跳板用户@跳板地址 本地文件 目标用户@目标地址:/路径
```
SSH 密钥及已有私有 ~/.ssh/config 不动。

## Mihomo
首次 `sh modules/mihomo.sh` 只创建 /etc/mihomo/config.yaml 示例，不启用未填写的代理。填入完整节点并删除 REPLACE_STATIC_NODE_VALUES 后再次运行，验证后启用服务；重跑保留私有节点。可用 `MIHOMO_BIN=/路径/mihomo sh modules/mihomo.sh` 安装本地二进制。

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
`sh modules/qutebrowser.sh` 将验证过的 Homebrew Linux QtWebEngine 重新打包成原生 qt6-webengine XBPS，再安装 Void qutebrowser；不安装 Homebrew，不编译 Qt。SHA256 校验保持，其他 Qt 库仍使用 Void 包。


完整 qute 配置、书签、quickmarks、自定义首页、Bilibili 推荐/IP 脚本和输入状态处理保持原样。历史、cookies、会话和 App 授权凭据在仓库外。配置改动可在 qute 执行 `:config-source --clear`；Qt 参数或内核更换需重新打开浏览器。首次及规则更新执行 `:adblock-update`。内部 API、跨发行版 ABI 和私有网站接口仍可能随上游改变，硬解是否生效须以实际播放解码器为准。
