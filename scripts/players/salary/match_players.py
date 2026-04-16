
"""
Add personId to player_salaries.csv by matching player names against a
reference CSV that has firstName, lastName, personId, and gameDateTimeEst.

Steps:
  1. Build full_name = firstName + " " + lastName from reference
  2. Deduplicate reference → one unique row per (personId, full_name)
     personId is stable across seasons, no need to match by year
  3. Match scraped 'player' names via 3-pass pipeline:
       a. Exact normalized match
       b. Last name + first initial  ("K. Towns" ↔ "Karl-Anthony Towns")
       c. Fuzzy match (RapidFuzz)
  4. Output:
       matched_salaries.csv   — original salaries + personId + full_name + match info
       unmatched_salaries.csv — rows that couldn't be matched (manual review)

Install:
  pip install pandas rapidfuzz unidecode
"""

import re
import pandas as pd
from unidecode import unidecode
from rapidfuzz import process, fuzz

# NOTE: run it from the root of the project (where the data/ and scripts/ folders are) so paths work correctly
#  CONFIG

SCRAPED_FILE     = "data/scraped_data/player_salaries.csv" # player, salary_usd, season
REFERENCE_FILE   = "data/nba_database/PlayerStatistics.csv" # personId, firstName, lastName, gameDateTimeEst, ...

OUTPUT_MATCHED   = "data/scraped_data/matched_salaries.csv"

SCRAPED_NAME_COL = "player"

REF_ID_COL        = "personId"
REF_FIRSTNAME_COL = "firstName"
REF_LASTNAME_COL  = "lastName"

FUZZY_THRESHOLD  = 80   # lower → more matches but riskier; raise → more conservative

#  NAME NORMALIZATION 

def normalize(name: str) -> str:
    """Lowercase, strip accents, remove punctuation, collapse spaces."""
    name = unidecode(str(name))
    name = name.lower().strip()
    name = re.sub(r"[^a-z\s]", "", name)
    name = re.sub(r"\s+", " ", name)
    return name


def last_name_initial(name: str) -> str:
    """
    Reduces first name to its initial so abbreviated names can match full ones:
      'Karl-Anthony Towns' → 'k towns'
      'K. Towns'           → 'k towns'
      'LeBron James'       → 'l james'
    """
    parts = normalize(name).split()
    if len(parts) < 2:
        return normalize(name)
    return parts[0][0] + " " + " ".join(parts[1:])


#  BUILD REFERENCE

def build_reference(ref_df: pd.DataFrame) -> pd.DataFrame:
    """
    - Combine firstName + lastName → full_name
    - Deduplicate: keep one row per unique (personId, full_name)
      (personId is stable across seasons — no need to match by year)
    """
    ref = ref_df.copy()
    ref["full_name"] = (
        ref[REF_FIRSTNAME_COL].fillna("").str.strip()
        + " "
        + ref[REF_LASTNAME_COL].fillna("").str.strip()
    ).str.strip()

    # Drop rows with empty name or id
    ref = ref[ref["full_name"].str.len() > 0]
    ref = ref[ref[REF_ID_COL].notna()]

    # One row per unique player (deduplicate by personId)
    ref = ref.drop_duplicates(subset=[REF_ID_COL, "full_name"]).reset_index(drop=True)

    # Precompute normalized keys
    ref["_norm"]    = ref["full_name"].apply(normalize)
    ref["_initial"] = ref["full_name"].apply(last_name_initial)

    return ref


#  MATCH ONE NAME

def match_name(scraped_name: str, ref: pd.DataFrame):
    """
    Returns (person_id, full_name, method, score) or (None, None, None, 0).
    """
    norm_scraped    = normalize(scraped_name)
    initial_scraped = last_name_initial(scraped_name)

    # Pass 1 — exact normalized match
    exact = ref[ref["_norm"] == norm_scraped]
    if not exact.empty:
        row = exact.iloc[0]
        return row[REF_ID_COL], row["full_name"], "exact", 100

    # Pass 2 — last name + first initial match
    initial = ref[ref["_initial"] == initial_scraped]
    if not initial.empty:
        row = initial.iloc[0]
        return row[REF_ID_COL], row["full_name"], "initial", 95

    # Pass 3 — fuzzy match across all players
    candidates = ref["_norm"].tolist()
    result = process.extractOne(
        norm_scraped,
        candidates,
        scorer=fuzz.token_sort_ratio,
    )
    if result and result[1] >= FUZZY_THRESHOLD:
        matched_idx = result[2]
        row = ref.iloc[matched_idx]
        return row[REF_ID_COL], row["full_name"], "fuzzy", result[1]

    return None, None, "none", 0


#  MAIN

def main():
    print("Loading files…")
    scraped = pd.read_csv(SCRAPED_FILE)
    ref_raw = pd.read_csv(REFERENCE_FILE)

    print(f"  Scraped  : {len(scraped):,} rows  ({SCRAPED_FILE})")
    print(f"  Reference: {len(ref_raw):,} rows  ({REFERENCE_FILE})")

    ref = build_reference(ref_raw)
    print(f"  Unique players in reference: {len(ref):,}")

    #  Match

    method_count = {"exact": 0, "initial": 0, "fuzzy": 0, "none": 0}
    person_ids, firstnames, lastnames, methods, scores = [], [], [], [], []

    print("\nMatching…")
    for scraped_name in scraped[SCRAPED_NAME_COL]:
        pid, fname, method, score = match_name(scraped_name, ref)
        person_ids.append(pid)
        fn, ln = fname.split(" ", 1) if fname else ("", "")
        firstnames.append(fn)
        lastnames.append(ln)
        methods.append(method)
        scores.append(score)
        method_count[method] += 1

    scraped["personId"] = person_ids
    scraped["firstName"] = firstnames
    scraped["lastName"]  = lastnames
    scraped["match_method"] = methods

    #  Save outputs

    matched = scraped[scraped["match_method"] != "none"]
    # drop intermediate columns used for matching
    matched = matched.drop(columns=["match_method"])

    matched.to_csv(OUTPUT_MATCHED, index=False)

    #  Summary
    total = len(scraped)
    print(f"\n{'=' * 55}")
    print(f"  ✓  Results")
    print(f"     Exact match   : {method_count['exact']:>6,}  ({method_count['exact']/total*100:.1f}%)")
    print(f"     Initial match : {method_count['initial']:>6,}  ({method_count['initial']/total*100:.1f}%)")
    print(f"     Fuzzy match   : {method_count['fuzzy']:>6,}  ({method_count['fuzzy']/total*100:.1f}%)")
    print(f"     Unmatched     : {method_count['none']:>6,}  ({method_count['none']/total*100:.1f}%)")
    print(f"     ")
    print(f"     Total         : {total:>6,}")
    print(f"\n     Matched   → {OUTPUT_MATCHED}")
    print("=" * 55)


if __name__ == "__main__":
    main()