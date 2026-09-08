import tempfile
import unittest
from pathlib import Path

from memo import chat_title, memo_path, Tracker


def window(title, ident=1, focused=True):
    return dict(id=ident, title=title, app_id='org.telegram.desktop',
                is_focused=focused, focus_timestamp={'secs': ident})


class MemoTests(unittest.TestCase):
    def test_title_cleans_only_telegram_decoration(self):
        self.assertEqual(chat_title('\u200e\u2068客户 (2)\u2069 – (286)'), '客户 (2)')
        self.assertEqual(chat_title('客户 (2)'), '客户 (2)')
        self.assertEqual(chat_title('\u200e(10) \u2068客户 (2)\u2069 – (286)'), '客户 (2)')
        self.assertEqual(chat_title('\u200e\u2068(10) 客户\u2069 – (286)'), '(10) 客户')
        self.assertIsNone(chat_title('Telegram (28)'))
        self.assertIsNone(chat_title('Media viewer'))

    def test_paths_stay_inside_root_and_do_not_overwrite(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            a = memo_path(root, window('../../客户 / A'))
            self.assertEqual(a.parent, root)
            a.write_text('my notes')
            self.assertEqual(memo_path(root, window('../../客户 / A')), a)
            self.assertEqual(a.read_text(), 'my notes')
            self.assertNotEqual(a, memo_path(root, window('..客户 _ A')))

    def test_named_file_is_empty(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            path = memo_path(root, window('\u200e(3) \u2068客户 A\u2069 – (100)'))
            self.assertEqual(path, root / '客户 A.txt')
            self.assertEqual(path.read_bytes(), b'')

    def test_null_app_id_is_ignored(self):
        tracker = Tracker()
        self.assertIsNone(tracker.update({'WindowsChanged': {'windows': [dict(id=3, title='unknown', app_id=None)]}}))

    def test_follows_chat_changes_ignores_unread_and_other_windows(self):
        tracker = Tracker()
        self.assertEqual(tracker.update({'WindowsChanged': {'windows': [window('客户 A – (2)')]}})['title'], '客户 A – (2)')
        self.assertIsNone(tracker.update({'WindowOpenedOrChanged': {'window': window('客户 A – (3)')}}))
        self.assertEqual(tracker.update({'WindowOpenedOrChanged': {'window': window('客户 B')}})['title'], '客户 B')
        self.assertIsNone(tracker.update({'WindowFocusChanged': {'id': 9}}))
        self.assertIsNone(tracker.update({'WindowOpenedOrChanged': {'window': window('后台群', 2, False)}}))
        self.assertEqual(tracker.update({'WindowFocusChanged': {'id': 2}})['title'], '后台群')


if __name__ == '__main__':
    unittest.main()
