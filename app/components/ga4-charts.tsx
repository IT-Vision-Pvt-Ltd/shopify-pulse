import { useState, useEffect, Suspense, lazy } from 'react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

/* ---- Styles ---- */
const S: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#1f2937' },
  insight: { fontSize: 13, color: '#6b7280', marginTop: 12, lineHeight: 1.5, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, borderLeft: '3px solid #7c3aed' },
  locked: { textAlign: 'center' as const, padding: '48px 20px', color: '#9ca3af' },
  lockedIcon: { fontSize: 40, marginBottom: 12 },
  lockedText: { fontSize: 14, fontWeight: 600, color: '#6b7280' },
  lockedSub: { fontSize: 12, color: '#9ca3af', marginTop: 4 },
  bigNumber: { fontSize: 48, fontWeight: 800, color: '#1f2937', textAlign: 'center' as const },
  pulseDot: { width: 12, height: 12, borderRadius: '50%', background: '#10b981', display: 'inline-block', marginRight: 8, animation: 'pulse 2s infinite' },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12, textTransform: 'uppercase' as const },
  thRight: { textAlign: 'right' as const, padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12, textTransform: 'uppercase' as const },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  tdRight: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' as const },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 },
};

const theme = ['#7c3aed', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1', '#f97316'];

function LockedCard({ title, type }: { title: string; type: 'ga4' | 'gsc' }) {
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>{title}</div>
      <div style={S.locked}>
        <div style={S.lockedIcon}>{type === 'ga4' ? '📊' : '🔍'}</div>
        <div style={S.lockedText}>Connect {type === 'ga4' ? 'Google Analytics' : 'Google Search Console'} to unlock this insight</div>
        <div style={S.lockedSub}>Real data from your store, visualized beautifully</div>
      </div>
    </div>
  );
}

/* ================================================================
   GA4 CHARTS
   ================================================================ */

// 1. RealTimeVisitors
export function RealTimeVisitors({ data }: { data: { activeUsers: number } | null }) {
  if (!data) return <LockedCard title="Real-Time Visitors" type="ga4" />;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>🟢 Real-Time Visitors</div>
      <div style={{ textAlign: 'center', padding: '20px 0' }}>
        <div style={S.bigNumber}>
          <span style={S.pulseDot} />
          {data.activeUsers.toLocaleString()}
        </div>
        <div style={{ fontSize: 14, color: '#6b7280', marginTop: 8 }}>people on your store right now</div>
      </div>
      <style>{`@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(1.3); } }`}</style>
    </div>
  );
}

// 2. TrafficSourcesBreakdown
export function TrafficSourcesBreakdown({ data }: { data: { sources: { name: string; visitors: number }[] } | null }) {
  if (!data) return <LockedCard title="Traffic Sources Breakdown" type="ga4" />;
  const labels = data.sources.map(s => s.name);
  const series = data.sources.map(s => s.visitors);
  const total = series.reduce((a, b) => a + b, 0);
  const organic = data.sources.find(s => s.name === 'Organic Search');
  const organicPct = organic && total > 0 ? ((organic.visitors / total) * 100).toFixed(1) : '0';
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Traffic Sources Breakdown</div>
      <CC type="donut" series={series} height={280} options={{
        labels,
        colors: ['#10b981', '#3b82f6', '#ec4899', '#6366f1', '#f59e0b', '#f97316'],
        legend: { position: 'bottom', fontSize: '12px' },
        dataLabels: { enabled: true, formatter: (val: number) => val.toFixed(1) + '%' },
        plotOptions: { pie: { donut: { size: '55%' } } },
      }} />
      <div style={S.insight}>💡 What this means: {organicPct}% of your visitors find you through Google search</div>
    </div>
  );
}

