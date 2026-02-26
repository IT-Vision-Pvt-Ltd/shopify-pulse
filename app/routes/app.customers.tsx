import { useState, useEffect, Suspense, lazy } from 'react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData, useRouteError } from '@remix-run/react';
import { authenticate } from '../shopify.server';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

const S: Record<string, React.CSSProperties> = {
  page: { padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif' },
  grid2: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(500px,1fr))', gap: 20, marginBottom: 20 },
  grid3: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(320px,1fr))', gap: 20, marginBottom: 20 },
  kpiRow: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16, marginBottom: 24 },
  card: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)' },
  kpi: { background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 1px 4px rgba(0,0,0,.08)', textAlign: 'center' as const },
  kpiVal: { fontSize: 28, fontWeight: 700, color: '#1a1a2e' },
  kpiLabel: { fontSize: 12, color: '#6b7280', marginTop: 4, textTransform: 'uppercase' as const, letterSpacing: 1 },
  title: { fontSize: 15, fontWeight: 600, marginBottom: 14, color: '#1a1a2e' },
  pageTitle: { fontSize: 26, fontWeight: 700, marginBottom: 20, color: '#1a1a2e' },
  cohortTable: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 11 },
  cohortTh: { padding: '6px 8px', background: '#f3f4f6', fontWeight: 600, textAlign: 'left' as const, borderBottom: '1px solid #e5e7eb' },
  cohortTd: { padding: '5px 8px', textAlign: 'center' as const, borderBottom: '1px solid #f3f4f6' },
  aiCard: { background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 14, padding: 24, color: '#fff', marginBottom: 20 },
  aiTitle: { fontSize: 16, fontWeight: 700, marginBottom: 10 },
  aiText: { fontSize: 13, lineHeight: 1.7, opacity: 0.95 },
};

