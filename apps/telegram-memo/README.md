# Telegram memo: niri + vis

Enabled only by the MSI setup step `sh msi/70-telegram-memo.sh`. It creates an
empty, machine-local `~/.config/telegram-memo/enabled` marker (honoring
`XDG_CONFIG_HOME`). The marker is not in the repository and must not be synced
to ASUS. Without it, both the launcher and vis plugin exit before starting
helpers, contacting niri, or creating the notes directory. Shared niri rules
may still be loaded, but its startup command immediately exits on other hosts.
Remove the marker and restart vis to disable the feature on this machine.

Run `telegram-memo`. Repeating the command finds the existing editor instead
of opening another. Close with `:wq` to save and exit.
`Super+Shift+Z` runs `telegram-memo --toggle`: open when absent, otherwise
request a save and close through the memo helper. A failed save keeps vis open.

- The current Telegram chat opens `~/work/memo/<chat name>.txt`.
- New files are empty; existing files are never initialized or overwritten.
- Slash in a title becomes the full-width slash `／`. Overlong names produce
  an error instead of silently truncating. Same-name chats share a file;
  renaming a chat selects a different filename. Old hashed filenames are
  untouched and are not automatically migrated.
- `vis/telegram_memo/autosave.lua` applies to **any** vis session editing files beneath
  `~/work/memo/`, including sessions opened without the launcher. It calls
  vis's ordinary write operation, using atomic save mode, after about one
  second without insert input. Saving preserves insert/replace mode and cursor positions.
- Saving also happens before a Telegram-driven file switch. A failed save
  retains the buffer and blocks the switch. Fix the write error, then use
  `:memo-follow`. The existing vis status bar and modified marker are used unchanged.
- When Telegram is focused, the helper brings the memo into the same workspace
  as the right-hand column. Already adjacent windows are left alone. Column
  rearrangement briefly selects the memo and restores Telegram focus. Floating
  Telegram windows are left alone. Keep the memo column separate from unrelated
  windows for predictable placement.
- Closing the editor closes its helper's stdin pipe, terminating the helper.
  The launcher alone owns a non-inheritable lock. Niri disconnects reconnect;
  unexpected helper exits restart up to three times. `:memo-restart` retries.
- The helper handles window metadata and file paths only. It does not open
  existing note files for reading, inspect editor text, or send messages.
  vis performs normal note loading and saving locally.

No clipboard capture, template content, reminder service, or alternate editor.
Save failures never cause a forced write or forced discard. Unsaved keystrokes
from the last moment before a power failure are not guaranteed durable.

## Isolation and entry points

All memo implementation is kept in this directory. It uses stock vis and has no
`my.*` module dependencies. Your existing keybindings, input method setup, and
other personal editor settings remain in your normal configuration.

- `memo.py`: niri events, title parsing, empty-file creation, window placement,
  and clock ticks. The editor's stdin pipe controls its lifetime.
- `launch.py`: editor launch, window reuse, non-inheritable singleton lock.
- `vis/init.lua`: single plugin entry, discovers its own installation directory.
- `vis/telegram_memo/autosave.lua`: directory-scoped saving.
- `vis/telegram_memo/follow.lua`: chat-driven file switching.
- `vis/telegram_memo/util.lua`: shell/vis argument quoting only.
- `niri.kdl`: login autostart and window rule, included by the main niri configuration.
- `test_*.py`, `check_niri.py`: temporary-fixture tests.

The only editor integration is this line in your `visrc.lua`:

```lua
dofile(home .. "/voidlinux-config/apps/telegram-memo/vis/init.lua")
```

This also provides autosave when ordinary vis opens a file under `~/work/memo`.
The plugin does not register or replace any status bar.
The launcher sets `TELEGRAM_MEMO_FOLLOW=1`; ordinary vis does not follow Telegram.
To disable the plugin, comment out that one line and restart vis, or run
`TELEGRAM_MEMO_DISABLE=1 vis`. To fully disconnect it, also remove the memo
`include` from niri and the `~/.local/bin/telegram-memo` launcher link.
Existing note files are left untouched. Re-enable by restoring the entry points.
The launcher requires the vis plugin entry to be enabled.

The launcher link points at `root/home/.local/bin/telegram-memo`, a shell wrapper
which invokes this directory's `launch.py`. The niri entry is:

```kdl
include "~/voidlinux-config/apps/telegram-memo/niri.kdl"
```

The memo plugin itself requires no editor source patch. The independent
`apps/vis-cjk/` build helper fixes the stock editor's Chinese status rendering;
`65-vis.sh` checks compatibility automatically on updates. It does not change
this plugin or the personal status bar.
Files use the exact chat name (apart from slash sanitization), and the original
personal status bar displays the filename and modified marker as before.

The included niri file starts `telegram-memo --watch` on the next niri login.
Config reloads do not trigger startup commands. The watcher checks once per
second and opens the editor only once a Telegram chat window exists. Closing
all Telegram windows (including closing to tray) saves and closes the memo;
minimizing or switching workspaces does not. Save failures, extra vis windows,
or an open file outside memo keep the editor open. Reopening Telegram starts
the memo again. Manually closing the memo leaves it closed for the rest of
that Telegram window session; `telegram-memo` can reopen it explicitly.
The watcher exits with the niri session and uses a separate singleton lock.
Remove the `spawn-at-startup` line to disable only autostart.

## Checks

From the repository:

```
python3 -m unittest discover -s apps/telegram-memo -v
python3 apps/telegram-memo/check_niri.py
sh tests/vis.sh
niri validate
```

The unit/integration suite covers parsing, empty files, no overwrite, directory
scope, actual vis autosave, failed saves, chat switching, socket reconnection,
lock ownership, and helper shutdown. The explicit desktop check creates
throwaway terminal windows and temporary notes to verify placement, repeat
launch, and close/reopen. It refuses to touch an existing real memo window.
No check reads real user notes.

The isolation check also loads the plugin with a minimal temporary visrc, without
your personal modules, and verifies that the disable switch prevents autosaving.
