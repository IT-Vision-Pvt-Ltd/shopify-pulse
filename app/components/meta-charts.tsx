import { useState, useEffect, Suspense, lazy } from 'react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

const S: Record<string, React.CSSProperties> = {
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 20 },
  cardTitle: { fontSize: 14, fontWeight: 600, marginBottom: 12, color: '#1f2937' },
  insight: { fontSize: 13, color: '#6b7280', marginTop: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, borderLeft: '3px solid #7c3aed', lineHeight: 1.5 },
  notConnected: { textAlign: 'center' as const, padding: '40px 20px', color: '#9ca3af', fontSize: 14 },
  notConnectedIcon: { fontSize: 40, marginBottom: 12 },
  table: { width: '100%', borderCollapse: 'collapse' as const, fontSize: 13 },
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '2px solid #e5e7eb', fontWeight: 600, color: '#374151', fontSize: 12, textTransform: 'uppercase' as const },
  td: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6' },
  tdRight: { padding: '10px 12px', borderBottom: '1px solid #f3f4f6', textAlign: 'right' as const },
  creativeCard: { background: '#f9fafb', borderRadius: 10, padding: 16, display: 'flex', gap: 14, alignItems: 'center', marginBottom: 10 },
  thumbnail: { width: 60, height: 60, borderRadius: 8, background: '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#9ca3af', flexShrink: 0 },
  badge: { display: 'inline-block', padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 600 },
  warning: { fontSize: 13, color: '#b45309', marginTop: 12, padding: '10px 14px', background: '#fffbeb', borderRadius: 8, borderLeft: '3px solid #f59e0b', lineHeight: 1.5 },
  funnelStage: { textAlign: 'center' as const, flex: 1, padding: '16px 8px' },
  funnelBar: { margin: '0 auto', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 14, transition: 'all 0.3s' },
  dropoff: { fontSize: 11, color: '#ef4444', fontWeight: 600, marginTop: 4 },
};

const NOT_CONNECTED_MSG = 'Connect Meta Business Manager to unlock this insight';

function NotConnected() {
  return (
    <div style={S.notConnected}>
      <div style={S.notConnectedIcon}>🔗</div>
      <div style={{ fontWeight: 600, marginBottom: 4 }}>{NOT_CONNECTED_MSG}</div>
      <div style={{ fontSize: 12 }}>Real ad spend, ROAS, and audience data from Facebook & Instagram</div>
    </div>
  );
}

// ========== 1. MetaAdSpendVsRevenue ==========
export interface MetaAdSpendVsRevenueData {
  months: string[];
  adSpend: number[];
  revenue: number[];
}

export function MetaAdSpendVsRevenue({ data }: { data: MetaAdSpendVsRevenueData | null }) {
  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Ad Spend vs Revenue</h3><NotConnected /></div>;
  const totalSpend = data.adSpend.reduce((a, b) => a + b, 0);
  const totalRev = data.revenue.reduce((a, b) => a + b, 0);
  const roas = totalSpend > 0 ? (totalRev / totalSpend).toFixed(2) : '0';
  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Ad Spend vs Revenue</h3>
      <CC type="line" height={300} series={[
        { name: 'Ad Spend', type: 'column', data: data.adSpend },
        { name: 'Revenue', type: 'line', data: data.revenue },
      ]} options={{
        chart: { type: 'line', toolbar: { show: false } },
        xaxis: { categories: data.months },
        colors: ['#ef4444', '#10b981'],
        stroke: { width: [0, 3], curve: 'smooth' },
        yaxis: [
          { title: { text: 'Ad Spend ($)' } },
          { opposite: true, title: { text: 'Revenue ($)' } },
        ],
        dataLabels: { enabled: false },
        annotations: { yaxis: [{ y: 0, borderColor: '#7c3aed', label: { text: `ROAS: ${roas}x` } }] },
      }} />
      <div style={S.insight}>
        💡 For every $1 spent on Meta ads, you earned <strong>${roas}</strong> back.
        {parseFloat(roas) < 2 && ' Consider optimizing your targeting or creatives to improve ROAS.'}
        {parseFloat(roas) >= 3 && ' Great performance! Consider scaling your top campaigns.'}
      </div>
    </div>
  );
}

// ========== 2. MetaCampaignPerformance ==========
export interface MetaCampaignData {
  name: string;
  status: 'Active' | 'Paused' | 'Completed';
  spend: number;
  revenue: number;
  roas: number;
  cpc: number;
  cpm: number;
  conversions: number;
}

