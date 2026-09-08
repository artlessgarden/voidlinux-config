#!/usr/bin/env python3
"""Read-only niri subscription; emit memo paths as hex lines for vis."""
import argparse
import select
import subprocess
import json
import os
from pathlib import Path
import re
import socket
import sys
import time
import unicodedata


def chat_title(raw):
    # Telegram wraps the actual name in FSI/PDI; counts sit OUTSIDE it.
    # Extract before removing controls so a real '(10) Customer' is preserved.
    wrapped = re.search('\u2068(.*?)\u2069', raw or '')
    source = wrapped.group(1) if wrapped else (raw or '')
    title = ''.join(c for c in source if unicodedata.category(c) not in ('Cf', 'Cc')).strip()
    if not wrapped:
        title = re.sub(r'\s+[–—]\s+\([\d ,.+]+\)$', '', title).strip()
        title = re.sub(r'^\([\d ,.+]+\)\s+', '', title)
    if not title or re.fullmatch(r'Telegram(?: Desktop)?(?: \([\d ,.+]+\))?', title) or title in ('Media viewer', '媒体查看器'):
        return None
    return title


def identity(window):
    title = chat_title(window.get('title'))
    if not (window.get('app_id') or '').startswith('org.telegram.desktop') or title is None:
        return None
    return window['app_id'] + '\n' + title


def memo_path(root, window):
    title = chat_title(window['title'])
    key = identity(window)
    if key is None:
        raise ValueError('Not a Telegram chat')
    slug = title.replace('/', '／')
    if len((slug + '.txt').encode()) > 255:
        raise ValueError('聊天名称太长，无法作为文件名')
    root.mkdir(parents=True, exist_ok=True)
    path = root / (slug + '.txt')
    if path.is_symlink():
        raise ValueError('备注路径是符号链接，已暂停打开')
    try:
        os.close(os.open(path, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600))
    except FileExistsError:
        pass
    return path


class Tracker:
    def __init__(self):
        self.windows = {}
        self.selected = None
        self.last = None

    def update(self, event):
        candidate = None
        if 'WindowsChanged' in event:
            self.windows = {w['id']: w for w in event['WindowsChanged']['windows']}
            chats = [w for w in self.windows.values() if identity(w)]
            if chats:
                candidate = max(chats, key=lambda w: (w.get('is_focused', False), (w.get('focus_timestamp') or {}).get('secs', 0)))
        elif 'WindowOpenedOrChanged' in event:
            window = event['WindowOpenedOrChanged']['window']
            self.windows[window['id']] = window
            if window.get('is_focused') or window['id'] == self.selected:
                candidate = window
        elif 'WindowFocusChanged' in event:
            candidate = self.windows.get(event['WindowFocusChanged']['id'])
        elif 'WindowClosed' in event:
            self.windows.pop(event['WindowClosed']['id'], None)
        if candidate and identity(candidate):
            self.selected = candidate['id']
            key = identity(candidate)
            if key != self.last:
                self.last = key
                return candidate
        return None


def niri(request):
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(2)
        connection.connect(os.environ['NIRI_SOCKET'])
        connection.sendall((json.dumps(request) + '\n').encode())
        with connection.makefile('r') as stream:
            reply = json.loads(stream.readline())
        if 'Err' in reply:
            raise RuntimeError(str(reply['Err']))
        return reply['Ok']


def action(name, **values):
    return niri({'Action': {name: values}})


