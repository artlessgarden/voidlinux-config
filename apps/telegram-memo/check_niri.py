"""Explicit desktop check, using disposable windows and temporary notes only."""
import os
from pathlib import Path
import subprocess
import tempfile
import time

from memo import action, niri


def windows():
    return niri('Windows')['Windows']


def wait_for(predicate, message, seconds=8):
    deadline = time.monotonic() + seconds
    while time.monotonic() < deadline:
        value = predicate()
        if value:
            return value
        time.sleep(0.15)
    raise AssertionError(message)


def main():
    before = windows()
    if any(w.get('app_id') == 'telegram-memo' for w in before):
        raise RuntimeError('A real memo window is open; desktop test will not touch it.')
    original = next((w['id'] for w in before if w.get('is_focused')), None)
    chat_app = 'org.telegram.desktop.memo-check'
    chat_process = subprocess.Popen(['alacritty', '--class', chat_app, '--title', 'Memo integration chat', '-e', 'sleep', '120'])
    editor = None
    try:
        chat = wait_for(lambda: next((w for w in windows() if w.get('app_id') == chat_app), None), 'test chat did not appear')
        with tempfile.TemporaryDirectory(prefix='memo-desktop-test-') as directory:
            env = dict(os.environ, TELEGRAM_MEMO_ROOT=directory)
            command = [str(Path.home() / '.local/bin/telegram-memo')]
            action('FocusWindow', id=chat['id'])
            editor = subprocess.Popen(command, env=env)
            def current_memo():
                return next((w for w in windows() if w.get('app_id') == 'telegram-memo'), None)
            memo = wait_for(current_memo, 'vis window did not appear')
            wait_for(lambda: (Path(directory) / 'Memo integration chat.txt').exists(), 'empty chat file not created')
            assert (Path(directory) / 'Memo integration chat.txt').read_bytes() == b''
            repeated = subprocess.run(command, env=env, capture_output=True, timeout=5)
            assert repeated.returncode == 0, repeated.stderr.decode()
            assert current_memo()['id'] == memo['id'], 'duplicate editor window'
            print('PASS: starts and duplicate launch reuses the editor', flush=True)
            target = next(w for w in niri('Workspaces')['Workspaces'] if w['id'] != chat['workspace_id'])
            action('MoveWindowToWorkspace', window_id=memo['id'], reference={'Index': target['idx']}, focus=False)
            action('FocusWindow', id=chat['id'])
            def adjacent():
                current = windows()
                c = next(w for w in current if w['id'] == chat['id'])
                m = next(w for w in current if w['id'] == memo['id'])
                cp, mp = c['layout']['pos_in_scrolling_layout'], m['layout']['pos_in_scrolling_layout']
                return m['workspace_id'] == c['workspace_id'] and cp and mp and mp[0] == cp[0] + 1 and c['is_focused']
            wait_for(adjacent, 'memo did not return from another workspace with chat focused')
            action('FocusWindow', id=memo['id'])
            action('MoveColumnToFirst')
            action('FocusWindow', id=chat['id'])
            wait_for(adjacent, 'memo did not return to right-hand column')
            print('PASS: follows across workspaces and columns; restores chat focus', flush=True)
            action('CloseWindow', id=memo['id'])
            assert editor.wait(timeout=5) == 0, 'launcher failed on close'
            action('FocusWindow', id=chat['id'])
            editor = subprocess.Popen(command, env=env)
            second = wait_for(current_memo, 'editor could not restart after close')
            assert second['id'] != memo['id']
            action('CloseWindow', id=second['id'])
            assert editor.wait(timeout=5) == 0
            print('PASS: close and reopen releases the lock', flush=True)
    finally:
        for w in windows():
            if w.get('app_id') in (chat_app, 'telegram-memo'):
                action('CloseWindow', id=w['id'])
        if editor:
            try: editor.wait(timeout=5)
            except subprocess.TimeoutExpired: pass
        try: chat_process.wait(timeout=5)
        except subprocess.TimeoutExpired: chat_process.terminate(); chat_process.wait()
        if original and any(w['id'] == original for w in windows()):
            action('FocusWindow', id=original)


if __name__ == '__main__':
    main()