// 3. VisitorToCustomerFunnel
export function VisitorToCustomerFunnel({ data }: { data: { visitors: number; productViews: number; addToCart: number; checkoutStarted: number; purchases: number } | null }) {
  if (!data) return <LockedCard title="Visitor → Customer Funnel" type="ga4" />;
  const steps = [
    { label: 'Website Visitors', value: data.visitors },
    { label: 'Product Views', value: data.productViews },
    { label: 'Add to Cart', value: data.addToCart },
    { label: 'Checkout Started', value: data.checkoutStarted },
    { label: 'Purchase Complete', value: data.purchases },
  ];
  const conversionRate = data.visitors > 0 ? ((data.purchases / data.visitors) * 100).toFixed(2) : '0';
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Visitor → Customer Funnel</div>
      <CC type="bar" height={300} series={[{ name: 'Users', data: steps.map(s => s.value) }]} options={{
        chart: { toolbar: { show: false } },
        plotOptions: { bar: { horizontal: false, borderRadius: 6, columnWidth: '60%' } },
        colors: ['#7c3aed'],
        xaxis: { categories: steps.map(s => s.label) },
        yaxis: { labels: { formatter: (v: number) => v.toLocaleString() } },
        dataLabels: {
          enabled: true,
          formatter: (val: number, opts: any) => {
            const idx = opts.dataPointIndex;
            if (idx === 0) return val.toLocaleString();
            const prev = steps[idx - 1].value;
            const pct = prev > 0 ? ((val / prev) * 100).toFixed(1) : '0';
            return `${val.toLocaleString()} (${pct}%)`;
          },
          style: { fontSize: '11px' },
        },
        grid: { borderColor: '#f3f4f6' },
      }} />
      <div style={S.insight}>💡 Overall conversion rate: {conversionRate}% of visitors complete a purchase</div>
    </div>
  );
}

// 4. TopCountriesRevenue
export function TopCountriesRevenue({ data }: { data: { countries: { country: string; visitors: number; revenue: number }[] } | null }) {
  if (!data) return <LockedCard title="Top Countries by Revenue" type="ga4" />;
  const top10 = data.countries.slice(0, 10);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Top Countries by Revenue</div>
      <CC type="bar" height={320} series={[
        { name: 'Revenue', data: top10.map(c => c.revenue) },
        { name: 'Visitors', data: top10.map(c => c.visitors) },
      ]} options={{
        chart: { toolbar: { show: false }, stacked: false },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '70%' } },
        colors: ['#7c3aed', '#93c5fd'],
        xaxis: { labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(1) + 'k' } },
        yaxis: { labels: { style: { fontSize: '12px' } } },
        categories: top10.map(c => c.country),
        dataLabels: { enabled: false },
        legend: { position: 'top' },
        grid: { borderColor: '#f3f4f6' },
        tooltip: { y: { formatter: (v: number, { seriesIndex }: any) => seriesIndex === 0 ? '$' + v.toLocaleString() : v.toLocaleString() + ' visitors' } },
      }} />
    </div>
  );
}

// 5. DeviceBrowserMix
export function DeviceBrowserMix({ data }: { data: { devices: { type: string; visitors: number; revenue: number }[]; browsers: { name: string; visitors: number }[] } | null }) {
  if (!data) return <LockedCard title="Device & Browser Mix" type="ga4" />;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Device & Browser Mix</div>
      <div style={S.grid2}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textAlign: 'center' }}>By Device</div>
          <CC type="donut" height={220} series={data.devices.map(d => d.visitors)} options={{
            labels: data.devices.map(d => d.type),
            colors: ['#7c3aed', '#3b82f6', '#10b981'],
            legend: { position: 'bottom', fontSize: '11px' },
            plotOptions: { pie: { donut: { size: '50%' } } },
            dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(0) + '%' },
          }} />
          <div style={{ marginTop: 8, fontSize: 12, color: '#6b7280', textAlign: 'center' }}>
            {data.devices.map(d => (
              <span key={d.type} style={{ marginRight: 12 }}>{d.type}: ${d.revenue.toLocaleString()}</span>
            ))}
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8, textAlign: 'center' }}>By Browser</div>
          <CC type="donut" height={220} series={data.browsers.map(b => b.visitors)} options={{
            labels: data.browsers.map(b => b.name),
            colors: ['#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#6366f1'],
            legend: { position: 'bottom', fontSize: '11px' },
            plotOptions: { pie: { donut: { size: '50%' } } },
            dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(0) + '%' },
          }} />
        </div>
      </div>
    </div>
  );
}

