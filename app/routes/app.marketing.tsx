import { useState, useEffect, Suspense, lazy } from 'react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

const CHANNELS = ['Google', 'Meta', 'TikTok', 'Email', 'SMS', 'Affiliates', 'Organic'] as const;
type Channel = typeof CHANNELS[number];

function mapChannel(source?: string | null, medium?: string | null): Channel {
  if (!source) return 'Organic';
  const s = source.toLowerCase();
  if (s.includes('google')) return 'Google';
  if (s.includes('facebook') || s.includes('instagram') || s.includes('meta') || s.includes('fb')) return 'Meta';
  if (s.includes('tiktok')) return 'TikTok';
  if (s.includes('email') || s.includes('klaviyo') || s.includes('mailchimp')) return 'Email';
  if (s.includes('sms')) return 'SMS';
  if (s.includes('affiliate') || s.includes('referral') || s.includes('partner')) return 'Affiliates';
  return 'Organic';
}

const PAID_CHANNELS: Channel[] = ['Google', 'Meta', 'TikTok'];

function isPaid(ch: Channel) { return PAID_CHANNELS.includes(ch); }

const QUERY = `query($query: String!, $cursor: String) {
  orders(first: 250, query: $query, after: $cursor, sortKey: CREATED_AT) {
    pageInfo { hasNextPage endCursor }
    nodes {
      id createdAt
      totalPriceSet { shopMoney { amount currencyCode } }
      subtotalPriceSet { shopMoney { amount } }
      customer { id numberOfOrders }
      channelInformation { channelDefinition { handle } }
      customerJourneySummary {
        firstVisit { utmParameters { source medium campaign } referrerUrl }
        lastVisit { utmParameters { source medium campaign } referrerUrl }
      }
      lineItems(first: 10) { nodes { quantity originalUnitPriceSet { shopMoney { amount } } } }
    }
  }
}`;

async function fetchOrders(admin: any, startDate: string, endDate: string) {
  const orders: any[] = [];
  let cursor: string | null = null;
  const q = `created_at:>='${startDate}' created_at:<='${endDate}'`;
  for (let i = 0; i < 10; i++) {
    const resp = await admin.graphql(QUERY, { variables: { query: q, cursor } });
    const body = await resp.json();
    const data = body.data?.orders;
    if (!data) break;
    orders.push(...data.nodes);
    if (!data.pageInfo.hasNextPage) break;
    cursor = data.pageInfo.endCursor;
  }
  return orders;
}

function processOrders(orders: any[]) {
  const byChannel: Record<Channel, { revenue: number; orders: number; newCust: number; retCust: number }> = {} as any;
  const byCampaign: Record<string, { revenue: number; channel: Channel; orders: number }> = {};
  const byWeek: Record<string, Record<Channel, number>> = {};
  const touchpoints: { first: Channel; last: Channel }[] = [];
  const utmCampaigns: Record<string, number> = {};

  CHANNELS.forEach(ch => { byChannel[ch] = { revenue: 0, orders: 0, newCust: 0, retCust: 0 }; });

  for (const o of orders) {
    const rev = parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
    const firstVisit = o.customerJourneySummary?.firstVisit;
    const lastVisit = o.customerJourneySummary?.lastVisit;
    const firstCh = mapChannel(firstVisit?.utmParameters?.source, firstVisit?.utmParameters?.medium);
    const lastCh = mapChannel(lastVisit?.utmParameters?.source, lastVisit?.utmParameters?.medium);
    const isNew = (o.customer?.numberOfOrders || 1) <= 1;

    // Last-touch attribution for primary metrics
    byChannel[lastCh].revenue += rev;
    byChannel[lastCh].orders += 1;
    if (isNew) byChannel[lastCh].newCust += 1;
    else byChannel[lastCh].retCust += 1;

    // Campaign tracking
    const camp = lastVisit?.utmParameters?.campaign || firstVisit?.utmParameters?.campaign || '(none)';
    if (!byCampaign[camp]) byCampaign[camp] = { revenue: 0, channel: lastCh, orders: 0 };
    byCampaign[camp].revenue += rev;
    byCampaign[camp].orders += 1;

    // Weekly trend
    const d = new Date(o.createdAt);
    const weekStart = new Date(d);
    weekStart.setDate(d.getDate() - d.getDay());
    const wk = weekStart.toISOString().slice(0, 10);
    if (!byWeek[wk]) byWeek[wk] = {} as any;
    if (!byWeek[wk][lastCh]) byWeek[wk][lastCh] = 0;
    byWeek[wk][lastCh] += rev;

    touchpoints.push({ first: firstCh, last: lastCh });

    // UTM campaign treemap
    if (camp !== '(none)') {
      utmCampaigns[camp] = (utmCampaigns[camp] || 0) + rev;
    }
  }

  return { byChannel, byCampaign, byWeek, touchpoints, utmCampaigns };
}

