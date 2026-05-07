# GitHub Copilot Instructions — activeSegments

## Project Overview

Minimal server-side web application built with
**Node.js + Express + TypeScript + SASS + EJS**.
All source code lives in `src/`. All compiled output goes to `webapp/` (gitignored).

---

## Tech Stack

| Layer       | Technology                  |
|-------------|-----------------------------|
| Server      | Express 4, Node.js          |
| Language    | TypeScript 5 (strict mode)  |
| Templating  | EJS (server-side rendering) |
| Styles      | SASS → compiled CSS         |
| Dev runtime | ts-node + nodemon           |

---

## Folder Structure

​```
src/
├── server.ts              ← Express entry point (routes inline for small scope)
├── views/                 ← EJS templates (structure + data binding only)
├── styles/
│   ├── _variables.scss    ← design tokens only (colors, fonts, spacing)
│   └── main.scss          ← imports variables, defines all CSS rules
├── services/              ← API calls, data loading, data processing
├── scripts/               ← ETL scripts (run manually or via npm script, not part of request lifecycle)
└── assets/
    ├── fonts/
    ├── icons/
    └── img/
data/                      ← data sources and ETL output directories
webapp/                    ← compiled output (tsc + sass), served as static files
​```

---

## Configuration Files

- `tsconfig.json` — TypeScript compiler options (`strict: true`, `outDir: webapp/`)
- `nodemon.json` — watches `src/`, restarts on `.ts` and `.ejs` changes
- `.gitignore` — `webapp/` and `data/` are excluded from version control

---

## Strict Separation of Concerns

Violations of these rules must never appear in generated code.

### TypeScript (`src/**/*.ts`)

- Handles all application logic: routing, data fetching, data processing, view rendering
- Passes plain data objects to EJS templates via `res.render("view", data)`
- **Never** contains style values, class names chosen for visual purposes, or inline style strings
- **Never** manipulates CSS or generates style-related output

​```ts
// ✅ correct
res.render("index", { title: "Posts", items: data });

// ❌ wrong — style logic in TypeScript
res.render("index", { color: "#266bd3", fontSize: "1rem" });
​```

### EJS Templates (`src/views/**/*.ejs`)

- Handles structure and data binding only
- Uses `<%= %>` for output, `<% %>` for iteration/conditionals — nothing else
- **Never** contains inline styles (`style="…"`)
- **Never** contains business logic, calculations, or data transformations
- **Never** references raw data that should have been processed in TypeScript first

​```ejs
<%# ✅ correct — pure structure + binding %>
<ul>
  <% items.forEach(item => { %>
    <li class="list-item"><%= item.label %></li>
  <% }); %>
</ul>

<%# ❌ wrong — inline style %>
<li style="color: red"><%= item.label %></li>

<%# ❌ wrong — logic that belongs in TypeScript %>
<% if (items.filter(i => i.active).length > 0) { %>
​```

### SASS / CSS (`src/styles/`)

- `_variables.scss` contains **only** design tokens — no selectors, no rules
- `main.scss` imports `_variables.scss` via `@use "variables" as *;` and defines all CSS rules
- All visual presentation (colors, spacing, typography, layout) is defined here
- **Never** contains application logic or dynamic values injected from TypeScript
- Use SASS variables for all color, spacing, and typography values —
  no hardcoded hex values or magic numbers in rules

​```scss
// ✅ correct — use tokens
.card {
background-color: $color-surface;
padding: $space-6;
font-size: $font-size-base;
}

// ❌ wrong — hardcoded values
.card {
background-color: #ffffff;
padding: 1.5rem;
}
​```

---

## TypeScript Conventions

- **Strict mode** is enabled — no `any`, no implicit types
- Use `interface` for data shapes, `type` for unions/aliases
- All route handlers are `async` functions with explicit `try/catch` — errors are passed to `next()`
- Use named exports for services and types
- `server.ts` does not need a default export — it is the process entry point
- Default exports apply to router modules and service factories only
- Use `process.cwd()` for all file paths (consistent between ts-node and compiled output)
- Prefer `const` over `let`; never use `var`
- Use double quotes `"` for strings (matches tsconfig/project style)