// 6. SessionMetrics
export function SessionMetrics({ data }: { data: { dates: string[]; avgDuration: number[]; pagesPerVisit: number[]; overallAvgDuration: number } | null }) {
  if (!data) return <LockedCard title="Session Metrics" type="ga4" />;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Session Metrics (30 Days)</div>
      <CC type="line" height={280} series={[
        { name: 'Avg Session Duration (min)', data: data.avgDuration },
        { name: 'Pages per Visit', data: data.pagesPerVisit },
      ]} options={{
        chart: { toolbar: { show: false } },
        colors: ['#7c3aed', '#10b981'],
        xaxis: { categories: data.dates, labels: { rotate: -45, style: { fontSize: '10px' } }, tickAmount: 10 },
        yaxis: [
          { title: { text: 'Avg Duration (min)', style: { fontSize: '12px' } }, labels: { formatter: (v: number) => v.toFixed(1) } },
          { opposite: true, title: { text: 'Pages / Visit', style: { fontSize: '12px' } }, labels: { formatter: (v: number) => v.toFixed(1) } },
        ],
        stroke: { width: [3, 3], curve: 'smooth' },
        grid: { borderColor: '#f3f4f6' },
        legend: { position: 'top' },
      }} />
      <div style={S.insight}>💡 Visitors spend an average of {data.overallAvgDuration.toFixed(1)} minutes on your store</div>
    </div>
  );
}

