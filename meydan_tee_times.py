#!/usr/bin/env python3
"""
Meydan Golf Tee Time Fetcher
Fetches available tee times from The Track, Meydan Golf booking portal.
Usage:
    python meydan_tee_times.py --date 2026-02-23 --players 2 --holes 9
    python meydan_tee_times.py --date 2026-02-24 --players 4 --holes 18 --time-range "15:00/18:00"
"""
import argparse
import re
import sys
from datetime import date, datetime, timedelta
from typing import Optional
try:
    import requests
    from bs4 import BeautifulSoup
except ImportError:
    print("Missing dependencies. Install with:")
    print("  pip install requests beautifulsoup4")
    sys.exit(1)
# ── Constants reverse-engineered from portal.back9solutions.com ──────────────
BASE_URL = "https://portal.back9solutions.com/thetrackmeydan/bookings/tee-times"
# club_id / rate_category_id pairs discovered from live URL
COURSE_CONFIG = {
    9:  {"club_id": 279, "rate_category_id": 168, "label": "9 Holes (Floodlit)"},
    18: {"club_id": 279, "rate_category_id": 167, "label": "18 Holes"},  # adjust if needed
}
TIME_RANGES = [
    "06:00/09:00",
    "09:00/12:00",
    "12:00/15:00",
    "15:00/18:00",
    "18:00/23:59",
]
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                  "AppleWebKit/537.36 (KHTML, like Gecko) "
                  "Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://portal.back9solutions.com/thetrackmeydan",
}
# ── Scraping ─────────────────────────────────────────────────────────────────
def fetch_range(session: requests.Session, holes: int, booking_date: str,
                time_range: str, players: int) -> list[dict]:
    """Fetch tee times for a single time range window."""
    cfg = COURSE_CONFIG[holes]
    url = (
        f"{BASE_URL}/{cfg['club_id']}/{cfg['rate_category_id']}"
        f"?date={booking_date}"
        f"&range={time_range.replace('/', '%2F')}"
        f"&available_spaces={players}"
        f"&rate_category_id={cfg['rate_category_id']}"
    )
    resp = session.get(url, headers=HEADERS, timeout=15)
    resp.raise_for_status()
    soup = BeautifulSoup(resp.text, "html.parser")
    return parse_tee_times(soup)
def parse_tee_times(soup: BeautifulSoup) -> list[dict]:
    """
    Extract tee time slots from the HTML.
    The page renders times and prices as text nodes without semantic class names,
    so we use regex on the full text to pull HH:MM patterns + adjacent prices.
    """
    slots = []
    # Find the section that lists available slots
    body_text = soup.get_text(separator=" ", strip=True)
    # Pattern: time  rate_name  price  [rate_name  price ...]
    # e.g. "07:10 Visitor 345.00 2026 Executive Card 305.00"
    time_blocks = re.findall(
        r"(\d{2}:\d{2})\s+(.*?)(?=\d{2}:\d{2}|OverviewEdit|$)",
        body_text
    )
    for time_str, rate_block in time_blocks:
        rates = {}
        # Extract all (label, price) pairs within this block
        price_matches = re.findall(r"([A-Za-z][A-Za-z0-9 ]+?)\s+([\d]+\.[\d]{2})", rate_block)
        for label, price in price_matches:
            rates[label.strip()] = float(price)
        if rates:  # only add if we found price data (filters out non-slot matches)
            slots.append({"time": time_str, "rates": rates})
    return slots
# ── Main ─────────────────────────────────────────────────────────────────────
def get_tee_times(
    booking_date: str,
    players: int = 2,
    holes: int = 9,
    time_range: Optional[str] = None,
) -> list[dict]:
    """
    Return available tee times for the given parameters.
    Args:
        booking_date: Date string in YYYY-MM-DD format.
        players:      Number of players (1–4).
        holes:        9 or 18.
        time_range:   Optional specific range like "15:00/18:00".
                      If None, all time ranges are queried.
    Returns:
        List of dicts: [{"time": "07:10", "rates": {"Visitor": 345.0, ...}}, ...]
    """
    if holes not in COURSE_CONFIG:
        raise ValueError(f"holes must be 9 or 18, got {holes}")
    if not 1 <= players <= 4:
        raise ValueError(f"players must be 1–4, got {players}")
    ranges_to_query = [time_range] if time_range else TIME_RANGES
    session = requests.Session()
    all_slots: list[dict] = []
    seen_times: set[str] = set()
    for r in ranges_to_query:
        slots = fetch_range(session, holes, booking_date, r, players)
        for slot in slots:
            if slot["time"] not in seen_times:
                seen_times.add(slot["time"])
                all_slots.append(slot)
    all_slots.sort(key=lambda s: s["time"])
    return all_slots
def print_results(slots: list[dict], booking_date: str, players: int, holes: int):
    """Pretty-print tee time results."""
    label = COURSE_CONFIG[holes]["label"]
    date_fmt = datetime.strptime(booking_date, "%Y-%m-%d").strftime("%a %d %b %Y")
    print(f"\n{'─'*52}")
    print(f"  The Track, Meydan Golf — Available Tee Times")
    print(f"  {date_fmt}  |  {holes} holes  |  {players} player(s)")
    print(f"  Course: {label}")
    print(f"{'─'*52}")
    if not slots:
        print("  No available tee times found.")
    else:
        # Print header from first slot's rate keys
        rate_keys = list(slots[0]["rates"].keys())
        header = f"  {'TIME':<8}" + "".join(f"{k:<26}" for k in rate_keys)
        print(header)
        print(f"  {'─'*6}  " + "  ".join("─" * 22 for _ in rate_keys))
        for slot in slots:
            row = f"  {slot['time']:<8}"
            for k in rate_keys:
                price = slot["rates"].get(k)
                row += f"AED {price:<22.2f}" if price else f"{'N/A':<26}"
            print(row)
    print(f"{'─'*52}")
    print(f"  {len(slots)} slot(s) found.\n")
# ── CLI ───────────────────────────────────────────────────────────────────────
def parse_args():
    tomorrow = (date.today() + timedelta(days=1)).strftime("%Y-%m-%d")
    parser = argparse.ArgumentParser(
        description="Fetch available tee times from Meydan Golf."
    )
    parser.add_argument("--date", default=tomorrow,
                        help=f"Booking date YYYY-MM-DD (default: {tomorrow})")
    parser.add_argument("--players", type=int, default=2,
                        help="Number of players 1–4 (default: 2)")
    parser.add_argument("--holes", type=int, choices=[9, 18], default=9,
                        help="9 or 18 holes (default: 9)")
    parser.add_argument("--time-range", default=None,
                        help='Specific range e.g. "15:00/18:00" (default: all day)')
    parser.add_argument("--json", action="store_true",
                        help="Output raw JSON instead of formatted table")
    return parser.parse_args()
if __name__ == "__main__":
    args = parse_args()
    print(f"Fetching tee times for {args.date} — {args.holes} holes, {args.players} player(s)...")
    slots = get_tee_times(
        booking_date=args.date,
        players=args.players,
        holes=args.holes,
        time_range=args.time_range,
    )
    if args.json:
        import json
        print(json.dumps(slots, indent=2))
    else:
        print_results(slots, args.date, args.players, args.holes)
