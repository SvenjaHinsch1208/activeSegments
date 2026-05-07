# activeSegments

Segment Explorer — Node.js · Express · TypeScript · SASS · EJS

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Development server with hot reload (ts-node + nodemon) |
| `npm run fetch` | Fetches active-agent target segments and writes JSONL to `data/activeagent/` |
| `npm run build` | Compile TypeScript + SASS, copy assets → `webapp/` |
| `npm start` | Runs `prestart` (`npm run fetch`) and then starts the production server (requires prior `npm run build`) |

## Data Flow (ETL)

- `npm run fetch` writes:
  - `data/activeagent/targetSegmentList.dev.jsonl`
  - `data/activeagent/targetSegmentListDebug.dev.jsonl`
- `npm start` triggers `npm run fetch` automatically via npm lifecycle (`prestart`).
- `src/services/activeTargetSegmentLoader.ts` reads `TARGET_SEGMENT_FILE` (default: `data/activeagent/targetSegmentList.dev.jsonl`).
