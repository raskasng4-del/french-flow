#!/usr/bin/env python3
"""
Analytics Bot — Reads last N posts from Facebook, tracks engagement.
Saves to performance_log.json for format-level analysis.

Usage:
  FB_PAGE_ID=xxx FB_ACCESS_TOKEN=xxx python3 bot/analytics.py
"""
import os, json, asyncio, datetime
from pathlib import Path

BOT_DIR = Path(__file__).parent
PERF_LOG = BOT_DIR / "performance_log.json"
POST_COUNT = 6


def load_log():
    if os.path.exists(PERF_LOG):
        return json.load(open(PERF_LOG, encoding="utf-8"))
    return {"posts": [], "by_format": {}, "last_fetch": None}


def save_log(log):
    json.dump(log, open(PERF_LOG, "w"), indent=2, ensure_ascii=False)
    print(f"  💾 Saved to {PERF_LOG}")


def classify_format(desc=""):
    d = desc.lower()
    if "mot du jour" in d or "wotd" in d or "vocabulaire" in d:
        return "vocabulary_wotd"
    if "grammaire" in d or "quiz" in d or "grammar" in d:
        return "grammar_quiz"
    if "histoire" in d or "story" in d or "partie" in d:
        return "storytelling"
    return "unknown"


async def fetch_posts(page_id, token, count=POST_COUNT):
    import aiohttp
    url = f"https://graph.facebook.com/v22.0/{page_id}/posts"
    params = {
        "fields": "id,message,created_time,likes.limit(0).summary(true),"
                  "comments.limit(0).summary(true),shares",
        "access_token": token,
        "limit": count,
    }
    async with aiohttp.ClientSession() as session:
        async with session.get(url, params=params) as resp:
            data = await resp.json()
            if "error" in data:
                print(f"  ❌ API error: {data['error']}")
                return []
            posts = data.get("data", [])
            results = []
            for p in posts:
                results.append({
                    "id": p["id"],
                    "created_time": p.get("created_time", ""),
                    "message": (p.get("message") or "")[:200],
                    "likes": p.get("likes", {}).get("summary", {}).get("total_count", 0),
                    "comments": p.get("comments", {}).get("summary", {}).get("total_count", 0),
                    "shares": p.get("shares", {}).get("count", 0),
                    "engagement": (
                        p.get("likes", {}).get("summary", {}).get("total_count", 0) +
                        p.get("comments", {}).get("summary", {}).get("total_count", 0) +
                        p.get("shares", {}).get("count", 0)
                    ),
                })
            return results


def update_by_format(log, posts):
    fmt_data = log.setdefault("by_format", {})
    for p in posts:
        fmt = classify_format(p.get("message", ""))
        if fmt not in fmt_data:
            fmt_data[fmt] = {"count": 0, "total_engagement": 0, "posts": []}
        fmt_data[fmt]["count"] += 1
        fmt_data[fmt]["total_engagement"] += p["engagement"]
        fmt_data[fmt]["posts"].append({
            "id": p["id"],
            "engagement": p["engagement"],
            "likes": p["likes"],
            "comments": p["comments"],
            "shares": p["shares"],
            "created_time": p["created_time"],
        })

    # Calculate averages
    for fmt, d in fmt_data.items():
        avg_eng = d["total_engagement"] / d["count"] if d["count"] > 0 else 0
        d["avg_engagement"] = round(avg_eng, 1)

    return fmt_data


async def main():
    page_id = os.environ.get("FB_PAGE_ID")
    token = os.environ.get("FB_ACCESS_TOKEN")
    if not page_id or not token:
        print("❌ Missing FB_PAGE_ID or FB_ACCESS_TOKEN")
        return

    print(f"📊 Analytics — Last {POST_COUNT} posts")

    log = load_log()
    posts = await fetch_posts(page_id, token)
    if not posts:
        print("  ⚠️ No posts fetched"); return

    print(f"  ✅ Fetched {len(posts)} posts")
    log["posts"] = posts
    log["by_format"] = update_by_format(log, posts)
    log["last_fetch"] = str(datetime.date.today())

    # Summary
    print(f"\n📈 Engagement by format:")
    for fmt, d in sorted(log["by_format"].items(), key=lambda x: x[1]["avg_engagement"], reverse=True):
        print(f"  {fmt:20s}  avg={d['avg_engagement']:>6.1f}  total={d['total_engagement']:>4d}  count={d['count']}")

    # Top post
    if posts:
        best = max(posts, key=lambda p: p["engagement"])
        print(f"\n🏆 Best post: {best['engagement']} eng | {best.get('message', '')[:60]}...")

    save_log(log)
    print("✨ Done!")


if __name__ == "__main__":
    asyncio.run(main())
