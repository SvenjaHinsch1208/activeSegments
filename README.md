# activeSegments

Segment Explorer — Node.js · Express · TypeScript · SASS · EJS

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload (ts-node + nodemon) |
| `npm run clean` | Remove compiled output (`webapp/` directory) |
| `npm run compile:ts` | Compile TypeScript only → `webapp/` |
| `npm run compile:sass` | Compile SASS only → `webapp/main.css` |
| `npm run copy:assets` | Copy assets only → `webapp/assets/` |
| `npm run build` | Full build: clean → compile TypeScript + SASS + copy assets |
| `npm run fetch` | Fetch active-agent target segments (dev) — writes JSONL to `data/activeagent/` (`.dev` suffix) |
| `npm run fetch:prod` | Fetch active-agent target segments (prod) — writes JSONL to `data/activeagent/` (no suffix) |
| `npm start` | Production: build → fetch:prod → start server at http://localhost:3000 |

## Data Flow (ETL)

### Development
```bash
npm run dev      # or npm run fetch
```
- Watches `src/`, runs TypeScript directly via `ts-node`
- `npm run fetch` writes to `data/activeagent/`:
  - `targetSegmentList.dev.jsonl`
  - `targetSegmentListDebug.dev.jsonl`

### Production
```bash
npm start
```
- Builds TypeScript + SASS to `webapp/`
- Runs `npm run fetch:prod` which writes to `data/activeagent/`:
  - `targetSegmentList.jsonl` (no `.dev` suffix)
  - `targetSegmentListDebug.jsonl` (no `.dev` suffix)
- Starts production server on `http://localhost:{PORT}`
- `src/scripts/fetchSegmentData.ts` logs resolved file paths for verification
- `src/services/activeTargetSegmentLoader.ts` reads `TARGET_SEGMENT_FILE` from active environment (`.env.production`)
