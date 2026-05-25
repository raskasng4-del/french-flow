#!/usr/bin/env python3
"""
Smart Scheduler — Analyzes performance_log.json and recommends optimal
posting times for each content format.

Strategy:
  1. Read performance_log.json (from analytics.py)
  2. Group posts by hour of day and format
  3. Calculate average engagement per hour per format
  4. Recommend best slots for each format

Usage:
  python3 bot/smart_scheduler.py

Output: recommended cron schedule + strategy report
"""
import json, os
from pathlib import Path
from collections import defaultdict

BOT_DIR = Path(__file__).parent
PERF_LOG = BOT_DIR / "performance_log.json"
RECOMMENDATION_FILE = BOT_DIR / "schedule_recommendation.json"

# Default slots if no data yet
DEFAULT_CRON = "0 8,18 * * *"


def load_log():
    if not os.path.exists(PERF_LOG):
        print("⚠️ No performance_log.json yet. Run analytics.py first.")
        return None
    return json.load(open(PERF_LOG, encoding="utf-8"))


def analyze(log):
    if not log or not log.get("posts"):
        print("⚠️ No post data available.")
        return None

    # Group engagement by format and hour
    by_format_hour = defaultdict(lambda: {"count": 0, "total_eng": 0})

    for p in log["posts"]:
        created = p.get("created_time", "")
        if not created or "T" not in created:
            continue
        try:
            hour = int(created.split("T")[1].split(":")[0])
        except (ValueError, IndexError):
            continue

        # Classify format from the post message
        msg = (p.get("message") or "").lower()
        if "mot du jour" in msg or "wotd" in msg or "vocabulaire" in msg:
            fmt = "vocabulary_wotd"
        elif "grammaire" in msg or "quiz" in msg or "grammar" in msg:
            fmt = "grammar_quiz"
        elif "histoire" in msg or "story" in msg or "partie" in msg:
            fmt = "storytelling"
        else:
            fmt = "unknown"

        key = (fmt, hour)
        by_format_hour[key]["count"] += 1
        by_format_hour[key]["total_eng"] += p.get("engagement", 0)

    # Calculate averages and rank
    rankings = []
    for (fmt, hour), data in by_format_hour.items():
        avg = data["total_eng"] / data["count"] if data["count"] > 0 else 0
        rankings.append({"format": fmt, "hour": hour, "avg_engagement": round(avg, 1), "count": data["count"]})

    rankings.sort(key=lambda r: r["avg_engagement"], reverse=True)

    # Best hour per format
    best_per_format = {}
    for r in rankings:
        fmt = r["format"]
        if fmt not in best_per_format or r["avg_engagement"] > best_per_format[fmt]["avg_engagement"]:
            best_per_format[fmt] = r

    return {"rankings": rankings, "best_per_format": best_per_format}


def recommend_schedule(analysis):
    if not analysis:
        return DEFAULT_CRON

    best = analysis["best_per_format"]
    print("📈 Best posting hours per format:")
    for fmt, data in sorted(best.items(), key=lambda x: x[1]["avg_engagement"], reverse=True):
        print(f"  {fmt:20s} → {data['hour']:02d}:00  (avg {data['avg_engagement']} eng, {data['count']} posts)")

    # Build recommended cron from best hours
    best_hours = sorted(set(d["hour"] for d in best.values()))
    if not best_hours:
        return DEFAULT_CRON

    # Pick top 2-3 distinct hours
    ranked_hours = sorted(
        [(h, sum(r["avg_engagement"] for r in analysis["rankings"] if r["hour"] == h))
         for h in best_hours],
        key=lambda x: x[1], reverse=True
    )
    top_hours = sorted(h for h, _ in ranked_hours[:3])

    if len(top_hours) <= 1:
        cron = f"0 {top_hours[0]} * * *" if top_hours else DEFAULT_CRON
    else:
        cron = f"0 {','.join(str(h) for h in top_hours)} * * *"

    print(f"\n📅 Recommended cron: {cron}")

    # Save recommendation
    rec = {
        "analyzed_at": str(__import__("datetime").date.today()),
        "recommended_cron": cron,
        "best_per_format": best,
        "rankings": analysis["rankings"],
        "note": "Update .github/workflows/daily-publish.yml schedule with this cron",
    }
    json.dump(rec, open(RECOMMENDATION_FILE, "w"), indent=2, ensure_ascii=False)
    print(f"  💾 Saved to {RECOMMENDATION_FILE}")

    return cron


def main():
    print("🤖 Smart Scheduler — French Flow")
    log = load_log()
    analysis = analyze(log)

    if not analysis:
        print("\n📋 Default recommendation (no data yet):")
        print(f"  Cron: {DEFAULT_CRON}")
        print("  Strategy: Post at 8:00 (morning) and 18:00 (evening)")
        print("  Once analytics.py runs and collects data, re-run this script")
        print("  for data-driven recommendations.")
        return

    cron = recommend_schedule(analysis)

    print(f"\n📋 Strategy:")
    print(f"  1. Run analytics.py daily to collect engagement data")
    print(f"  2. Re-run smart_scheduler.py weekly to update cron")
    print(f"  3. Post during hours with highest engagement per format")
    print(f"  4. If a format consistently underperforms, swap it with")
    print(f"     a different content type in the rotation")

    print("\n✨ Done!")


if __name__ == "__main__":
    main()
