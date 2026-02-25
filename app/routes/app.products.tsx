import { useState, useEffect, Suspense, lazy, useMemo } from 'react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../shopify.server';
import { Package, TrendingUp, AlertTriangle, BarChart3, ArrowUpRight, ArrowDownRight, Layers, RotateCcw } from 'lucide-react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : (() => null) as any;

function CC(p: any) {
  const [c, sc] = useState(false);
  useEffect(() => sc(true), []);
  if (!c) return <div style={{ height: p.height || 250 }} />;
  return <Suspense fallback={<div style={{ height: p.height || 250 }} />}><Chart {...p} /></Suspense>;
}

interface ProductData {
  id: string;
  title: string;
  status: string;
  totalInventory: number;
  vendor: string;
  productType: string;
  imageUrl: string | null;
  revenue: number;
  unitsSold: number;
  growthRate: number;
  refundAmount: number;
  refundRate: number;
  variants: { title: string; price: string; inventoryQuantity: number; sku: string; options: string }[];
}

export async function loader({ request }: LoaderFunctionArgs) {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`{
    products(first: 100, sortKey: CREATED_AT, reverse: true) {
      edges { node {
        id title status totalInventory vendor productType
        variants(first: 20) { edges { node {
          id title price inventoryQuantity sku
          selectedOptions { name value }
        }}}
        images(first: 1) { edges { node { url } } }
      }}
    }
    orders(first: 250, query: "created_at:>2025-01-01", sortKey: CREATED_AT, reverse: true) {
      edges { node {
        createdAt
        totalPriceSet { shopMoney { amount } }
        lineItems(first: 50) { nodes { title quantity originalUnitPriceSet { shopMoney { amount } } sku } }
        totalRefundedSet { shopMoney { amount } }
      }}
    }
  }`);

  const data = await response.json();
  const products = data.data.products.edges.map((e: any) => e.node);
  const orders = data.data.orders.edges.map((e: any) => e.node);

  const now = new Date();
  const fifteenDaysAgo = new Date(now.getTime() - 15 * 86400000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  // Build revenue/units maps from line items
  const revenueMap: Record<string, number> = {};
  const unitsMap: Record<string, number> = {};
  const revenueRecent: Record<string, number> = {};
  const revenuePrior: Record<string, number> = {};
  const refundByOrder: Record<string, number> = {};
  const orderRevenueMap: Record<string, number> = {};

  for (const order of orders) {
    const orderDate = new Date(order.createdAt);
    const refund = parseFloat(order.totalRefundedSet?.shopMoney?.amount || '0');
    const orderTotal = parseFloat(order.totalPriceSet?.shopMoney?.amount || '0');

    for (const item of order.lineItems.nodes) {
      const title = item.title;
      const qty = item.quantity || 0;
      const price = parseFloat(item.originalUnitPriceSet?.shopMoney?.amount || '0');
      const lineRevenue = qty * price;

      revenueMap[title] = (revenueMap[title] || 0) + lineRevenue;
      unitsMap[title] = (unitsMap[title] || 0) + qty;

      if (orderDate >= fifteenDaysAgo) {
        revenueRecent[title] = (revenueRecent[title] || 0) + lineRevenue;
      } else if (orderDate >= thirtyDaysAgo) {
        revenuePrior[title] = (revenuePrior[title] || 0) + lineRevenue;
      }

      // Distribute refund proportionally
      if (refund > 0 && orderTotal > 0) {
        const share = lineRevenue / orderTotal;
        refundByOrder[title] = (refundByOrder[title] || 0) + refund * share;
      }
    }
  }

  // Process products
  const productData: ProductData[] = products.map((p: any) => {
    const revenue = revenueMap[p.title] || 0;
    const unitsSold = unitsMap[p.title] || 0;
    const recent = revenueRecent[p.title] || 0;
    const prior = revenuePrior[p.title] || 0;
    const growthRate = prior > 0 ? ((recent - prior) / prior) * 100 : recent > 0 ? 100 : 0;
    const refundAmount = refundByOrder[p.title] || 0;
    const refundRate = revenue > 0 ? (refundAmount / revenue) * 100 : 0;

    return {
      id: p.id,
      title: p.title,
      status: p.status,
      totalInventory: p.totalInventory || 0,
      vendor: p.vendor || 'Unknown',
      productType: p.productType || 'Uncategorized',
      imageUrl: p.images.edges[0]?.node?.url || null,
      revenue,
      unitsSold,
      growthRate: Math.round(growthRate * 10) / 10,
      refundAmount: Math.round(refundAmount * 100) / 100,
      refundRate: Math.round(refundRate * 10) / 10,
      variants: p.variants.edges.map((v: any) => ({
        title: v.node.title,
        price: v.node.price,
        inventoryQuantity: v.node.inventoryQuantity || 0,
        sku: v.node.sku || '',
        options: v.node.selectedOptions.map((o: any) => `${o.name}: ${o.value}`).join(', '),
      })),
    };
  });

  // Sort by revenue for top 20
  const top20 = [...productData].sort((a, b) => b.revenue - a.revenue).slice(0, 20);

  // Inventory summary
  const inventorySummary = {
    inStock: productData.filter(p => p.totalInventory > 10).length,
    lowStock: productData.filter(p => p.totalInventory > 0 && p.totalInventory <= 10).length,
    outOfStock: productData.filter(p => p.totalInventory === 0).length,
  };

  // Vendor aggregation
  const vendorMap: Record<string, { revenue: number; products: number; units: number }> = {};
  for (const p of productData) {
    if (!vendorMap[p.vendor]) vendorMap[p.vendor] = { revenue: 0, products: 0, units: 0 };
    vendorMap[p.vendor].revenue += p.revenue;
    vendorMap[p.vendor].products += 1;
    vendorMap[p.vendor].units += p.unitsSold;
  }
  const vendors = Object.entries(vendorMap)
    .map(([name, d]) => ({ name, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);

  // BCG matrix data
  const medianRevenue = productData.length > 0
    ? [...productData].sort((a, b) => a.revenue - b.revenue)[Math.floor(productData.length / 2)].revenue
    : 0;
  const bcg = {
    stars: productData.filter(p => p.revenue >= medianRevenue && p.growthRate >= 10).map(p => [p.revenue / 1000, p.growthRate]),
    cashCows: productData.filter(p => p.revenue >= medianRevenue && p.growthRate < 10).map(p => [p.revenue / 1000, p.growthRate]),
    questionMarks: productData.filter(p => p.revenue < medianRevenue && p.growthRate >= 10).map(p => [p.revenue / 1000, p.growthRate]),
    dogs: productData.filter(p => p.revenue < medianRevenue && p.growthRate < 10).map(p => [p.revenue / 1000, p.growthRate]),
  };

  // Variant heatmap: top 10 products, their variants' inventory
  const variantHeatmap = top20.slice(0, 10).map(p => ({
    product: p.title.length > 25 ? p.title.slice(0, 25) + '…' : p.title,
    variants: p.variants.map(v => ({ label: v.title, inventory: v.inventoryQuantity })),
  }));

  const totalRevenue = productData.reduce((s, p) => s + p.revenue, 0);
  const totalUnits = productData.reduce((s, p) => s + p.unitsSold, 0);
  const totalProducts = productData.length;
  const avgOrderValue = orders.length > 0
    ? orders.reduce((s: number, o: any) => s + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'), 0) / orders.length
    : 0;

  return json({
    kpis: {
      totalRevenue: Math.round(totalRevenue),
      totalUnits,
      totalProducts,
      avgOrderValue: Math.round(avgOrderValue * 100) / 100,
      inStock: inventorySummary.inStock,
      lowStock: inventorySummary.lowStock,
      outOfStock: inventorySummary.outOfStock,
    },
    top20,
    bcg,
    vendors,
    variantHeatmap,
    products: productData,
  });
}

export default function ProductsPage() {
  const { kpis, top20, bcg, vendors, variantHeatmap, products } = useLoaderData<typeof loader>();
  const [tab, setTab] = useState('performance');
  const tabs = [
    { key: 'performance', label: 'Performance', icon: TrendingUp },
    { key: 'margins', label: 'Margins', icon: BarChart3 },
    { key: 'inventory', label: 'Inventory', icon: Package },
    { key: 'returns', label: 'Returns', icon: RotateCcw },
  ];

  const topProducts = useMemo(() => top20, [top20]);

  return (
    <div className="sp-page">
      <div className="sp-page-header">
        <div>
          <h1><Package size={24} style={{ display: 'inline', marginRight: 8, verticalAlign: 'middle' }} />Product Intelligence</h1>
          <p className="sp-subtitle">Deep-dive into product performance, margins, inventory and returns — powered by real store data.</p>
        </div>
      </div>

      <div className="sp-kpi-row">
        {[
          { l: 'TOTAL REVENUE', v: `$${(kpis.totalRevenue / 1000).toFixed(1)}K`, cl: '#10b981', icon: TrendingUp },
          { l: 'UNITS SOLD', v: kpis.totalUnits.toLocaleString(), cl: '#1a73e8', icon: Package },
          { l: 'PRODUCTS', v: kpis.totalProducts.toString(), cl: '#8b5cf6', icon: Layers },
          { l: 'AVG ORDER VALUE', v: `$${kpis.avgOrderValue.toFixed(2)}`, cl: '#f59e0b', icon: BarChart3 },
          { l: 'LOW STOCK', v: kpis.lowStock.toString(), cl: kpis.lowStock > 5 ? '#ef4444' : '#f59e0b', icon: AlertTriangle },
          { l: 'OUT OF STOCK', v: kpis.outOfStock.toString(), cl: kpis.outOfStock > 0 ? '#ef4444' : '#10b981', icon: AlertTriangle },
        ].map((k, i) => (
          <div key={i} className="sp-kpi-card">
            <span className="sp-kpi-label"><k.icon size={14} style={{ marginRight: 4 }} />{k.l}</span>
            <div className="sp-kpi-value" style={{ color: k.cl }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="sp-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`sp-tab-btn ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
            <t.icon size={14} style={{ marginRight: 4 }} />{t.label}
          </button>
        ))}
      </div>

      {tab === 'performance' && <PerformanceTab top20={topProducts} bcg={bcg} />}
      {tab === 'margins' && <MarginsTab vendors={vendors} products={products} />}
      {tab === 'inventory' && <InventoryTab products={products} variantHeatmap={variantHeatmap} kpis={kpis} />}
      {tab === 'returns' && <ReturnsTab products={products} />}
    </div>
  );
}

function PerformanceTab({ top20, bcg }: any) {
  return (
    <>
      {top20.length > 0 && (
        <div className="sp-ai-banner">
          <div className="sp-ai-banner-icon">AI</div>
          <div className="sp-ai-banner-content">
            <h3>Product Insights</h3>
            <p>
              Top performer: <strong>{top20[0]?.title}</strong> at ${(top20[0]?.revenue / 1000).toFixed(1)}K revenue.
              {bcg.dogs.length > 0 && ` ${bcg.dogs.length} products in the "Dogs" quadrant may need attention.`}
              {top20.filter((p: any) => p.growthRate > 20).length > 0 && ` ${top20.filter((p: any) => p.growthRate > 20).length} products growing >20%.`}
            </p>
          </div>
        </div>
      )}

      <div className="sp-card">
        <h3><BarChart3 size={16} style={{ marginRight: 6 }} />BCG Product Matrix</h3>
        <CC type="scatter" height={350} series={[
          { name: 'Stars', data: bcg.stars.length > 0 ? bcg.stars : [[0, 0]] },
          { name: 'Cash Cows', data: bcg.cashCows.length > 0 ? bcg.cashCows : [[0, 0]] },
          { name: 'Question Marks', data: bcg.questionMarks.length > 0 ? bcg.questionMarks : [[0, 0]] },
          { name: 'Dogs', data: bcg.dogs.length > 0 ? bcg.dogs : [[0, 0]] },
        ]} options={{
          chart: { toolbar: { show: false } },
          colors: ['#10b981', '#1a73e8', '#f59e0b', '#ef4444'],
          xaxis: { title: { text: 'Revenue ($K)' }, min: 0 },
          yaxis: { title: { text: 'Growth Rate (%)' } },
          markers: { size: 12 },
          annotations: {
            yaxis: [{ y: 10, borderColor: '#94a3b8', label: { text: 'Growth Threshold' } }],
          },
          legend: { position: 'top' },
          tooltip: { z: { title: '' } },
        }} />
      </div>

      <div className="sp-card">
        <h3><TrendingUp size={16} style={{ marginRight: 6 }} />Top 20 Products by Revenue</h3>
        {top20.length > 0 ? (
          <CC type="bar" height={Math.max(400, top20.length * 28)} series={[
            { name: 'Revenue', data: top20.map((p: any) => Math.round(p.revenue)) },
          ]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, barHeight: '70%' } },
            colors: ['#10b981'],
            xaxis: { labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(1) + 'K' } },
            yaxis: { categories: top20.map((p: any) => p.title.length > 30 ? p.title.slice(0, 30) + '…' : p.title) },
            tooltip: { y: { formatter: (v: number) => '$' + v.toLocaleString() } },
          }} />
        ) : (
          <p style={{ padding: 20, color: '#94a3b8' }}>No sales data available yet.</p>
        )}
      </div>

      <div className="sp-card">
        <h3><ArrowUpRight size={16} style={{ marginRight: 6 }} />Revenue Growth Rate (Recent 15d vs Prior 15d)</h3>
        {top20.length > 0 ? (
          <CC type="bar" height={350} series={[
            { name: 'Growth %', data: top20.map((p: any) => p.growthRate) },
          ]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: false, columnWidth: '60%', colors: { ranges: [{ from: -999, to: 0, color: '#ef4444' }, { from: 0, to: 999, color: '#10b981' }] } } },
            xaxis: { categories: top20.map((p: any) => p.title.length > 15 ? p.title.slice(0, 15) + '…' : p.title), labels: { rotate: -45, style: { fontSize: '10px' } } },
            yaxis: { labels: { formatter: (v: number) => v + '%' } },
            tooltip: { y: { formatter: (v: number) => v + '%' } },
          }} />
        ) : (
          <p style={{ padding: 20, color: '#94a3b8' }}>No growth data available yet.</p>
        )}
      </div>
    </>
  );
}

