# activeSegments

Segment Explorer — Node.js · Express · TypeScript · SASS · EJS

## Commands

| Command | Description |
|---|---|
| `npm run dev` | Development server with nodemon |
| `npm run clean` | Remove compiled output (`webapp/` directory) |
| `npm run compile:ts` | Compile TypeScript only → `webapp/` |
| `npm run compile:sass` | Compile SASS only → `webapp/main.css` |
| `npm run copy:assets` | Copy assets only → `webapp/assets/` |
| `npm run build` | Full build: clean -> compile TypeScript + SASS + copy assets |
| `npm run fetch:segments` | Fetch active-agent target segments -> JSONL in `data/activeagent/` |
| `npm run fetch:reporting` | Fetch campaign/profile data and write reporting CSV files -> `data/output/` |
| `npm run fetch` | Run segment + reporting fetch pipeline |
| `npm start` | Build and start development server |
| `npm run all` | Clean -> fetch -> build -> start development server |

## Data Flow (ETL)

### Development fetch
```bash
npm run fetch
```

- `npm run fetch:segments` writes to `data/activeagent/`:
  - `targetSegmentList.dev.jsonl`
  - `targetSegmentListDebug.dev.jsonl`
- `npm run fetch:reporting` writes to `data/output/`:
  - `Campaign_data_python.csv`
  - `reichweite_python.csv`

### Build + run
```bash
npm run build
npm start
```

- Builds TypeScript + SASS to `webapp/`
- Starts server on `http://localhost:{PORT}`
- `src/services/activeTargetSegmentLoader.ts` reads `TARGET_SEGMENT_FILE` from active environment
