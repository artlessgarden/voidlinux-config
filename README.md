# Void Linux configuration

One small Niri terminal desktop, shared by two laptops.

- `root/etc/` mirrors files installed into `/etc`; they are copied because they rarely change.
- `root/home/` mirrors files linked into the user's home; edits take effect immediately.
- `~/.config/mimeapps.list` is copied once, then remains local so each laptop keeps its own default browser.
- `msi/` and `asus/` contain device-specific setup scripts: hardware, GRUB and power.
- `archive/` keeps inactive Neovim and the former full Vis configuration; nothing there is linked directly.

Follow the common commands in `flow.txt`, then run only the block for the machine being installed. The scripts are literal on purpose: there is no host detection, generator or overlay system.

Personal documents, accounts, histories, caches and credentials stay outside this repository.

Terminal editing uses Vis with the CJK build in `65-vis.sh`. LF handles file
navigation (`Ctrl-f` file search, `Ctrl-g` content search); opening text runs
Vis in the same terminal, and quitting Vis returns to LF. Vis keeps only
current-file editing helpers: theme/status, input-method switching, clipboard,
manual formatting, boolean toggle, upstream current-file completion, cursor
position restoration, and concurrent-edit warnings.
For in-editor file switching, use native `:cd /project`, `:e path`, or `:e .`;
project scope is the working directory, with no automatic root detection.
The full former setup is in `archive/vis-full-2026-09-11/vis`.
Emacs remains available alongside Vis; Org files use Emacs on the MSI setup.
Niri `Mod+Space` opens Fuzzel to launch installed applications. It uses the default
appearance and Alacritty for terminal applications; no launcher config file is needed.

Simplification is gradual: prefer packaged applications and their built-in behavior.
Keep settings needed for hardware, input, fonts and application launching; add fixes
only for a current, reproducible problem. LF handles desktop file management,
previews and terminal file selection through xdg-desktop-portal-termfilechooser.
Its configuration and helpers live under `root/home/`.
Emacs and telega remain enabled with their existing configuration.

Helium is installed or updated with `sh 90-helium.sh`; `xbg` also updates it.
Niri `Mod+c` opens Helium and `Mod+Shift+c` opens Firefox. Default-browser
preferences are local to each host and are not overwritten by setup.

MSI restores Emacs with `sh msi/65-emacs.sh`. The active configuration is
`root/home/.config/emacs`, linked to `~/.config/emacs`; Org is built in.
Packages live in `~/.local/share/emacs/elpa` and private state in
`~/.local/state/emacs`.

`sh msi/66-telega.sh` adds the Telegram client and builds TDLib from upstream
master under `~/.local/opt/tdlib`, and installs its helper under `~/.local/share/telega`.
Rerun the script to update TDLib and rebuild the telega helper.
The build uses four jobs by default (`TELEGA_BUILD_JOBS=2` uses less memory).
In graphical Emacs, use `C-c T` or `M-x telega` and authorize with your phone.
Account data and downloaded media stay outside the repository. Media playback
and file opening use telega defaults. Voice/video calls are unsupported.
Niri `Mod+X` starts an Emacs daemon on first use and opens client frames.
Closing all frames leaves the daemon running; `M-x kill-emacs` stops it.

MSI-only optional Android setup: [Waydroid installation and configuration](msi/waydroid.md)
documents the verified VANILLA image, Android 13 ARM translation, backups,
and the full-height 38.2% Niri tile. It is not part of the common or ASUS install.

This repository is the canonical configuration for both laptops. Give each
machine its own GitHub SSH key and use
`git@github.com:artlessgarden/voidlinux-config.git` as `origin`; do not copy
private keys between machines.

## Standalone Xray servers

`servers/xray/install.sh` installs or reconfigures one transparent Xray role.
Copy the whole `servers/xray/` directory to the server alongside the official
XTLS installer and a separately verified `Xray-linux-64.zip`, then run one of:

```sh
sudo sh servers/xray/install.sh exit
sudo sh servers/xray/install.sh hk-relay 183.56.224.54
```

Use `exit` for any standalone overseas or domestic exit. Use `hk-relay` only
on the Hong Kong server that owns both its Reality exit on TCP 443 and the
fixed TCP 9443 relay to the domestic Reality listener. Build and test in this
order: HK `exit`, CN `exit`, then rerun HK as `hk-relay`. This keeps every
failure attributable to one layer.