export function MetaCampaignPerformance({ data }: { data: MetaCampaignData[] | null }) {
  const [sortKey, setSortKey] = useState<keyof MetaCampaignData>('roas');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Campaign Performance</h3><NotConnected /></div>;

  const sorted = [...data].sort((a, b) => {
    const av = a[sortKey], bv = b[sortKey];
    if (typeof av === 'number' && typeof bv === 'number') return sortDir === 'desc' ? bv - av : av - bv;
    return sortDir === 'desc' ? String(bv).localeCompare(String(av)) : String(av).localeCompare(String(bv));
  });

  const best = sorted[0];
  const roasColor = (r: number) => r >= 3 ? '#059669' : r >= 1 ? '#b45309' : '#dc2626';
  const roasBg = (r: number) => r >= 3 ? '#d1fae5' : r >= 1 ? '#fef3c7' : '#fee2e2';
  const handleSort = (key: keyof MetaCampaignData) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };
  const sortIcon = (key: string) => sortKey === key ? (sortDir === 'desc' ? ' ▼' : ' ▲') : '';
  const fmt = (n: number) => n >= 1000 ? `$${(n / 1000).toFixed(1)}K` : `$${n.toFixed(0)}`;

  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Campaign Performance</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, cursor: 'pointer' }} onClick={() => handleSort('name')}>Campaign{sortIcon('name')}</th>
              <th style={{ ...S.th, cursor: 'pointer' }} onClick={() => handleSort('status')}>Status{sortIcon('status')}</th>
              <th style={{ ...S.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('spend')}>Spend{sortIcon('spend')}</th>
              <th style={{ ...S.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('revenue')}>Revenue{sortIcon('revenue')}</th>
              <th style={{ ...S.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('roas')}>ROAS{sortIcon('roas')}</th>
              <th style={{ ...S.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('cpc')}>CPC{sortIcon('cpc')}</th>
              <th style={{ ...S.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('cpm')}>CPM{sortIcon('cpm')}</th>
              <th style={{ ...S.th, textAlign: 'right', cursor: 'pointer' }} onClick={() => handleSort('conversions')}>Conv.{sortIcon('conversions')}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => (
              <tr key={i}>
                <td style={S.td}><strong>{c.name}</strong></td>
                <td style={S.td}>
                  <span style={{ ...S.badge, background: c.status === 'Active' ? '#d1fae5' : c.status === 'Paused' ? '#fef3c7' : '#e5e7eb', color: c.status === 'Active' ? '#065f46' : c.status === 'Paused' ? '#92400e' : '#374151' }}>
                    {c.status}
                  </span>
                </td>
                <td style={S.tdRight}>{fmt(c.spend)}</td>
                <td style={S.tdRight}>{fmt(c.revenue)}</td>
                <td style={S.tdRight}>
                  <span style={{ ...S.badge, background: roasBg(c.roas), color: roasColor(c.roas) }}>{c.roas.toFixed(2)}x</span>
                </td>
                <td style={S.tdRight}>${c.cpc.toFixed(2)}</td>
                <td style={S.tdRight}>${c.cpm.toFixed(2)}</td>
                <td style={S.tdRight}>{c.conversions}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={S.insight}>
        💡 Your best campaign is <strong>{best.name}</strong> with <strong>{best.roas.toFixed(2)}x ROAS</strong> and {best.conversions} conversions.
        {sorted.filter(c => c.roas < 1).length > 0 && ` ⚠️ ${sorted.filter(c => c.roas < 1).length} campaign(s) are losing money — consider pausing or restructuring.`}
      </div>
    </div>
  );
}

// ========== 3. MetaAudienceDemographics ==========
export interface MetaAudienceDemographicsData {
  ageGroups: string[];
  ageRevenue: number[];
  ageSpend: number[];
  genderLabels: string[];
  genderRevenue: number[];
}

export function MetaAudienceDemographics({ data }: { data: MetaAudienceDemographicsData | null }) {
  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Audience Demographics</h3><NotConnected /></div>;
  const bestAgeIdx = data.ageRevenue.indexOf(Math.max(...data.ageRevenue));
  const bestGenderIdx = data.genderRevenue.indexOf(Math.max(...data.genderRevenue));
  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Audience Demographics</h3>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Age Distribution (Revenue)</div>
          <CC type="bar" height={250} series={[
            { name: 'Revenue', data: data.ageRevenue },
            { name: 'Spend', data: data.ageSpend },
          ]} options={{
            chart: { type: 'bar', toolbar: { show: false } },
            xaxis: { categories: data.ageGroups },
            colors: ['#7c3aed', '#e5e7eb'],
            plotOptions: { bar: { borderRadius: 4 } },
            dataLabels: { enabled: false },
          }} />
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 8 }}>Gender Split (Revenue)</div>
          <CC type="donut" height={250} series={data.genderRevenue} options={{
            chart: { type: 'donut' },
            labels: data.genderLabels,
            colors: ['#3b82f6', '#ec4899', '#9ca3af'],
            legend: { position: 'bottom' },
            plotOptions: { pie: { donut: { size: '55%' } } },
          }} />
        </div>
      </div>
      <div style={S.insight}>
        💡 Your highest-value audience is <strong>{data.ageGroups[bestAgeIdx]}</strong> ({data.genderLabels[bestGenderIdx]}).
        Focus your best creatives on this segment for maximum ROAS.
      </div>
    </div>
  );
}

// ========== 4. MetaCreativePerformance ==========
export interface MetaCreativeData {
  headline: string;
  ctr: number;
  cpc: number;
  conversions: number;
  roas: number;
  spend: number;
}

export function MetaCreativePerformance({ data }: { data: MetaCreativeData[] | null }) {
  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Creative Performance</h3><NotConnected /></div>;
  const sorted = [...data].sort((a, b) => b.roas - a.roas).slice(0, 5);
  const totalConv = data.reduce((s, c) => s + c.conversions, 0);
  const topConvPct = totalConv > 0 ? ((sorted[0].conversions / totalConv) * 100).toFixed(1) : '0';
  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Top 5 Ad Creatives (by ROAS)</h3>
      {sorted.map((c, i) => (
        <div key={i} style={S.creativeCard}>
          <div style={S.thumbnail}>🖼️</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 4 }}>#{i + 1} {c.headline}</div>
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280' }}>
              <span>CTR: <strong>{c.ctr.toFixed(2)}%</strong></span>
              <span>CPC: <strong>${c.cpc.toFixed(2)}</strong></span>
              <span>Conv: <strong>{c.conversions}</strong></span>
              <span>ROAS: <span style={{ color: c.roas >= 3 ? '#059669' : c.roas >= 1 ? '#b45309' : '#dc2626', fontWeight: 700 }}>{c.roas.toFixed(2)}x</span></span>
            </div>
          </div>
        </div>
      ))}
      <div style={S.insight}>
        💡 Your top creative generates <strong>{topConvPct}%</strong> of all conversions. Test variations of "{sorted[0].headline}" to scale what's working.
      </div>
    </div>
  );
}

