#!/usr/bin/env python3
"""Single editor owner. The lock never reaches the terminal or its children."""
import fcntl
import os
from pathlib import Path
import subprocess
import sys
import time

from memo import action, identity, niri


def enabled():
    config = Path(os.environ.get('XDG_CONFIG_HOME') or Path.home() / '.config')
    return (config / 'telegram-memo/enabled').is_file()


def watch():
    """One login watcher; leave manually closed memos closed until the next TG session."""
    if not enabled():
        return 0
    runtime = Path(os.environ.get('XDG_RUNTIME_DIR', '/tmp')) / ('telegram-memo-' + str(os.getuid()))
    runtime.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = editor_lock(runtime / 'watch.lock')
    if lock is None:
        return 0
    launched, child = False, None
    with lock:
        while Path(os.environ.get('NIRI_SOCKET', '/nonexistent')).exists():
            try:
                windows = niri('Windows')['Windows']
                present = any((w.get('app_id') or '').startswith('org.telegram.desktop') for w in windows)
                if not present:
                    launched = False
                if child is not None and child.poll() is not None:
                    child = None
                if not launched and any(identity(w) for w in windows):
                    existing = any(w.get('app_id') == 'telegram-memo' for w in windows)
                    if not existing and child is None:
                        child = subprocess.Popen([sys.executable, str(Path(__file__).resolve())], close_fds=True)
                        launched = True
                    elif existing:
                        launched = True
            except (OSError, RuntimeError, KeyError):
                pass  # A transient compositor query failure is not Telegram closing.
            time.sleep(1)
    return 0


def editor_lock(path):
    handle = path.open('a')
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        return None
    return handle  # Python descriptors are close-on-exec by default.


def main(toggle=False):
    home = Path.home()
    if not enabled():
        return 0
    root = Path(os.environ.get('TELEGRAM_MEMO_ROOT', home / 'work/memo')).resolve()
    runtime = Path(os.environ.get('XDG_RUNTIME_DIR', '/tmp')) / ('telegram-memo-' + str(os.getuid()))
    runtime.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = editor_lock(runtime / 'editor.lock')
    windows = niri('Windows')['Windows']
    existing = next((w for w in windows if w.get('app_id') == 'telegram-memo'), None)
    if existing:
        if lock is not None:
            lock.close()
        if toggle:
            (runtime / 'close-request').touch(mode=0o600)
            return 0
        action('FocusWindow', id=existing['id'])
        print('已找回现有备注窗口。')
        return 0
    if lock is None:
        print('备注窗口正在启动，请稍候。')
        return 0
    with lock:
        (runtime / 'close-request').unlink(missing_ok=True)
        # Autostart stays invisible until there is an actual Telegram chat.
        while not any(identity(window) for window in windows):
            time.sleep(1)
            windows = niri('Windows')['Windows']
        root.mkdir(parents=True, exist_ok=True)
        chats = [w for w in windows if identity(w)]
        if chats:
            chat = max(chats, key=lambda w: (w.get('is_focused', False), (w.get('focus_timestamp') or {}).get('secs', 0)))
            action('FocusWindow', id=chat['id'])
        env = dict(os.environ, PWD=str(root), TELEGRAM_MEMO_ROOT=str(root), TELEGRAM_MEMO_FOLLOW='1',
                   TELEGRAM_MEMO_HELPER=str(Path(__file__).with_name('memo.py')))
        # close_fds is essential: an orphaned descendant must not hold this lock.
        return subprocess.call(['alacritty', '--class', 'telegram-memo', '--title', 'Telegram Memo',
                                '--working-directory', str(root), '-e', str(home / '.local/bin/vis')],
                               env=env, cwd=root, close_fds=True)


if __name__ == '__main__':
    try:
        sys.exit(watch() if sys.argv[1:] == ['--watch'] else main(toggle=sys.argv[1:] == ['--toggle']))
    except (OSError, RuntimeError, KeyError) as error:
        print('备注启动失败: ' + str(error), file=sys.stderr)
        sys.exit(1)
