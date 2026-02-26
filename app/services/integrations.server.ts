import prisma from "../db.server";
import type { Integration } from "@prisma/client";

// ─── Google OAuth ────────────────────────────────────────────────────────────

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/analytics.readonly",
  "https://www.googleapis.com/auth/webmasters.readonly",
].join(" ");

export function getGoogleAuthUrl(shop: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: GOOGLE_SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: shop,
  });
  return `${GOOGLE_AUTH_URL}?${params}`;
}

export async function exchangeGoogleCode(code: string, redirectUri: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) throw new Error(`Google token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{
    access_token: string;
    refresh_token?: string;
    expires_in: number;
    token_type: string;
    scope: string;
  }>;
}

export async function refreshGoogleToken(refreshToken: string) {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      grant_type: "refresh_token",
    }),
  });
  if (!res.ok) throw new Error(`Google token refresh failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; expires_in: number }>;
}

// ─── Meta OAuth ──────────────────────────────────────────────────────────────

const META_AUTH_URL = "https://www.facebook.com/v19.0/dialog/oauth";
const META_TOKEN_URL = "https://graph.facebook.com/v19.0/oauth/access_token";
const META_SCOPES = "ads_read,ads_management,read_insights,business_management";

export function getMetaAuthUrl(shop: string, redirectUri: string): string {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    redirect_uri: redirectUri,
    scope: META_SCOPES,
    response_type: "code",
    state: shop,
  });
  return `${META_AUTH_URL}?${params}`;
}

export async function exchangeMetaCode(code: string, redirectUri: string) {
  const params = new URLSearchParams({
    client_id: process.env.META_APP_ID!,
    client_secret: process.env.META_APP_SECRET!,
    redirect_uri: redirectUri,
    code,
  });
  const res = await fetch(`${META_TOKEN_URL}?${params}`);
  if (!res.ok) throw new Error(`Meta token exchange failed: ${await res.text()}`);
  return res.json() as Promise<{ access_token: string; token_type: string; expires_in?: number }>;
}

// ─── Token Management ────────────────────────────────────────────────────────

export async function getIntegration(shop: string, provider: string): Promise<Integration | null> {
  return prisma.integration.findUnique({ where: { shop_provider: { shop, provider } } });
}

export async function saveIntegration(shop: string, provider: string, data: Partial<Integration>) {
  return prisma.integration.upsert({
    where: { shop_provider: { shop, provider } },
    update: { ...data, updatedAt: new Date() },
    create: {
      shop,
      provider,
      accessToken: data.accessToken ?? "",
      refreshToken: data.refreshToken,
      tokenExpiry: data.tokenExpiry,
      scopes: data.scopes,
      accountId: data.accountId,
      accountName: data.accountName,
      isActive: data.isActive ?? true,
    },
  });
}

export async function deleteIntegration(shop: string, provider: string) {
  return prisma.integration.deleteMany({ where: { shop, provider } });
}

export async function getValidToken(shop: string, provider: string): Promise<string | null> {
  const integration = await getIntegration(shop, provider);
  if (!integration || !integration.isActive) return null;

  // Check if token is expired (with 5 min buffer)
  if (integration.tokenExpiry && integration.tokenExpiry.getTime() < Date.now() + 300_000) {
    if (!integration.refreshToken) return null;
    try {
      if (provider === "google") {
        const tokens = await refreshGoogleToken(integration.refreshToken);
        await saveIntegration(shop, provider, {
          accessToken: tokens.access_token,
          tokenExpiry: new Date(Date.now() + tokens.expires_in * 1000),
        });
        return tokens.access_token;
      }
      // Meta long-lived tokens don't typically refresh the same way
      return null;
    } catch {
      return null;
    }
  }
  return integration.accessToken;
}

// ─── GA4 Data API Helpers ────────────────────────────────────────────────────

async function ga4Report(
  accessToken: string,
  propertyId: string,
  body: Record<string, unknown>,
) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GA4 API error: ${res.status} ${await res.text()}`);
  return res.json();
}

async function ga4RealtimeReport(accessToken: string, propertyId: string, body: Record<string, unknown>) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GA4 Realtime API error: ${res.status} ${await res.text()}`);
  return res.json();
}

function dr(startDate: string, endDate: string) {
  return { dateRanges: [{ startDate, endDate }] };
}

// ─── GA4 Data Functions ──────────────────────────────────────────────────────

export async function fetchGA4RealTimeUsers(accessToken: string, propertyId: string) {
  return ga4RealtimeReport(accessToken, propertyId, {
    metrics: [{ name: "activeUsers" }],
  });
}

export async function fetchGA4TrafficSources(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
}

export async function fetchGA4ConversionFunnel(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "eventName" }],
    metrics: [{ name: "eventCount" }, { name: "totalUsers" }],
    dimensionFilter: {
      filter: {
        fieldName: "eventName",
        inListFilter: {
          values: ["session_start", "page_view", "add_to_cart", "begin_checkout", "purchase"],
        },
      },
    },
  });
}

export async function fetchGA4GeoData(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "country" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  });
}

