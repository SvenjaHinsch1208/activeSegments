import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";

dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });
import path from "path";
import { loadTargetSegments } from "./services/activeTargetSegmentLoader";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "webapp")));
app.use("/assets", express.static(path.join(process.cwd(), "src", "assets")));

app.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const segments = await loadTargetSegments();
    res.render("index", { title: "activeSegments", segments });
  } catch (err) {
    next(err);
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.message);
  res.status(500).send(`<h1>500 – Internal Server Error</h1><p>${err.message}</p>`);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
