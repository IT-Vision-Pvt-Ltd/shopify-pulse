import { useLoaderData, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState, useEffect, lazy, Suspense } from "react";
import { authenticate } from "../shopify.server";
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
  if (!isClient) return <div style={{ height: props.height || 230 }} />;
  return (
    <Suspense fallback={<div style={{ height: props.height || 230 }} />}>
      <Chart {...props} />
    </Suspense>
  );
}

function Sidebar({ isOpen, onToggle, activePage }: { isOpen: boolean; onToggle: () => void; activePage: string; }) {
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
      <aside className={`sp-sidebar ${isOpen ? "open" : ""}`}>
        <div className="sp-sidebar-header">
          <img src="https://shopifyapp.itvision.com.pk/HTML/img/growthpilot-logo.svg" alt="GrowthPilot AI" className="sp-sidebar-logo" />
          <span className="sp-sidebar-title">ShopifyPulse</span>
        </div>
        <nav className="sp-sidebar-nav">
          {navItems.map((item) => (
            <Link key={item.id} to={item.href} className={`sp-sidebar-link ${activePage === item.id ? "active" : ""}`}>
              <item.icon className="w-5 h-5" /><span>{item.label}</span>
            </Link>
          ))}
          <div className="sp-sidebar-separator" />
          <Link to="/app/ai-insights" className="sp-sidebar-link" style={{ color: "#7bcce8" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#00b4d8" }} />
            <span>AI Insights</span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#0096c7", color: "#fff" }}>{`AI`}</span>
          </Link>
          <Link to="/app/settings" className="sp-sidebar-link"><Settings className="w-5 h-5" /><span>Settings</span></Link>
        </nav>
        <div className="mt-auto p-3">
          <div className="sp-store-selector"><span>Select Store</span><ChevronDown className="w-4 h-4" /></div>
        </div>
      </aside>
    </>
  );
}

function TopBar({ onMenuToggle, isDark, onThemeToggle, shopName, dateRange }: { onMenuToggle: () => void; isDark: boolean; onThemeToggle: () => void; shopName: string; dateRange: number; }) {
  return (
    <header className="sp-topbar">
      <div className="sp-topbar-left">
        <button onClick={onMenuToggle} className="sp-menu-btn"><Menu size={20} /></button>
        <div className="sp-date-selector">
          <Calendar size={16} />
          <select className="bg-transparent border-none text-sm cursor-pointer outline-none" value={dateRange || 30} onChange={(e) => { const newRange = e.target.value; window.location.href = `?dateRange=${newRange}`; }}>
            <option value="7">Last 7 Days</option>
            <option value="14">Last 14 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="60">Last 60 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>
      <div className="sp-topbar-center">
        <div className="relative w-full max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text-secondary)" }} />
          <input type="text" placeholder="Search ShopifyPulse..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition border" style={{ background: "var(--bg-surface-secondary)", borderColor: "var(--border-default)", color: "var(--text-primary)" }} />
        </div>
      </div>
      <div className="sp-topbar-right">
        <button className="sp-topbar-btn sp-ask-ai-btn"><Sparkles size={16} /> Ask AI</button>
        <button className="sp-topbar-btn relative"><Bell size={18} /><span className="sp-notification-badge">{`3`}</span></button>
        <button onClick={onThemeToggle} className="sp-topbar-btn">{isDark ? <Sun size={18} /> : <Moon size={18} />}</button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ml-1" style={{ background: "linear-gradient(135deg, #0077b6, #00b4d8)" }}>
          <span className="text-white text-sm font-semibold">{shopName.substring(0, 2).toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const url = new URL(request.url);
  const dateRange = url.searchParams.get("dateRange") || "30";
  const daysBack = parseInt(dateRange, 10) || 30;
  const now = new Date();
  const d30 = new Date(now.getTime() - daysBack * 86400000);
  const nowISO = now.toISOString();
  const d30ISO = d30.toISOString();

  const shopResponse = await admin.graphql(`
    query SalesData($cur30: String!) {
      shop { name currencyCode }
      currentOrders: orders(first: 250, query: $cur30) {
        edges { node {
          id createdAt
          displayFinancialStatus
          totalPriceSet { shopMoney { amount } }
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          customer { id }
        }}
      }
    }`, {
    variables: { cur30: `created_at:>${d30ISO}` }
  });

  const shopData = await shopResponse.json();
  const curOrders = shopData.data?.currentOrders?.edges || [];
  const currency = shopData.data?.shop?.currencyCode || "USD";
  const shopName = shopData.data?.shop?.name || "Your Store";

  const grossRevenue = curOrders.reduce((s: number, e: any) => s + parseFloat(e.node.totalPriceSet?.shopMoney?.amount || 0), 0);
  const totalDiscounts = curOrders.reduce((s: number, e: any) => s + parseFloat(e.node.totalDiscountsSet?.shopMoney?.amount || 0), 0);
  const totalShipping = curOrders.reduce((s: number, e: any) => s + parseFloat(e.node.totalShippingPriceSet?.shopMoney?.amount || 0), 0);
  const netRevenue = grossRevenue - totalDiscounts;
  const orderCount = curOrders.length;
  const aov = orderCount > 0 ? grossRevenue / orderCount : 0;
  const avgShipping = orderCount > 0 ? totalShipping / orderCount : 0;

  // Revenue waterfall
  const estCOGS = grossRevenue * 0.35;
  const estAdSpend = grossRevenue * 0.12;
  const netProfit = grossRevenue - totalDiscounts - totalShipping - estCOGS - estAdSpend;

  // Revenue by day of week
  const dayRevenue = new Array(7).fill(0);
  curOrders.forEach((e: any) => {
    const day = new Date(e.node.createdAt).getDay();
    dayRevenue[day] += parseFloat(e.node.totalPriceSet?.shopMoney?.amount || 0);
  });
  const revenueByDay = [dayRevenue[1],dayRevenue[2],dayRevenue[3],dayRevenue[4],dayRevenue[5],dayRevenue[6],dayRevenue[0]];

  // Payment methods (from financial status)
  const paymentMap: Record<string, number> = {};
  curOrders.forEach((e: any) => {
    const s = e.node.displayFinancialStatus || "UNKNOWN";
    paymentMap[s] = (paymentMap[s] || 0) + 1;
  });

  // Revenue by country (using shipping address is not in current query, use placeholder)
  const countryRevenue = [
    { country: "Domestic", revenue: grossRevenue * 0.7 },
    { country: "International", revenue: grossRevenue * 0.3 },
  ];

  // Orders by day of week
  const dayOrders = new Array(7).fill(0);
  curOrders.forEach((e: any) => {
    const day = new Date(e.node.createdAt).getDay();
    dayOrders[day] += 1;
  });
  const ordersByDay = [dayOrders[1],dayOrders[2],dayOrders[3],dayOrders[4],dayOrders[5],dayOrders[6],dayOrders[0]];

  // Recent orders
  const recentOrders = curOrders.slice(0, 8).map((e: any) => ({
    id: e.node.id.split("/").pop(),
    date: new Date(e.node.createdAt).toLocaleDateString(),
    amount: parseFloat(e.node.totalPriceSet?.shopMoney?.amount || 0),
    status: e.node.displayFinancialStatus,
  }));

  // AOV over time (last 7 days)
  const aovByDay: number[] = [];
  const aovLabels: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now.getTime() - i * 86400000);
    dayStart.setHours(0,0,0,0);
    const dayEnd = new Date(dayStart.getTime() + 86400000);
    let dayRev = 0, dayOrd = 0;
    curOrders.forEach((e: any) => {
      const d = new Date(e.node.createdAt);
      if (d >= dayStart && d < dayEnd) {
        dayRev += parseFloat(e.node.totalPriceSet?.shopMoney?.amount || 0);
        dayOrd += 1;
      }
    });
    aovByDay.push(dayOrd > 0 ? dayRev / dayOrd : 0);
    aovLabels.push(dayStart.toLocaleDateString("en", { weekday: "short" }));
  }

  return json({
    shopName, currency, dateRange: daysBack,
    metrics: { grossRevenue, netRevenue, totalDiscounts, totalShipping, orderCount, aov, avgShipping, netProfit, estCOGS, estAdSpend },
    revenueByDay, ordersByDay, paymentMap, countryRevenue, recentOrders, aovByDay, aovLabels,
  });
};