// 7. LandingPagePerformance
export function LandingPagePerformance({ data }: { data: { pages: { url: string; visitors: number; bounceRate: number; avgTime: number; revenue: number }[] } | null }) {
  if (!data) return <LockedCard title="Landing Page Performance" type="ga4" />;
  const sorted = [...data.pages].sort((a, b) => b.revenue - a.revenue);
  const maxRev = sorted.length > 0 ? sorted[0].revenue : 1;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Landing Page Performance</div>
      <table style={S.table}>
        <thead>
          <tr>
            <th style={S.th}>Page</th>
            <th style={S.thRight}>Visitors</th>
            <th style={S.thRight}>Bounce Rate</th>
            <th style={S.thRight}>Avg Time</th>
            <th style={S.thRight}>Revenue</th>
          </tr>
        </thead>
        <tbody>
          {sorted.slice(0, 15).map((p, i) => {
            const revPct = maxRev > 0 ? p.revenue / maxRev : 0;
            const bg = p.bounceRate > 70 ? '#fef2f2' : revPct > 0.5 ? '#f0fdf4' : '#fff';
            return (
              <tr key={i} style={{ background: bg }}>
                <td style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={p.url}>{p.url.length > 40 ? p.url.slice(0, 40) + '…' : p.url}</td>
                <td style={S.tdRight}>{p.visitors.toLocaleString()}</td>
                <td style={S.tdRight}>
                  <span style={{ color: p.bounceRate > 60 ? '#ef4444' : p.bounceRate > 40 ? '#f59e0b' : '#10b981' }}>{p.bounceRate.toFixed(1)}%</span>
                </td>
                <td style={S.tdRight}>{p.avgTime.toFixed(1)}m</td>
                <td style={S.tdRight}>${p.revenue.toLocaleString()}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div style={S.insight}>💡 Green rows = high revenue pages. Red rows = high bounce rate — consider improving those landing pages.</div>
    </div>
  );
}

// 8. NewVsReturning
export function NewVsReturning({ data }: { data: { weeks: string[]; newVisitors: number[]; returning: number[]; returningRevenueMultiplier: number } | null }) {
  if (!data) return <LockedCard title="New vs Returning Visitors" type="ga4" />;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>New vs Returning Visitors</div>
      <CC type="bar" height={280} series={[
        { name: 'New Visitors', data: data.newVisitors },
        { name: 'Returning Visitors', data: data.returning },
      ]} options={{
        chart: { toolbar: { show: false }, stacked: true },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
        colors: ['#3b82f6', '#7c3aed'],
        xaxis: { categories: data.weeks },
        yaxis: { labels: { formatter: (v: number) => v.toLocaleString() } },
        legend: { position: 'top' },
        grid: { borderColor: '#f3f4f6' },
        dataLabels: { enabled: false },
      }} />
      <div style={S.insight}>💡 Returning visitors spend {data.returningRevenueMultiplier.toFixed(0)}% more per order — invest in retention!</div>
    </div>
  );
}

// 9. BounceRateBySource
export function BounceRateBySource({ data }: { data: { sources: { name: string; bounceRate: number }[] } | null }) {
  if (!data) return <LockedCard title="Bounce Rate by Source" type="ga4" />;
  const sorted = [...data.sources].sort((a, b) => b.bounceRate - a.bounceRate);
  const worst = sorted[0];
  const colors = sorted.map(s => s.bounceRate > 60 ? '#ef4444' : s.bounceRate > 40 ? '#f59e0b' : '#10b981');
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Bounce Rate by Source</div>
      <CC type="bar" height={280} series={[{ name: 'Bounce Rate', data: sorted.map(s => s.bounceRate) }]} options={{
        chart: { toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%', distributed: true } },
        colors,
        xaxis: { max: 100, labels: { formatter: (v: number) => v + '%' } },
        yaxis: { labels: { style: { fontSize: '12px' } } },
        categories: sorted.map(s => s.name),
        dataLabels: { enabled: true, formatter: (v: number) => v.toFixed(1) + '%', style: { fontSize: '11px' } },
        legend: { show: false },
        grid: { borderColor: '#f3f4f6' },
      }} />
      {worst && <div style={S.insight}>💡 Your {worst.name} traffic has a {worst.bounceRate.toFixed(1)}% bounce rate — consider improving that landing page</div>}
    </div>
  );
}

// 10. BestTimeToSell
export function BestTimeToSell({ data }: { data: { heatmap: { day: string; hour: number; conversionRate: number }[]; bestDay: string; bestHour: number } | null }) {
  if (!data) return <LockedCard title="Best Time to Sell" type="ga4" />;
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const series = days.map(day => ({
    name: day,
    data: Array.from({ length: 24 }, (_, h) => {
      const point = data.heatmap.find(p => p.day === day && p.hour === h);
      return { x: h.toString().padStart(2, '0') + ':00', y: point ? +(point.conversionRate * 100).toFixed(2) : 0 };
    }),
  }));
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Best Time to Sell</div>
      <CC type="heatmap" height={280} series={series} options={{
        chart: { toolbar: { show: false } },
        dataLabels: { enabled: false },
        colors: ['#7c3aed'],
        xaxis: { labels: { style: { fontSize: '10px' } }, tickAmount: 12 },
        plotOptions: { heatmap: { radius: 2, shadeIntensity: 0.7, colorScale: { ranges: [
          { from: 0, to: 1, color: '#e5e7eb', name: 'Low' },
          { from: 1, to: 3, color: '#c4b5fd', name: 'Medium' },
          { from: 3, to: 100, color: '#7c3aed', name: 'High' },
        ] } } },
        tooltip: { y: { formatter: (v: number) => v.toFixed(2) + '% conversion' } },
      }} />
      <div style={S.insight}>💡 Your best selling time is {data.bestDay} at {data.bestHour}:00 — schedule promotions and ads around this window</div>
    </div>
  );
}

/* ================================================================
   GSC CHARTS
   ================================================================ */

// 11. TopSearchQueries
export function TopSearchQueries({ data }: { data: { queries: { query: string; clicks: number; impressions: number; ctr: number; position: number }[] } | null }) {
  if (!data) return <LockedCard title="Top Search Queries" type="gsc" />;
  const top = data.queries.slice(0, 20);
  const topQuery = top[0];
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>🔍 Top Search Queries</div>
      {topQuery && <div style={S.insight}>💡 People search for "{topQuery.query}" and find your store</div>}
      <table style={{ ...S.table, marginTop: 12 }}>
        <thead>
          <tr>
            <th style={S.th}>Query</th>
            <th style={S.thRight}>Clicks</th>
            <th style={S.thRight}>Impressions</th>
            <th style={S.thRight}>CTR</th>
            <th style={S.thRight}>Position</th>
          </tr>
        </thead>
        <tbody>
          {top.map((q, i) => (
            <tr key={i}>
              <td style={{ ...S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.query}</td>
              <td style={S.tdRight}>{q.clicks.toLocaleString()}</td>
              <td style={S.tdRight}>{q.impressions.toLocaleString()}</td>
              <td style={S.tdRight}>
                <span style={{ color: q.ctr > 5 ? '#10b981' : q.ctr < 1 ? '#ef4444' : '#f59e0b' }}>{q.ctr.toFixed(2)}%</span>
              </td>
              <td style={S.tdRight}>{q.position.toFixed(1)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// 12. SearchPerformanceTrend
export function SearchPerformanceTrend({ data }: { data: { dates: string[]; clicks: number[]; impressions: number[] } | null }) {
  if (!data) return <LockedCard title="Search Performance Trend" type="gsc" />;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Search Performance Trend (30 Days)</div>
      <CC type="line" height={280} series={[
        { name: 'Clicks', data: data.clicks },
        { name: 'Impressions', data: data.impressions },
      ]} options={{
        chart: { toolbar: { show: false } },
        colors: ['#7c3aed', '#93c5fd'],
        xaxis: { categories: data.dates, labels: { rotate: -45, style: { fontSize: '10px' } }, tickAmount: 10 },
        yaxis: [
          { title: { text: 'Clicks', style: { fontSize: '12px' } }, labels: { formatter: (v: number) => v.toLocaleString() } },
          { opposite: true, title: { text: 'Impressions', style: { fontSize: '12px' } }, labels: { formatter: (v: number) => (v / 1000).toFixed(1) + 'k' } },
        ],
        stroke: { width: [3, 2], curve: 'smooth' },
        grid: { borderColor: '#f3f4f6' },
        legend: { position: 'top' },
      }} />
    </div>
  );
}

// 13. TopRankingPages
export function TopRankingPages({ data }: { data: { pages: { url: string; clicks: number; position: number }[] } | null }) {
  if (!data) return <LockedCard title="Top Ranking Pages" type="gsc" />;
  const top10 = data.pages.slice(0, 10);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Top Ranking Pages</div>
      <CC type="bar" height={300} series={[{ name: 'Clicks', data: top10.map(p => p.clicks) }]} options={{
        chart: { toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
        colors: ['#7c3aed'],
        xaxis: { labels: { formatter: (v: number) => v.toLocaleString() } },
        yaxis: { labels: { style: { fontSize: '11px' }, formatter: (v: string) => v.length > 35 ? v.slice(0, 35) + '…' : v } },
        categories: top10.map(p => p.url.replace(/^https?:\/\/[^/]+/, '')),
        dataLabels: { enabled: true, formatter: (val: number, opts: any) => {
          const pos = top10[opts.dataPointIndex]?.position;
          return `${val} (pos: ${pos?.toFixed(1)})`;
        }, style: { fontSize: '10px' } },
        grid: { borderColor: '#f3f4f6' },
        tooltip: { y: { formatter: (v: number) => v + ' clicks' } },
      }} />
    </div>
  );
}

// 14. CTROpportunities
export function CTROpportunities({ data }: { data: { keywords: { query: string; impressions: number; ctr: number }[] } | null }) {
  if (!data) return <LockedCard title="CTR Opportunities" type="gsc" />;
  const series = data.keywords.map(k => ({
    x: k.impressions,
    y: k.ctr,
  }));
  const quickWins = data.keywords.filter(k => k.impressions > (data.keywords.reduce((s, kw) => s + kw.impressions, 0) / data.keywords.length) && k.ctr < 2);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>CTR Opportunities</div>
      <CC type="scatter" height={300} series={[
        { name: 'Keywords', data: data.keywords.filter(k => !(k.impressions > (data.keywords.reduce((s, kw) => s + kw.impressions, 0) / data.keywords.length) && k.ctr < 2)).map(k => ({ x: k.impressions, y: k.ctr })) },
        { name: 'Quick Win!', data: quickWins.map(k => ({ x: k.impressions, y: k.ctr })) },
      ]} options={{
        chart: { toolbar: { show: false } },
        colors: ['#93c5fd', '#ef4444'],
        xaxis: { title: { text: 'Impressions' }, labels: { formatter: (v: number) => v.toLocaleString() } },
        yaxis: { title: { text: 'CTR %' }, labels: { formatter: (v: number) => v.toFixed(1) + '%' } },
        legend: { position: 'top' },
        grid: { borderColor: '#f3f4f6' },
        markers: { size: 6 },
      }} />
      <div style={S.insight}>💡 {quickWins.length > 0 ? `${quickWins.length} keywords get seen a lot but few people click — improve your titles/descriptions for quick wins!` : 'Your CTR looks healthy across high-impression keywords!'}</div>
    </div>
  );
}

// 15. SearchByCountry
export function SearchByCountry({ data }: { data: { countries: { country: string; clicks: number; ctr: number }[] } | null }) {
  if (!data) return <LockedCard title="Search by Country" type="gsc" />;
  const top10 = data.countries.slice(0, 10);
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Search by Country</div>
      <CC type="bar" height={300} series={[{ name: 'Clicks', data: top10.map(c => c.clicks) }]} options={{
        chart: { toolbar: { show: false } },
        plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
        colors: ['#7c3aed'],
        xaxis: { labels: { formatter: (v: number) => v.toLocaleString() } },
        yaxis: { labels: { style: { fontSize: '12px' } } },
        categories: top10.map(c => c.country),
        dataLabels: { enabled: true, formatter: (val: number, opts: any) => {
          const ctr = top10[opts.dataPointIndex]?.ctr;
          return `${val} (${ctr?.toFixed(1)}% CTR)`;
        }, style: { fontSize: '10px' } },
        grid: { borderColor: '#f3f4f6' },
      }} />
    </div>
  );
}

// 16. MobileVsDesktopSearch
export function MobileVsDesktopSearch({ data }: { data: { mobile: { clicks: number; impressions: number; ctr: number; position: number }; desktop: { clicks: number; impressions: number; ctr: number; position: number } } | null }) {
  if (!data) return <LockedCard title="Mobile vs Desktop Search" type="gsc" />;
  const metrics = ['Clicks', 'Impressions', 'CTR %', 'Avg Position'];
  const mobileVals = [data.mobile.clicks, data.mobile.impressions, data.mobile.ctr, data.mobile.position];
  const desktopVals = [data.desktop.clicks, data.desktop.impressions, data.desktop.ctr, data.desktop.position];
  const mobileBetter = data.mobile.ctr > data.desktop.ctr;
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>Mobile vs Desktop Search</div>
      <CC type="bar" height={280} series={[
        { name: 'Mobile', data: [data.mobile.clicks, data.mobile.impressions] },
        { name: 'Desktop', data: [data.desktop.clicks, data.desktop.impressions] },
      ]} options={{
        chart: { toolbar: { show: false } },
        plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
        colors: ['#7c3aed', '#3b82f6'],
        xaxis: { categories: ['Clicks', 'Impressions'] },
        yaxis: { labels: { formatter: (v: number) => v.toLocaleString() } },
        legend: { position: 'top' },
        grid: { borderColor: '#f3f4f6' },
        dataLabels: { enabled: false },
      }} />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, margin: '12px 0', fontSize: 13 }}>
        <div><strong>Mobile CTR:</strong> {data.mobile.ctr.toFixed(2)}% | <strong>Pos:</strong> {data.mobile.position.toFixed(1)}</div>
        <div><strong>Desktop CTR:</strong> {data.desktop.ctr.toFixed(2)}% | <strong>Pos:</strong> {data.desktop.position.toFixed(1)}</div>
      </div>
      <div style={S.insight}>💡 {mobileBetter ? 'Mobile outperforms desktop — your site is well-optimized for mobile search!' : 'Desktop outperforms mobile — consider improving mobile page speed and UX'}</div>
    </div>
  );
}

// 17. SEOHealthScore
export function SEOHealthScore({ data }: { data: { score: number; avgCtr: number; avgPosition: number; indexedPages: number; tips: string[] } | null }) {
  if (!data) return <LockedCard title="SEO Health Score" type="gsc" />;
  const color = data.score > 70 ? '#10b981' : data.score > 40 ? '#f59e0b' : '#ef4444';
  const label = data.score > 70 ? 'Healthy' : data.score > 40 ? 'Needs Work' : 'Critical';
  return (
    <div style={S.card}>
      <div style={S.cardTitle}>SEO Health Score</div>
      <CC type="radialBar" height={280} series={[data.score]} options={{
        plotOptions: {
          radialBar: {
            startAngle: -135, endAngle: 135,
            hollow: { size: '60%' },
            track: { background: '#f3f4f6', strokeWidth: '100%' },
            dataLabels: {
              name: { show: true, fontSize: '14px', color: '#6b7280', offsetY: -10 },
              value: { show: true, fontSize: '36px', fontWeight: 700, color, formatter: (v: number) => Math.round(v).toString() },
            },
          },
        },
        colors: [color],
        labels: [label],
        stroke: { lineCap: 'round' },
      }} />
      <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 12, fontSize: 12, color: '#6b7280' }}>
        <span>Avg CTR: {data.avgCtr.toFixed(2)}%</span>
        <span>Avg Position: {data.avgPosition.toFixed(1)}</span>
        <span>Indexed: {data.indexedPages.toLocaleString()}</span>
      </div>
      {data.tips.length > 0 && (
        <div style={S.insight}>
          💡 <strong>Action items:</strong><br />
          {data.tips.map((t, i) => <span key={i}>• {t}<br /></span>)}
        </div>
      )}
    </div>
  );
}
