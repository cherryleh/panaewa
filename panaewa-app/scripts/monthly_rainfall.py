"""
Aggregates the daily rainfall history CSV into monthly totals, and computes
each month's anomaly against its climatological normal (the average total
for that calendar month across all years in the dataset).

Pure aggregation over the existing daily CSV - no network calls.
"""

import csv
import os
from collections import defaultdict

DATA_PATH = "../data"
IN_CSV = os.path.join(DATA_PATH, "rainfall_daily_1990_present.csv")
OUT_CSV = os.path.join(DATA_PATH, "rainfall_monthly_1990_present.csv")


def main():
    # (year, month) -> [values]
    by_month = defaultdict(list)

    with open(IN_CSV, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            if row["rainfall_in"] == "":
                continue
            year, month, _ = row["date"].split("-")
            by_month[(int(year), int(month))].append(float(row["rainfall_in"]))

    monthly_totals = {ym: round(sum(vals), 2) for ym, vals in by_month.items()}

    # Climatological normal per calendar month (1-12): mean of that
    # month's total across every year present in the dataset.
    totals_by_calendar_month = defaultdict(list)
    for (year, month), total in monthly_totals.items():
        totals_by_calendar_month[month].append(total)

    normals = {
        month: round(sum(totals) / len(totals), 2)
        for month, totals in totals_by_calendar_month.items()
    }

    rows = []
    for (year, month), total in sorted(monthly_totals.items()):
        normal = normals[month]
        anomaly_in = round(total - normal, 2)
        anomaly_pct = round((anomaly_in / normal) * 100, 1) if normal else None
        rows.append({
            "year_month": f"{year:04d}-{month:02d}",
            "rainfall_in": total,
            "normal_in": normal,
            "anomaly_in": anomaly_in,
            "anomaly_pct": anomaly_pct if anomaly_pct is not None else ""
        })

    with open(OUT_CSV, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["year_month", "rainfall_in", "normal_in", "anomaly_in", "anomaly_pct"])
        writer.writeheader()
        writer.writerows(rows)

    print(f"Wrote {len(rows)} months to {OUT_CSV}")


if __name__ == "__main__":
    main()