export default function SalesRevenue() {
  const { shopName, currency, dateRange, metrics, revenueByDay, ordersByDay, paymentMap, countryRevenue, recentOrders, aovByDay, aovLabels } = useLoaderData<any>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => { setIsDark(!isDark); document.documentElement.classList.toggle("dark"); };

  const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);

  const waterfallOpts = { chart: { type: "bar" as const, height: 250, toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 4, columnWidth: "50%" } }, colors: ["#22c55e","#ef4444","#ef4444","#f97316","#f59e0b","#0077b6"], xaxis: { categories: ["Gross Rev","Discounts","Shipping","COGS","Ad Spend","Net Profit"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => formatCurrency(v) } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false } };
  const waterfallSeries = [{ name: "Amount", data: [metrics.grossRevenue, metrics.totalDiscounts, metrics.totalShipping, metrics.estCOGS, metrics.estAdSpend, metrics.netProfit] }];

  const revByDayOpts = { chart: { type: "bar" as const, height: 200, toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 4, columnWidth: "55%" } }, colors: ["#0077b6"], xaxis: { categories: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => formatCurrency(v) } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false } };
  const revByDaySeries = [{ name: "Revenue", data: revenueByDay || [0,0,0,0,0,0,0] }];

  const paymentLabels = Object.keys(paymentMap || {});
  const paymentValues = Object.values(paymentMap || {}) as number[];
  const paymentOpts = { chart: { type: "donut" as const, height: 200 }, labels: paymentLabels.length > 0 ? paymentLabels : ["No Data"], colors: ["#0077b6","#22c55e","#f59e0b","#ef4444","#8b5cf6"], plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total", fontSize: "12px" } } } } }, dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(0)}%` }, legend: { position: "bottom" as const, fontSize: "11px" } };
  const paymentSeries = paymentValues.length > 0 ? paymentValues : [1];

  const countryOpts = { chart: { type: "bar" as const, height: 200, toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 4, horizontal: true, columnWidth: "55%" } }, colors: ["#8b5cf6"], xaxis: { categories: (countryRevenue || []).map((c: any) => c.country), labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false } };
  const countrySeries = [{ name: "Revenue", data: (countryRevenue || []).map((c: any) => c.revenue) }];

  const ordersByDayOpts = { chart: { type: "radar" as const, height: 200, toolbar: { show: false } }, colors: ["#22c55e"], xaxis: { categories: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"] }, yaxis: { show: false }, dataLabels: { enabled: false }, markers: { size: 3 } };
  const ordersByDaySeries = [{ name: "Orders", data: ordersByDay || [0,0,0,0,0,0,0] }];

  const aovOpts = { chart: { type: "line" as const, height: 200, toolbar: { show: false } }, colors: ["#f59e0b"], stroke: { curve: "smooth" as const, width: 3 }, xaxis: { categories: aovLabels || ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => formatCurrency(v) } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false }, markers: { size: 4 } };
  const aovSeries = [{ name: "AOV", data: aovByDay || [0,0,0,0,0,0,0] }];

  return (
    <div className={isDark ? "dark" : ""}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} activePage="sales" />
      <div className="sp-main-content">
        <TopBar dateRange={dateRange} onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isDark={isDark} onThemeToggle={toggleTheme} shopName={shopName} />
        <main className="p-4 lg:p-6 space-y-4">
          <h2 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>Sales & Revenue Analytics</h2>

          {/* ROW 1: Revenue KPI Strip */}
          <div className="sp-grid sp-grid-5">
            <div className="sp-card"><div className="sp-card-label">GROSS REVENUE</div><div className="sp-card-value">{formatCurrency(metrics.grossRevenue)}</div><span className="sp-card-sub">{`${metrics.orderCount} orders`}</span></div>
            <div className="sp-card"><div className="sp-card-label">NET REVENUE</div><div className="sp-card-value">{formatCurrency(metrics.netRevenue)}</div><span className="sp-card-sub">After discounts</span></div>
            <div className="sp-card"><div className="sp-card-label">TOTAL DISCOUNTS</div><div className="sp-card-value">{formatCurrency(metrics.totalDiscounts)}</div><span className="sp-badge sp-badge-warning">{`-${((metrics.totalDiscounts / (metrics.grossRevenue || 1)) * 100).toFixed(1)}%`}</span></div>
            <div className="sp-card"><div className="sp-card-label">AOV</div><div className="sp-card-value">{formatCurrency(metrics.aov)}</div><span className="sp-card-sub">Per order</span></div>
            <div className="sp-card"><div className="sp-card-label">AVG SHIPPING</div><div className="sp-card-value">{formatCurrency(metrics.avgShipping)}</div><span className="sp-card-sub">Per order</span></div>
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
              <ClientChart options={ordersByDayOpts} series={ordersByDaySeries} type="radar" height={200} />
            </div>
          </div>

          {/* ROW 5: Recent Orders */}
          <div className="sp-card">
            <h3 className="sp-card-title">Recent Orders</h3>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--border-default)" }}>
                    <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>Order ID</th>
                    <th style={{ textAlign: "left", padding: "8px", color: "var(--text-secondary)" }}>Date</th>
                    <th style={{ textAlign: "right", padding: "8px", color: "var(--text-secondary)" }}>Amount</th>
                    <th style={{ textAlign: "center", padding: "8px", color: "var(--text-secondary)" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {(recentOrders || []).map((o: any, i: number) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--border-default)" }}>
                      <td style={{ padding: "8px", color: "var(--text-primary)" }}>#{o.id}</td>
                      <td style={{ padding: "8px", color: "var(--text-secondary)" }}>{o.date}</td>
                      <td style={{ textAlign: "right", padding: "8px", color: "var(--text-primary)", fontWeight: 600 }}>{formatCurrency(o.amount)}</td>
                      <td style={{ textAlign: "center", padding: "8px" }}><span className={`sp-badge ${o.status === "PAID" ? "sp-badge-green" : o.status === "REFUNDED" ? "sp-badge-red" : "sp-badge-yellow"}`}>{o.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ROW 6: AOV Trend + Avg Shipping */}
          <div className="sp-grid sp-grid-2-1">
            <div className="sp-card">
              <h3 className="sp-card-title">AOV Trend (Last 7 Days)</h3>
              <ClientChart options={aovOpts} series={aovSeries} type="line" height={200} />
            </div>
            <div className="sp-card">
              <h3 className="sp-card-title">Avg Shipping per Order</h3>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "180px" }}>
                <div style={{ fontSize: "36px", fontWeight: 700, color: "var(--text-primary)" }}>{formatCurrency(metrics.avgShipping)}</div>
                <div style={{ color: "var(--text-secondary)", marginTop: "8px" }}>per order average</div>
                <div style={{ color: "var(--text-secondary)", fontSize: "12px", marginTop: "4px" }}>{`Total shipping: ${formatCurrency(metrics.totalShipping)}`}</div>
              </div>
            </div>
          </div>

        </main>
      </div>
    </div>
  );
}