function buildAttribution(orders: any[]) {
  const models: Record<string, Record<Channel, number>> = {
    'First-Touch': {}, 'Last-Touch': {}, 'Linear': {}, 'Time-Decay': {}
  };
  CHANNELS.forEach(ch => { Object.keys(models).forEach(m => { models[m][ch] = 0; }); });

  for (const o of orders) {
    const rev = parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
    const fv = o.customerJourneySummary?.firstVisit;
    const lv = o.customerJourneySummary?.lastVisit;
    const firstCh = mapChannel(fv?.utmParameters?.source, fv?.utmParameters?.medium);
    const lastCh = mapChannel(lv?.utmParameters?.source, lv?.utmParameters?.medium);
    const touches = firstCh === lastCh ? [firstCh] : [firstCh, lastCh];

    models['First-Touch'][firstCh] += rev;
    models['Last-Touch'][lastCh] += rev;
    touches.forEach(ch => { models['Linear'][ch] += rev / touches.length; });
    if (touches.length === 1) { models['Time-Decay'][touches[0]] += rev; }
    else { models['Time-Decay'][touches[0]] += rev * 0.3; models['Time-Decay'][touches[1]] += rev * 0.7; }
  }
  return models;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const now = new Date();
  const end = now.toISOString().slice(0, 10);
  const start30 = new Date(now.getTime() - 30 * 86400000).toISOString().slice(0, 10);
  const start60 = new Date(now.getTime() - 60 * 86400000).toISOString().slice(0, 10);

  const [currentOrders, prevOrders] = await Promise.all([
    fetchOrders(admin, start30, end),
    fetchOrders(admin, start60, start30),
  ]);

  const current = processOrders(currentOrders);
  const prev = processOrders(prevOrders);
  const attribution = buildAttribution(currentOrders);
  const currency = currentOrders[0]?.totalPriceSet?.shopMoney?.currencyCode || 'USD';

  return json({ current, prev, attribution, currency });
};

