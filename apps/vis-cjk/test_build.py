import os
from pathlib import Path
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import build
from check import check_renderer


class CompatibilityTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='vis-cjk-fixture-')
        self.addCleanup(self.temp.cleanup)
        self.source = Path(self.temp.name) / 'source'
        subprocess.run(['git', 'clone', '--quiet', '--local', '--no-hardlinks',
                        str(Path.home() / '.local/src/vis'), str(self.source)], check=True)

    def test_patch_fixes_renderer_and_second_run_skips(self):
        self.assertFalse(check_renderer(self.source))
        self.assertTrue(build.ensure_fix(self.source))
        fixed = (self.source / 'ui-terminal.c').read_bytes()
        self.assertTrue(check_renderer(self.source))
        self.assertFalse(build.ensure_fix(self.source))
        self.assertEqual((self.source / 'ui-terminal.c').read_bytes(), fixed)

    def test_incompatible_revision_is_not_modified(self):
        path = self.source / 'ui-terminal.c'
        path.write_text(path.read_text().replace('// FIXME: does not handle double width characters etc, share code with view.c?',
                                                '// Unrecognized upstream implementation.'))
        before = path.read_bytes()
        with self.assertRaisesRegex(RuntimeError, '不兼容'):
            build.ensure_fix(self.source)
        self.assertEqual(path.read_bytes(), before)

    def test_default_build_does_not_apply_patch(self):
        run = subprocess.run
        def stop_before_compiling(command, **kwargs):
            if command[0] == './configure':
                raise RuntimeError('reached configure without patching')
            return run(command, **kwargs)
        with patch.object(build, 'ensure_fix') as fix, \
             patch.object(build.subprocess, 'run', side_effect=stop_before_compiling):
            with self.assertRaisesRegex(RuntimeError, 'reached configure'):
                build.build(self.source, Path(self.temp.name) / 'prefix')
            fix.assert_not_called()

    def test_failed_check_cannot_publish_or_change_upstream(self):
        prefix = Path(self.temp.name) / 'prefix'
        (prefix / 'bin').mkdir(parents=True)
        installed = prefix / 'bin/vis'
        installed.write_bytes(b'working-old-editor')
        before = (self.source / 'ui-terminal.c').read_bytes()
        with patch.object(build, 'ensure_fix', side_effect=RuntimeError('test failure')), \
             patch.object(build, 'publish') as publish:
            with self.assertRaisesRegex(RuntimeError, 'test failure'):
                build.build(self.source, prefix, cjk_patch=True)
            publish.assert_not_called()
        self.assertEqual(installed.read_bytes(), b'working-old-editor')
        self.assertEqual((self.source / 'ui-terminal.c').read_bytes(), before)


class PublishTests(unittest.TestCase):
    def test_publish_replaces_inode_and_keeps_previous_binary(self):
        with tempfile.TemporaryDirectory(prefix='vis-install-fixture-') as tmp:
            root = Path(tmp)
            staged, prefix = root / 'staged', root / 'prefix'
            for path in (staged / 'bin', prefix / 'bin'):
                path.mkdir(parents=True)
            old, new = prefix / 'bin/vis', staged / 'bin/vis'
            old.write_bytes(b'old')
            new.write_bytes(b'new')
            new.chmod(0o755)
            lua = staged / 'share/vis'
            (lua / 'lexers').mkdir(parents=True)
            (lua / 'lexers/lexer.lua').write_text('synthetic runtime')
            (lua / 'lexer.lua').symlink_to('lexers/lexer.lua')
            with old.open('rb') as running:
                build.publish(staged, prefix)
                self.assertEqual(running.read(), b'old')
            self.assertEqual(old.read_bytes(), b'new')
            self.assertEqual((prefix / 'bin/vis.previous').read_bytes(), b'old')
            self.assertTrue(os.access(old, os.X_OK))
            installed_link = prefix / 'share/vis/lexer.lua'
            self.assertTrue(installed_link.is_symlink())
            self.assertEqual(installed_link.read_text(), 'synthetic runtime')


if __name__ == '__main__':
    unittest.main()
