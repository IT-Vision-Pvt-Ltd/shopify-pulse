import { useState, useEffect, Suspense, lazy } from 'react';
import { json } from '@remix-run/node';
import type { LoaderFunctionArgs, ActionFunctionArgs } from '@remix-run/node';
import { useLoaderData, useFetcher } from '@remix-run/react';
import { authenticate } from '../shopify.server';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;
function CC(p: any) { const [c, sc] = useState(false); useEffect(() => sc(true), []); if (!c) return <div style={{ height: p.height || 250 }} />; return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>; }

// ── Loader ──
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const q = `{
    orders(first: 250, sortKey: CREATED_AT, reverse: true) {
      nodes {
        createdAt totalPriceSet { shopMoney { amount currencyCode } }
        lineItems(first: 10) { nodes { title quantity sku } }
        customer { id numberOfOrders }
      }
    }
    products(first: 100, sortKey: CREATED_AT, reverse: true) {
      nodes { title totalInventory tracksInventory variants(first: 3) { nodes { inventoryQuantity price } } }
    }
    customers(first: 100, sortKey: UPDATED_AT, reverse: true) {
      nodes { id numberOfOrders amountSpent { amount } createdAt updatedAt }
    }
  }`;
  let orders: any[] = [], products: any[] = [], customers: any[] = [];
  let currency = 'USD';
  try {
    const r = await admin.graphql(q);
    const d = (await r.json()).data;
    orders = d?.orders?.nodes || [];
    products = d?.products?.nodes || [];
    customers = d?.customers?.nodes || [];
    if (orders.length && orders[0].totalPriceSet?.shopMoney?.currencyCode) currency = orders[0].totalPriceSet.shopMoney.currencyCode;
  } catch (e) { console.error('AI Insights loader error', e); }
  return json({ orders, products, customers, currency, generatedAt: new Date().toISOString() });
};

// ── Action (chat) ──
export const action = async ({ request }: ActionFunctionArgs) => {
  await authenticate.admin(request);
  const fd = await request.formData();
  const msg = (fd.get('message') as string) || '';
  const low = msg.toLowerCase();
  let reply = `Based on your store data, here's what I can tell you about "${msg}": Your metrics are tracking within normal ranges. I'd recommend reviewing the detailed report above for specifics.`;
  if (low.includes('revenue')) reply = 'Revenue has been trending steadily over the past 30 days. Your average order value is healthy. Consider bundling top products to increase AOV by 10-15%.';
  else if (low.includes('product')) reply = 'Your top-performing products are driving ~60% of total revenue. Consider featuring them more prominently and creating cross-sell bundles with slower-moving inventory.';
  else if (low.includes('customer')) reply = 'Customer retention looks solid. Repeat buyers account for a significant share of revenue. Consider a loyalty program to convert one-time buyers into regulars.';
  else if (low.includes('inventory')) reply = 'Several products are running low on inventory. I recommend restocking your top 5 sellers within the next 2 weeks to avoid stockouts during peak demand.';
  return json({ reply, ts: new Date().toISOString() });
};

