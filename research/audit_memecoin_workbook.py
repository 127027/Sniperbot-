"""Read-only source audit. Never treats ATHs or current index membership as features."""
import argparse
import collections
import hashlib
import json
from pathlib import Path
import openpyxl


def audit(source):
    book = openpyxl.load_workbook(source, read_only=True, data_only=False)
    tables = {sheet.title: list(sheet.values) for sheet in book}
    chronology = tables['Chronologie'][1:]
    counts = {name: len(rows) - 1 for name, rows in tables.items()
              if name not in ('Überblick', 'Methodik')}
    missing = {str(header): sum(len(row) <= i or row[i] in (None, '')
                              for row in chronology)
               for i, header in enumerate(tables['Chronologie'][0])}
    duplicates = {key: count for key, count in
                  collections.Counter(row[3] for row in chronology).items()
                  if count > 1}
    formulas = sum(isinstance(value, str) and value.startswith('=')
                   for rows in tables.values() for row in rows for value in row)
    cached = openpyxl.load_workbook(source, read_only=True, data_only=True)
    cached_rows = list(cached['Chronologie'].values)[1:]
    result = {
        'schema': 'memecoin_workbook_audit.v1',
        'source_filename': Path(source).name,
        'source_sha256': hashlib.sha256(Path(source).read_bytes()).hexdigest(),
        'source_research_date': '2026-11-09',
        'sheets': list(tables), 'data_rows': counts,
        'chronology_missing_by_column': missing,
        'duplicate_tickers_not_duplicate_assets': duplicates,
        'formula_count': formulas,
        'chronology_numeric_cached_returns': sum(isinstance(r[8], (int, float)) for r in cached_rows),
        'chronology_missing_cached_returns': sum(r[8] in (None, '') for r in cached_rows),
        'chronology_numeric_entry_prices': sum(isinstance(r[5], (int, float)) for r in chronology),
        'chronology_numeric_peaks': sum(isinstance(r[6], (int, float)) for r in chronology),
        'chronology_status_counts': dict(collections.Counter(r[11] for r in chronology)),
        'chronology_chain_counts': dict(collections.Counter(r[4] for r in chronology)),
        'training_eligible_rows': 0,
        'probability_estimate': None,
        'backtest_performance': None,
        'blockers': [
            'NO_CHAIN_CONTRACT_POOL_IDENTIFIERS',
            'NO_POINT_IN_TIME_FEATURE_SNAPSHOTS',
            'NO_ASOF_ARCHIVE_CAPTURE_AND_CONTENT_HASHES',
            'NO_UNSELECTED_COMPLETE_LAUNCH_COHORT_WITH_FAILURES',
            'NO_EXECUTABLE_HISTORICAL_ENTRY_EXIT_QUOTES_OR_COSTS',
            'NO_PRECOMMITTED_PREDICTIONS_AND_HOLDOUT_SPLITS'],
        'allowed_use': 'RETROSPECTIVE_REFERENCE_AND_SOURCE_DISCOVERY_ONLY',
        'forbidden_predictor_columns': ['Peak / ATH USD', 'ATH-Datum',
            'Anstieg Referenz→Peak', 'Status 09.11.2026'],
        'cautions': [
            'Missing observations are UNKNOWN, not failed tokens or zero returns.',
            'Index snapshot is contemporary selection, not historical launch universe.',
            'ATH/ATL order does not establish an investable return.',
            'URLs are references; source contents were not independently reverified.',
            'Some discontinued projects do not establish an unbiased negative cohort.']}
    book.close()
    cached.close()
    return result


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('source')
    parser.add_argument('output')
    args = parser.parse_args()
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    result = audit(args.source)
    output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps(result, ensure_ascii=False, indent=2))
