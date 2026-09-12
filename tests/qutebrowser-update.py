import importlib.util
import pathlib
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = pathlib.Path(__file__).resolve().parents[1]
SPEC = importlib.util.spec_from_file_location(
    "update", ROOT / "apps/qutebrowser/update.py"
)
update = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(update)


def formula(version):
    return {
        "versions": {"stable": version},
        "bottle": {"stable": {"files": {"x86_64_linux": {"sha256": "a" * 64}}}},
    }


class UpdateTests(unittest.TestCase):
    def test_newer_local_engine_needs_no_download(self):
        self.assertFalse(update.needs_update("6.11.2_1", "6.11.1_1"))
        self.assertFalse(update.needs_update("6.11.2_1", "6.11.2_1"))

    def test_new_patch_and_revision_are_detected(self):
        self.assertTrue(update.needs_update("6.11.2_1", "6.11.3_1"))
        self.assertTrue(update.needs_update("6.11.2_1", "6.11.2_2"))

    def test_only_exact_linux_bottle_is_accepted(self):
        self.assertEqual(update.bottle(formula("6.12.0"), "6.12.0"), "a" * 64)
        with self.assertRaises(ValueError):
            update.bottle(formula("6.12.1"), "6.12.0")
        mac = formula("6.12.0")
        mac["bottle"]["stable"]["files"] = {"arm64_tahoe": {"sha256": "a" * 64}}
        with self.assertRaises(ValueError):
            update.bottle(mac, "6.12.0")

    def test_older_source_keeps_installed_engine_without_blocking(self):
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory) / "plan.json"

            def query(prop, package, remote=False):
                return (
                    update.LOCAL if prop == "repository" else "qt6-webengine-6.11.3_1"
                )

            installed = subprocess.CompletedProcess(
                [], 0, "qt6-webengine-6.11.2_1\n", ""
            )
            with (
                patch.object(update, "query", side_effect=query),
                patch.object(update, "fetch", return_value=formula("6.11.2")) as fetch,
                patch.object(update.subprocess, "run", return_value=installed),
                patch.object(update, "needs_update", return_value=True),
            ):
                update.plan(target)
            self.assertFalse(target.exists())
            fetch.assert_called_once_with("qtwebengine")

    def test_xbg_prepares_before_upgrade_and_stops_on_failure(self):
        with tempfile.TemporaryDirectory() as directory:
            root = pathlib.Path(directory)
            script = root / "root/home/.local/bin/xbg"
            script.parent.mkdir(parents=True)
            script.write_bytes((ROOT / "root/home/.local/bin/xbg").read_bytes())
            log = root / "log"
            bindir = root / "bin"
            bindir.mkdir()
            sudo = bindir / "sudo"
            sudo.write_text(
                '#!/bin/sh\necho "sudo $*" >> "$LOG"\ncase " $* " in *" -n "*) exit "${PREFLIGHT_STATUS:-0}";; esac\n'
            )
            sudo.chmod(0o755)
            (root / "95-qutebrowser.sh").write_text(
                'echo prepare >> "$LOG"\nexit "${PREPARE_STATUS:-0}"\n'
            )
            (root / "90-helium.sh").write_text('echo helium >> "$LOG"\n')
            import os

            env = dict(
                os.environ, PATH=str(bindir) + ":" + os.environ["PATH"], LOG=str(log)
            )
            subprocess.run(["bash", script], env=env, check=True)
            lines = log.read_text().splitlines()
            self.assertEqual(lines[0], "sudo xbps-install -S")
            self.assertEqual(lines[1], "prepare")
            self.assertTrue(any(" -n " in line for line in lines[2:-1]))
            self.assertEqual(lines[-1], "helium")
            log.write_text("")
            env["PREPARE_STATUS"] = "1"
            result = subprocess.run(["bash", script], env=env)
            self.assertNotEqual(result.returncode, 0)
            self.assertEqual(
                log.read_text().splitlines(), ["sudo xbps-install -S", "prepare"]
            )
            log.write_text("")
            env["PREPARE_STATUS"] = "0"
            env["PREFLIGHT_STATUS"] = "1"
            result = subprocess.run(["bash", script], env=env)
            self.assertNotEqual(result.returncode, 0)
            lines = log.read_text().splitlines()
            self.assertEqual(len(lines), 3)
            self.assertIn(" -n ", lines[-1])


if __name__ == "__main__":
    unittest.main()
