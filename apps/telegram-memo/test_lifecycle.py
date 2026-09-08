import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

import launch
from launch import editor_lock


class LifecycleTests(unittest.TestCase):
    def test_toggle_requests_safe_close_of_existing_memo(self):
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / 'telegram-memo/enabled'
            marker.parent.mkdir()
            marker.touch()
            with patch.dict(os.environ, {'XDG_CONFIG_HOME': directory, 'XDG_RUNTIME_DIR': directory}), \
                 patch.object(launch, 'niri', return_value={'Windows': [{'id': 5, 'app_id': 'telegram-memo'}]}), \
                 patch.object(launch, 'action') as action:
                self.assertEqual(launch.main(toggle=True), 0)
                action.assert_not_called()
                self.assertTrue((Path(directory) / ('telegram-memo-' + str(os.getuid())) / 'close-request').exists())

    def test_watcher_reopens_next_session_but_respects_manual_close(self):
        with tempfile.TemporaryDirectory() as directory:
            marker = Path(directory) / 'telegram-memo/enabled'
            marker.parent.mkdir()
            marker.touch()
            socket = Path(directory) / 'niri.sock'
            socket.touch()
            chat = {'id': 1, 'app_id': 'org.telegram.desktop', 'title': 'Fixture chat'}
            frames = [[], [chat], [chat], [], [chat], []]
            ticks = 0
            def tick(_):
                nonlocal ticks
                ticks += 1
                if ticks == len(frames):
                    socket.unlink()
            with patch.dict(os.environ, {'XDG_CONFIG_HOME': directory, 'XDG_RUNTIME_DIR': directory,
                                         'NIRI_SOCKET': str(socket)}), \
                 patch.object(launch, 'niri', side_effect=[{'Windows': frame} for frame in frames]), \
                 patch.object(launch.time, 'sleep', side_effect=tick), \
                 patch.object(launch.subprocess, 'Popen') as terminal:
                terminal.return_value.poll.return_value = 0
                self.assertEqual(launch.watch(), 0)
                self.assertEqual(terminal.call_count, 2)

    def test_waits_for_telegram_before_creating_directory_or_editor(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'memo'
            marker = Path(directory) / 'telegram-memo/enabled'
            marker.parent.mkdir()
            marker.touch()
            chat = {'id': 1, 'app_id': 'org.telegram.desktop', 'title': 'Fixture chat'}
            with patch.dict(os.environ, {'XDG_CONFIG_HOME': directory, 'XDG_RUNTIME_DIR': directory,
                                         'TELEGRAM_MEMO_ROOT': str(root)}), \
                 patch.object(launch, 'niri', side_effect=[{'Windows': []}, {'Windows': [chat]}]), \
                 patch.object(launch, 'action'), \
                 patch.object(launch.subprocess, 'call', return_value=0) as terminal:
                def waiting(_):
                    terminal.assert_not_called()
                    self.assertFalse(root.exists())
                with patch.object(launch.time, 'sleep', side_effect=waiting):
                    self.assertEqual(launch.main(), 0)
                terminal.assert_called_once()
                self.assertTrue(root.is_dir())

    def test_other_machine_launch_does_nothing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory) / 'memo'
            with patch.dict(os.environ, {'XDG_CONFIG_HOME': directory, 'TELEGRAM_MEMO_ROOT': str(root)}), \
                 patch.object(launch, 'niri') as niri, \
                 patch.object(launch.subprocess, 'call') as terminal:
                self.assertEqual(launch.main(), 0)
                niri.assert_not_called()
                terminal.assert_not_called()
                self.assertFalse(root.exists())

    def test_descendant_does_not_inherit_lock(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'lock'
            lock = editor_lock(path)
            self.assertIsNone(editor_lock(path))
            child = subprocess.Popen([sys.executable, '-c', 'import time; time.sleep(10)'], close_fds=True)
            try:
                lock.close()
                with editor_lock(path) as reopened:
                    self.assertIsNotNone(reopened)
                    self.assertFalse(os.get_inheritable(reopened.fileno()))
            finally:
                child.terminate()
                child.wait()

    def test_helper_exits_when_editor_pipe_closes(self):
        command = [sys.executable, str(Path(__file__).with_name('memo.py')), '--clock']
        helper = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        try:
            self.assertTrue(helper.stdout.readline().startswith(b'T'))
            helper.stdin.close()
            self.assertEqual(helper.wait(timeout=2), 0)
        finally:
            if helper.poll() is None:
                helper.kill()
                helper.wait()
            helper.stdout.close()
            helper.stderr.close()
