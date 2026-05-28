import axios, { type AxiosRequestConfig } from "axios";
import https from "https";
import { retry, cluster, parallel, flat, unique } from "radash";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DateRange {
  from: string;
  to: string;
}

interface Runtime {
  endTime: string | null;
}

interface CampaignRaw {
  id: number;
  orderId: number;
  name: string;
  runtimes: Runtime[];
}

interface ProfileFilterRaw {
  type: string;
  profile: string;
  campaignIds: number[];
}

interface TargetingEntry {
  campaignId: number;
  targetSegments: string[];
  profileTargeting: string;
}

export interface TargetSegmentCount {
  targetSegment: string;
  count: number;
  endTime: string | null;
  campaignIds?: string;
}

export interface TargetSegmentCountDetail extends TargetSegmentCount {
  campaigns: CampaignRaw[];
}

export interface TargetSegmentsResult {
  targetSegmentCampaignCount: TargetSegmentCount[];
  targetSegmentCampaignCountDetails: TargetSegmentCountDetail[];
}

interface ApiResponse<T> {
  data?: T;
  message?: string;
}

// ─── Service ──────────────────────────────────────────────────────────────────

export class ActiveAgentApiService {
  private static instance: ActiveAgentApiService;
  private token: string | null = null;

  private readonly reqRetries = 3;
  private readonly reqParallel = 3;
  private readonly httpsAgent = new https.Agent({ keepAlive: true });

  private readonly NETWORKID: string;
  private readonly USERNAME: string;
  private readonly PASSWORD: string;
  private readonly BASEURL: string;
  private readonly profileKeyName: string;
  private readonly debugLog: boolean;

  constructor() {
    this.NETWORKID   = process.env.NETWORKID   ?? "";
    this.USERNAME    = process.env.USERNAME     ?? "";
    this.PASSWORD    = process.env.PASSWORD     ?? "";
    this.BASEURL     = process.env.BASEURL      ?? "";
    this.profileKeyName = process.env.PROFILEKEYNAME ?? "targetSegments";
    this.debugLog    = process.env.DEBUG === "true";
  }

  static getInstance(): ActiveAgentApiService {
    if (!ActiveAgentApiService.instance) {
      ActiveAgentApiService.instance = new ActiveAgentApiService();
    }
    return ActiveAgentApiService.instance;
  }

  // ─── HTTP ──────────────────────────────────────────────────────────────────

  private getConfig(body: object | null = null, type: string | null = null): AxiosRequestConfig {
    if (type === "auth" && body) {
      return {
        method: "POST",
        data: body,
        headers: { "Content-Type": "application/json" },
        httpsAgent: this.httpsAgent,
      };
    }
    if (!body) {
      return {
        method: "GET",
        headers: { Authorization: this.token ?? "" },
        httpsAgent: this.httpsAgent,
      };
    }
    return {
      method: "POST",
      data: body,
      headers: { Authorization: this.token ?? "", "Content-Type": "application/json" },
      httpsAgent: this.httpsAgent,
    };
  }

  private async request<T>(url: string, config: AxiosRequestConfig): Promise<T> {
    return retry({ times: this.reqRetries, delay: 1000 }, async () => {
      const response = await axios<T>({ ...config, url });
      return response.data;
    });
  }

  // ─── Auth ──────────────────────────────────────────────────────────────────

  async authentication(): Promise<string> {
    const json = await this.request<ApiResponse<{ token: string }>>(
      `${this.BASEURL}/auth`,
      this.getConfig({ username: this.USERNAME, password: this.PASSWORD }, "auth")
    );
    if (json.data?.token) {
      this.token = json.data.token;
      return this.token;
    }
    throw new Error("(active agent) " + (json.message ?? "unexpected authentication error"));
  }

  // ─── Campaigns ─────────────────────────────────────────────────────────────

  private async fetchCampaigns(options: DateRange): Promise<CampaignRaw[]> {
    const json = await this.request<ApiResponse<CampaignRaw[]>>(
      `${this.BASEURL}/campaigns/?networkIds=${this.NETWORKID}&from=${options.from}&to=${options.to}&fields=runtimes`,
      this.getConfig()
    );
    if (json.data) return json.data;
    throw new Error("(active agent) " + (json.message ?? "error retrieving campaign data"));
  }

  // ─── Profile Targeting ─────────────────────────────────────────────────────

