#!/usr/bin/env python3
"""
Status Bot — Health check for French Flow system.
Usage:
  GITHUB_TOKEN=ghp_xxx python3 bot/status.py

Checks:
  1. Last successful GitHub Action run time
  2. Status of last 3 scheduled videos
  3. If performance_log.json updated in last 24h
"""
import os, json, datetime, subprocess, sys
from pathlib import Path

BOT_DIR = Path(__file__).parent
PROGRESS_FILE = BOT_DIR / "progress.json"
PERF_LOG = BOT_DIR / "performance_log.json"
STORY_PROGRESS = BOT_DIR / "story_progress.json"

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
RESET = "\033[0m"
BOLD = "\033[1m"

errors = []
warnings = []


def ok(msg):
    print(f"  {GREEN}✅{RESET} {msg}")


def fail(msg):
    print(f"  {RED}❌{RESET} {msg}")
    errors.append(msg)


def warn(msg):
    print(f"  {YELLOW}⚠️{RESET} {msg}")
    warnings.append(msg)


def load_json(path):
    if not os.path.exists(path):
        return None
    try:
        return json.load(open(path, encoding="utf-8"))
    except:
        return None


def days_ago(date_str):
    try:
        d = datetime.date.fromisoformat(date_str)
        return (datetime.date.today() - d).days
    except:
        return 999


# ── Check 1: Last GitHub Action run ──────────────────────────────────────
def check_github_actions():
    print(f"\n{BOLD}📡 GitHub Actions Status{RESET}")
    token = os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        warn("GITHUB_TOKEN not set — skipping GitHub API check")
        print("  💡 Set GITHUB_TOKEN env var to check workflow status")
        return

    repo = "raskasng4-del/french-flow"
    workflow = "daily-publish.yml"
    url = f"https://api.github.com/repos/{repo}/actions/workflows/{workflow}/runs?per_page=3&status=success"

    try:
        import urllib.request
        req = urllib.request.Request(url, headers={
            "Authorization": f"Bearer {token}",
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "french-flow-status",
        })
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())

        runs = data.get("workflow_runs", [])
        if not runs:
            warn("No successful workflow runs found")
            return

        ok(f"Last {len(runs)} successful runs:")
        for i, run in enumerate(runs[:3]):
            created = run["created_at"][:19].replace("T", " ")
            branch = run["head_branch"]
            run_url = run["html_url"]
            print(f"       {i+1}. {created} ({branch})")
            print(f"          {run_url}")
    except Exception as e:
        fail(f"GitHub API: {e}")


# ── Check 2: Last 3 published videos ─────────────────────────────────────
def check_last_videos():
    print(f"\n{BOLD}🎬 Last 3 Published Videos{RESET}")
    progress = load_json(PROGRESS_FILE)
    if not progress:
        fail("progress.json not found or invalid")
        return

    videos = progress.get("published_videos", [])
    if not videos:
        warn("No published videos found in progress.json")
        return

    recent = videos[-3:] if len(videos) >= 3 else videos
    today = datetime.date.today()

    for v in reversed(recent):
        vtype = v.get("type", "?")
        date_str = v.get("date", "?")
        published = v.get("published", False)
        age = days_ago(date_str) if date_str != "?" else 999

        if published and age <= 1:
            ok(f"{vtype:15s} on {date_str}")
        elif published and age <= 7:
            ok(f"{vtype:15s} on {date_str} ({age}d ago)")
            warn(f"  Last video is {age} days old")
        elif not published:
            fail(f"{vtype:15s} on {date_str} — NOT published")
        else:
            fail(f"{vtype:15s} on {date_str} — {age} days ago")

    # Check story progress
    story = load_json(STORY_PROGRESS)
    if story:
        last_date = story.get("last_date")
        if last_date:
            age = days_ago(last_date)
            if age <= 1:
                ok(f"Story last published: {last_date}")
            else:
                warn(f"Story last published: {last_date} ({age}d ago)")
        slot = story.get("slot", 0)
        print(f"       Story slot progress: {slot}/6")


# ── Check 3: performance_log.json freshness ──────────────────────────────
def check_perf_log():
    print(f"\n{BOLD}📊 Analytics Data{RESET}")
    if not os.path.exists(PERF_LOG):
        warn("performance_log.json not found (run analytics.py first)")
        return

    mtime = os.path.getmtime(PERF_LOG)
    last_modified = datetime.datetime.fromtimestamp(mtime)
    age_hours = (datetime.datetime.now() - last_modified).total_seconds() / 3600

    if age_hours < 24:
        ok(f"performance_log.json updated {age_hours:.0f}h ago ({last_modified:%Y-%m-%d %H:%M})")
    else:
        fail(f"performance_log.json last updated {age_hours:.0f}h ago — stale!")

    # Show format-level summary if available
    log = load_json(PERF_LOG)
    if log and "by_format" in log:
        for fmt, data in log["by_format"].items():
            avg = data.get("avg_engagement", 0)
            count = data.get("count", 0)
            print(f"       {fmt:20s} avg {avg:.1f} eng ({count} posts)")


# ── System clock sanity ──────────────────────────────────────────────────
def check_system():
    print(f"\n{BOLD}🕒 System Info{RESET}")
    now = datetime.datetime.now()
    ok(f"System time: {now:%Y-%m-%d %H:%M:%S}")
    if now.year < 2026:
        fail("System clock is wrong")
    print(f"       Python: {sys.version.split()[0]}")
    print(f"       CWD: {os.getcwd()}")


# ── Main ─────────────────────────────────────────────────────────────────
def main():
    print(f"{BOLD}🔍 French Flow — System Status{RESET}")
    print(f"{'='*50}")

    check_system()
    check_github_actions()
    check_last_videos()
    check_perf_log()

    print(f"\n{'='*50}")
    if not errors and not warnings:
        print(f"\n{GREEN}{BOLD}✅ SYSTEM HEALTHY{RESET}")
        print(f"  All systems operational, content pipeline running smoothly.")
        sys.exit(0)
    elif errors and not warnings:
        print(f"\n{RED}{BOLD}❌ SYSTEM UNHEALTHY{RESET}")
        print(f"  {len(errors)} error(s) found — needs attention")
        for e in errors:
            print(f"  {RED}•{RESET} {e}")
        sys.exit(2)
    elif warnings and not errors:
        print(f"\n{YELLOW}{BOLD}⚠️  SYSTEM DEGRADED{RESET}")
        print(f"  {len(warnings)} warning(s) — check soon")
        sys.exit(1)
    else:
        print(f"\n{RED}{BOLD}❌ SYSTEM UNHEALTHY{RESET}")
        print(f"  {len(errors)} error(s), {len(warnings)} warning(s)")
        sys.exit(2)


if __name__ == "__main__":
    main()
