import axios, { type AxiosRequestConfig } from "axios";
import https from "https";
import { retry, cluster, parallel, flat, unique } from "radash";

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface DateRange {
  from: string;
  to: string;
}

interface Runtime {
  startTime?: string | null;
  endTime: string | null;
}

interface CampaignRaw {
  id: number;
  orderId: number;
  name: string;
  runtimes: Runtime[];
}

interface CampaignDetailRaw {
  id: number;
  orderId: number;
  name?: string;
  type?: string;
  biddingStrategy?: string;
  deliveryTechnique?: string;
  maxCpm?: number;
  optimization?: string;
  totalBudget?: number;
  calculatedDailyBudget?: number;
  pace?: number;
}

interface OrderDetailRaw {
  id: number;
  advertiserId?: number;
  name?: string;
}

interface AdvertiserDetailRaw {
  id: number;
  name?: string;
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

export interface CampaignProfileRow {
  campaignId: number;
  campaignName: string;
  orderName: string;
  advertiserName: string;
  type: string;
  biddingStrategy: string;
  deliveryTechnique: string;
  maxCpm: string;
  optimization: string;
  startTime: string;
  endTime: string;
  totalBudget: string;
  calculatedDailyBudget: string;
  pace: string;
  targetSegment: string;
  profileTargeting: string;
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

  private async fetchCampaignDetailsByIds(options: { campaignIds: number[] }): Promise<CampaignDetailRaw[]> {
    if (options.campaignIds.length === 0) {
      return [];
    }

    const ids = options.campaignIds.join(",");
    const json = await this.request<ApiResponse<CampaignDetailRaw[]>>(
      `${this.BASEURL}/campaigns/${ids}`,
      this.getConfig()
    );
    if (json.data) return json.data;
    throw new Error("(active agent) " + (json.message ?? "error retrieving campaign details"));
  }

  private async getCampaignDetails(options: { campaignIds: number[] }): Promise<CampaignDetailRaw[]> {
    const chunks = cluster(options.campaignIds, 20);
    const responses = await parallel(
      this.reqParallel,
      chunks.map((campaignIds) => ({ campaignIds })),
      (opts) => this.fetchCampaignDetailsByIds(opts)
    );
    return flat(responses);
  }

  private async fetchOrdersByIds(options: { orderIds: number[] }): Promise<OrderDetailRaw[]> {
    if (options.orderIds.length === 0) {
      return [];
    }

    const ids = options.orderIds.join(",");
    const json = await this.request<ApiResponse<OrderDetailRaw[]>>(
      `${this.BASEURL}/orders/${ids}`,
      this.getConfig()
    );
    if (json.data) return json.data;
    throw new Error("(active agent) " + (json.message ?? "error retrieving order details"));
  }

  private async getOrderDetails(options: { orderIds: number[] }): Promise<OrderDetailRaw[]> {
    const chunks = cluster(options.orderIds, 20);
    const responses = await parallel(
      this.reqParallel,
      chunks.map((orderIds) => ({ orderIds })),
      (opts) => this.fetchOrdersByIds(opts)
    );
    return flat(responses);
  }

  private async fetchAdvertisersByIds(options: { advertiserIds: number[] }): Promise<AdvertiserDetailRaw[]> {
    if (options.advertiserIds.length === 0) {
      return [];
    }

    const ids = options.advertiserIds.join(",");
    const json = await this.request<ApiResponse<AdvertiserDetailRaw[]>>(
      `${this.BASEURL}/companies/${ids}`,
      this.getConfig()
    );
    if (json.data) return json.data;
    throw new Error("(active agent) " + (json.message ?? "error retrieving advertiser details"));
  }

  private async getAdvertiserDetails(options: { advertiserIds: number[] }): Promise<AdvertiserDetailRaw[]> {
    const chunks = cluster(options.advertiserIds, 20);
    const responses = await parallel(
      this.reqParallel,
      chunks.map((advertiserIds) => ({ advertiserIds })),
      (opts) => this.fetchAdvertisersByIds(opts)
    );
    return flat(responses);
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

  private getCampaignStartTime(campaign: CampaignRaw): string {
    const startTimes = campaign.runtimes
      .map((runtime) => runtime.startTime)
      .filter((value): value is string => Boolean(value));

    if (startTimes.length === 0) {
      return "-";
    }

    return startTimes.reduce((earliest, current) => (current < earliest ? current : earliest));
  }

  private getCampaignEndTime(campaign: CampaignRaw): string {
    const endTimes = campaign.runtimes
      .map((runtime) => runtime.endTime)
      .filter((value): value is string => Boolean(value));

    if (endTimes.length === 0) {
      return "-";
    }

    return endTimes.reduce((latest, current) => (current > latest ? current : latest));
  }

  private toTextValue(value: string | number | null | undefined): string {
    if (value === null || value === undefined) {
      return "";
    }

    const text = `${value}`.trim();
    return text;
  }

  async getCampaignProfileRows(options: DateRange): Promise<CampaignProfileRow[]> {
    const campaignData = await this.fetchCampaigns(options);
    const campaignDetails = await this.getCampaignDetails({
      campaignIds: unique(campaignData.map((campaign) => campaign.id)),
    });

    const orderDetails = await this.getOrderDetails({
      orderIds: unique(campaignDetails.map((campaign) => campaign.orderId)),
    });

    const advertiserDetails = await this.getAdvertiserDetails({
      advertiserIds: unique(orderDetails.map((order) => order.advertiserId).filter((id): id is number => typeof id === "number")),
    });

    const targetingData = await this.getProfileTargeting({
      campaignIds: unique(campaignData.map((campaign) => campaign.id)),
    });

    const campaignById = new Map(campaignData.map((campaign) => [campaign.id, campaign]));
    const campaignDetailsById = new Map(campaignDetails.map((campaign) => [campaign.id, campaign]));
    const orderById = new Map(orderDetails.map((order) => [order.id, order]));
    const advertiserById = new Map(advertiserDetails.map((advertiser) => [advertiser.id, advertiser]));
    const rows: CampaignProfileRow[] = [];

    for (const profile of targetingData) {
      const campaign = campaignById.get(profile.campaignId);
      if (!campaign) {
        continue;
      }

      const campaignDetail = campaignDetailsById.get(campaign.id);
      const order = campaignDetail ? orderById.get(campaignDetail.orderId) : undefined;
      const advertiser = order?.advertiserId ? advertiserById.get(order.advertiserId) : undefined;

      for (const targetSegment of profile.targetSegments) {
        rows.push({
          campaignId: campaign.id,
          campaignName: this.toTextValue(campaignDetail?.name ?? campaign.name),
          orderName: this.toTextValue(order?.name),
          advertiserName: this.toTextValue(advertiser?.name),
          type: this.toTextValue(campaignDetail?.type),
          biddingStrategy: this.toTextValue(campaignDetail?.biddingStrategy),
          deliveryTechnique: this.toTextValue(campaignDetail?.deliveryTechnique),
          maxCpm: this.toTextValue(campaignDetail?.maxCpm),
          optimization: this.toTextValue(campaignDetail?.optimization),
          startTime: this.getCampaignStartTime(campaign),
          endTime: this.getCampaignEndTime(campaign),
          totalBudget: this.toTextValue(campaignDetail?.totalBudget),
          calculatedDailyBudget: this.toTextValue(campaignDetail?.calculatedDailyBudget),
          pace: this.toTextValue(campaignDetail?.pace),
          targetSegment,
          profileTargeting: profile.profileTargeting,
        });
      }
    }

    return rows;
  }
}