function MarginsTab({ vendors, products }: any) {
  const topByType = useMemo(() => {
    const typeMap: Record<string, { revenue: number; units: number; count: number }> = {};
    for (const p of products) {
      const t = p.productType || 'Uncategorized';
      if (!typeMap[t]) typeMap[t] = { revenue: 0, units: 0, count: 0 };
      typeMap[t].revenue += p.revenue;
      typeMap[t].units += p.unitsSold;
      typeMap[t].count += 1;
    }
    return Object.entries(typeMap).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  }, [products]);

  return (
    <>
      <div className="sp-card">
        <h3><BarChart3 size={16} style={{ marginRight: 6 }} />Revenue by Vendor</h3>
        {vendors.length > 0 ? (
          <CC type="bar" height={300} series={[
            { name: 'Revenue', data: vendors.map((v: any) => Math.round(v.revenue)) },
            { name: 'Units', data: vendors.map((v: any) => v.units) },
          ]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { columnWidth: '50%' } },
            colors: ['#1a73e8', '#10b981'],
            xaxis: { categories: vendors.map((v: any) => v.name) },
            yaxis: [
              { title: { text: 'Revenue ($)' }, labels: { formatter: (v: number) => '$' + (v / 1000).toFixed(1) + 'K' } },
              { opposite: true, title: { text: 'Units' } },
            ],
            tooltip: { y: { formatter: (v: number, { seriesIndex }: any) => seriesIndex === 0 ? '$' + v.toLocaleString() : v + ' units' } },
          }} />
        ) : (
          <p style={{ padding: 20, color: '#94a3b8' }}>No vendor data available.</p>
        )}
      </div>

      <div className="sp-card">
        <h3><Layers size={16} style={{ marginRight: 6 }} />Revenue by Product Type</h3>
        {topByType.length > 0 ? (
          <CC type="pie" height={350} series={topByType.map(t => Math.round(t.revenue))} options={{
            labels: topByType.map(t => t.name),
            colors: ['#1a73e8', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#6366f1'],
            legend: { position: 'bottom' },
            tooltip: { y: { formatter: (v: number) => '$' + v.toLocaleString() } },
          }} />
        ) : (
          <p style={{ padding: 20, color: '#94a3b8' }}>No product type data available.</p>
        )}
      </div>

      <div className="sp-card">
        <h3>Vendor Performance Table</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sp-table">
            <thead><tr><th>Vendor</th><th>Products</th><th>Revenue</th><th>Units Sold</th><th>Avg Rev/Product</th></tr></thead>
            <tbody>
              {vendors.map((v: any, i: number) => (
                <tr key={i}>
                  <td><strong>{v.name}</strong></td>
                  <td>{v.products}</td>
                  <td>${v.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td>{v.units.toLocaleString()}</td>
                  <td>${v.products > 0 ? Math.round(v.revenue / v.products).toLocaleString() : 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function InventoryTab({ products, variantHeatmap, kpis }: any) {
  const inventoryDistribution = useMemo(() => {
    const ranges = [
      { label: '0 (Out)', min: 0, max: 0 },
      { label: '1-10 (Low)', min: 1, max: 10 },
      { label: '11-50', min: 11, max: 50 },
      { label: '51-100', min: 51, max: 100 },
      { label: '100+', min: 101, max: Infinity },
    ];
    return ranges.map(r => ({
      label: r.label,
      count: products.filter((p: any) => p.totalInventory >= r.min && p.totalInventory <= r.max).length,
    }));
  }, [products]);

  return (
    <>
      <div className="sp-card">
        <h3><Package size={16} style={{ marginRight: 6 }} />Inventory Distribution</h3>
        <CC type="bar" height={300} series={[{
          name: 'Products',
          data: inventoryDistribution.map((d: any) => d.count),
        }]} options={{
          chart: { toolbar: { show: false } },
          plotOptions: { bar: { columnWidth: '50%', colors: { ranges: [{ from: 0, to: 0, color: '#ef4444' }] } } },
          colors: ['#1a73e8'],
          xaxis: { categories: inventoryDistribution.map((d: any) => d.label) },
          yaxis: { title: { text: 'Number of Products' } },
        }} />
      </div>

      <div className="sp-card">
        <h3><AlertTriangle size={16} style={{ marginRight: 6 }} />Inventory Status Summary</h3>
        <CC type="donut" height={300} series={[kpis.inStock, kpis.lowStock, kpis.outOfStock]} options={{
          labels: ['In Stock (>10)', 'Low Stock (1-10)', 'Out of Stock (0)'],
          colors: ['#10b981', '#f59e0b', '#ef4444'],
          legend: { position: 'bottom' },
        }} />
      </div>

      {variantHeatmap.length > 0 && (
        <div className="sp-card">
          <h3><Layers size={16} style={{ marginRight: 6 }} />Variant Inventory Heatmap (Top Products)</h3>
          <div className="sp-heatmap-grid">
            <div className="sp-hm-header">
              <span>Product</span>
              {variantHeatmap[0]?.variants?.slice(0, 8).map((_: any, i: number) => <span key={i}>V{i + 1}</span>)}
            </div>
            {variantHeatmap.map((row: any, i: number) => (
              <div key={i} className="sp-hm-row">
                <span className="sp-hm-label">{row.product}</span>
                {row.variants.slice(0, 8).map((v: any, j: number) => (
                  <span key={j} className="sp-hm-cell" style={{
                    background: v.inventory === 0 ? '#fecaca' : v.inventory <= 5 ? '#fef3c7' : v.inventory <= 20 ? '#d1fae5' : '#a7f3d0',
                    color: '#333', fontSize: '11px',
                  }}>
                    {v.inventory}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="sp-card">
        <h3>Low & Out of Stock Products</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sp-table">
            <thead><tr><th>Product</th><th>Vendor</th><th>Inventory</th><th>Status</th><th>Revenue</th></tr></thead>
            <tbody>
              {products.filter((p: any) => p.totalInventory <= 10).sort((a: any, b: any) => a.totalInventory - b.totalInventory).slice(0, 20).map((p: any, i: number) => (
                <tr key={i}>
                  <td>{p.title}</td>
                  <td>{p.vendor}</td>
                  <td><strong>{p.totalInventory}</strong></td>
                  <td><span style={{ color: p.totalInventory === 0 ? '#ef4444' : '#f59e0b', fontWeight: 600 }}>{p.totalInventory === 0 ? 'Out of Stock' : 'Low Stock'}</span></td>
                  <td>${p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

function ReturnsTab({ products }: any) {
  const withRefunds = useMemo(() =>
    products.filter((p: any) => p.refundAmount > 0).sort((a: any, b: any) => b.refundAmount - a.refundAmount),
    [products]
  );

  const totalRefunds = withRefunds.reduce((s: number, p: any) => s + p.refundAmount, 0);
  const avgRefundRate = products.length > 0
    ? products.reduce((s: number, p: any) => s + p.refundRate, 0) / products.filter((p: any) => p.revenue > 0).length || 0
    : 0;

  return (
    <>
      <div className="sp-kpi-row">
        {[
          { l: 'TOTAL REFUNDS', v: `$${totalRefunds.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, cl: '#ef4444' },
          { l: 'PRODUCTS WITH REFUNDS', v: withRefunds.length.toString(), cl: '#f59e0b' },
          { l: 'AVG REFUND RATE', v: `${avgRefundRate.toFixed(1)}%`, cl: avgRefundRate > 5 ? '#ef4444' : '#10b981' },
        ].map((k, i) => (
          <div key={i} className="sp-kpi-card">
            <span className="sp-kpi-label">{k.l}</span>
            <div className="sp-kpi-value" style={{ color: k.cl }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div className="sp-card">
        <h3><RotateCcw size={16} style={{ marginRight: 6 }} />Refund Amount by Product</h3>
        {withRefunds.length > 0 ? (
          <CC type="bar" height={350} series={[
            { name: 'Refund Amount', data: withRefunds.slice(0, 15).map((p: any) => Math.round(p.refundAmount * 100) / 100) },
          ]} options={{
            chart: { toolbar: { show: false } },
            plotOptions: { bar: { horizontal: true, barHeight: '65%' } },
            colors: ['#ef4444'],
            xaxis: { labels: { formatter: (v: number) => '$' + v.toFixed(0) } },
            yaxis: { categories: withRefunds.slice(0, 15).map((p: any) => p.title.length > 25 ? p.title.slice(0, 25) + '…' : p.title) },
            tooltip: { y: { formatter: (v: number) => '$' + v.toFixed(2) } },
          }} />
        ) : (
          <p style={{ padding: 20, color: '#94a3b8' }}>No refund data found — great news!</p>
        )}
      </div>

      <div className="sp-card">
        <h3><ArrowDownRight size={16} style={{ marginRight: 6 }} />Refund Rate by Product (%)</h3>
        {withRefunds.length > 0 ? (
          <CC type="bar" height={350} series={[
            { name: 'Refund Rate', data: withRefunds.slice(0, 15).map((p: any) => p.refundRate) },
          ]} options={{
            chart: { toolbar: { show: false } },
            colors: ['#f59e0b'],
            plotOptions: { bar: { columnWidth: '50%' } },
            xaxis: { categories: withRefunds.slice(0, 15).map((p: any) => p.title.length > 15 ? p.title.slice(0, 15) + '…' : p.title), labels: { rotate: -45, style: { fontSize: '10px' } } },
            yaxis: { labels: { formatter: (v: number) => v + '%' } },
            tooltip: { y: { formatter: (v: number) => v + '%' } },
          }} />
        ) : (
          <p style={{ padding: 20, color: '#94a3b8' }}>No refund data found.</p>
        )}
      </div>

      <div className="sp-card">
        <h3>Refund Details Table</h3>
        <div style={{ overflowX: 'auto' }}>
          <table className="sp-table">
            <thead><tr><th>Product</th><th>Revenue</th><th>Refund Amount</th><th>Refund Rate</th><th>Units Sold</th></tr></thead>
            <tbody>
              {withRefunds.slice(0, 20).map((p: any, i: number) => (
                <tr key={i}>
                  <td>{p.title}</td>
                  <td>${p.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ color: '#ef4444' }}>${p.refundAmount.toFixed(2)}</td>
                  <td style={{ color: p.refundRate > 10 ? '#ef4444' : p.refundRate > 5 ? '#f59e0b' : '#10b981' }}>{p.refundRate}%</td>
                  <td>{p.unitsSold}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
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