  private async fetchProfileFiltersByCampaignIds(options: { campaignIds: number[] }): Promise<ProfileFilterRaw[]> {
    const ids = options.campaignIds.join(",");
    const json = await this.request<ApiResponse<ProfileFilterRaw[]>>(
      `${this.BASEURL}/filters/?networkIds=${this.NETWORKID}&types=PROFILE&campaignIds=${ids}`,
      this.getConfig()
    );
    if (json.data) return json.data;
    throw new Error("(active agent) " + (json.message ?? "error retrieving profile filters"));
  }

  private async getProfileTargeting(options: { campaignIds: number[] }): Promise<TargetingEntry[]> {
    const chunks = cluster(options.campaignIds, 50);
    const responses = await parallel(
      this.reqParallel,
      chunks.map(ids => ({ campaignIds: ids })),
      (opts) => this.fetchProfileFiltersByCampaignIds(opts)
    );

    const result: TargetingEntry[] = [];
    const regex = new RegExp(
      `(?:^|\\s|\\()${this.profileKeyName}\\s*~?=\\s*'([^']+)'`, "gm"
    );

    for (const filter of flat(responses)) {
      if (filter.type !== "PROFILE" || !filter.profile.includes(this.profileKeyName)) continue;
      for (const campaignId of filter.campaignIds) {
        const rawSegments = unique(Array.from(filter.profile.matchAll(regex), m => m[1]));
        const targetSegments = rawSegments.map(seg =>
          seg.startsWith("_") && seg.endsWith("_") ? seg.slice(1, -1) : seg
        );
        result.push({ campaignId, targetSegments, profileTargeting: filter.profile });
      }
    }
    return result;
  }

  // ─── Aggregation ───────────────────────────────────────────────────────────

  private getTargetSegmentCampaignCount(
    campaigns: CampaignRaw[],
    profiles: TargetingEntry[]
  ): TargetSegmentCount[] {
    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    const segmentMap = new Map<string, TargetSegmentCount>();

    for (const profile of profiles) {
      const campaign = campaignMap.get(profile.campaignId);
      if (!campaign) continue;
      const latestEndTime = campaign.runtimes.reduce<string | null>((latest, rt) =>
        !latest || (rt.endTime && rt.endTime > latest) ? rt.endTime : latest, null
      );
      for (const targetId of profile.targetSegments) {
        const existing = segmentMap.get(targetId);
        if (existing) {
          existing.count += 1;
          if (!existing.endTime || (latestEndTime && latestEndTime > existing.endTime)) {
            existing.endTime = latestEndTime;
          }
        } else {
          segmentMap.set(targetId, { targetSegment: targetId, count: 1, endTime: latestEndTime });
        }
      }
    }
    return Array.from(segmentMap.values());
  }

  private getTargetSegmentCampaignCountDetails(
    campaigns: CampaignRaw[],
    profiles: TargetingEntry[]
  ): TargetSegmentCountDetail[] {
    // Mirrors original behaviour: DEBUG=true → skip verbose details
    if (this.debugLog) return [];

    const campaignMap = new Map(campaigns.map(c => [c.id, c]));
    const segmentMap = new Map<string, TargetSegmentCountDetail>();

    for (const profile of profiles) {
      const campaign = campaignMap.get(profile.campaignId);
      if (!campaign) continue;
      const latestEndTime = campaign.runtimes.reduce<string | null>((latest, rt) =>
        !latest || (rt.endTime && rt.endTime > latest) ? rt.endTime : latest, null
      );
      for (const targetId of profile.targetSegments) {
        const existing = segmentMap.get(targetId);
        if (existing) {
          existing.count += 1;
          if (!existing.endTime || (latestEndTime && latestEndTime > existing.endTime)) {
            existing.endTime = latestEndTime;
          }
          existing.campaigns.push(campaign);
        } else {
          segmentMap.set(targetId, { targetSegment: targetId, count: 1, endTime: latestEndTime, campaigns: [campaign] });
        }
      }
    }
    return Array.from(segmentMap.values());
  }

  // ─── Main entry ────────────────────────────────────────────────────────────

  async getTargetSegmentsActiveCampaigns(options: DateRange): Promise<TargetSegmentsResult> {
    const campaignData   = await this.fetchCampaigns(options);
    const targetingData  = await this.getProfileTargeting({
      campaignIds: unique(campaignData.map(c => c.id)),
    });
    return {
      targetSegmentCampaignCount:        this.getTargetSegmentCampaignCount(campaignData, targetingData),
      targetSegmentCampaignCountDetails: this.getTargetSegmentCampaignCountDetails(campaignData, targetingData),
    };
  }
}