export async function fetchGA4DeviceData(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "deviceCategory" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "bounceRate" }, { name: "averageSessionDuration" }],
  });
}

export async function fetchGA4SessionMetrics(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "date" }],
    metrics: [
      { name: "sessions" },
      { name: "totalUsers" },
      { name: "bounceRate" },
      { name: "averageSessionDuration" },
      { name: "screenPageViewsPerSession" },
    ],
    orderBys: [{ dimension: { dimensionName: "date" } }],
  });
}

export async function fetchGA4LandingPages(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "landingPage" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "bounceRate" }, { name: "conversions" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 20,
  });
}

export async function fetchGA4NewVsReturning(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "newVsReturning" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }, { name: "averageSessionDuration" }],
  });
}

export async function fetchGA4BounceBySource(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "sessionDefaultChannelGroup" }],
    metrics: [{ name: "sessions" }, { name: "bounceRate" }],
    orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
    limit: 10,
  });
}

export async function fetchGA4HourlyData(accessToken: string, propertyId: string, startDate: string, endDate: string) {
  return ga4Report(accessToken, propertyId, {
    ...dr(startDate, endDate),
    dimensions: [{ name: "hour" }],
    metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "conversions" }],
    orderBys: [{ dimension: { dimensionName: "hour" } }],
  });
}

// ─── GSC Data Functions ──────────────────────────────────────────────────────

async function gscQuery(
  accessToken: string,
  siteUrl: string,
  body: Record<string, unknown>,
) {
  const encoded = encodeURIComponent(siteUrl);
  const res = await fetch(
    `https://www.googleapis.com/webmasters/v3/sites/${encoded}/searchAnalytics/query`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw new Error(`GSC API error: ${res.status} ${await res.text()}`);
  return res.json();
}

export async function fetchGSCTopQueries(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  return gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["query"],
    rowLimit: 25,
    dataState: "final",
  });
}

export async function fetchGSCPerformanceTrend(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  return gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["date"],
    dataState: "final",
  });
}

export async function fetchGSCTopPages(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  return gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["page"],
    rowLimit: 25,
    dataState: "final",
  });
}

export async function fetchGSCByCountry(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  return gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["country"],
    rowLimit: 20,
    dataState: "final",
  });
}

export async function fetchGSCByDevice(accessToken: string, siteUrl: string, startDate: string, endDate: string) {
  return gscQuery(accessToken, siteUrl, {
    startDate, endDate,
    dimensions: ["device"],
    dataState: "final",
  });
}

// ─── Meta Marketing API Functions ────────────────────────────────────────────

async function metaInsights(
  accessToken: string,
  adAccountId: string,
  params: Record<string, string>,
) {
  const qs = new URLSearchParams({ access_token: accessToken, ...params });
  const res = await fetch(
    `https://graph.facebook.com/v19.0/${adAccountId}/insights?${qs}`,
  );
  if (!res.ok) throw new Error(`Meta API error: ${res.status} ${await res.text()}`);
  return res.json();
}

function metaTimeRange(startDate: string, endDate: string) {
  return JSON.stringify({ since: startDate, until: endDate });
}

export async function fetchMetaCampaigns(accessToken: string, adAccountId: string, startDate: string, endDate: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "campaign",
    fields: "campaign_name,impressions,clicks,spend,actions,cpc,cpm,ctr,reach",
    time_range: metaTimeRange(startDate, endDate),
    limit: "50",
  });
}

export async function fetchMetaAdSpendVsRevenue(accessToken: string, adAccountId: string, startDate: string, endDate: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "account",
    fields: "spend,actions,action_values,purchase_roas",
    time_range: metaTimeRange(startDate, endDate),
    time_increment: "1",
  });
}

export async function fetchMetaAudienceDemographics(accessToken: string, adAccountId: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "account",
    fields: "impressions,clicks,spend",
    breakdowns: "age,gender",
    date_preset: "last_30d",
  });
}

export async function fetchMetaCreativePerformance(accessToken: string, adAccountId: string, startDate: string, endDate: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "ad",
    fields: "ad_name,impressions,clicks,spend,actions,cpc,ctr",
    time_range: metaTimeRange(startDate, endDate),
    limit: "25",
  });
}

export async function fetchMetaFrequencyReach(accessToken: string, adAccountId: string, startDate: string, endDate: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "campaign",
    fields: "campaign_name,reach,frequency,impressions",
    time_range: metaTimeRange(startDate, endDate),
  });
}

export async function fetchMetaCostTrend(accessToken: string, adAccountId: string, startDate: string, endDate: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "account",
    fields: "spend,impressions,clicks,cpc,cpm",
    time_range: metaTimeRange(startDate, endDate),
    time_increment: "1",
  });
}

export async function fetchMetaFunnel(accessToken: string, adAccountId: string, startDate: string, endDate: string) {
  return metaInsights(accessToken, adAccountId, {
    level: "account",
    fields: "impressions,clicks,actions,action_values,cost_per_action_type",
    time_range: metaTimeRange(startDate, endDate),
  });
}
