
"""
NBA Salary Scraper — eu.hoopshype.com
Outputs one CSV per season in:
  nba_salaries/players/YYYY-YYYY+1.csv   →  player, salary_usd, season
  nba_salaries/teams/YYYY-YYYY+1.csv    →  team,   salary_usd, season

Real table structure (3 columns only):
  td[0] : rank
  td[1] : logo (img alt="") + name  →  <a><div>Name</div></a>  OR  <span><div>Name</div></span>
  td[2] : salary                    →  <span>$X,XXX,XXX</span>

Name extraction (two-step):
  1. <a> link text  — player has a profile page
  2. td[1].inner_text()  — no profile link; img alt="" so only the name text is returned

Usage:
  pip install playwright playwright-stealth
  playwright install chromium
"""

import re, csv, sys, time
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────

START_YEAR     = 2020
END_YEAR       = 2020
OUTPUT_DIR     = "scraped_data"

SCRAPE_PLAYERS = True
SCRAPE_TEAMS   = True

DELAY          = 2.0
HEADLESS       = True # Set to False for debugging (browser will be visible)

PLAYERS_BASE = "https://eu.hoopshype.com/salaries/players/"
TEAMS_BASE   = "https://eu.hoopshype.com/salaries/teams/"

# ── Helpers ───────────────────────────────────────────────────────────────────

def season_label(year):
    return f"{year}-{year + 1}"

def clean_salary(raw):
    digits = re.sub(r"[^\d]", "", raw)
    return int(digits) if digits else None

def csv_path(kind, season):
    return Path(OUTPUT_DIR) / kind / f"{season}.csv"

def write_csv(rows, fieldnames, kind, season):
    path = csv_path(kind, season)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"         💾  Saved → {path}  ({len(rows)} rows)")

# ── Cookie / GDPR banner ──────────────────────────────────────────────────────

COOKIE_SELECTORS = [
    "button:has-text('Accept All')",
    "button:has-text('Accept all')",
    "button:has-text('Accept')",
    "button:has-text('Agree')",
    "button:has-text('OK')",
    "[id*='accept']",
    "[class*='consent'] button",
    "[id*='cookie'] button",
]

def dismiss_cookie_banner(page):
    for sel in COOKIE_SELECTORS:
        try:
            btn = page.locator(sel).first
            if btn.is_visible(timeout=1500):
                btn.click()
                page.wait_for_timeout(800)
                print("         🍪  Cookie banner dismissed")
                return
        except Exception:
            continue

# ── Core row parser ───────────────────────────────────────────────────────────
#
# Two confirmed row variants:
#
# WITH profile link:
#   <td>[rank]</td>
#   <td><div>...<img alt="">...<a href="..."><div>Patrick Ewing</div></a></div></td>
#   <td><span><sup/></span><span>$4,250,000</span></td>
#
# WITHOUT profile link:
#   <td>[rank]</td>
#   <td><div>...<img alt="">...<span><div>Hot Rod Williams</div></span></div></td>
#   <td><span><sup/></span><span>$3,785,000</span></td>
#
# Key insight: img has alt="" so td[1].inner_text() returns ONLY the player name.

def parse_table_rows(page, season, name_key):
    rows = []
    trs  = page.locator("table tbody tr")

    for i in range(trs.count()):
        tr       = trs.nth(i)
        tds      = tr.locator("td")
        td_count = tds.count()
        if td_count < 3:
            continue

        # ── Name: td[1] ───────────────────────────────────────────────────────
        name_td = tds.nth(1)

        # Step 1: try <a> link text (player/team has a profile page)
        name = None
        link = name_td.locator("a")
        if link.count() > 0:
            name = link.first.inner_text().strip()

        # Step 2: fallback — read the full td[1] text.
        # The <img> has alt="" so inner_text() returns only the name string.
        if not name:
            name = name_td.inner_text().strip()

        if not name:
            continue

        # ── Salary: td[2] ─────────────────────────────────────────────────────
        salary_text = tds.nth(2).inner_text().strip()
        salary = clean_salary(salary_text) if "$" in salary_text else None

        rows.append({name_key: name, "salary_usd": salary, "season": season})

    return rows

# ── Pagination (players only) ─────────────────────────────────────────────────

def is_next_disabled(btn):
    try:
        if not btn.is_enabled(timeout=400):
            return True
        if btn.get_attribute("disabled") is not None:
            return True
        cls  = (btn.get_attribute("class") or "").lower()
        aria = (btn.get_attribute("aria-disabled") or "").lower()
        if any(x in cls for x in ["disabled", "inactive"]) or aria == "true":
            return True
    except Exception:
        pass
    return False

