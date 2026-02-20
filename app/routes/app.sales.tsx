import { json } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { authenticate } from "../shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useState, useEffect, lazy, Suspense } from "react";
import {
  LayoutDashboard, TrendingUp, Box, Users, Megaphone, Warehouse, BarChart3,
  Sparkles, Settings, ChevronDown, Calendar, Search, Bell, Moon, Sun, Menu,
} from "lucide-react";
import dashboardStyles from "../styles/dashboard.css?url";

export const links = () => [{ rel: "stylesheet", href: dashboardStyles }];

const Chart = typeof window !== "undefined"
  ? lazy(() => import("react-apexcharts"))
  : () => null;

function ClientChart(props: any) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <div style={{ height: props.height || 200 }} />;
  return (
    <Suspense fallback={<div style={{ height: props.height || 200 }} />}>
      <Chart {...props} />
    </Suspense>
  );
}

function Sidebar({ isOpen, onToggle, activePage }: { isOpen: boolean; onToggle: () => void; activePage: string }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/app" },
    { id: "sales", label: "Sales & Revenue", icon: TrendingUp, href: "/app/sales" },
    { id: "products", label: "Products", icon: Box, href: "/app/products" },
    { id: "customers", label: "Customer Intelligence", icon: Users, href: "/app/customers" },
    { id: "marketing", label: "Marketing", icon: Megaphone, href: "/app/marketing" },
    { id: "inventory", label: "Inventory", icon: Warehouse, href: "/app/inventory" },
    { id: "reports", label: "Reports", icon: BarChart3, href: "/app/reports" },
  ];

  return (
    <>
      {isOpen && <div className="sp-sidebar-overlay" onClick={onToggle} />}
      <aside className={`sp-sidebar ${isOpen ? "sp-sidebar-open" : ""}`}>
        <div className="sp-sidebar-header">
          <Sparkles size={24} color="#48cae4" />
          <span className="sp-sidebar-logo">ShopifyPulse</span>
        </div>
        <nav className="sp-sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.id} to={item.href} className={`sp-sidebar-link ${activePage === item.id ? "active" : ""}`}>
              <item.icon size={18} /> {item.label}
            </Link>
          ))}
        </nav>
        <div className="sp-sidebar-footer">
          <Link to="/app/ai-insights" className="sp-sidebar-link">
            <Sparkles size={18} /> AI Insights <span className="sp-badge-ai">AI</span>
          </Link>
          <Link to="/app/settings" className="sp-sidebar-link">
            <Settings size={18} /> Settings
          </Link>
        </div>
        <div className="sp-sidebar-store">
          <button className="sp-store-selector">
            Select Store <ChevronDown size={14} />
          </button>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuToggle, isDark, onThemeToggle, shopName }: { onMenuToggle: () => void; isDark: boolean; onThemeToggle: () => void; shopName: string }) {
  return (
    <header className="sp-topbar">
      <div className="sp-topbar-left">
        <button className="sp-menu-btn" onClick={onMenuToggle}><Menu size={20} /></button>
        <div className="sp-date-picker">
          <Calendar size={14} />
          <select className="sp-date-select">
            <option>Last 30 Days</option>
            <option>Last 7 Days</option>
            <option>Last 90 Days</option>
            <option>This Year</option>
          </select>
        </div>
      </div>
      <div className="sp-topbar-center">
        <div className="sp-search-box">
          <Search size={16} className="sp-search-icon" />
          <input type="text" placeholder="Search ShopifyPulse..." className="sp-search-input" />
        </div>
      </div>
      <div className="sp-topbar-right">
        <button className="sp-ai-btn"><Sparkles size={14} /> Ask AI</button>
        <div className="sp-notif-wrapper">
          <Bell size={18} />
          <span className="sp-notif-badge">3</span>
        </div>
        <button className="sp-theme-btn" onClick={onThemeToggle}>
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <div className="sp-avatar">{shopName.substring(0, 2).toUpperCase()}</div>
      </div>
    </header>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Get shop info
  const shopInfoResponse = await admin.graphql(`{ shop { name currencyCode } }`);
  const shopInfo = await shopInfoResponse.json();
  const shopName = shopInfo.data?.shop?.name || "Store";

  const response = await admin.graphql(`{
    orders(first: 100, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          displayFinancialStatus
          displayFulfillmentStatus
          customer { displayName }
          billingAddress { country provinceCode city }
          lineItems(first: 5) {
            edges { node { title quantity } }
          }
          transactions(first: 1) { gateway }
        }
      }
    }
  }`);

  const data = await response.json();
  const orders = data.data?.orders?.edges?.map((e: any) => e.node) || [];

  const grossRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalPriceSet?.shopMoney?.amount || "0"), 0);
  const totalDiscounts = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalDiscountsSet?.shopMoney?.amount || "0"), 0);
  const totalTax = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalTaxSet?.shopMoney?.amount || "0"), 0);
  const totalShipping = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalShippingPriceSet?.shopMoney?.amount || "0"), 0);
  const netRevenue = grossRevenue - totalDiscounts;
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || "USD";
  const aov = orders.length > 0 ? grossRevenue / orders.length : 0;

  const revenueByDay: Record<string, number> = {};
  orders.forEach((o: any) => {
    const date = new Date(o.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    revenueByDay[date] = (revenueByDay[date] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || "0");
  });

  const paymentMethods: Record<string, number> = {};
  orders.forEach((o: any) => {
    const gateway = o.transactions?.[0]?.gateway || "Unknown";
    paymentMethods[gateway] = (paymentMethods[gateway] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || "0");
  });

  const revenueByCountry: Record<string, number> = {};
  orders.forEach((o: any) => {
    const country = o.billingAddress?.country || "Unknown";
    revenueByCountry[country] = (revenueByCountry[country] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || "0");
  });

  const ordersByDayOfWeek: Record<string, number> = {};
  orders.forEach((o: any) => {
    const day = new Date(o.createdAt).toLocaleDateString("en-US", { weekday: "short" });
    ordersByDayOfWeek[day] = (ordersByDayOfWeek[day] || 0) + 1;
  });

  const topOrders = orders.slice(0, 10).map((o: any) => ({
    name: o.name,
    customer: o.customer?.displayName || "Guest",
    amount: o.totalPriceSet?.shopMoney?.amount,
    status: o.displayFinancialStatus,
    date: o.createdAt
  }));

  return json({
    shopName,
    metrics: { grossRevenue, netRevenue, totalDiscounts, totalTax, totalShipping, aov, totalOrders: orders.length, currency },
    revenueByDay,
    paymentMethods,
    revenueByCountry,
    ordersByDayOfWeek,
    topOrders
  });
};

