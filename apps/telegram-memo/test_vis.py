"""Exercise the actual vis binary/plugin against a local niri event fixture."""
import fcntl
import json
import os
from pathlib import Path
import pty
import select
import signal
import socket
import struct
import tempfile
import termios
import time
import unittest

from memo import memo_path
from test_memo import window


class VisIntegration(unittest.TestCase):
    def test_plugin_without_personal_config_and_disable_switch(self):
        for disabled in (False, True, None):
            with self.subTest(disabled=disabled), tempfile.TemporaryDirectory(prefix='memo-isolation-') as directory:
                root = Path(directory)
                notes = root / 'notes'
                notes.mkdir()
                note = notes / 'fixture.txt'
                note.touch()
                config = root / 'config'
                config.mkdir()
                entry = Path(__file__).resolve().parent / 'vis/init.lua'
                (config / 'visrc.lua').write_text(
                    'require("vis")\ndofile(' + json.dumps(str(entry)) + ')\n'
                    'assert(package.loaded["my.status"] == nil)\n'
                    'assert(package.loaded["my.util"] == nil)\n'
                    'assert(package.loaded["telegram_memo.status"] == nil)\n'
                )
                pid, fd = pty.fork()
                if pid == 0:
                    os.environ.pop('TELEGRAM_MEMO_FOLLOW', None)
                    os.environ.pop('TELEGRAM_MEMO_HELPER', None)
                    os.environ.update(TERM='xterm-256color', VIS_PATH=str(config),
                                      TELEGRAM_MEMO_ROOT=str(notes),
                                      TELEGRAM_MEMO_DISABLE='1' if disabled else '0')
                    if disabled is None:
                        # Another machine has no local MSI opt-in marker.
                        os.environ['XDG_CONFIG_HOME'] = str(root / 'unenabled-config')
                    os.chdir(directory)
                    os.execl(str(Path.home() / '.local/bin/vis'), 'vis', str(note))
                output = bytearray()
                def drain(seconds):
                    until = time.monotonic() + seconds
                    while time.monotonic() < until:
                        if select.select([fd], [], [], max(0, until - time.monotonic()))[0]:
                            try: output.extend(os.read(fd, 65536))
                            except OSError: break
                try:
                    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 25, 80, 0, 0))
                    drain(0.5)
                    os.write(fd, b'iISOLATED')
                    drain(2)
                    self.assertEqual(note.read_text(), 'ISOLATED' if disabled is False else '')
                    self.assertNotIn(b'memo [', output)
                    self.assertNotIn(b'stack traceback', output)
                    self.assertNotIn(b'assertion failed', output)
                finally:
                    os.write(fd, b'\x1b')
                    drain(0.1)
                    os.write(fd, b':q!\r')
                    drain(0.3)
                    exited, _ = os.waitpid(pid, os.WNOHANG)
                    if not exited:
                        os.kill(pid, signal.SIGTERM)
                        os.waitpid(pid, 0)
                    os.close(fd)

    def test_ordinary_vis_autosaves_only_inside_memo_directory(self):
        with tempfile.TemporaryDirectory(prefix='memo-scope-test-') as directory:
            root = Path(directory) / 'notes'
            root.mkdir()
            inside, outside = root / '空白.txt', Path(directory) / 'outside.txt'
            inside.touch()
            outside.touch()
            pid, fd = pty.fork()
            if pid == 0:
                os.environ.pop('TELEGRAM_MEMO_FOLLOW', None)
                os.environ.update(TERM='xterm-256color', TELEGRAM_MEMO_ROOT=str(root),
                                  TELEGRAM_MEMO_HELPER=str(Path(__file__).with_name('memo.py').resolve()))
                os.chdir(directory)
                os.execl(str(Path.home() / '.local/bin/vis'), 'vis', str(inside))
            output = bytearray()
            def drain(seconds):
                until = time.monotonic() + seconds
                while time.monotonic() < until:
                    if select.select([fd], [], [], max(0, until - time.monotonic()))[0]:
                        try: output.extend(os.read(fd, 65536))
                        except OSError: break
            try:
                fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 30, 160, 0, 0))
                drain(0.5)
                os.write(fd, 'i自动保存测试'.encode())
                drain(2)
                self.assertEqual(inside.read_text(), '自动保存测试')
                # A pause/save must not consume insert mode or move the cursor.
                os.write(fd, '继续输入'.encode())
                drain(2)
                self.assertEqual(inside.read_text(), '自动保存测试继续输入')
                os.write(fd, '再继续'.encode())
                drain(2)
                self.assertEqual(inside.read_text(), '自动保存测试继续输入再继续')
                os.write(fd, b'\x1b')
                drain(0.1)
                os.write(fd, 'gg0i前'.encode())
                drain(2)
                os.write(fd, '缀'.encode())
                drain(2)
                self.assertEqual(inside.read_text(), '前缀自动保存测试继续输入再继续')
                os.write(fd, b'\x1b')
                drain(0.1)
                replacement = root / 'replace.txt'
                replacement.write_text('ABCDE')
                os.write(fd, (':e "' + str(replacement) + '"\r').encode())
                drain(0.3)
                os.write(fd, b'0Rxy')
                drain(2)
                os.write(fd, b'z')
                drain(2)
                self.assertEqual(replacement.read_text(), 'xyzDE')
                os.write(fd, b'\x1b')
                drain(0.1)
                os.write(fd, (':e "' + str(outside) + '"\r').encode())
                drain(0.3)
                os.write(fd, b'iNOT-AUTOSAVED')
                drain(2)
                self.assertEqual(outside.read_bytes(), b'')
                os.write(fd, b'\x1b')
                drain(0.2)
                os.write(fd, b':q!\r')
                drain(0.5)
                exited, status = os.waitpid(pid, os.WNOHANG)
                self.assertEqual(exited, pid, output.decode(errors='replace')[-1000:])
                self.assertEqual(os.waitstatus_to_exitcode(status), 0)
                pid = None
                self.assertNotIn(b'stack traceback', output)
            finally:
                if pid:
                    os.kill(pid, signal.SIGTERM)
                    os.waitpid(pid, 0)
                os.close(fd)

    def test_switch_saves_and_restores_without_extra_windows(self):
        with tempfile.TemporaryDirectory(prefix='telegram-memo-test-') as directory:
            root = Path(directory)
            listener = socket.socket(socket.AF_UNIX)
            listener.bind(str(root / 'niri.sock'))
            listener.listen()
            listener.settimeout(5)
            pid, fd = pty.fork()
            if pid == 0:
                os.environ.update(TERM='xterm-256color', NIRI_SOCKET=str(root / 'niri.sock'),
                                  TELEGRAM_MEMO_ROOT=str(root),
                                  TELEGRAM_MEMO_FOLLOW='1', TELEGRAM_MEMO_NO_DOCK='1',
                                  TELEGRAM_MEMO_HELPER=str(Path(__file__).with_name('memo.py').resolve()))
                os.chdir(root)
                os.execl(str(Path.home() / '.local/bin/vis'), 'vis')
            connection = None
            output = bytearray()
            def drain(seconds=0.5):
                until = time.monotonic() + seconds
                while time.monotonic() < until:
                    if select.select([fd], [], [], max(0, until - time.monotonic()))[0]:
                        try:
                            output.extend(os.read(fd, 65536))
                        except OSError:
                            break
            def send(event):
                connection.sendall((json.dumps(event) + '\n').encode())
                drain()
            try:
                fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack('HHHH', 30, 160, 0, 0))
                connection, _ = listener.accept()
                connection.recv(128)
                send({'WindowsChanged': {'windows': [window('客户 A – (2)')]}})
                a = memo_path(root, window('客户 A'))
                self.assertNotIn(b'memo [', output)
                os.write(fd, 'i私有备注 preserved\n'.encode() + b'\x1b')
                drain()
                send({'WindowOpenedOrChanged': {'window': window('客户 B')}})
                self.assertIn('私有备注 preserved', a.read_text())
                b = memo_path(root, window('客户 B'))
                os.write(fd, b'iB-specific\x1b')
                drain()
                send({'WindowOpenedOrChanged': {'window': window('客户 A – (99)')}})
                self.assertIn('B-specific', b.read_text())
                # A rejected write must keep the dirty A buffer, not open B.
                a.chmod(0o444)
                os.write(fd, b'iUNSAVED-KEEP\x1b')
                drain()
                send({'WindowOpenedOrChanged': {'window': window('客户 B')}})
                self.assertNotIn('UNSAVED-KEEP', a.read_text())
                self.assertNotIn('UNSAVED-KEEP', b.read_text())
                a.chmod(0o644)
                os.write(fd, b':memo-follow\r')
                drain()
                self.assertIn('UNSAVED-KEEP', a.read_text())
                # Reconnect after a compositor stream disconnect; latest chat wins.
                connection.close()
                connection, _ = listener.accept()
                connection.recv(128)
                send({'WindowsChanged': {'windows': [window('客户 A')]}})
                os.write(fd, b'iAFTER-RECONNECT\x1b')
                drain(1.5)
                self.assertIn('AFTER-RECONNECT', a.read_text())
                os.write(fd, b':wq\r')
                drain()
                exited, status = os.waitpid(pid, os.WNOHANG)
                self.assertEqual(exited, pid, output.decode(errors='replace')[-2000:])
                self.assertEqual(os.waitstatus_to_exitcode(status), 0)
                pid = None
                self.assertNotIn(b'stack traceback', output)
                self.assertEqual(len(list(root.glob('*.txt'))), 2)
            finally:
                if pid:
                    os.kill(pid, signal.SIGTERM)
                    os.waitpid(pid, 0)
                os.close(fd)
                if connection:
                    connection.close()
                listener.close()


if __name__ == '__main__':
    unittest.main()
