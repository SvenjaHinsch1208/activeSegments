import dotenv from "dotenv";
import express, { Request, Response, NextFunction } from "express";

dotenv.config({ path: `.env.${process.env.NODE_ENV ?? "development"}` });
import path from "path";
import { loadTargetSegments } from "./services/activeTargetSegmentLoader";
import { getSegmentMetadataLookup } from "./services/segmentMetadataService";
import { buildSegmentTableRows } from "./services/segmentTableService";
import { loadCampaignList } from "./services/campaignListLoader";
import { buildCampaignTableRows, buildSegmentsByCampaignLookup } from "./services/campaignTableService";

const app = express();
const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "src", "views"));
app.use(express.static(path.join(process.cwd(), "webapp")));
app.use("/assets", express.static(path.join(process.cwd(), "src", "assets")));

app.get("/", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const segments = await loadTargetSegments();
    const metadataLookup = getSegmentMetadataLookup();
    const rows = buildSegmentTableRows(segments, metadataLookup);
    res.render("index", {
      title: "Active Targeting Segment Overview",
      activeTab: "segments",
      rows,
    });
  } catch (err) {
    next(err);
  }
});

app.get("/campaigns", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const [campaigns, segments] = await Promise.all([
      loadCampaignList(),
      loadTargetSegments(),
    ]);
    const metadataLookup = getSegmentMetadataLookup();
    const segmentsByCampaign = buildSegmentsByCampaignLookup(segments, metadataLookup);
    const rows = buildCampaignTableRows(campaigns, segmentsByCampaign);
    res.render("campaigns", {
      title: "Active Campaigns Overview",
      activeTab: "campaigns",
      rows,
    });
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