The script uses `/tmp/install-release.sh` and
`/tmp/Xray-linux-64.zip` only when Xray is absent. It generates credentials
with native Xray/OpenSSL commands, validates a temporary `.json` file, keeps
the first old configuration as `config.json.before-standalone`, and restarts
only after validation. Server secrets stay in
`/usr/local/etc/xray/server.env`; the client-only export is
`/usr/local/etc/xray/client.env`. Both are mode 600 and must not be committed.

Native server maintenance remains visible:

```sh
sudo /usr/local/bin/xray run -test -config /usr/local/etc/xray/config.json
systemctl status xray --no-pager
sudo systemctl restart xray
sudo journalctl -u xray -n 50 --no-pager
sudo ss -lntp | grep -E ':(443|9443)\b'
```

Keep HK public TCP 22, 443 and 9443 only. Restrict CN TCP 443 to the HK
address `/32`. Keep the old CN Marzban container stopped-but-present until a
reboot and both exit tests pass; rollback means stopping standalone Xray and
starting that retained container.

### Mental model

Think of Mihomo as the dispatcher in the local station. TUN brings it selected
application traffic; `rule split` reads the destination and sends Chinese
sites to the `国内` platform, other work-app sites to `香港`, and leaves other
processes on `DIRECT`. `global` temporarily sends everything to one selected
platform. The stored `global:` choice shown by `mihomoctl status` is inert
while the active mode is `rule`.

An Xray Reality listener is a guarded remote door. The UUID, server public
parameter and short ID let the client prove it belongs there; the server keeps
the private key. After that handshake, VLESS carries the requested TCP stream
and the remote Xray opens the real Internet connection, so websites see that
server's exit address. `www.nvidia.com` is the believable TLS target/SNI, not
an HTTP reverse proxy and not where authenticated user traffic is sent.

HK TCP 9443 is only a sealed pipe. `dokodemo-door` accepts raw TCP and forwards
it to CN TCP 443 without understanding or decrypting the inner CN Reality
session. The CN UUID and Reality handshake therefore remain end-to-end between
local Mihomo and the CN Xray. The two paths are:

```text
HK: local Mihomo -> HK:443 Reality -> Internet
CN: local Mihomo -> HK:9443 raw relay -> CN:443 Reality -> Internet
```

For another overseas-only server, copy the verified archive, official
installer and this directory, then run only `sudo sh install.sh exit`; add its
client fields to the private Mihomo configuration. For a new HK+CN pair: test
HK `exit`, test CN `exit` directly while its firewall temporarily allows the
client IP, restrict CN 443 to HK, change HK to `hk-relay`, point the Mihomo CN
entry at HK 9443, and finally restore `mihomoctl use rule split`.

## Mihomo

`sh 45-mihomo.sh` downloads the latest official stable Mihomo binary
(x86_64 or aarch64) and installs it as a root-run runit service.
Rerun it to update; an already-running service is restarted after validation.
`MIHOMO_BIN=/path/to/mihomo sh 45-mihomo.sh` uses a local binary instead.
On its first run it creates the private
`/etc/mihomo/config.yaml` without enabling the service. Paste the two complete
static Mihomo proxy mappings, remove the `REPLACE_STATIC_NODE_VALUES` marker,
then run `sh 45-mihomo.sh` again. The second run validates the configuration
before enabling `/var/service/mihomo`; later runs preserve the private nodes.

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

Interactive `ssh` and `scp` ask whether to use an OpenSSH jump host; `sshw`
and `scpw` always use it. Configure the single shared jump host locally without
putting private addresses or keys in this repository:

```sshconfig
Host work-bastion
    HostName <fixed-work-egress-ip>
    User <user>
    IdentityFile ~/.ssh/id_ed25519
    ProxyJump none
```

Choosing `n` in either prompt connects directly. A destination of
`work-bastion` itself is always direct. Git and other programs that invoke SSH
non-interactively are not wrapped.

`use` changes Mihomo's native mode and policy-group selection. Process control
remains runit's job: use `sudo sv up mihomo`, `sudo sv down mihomo`, or
`sudo sv restart mihomo`.

## Upstream programs

Mihomo (`45-mihomo.sh`), Mouseless (`75-mouseless.sh`) and Helium
(`90-helium.sh`) use the latest official release binaries; rerun their scripts
to update. Vis builds upstream master with the local CJK patch. TDLib builds
upstream master because no official Linux release binary is provided; the
telega helper is rebuilt against it. Other system applications use XBPS.