def scrape_all_player_pages(page, season):
    all_rows = []
    page_num = 1

    while True:
        try:
            page.wait_for_selector("table tbody tr", timeout=10_000)
        except Exception:
            print(f"         ⚠  No table rows on page {page_num}")
            break

        rows = parse_table_rows(page, season, name_key="player")
        if not rows:
            print(f"         ⚠  page {page_num}: 0 rows — stopping")
            break

        all_rows.extend(rows)
        print(f"         page {page_num:>2} → {len(rows):>3} players  "
              f"(total: {len(all_rows)})")

        next_btn = page.locator("button[class*='hd3Vfp']").last
        if next_btn.count() == 0 or is_next_disabled(next_btn):
            break

        next_btn.click()
        page.wait_for_timeout(1500)
        page_num += 1

    return all_rows

# ── Season scrapers ───────────────────────────────────────────────────────────

def _load_page(ctx, url):
    page = ctx.new_page()
    try:
        from playwright_stealth import stealth_sync
        stealth_sync(page)
    except ImportError:
        pass
    page.add_init_script(
        "Object.defineProperty(navigator,'webdriver',{get:()=>undefined});"
        "window.chrome={runtime:{}};"
    )
    page.goto(url, wait_until="domcontentloaded", timeout=30_000)
    page.wait_for_timeout(2000)
    dismiss_cookie_banner(page)
    return page


def scrape_players_season(year, ctx):
    from playwright.sync_api import TimeoutError as PWTimeout
    season = season_label(year)
    print(f"\n  [players]  {season}")

    if csv_path("players", season).exists():
        print(f"         ⏭  Already scraped — skipping")
        return

    page = None
    try:
        page = _load_page(ctx, f"{PLAYERS_BASE}?season={year}")
        page.wait_for_selector("table tbody tr", timeout=20_000)
        rows = scrape_all_player_pages(page, season)
        if rows:
            write_csv(rows, ["player", "salary_usd", "season"], "players", season)
        else:
            print(f"         ✗  No player data for {season}")
    except PWTimeout:
        if page:
            page.screenshot(path=f"debug_players_{year}.png", full_page=True)
        print(f"         ✗  Timeout — screenshot: debug_players_{year}.png")
    except Exception as exc:
        print(f"         ✗  Error: {exc}")
    finally:
        if page:
            page.close()


def scrape_teams_season(year, ctx):
    from playwright.sync_api import TimeoutError as PWTimeout
    season = season_label(year)
    print(f"\n  [teams]    {season}")

    if csv_path("teams", season).exists():
        print(f"         ⏭  Already scraped — skipping")
        return

    page = None
    try:
        page = _load_page(ctx, f"{TEAMS_BASE}?season={year}")
        page.wait_for_selector("table tbody tr", timeout=20_000)
        rows = parse_table_rows(page, season, name_key="team")
        if rows:
            print(f"         page  1 → {len(rows):>3} teams")
            write_csv(rows, ["team", "salary_usd", "season"], "teams", season)
        else:
            print(f"         ✗  No team data for {season}")
    except PWTimeout:
        if page:
            page.screenshot(path=f"debug_teams_{year}.png", full_page=True)
        print(f"         ✗  Timeout — screenshot: debug_teams_{year}.png")
    except Exception as exc:
        print(f"         ✗  Error: {exc}")
    finally:
        if page:
            page.close()

# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("playwright not installed.\nRun: pip install playwright && playwright install chromium")

    if not SCRAPE_PLAYERS and not SCRAPE_TEAMS:
        sys.exit("Both SCRAPE_PLAYERS and SCRAPE_TEAMS are False — nothing to do.")

    print("=" * 65)
    print("  NBA Salary Scraper — eu.hoopshype.com")
    print(f"  Seasons  : {START_YEAR}-{START_YEAR+1}  →  {END_YEAR}-{END_YEAR+1}")
    print(f"  Scraping : {'players  ' if SCRAPE_PLAYERS else ''}{'teams' if SCRAPE_TEAMS else ''}")
    print(f"  Output   : {Path(OUTPUT_DIR).resolve()}/")
    print(f"  Headless : {HEADLESS}")
    print("=" * 65)

    with sync_playwright() as pw:
        browser = pw.chromium.launch(
            headless=HEADLESS,
            args=[
                "--no-sandbox",
                "--disable-blink-features=AutomationControlled",
                "--disable-dev-shm-usage",
            ],
        )
        ctx = browser.new_context(
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
            viewport={"width": 1280, "height": 900},
            locale="en-US",
        )

        for year in range(START_YEAR, END_YEAR + 1):
            if SCRAPE_PLAYERS:
                scrape_players_season(year, ctx)
            if SCRAPE_TEAMS:
                scrape_teams_season(year, ctx)
            time.sleep(DELAY)

        browser.close()

    print(f"\n{'=' * 65}")
    print("  ✓  Done!")
    for kind in ["players", "teams"]:
        folder = Path(OUTPUT_DIR) / kind
        if not folder.exists():
            continue
        csvs  = sorted(folder.glob("*.csv"))
        total = sum(
            sum(1 for _ in f.open(encoding="utf-8")) - 1
            for f in csvs
        )
        print(f"     {kind:<8}: {len(csvs)} files  |  {total:,} total rows  →  {folder}/")
    print("=" * 65)

if __name__ == "__main__":
    main()