// ========== 5. MetaFrequencyReach ==========
export interface MetaFrequencyReachData {
  dates: string[];
  frequency: number[];
  reach: number[];
}

export function MetaFrequencyReach({ data }: { data: MetaFrequencyReachData | null }) {
  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Frequency & Reach</h3><NotConnected /></div>;
  const maxFreq = Math.max(...data.frequency);
  const highFreqWarning = maxFreq > 3;
  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Frequency & Reach</h3>
      <CC type="line" height={300} series={[
        { name: 'Reach', type: 'column', data: data.reach },
        { name: 'Frequency', type: 'line', data: data.frequency },
      ]} options={{
        chart: { type: 'line', toolbar: { show: false } },
        xaxis: { categories: data.dates },
        colors: ['#3b82f6', '#ef4444'],
        stroke: { width: [0, 3], curve: 'smooth' },
        yaxis: [
          { title: { text: 'Reach' } },
          { opposite: true, title: { text: 'Frequency' }, max: Math.max(maxFreq + 1, 5) },
        ],
        annotations: { yaxis: [{ y: 3, yAxisIndex: 1, borderColor: '#f59e0b', label: { text: 'Frequency Limit (3x)', style: { background: '#fef3c7', color: '#92400e' } } }] },
        dataLabels: { enabled: false },
      }} />
      {highFreqWarning ? (
        <div style={S.warning}>
          ⚠️ Your audience is seeing ads too often (frequency hit <strong>{maxFreq.toFixed(1)}x</strong>) — consider refreshing creatives or expanding your audience.
        </div>
      ) : (
        <div style={S.insight}>
          💡 Frequency is healthy at <strong>{maxFreq.toFixed(1)}x</strong>. Your audience isn't fatigued yet.
        </div>
      )}
    </div>
  );
}

// ========== 6. MetaCostTrend ==========
export interface MetaCostTrendData {
  dates: string[];
  cpa: number[];
  cpm: number[];
  cpc: number[];
}

