import importlib.util
import json
import urllib.error
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


def index(version, platform="linux", arch="amd64", xml="2.15.3"):
    return {
        "annotations": {"org.opencontainers.image.version": version},
        "manifests": [
            {
                "platform": {"os": platform, "architecture": arch},
                "annotations": {
                    "org.opencontainers.image.ref.name": version + ".x86_64_linux",
                    "sh.brew.bottle.digest": "a" * 64,
                    "sh.brew.tab": json.dumps(
                        {
                            "runtime_dependencies": [
                                {
                                    "full_name": "libxml2",
                                    "version": xml,
                                    "pkg_version": xml,
                                }
                            ]
                        }
                    ),
                },
            }
        ],
    }


class UpdateTests(unittest.TestCase):
    def test_newer_local_engine_needs_no_download(self):
        self.assertFalse(update.needs_update("6.11.2_1", "6.11.1_1"))
        self.assertFalse(update.needs_update("6.11.2_1", "6.11.2_1"))

    def test_new_patch_and_revision_are_detected(self):
        self.assertTrue(update.needs_update("6.11.2_1", "6.11.3_1"))
        self.assertTrue(update.needs_update("6.11.2_1", "6.11.2_2"))

    def test_historical_bottle_is_selected_by_exact_version(self):
        with patch.object(
            update, "registry_index", return_value=index("6.11.1")
        ) as request:
            result = update.bottle("qtwebengine", "6.11.1")
        request.assert_called_once_with("qtwebengine", "6.11.1")
        self.assertEqual(result["sha256"], "a" * 64)

    def test_wrong_version_or_platform_is_rejected(self):
        for manifest in [
            index("6.11.2"),
            index("6.11.1", "darwin"),
            index("6.11.1", arch="arm64"),
        ]:
            with patch.object(update, "registry_index", return_value=manifest):
                with self.assertRaises(ValueError):
                    update.bottle("qtwebengine", "6.11.1")

    def test_dependency_uses_historical_build_version_too(self):
        with patch.object(
            update, "registry_index", side_effect=[index("6.11.1"), index("2.15.3")]
        ) as request:
            result = update.resolve("6.11.1")
        self.assertEqual(result["qt"], "6.11.1")
        self.assertEqual(result["xml"], "2.15.3")
        self.assertEqual(request.call_args_list[0].args, ("qtwebengine", "6.11.1"))
        self.assertEqual(request.call_args_list[1].args, ("libxml2", "2.15.3"))

    def test_plan_uses_void_target_and_matching_download_digest(self):
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory) / "plan.json"

            def query(prop, package, remote=False):
                return (
                    update.LOCAL if prop == "repository" else "qt6-webengine-6.11.1_2"
                )

            installed = subprocess.CompletedProcess(
                [], 0, "qt6-webengine-6.11.0_1\n", ""
            )
            with (
                patch.object(update, "query", side_effect=query),
                patch.object(
                    update,
                    "registry_index",
                    side_effect=[index("6.11.1"), index("2.15.3")],
                ) as request,
                patch.object(update.subprocess, "run", return_value=installed),
                patch.object(update, "needs_update", return_value=True),
            ):
                update.plan(target)
            selected = json.loads(target.read_text())
            self.assertEqual(selected["pkgver"], "6.11.1_2")
            self.assertEqual(selected["qt"], "6.11.1")
            self.assertEqual(selected["qt_sha"], "a" * 64)
            self.assertEqual(request.call_args_list[0].args, ("qtwebengine", "6.11.1"))

    def test_registry_error_is_not_treated_as_a_missing_version(self):
        error = urllib.error.HTTPError(
            "https://ghcr.io/test", 503, "unavailable", {}, None
        )
        try:
            with patch.object(update, "registry_index", side_effect=error):
                with self.assertRaises(urllib.error.HTTPError):
                    update.bottle("qtwebengine", "6.11.1")
        finally:
            error.close()

    def test_missing_target_keeps_installed_engine(self):
        with tempfile.TemporaryDirectory() as directory:
            target = pathlib.Path(directory) / "plan.json"

            def query(prop, package, remote=False):
                return (
                    update.LOCAL if prop == "repository" else "qt6-webengine-6.11.3_1"
                )

            installed = subprocess.CompletedProcess(
                [], 0, "qt6-webengine-6.11.2_1\n", ""
            )
            missing = urllib.error.HTTPError(
                "https://ghcr.io/test", 404, "missing", {}, None
            )
            with (
                patch.object(update, "query", side_effect=query),
                patch.object(update, "registry_index", side_effect=missing) as request,
                patch.object(update.subprocess, "run", return_value=installed),
                patch.object(update, "needs_update", return_value=True),
            ):
                update.plan(target)
            self.assertFalse(target.exists())
            request.assert_called_once_with("qtwebengine", "6.11.3")

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
