# MSI：Waydroid 安装与配置

仅在 MSI 上按需安装；不加入公共软件包或 ASUS 安装流程。
本机已于 2026-09-06 验证：Void、Intel Meteor Lake、niri、
Waydroid 1.6.3、LineageOS 20 / Android 13 VANILLA，加 libhoudini ARM 转译。
安装命令在普通用户的终端执行，需要系统权限的步骤使用 `sudo`。

## 1. 检查环境

先完成仓库公共安装流程并进入 niri，再检查：

```sh
echo "$XDG_SESSION_TYPE"  # 应为 wayland
grep CONFIG_ANDROID_BINDER /boot/config-$(uname -r)
test -e /proc/pressure/cpu && echo 'PSI 可用'
pactl info
```

内核需要 Binder IPC 和 BinderFS。本机内核已支持，不需要另装模块或换内核。
声音使用公共桌面配置的 PipeWire / PulseAudio 接口。

## 2. 安装不带 Google 服务的安卓

```sh
sudo xbps-install -S waydroid
cat /usr/share/doc/waydroid/README.voidlinux
sudo waydroid init -s VANILLA
sudo ln -sfn /etc/sv/waydroid-container /var/service/waydroid-container
sudo sv -w 30 up waydroid-container
waydroid show-full-ui
```

首次初始化会下载镜像。本次 system 和 vendor 压缩包合计约 1 GB。
`VANILLA` 不带 Google Play 服务和商店；不要选择 `GAPPS`。
若新建服务链接后提示找不到 `supervise/control`，等几秒再运行 `sv up`。
Void 使用 runit，不使用 `systemctl`。

另开终端检查：

```sh
waydroid status
sudo waydroid shell -- getprop sys.boot_completed
sudo waydroid shell -- getprop ro.build.version.release
```

应看到 Session / Container 为 `RUNNING`，启动完成值为 `1`。
本文转译步骤只适用于系统版本 `13`。

本次 VANILLA 镜像含有一个 Google 相机包。若新装后仍存在，按本机偏好停用：

```sh
sudo waydroid shell -- pm list packages com.google
# 仅在上一步列出该包时执行：
sudo waydroid shell -- pm disable-user --user 0 com.google.android.apps.googlecamera.fishfood
```

停用不删除系统镜像中的 APK。

## 3. ARM 转译：libhoudini

电脑是 x86_64。只有 ARM / ARM64 原生库的 APK 会报
`INSTALL_FAILED_NO_MATCHING_ABIS`，这不是 APK 太大，也不是缺少 Google 服务。
libhoudini 是社区脚本安装的闭源转译库；本机已验证一个此前失败的 ARM APK
可以安装并进入首次引导页，不代表所有应用功能都兼容。

准备独立 Python 环境。以下克隆命令用于首次安装；已有目录时直接进入目录。
固定到本机验证过的脚本提交，后续升级先查看上游变化。

```sh
sudo xbps-install -S git python3 python3-pip
mkdir -p "$HOME/.local/src"
git clone https://github.com/casualsnek/waydroid_script.git "$HOME/.local/src/waydroid_script"
cd "$HOME/.local/src/waydroid_script"
git checkout --detach d5289cfd8929e86e7f0dc89ecadcef8b66930eec
python3 -m venv venv
venv/bin/pip install -r requirements.txt
```

先停止安卓，再备份配置和覆盖目录。整段在同一个终端执行：

```sh
waydroid session stop
sudo sv -w 30 down waydroid-container
sudo waydroid container stop

waydroid_backup="$HOME/.local/state/waydroid-backups/before-houdini-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$waydroid_backup"
chmod 700 "$waydroid_backup"
sudo tar -C /var/lib/waydroid -cpf "$waydroid_backup/system-config.tar" \
    waydroid.cfg waydroid.prop waydroid_base.prop overlay overlay_rw
```

这是转译配置的备份，不是包含应用数据的完整安卓备份。
备份成功后再安装；仅选择 libhoudini，不安装 GApps、microG 或 Magisk：

