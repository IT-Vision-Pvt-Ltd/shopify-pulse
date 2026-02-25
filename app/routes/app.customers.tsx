import { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { Users, UserPlus, Repeat, DollarSign, AlertTriangle, TrendingUp, BarChart3, Heart } from 'lucide-react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`{
    customers(first: 100, sortKey: UPDATED_AT, reverse: true) {
      edges { node {
        id displayName email
        numberOfOrders
        amountSpent { amount currencyCode }
        createdAt updatedAt
        orders(first: 10) { edges { node {
          createdAt
          totalPriceSet { shopMoney { amount } }
        }}}
      }}
    }
    customersCount { count }
    orders(first: 250, query: "created_at:>2025-01-01", sortKey: CREATED_AT) {
      edges { node {
        createdAt
        customer { id numberOfOrders }
        totalPriceSet { shopMoney { amount } }
      }}
    }
  }`);

  const data = await response.json();
  const customers = data.data.customers.edges.map((e: any) => e.node);
  const totalCustomersCount = data.data.customersCount?.count || customers.length;
  const orders = data.data.orders.edges.map((e: any) => e.node);

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000);

  // Basic metrics
  const newThisMonth = customers.filter((c: any) => new Date(c.createdAt) >= thirtyDaysAgo).length;
  const repeatCustomers = customers.filter((c: any) => c.numberOfOrders > 1).length;
  const repeatRate = customers.length > 0 ? (repeatCustomers / customers.length) * 100 : 0;

  const totalSpent = customers.reduce((s: number, c: any) => s + parseFloat(c.amountSpent?.amount || '0'), 0);
  const avgLTV = customers.length > 0 ? totalSpent / customers.length : 0;

  // Segments
  const segments = {
    new: customers.filter((c: any) => c.numberOfOrders <= 1).length,
    returning: customers.filter((c: any) => c.numberOfOrders >= 2 && c.numberOfOrders <= 4).length,
    loyal: customers.filter((c: any) => c.numberOfOrders >= 5).length,
  };

  // Churn risk: no orders in 60+ days
  const churnRisk = customers.filter((c: any) => {
    const lastOrder = c.orders.edges[0]?.node?.createdAt;
    if (!lastOrder) return true;
    return new Date(lastOrder) < sixtyDaysAgo;
  }).length;

  // Cohort data: group by creation month
  const cohortMap: Record<string, { total: number; retained: Record<number, number> }> = {};
  for (const cust of customers) {
    const created = new Date(cust.createdAt);
    const cohortKey = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}`;
    if (!cohortMap[cohortKey]) cohortMap[cohortKey] = { total: 0, retained: {} };
    cohortMap[cohortKey].total++;

    for (const orderEdge of cust.orders.edges) {
      const orderDate = new Date(orderEdge.node.createdAt);
      const monthDiff = (orderDate.getFullYear() - created.getFullYear()) * 12 + (orderDate.getMonth() - created.getMonth());
      if (monthDiff >= 0) {
        cohortMap[cohortKey].retained[monthDiff] = (cohortMap[cohortKey].retained[monthDiff] || 0) + 1;
      }
    }
  }

  const cohorts = Object.entries(cohortMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-8)
    .map(([key, data]) => {
      const retentionRates: number[] = [];
      for (let m = 0; m <= 12; m++) {
        const count = data.retained[m] || 0;
        retentionRates.push(data.total > 0 ? Math.round((count / data.total) * 100) : 0);
      }
      return { cohort: key, total: data.total, retention: retentionRates };
    });

  // LTV distribution histogram
  const ltvBuckets = [
    { label: '$0', min: 0, max: 0 },
    { label: '$1-50', min: 0.01, max: 50 },
    { label: '$51-100', min: 50.01, max: 100 },
    { label: '$101-250', min: 100.01, max: 250 },
    { label: '$251-500', min: 250.01, max: 500 },
    { label: '$500+', min: 500.01, max: Infinity },
  ];
  const ltvDistribution = ltvBuckets.map(b => ({
    label: b.label,
    count: customers.filter((c: any) => {
      const spent = parseFloat(c.amountSpent?.amount || '0');
      return spent >= b.min && spent <= b.max;
    }).length,
  }));

  // Orders over time (monthly)
  const ordersByMonth: Record<string, { orders: number; revenue: number; customers: Set<string> }> = {};
  for (const order of orders) {
    const d = new Date(order.createdAt);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (!ordersByMonth[key]) ordersByMonth[key] = { orders: 0, revenue: 0, customers: new Set() };
    ordersByMonth[key].orders++;
    ordersByMonth[key].revenue += parseFloat(order.totalPriceSet?.shopMoney?.amount || '0');
    if (order.customer?.id) ordersByMonth[key].customers.add(order.customer.id);
  }

  const monthlyTrend = Object.entries(ordersByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      orders: d.orders,
      revenue: Math.round(d.revenue),
      uniqueCustomers: d.customers.size,
    }));

  // Repeat purchase rate by month
  const repeatByMonth = Object.entries(ordersByMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => {
      const repeatOrders = orders.filter((o: any) => {
        const od = new Date(o.createdAt);
        const oKey = `${od.getFullYear()}-${String(od.getMonth() + 1).padStart(2, '0')}`;
        return oKey === month && o.customer?.numberOfOrders > 1;
      }).length;
      return { month, rate: d.orders > 0 ? Math.round((repeatOrders / d.orders) * 100) : 0 };
    });

  // RFM segmentation
  const rfmSegments = {
    champions: customers.filter((c: any) => {
      const lastOrder = c.orders.edges[0]?.node?.createdAt;
      return c.numberOfOrders >= 5 && lastOrder && new Date(lastOrder) >= thirtyDaysAgo;
    }).length,
    loyalCustomers: customers.filter((c: any) => c.numberOfOrders >= 4).length,
    potentialLoyalists: customers.filter((c: any) => c.numberOfOrders >= 2 && c.numberOfOrders <= 3).length,
    atRisk: customers.filter((c: any) => {
      const lastOrder = c.orders.edges[0]?.node?.createdAt;
      return c.numberOfOrders >= 2 && lastOrder && new Date(lastOrder) < sixtyDaysAgo;
    }).length,
    cantLoseThem: customers.filter((c: any) => {
      const spent = parseFloat(c.amountSpent?.amount || '0');
      const lastOrder = c.orders.edges[0]?.node?.createdAt;
      return spent > avgLTV * 2 && lastOrder && new Date(lastOrder) < sixtyDaysAgo;
    }).length,
    newCustomers: customers.filter((c: any) => c.numberOfOrders === 1 && new Date(c.createdAt) >= thirtyDaysAgo).length,
    hibernating: customers.filter((c: any) => {
      const lastOrder = c.orders.edges[0]?.node?.createdAt;
      return c.numberOfOrders <= 1 && (!lastOrder || new Date(lastOrder) < sixtyDaysAgo);
    }).length,
  };

  // Top customers
  const topCustomers = [...customers]
    .sort((a: any, b: any) => parseFloat(b.amountSpent?.amount || '0') - parseFloat(a.amountSpent?.amount || '0'))
    .slice(0, 15)
    .map((c: any) => ({
      name: c.displayName || c.email || 'Anonymous',
      email: c.email || '',
      orders: c.numberOfOrders,
      spent: parseFloat(c.amountSpent?.amount || '0'),
      currency: c.amountSpent?.currencyCode || 'USD',
      lastOrder: c.orders.edges[0]?.node?.createdAt || null,
    }));

  return json({
    kpis: {
      totalCustomers: totalCustomersCount,
      newThisMonth,
      repeatRate: Math.round(repeatRate * 10) / 10,
      avgLTV: Math.round(avgLTV * 100) / 100,
      churnRisk,
    },
    segments,
    cohorts,
    ltvDistribution,
    monthlyTrend,
    repeatByMonth,
    rfmSegments,
    topCustomers,
  });
}