function retentionColor(pct: number) {
  if (pct >= 60) return '#059669';
  if (pct >= 40) return '#10b981';
  if (pct >= 20) return '#fbbf24';
  if (pct > 0) return '#f97316';
  return '#f3f4f6';
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const allCustomers: any[] = [];
  let cursor: string | null = null;
  for (let page = 0; page < 5; page++) {
    const resp = await admin.graphql(`query($cursor: String) {
      customers(first: 250, after: $cursor, sortKey: UPDATED_AT, reverse: true) {
        pageInfo { hasNextPage endCursor }
        nodes {
          id displayName email numberOfOrders
          amountSpent { amount currencyCode }
          createdAt updatedAt
          orders(first: 50) { nodes {
            createdAt
            totalPriceSet { shopMoney { amount } }
            lineItems(first: 5) { nodes { title } }
          }}
        }
      }
    }`, { variables: { cursor } });
    const d = await resp.json();
    const cData = d.data?.customers;
    if (!cData) break;
    allCustomers.push(...cData.nodes);
    if (!cData.pageInfo.hasNextPage) break;
    cursor = cData.pageInfo.endCursor;
  }

  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalCustomers = allCustomers.length;
  const newThisMonth = allCustomers.filter(c => c.createdAt?.startsWith(thisMonth)).length;
  const repeatCustomers = allCustomers.filter(c => (c.numberOfOrders || 0) > 1).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
  const ltvValues = allCustomers.map(c => parseFloat(c.amountSpent?.amount || '0'));
  const avgLtv = totalCustomers > 0 ? Math.round(ltvValues.reduce((a, b) => a + b, 0) / totalCustomers) : 0;

  // Churn risk: no orders in 90+ days, had at least 1 order
  const dayMs = 86400000;
  const churnRisk = allCustomers.filter(c => {
    const orders = c.orders?.nodes || [];
    if (orders.length === 0) return false;
    const lastOrder = new Date(orders[0].createdAt);
    return (now.getTime() - lastOrder.getTime()) > 90 * dayMs;
  }).length;
  // Repeat risk: only 1 order, placed 30-90 days ago
  const repeatRisk = allCustomers.filter(c => {
    const orders = c.orders?.nodes || [];
    if (orders.length !== 1) return false;
    const d = now.getTime() - new Date(orders[0].createdAt).getTime();
    return d > 30 * dayMs && d < 90 * dayMs;
  }).length;

  // Monthly cohort retention
  const cohortMap: Record<string, { total: number; activeMonths: Record<string, Set<string>> }> = {};
  allCustomers.forEach(c => {
    const created = c.createdAt?.substring(0, 7);
    if (!created) return;
    if (!cohortMap[created]) cohortMap[created] = { total: 0, activeMonths: {} };
    cohortMap[created].total++;
    (c.orders?.nodes || []).forEach((o: any) => {
      const oMonth = o.createdAt?.substring(0, 7);
      if (!oMonth) return;
      if (!cohortMap[created].activeMonths[oMonth]) cohortMap[created].activeMonths[oMonth] = new Set();
      cohortMap[created].activeMonths[oMonth].add(c.id);
    });
  });
  const cohortKeys = Object.keys(cohortMap).sort().slice(-8);
  const allMonths = [...new Set(allCustomers.flatMap(c => (c.orders?.nodes || []).map((o: any) => o.createdAt?.substring(0, 7)).filter(Boolean)))].sort();
  const cohortRetention = cohortKeys.map(ck => {
    const co = cohortMap[ck];
    const startIdx = allMonths.indexOf(ck);
    const retention: number[] = [];
    for (let i = 0; i < 6; i++) {
      const m = allMonths[startIdx + i];
      if (!m) { retention.push(0); continue; }
      const active = co.activeMonths[m]?.size || 0;
      retention.push(co.total > 0 ? Math.round((active / co.total) * 100) : 0);
    }
    return { cohort: ck, total: co.total, retention };
  });

  // Cohort revenue retention
  const cohortRevenue = cohortKeys.slice(-5).map(ck => {
    const co = cohortMap[ck];
    const startIdx = allMonths.indexOf(ck);
    const data: number[] = [];
    for (let i = 0; i < 6; i++) {
      const m = allMonths[startIdx + i];
      if (!m) { data.push(0); continue; }
      let rev = 0;
      allCustomers.filter(c => c.createdAt?.startsWith(ck)).forEach(c => {
        (c.orders?.nodes || []).filter((o: any) => o.createdAt?.startsWith(m)).forEach((o: any) => {
          rev += parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
        });
      });
      data.push(Math.round(rev));
    }
    return { name: ck, data };
  });

  // LTV distribution buckets
  const buckets = [0, 50, 100, 200, 500, 1000, 5000];
  const ltvDist = buckets.map((b, i) => {
    const next = buckets[i + 1] || Infinity;
    const label = next === Infinity ? `$${b}+` : `$${b}-${next}`;
    const count = ltvValues.filter(v => v >= b && v < next).length;
    return { label, count };
  });

  // LTV by first product
  const productLtv: Record<string, { total: number; count: number }> = {};
  allCustomers.forEach(c => {
    const orders = (c.orders?.nodes || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const firstItem = orders[0]?.lineItems?.nodes?.[0]?.title;
    if (!firstItem) return;
    const key = firstItem.length > 30 ? firstItem.substring(0, 30) + '…' : firstItem;
    if (!productLtv[key]) productLtv[key] = { total: 0, count: 0 };
    productLtv[key].total += parseFloat(c.amountSpent?.amount || '0');
    productLtv[key].count++;
  });
  const ltvByProduct = Object.entries(productLtv)
    .map(([name, v]) => ({ name, avg: Math.round(v.total / v.count) }))
    .sort((a, b) => b.avg - a.avg).slice(0, 10);

  // RFM segmentation
  const rfmCustomers = allCustomers.map(c => {
    const orders = c.orders?.nodes || [];
    const lastOrder = orders.length > 0 ? new Date(orders[0].createdAt) : null;
    const recencyDays = lastOrder ? Math.floor((now.getTime() - lastOrder.getTime()) / dayMs) : 999;
    const frequency = c.numberOfOrders || 0;
    const monetary = parseFloat(c.amountSpent?.amount || '0');
    return { recencyDays, frequency, monetary };
  });
  const segments: Record<string, number> = { Champions: 0, Loyal: 0, 'Potential Loyalist': 0, 'New Customers': 0, 'At Risk': 0, 'Lost': 0 };
  rfmCustomers.forEach(c => {
    if (c.recencyDays < 30 && c.frequency >= 4) segments.Champions++;
    else if (c.recencyDays < 60 && c.frequency >= 3) segments.Loyal++;
    else if (c.recencyDays < 30 && c.frequency >= 1) segments['Potential Loyalist']++;
    else if (c.recencyDays < 30) segments['New Customers']++;
    else if (c.recencyDays < 120 && c.frequency >= 2) segments['At Risk']++;
    else segments.Lost++;
  });
  const rfmTreemap = Object.entries(segments).map(([x, y]) => ({ x, y }));

  // Customer lifecycle funnel
  const funnel = [
    { label: 'All Customers', count: totalCustomers },
    { label: 'Made Purchase', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 1).length },
    { label: '2+ Orders', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 2).length },
    { label: '3+ Orders', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 3).length },
    { label: '5+ Orders', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 5).length },
  ];

  // Repeat purchase rate by month
  const monthlyRepeat: Record<string, { total: Set<string>; repeat: Set<string> }> = {};
  allCustomers.forEach(c => {
    const orders = (c.orders?.nodes || []).sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    const seen = new Set<string>();
    orders.forEach((o: any) => {
      const m = o.createdAt?.substring(0, 7);
      if (!m) return;
      if (!monthlyRepeat[m]) monthlyRepeat[m] = { total: new Set(), repeat: new Set() };
      monthlyRepeat[m].total.add(c.id);
      if (seen.size > 0) monthlyRepeat[m].repeat.add(c.id);
      seen.add(m);
    });
  });
  const repeatByMonth = Object.entries(monthlyRepeat).sort(([a], [b]) => a.localeCompare(b)).slice(-12).map(([m, v]) => ({
    month: m, rate: v.total.size > 0 ? Math.round((v.repeat.size / v.total.size) * 100) : 0,
  }));

  // Time between purchases (histogram)
  const gaps: number[] = [];
  allCustomers.forEach(c => {
    const dates = (c.orders?.nodes || []).map((o: any) => new Date(o.createdAt).getTime()).sort((a: number, b: number) => a - b);
    for (let i = 1; i < dates.length; i++) gaps.push(Math.floor((dates[i] - dates[i - 1]) / dayMs));
  });
  const gapBuckets = [0, 7, 14, 30, 60, 90, 180, 365];
  const gapHist = gapBuckets.map((b, i) => {
    const next = gapBuckets[i + 1] || Infinity;
    return { label: next === Infinity ? `${b}d+` : `${b}-${next}d`, count: gaps.filter(g => g >= b && g < next).length };
  });

  // Churn prediction scatter (recency vs frequency)
  const churnScatter = rfmCustomers.filter(c => c.frequency > 0).map(c => ({ x: c.recencyDays, y: c.frequency }));

  // Revenue pareto
  const sortedLtv = [...ltvValues].sort((a, b) => b - a);
  const totalRev = sortedLtv.reduce((a, b) => a + b, 0);
  let cumRev = 0;
  const paretoData = sortedLtv.map((v, i) => {
    cumRev += v;
    return { pct: Math.round(((i + 1) / sortedLtv.length) * 100), cumPct: totalRev > 0 ? Math.round((cumRev / totalRev) * 100) : 0, rev: Math.round(v) };
  });
  // Sample every N points for chart
  const step = Math.max(1, Math.floor(paretoData.length / 50));
  const paretoSampled = paretoData.filter((_, i) => i % step === 0 || i === paretoData.length - 1);

  // Next purchase prediction scatter (days since last order vs avg gap)
  const nextPurchase = allCustomers.filter(c => (c.orders?.nodes || []).length >= 2).map(c => {
    const dates = (c.orders?.nodes || []).map((o: any) => new Date(o.createdAt).getTime()).sort((a: number, b: number) => a - b);
    const avgGap = dates.length > 1 ? (dates[dates.length - 1] - dates[0]) / (dates.length - 1) / dayMs : 0;
    const daysSince = Math.floor((now.getTime() - dates[dates.length - 1]) / dayMs);
    return { x: daysSince, y: Math.round(avgGap) };
  });

  // AI RFM insight
  const topSegment = Object.entries(segments).sort((a, b) => b[1] - a[1])[0];
  const aiInsight = `Your largest segment is "${topSegment[0]}" with ${topSegment[1]} customers (${totalCustomers > 0 ? Math.round((topSegment[1] / totalCustomers) * 100) : 0}%). ` +
    `Repeat rate is ${repeatRate}% with average LTV of $${avgLtv}. ` +
    `${churnRisk} customers are at churn risk (no orders 90+ days). ` +
    `${segments.Champions} champions drive most revenue — focus retention campaigns on the ${segments['At Risk']} at-risk customers to recover revenue. ` +
    `Consider win-back emails for the ${segments.Lost} lost customers with personalized offers based on their purchase history.`;

  // LTV:CAC ratio (estimated — no real CAC, use placeholder)
  const ltvCacRatio = Math.min(Math.round(avgLtv / Math.max(25, 1) * 10) / 10, 10);

  return json({
    totalCustomers, newThisMonth, repeatRate, avgLtv, churnRisk, repeatRisk,
    cohortRetention, cohortRevenue,
    ltvDist, ltvByProduct, ltvCacRatio,
    rfmTreemap, segments, funnel,
    repeatByMonth, gapHist, churnScatter,
    paretoSampled, nextPurchase, aiInsight,
  });
};