```sh
cd "$HOME/.local/src/waydroid_script"
sudo venv/bin/python3 main.py -a 13 install libhoudini
sudo sv -w 30 up waydroid-container
waydroid show-full-ui
```

脚本会下载并校验 Android 13 对应转译库，写入系统覆盖目录，再离线刷新配置。
本机启用了 `mount_overlays = True`。仅安装 libhoudini 的路径不需要 `lzip`。

验证加载结果：

```sh
sudo waydroid shell -- getprop ro.dalvik.vm.native.bridge
sudo waydroid shell -- getprop ro.product.cpu.abilist
```

应分别包含 `libhoudini.so` 和 `arm64-v8a,armeabi-v7a`。
再安装 APK；路径有空格时用引号：

```sh
waydroid app install "$HOME/Downloads/Telegram Desktop/应用.apk"
```

安装命令可能没有输出，可用 `waydroid app list` 检查是否出现应用。
排查安卓实际安装错误：

```sh
sudo waydroid shell -- logcat -d | grep -E 'INSTALL_FAILED|PackageInstallerSession'
```

## 4. niri：全高平铺，宽度 38.2%

当前规则已保存在公共 niri 配置
[`root/home/.config/niri/config.kdl`](../root/home/.config/niri/config.kdl)，
通过 `50-link-home.sh` 链接生效。规则只匹配 Waydroid 窗口；
公共安装流程不会因此安装 Waydroid。

```kdl
window-rule {
    match app-id="^Waydroid$" title="^Waydroid$"
    open-maximized-to-edges false
    open-maximized false
    open-fullscreen false
    open-floating false
    default-column-width { proportion 0.382; }
    default-window-height { proportion 1.0; }
}
```

38.2% 与 niri 最窄预设一致，并非严格的三分之一或固定 9:16。
在 MSI 的 2560×1600、1.5 倍缩放屏幕上，实测窗口为 652×1067 逻辑像素。
Waydroid 会请求最大化，关键是 `open-maximized-to-edges false`；
仅设置安卓的 width / height 不足以处理 niri 的最大化行为。

本机不设置安卓固定分辨率。若之前设过，启动安卓后清除一次：

```sh
waydroid prop set persist.waydroid.width ""
waydroid prop set persist.waydroid.height ""
```

修改窗口规则后检查语法，再重开安卓：

```sh
niri validate
waydroid session stop
waydroid show-full-ui
```

这是启动尺寸设置，不能保证 Waydroid 支持动态拖拽缩放。

## 5. 日常启动与撤销转译

日常以普通用户运行，不要加 sudo：

```sh
waydroid show-full-ui       # 默认按上述规则平铺
waydroid app list
waydroid session stop      # 停止安卓会话
```

容器服务已加入 runit；无需每次重新初始化或重新安装转译。
如需撤销 libhoudini：

```sh
waydroid session stop
sudo sv -w 30 down waydroid-container
sudo waydroid container stop
cd "$HOME/.local/src/waydroid_script"
sudo venv/bin/python3 main.py -a 13 uninstall libhoudini
sudo sv -w 30 up waydroid-container
waydroid show-full-ui
```

若需完整还原转译前配置，先停会话和服务，将当前 `overlay`、`overlay_rw`
移到新的备份目录，再从之前的 `system-config.tar` 解包到 `/var/lib/waydroid`，
执行 `sudo waydroid upgrade -o` 后启动服务。
不要仅把旧目录覆盖到新目录上，否则新加的文件可能残留。
APK、镜像、转译下载缓存和个人应用数据都留在仓库外。

## 参考

- [Void 包内安装说明](https://github.com/void-linux/void-packages/blob/master/srcpkgs/waydroid/files/README.voidlinux)
- [Waydroid 属性](https://docs.waydro.id/usage/waydroid-prop-options)
- [waydroid_script](https://github.com/casualsnek/waydroid_script)
- [Waydroid 在 niri 中的尺寸限制](https://github.com/waydroid/waydroid/issues/2001)