export function MetaCostTrend({ data }: { data: MetaCostTrendData | null }) {
  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Cost Trends (30 Days)</h3><NotConnected /></div>;

  // 7-day moving average
  const ma7 = (arr: number[]) => arr.map((_, i) => {
    const start = Math.max(0, i - 6);
    const slice = arr.slice(start, i + 1);
    return +(slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2);
  });

  const cpaMa = ma7(data.cpa);
  const cpmMa = ma7(data.cpm);
  const cpcMa = ma7(data.cpc);

  const trend = (arr: number[]) => arr.length >= 2 ? (arr[arr.length - 1] > arr[Math.max(0, arr.length - 8)] ? 'increasing' : 'decreasing') : 'stable';
  const cpaTrend = trend(cpaMa);
  const cpmTrend = trend(cpmMa);
  const cpcTrend = trend(cpcMa);

  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Cost Trends — 7-Day Moving Average</h3>
      <CC type="line" height={300} series={[
        { name: 'CPA', data: cpaMa },
        { name: 'CPM', data: cpmMa },
        { name: 'CPC', data: cpcMa },
      ]} options={{
        chart: { type: 'line', toolbar: { show: false } },
        xaxis: { categories: data.dates, labels: { show: false } },
        colors: [
          cpaTrend === 'increasing' ? '#ef4444' : '#10b981',
          cpmTrend === 'increasing' ? '#ef4444' : '#10b981',
          cpcTrend === 'increasing' ? '#ef4444' : '#10b981',
        ],
        stroke: { curve: 'smooth', width: 2.5 },
        dataLabels: { enabled: false },
        legend: { position: 'top' },
      }} />
      <div style={S.insight}>
        💡 CPA is <strong style={{ color: cpaTrend === 'increasing' ? '#dc2626' : '#059669' }}>{cpaTrend}</strong>,
        CPM is <strong style={{ color: cpmTrend === 'increasing' ? '#dc2626' : '#059669' }}>{cpmTrend}</strong>,
        CPC is <strong style={{ color: cpcTrend === 'increasing' ? '#dc2626' : '#059669' }}>{cpcTrend}</strong>.
        {cpaTrend === 'increasing' && ' Rising costs may indicate audience fatigue — try new creatives or audiences.'}
        {cpaTrend === 'decreasing' && ' Costs are trending down — your optimization is working!'}
      </div>
    </div>
  );
}

// ========== 7. MetaAdFunnel ==========
export interface MetaAdFunnelData {
  impressions: number;
  linkClicks: number;
  addToCart: number;
  purchases: number;
}

export function MetaAdFunnel({ data }: { data: MetaAdFunnelData | null }) {
  if (!data) return <div style={S.card}><h3 style={S.cardTitle}>Ad Funnel</h3><NotConnected /></div>;

  const stages = [
    { label: 'Impressions', value: data.impressions, color: '#3b82f6' },
    { label: 'Link Clicks', value: data.linkClicks, color: '#7c3aed' },
    { label: 'Add to Cart', value: data.addToCart, color: '#f59e0b' },
    { label: 'Purchase', value: data.purchases, color: '#10b981' },
  ];

  const maxVal = stages[0].value || 1;
  const dropoffs: string[] = [];
  for (let i = 1; i < stages.length; i++) {
    const prev = stages[i - 1].value || 1;
    const drop = ((1 - stages[i].value / prev) * 100).toFixed(1);
    dropoffs.push(drop);
  }

  const clickToCartDrop = data.linkClicks > 0 ? ((1 - data.addToCart / data.linkClicks) * 100).toFixed(0) : '0';

  return (
    <div style={S.card}>
      <h3 style={S.cardTitle}>Ad Funnel: Impressions → Purchase</h3>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 8, padding: '20px 0' }}>
        {stages.map((stage, i) => {
          const widthPct = Math.max(20, (stage.value / maxVal) * 100);
          return (
            <div key={i} style={{ ...S.funnelStage }}>
              <div style={{ ...S.funnelBar, width: `${widthPct}%`, height: 50, background: stage.color, minWidth: 60 }}>
                {stage.value >= 1000000 ? `${(stage.value / 1000000).toFixed(1)}M` : stage.value >= 1000 ? `${(stage.value / 1000).toFixed(1)}K` : stage.value}
              </div>
              <div style={{ fontWeight: 600, fontSize: 13, marginTop: 8 }}>{stage.label}</div>
              {i > 0 && <div style={S.dropoff}>↓ {dropoffs[i - 1]}% drop</div>}
            </div>
          );
        })}
      </div>
      <div style={S.insight}>
        💡 You lose <strong>{clickToCartDrop}%</strong> of people between click and add-to-cart — check your landing page speed, offer clarity, and mobile experience.
        {data.purchases > 0 && ` Overall conversion: ${((data.purchases / (data.impressions || 1)) * 100).toFixed(3)}% from impression to purchase.`}
      </div>
    </div>
  );
}
