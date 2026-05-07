import express, { Request, Response, NextFunction } from "express";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "webapp")));
app.use("/assets", express.static(path.join(process.cwd(), "src", "assets")));

app.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.render("index", { title: "activeSegments" });
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
