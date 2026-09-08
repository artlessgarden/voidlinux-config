#!/usr/bin/env python3
"""Single editor owner. The lock never reaches the terminal or its children."""
import fcntl
import os
from pathlib import Path
import subprocess
import sys

from memo import action, identity, niri


def editor_lock(path):
    handle = path.open('a')
    try:
        fcntl.flock(handle, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        handle.close()
        return None
    return handle  # Python descriptors are close-on-exec by default.


def main():
    home = Path.home()
    config = Path(os.environ.get('XDG_CONFIG_HOME') or home / '.config')
    if not (config / 'telegram-memo/enabled').is_file():
        return 0
    root = Path(os.environ.get('TELEGRAM_MEMO_ROOT', home / 'work/memo')).resolve()
    runtime = Path(os.environ.get('XDG_RUNTIME_DIR', '/tmp')) / ('telegram-memo-' + str(os.getuid()))
    runtime.mkdir(mode=0o700, parents=True, exist_ok=True)
    lock = editor_lock(runtime / 'editor.lock')
    windows = niri('Windows')['Windows']
    existing = next((w for w in windows if w.get('app_id') == 'telegram-memo'), None)
    if existing:
        action('FocusWindow', id=existing['id'])
        print('已找回现有备注窗口。')
        return 0
    if lock is None:
        print('备注窗口正在启动，请稍候。')
        return 0
    with lock:
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
        sys.exit(main())
    except (OSError, RuntimeError, KeyError) as error:
        print('备注启动失败: ' + str(error), file=sys.stderr)
        sys.exit(1)
