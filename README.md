這份文件是在說明 MOI_test 要怎麼啟動、測試，以及它目前在驗證什麼。
# MOI_test

`MOI_test` is a focused SQLRooms + kepler.gl benchmark workspace for evaluating whether the MOI map stack becomes smoother when we replace the old per-layer DuckDB + custom deck.gl flow with:

- one SQLRooms DuckDB connector
- shared scenario-driven queries
- kepler.gl rendering for `Trips`, `Arc`, and `Heatmap`

## Requirements

- Node.js `22+`
- npm `10+`

## Start

From `/home/yishanchen/projects/MOI_test`:

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:7780`

## Notes

- The backend only serves static parquet files from `backend/static` at `/data/*`.
- The frontend preloads parquet sources into SQLRooms DuckDB and uses two shared source queries:
  - trip source for `Trips` and `Heatmap`
  - arc source for `Arc`
- The `100` preset uses the dedicated trip sample parquet, while arc rows are limited from the full arc source because no standalone `100` arc parquet was provided in `backend/static`.