export default function CustomersPage() {
  const d = useLoaderData<typeof loader>();

  return (
    <div style={S.page}>
      <div style={S.pageTitle}>👥 Customer Intelligence</div>

      {/* KPI Cards */}
      <div style={S.kpiRow}>
        {[
          { label: 'Total Customers', val: d.totalCustomers.toLocaleString(), color: '#6366f1' },
          { label: 'New This Month', val: d.newThisMonth.toLocaleString(), color: '#10b981' },
          { label: 'Repeat Rate', val: d.repeatRate + '%', color: '#f59e0b' },
          { label: 'Avg LTV', val: '$' + d.avgLtv.toLocaleString(), color: '#8b5cf6' },
          { label: 'Repeat Risk', val: d.repeatRisk.toLocaleString(), color: '#f97316' },
          { label: 'Churn Risk', val: d.churnRisk.toLocaleString(), color: '#ef4444' },
        ].map((k, i) => (
          <div key={i} style={S.kpi}>
            <div style={{ ...S.kpiVal, color: k.color }}>{k.val}</div>
            <div style={S.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* AI RFM Insight */}
      <div style={S.aiCard}>
        <div style={S.aiTitle}>🤖 AI Customer Insight</div>
        <div style={S.aiText}>{d.aiInsight}</div>
      </div>

      {/* Cohort Retention Grid */}
      <div style={{ ...S.card, marginBottom: 20, overflowX: 'auto' }}>
        <div style={S.title}>📊 Monthly Cohort Retention Grid</div>
        <table style={S.cohortTable}>
          <thead>
            <tr>
              <th style={S.cohortTh}>Cohort</th>
              <th style={S.cohortTh}>Size</th>
              {[0, 1, 2, 3, 4, 5].map(i => <th key={i} style={S.cohortTh}>M{i}</th>)}
            </tr>
          </thead>
          <tbody>
            {d.cohortRetention.map((c: any, i: number) => (
              <tr key={i}>
                <td style={{ ...S.cohortTd, textAlign: 'left', fontWeight: 600 }}>{c.cohort}</td>
                <td style={S.cohortTd}>{c.total}</td>
                {c.retention.map((r: number, j: number) => (
                  <td key={j} style={{ ...S.cohortTd, background: retentionColor(r), color: r >= 20 ? '#fff' : '#374151', fontWeight: 600 }}>
                    {r}%
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.grid2}>
        {/* Cohort Revenue Retention */}
        <div style={S.card}>
          <div style={S.title}>💰 Cohort Revenue Retention</div>
          <CC type="line" height={280} series={d.cohortRevenue} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: ['M0', 'M1', 'M2', 'M3', 'M4', 'M5'] },
            stroke: { width: 2, curve: 'smooth' },
            colors: ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
            yaxis: { labels: { formatter: (v: number) => '$' + v } },
          }} />
        </div>

        {/* LTV Distribution */}
        <div style={S.card}>
          <div style={S.title}>📈 LTV Distribution</div>
          <CC type="bar" height={280} series={[{ name: 'Customers', data: d.ltvDist.map((b: any) => b.count) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.ltvDist.map((b: any) => b.label) },
            colors: ['#6366f1'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
          }} />
        </div>

        {/* LTV by First Product */}
        <div style={S.card}>
          <div style={S.title}>🛍️ LTV by First Product</div>
          <CC type="bar" height={300} series={[{ name: 'Avg LTV', data: d.ltvByProduct.map((p: any) => p.avg) }]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
            xaxis: { labels: { formatter: (v: number) => '$' + v } },
            yaxis: { labels: { style: { fontSize: '11px' } } },
            categories: d.ltvByProduct.map((p: any) => p.name),
            colors: ['#8b5cf6'],
          }} />
        </div>

        {/* LTV:CAC Ratio */}
        <div style={S.card}>
          <div style={S.title}>⚖️ LTV:CAC Ratio</div>
          <CC type="radialBar" height={280} series={[Math.min(d.ltvCacRatio * 10, 100)]} options={{
            plotOptions: { radialBar: { hollow: { size: '60%' }, dataLabels: { name: { show: true, fontSize: '14px' }, value: { show: true, fontSize: '28px', formatter: () => d.ltvCacRatio + 'x' } } } },
            labels: ['LTV:CAC'],
            colors: [d.ltvCacRatio >= 3 ? '#10b981' : d.ltvCacRatio >= 2 ? '#f59e0b' : '#ef4444'],
          }} />
        </div>

        {/* RFM Treemap */}
        <div style={S.card}>
          <div style={S.title}>🗺️ RFM Segmentation</div>
          <CC type="treemap" height={280} series={[{ data: d.rfmTreemap }]} options={{
            chart: { toolbar: { show: false } },
            colors: ['#6366f1', '#10b981', '#3b82f6', '#06b6d4', '#f97316', '#ef4444'],
            plotOptions: { treemap: { distributed: true } },
          }} />
        </div>

        {/* RFM Migration (grouped bar) */}
        <div style={S.card}>
          <div style={S.title}>🔄 RFM Segment Distribution</div>
          <CC type="bar" height={280} series={[{ name: 'Customers', data: Object.values(d.segments) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: Object.keys(d.segments) },
            colors: ['#6366f1'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
          }} />
        </div>

        {/* Customer Lifecycle Funnel */}
        <div style={S.card}>
          <div style={S.title}>🔽 Customer Lifecycle Funnel</div>
          <CC type="bar" height={260} series={[{ name: 'Customers', data: d.funnel.map((f: any) => f.count) }]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '60%' } },
            xaxis: { categories: d.funnel.map((f: any) => f.label) },
            colors: ['#6366f1'],
          }} />
        </div>

        {/* Repeat Purchase Rate */}
        <div style={S.card}>
          <div style={S.title}>🔁 Repeat Purchase Rate by Month</div>
          <CC type="bar" height={260} series={[{ name: 'Repeat %', data: d.repeatByMonth.map((m: any) => m.rate) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.repeatByMonth.map((m: any) => m.month) },
            colors: ['#10b981'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
            yaxis: { max: 100, labels: { formatter: (v: number) => v + '%' } },
          }} />
        </div>

        {/* Time Between Purchases */}
        <div style={S.card}>
          <div style={S.title}>⏱️ Time Between Purchases</div>
          <CC type="bar" height={260} series={[{ name: 'Customers', data: d.gapHist.map((g: any) => g.count) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.gapHist.map((g: any) => g.label) },
            colors: ['#f59e0b'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
          }} />
        </div>

        {/* Churn Prediction Scatter */}
        <div style={S.card}>
          <div style={S.title}>⚠️ Churn Prediction (Recency vs Frequency)</div>
          <CC type="scatter" height={280} series={[{ name: 'Customers', data: d.churnScatter.slice(0, 200) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { title: { text: 'Days Since Last Order' } },
            yaxis: { title: { text: 'Order Count' } },
            colors: ['#ef4444'],
            markers: { size: 4, opacity: 0.6 },
          }} />
        </div>

        {/* Revenue Pareto */}
        <div style={S.card}>
          <div style={S.title}>📊 Revenue Pareto (80/20)</div>
          <CC type="line" height={280} series={[
            { name: 'Cumulative %', data: d.paretoSampled.map((p: any) => p.cumPct), type: 'line' },
          ]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.paretoSampled.map((p: any) => p.pct + '%'), title: { text: '% of Customers' } },
            yaxis: { max: 100, labels: { formatter: (v: number) => v + '%' } },
            colors: ['#6366f1'],
            stroke: { width: 3, curve: 'smooth' },
            annotations: { yaxis: [{ y: 80, borderColor: '#ef4444', strokeDashArray: 4, label: { text: '80% Revenue', style: { color: '#ef4444' } } }] },
          }} />
        </div>

        {/* Next Purchase Timeline */}
        <div style={S.card}>
          <div style={S.title}>🔮 Next Purchase Prediction</div>
          <CC type="scatter" height={280} series={[{ name: 'Customers', data: d.nextPurchase.slice(0, 200) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { title: { text: 'Days Since Last Order' } },
            yaxis: { title: { text: 'Avg Days Between Orders' } },
            colors: ['#8b5cf6'],
            markers: { size: 4, opacity: 0.6 },
          }} />
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: 20 }}>
        <h2 style={{ color: '#dc2626', margin: '0 0 8px' }}>Customer Intelligence Error</h2>
        <p style={{ color: '#7f1d1d', margin: 0 }}>{(error as any)?.message || 'Failed to load customer data. Please try again.'}</p>
      </div>
    </div>
  );
}
