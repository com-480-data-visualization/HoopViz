import pandas as pd
from pathlib import Path

BASE_DIR = Path("data/nba_salary/scraped_data/")

def merge_folder(folder, output_file):
    csvs = sorted(folder.glob("*.csv"))
    if not csvs:
        print(f"⚠  No CSV files found in {folder}/")
        return
    
    for f in csvs:
        df = pd.read_csv(f)
        sum_na = df.isna().sum()
        if sum_na.any():
            print(f"⚠  Missing values in {f.name}:")
            print(sum_na[sum_na > 0])
            print()

        df = pd.concat([pd.read_csv(f) for f in csvs], ignore_index=True)

    df.to_csv(output_file, index=False)

    print(f"✓ {output_file}")
    print(f"Files merged: {len(csvs)}")
    print(f"Total rows: {len(df):,}")
    print(f"Seasons: {df.iloc[:, 2].nunique()}\n")  

merge_folder(BASE_DIR / "players", "data/nba_salary/player_salaries.csv")

for f in sorted(BASE_DIR / "players").glob("*.csv"):
    df = pd.read_csv(f)
    # control non unique players
    non_unique = df[df.duplicated(keep=False)]
    if not non_unique.empty:
        print(f"⚠  Non-unique players in {f.name}:")
        print(non_unique)

merge_folder(BASE_DIR / "teams", "data/nba_salary/team_salaries.csv")