def dock():
    """Only dock while Telegram is focused. Never inspect editor contents."""
    windows = niri('Windows')['Windows']
    chat = next((w for w in windows if w.get('is_focused') and identity(w)), None)
    memo = next((w for w in windows if w.get('app_id') == 'telegram-memo'), None)
    if not chat or not memo:
        return
    position = lambda w: (w.get('layout') or {}).get('pos_in_scrolling_layout')
    cp, mp = position(chat), position(memo)
    if not cp:
        return  # Do not rearrange a deliberately floating Telegram window.
    same_workspace = chat['workspace_id'] == memo['workspace_id']
    if same_workspace and mp and mp[0] == cp[0] + 1:
        return
    # Window ids are stable, workspace indices must be resolved just-in-time.
    if not same_workspace:
        workspaces = niri('Workspaces')['Workspaces']
        workspace = next(w for w in workspaces if w['id'] == chat['workspace_id'])
        action('MoveWindowToWorkspace', window_id=memo['id'], reference={'Index': workspace['idx']}, focus=False)
    action('MoveWindowToTiling', id=memo['id'])
    # Column movement acts on the focused column. Restore Telegram afterwards.
    action('FocusWindow', id=memo['id'])
    try:
        windows = niri('Windows')['Windows']
        memo = next(w for w in windows if w['id'] == memo['id'])
        chat = next(w for w in windows if w['id'] == chat['id'])
        mp, cp = position(memo), position(chat)
        siblings = [w for w in windows if w['workspace_id'] == memo['workspace_id'] and position(w) and position(w)[0] == mp[0]]
        if len(siblings) > 1:
            # Consuming/expelling moves the selected window out to its right.
            action('ConsumeOrExpelWindowRight', id=memo['id'])
            windows = niri('Windows')['Windows']
            mp = position(next(w for w in windows if w['id'] == memo['id']))
            cp = position(next(w for w in windows if w['id'] == chat['id']))
        action('MoveColumnToIndex', index=cp[0] if mp[0] < cp[0] else cp[0] + 1)
    finally:
        action('FocusWindow', id=chat['id'])


def watch(root, follow=True, arrange=True):
    """The stdin pipe is a lifetime tether: editor death immediately ends us."""
    tracker, connection, buffer = Tracker(), None, b''
    retry_at = next_tick = next_dock = 0
    try:
        while True:
            now = time.monotonic()
            if follow and connection is None and now >= retry_at:
                try:
                    connection = socket.socket(socket.AF_UNIX)
                    connection.connect(os.environ['NIRI_SOCKET'])
                    connection.sendall(b'"EventStream"\n')
                    tracker, buffer = Tracker(), b''
                except (OSError, KeyError) as error:
                    print('监听重连中: ' + str(error), file=sys.stderr, flush=True)
                    if connection:
                        connection.close()
                    connection, retry_at = None, now + 2
            readable, _, _ = select.select([sys.stdin] + ([connection] if connection else []), [], [], 0.25)
            if sys.stdin in readable and not os.read(sys.stdin.fileno(), 4096):
                return
            if connection in readable:
                data = connection.recv(65536)
                if not data:
                    connection.close()
                    connection, retry_at = None, now + 1
                else:
                    buffer += data
                    while b'\n' in buffer:
                        line, buffer = buffer.split(b'\n', 1)
                        try:
                            selected = tracker.update(json.loads(line))
                            if selected:
                                path = memo_path(root, selected)
                                print('P' + str(path).encode().hex(), flush=True)
                        except (OSError, ValueError, KeyError) as error:
                            tracker.last = None
                            print(str(error), file=sys.stderr, flush=True)
                    if arrange and now >= next_dock:
                        try:
                            dock()
                        except (OSError, RuntimeError, KeyError, StopIteration) as error:
                            print('窗口靠拢失败: ' + str(error), file=sys.stderr, flush=True)
                        next_dock = now + 0.3
            if now >= next_tick:
                print('T' + str(now), flush=True)
                next_tick = now + 0.25
    finally:
        if connection:
            connection.close()


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path, default=Path.home() / 'work/memo')
    parser.add_argument('--clock', action='store_true')
    parser.add_argument('--no-dock', action='store_true')
    options = parser.parse_args()
    try:
        watch(options.root.resolve(), not options.clock, not options.no_dock)
    except (BrokenPipeError, KeyboardInterrupt):
        pass
