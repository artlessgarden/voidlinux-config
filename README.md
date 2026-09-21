# Void Linux 配置

每个脚本都可以单独重复运行。先运行系统和硬件，再运行桌面和应用。

```sh
sh modules/01-system.sh
sh modules/02-hardware/asus.sh       # MSI 用 msi.sh，二选一
sh modules/03-desktop/terminal-fonts.sh
sh modules/03-desktop/input-method.sh
sh modules/03-desktop/keyd.sh
sh modules/03-desktop/audio.sh
sh modules/03-desktop/niri.sh
sh modules/04-apps/lf.sh
sh modules/04-apps/vis.sh
sh modules/04-apps/helium.sh
```

重新登录后运行 `ni`。需要代理时再运行 `modules/05-optional/mihomo.sh`。
GRUB 脚本在 `modules/02-hardware/*/boot.sh`，运行前检查启动项。

包清单在 `packages.list`，维护命令是 `xb a/g/k/o/r/s`。

旧的 Emacs、Nvim、Mouseless、qutebrowser 配置在 `archive/`。
密码、网络凭据、浏览器数据和 Mihomo 节点不入库。