export default function MarketingDashboard() {
  const { current, prev, attribution, currency } = useLoaderData<typeof loader>();
  const fmt = (n: number) => currency === 'USD' ? `$${n.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : `${n.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;
  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  // KPI calculations
  const totalRevenue = CHANNELS.reduce((s, ch) => s + current.byChannel[ch].revenue, 0);
  const paidRevenue = PAID_CHANNELS.reduce((s, ch) => s + current.byChannel[ch].revenue, 0);
  const estAdSpend = paidRevenue * 0.3;
  const totalOrders = CHANNELS.reduce((s, ch) => s + current.byChannel[ch].orders, 0);
  const blendedROAS = estAdSpend > 0 ? totalRevenue / estAdSpend : 0;
  const mer = estAdSpend > 0 ? totalRevenue / estAdSpend : 0;
  const avgCPA = totalOrders > 0 ? estAdSpend / totalOrders : 0;

  const prevTotalRev = CHANNELS.reduce((s, ch) => s + (prev.byChannel[ch]?.revenue || 0), 0);
  const prevPaidRev = PAID_CHANNELS.reduce((s, ch) => s + (prev.byChannel[ch]?.revenue || 0), 0);
  const prevAdSpend = prevPaidRev * 0.3;
  const prevROAS = prevAdSpend > 0 ? prevTotalRev / prevAdSpend : 0;

  // Weekly ROAS trend
  const weeks = Object.keys(current.byWeek).sort();
  const weeklyROAS = weeks.map(w => {
    const wData = current.byWeek[w];
    const wRev = CHANNELS.reduce((s, ch) => s + (wData[ch] || 0), 0);
    const wPaid = PAID_CHANNELS.reduce((s, ch) => s + (wData[ch] || 0), 0);
    const wSpend = wPaid * 0.3;
    return wSpend > 0 ? wRev / wSpend : 0;
  });

  // Channel ROAS current vs prev
  const channelROASCurrent = CHANNELS.filter(isPaid).map(ch => {
    const spend = current.byChannel[ch].revenue * 0.3;
    return spend > 0 ? current.byChannel[ch].revenue / spend : 0;
  });
  const channelROASPrev = CHANNELS.filter(isPaid).map(ch => {
    const spend = (prev.byChannel[ch]?.revenue || 0) * 0.3;
    return spend > 0 ? (prev.byChannel[ch]?.revenue || 0) / spend : 0;
  });

  // CPA by channel over time
  const cpaSeries = PAID_CHANNELS.map(ch => ({
    name: ch,
    data: weeks.map(w => {
      const wRev = current.byWeek[w]?.[ch] || 0;
      const wSpend = wRev * 0.3;
      const wOrders = Math.max(1, Math.round(wRev / (totalRevenue / Math.max(totalOrders, 1))));
      return Math.round(wSpend / Math.max(wOrders, 1));
    })
  }));

  // Campaign P&L
  const campaigns = Object.entries(current.byCampaign)
    .filter(([name]) => name !== '(none)')
    .sort((a, b) => b[1].revenue - a[1].revenue)
    .slice(0, 15);

  // Touchpoint flow
  const flowData: Record<string, number> = {};
  current.touchpoints.forEach(({ first, last }) => {
    const key = `${first} → ${last}`;
    flowData[key] = (flowData[key] || 0) + 1;
  });
  const topFlows = Object.entries(flowData).sort((a, b) => b[1] - a[1]).slice(0, 10);

  // UTM treemap
  const treemapData = Object.entries(current.utmCampaigns)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, val]) => ({ x: name.slice(0, 25), y: Math.round(val) }));

  // New vs Returning by channel
  const newByChannel = CHANNELS.map(ch => current.byChannel[ch].newCust);
  const retByChannel = CHANNELS.map(ch => current.byChannel[ch].retCust);

  // Organic vs Paid trend
  const organicTrend = weeks.map(w => Math.round(current.byWeek[w]?.Organic || 0));
  const paidTrend = weeks.map(w => PAID_CHANNELS.reduce((s, ch) => s + (current.byWeek[w]?.[ch] || 0), 0));

  // AI insight
  const topChannel = CHANNELS.reduce((best, ch) => current.byChannel[ch].revenue > current.byChannel[best].revenue ? ch : best, CHANNELS[0]);
  const organicPct = totalRevenue > 0 ? (current.byChannel.Organic?.revenue || 0) / totalRevenue : 0;

  return (
    <div style={S.page}>
      <h1 style={S.title}>📣 Marketing & Attribution</h1>
      <p style={S.subtitle}>Last 30 days · Ad spend figures are estimated (30% of paid revenue)</p>

      {/* KPI Cards */}
      <div style={S.kpiRow}>
        {[
          { label: 'Blended ROAS', value: `${blendedROAS.toFixed(2)}x`, sub: `prev: ${prevROAS.toFixed(2)}x`, color: '#6366f1' },
          { label: 'MER', value: `${mer.toFixed(2)}x`, sub: 'Revenue / Total Marketing Cost', color: '#8b5cf6' },
          { label: 'Est. Ad Spend', value: fmt(estAdSpend), sub: `${pct(estAdSpend / Math.max(totalRevenue, 1))} of revenue`, color: '#ec4899' },
          { label: 'Avg CPA', value: fmt(avgCPA), sub: `${totalOrders} conversions`, color: '#f59e0b' },
        ].map((k, i) => (
          <div key={i} style={{ ...S.kpiCard, borderTop: `4px solid ${k.color}` }}>
            <div style={S.kpiLabel}>{k.label}</div>
            <div style={{ ...S.kpiValue, color: k.color }}>{k.value}</div>
            <div style={S.kpiSub}>{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Attribution Model Comparison */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Attribution Model Comparison</h2>
        <CC type="bar" height={350} series={['First-Touch', 'Last-Touch', 'Linear', 'Time-Decay'].map(model => ({
          name: model, data: CHANNELS.map(ch => Math.round(attribution[model]?.[ch] || 0))
        }))} options={{ chart: { type: 'bar', stacked: true, toolbar: { show: false } }, plotOptions: { bar: { horizontal: true } }, xaxis: { categories: [...CHANNELS], labels: { formatter: (v: number) => fmt(v) } }, colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd'], legend: { position: 'top' }, tooltip: { y: { formatter: (v: number) => fmt(v) } } }} />
      </div>

      {/* Row: ROAS Trend + Channel ROAS */}
      <div style={S.row}>
        <div style={{ ...S.card, flex: 1 }}>
          <h2 style={S.cardTitle}>Blended ROAS Trend (Weekly)</h2>
          <CC type="line" height={280} series={[{ name: 'ROAS', data: weeklyROAS.map(v => +v.toFixed(2)) }]} options={{ chart: { toolbar: { show: false } }, xaxis: { categories: weeks.map(w => w.slice(5)) }, yaxis: { labels: { formatter: (v: number) => v.toFixed(1) + 'x' } }, stroke: { width: 3, curve: 'smooth' }, colors: ['#6366f1'], markers: { size: 4 } }} />
        </div>
        <div style={{ ...S.card, flex: 1 }}>
          <h2 style={S.cardTitle}>Channel ROAS: Current vs Previous</h2>
          <CC type="bar" height={280} series={[{ name: 'Current', data: channelROASCurrent.map(v => +v.toFixed(2)) }, { name: 'Previous', data: channelROASPrev.map(v => +v.toFixed(2)) }]} options={{ chart: { toolbar: { show: false } }, xaxis: { categories: PAID_CHANNELS }, yaxis: { labels: { formatter: (v: number) => v.toFixed(1) + 'x' } }, plotOptions: { bar: { columnWidth: '55%' } }, colors: ['#6366f1', '#c4b5fd'] }} />
        </div>
      </div>

      {/* Ad Spend vs Revenue */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Ad Spend vs Revenue (Weekly)</h2>
        <CC type="line" height={300} series={[
          { name: 'Revenue', type: 'column', data: weeks.map(w => Math.round(CHANNELS.reduce((s, ch) => s + (current.byWeek[w]?.[ch] || 0), 0))) },
          { name: 'Est. Ad Spend', type: 'line', data: weeks.map(w => Math.round(PAID_CHANNELS.reduce((s, ch) => s + (current.byWeek[w]?.[ch] || 0), 0) * 0.3)) }
        ]} options={{ chart: { toolbar: { show: false } }, xaxis: { categories: weeks.map(w => w.slice(5)) }, yaxis: [{ title: { text: 'Revenue' }, labels: { formatter: (v: number) => fmt(v) } }, { opposite: true, title: { text: 'Ad Spend (Est.)' }, labels: { formatter: (v: number) => fmt(v) } }], colors: ['#6366f1', '#ec4899'], stroke: { width: [0, 3] }, plotOptions: { bar: { columnWidth: '60%' } } }} />
      </div>

      {/* CPA by Channel Over Time */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>CPA by Channel Over Time (Est.)</h2>
        <CC type="line" height={280} series={cpaSeries} options={{ chart: { toolbar: { show: false } }, xaxis: { categories: weeks.map(w => w.slice(5)) }, yaxis: { labels: { formatter: (v: number) => fmt(v) } }, stroke: { width: 2, curve: 'smooth' }, colors: ['#6366f1', '#ec4899', '#10b981'] }} />
      </div>

      {/* Campaign P&L Table */}
      <div style={S.card}>
        <h2 style={S.cardTitle}>Campaign P&L</h2>
        <div style={{ overflowX: 'auto' }}>
          <table style={S.table}>
            <thead>
              <tr>{['Campaign', 'Revenue', 'Ad Spend (Est.)', 'COGS (40%)', 'True Profit', 'ROAS'].map((h, i) => <th key={i} style={S.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {campaigns.map(([name, d], i) => {
                const spend = isPaid(d.channel) ? d.revenue * 0.3 : 0;
                const cogs = d.revenue * 0.4;
                const profit = d.revenue - spend - cogs;
                const roas = spend > 0 ? (d.revenue / spend).toFixed(2) + 'x' : '∞';
                return (
                  <tr key={i} style={i % 2 ? S.trAlt : {}}>
                    <td style={S.td}>{name}</td>
                    <td style={S.tdR}>{fmt(d.revenue)}</td>
                    <td style={S.tdR}>{fmt(spend)}</td>
                    <td style={S.tdR}>{fmt(cogs)}</td>
                    <td style={{ ...S.tdR, color: profit >= 0 ? '#10b981' : '#ef4444', fontWeight: 600 }}>{fmt(profit)}</td>
                    <td style={S.tdR}>{roas}</td>
                  </tr>
                );
              })}
              {campaigns.length === 0 && <tr><td colSpan={6} style={{ ...S.td, textAlign: 'center', color: '#94a3b8' }}>No campaign data available</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* AI Insight Card */}
      <div style={S.aiCard}>
        <h2 style={{ margin: '0 0 8px', fontSize: 18 }}>🤖 Marketing Insight</h2>
        <p style={{ margin: 0, lineHeight: 1.6 }}>
          {topChannel} is your strongest channel at {fmt(current.byChannel[topChannel].revenue)} revenue.
          {organicPct > 0.4
            ? ` Organic drives ${pct(organicPct)} of revenue — strong brand, but diversifying paid acquisition could unlock growth.`
            : organicPct < 0.15
            ? ` Organic is only ${pct(organicPct)} — invest in SEO and content to reduce CAC dependency on paid channels.`
            : ` Your organic/paid mix looks healthy at ${pct(organicPct)} organic.`}
          {blendedROAS < 2 ? ' Blended ROAS is below 2x — review underperforming campaigns and reallocate budget to top performers.' : ''}
          {blendedROAS > 5 ? ' ROAS above 5x suggests room to scale spend aggressively while maintaining profitability.' : ''}
        </p>
      </div>

      {/* Row: Touchpoint Flow + UTM Treemap */}
      <div style={S.row}>
        <div style={{ ...S.card, flex: 1 }}>
          <h2 style={S.cardTitle}>Customer Journey Touchpoints</h2>
          <CC type="bar" height={300} series={[{ name: 'Journeys', data: topFlows.map(([, v]) => v) }]} options={{ chart: { toolbar: { show: false } }, plotOptions: { bar: { horizontal: true, barHeight: '60%' } }, xaxis: { title: { text: 'Count' } }, yaxis: { labels: { style: { fontSize: '11px' } } }, colors: ['#8b5cf6'], dataLabels: { enabled: true }, categories: topFlows.map(([k]) => k) }} />
        </div>
        <div style={{ ...S.card, flex: 1 }}>
          <h2 style={S.cardTitle}>UTM Campaign Performance</h2>
          {treemapData.length > 0 ? (
            <CC type="treemap" height={300} series={[{ data: treemapData }]} options={{ chart: { toolbar: { show: false } }, colors: ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ec4899', '#f59e0b', '#10b981'], legend: { show: false }, dataLabels: { enabled: true, formatter: (_: any, opts: any) => { const d = opts.w.config.series[0].data[opts.dataPointIndex]; return `${d.x}: ${fmt(d.y)}`; } } }} />
          ) : <div style={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>No UTM campaign data</div>}
        </div>
      </div>

      {/* Row: New vs Returning + Organic vs Paid */}
      <div style={S.row}>
        <div style={{ ...S.card, flex: 1 }}>
          <h2 style={S.cardTitle}>New vs Returning by Channel</h2>
          <CC type="bar" height={280} series={[{ name: 'New', data: newByChannel }, { name: 'Returning', data: retByChannel }]} options={{ chart: { type: 'bar', stacked: true, toolbar: { show: false } }, xaxis: { categories: [...CHANNELS] }, plotOptions: { bar: { columnWidth: '55%' } }, colors: ['#6366f1', '#c4b5fd'], legend: { position: 'top' } }} />
        </div>
        <div style={{ ...S.card, flex: 1 }}>
          <h2 style={S.cardTitle}>Organic vs Paid Revenue Trend</h2>
          <CC type="area" height={280} series={[{ name: 'Organic', data: organicTrend }, { name: 'Paid', data: paidTrend.map(v => Math.round(v)) }]} options={{ chart: { toolbar: { show: false }, stacked: true }, xaxis: { categories: weeks.map(w => w.slice(5)) }, yaxis: { labels: { formatter: (v: number) => fmt(v) } }, colors: ['#10b981', '#6366f1'], stroke: { width: 2, curve: 'smooth' }, fill: { type: 'gradient', gradient: { opacityFrom: 0.5, opacityTo: 0.1 } } }} />
        </div>
      </div>
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif' },
  title: { fontSize: 28, fontWeight: 800, margin: '0 0 4px', color: '#1e293b' },
  subtitle: { fontSize: 14, color: '#94a3b8', margin: '0 0 24px' },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
  kpiCard: { background: '#fff', borderRadius: 12, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  kpiLabel: { fontSize: 13, color: '#64748b', fontWeight: 500, marginBottom: 4 },
  kpiValue: { fontSize: 28, fontWeight: 800 },
  kpiSub: { fontSize: 12, color: '#94a3b8', marginTop: 4 },
  card: { background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 },
  cardTitle: { fontSize: 16, fontWeight: 700, margin: '0 0 16px', color: '#1e293b' },
  row: { display: 'flex', gap: 20, marginBottom: 20, flexWrap: 'wrap' as const },
  aiCard: { background: 'linear-gradient(135deg, #7c3aed, #6366f1, #8b5cf6)', color: '#fff', borderRadius: 12, padding: 24, marginBottom: 20, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '2px solid #e2e8f0', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase' as const },
  td: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155' },
  tdR: { padding: '10px 12px', borderBottom: '1px solid #f1f5f9', color: '#334155', textAlign: 'right' as const },
  trAlt: { background: '#f8fafc' },
};

export function ErrorBoundary() {
  return (
    <div style={{ padding: 24, textAlign: 'center' }}>
      <h2 style={{ color: '#ef4444' }}>Failed to load Marketing dashboard</h2>
      <p style={{ color: '#64748b' }}>Please check your Shopify connection and try again.</p>
    </div>
  );
}