export default function SalesRevenue() {
  const { shopName, metrics, revenueByDay, paymentMethods, revenueByCountry, ordersByDayOfWeek, topOrders } = useLoaderData<typeof loader>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => { setIsDark(!isDark); document.documentElement.classList.toggle("dark"); };

  const formatCurrency = (val: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: metrics.currency }).format(val);

  // Revenue Waterfall Chart
  const waterfallOpts = {
    chart: { type: "bar" as const, height: 250, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "50%", distributed: true } },
    colors: ["#22c55e", "#ef4444", "#f59e0b", "#0096c7", "#6366f1"],
    xaxis: { categories: ["Gross", "Discounts", "Tax", "Shipping", "Net"], labels: { style: { colors: "#6b8299", fontSize: "11px" } } },
    yaxis: { labels: { style: { colors: "#6b8299", fontSize: "11px" }, formatter: (v: number) => formatCurrency(v) } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
  };
  const waterfallSeries = [{ name: "Amount", data: [metrics.grossRevenue, metrics.totalDiscounts, metrics.totalTax, metrics.totalShipping, metrics.netRevenue] }];

  // Orders by Day of Week Chart
  const dayOfWeekOpts = {
    chart: { type: "bar" as const, height: 200, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: true } },
    colors: ["#6366f1", "#6366f1", "#6366f1", "#6366f1", "#6366f1", "#6366f1", "#6366f1"],
    xaxis: { categories: Object.keys(ordersByDayOfWeek as Record<string, number>), labels: { style: { colors: "#6b8299", fontSize: "11px" } } },
    yaxis: { labels: { style: { colors: "#6b8299", fontSize: "11px" } } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    dataLabels: { enabled: true, style: { fontSize: "11px", colors: ["#fff"] } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => v + " orders" } }
  };
  const dayOfWeekSeries = [{ name: "Orders", data: Object.values(ordersByDayOfWeek as Record<string, number>) }];

  // Revenue by Day Chart
  const revByDayCategories = Object.entries(revenueByDay as Record<string, number>).slice(0, 10).map(([date]) => date);
  const revByDayOpts = {
    chart: { type: "bar" as const, height: 200, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, horizontal: true, barHeight: "60%", distributed: true } },
    colors: ["#0077b6"],
    xaxis: { labels: { style: { colors: "#6b8299", fontSize: "11px" }, formatter: (v: number) => formatCurrency(v) } },
    yaxis: { categories: revByDayCategories, labels: { style: { colors: "#6b8299", fontSize: "11px" } } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v: number) => formatCurrency(v), style: { fontSize: "10px", colors: ["#fff"] } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
  };
  const revByDaySeries = [{ name: "Revenue", data: Object.entries(revenueByDay as Record<string, number>).slice(0, 10).map(([_, amount]) => amount) }];

  // Payment Methods Chart
  const paymentOpts = {
    chart: { type: "donut" as const, height: 200 },
    labels: Object.keys(paymentMethods as Record<string, number>),
    colors: ["#0077b6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6"],
    plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total", formatter: () => formatCurrency(Object.values(paymentMethods as Record<string, number>).reduce((a: number, b: number) => a + b, 0)) } } } } },
    dataLabels: { enabled: false },
    legend: { position: "bottom" as const, fontSize: "11px" }
  };
  const paymentSeries = Object.values(paymentMethods as Record<string, number>);

  // Revenue by Country Chart
  const countryCategories = Object.entries(revenueByCountry as Record<string, number>).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([country]) => country);
  const countryOpts = {
    chart: { type: "bar" as const, height: 200, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, horizontal: true, barHeight: "60%", distributed: true } },
    colors: ["#22c55e", "#0077b6", "#f59e0b", "#ef4444", "#8b5cf6"],
    xaxis: { labels: { style: { colors: "#6b8299", fontSize: "11px" }, formatter: (v: number) => formatCurrency(v) } },
    yaxis: { categories: countryCategories, labels: { style: { colors: "#6b8299", fontSize: "11px" } } },
    grid: { borderColor: "#e2e8f0", strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v: number) => formatCurrency(v), style: { fontSize: "10px", colors: ["#fff"] } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
  };
  const countrySeries = [{ name: "Revenue", data: Object.entries(revenueByCountry as Record<string, number>).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([_, amount]) => amount) }];

  return (
    <div className="sp-layout">
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} activePage="sales" />
      <div className="sp-main">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isDark={isDark} onThemeToggle={toggleTheme} shopName={shopName} />
        <div className="sp-content">

          <h1 className="sp-page-title">Sales & Revenue Analytics</h1>

          {/* ROW 1: Revenue KPI Strip */}
          <div className="sp-grid sp-grid-4">
            <div className="sp-card">
              <div className="sp-card-label">GROSS REVENUE</div>
              <div className="sp-card-value">{formatCurrency(metrics.grossRevenue)}</div>
              <span className="sp-badge sp-badge-success">{`${metrics.totalOrders} orders`}</span>
            </div>
            <div className="sp-card">
              <div className="sp-card-label">NET REVENUE</div>
              <div className="sp-card-value">{formatCurrency(metrics.netRevenue)}</div>
              <span className="sp-card-sub">After discounts</span>
            </div>
            <div className="sp-card">
              <div className="sp-card-label">TOTAL DISCOUNTS</div>
              <div className="sp-card-value">{formatCurrency(metrics.totalDiscounts)}</div>
              <span className="sp-badge sp-badge-warning">{`-${((metrics.totalDiscounts / (metrics.grossRevenue || 1)) * 100).toFixed(1)}%`}</span>
            </div>
            <div className="sp-card">
              <div className="sp-card-label">AOV</div>
              <div className="sp-card-value">{formatCurrency(metrics.aov)}</div>
              <span className="sp-card-sub">Per order</span>
            </div>
          </div>

          {/* ROW 2: Revenue Waterfall */}
          <div className="sp-card">
            <h3 className="sp-card-title">Revenue Waterfall</h3>
            <ClientChart options={waterfallOpts} series={waterfallSeries} type="bar" height={250} />
          </div>

          {/* ROW 3: Revenue by Day + Payment Methods */}
          <div className="sp-grid sp-grid-2-1">
            <div className="sp-card">
              <h3 className="sp-card-title">Revenue by Day</h3>
              <ClientChart options={revByDayOpts} series={revByDaySeries} type="bar" height={200} />
            </div>
            <div className="sp-card">
              <h3 className="sp-card-title">Payment Methods</h3>
              <ClientChart options={paymentOpts} series={paymentSeries} type="donut" height={200} />
            </div>
          </div>

          {/* ROW 4: Revenue by Country + Orders by Day of Week */}
          <div className="sp-grid sp-grid-2-1">
            <div className="sp-card">
              <h3 className="sp-card-title">Revenue by Country</h3>
              <ClientChart options={countryOpts} series={countrySeries} type="bar" height={200} />
            </div>
            <div className="sp-card">
              <h3 className="sp-card-title">Orders by Day of Week</h3>
              <ClientChart options={dayOfWeekOpts} series={dayOfWeekSeries} type="bar" height={200} />
            </div>
          </div>

          {/* ROW 5: Recent Orders */}
          <div className="sp-card">
            <h3 className="sp-card-title">Recent Orders</h3>
            <table className="sp-table">
              <thead>
                <tr><th>Order</th><th>Customer</th><th>Status</th><th>Amount</th></tr>
              </thead>
              <tbody>
                {(topOrders as any[]).map((order: any, i: number) => (
                  <tr key={i}>
                    <td>{order.name}</td>
                    <td>{order.customer}</td>
                    <td><span className="sp-badge sp-badge-warning">{order.status}</span></td>
                    <td>{formatCurrency(parseFloat(order.amount))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* ROW 6: AOV Analysis */}
          <div className="sp-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 className="sp-card-title" style={{ margin: 0 }}>AOV Analysis</h3>
              <span className="sp-badge sp-badge-success">{`Current: ${formatCurrency(metrics.aov)}`}</span>
            </div>
            <div className="sp-grid sp-grid-3">
              <div>
                <div className="sp-card-label">Total Orders</div>
                <div className="sp-card-value">{metrics.totalOrders}</div>
              </div>
              <div>
                <div className="sp-card-label">Avg Tax per Order</div>
                <div className="sp-card-value">{formatCurrency(metrics.totalOrders > 0 ? metrics.totalTax / metrics.totalOrders : 0)}</div>
              </div>
              <div>
                <div className="sp-card-label">Avg Shipping per Order</div>
                <div className="sp-card-value">{formatCurrency(metrics.totalOrders > 0 ? metrics.totalShipping / metrics.totalOrders : 0)}</div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