export default function CustomersPage() {
  const { kpis, segments, cohorts, ltvDistribution, monthlyTrend, repeatByMonth, rfmSegments, topCustomers } = useLoaderData<typeof loader>();

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1><Users size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />Customer Intelligence</h1>
          <p className="sp-subtitle">Understand your customers, retention, and lifetime value — powered by real store data.</p>
        </div>
      </div>

      <div className="sp-kpi-row">
        {[
          { l: 'TOTAL CUSTOMERS', v: kpis.totalCustomers.toLocaleString(), cl: '#1a73e8', icon: Users },
          { l: 'NEW THIS MONTH', v: kpis.newThisMonth.toString(), cl: '#10b981', icon: UserPlus },
          { l: 'REPEAT RATE', v: `${kpis.repeatRate}%`, cl: '#10b981', icon: Repeat },
          { l: 'AVG LTV', v: `$${kpis.avgLTV.toFixed(0)}`, cl: '#8b5cf6', icon: DollarSign },
          { l: 'CHURN RISK', v: kpis.churnRisk.toString(), cl: kpis.churnRisk > 10 ? '#ef4444' : '#f59e0b', icon: AlertTriangle },
        ].map((k, i) => (
          <div key={i} className="sp-kpi-card">
            <span className="sp-kpi-label"><k.icon size={14} style={{ marginRight: 4 }} />{k.l}</span>
            <div className="sp-kpi-value" style={{ color: k.cl }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="sp-card">
        <h3><Users size={16} style={{ marginRight: 6 }} />Customer Segments</h3>
        <CC type="donut" height={300} series={[segments.new, segments.returning, segments.loyal]} options={{
          labels: ['New (1 order)', 'Returning (2-4)', 'Loyal (5+)'],
          colors: ['#1a73e8', '#f59e0b', '#10b981'],
          legend: { position: 'bottom' },
        }} />
      </div>

      <div className="sp-card">
        <h3><Heart size={16} style={{ marginRight: 6 }} />RFM Segmentation</h3>
        <CC type="bar" height={300} series={[{
          name: 'Customers',
          data: [rfmSegments.champions, rfmSegments.loyalCustomers, rfmSegments.potentialLoyalists, rfmSegments.newCustomers, rfmSegments.atRisk, rfmSegments.cantLoseThem, rfmSegments.hibernating],
        }]} options={{
          chart: { toolbar: { show: false } },
          plotOptions: { bar: { horizontal: true, barHeight: '60%' } },
          colors: ['#8b5cf6'],
          xaxis: { title: { text: 'Customers' } },
          yaxis: { categories: ['Champions', 'Loyal', 'Potential Loyalists', 'New', 'At Risk', "Can't Lose", 'Hibernating'] },
        }} />
      </div>

      <div className="sp-card">
        <h3><DollarSign size={16} style={{ marginRight: 6 }} />LTV Distribution</h3>
        <CC type="bar" height={300} series={[{
          name: 'Customers',
          data: ltvDistribution.map((b: any) => b.count),
        }]} options={{
          chart: { toolbar: { show: false } },
          plotOptions: { bar: { columnWidth: '50%' } },
          colors: ['#10b981'],
          xaxis: { categories: ltvDistribution.map((b: any) => b.label) },
          yaxis: { title: { text: 'Number of Customers' } },
        }} />
      </div>

      {cohorts.length > 0 && (
        <div className="sp-card">
          <h3><BarChart3 size={16} style={{ marginRight: 6 }} />Monthly Cohort Retention Grid</h3>
          <div className="sp-heatmap-grid">
            <div className="sp-hm-header">
              <span>Cohort</span>
              {['Mo 0', 'Mo 1', 'Mo 2', 'Mo 3', 'Mo 4', 'Mo 5', 'Mo 6', 'Mo 7', 'Mo 8', 'Mo 9', 'Mo 10', 'Mo 11', 'Mo 12'].map(m => <span key={m}>{m}</span>)}
            </div>
            {cohorts.map((row, i) => (
              <div key={i} className="sp-hm-row">
                <span className="sp-hm-label">{row.cohort} ({row.total})</span>
                {row.retention.map((v, j) => (
                  <span key={j} className="sp-hm-cell" style={{
                    background: v === 0 ? '#f9fafb' : v >= 60 ? '#059669' : v >= 40 ? '#10b981' : v >= 20 ? '#fbbf24' : v > 0 ? '#fb923c' : '#f9fafb',
                    color: v > 35 ? '#fff' : '#333',
                    fontSize: '11px',
                  }}>
                    {v > 0 ? v + '%' : ''}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      {monthlyTrend.length > 0 && (
        <div className="sp-card">
          <h3><TrendingUp size={16} style={{ marginRight: 6 }} />Monthly Order & Revenue Trend</h3>
          <CC type="line" height={300} series={[
            { name: 'Orders', data: monthlyTrend.map(m => m.orders) },
            { name: 'Unique Customers', data: monthlyTrend.map(m => m.uniqueCustomers) },
          ]} options={{
            chart: { toolbar: { show: false } },
            colors: ['#1a73e8', '#10b981'],
            stroke: { width: 2, curve: 'smooth' },
            xaxis: { categories: monthlyTrend.map(m => m.month) },
            yaxis: { title: { text: 'Count' } },
            legend: { position: 'top' },
          }} />
        </div>
      )}

      {repeatByMonth.length > 0 && (
        <div className="sp-card">
          <h3><Repeat size={16} style={{ marginRight: 6 }} />Repeat Purchase Rate Over Time</h3>
          <CC type="area" height={250} series={[{
            name: 'Repeat Rate %',
            data: repeatByMonth.map(m => m.rate),
          }]} options={{
            chart: { toolbar: { show: false } },
            colors: ['#8b5cf6'],
            stroke: { width: 2, curve: 'smooth' },
            fill: { type: 'gradient', gradient: { opacityFrom: 0.4, opacityTo: 0 } },
            xaxis: { categories: repeatByMonth.map(m => m.month) },
            yaxis: { labels: { formatter: (v: number) => v + '%' }, max: 100 },
          }} />
        </div>
      )}

      <div className="sp-card">
        <h3>Top Customers by Lifetime Value</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sp-table">
            <thead><tr><th>Customer</th><th>Email</th><th>Orders</th><th>Total Spent</th><th>Last Order</th></tr></thead>
            <tbody>
              {topCustomers.map((c: any, i: number) => (
                <tr key={i}>
                  <td><strong>{c.name}</strong></td>
                  <td style={{ color: '#64748b', fontSize: '13px' }}>{c.email}</td>
                  <td>{c.orders}</td>
                  <td style={{ color: '#10b981', fontWeight: 600 }}>${c.spent.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                  <td style={{ fontSize: '13px' }}>{c.lastOrder ? new Date(c.lastOrder).toLocaleDateString() : 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ErrorBoundary() {
  return (
    <div style={{ padding: 40, fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ color: "#EF4444" }}>Something went wrong</h1>
      <p>This page encountered an error. Please try refreshing or go back to the dashboard.</p>
      <a href="/app" style={{ color: "#1a73e8" }}>← Back to Dashboard</a>
    </div>
  );
}