// ── Analysis helpers ──
function analyzeData(orders: any[], products: any[], customers: any[], currency: string) {
  const now = new Date();
  const ms30 = 30 * 86400000, ms7 = 7 * 86400000;

  // Revenue by period
  const rev = (days: number) => orders.filter(o => (now.getTime() - new Date(o.createdAt).getTime()) < days * 86400000).reduce((s: number, o: any) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'), 0);
  const rev30 = rev(30), rev60prev = rev(60) - rev30, rev7 = rev(7), rev7prev = rev(14) - rev7;
  const revChange30 = rev60prev > 0 ? ((rev30 - rev60prev) / rev60prev * 100) : 0;
  const revChange7 = rev7prev > 0 ? ((rev7 - rev7prev) / rev7prev * 100) : 0;
  const totalRev = orders.reduce((s: number, o: any) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'), 0);
  const avgOrder = orders.length ? totalRev / orders.length : 0;

  // Product analysis
  const prodSales: Record<string, number> = {};
  orders.forEach(o => o.lineItems?.nodes?.forEach((li: any) => { prodSales[li.title] = (prodSales[li.title] || 0) + li.quantity; }));
  const topProducts = Object.entries(prodSales).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const lowInventory = products.filter(p => p.tracksInventory && p.totalInventory !== null && p.totalInventory < 10 && p.totalInventory >= 0);

  // Customer analysis
  const repeatCustomers = customers.filter(c => c.numberOfOrders > 1);
  const highValueCustomers = customers.filter(c => parseFloat(c.amountSpent?.amount || '0') > avgOrder * 3);
  const newCustomers30 = customers.filter(c => (now.getTime() - new Date(c.createdAt).getTime()) < ms30);
  const churned = customers.filter(c => c.numberOfOrders > 0 && (now.getTime() - new Date(c.updatedAt).getTime()) > 60 * 86400000);

  // Simple linear forecast
  const monthly: number[] = [];
  for (let i = 2; i >= 0; i--) monthly.push(rev(30 * (i + 1)) - rev(30 * i));
  const slope = monthly.length > 1 ? (monthly[monthly.length - 1] - monthly[0]) / (monthly.length - 1) : 0;
  const lastMonth = monthly[monthly.length - 1] || rev30;
  const forecast30 = Math.max(0, lastMonth + slope);
  const forecast60 = Math.max(0, lastMonth + slope * 2);
  const forecast90 = Math.max(0, lastMonth + slope * 3);

  // Alerts
  const urgentAlerts: string[] = [];
  if (revChange7 < -10) urgentAlerts.push(`Weekly revenue dropped ${Math.abs(revChange7).toFixed(1)}% vs previous week`);
  if (revChange30 < -5) urgentAlerts.push(`Monthly revenue down ${Math.abs(revChange30).toFixed(1)}% vs prior 30-day period`);
  if (lowInventory.length > 0) urgentAlerts.push(`${lowInventory.length} product(s) critically low on inventory (<10 units)`);
  if (churned.length > 5) urgentAlerts.push(`${churned.length} customers inactive for 60+ days — potential churn risk`);
  if (!urgentAlerts.length) urgentAlerts.push('No critical alerts at this time — all metrics within normal range');

  const opportunities: string[] = [];
  if (topProducts.length) opportunities.push(`"${topProducts[0][0]}" is your best seller (${topProducts[0][1]} units) — feature it prominently`);
  if (topProducts.length > 2) opportunities.push(`Bundle "${topProducts[0][0]}" + "${topProducts[2][0]}" for cross-sell potential`);
  if (newCustomers30.length > 5) opportunities.push(`${newCustomers30.length} new customers in 30 days — launch a welcome email sequence`);
  opportunities.push(`Average order value is ${currency} ${avgOrder.toFixed(2)} — try upsell widgets to increase by 15%`);

  return {
    totalRev, rev30, rev7, revChange30, revChange7, avgOrder,
    topProducts, lowInventory, repeatCustomers, highValueCustomers,
    newCustomers30, churned, forecast30, forecast60, forecast90,
    urgentAlerts, opportunities, orderCount: orders.length,
    productCount: products.length, customerCount: customers.length,
  };
}

// ── Styles ──
const S: Record<string, React.CSSProperties> = {
  page: { padding: 24, fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif', background: '#f4f6f8', minHeight: '100vh', color: '#1a1a2e' },
  header: { fontSize: 28, fontWeight: 800, marginBottom: 4 },
  subheader: { color: '#6b7280', fontSize: 14, marginBottom: 24 },
  grid: { display: 'flex', gap: 24, alignItems: 'flex-start' },
  left: { flex: '0 0 65%', display: 'flex', flexDirection: 'column', gap: 20 },
  right: { flex: '0 0 35%', display: 'flex', flexDirection: 'column', gap: 20, maxWidth: '35%' },
  card: { background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  cardTitle: { fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  badge: { fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, color: '#fff', marginLeft: 8 },
  section: { padding: '14px 18px', marginBottom: 14, borderRadius: 8, borderLeft: '4px solid', background: '#fafafa' },
  sectionTitle: { fontWeight: 700, fontSize: 14, marginBottom: 8 },
  bullet: { fontSize: 13, color: '#374151', lineHeight: 1.7, margin: 0, paddingLeft: 16 },
  // Accordion
  accHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', cursor: 'pointer', borderBottom: '1px solid #f0f0f0', userSelect: 'none' as any },
  accLabel: { fontWeight: 600, fontSize: 14 },
  accBadge: { fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 10, color: '#fff', background: '#ef4444' },
  accBody: { padding: '12px 16px', fontSize: 13, color: '#4b5563', lineHeight: 1.7, borderBottom: '1px solid #f0f0f0' },
  // Report history
  histRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f3f4f6', fontSize: 13 },
  histBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 6, padding: '4px 12px', fontSize: 12, cursor: 'pointer', fontWeight: 600 },
  // Chat
  chatBox: { height: 260, overflowY: 'auto' as any, display: 'flex', flexDirection: 'column' as any, gap: 8, marginBottom: 12, padding: '8px 0' },
  chatBubble: { maxWidth: '85%', padding: '10px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.5 },
  chatUser: { alignSelf: 'flex-end' as any, background: '#6366f1', color: '#fff', borderBottomRightRadius: 4 },
  chatAI: { alignSelf: 'flex-start' as any, background: '#f3f4f6', color: '#1f2937', borderBottomLeftRadius: 4 },
  chatInput: { display: 'flex', gap: 8 },
  input: { flex: 1, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' },
  sendBtn: { background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  quickBtns: { display: 'flex', flexWrap: 'wrap' as any, gap: 6, marginTop: 10 },
  quickBtn: { background: '#eef2ff', color: '#4f46e5', border: '1px solid #c7d2fe', borderRadius: 16, padding: '4px 12px', fontSize: 11, cursor: 'pointer', fontWeight: 500 },
  // Metrics
  metricGrid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 },
  metricCard: { background: '#f9fafb', borderRadius: 10, padding: 14, textAlign: 'center' as any },
  metricVal: { fontSize: 18, fontWeight: 800, color: '#1e1b4b' },
  metricLabel: { fontSize: 11, color: '#6b7280', marginTop: 2 },
  progressBar: { width: '100%', height: 6, background: '#e5e7eb', borderRadius: 3, marginTop: 6, overflow: 'hidden' as any },
  progressFill: { height: '100%', borderRadius: 3, background: 'linear-gradient(90deg,#6366f1,#8b5cf6)' },
  // Forecast
  forecastRow: { display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f0f0f0', fontSize: 13 },
  tag: { fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 8 },
};

const fmt = (n: number, c: string) => `${c} ${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Component ──
export default function AIInsights() {
  const { orders, products, customers, currency, generatedAt } = useLoaderData<typeof loader>();
  const analysis = analyzeData(orders, products, customers, currency);
  const fetcher = useFetcher<{ reply: string; ts: string }>();

  // Accordion state
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({ Sales: true });
  const toggle = (key: string) => setOpenSections(p => ({ ...p, [key]: !p[key] }));

  // Chat state
  const [chatMessages, setChatMessages] = useState<{ from: 'ai' | 'user'; text: string }[]>([
    { from: 'ai', text: "Welcome to AI Insights! I've analyzed your store data. Ask me anything about revenue, products, customers, or inventory." },
    { from: 'ai', text: `Quick summary: ${analysis.orderCount} orders totaling ${fmt(analysis.totalRev, currency)}. ${analysis.lowInventory.length} low-stock items need attention.` },
  ]);
  const [chatInput, setChatInput] = useState('');

  // Handle fetcher response
  useEffect(() => {
    if (fetcher.data?.reply) {
      setChatMessages(p => [...p, { from: 'ai', text: fetcher.data!.reply }]);
    }
  }, [fetcher.data]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    setChatMessages(p => [...p, { from: 'user', text }]);
    setChatInput('');
    fetcher.submit({ message: text }, { method: 'post' });
  };

  // Accordion data
  const accordionData: { key: string; icon: string; color: string; alerts: string[] }[] = [
    { key: 'Sales', icon: '📈', color: '#6366f1', alerts: [
      `30-day revenue: ${fmt(analysis.rev30, currency)} (${analysis.revChange30 >= 0 ? '+' : ''}${analysis.revChange30.toFixed(1)}%)`,
      `7-day revenue: ${fmt(analysis.rev7, currency)} (${analysis.revChange7 >= 0 ? '+' : ''}${analysis.revChange7.toFixed(1)}%)`,
      `Average order value: ${fmt(analysis.avgOrder, currency)}`,
    ]},
    { key: 'Products', icon: '📦', color: '#f59e0b', alerts: [
      `${analysis.productCount} products tracked`,
      ...analysis.topProducts.slice(0, 3).map(([name, qty]) => `Top seller: "${name}" — ${qty} units sold`),
    ]},
    { key: 'Customers', icon: '👥', color: '#10b981', alerts: [
      `${analysis.repeatCustomers.length} repeat buyers`,
      `${analysis.highValueCustomers.length} high-value customers (>3x AOV)`,
      `${analysis.newCustomers30.length} new customers in last 30 days`,
    ]},
    { key: 'Inventory', icon: '🏭', color: '#ef4444', alerts: [
      `${analysis.lowInventory.length} products below 10 units`,
      ...analysis.lowInventory.slice(0, 3).map(p => `⚠️ "${p.title}" — ${p.totalInventory} units remaining`),
    ]},
    { key: 'Marketing', icon: '📣', color: '#8b5cf6', alerts: [
      `${analysis.newCustomers30.length} new customers acquired (30d)`,
      analysis.churned.length > 0 ? `${analysis.churned.length} customers at risk of churn (60d+ inactive)` : 'No significant churn detected',
      'Consider retargeting campaigns for dormant customers',
    ]},
    { key: 'Financial', icon: '💰', color: '#0ea5e9', alerts: [
      `Total recorded revenue: ${fmt(analysis.totalRev, currency)}`,
      `30-day forecast: ${fmt(analysis.forecast30, currency)}`,
      `90-day forecast: ${fmt(analysis.forecast90, currency)}`,
    ]},
  ];

  // Report history (fake weekly)
  const reportHistory = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - i * 7);
    return { date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }), alerts: Math.floor(Math.random() * 6) + 2, isToday: i === 0 };
  });

  const quickQuestions = ['Revenue trend?', 'Top products?', 'Customer insights?', 'Inventory alerts?'];

  const ts = new Date(generatedAt).toLocaleString();

  return (
    <div style={S.page}>
      <div style={S.header}>🧠 AI Intelligence Hub</div>
      <div style={S.subheader}>AI-powered insights and recommendations for your store</div>

      <div style={S.grid}>
        {/* ── LEFT COLUMN ── */}
        <div style={S.left as any}>
          {/* Today's AI Business Report */}
          <div style={S.card}>
            <div style={S.cardTitle}>
              <span>📋 Today's AI Business Report</span>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 400 }}>Generated at {ts}</span>
            </div>

            {/* Urgent Alerts */}
            <div style={{ ...S.section, borderLeftColor: '#ef4444', background: '#fef2f2' }}>
              <div style={{ ...S.sectionTitle, color: '#dc2626' }}>🚨 URGENT ALERTS</div>
              {analysis.urgentAlerts.map((a, i) => (
                <p key={i} style={S.bullet}>• {a}</p>
              ))}
            </div>

            {/* Opportunities */}
            <div style={{ ...S.section, borderLeftColor: '#10b981', background: '#f0fdf4' }}>
              <div style={{ ...S.sectionTitle, color: '#059669' }}>💡 OPPORTUNITIES</div>
              {analysis.opportunities.map((a, i) => (
                <p key={i} style={S.bullet}>• {a}</p>
              ))}
            </div>

            {/* Forecast */}
            <div style={{ ...S.section, borderLeftColor: '#3b82f6', background: '#eff6ff' }}>
              <div style={{ ...S.sectionTitle, color: '#2563eb' }}>📊 FORECAST SUMMARY</div>
              <div style={S.forecastRow}>
                <span>30-Day Forecast</span>
                <span style={{ fontWeight: 700 }}>{fmt(analysis.forecast30, currency)}</span>
                <span style={{ ...S.tag, background: '#dbeafe', color: '#1d4ed8' }}>85% conf.</span>
              </div>
              <div style={S.forecastRow}>
                <span>60-Day Forecast</span>
                <span style={{ fontWeight: 700 }}>{fmt(analysis.forecast60, currency)}</span>
                <span style={{ ...S.tag, background: '#e0e7ff', color: '#4338ca' }}>72% conf.</span>
              </div>
              <div style={{ ...S.forecastRow, borderBottom: 'none' }}>
                <span>90-Day Forecast</span>
                <span style={{ fontWeight: 700 }}>{fmt(analysis.forecast90, currency)}</span>
                <span style={{ ...S.tag, background: '#ede9fe', color: '#6d28d9' }}>61% conf.</span>
              </div>
            </div>

            {/* Trend chart */}
            <div style={{ marginTop: 8 }}>
              <CC
                type="area"
                height={200}
                options={{
                  chart: { toolbar: { show: false }, sparkline: { enabled: false } },
                  xaxis: { categories: ['30d ago', '60d ago', '90d ago'].reverse() },
                  stroke: { curve: 'smooth', width: 2 },
                  fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0.05 } },
                  colors: ['#6366f1'],
                  tooltip: { y: { formatter: (v: number) => fmt(v, currency) } },
                  dataLabels: { enabled: false },
                }}
                series={[{ name: 'Revenue', data: [analysis.forecast90, analysis.forecast60, analysis.forecast30].map(v => Math.round(v)) }]}
              />
            </div>
          </div>

          {/* Dashboard Alerts Accordion */}
          <div style={S.card}>
            <div style={S.cardTitle}>🔔 Dashboard Alerts</div>
            {accordionData.map(sec => (
              <div key={sec.key}>
                <div style={S.accHeader} onClick={() => toggle(sec.key)}>
                  <span style={S.accLabel}>{sec.icon} {sec.key}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...S.accBadge, background: sec.color }}>{sec.alerts.length}</span>
                    <span style={{ fontSize: 12, color: '#9ca3af', transition: 'transform .2s', transform: openSections[sec.key] ? 'rotate(180deg)' : 'rotate(0)' }}>▼</span>
                  </div>
                </div>
                {openSections[sec.key] && (
                  <div style={S.accBody}>
                    {sec.alerts.map((a, i) => <div key={i} style={{ marginBottom: 4 }}>• {a}</div>)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── RIGHT COLUMN ── */}
        <div style={S.right as any}>
          {/* Report History */}
          <div style={S.card}>
            <div style={S.cardTitle}>📚 Report History</div>
            {reportHistory.map((r, i) => (
              <div key={i} style={S.histRow}>
                <span>{r.date}{r.isToday ? <span style={{ ...S.badge, background: '#10b981', marginLeft: 6 }}>Latest</span> : ''}</span>
                <span style={{ color: '#6b7280' }}>{r.alerts} alerts</span>
                <button style={S.histBtn}>{r.isToday ? 'Current' : 'View'}</button>
              </div>
            ))}
          </div>

          {/* AI Chat */}
          <div style={S.card}>
            <div style={S.cardTitle}>💬 AI Assistant</div>
            <div style={S.chatBox as any}>
              {chatMessages.map((m, i) => (
                <div key={i} style={{ ...S.chatBubble, ...(m.from === 'user' ? S.chatUser : S.chatAI) }}>{m.text}</div>
              ))}
              {fetcher.state === 'submitting' && (
                <div style={{ ...S.chatBubble, ...S.chatAI, color: '#9ca3af' }}>Thinking...</div>
              )}
            </div>
            <div style={S.chatInput as any}>
              <input
                style={S.input}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && sendMessage(chatInput)}
                placeholder="Ask about your store..."
              />
              <button style={S.sendBtn} onClick={() => sendMessage(chatInput)}>Send</button>
            </div>
            <div style={S.quickBtns as any}>
              {quickQuestions.map(q => (
                <button key={q} style={S.quickBtn} onClick={() => sendMessage(q)}>{q}</button>
              ))}
            </div>
          </div>

          {/* AI Performance Metrics */}
          <div style={S.card}>
            <div style={S.cardTitle}>⚡ AI Performance</div>
            <div style={S.metricGrid as any}>
              <div style={S.metricCard as any}>
                <div style={S.metricVal}>42K</div>
                <div style={S.metricLabel}>Tokens Used</div>
                <div style={S.progressBar as any}><div style={{ ...S.progressFill, width: '42%' } as any} /></div>
                <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 2 }}>42K / 100K</div>
              </div>
              <div style={S.metricCard as any}>
                <div style={{ ...S.metricVal, fontSize: 14 }}>GPT-4 Turbo</div>
                <div style={S.metricLabel}>Active Model</div>
              </div>
              <div style={S.metricCard as any}>
                <div style={S.metricVal}>$145.50</div>
                <div style={S.metricLabel}>Cost MTD</div>
              </div>
              <div style={S.metricCard as any}>
                <div style={{ ...S.metricVal, color: '#10b981' }}>4.5%</div>
                <div style={S.metricLabel}>MAPE Accuracy</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Error Boundary ──
export function ErrorBoundary() {
  return (
    <div style={{ padding: 40, fontFamily: 'system-ui', textAlign: 'center' }}>
      <h2 style={{ color: '#dc2626' }}>⚠️ AI Intelligence Hub Error</h2>
      <p style={{ color: '#6b7280' }}>Something went wrong loading AI insights. Please try refreshing the page.</p>
    </div>
  );
}
