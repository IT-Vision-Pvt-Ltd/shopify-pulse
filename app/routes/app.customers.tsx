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
  page: { padding: 24, maxWidth: 1400, margin: '0 auto', fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', background: '#f6f6f7', minHeight: '100vh' },
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
  aiBtn: { display: 'inline-block', marginTop: 14, padding: '10px 24px', background: 'rgba(255,255,255,0.2)', color: '#fff', border: '1px solid rgba(255,255,255,0.4)', borderRadius: 8, fontWeight: 600, fontSize: 13, cursor: 'pointer', backdropFilter: 'blur(4px)' },
  section: { fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' as const, letterSpacing: 1, margin: '28px 0 12px', borderBottom: '1px solid #e5e7eb', paddingBottom: 6 },
  sankeyContainer: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0, padding: '10px 0', overflowX: 'auto' as const },
  sankeyCol: { display: 'flex', flexDirection: 'column' as const, gap: 6, minWidth: 100 },
  sankeyNode: { padding: '8px 12px', borderRadius: 8, fontSize: 11, fontWeight: 600, textAlign: 'center' as const, color: '#fff', position: 'relative' as const },
  sankeyFlows: { display: 'flex', flexDirection: 'column' as const, gap: 2, minWidth: 60, alignItems: 'center' as const },
  sankeyFlow: { height: 3, borderRadius: 2, opacity: 0.5 },
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
          tags
          orders(first: 50) { nodes {
            createdAt
            totalPriceSet { shopMoney { amount } }
            lineItems(first: 5) { nodes { title } }
            channelInformation { channelDefinition { handle } }
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
  const dayMs = 86400000;
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const totalCustomers = allCustomers.length;
  const newThisMonth = allCustomers.filter(c => c.createdAt?.startsWith(thisMonth)).length;
  const repeatCustomers = allCustomers.filter(c => (c.numberOfOrders || 0) > 1).length;
  const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0;
  const ltvValues = allCustomers.map(c => parseFloat(c.amountSpent?.amount || '0'));
  const avgLtv = totalCustomers > 0 ? Math.round(ltvValues.reduce((a, b) => a + b, 0) / totalCustomers) : 0;

  // Churn risk: no orders in 90+ days, had at least 1 order
  const churnRisk = allCustomers.filter(c => {
    const orders = c.orders?.nodes || [];
    if (orders.length === 0) return false;
    const lastOrder = new Date(orders[0].createdAt);
    return (now.getTime() - lastOrder.getTime()) > 90 * dayMs;
  }).length;
  const churnRiskPct = totalCustomers > 0 ? Math.round((churnRisk / totalCustomers) * 100) : 0;

  // Repeat risk: only 1 order, placed 30-90 days ago
  const repeatRisk = allCustomers.filter(c => {
    const orders = c.orders?.nodes || [];
    if (orders.length !== 1) return false;
    const d = now.getTime() - new Date(orders[0].createdAt).getTime();
    return d > 30 * dayMs && d < 90 * dayMs;
  }).length;
  const repeatRiskPct = totalCustomers > 0 ? Math.round((repeatRisk / totalCustomers) * 100) : 0;

  // Monthly cohort retention (Mo 0-12)
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
    for (let i = 0; i <= 12; i++) {
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
  const ltvBuckets = [
    { min: 0, max: 10, label: '$0-10' },
    { min: 10, max: 50, label: '$10-50' },
    { min: 50, max: 100, label: '$50-100' },
    { min: 100, max: 150, label: '$100-150' },
    { min: 150, max: 250, label: '$150-250' },
    { min: 250, max: 300, label: '$250-300' },
    { min: 300, max: Infinity, label: '$300+' },
  ];
  const ltvDist = ltvBuckets.map(b => ({
    label: b.label,
    count: ltvValues.filter(v => v >= b.min && v < b.max).length,
  }));

  // LTV by Channel
  const channelLtv: Record<string, { current: number; previous: number; count: number }> = {};
  const sixtyDaysAgo = new Date(now.getTime() - 60 * dayMs);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * dayMs);
  allCustomers.forEach(c => {
    (c.orders?.nodes || []).forEach((o: any) => {
      const ch = o.channelInformation?.channelDefinition?.handle || 'online';
      const channelName = ch.includes('google') ? 'Google' : ch.includes('meta') || ch.includes('facebook') ? 'Meta' : ch.includes('email') ? 'Email' : 'Organic';
      if (!channelLtv[channelName]) channelLtv[channelName] = { current: 0, previous: 0, count: 0 };
      const oDate = new Date(o.createdAt);
      const amt = parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
      if (oDate >= thirtyDaysAgo) channelLtv[channelName].current += amt;
      else if (oDate >= sixtyDaysAgo) channelLtv[channelName].previous += amt;
      channelLtv[channelName].count++;
    });
  });
  // Ensure all 4 channels exist
  ['Google', 'Meta', 'Email', 'Organic'].forEach(ch => {
    if (!channelLtv[ch]) channelLtv[ch] = { current: 0, previous: 0, count: 0 };
  });
  const ltvByChannel = Object.entries(channelLtv).map(([name, v]) => ({ name, current: Math.round(v.current), previous: Math.round(v.previous) }));

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
    .sort((a, b) => b.avg - a.avg).slice(0, 5);

  // LTV:CAC ratio
  const ltvCacRatio = Math.min(Math.round(avgLtv / Math.max(25, 1) * 10) / 10, 10);

  // RFM segmentation
  const rfmCustomers = allCustomers.map(c => {
    const orders = c.orders?.nodes || [];
    const lastOrder = orders.length > 0 ? new Date(orders[0].createdAt) : null;
    const recencyDays = lastOrder ? Math.floor((now.getTime() - lastOrder.getTime()) / dayMs) : 999;
    const frequency = c.numberOfOrders || 0;
    const monetary = parseFloat(c.amountSpent?.amount || '0');
    return { id: c.id, recencyDays, frequency, monetary };
  });

  const getSegment = (c: { recencyDays: number; frequency: number; monetary: number }) => {
    if (c.recencyDays < 30 && c.frequency >= 4) return 'Champions';
    if (c.recencyDays < 60 && c.frequency >= 3) return 'Loyal';
    if (c.recencyDays < 30 && c.frequency >= 1) return 'Promising';
    if (c.recencyDays < 120 && c.frequency >= 2) return 'At-Risk';
    return 'Lost';
  };

  const segments: Record<string, number> = { Champions: 0, Loyal: 0, Promising: 0, 'At-Risk': 0, Lost: 0 };
  rfmCustomers.forEach(c => { segments[getSegment(c)]++; });
  const rfmTreemap = Object.entries(segments).map(([x, y]) => ({ x, y }));

  // RFM Migration Sankey - simulate previous vs current segment
  const sankeyFlows: Record<string, Record<string, number>> = {};
  const segNames = ['Champions', 'Loyal', 'Promising', 'At-Risk', 'Lost'];
  segNames.forEach(s => { sankeyFlows[s] = {}; segNames.forEach(t => { sankeyFlows[s][t] = 0; }); });
  rfmCustomers.forEach(c => {
    const current = getSegment(c);
    // Simulate previous segment by shifting recency back 30 days
    const prev = getSegment({ ...c, recencyDays: c.recencyDays + 30 });
    sankeyFlows[prev][current] = (sankeyFlows[prev][current] || 0) + 1;
  });
  const sankeyData = Object.entries(sankeyFlows).flatMap(([from, targets]) =>
    Object.entries(targets).filter(([, v]) => v > 0).map(([to, value]) => ({ from, to, value }))
  );

  // Customer lifecycle funnel
  const funnel = [
    { label: 'Prospect', count: totalCustomers, pct: 100 },
    { label: 'First Purchase', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 1).length, pct: 0 },
    { label: 'Repeat', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 2).length, pct: 0 },
    { label: 'Loyal', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 4).length, pct: 0 },
    { label: 'Champion', count: allCustomers.filter(c => (c.numberOfOrders || 0) >= 6).length, pct: 0 },
  ];
  funnel.forEach((f, i) => { f.pct = totalCustomers > 0 ? Math.round((f.count / totalCustomers) * 100) : 0; });

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

  // Churn prediction scatter (days since last order vs churn probability)
  const churnScatter = rfmCustomers.filter(c => c.frequency > 0).map(c => {
    // Simple churn probability model: higher recency = higher churn, lower frequency = higher churn
    const recencyScore = Math.min(c.recencyDays / 365, 1);
    const freqScore = 1 - Math.min(c.frequency / 10, 1);
    const churnProb = Math.round((recencyScore * 0.6 + freqScore * 0.4) * 100);
    return { x: c.recencyDays, y: churnProb };
  });

  // Revenue pareto
  const sortedLtv = [...ltvValues].sort((a, b) => b - a);
  const totalRev = sortedLtv.reduce((a, b) => a + b, 0);
  let cumRev = 0;
  const paretoData = sortedLtv.map((v, i) => {
    cumRev += v;
    return { pct: Math.round(((i + 1) / sortedLtv.length) * 100), cumPct: totalRev > 0 ? Math.round((cumRev / totalRev) * 100) : 0, rev: Math.round(v) };
  });
  const step = Math.max(1, Math.floor(paretoData.length / 50));
  const paretoSampled = paretoData.filter((_, i) => i % step === 0 || i === paretoData.length - 1);

  // Next purchase prediction scatter
  const nextPurchase = allCustomers.filter(c => (c.orders?.nodes || []).length >= 2).map(c => {
    const dates = (c.orders?.nodes || []).map((o: any) => new Date(o.createdAt).getTime()).sort((a: number, b: number) => a - b);
    const avgGap = dates.length > 1 ? (dates[dates.length - 1] - dates[0]) / (dates.length - 1) / dayMs : 0;
    const daysSince = Math.floor((now.getTime() - dates[dates.length - 1]) / dayMs);
    const predictedDays = Math.max(0, Math.round(avgGap - daysSince));
    return { x: daysSince, y: predictedDays };
  });

  // AI RFM insight
  const topSegment = Object.entries(segments).sort((a, b) => b[1] - a[1])[0];
  const aiInsight = `Your largest segment is "${topSegment[0]}" with ${topSegment[1]} customers (${totalCustomers > 0 ? Math.round((topSegment[1] / totalCustomers) * 100) : 0}%). ` +
    `Repeat rate is ${repeatRate}% with average LTV of $${avgLtv}. ` +
    `${churnRisk} customers are at churn risk (no orders 90+ days). ` +
    `${segments.Champions} champions drive most revenue — focus retention campaigns on the ${segments['At-Risk']} at-risk customers to recover revenue. ` +
    `Consider win-back emails for the ${segments.Lost} lost customers with personalized offers based on their purchase history.`;

  return json({
    totalCustomers, newThisMonth, repeatRate, avgLtv, churnRiskPct, repeatRiskPct,
    cohortRetention, cohortRevenue,
    ltvDist, ltvByChannel, ltvByProduct, ltvCacRatio,
    rfmTreemap, segments, sankeyData, funnel,
    repeatByMonth, gapHist, churnScatter,
    paretoSampled, nextPurchase, aiInsight,
  });
};

