"""Read-only central registry invariants and no accidental satellite activation."""
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

TARGET = Path(__file__).resolve().parents[1] / "scripts" / "network_control.py"
spec = importlib.util.spec_from_file_location("network_control", TARGET)
network = importlib.util.module_from_spec(spec)
spec.loader.exec_module(network)


def base():
    return json.loads((Path(__file__).resolve().parents[1] /
                      "ops/network/sites.json").read_text(encoding="utf-8"))


def future(name="future-example"):
    return {"site_id": "gh-" + name, "repository": "emfls/guidehollow-" + name,
            "hostname": name + ".guidehollow.com", "state": "preparing",
            "publication_enabled": False, "publisher": "central",
            "daily_limit": 0, "notion_site_page_id": None}


class NetworkControlTests(unittest.TestCase):
    def test_main_only_passes_and_does_not_create_anything(self):
        report = network.validate_registry(base())
        self.assertEqual((report["registered_sites"], report["active_sites"]), (1, 1))
        self.assertEqual(report["status"], "PASS")
        self.assertFalse(report["cross_repo_publishing_enabled"])

    def test_safe_future_site_proposal_is_read_only(self):
        reg = base()
        original = json.dumps(reg, sort_keys=True)
        plan = network.preview_new_site(reg, "future-example")
        self.assertFalse(plan["changes_applied"])
        self.assertEqual(plan["would_register"]["state"], "preparing")
        self.assertFalse(plan["would_register"]["publication_enabled"])
        self.assertEqual(plan["would_register"]["hostname"], "future-example.guidehollow.com")
        self.assertEqual(original, json.dumps(reg, sort_keys=True))

    def test_rejects_bad_slugs_and_domain_escape(self):
        for slug in ("../../oops", "Main", "evil.example.com", "--oops", "future_example"):
            with self.subTest(slug=slug), self.assertRaises(network.PolicyError):
                network.preview_new_site(base(), slug)
        reg = base()
        wrong = future()
        wrong["hostname"] = "foreign-site.example.com"
        reg["sites"].append(wrong)
        with self.assertRaises(network.PolicyError):
            network.validate_registry(reg)

    def test_future_sites_must_remain_non_operational(self):
        reg = base()
        reg["sites"].append(future())
        self.assertEqual(network.validate_registry(reg)["registered_sites"], 2)
        for key, val in (("state", "active"), ("publication_enabled", True),
                         ("daily_limit", 3), ("publisher", "repo-local")):
            altered = base()
            altered["sites"].append(future())
            altered["sites"][-1][key] = val
            with self.subTest(key=key), self.assertRaises(network.PolicyError):
                network.validate_registry(altered)

    def test_expansion_and_cross_repo_switches_fail_closed(self):
        for switch in ("expansion_enabled", "cross_repo_publishing_enabled"):
            reg = base()
            reg[switch] = True
            with self.subTest(switch=switch), self.assertRaises(network.PolicyError):
                network.validate_registry(reg)

    def test_no_duplicate_domains_repos_or_site_ids(self):
        reg = base()
        reg["sites"].extend((future(), future()))
        with self.assertRaisesRegex(network.PolicyError, "Duplicate site_id"):
            network.validate_registry(reg)

    def test_unknown_fields_refuse_secret_leaks(self):
        reg = base()
        reg["NOTION_API_TOKEN"] = "this-should-never-live-in-a-manifest"
        with self.assertRaises(network.PolicyError):
            network.validate_registry(reg)
        reg = base()
        reg["sites"][0]["private_key"] = "never"
        with self.assertRaises(network.PolicyError):
            network.validate_registry(reg)

    def test_registry_audit_cli_exit_code(self):
        with tempfile.TemporaryDirectory() as tmp:
            file = Path(tmp)/"registry.json"
            file.write_text(json.dumps(base()))
            self.assertEqual(network.main(["--registry", str(file), "audit"]), 0)
            file.write_text("{}")
            self.assertEqual(network.main(["--registry", str(file), "audit"]), 2)


if __name__ == "__main__":
    unittest.main()
