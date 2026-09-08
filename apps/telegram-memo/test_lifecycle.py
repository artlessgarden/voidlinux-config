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
