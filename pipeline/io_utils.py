from __future__ import annotations

import json
from pathlib import Path
from typing import Iterable


def ensure_dir(path: Path) -> Path:
    path.mkdir(parents=True, exist_ok=True)
    return path


def read_json(path: Path) -> object:
    with path.open('r', encoding='utf-8') as handle:
        return json.load(handle)


def write_json(path: Path, payload: object) -> None:
    ensure_dir(path.parent)
    with path.open('w', encoding='utf-8') as handle:
        json.dump(payload, handle, ensure_ascii=False, indent=2)


def try_write_parquet(path: Path, rows: Iterable[dict[str, object]]) -> bool:
    try:
        import pyarrow as pa
        import pyarrow.parquet as pq
    except ModuleNotFoundError:
        return False

    rows_list = list(rows)
    if not rows_list:
        table = pa.table({})
    else:
        columns: dict[str, list[object]] = {}
        for row in rows_list:
            for key in row:
                columns.setdefault(key, []).append(row.get(key))
            missing_keys = set(columns.keys()) - set(row.keys())
            for key in missing_keys:
                columns[key].append(None)
        table = pa.table(columns)
    ensure_dir(path.parent)
    pq.write_table(table, path)
    return True