​```ts
// ✅ Route handler pattern
app.get("/items", async (_req: Request, res: Response, next: NextFunction) => {
try {
const items = await fetchItems();
res.render("index", { title: "Items", items });
} catch (err) {
next(err);
}
});

// ✅ Interface for view data
interface IndexViewModel {
title: string;
items: Item[];
}
​```

---

## Express Conventions

- Static files are served from `webapp/` — CSS compiled output lives there
- Views are resolved via `process.cwd()` + `"src/views"` — never use `__dirname` for paths
- Register a generic error handler as the **last middleware**
- Port is read from `process.env.PORT`, fallback to `3000`

​```ts
// ✅ Path resolution
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "webapp")));

// ✅ Generic error handler (always last)
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
console.error(err.message);
res.status(500).render("error", { message: err.message });
});
​```

---

## SASS / Design Token Conventions

All tokens are defined in `src/styles/_variables.scss`. Use them consistently:

| Token group   | Prefix         | Example                                    |
|---------------|----------------|--------------------------------------------|
| Colors        | `$color-`      | `$color-primary`, `$color-bg`              |
| Dark mode     | `$color-dark-` | `$color-dark-bg`, `$color-dark-surface`    |
| Status colors | `$status-`     | `$status-error`, `$status-warning`, `$status-active` |
| Font sizes    | `$font-size-`  | `$font-size-base`, `$font-size-xl`         |
| Font weights  | `$font-weight-`| `$font-weight-bold`                        |
| Spacing       | `$space-`      | `$space-4`, `$space-8`                     |
| Border radius | `$radius-`     | `$radius-md`, `$radius-lg`                 |
| Shadows       | `$shadow-`     | `$shadow-sm`, `$shadow-md`                 |
| Layout        | direct         | `$max-width-content`, `$nav-height`        |

---

## Naming Conventions

- **TypeScript files**: `camelCase.ts` — e.g. `apiService.ts`, `dataLoader.ts`
- **EJS templates**: `camelCase.ejs` — e.g. `index.ejs`, `postDetail.ejs`
- **CSS classes**: BEM methodology — `block__element--modifier`
- **TypeScript interfaces**: `PascalCase` with descriptive suffix — `PostViewModel`, `SegmentItem`
- **Constants**: `UPPER_SNAKE_CASE` for module-level, `camelCase` for local scope

---

## Scripts

​```bash
npm run dev    # nodemon + ts-node (hot reload, watches src/)
npm run fetch  # fetches active-agent target segments and writes JSONL to data/activeagent/
npm run build  # tsc → webapp/ && sass → webapp/main.css
npm run start  # node webapp/server.js (requires prior build)
​```

---

## Data Sources

- `data/seeds/` — read-only, committed, never written by app code
- `data/activeagent/` — ETL output, written only by `src/scripts/`, gitignored, never written during web requests

Load data in TypeScript service files using `fs` + `JSON.parse` or a streaming JSONL reader.

​```ts
// ✅ reading a JSON file
import fs from "fs";
import path from "path";

const raw = fs.readFileSync(
path.join(process.cwd(), "data/seeds/segments.json"),
"utf-8"
);
const segments = JSON.parse(raw);
​```

---

## What Copilot Must Never Generate

### In EJS templates
- `style="…"` attributes
- Business logic, calculations, or data transformations
- Raw unprocessed data that belongs in TypeScript first

### In TypeScript files
- CSS class names chosen for visual purposes
- Hardcoded style values passed to templates
- `__dirname` for view or public path resolution — use `process.cwd()`
- `any` type

### In SASS / CSS files
- Hardcoded hex colors or magic numbers — use tokens from `_variables.scss`
- Application logic or dynamically injected values

### In the project generally
- New files outside `src/` except config files at project root