export default function CustomersPage() {
  const d = useLoaderData<typeof loader>();

  const segColors: Record<string, string> = { Champions: '#10b981', Loyal: '#6366f1', Promising: '#3b82f6', 'At-Risk': '#f97316', Lost: '#ef4444' };

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
          { label: 'Repeat Risk', val: d.repeatRiskPct + '%', color: '#f97316' },
          { label: 'Churn Risk', val: d.churnRiskPct + '%', color: '#ef4444' },
        ].map((k, i) => (
          <div key={i} style={S.kpi}>
            <div style={{ ...S.kpiVal, color: k.color }}>{k.val}</div>
            <div style={S.kpiLabel}>{k.label}</div>
          </div>
        ))}
      </div>

      {/* 9. AI RFM Insight */}
      <div style={S.aiCard}>
        <div style={S.aiTitle}>🤖 AI Customer Insight</div>
        <div style={S.aiText}>{d.aiInsight}</div>
        <button style={S.aiBtn} onClick={() => alert('Action panel coming soon — set up automated win-back campaigns, segment-targeted emails, and churn prevention flows.')}>
          🚀 Take Action
        </button>
      </div>

      {/* 1. Monthly Cohort Retention Grid (Mo 0-12) */}
      <div style={{ ...S.card, marginBottom: 20, overflowX: 'auto' }}>
        <div style={S.title}>📊 Monthly Cohort Retention Grid</div>
        <table style={S.cohortTable}>
          <thead>
            <tr>
              <th style={S.cohortTh}>Cohort</th>
              <th style={S.cohortTh}>Size</th>
              {Array.from({ length: 13 }, (_, i) => <th key={i} style={S.cohortTh}>Mo {i}</th>)}
            </tr>
          </thead>
          <tbody>
            {d.cohortRetention.map((c: any, i: number) => (
              <tr key={i}>
                <td style={{ ...S.cohortTd, textAlign: 'left', fontWeight: 600 }}>{c.cohort}</td>
                <td style={S.cohortTd}>{c.total}</td>
                {c.retention.map((r: number, j: number) => (
                  <td key={j} style={{ ...S.cohortTd, background: retentionColor(r), color: r >= 20 ? '#fff' : '#374151', fontWeight: 600 }}>
                    {r > 0 ? r + '%' : '—'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={S.grid2}>
        {/* 2. Cohort Revenue Retention */}
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

        {/* 3. LTV Distribution */}
        <div style={S.card}>
          <div style={S.title}>📈 LTV Distribution</div>
          <CC type="bar" height={280} series={[{ name: 'Customers', data: d.ltvDist.map((b: any) => b.count) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.ltvDist.map((b: any) => b.label) },
            colors: ['#6366f1'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
            dataLabels: { enabled: false },
          }} />
        </div>

        {/* 4. LTV by Channel */}
        <div style={S.card}>
          <div style={S.title}>📡 LTV by Channel</div>
          <CC type="bar" height={280} series={[
            { name: 'Current Period', data: d.ltvByChannel.map((c: any) => c.current) },
            { name: 'Previous Period', data: d.ltvByChannel.map((c: any) => c.previous) },
          ]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.ltvByChannel.map((c: any) => c.name) },
            colors: ['#6366f1', '#c7d2fe'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
            dataLabels: { enabled: false },
            yaxis: { labels: { formatter: (v: number) => '$' + v } },
          }} />
        </div>

        {/* 5. LTV by First Product */}
        <div style={S.card}>
          <div style={S.title}>🛍️ LTV by First Product</div>
          <CC type="bar" height={280} series={[{ name: 'Avg LTV', data: d.ltvByProduct.map((p: any) => p.avg) }]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, borderRadius: 4, barHeight: '65%' } },
            xaxis: { labels: { formatter: (v: number) => '$' + v } },
            yaxis: { categories: d.ltvByProduct.map((p: any) => p.name) },
            colors: ['#8b5cf6'],
            dataLabels: { enabled: false },
          }} />
        </div>

        {/* 6. LTV:CAC Ratio */}
        <div style={S.card}>
          <div style={S.title}>⚖️ LTV:CAC Ratio</div>
          <CC type="radialBar" height={280} series={[Math.min(d.ltvCacRatio * 10, 100)]} options={{
            plotOptions: { radialBar: { hollow: { size: '60%' }, dataLabels: { name: { show: true, fontSize: '14px' }, value: { show: true, fontSize: '28px', formatter: () => d.ltvCacRatio + 'x' } } } },
            labels: ['LTV:CAC'],
            colors: [d.ltvCacRatio >= 3 ? '#10b981' : d.ltvCacRatio >= 2 ? '#f59e0b' : '#ef4444'],
          }} />
        </div>

        {/* 7. RFM Segmentation Treemap */}
        <div style={S.card}>
          <div style={S.title}>🗺️ RFM Segmentation Treemap</div>
          <CC type="treemap" height={280} series={[{ data: d.rfmTreemap }]} options={{
            chart: { toolbar: { show: false } },
            colors: ['#10b981', '#6366f1', '#3b82f6', '#f97316', '#ef4444'],
            plotOptions: { treemap: { distributed: true } },
          }} />
        </div>
      </div>

      {/* 8. RFM Migration Sankey */}
      <div style={{ ...S.card, marginBottom: 20 }}>
        <div style={S.title}>🔄 RFM Migration Flow (Previous → Current)</div>
        <div style={S.sankeyContainer}>
          {/* Previous segments column */}
          <div style={S.sankeyCol}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textAlign: 'center' }}>PREVIOUS</div>
            {Object.keys(d.segments).map((seg: string) => {
              const total = (d.sankeyData as any[]).filter((f: any) => f.from === seg).reduce((s: number, f: any) => s + f.value, 0);
              return (
                <div key={seg} style={{ ...S.sankeyNode, background: segColors[seg] || '#6b7280', minHeight: Math.max(28, total * 0.3) }}>
                  {seg} ({total})
                </div>
              );
            })}
          </div>

          {/* Flow lines */}
          <div style={{ minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
            {(d.sankeyData as any[]).filter((f: any) => f.value > 0).slice(0, 15).map((f: any, i: number) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 2, fontSize: 9, color: '#9ca3af' }}>
                <div style={{ width: Math.max(20, Math.min(60, f.value * 0.8)), height: Math.max(2, Math.min(8, f.value * 0.15)), background: segColors[f.from] || '#6b7280', borderRadius: 2, opacity: 0.6 }} />
                <span>{f.value}</span>
              </div>
            ))}
          </div>

          {/* Current segments column */}
          <div style={S.sankeyCol}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', marginBottom: 4, textAlign: 'center' }}>CURRENT</div>
            {Object.keys(d.segments).map((seg: string) => {
              const total = (d.sankeyData as any[]).filter((f: any) => f.to === seg).reduce((s: number, f: any) => s + f.value, 0);
              return (
                <div key={seg} style={{ ...S.sankeyNode, background: segColors[seg] || '#6b7280', minHeight: Math.max(28, total * 0.3) }}>
                  {seg} ({total})
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={S.section}>LIFECYCLE & RETENTION</div>

      <div style={S.grid2}>
        {/* 10. Customer Lifecycle Funnel */}
        <div style={S.card}>
          <div style={S.title}>🔽 Customer Lifecycle Funnel</div>
          {d.funnel.map((f: any, i: number) => {
            const width = Math.max(30, f.pct);
            const colors = ['#6366f1', '#8b5cf6', '#a78bfa', '#c4b5fd', '#ddd6fe'];
            return (
              <div key={i} style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
                <div style={{ width: `${width}%`, background: colors[i], borderRadius: 6, padding: '8px 14px', color: '#fff', fontSize: 13, fontWeight: 600, textAlign: 'center', transition: 'width 0.3s' }}>
                  {f.label} — {f.count} ({f.pct}%)
                </div>
              </div>
            );
          })}
        </div>

        {/* 11. Repeat Purchase Rate */}
        <div style={S.card}>
          <div style={S.title}>🔁 Repeat Purchase Rate by Month</div>
          <CC type="bar" height={260} series={[{ name: 'Repeat %', data: d.repeatByMonth.map((m: any) => m.rate) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.repeatByMonth.map((m: any) => m.month) },
            colors: ['#10b981'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '55%' } },
            yaxis: { max: 100, labels: { formatter: (v: number) => v + '%' } },
            dataLabels: { enabled: false },
          }} />
        </div>

        {/* 12. Time Between Purchases */}
        <div style={S.card}>
          <div style={S.title}>⏱️ Time Between Purchases</div>
          <CC type="bar" height={260} series={[{ name: 'Customers', data: d.gapHist.map((g: any) => g.count) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.gapHist.map((g: any) => g.label) },
            colors: ['#f59e0b'],
            plotOptions: { bar: { borderRadius: 4, columnWidth: '60%' } },
            dataLabels: { enabled: false },
          }} />
        </div>

        {/* 13. Churn Prediction Scatter */}
        <div style={S.card}>
          <div style={S.title}>⚠️ Churn Prediction (Days Since Order vs Probability)</div>
          <CC type="scatter" height={280} series={[{ name: 'Customers', data: d.churnScatter.slice(0, 200) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { title: { text: 'Days Since Last Order' } },
            yaxis: { title: { text: 'Churn Probability %' }, max: 100 },
            colors: ['#ef4444'],
            markers: { size: 4, opacity: 0.6 },
          }} />
        </div>

        {/* 14. Revenue Pareto 80/20 */}
        <div style={S.card}>
          <div style={S.title}>📊 Revenue Pareto (80/20)</div>
          <CC type="line" height={280} series={[
            { name: 'Individual Revenue', data: d.paretoSampled.map((p: any) => p.rev), type: 'column' },
            { name: 'Cumulative %', data: d.paretoSampled.map((p: any) => p.cumPct), type: 'line' },
          ]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { categories: d.paretoSampled.map((p: any) => p.pct + '%'), title: { text: '% of Customers' } },
            yaxis: [
              { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + v } },
              { opposite: true, max: 100, title: { text: 'Cumulative %' }, labels: { formatter: (v: number) => v + '%' } },
            ],
            colors: ['#c7d2fe', '#6366f1'],
            stroke: { width: [0, 3], curve: 'smooth' },
            annotations: { yaxis: [{ y: 80, yAxisIndex: 1, borderColor: '#ef4444', strokeDashArray: 4, label: { text: '80% Revenue', style: { color: '#ef4444' } } }] },
            dataLabels: { enabled: false },
          }} />
        </div>

        {/* 15. Next Purchase Timeline */}
        <div style={S.card}>
          <div style={S.title}>🔮 Next Purchase Prediction</div>
          <CC type="scatter" height={280} series={[{ name: 'Customers', data: d.nextPurchase.slice(0, 200) }]} options={{
            chart: { toolbar: { show: false } },
            xaxis: { title: { text: 'Days Since Last Order' } },
            yaxis: { title: { text: 'Predicted Days to Next Order' } },
            colors: ['#8b5cf6'],
            markers: { size: 4, opacity: 0.6 },
          }} />
        </div>
      </div>

      {/* Footer */}
      <div style={{ textAlign: 'center', padding: '20px 0', fontSize: 13, color: '#9ca3af' }}>
        Customer Intelligence — powered by ShopifyPulse
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
        <a href="/app" style={{ color: '#6366f1', marginTop: 12, display: 'inline-block' }}>← Back to Dashboard</a>
      </div>
    </div>
  );
}
