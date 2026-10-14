import importlib.util
import unittest
from datetime import date, datetime, timedelta, timezone
from pathlib import Path


SPEC = importlib.util.spec_from_file_location(
    "daily_summary", Path(__file__).with_name("summary.py")
)
summary = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(summary)


class DailySummaryTest(unittest.TestCase):
    def test_day_bounds_use_local_midnights(self):
        start, end = summary.day_bounds(date(2026, 9, 3))
        self.assertEqual(start.hour, 0)
        self.assertEqual(end.hour, 0)
        self.assertEqual(start.date(), date(2026, 9, 3))
        self.assertEqual(end.date(), date(2026, 9, 4))

    def test_estimates_separate_work_windows(self):
        start = datetime(2026, 9, 3, 9, tzinfo=timezone.utc)
        timestamps = [
            start,
            start + timedelta(minutes=4),
            start + timedelta(minutes=15),
            start + timedelta(minutes=17),
        ]
        self.assertEqual(
            summary.estimate_active_time(timestamps), timedelta(minutes=7)
        )

    def test_filters_stream_noise_and_reasoning(self):
        self.assertTrue(summary.meaningful_event({"type": "client/turn/requested"}))
        self.assertTrue(
            summary.meaningful_event(
                {"type": "item/completed", "data": {"item": {"type": "agentMessage"}}}
            )
        )
        self.assertFalse(
            summary.meaningful_event(
                {"type": "item/completed", "data": {"item": {"type": "reasoning"}}}
            )
        )
        self.assertFalse(summary.meaningful_event({"type": "item/agentMessage/delta"}))

    def test_normalizes_https_and_ssh_github_remotes(self):
        expected = "https://github.com/brandnewbox/integrity-truck"
        self.assertEqual(
            summary.github_repo_url("git@github.com:brandnewbox/integrity-truck.git"),
            expected,
        )
        self.assertEqual(
            summary.github_repo_url("https://github.com/brandnewbox/integrity-truck.git"),
            expected,
        )

    def test_ignores_bare_issue_numbers_copied_into_prompts(self):
        links = summary.issue_links(
            "Work on issue #12",
            "Follow the example for #999, then open https://github.com/acme/repo/issues/34",
            "https://github.com/acme/repo",
        )
        self.assertEqual(
            links,
            [
                "[#34](https://github.com/acme/repo/issues/34)",
                "[#12](https://github.com/acme/repo/issues/12)",
            ],
        )

    def test_renders_bb_source_and_merged_pr(self):
        timestamp = datetime(2026, 9, 3, 9, tzinfo=timezone.utc)
        entry = {
            "id": "thr_1",
            "project": "example",
            "title": "Fix issue #12",
            "status": "idle",
            "parent_id": None,
            "event_count": 4,
            "first": timestamp,
            "last": timestamp + timedelta(minutes=2),
            "active_time": timedelta(minutes=2, seconds=30),
            "issues": ["[#12](https://github.com/acme/example/issues/12)"],
            "pull_request": {
                "number": 14,
                "url": "https://github.com/acme/example/pull/14",
                "state": "merged",
            },
        }
        output = summary.render(date(2026, 9, 3), [entry], [])
        self.assertIn("**1 BB threads**", output)
        self.assertIn("**1 merged PRs**", output)
        self.assertIn("Source: BB thread event logs", output)
        self.assertNotIn("REINS", output)


if __name__ == "__main__":
    unittest.main()
