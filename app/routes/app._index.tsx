import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { authenticate } from "../shopify.server";
import {
  LayoutDashboard, TrendingUp, Box, Users, Megaphone, Warehouse, BarChart3,
  Sparkles, Settings, ChevronDown, Calendar, Search, Bell, Moon, Sun, Menu,
  GripVertical, Maximize2, ArrowRight, UserPlus, Repeat, Activity, Zap,
  ChevronRight, Package, Truck, AlertCircle, CheckCircle, TrendingDown,
} from "lucide-react";

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

interface KPIData {
  label: string; value: string; trend: number;
  trendType: "positive" | "negative" | "neutral";
}
interface AlertItem {
  id: string; type: "critical" | "warning" | "info";
  title: string; description: string; timestamp: string;
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  const shopResponse = await admin.graphql(`
    query {
      shop { name currencyCode }
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges { node { id name totalPriceSet { shopMoney { amount currencyCode } } createdAt displayFinancialStatus } }
      }
      products(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges { node { id title totalInventory variants(first: 1) { edges { node { inventoryQuantity } } } } }
      }
    }
  `);
  const shopData = await shopResponse.json();
  const orders = shopData.data?.orders?.edges || [];
  const totalRevenue = orders.reduce((sum: number, edge: any) => sum + parseFloat(edge.node.totalPriceSet?.shopMoney?.amount || 0), 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
  return json({
    shopName: shopData.data?.shop?.name || "Your Store",
    currency: shopData.data?.shop?.currencyCode || "USD",
    shopDomain: session.shop,
    metrics: { revenue: totalRevenue, orders: orderCount, aov, conversionRate: 3.2, profitMargin: 18.4 },
    recentOrders: orders.slice(0, 5),
    products: shopData.data?.products?.edges || [],
  });
};

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
      <div className={`sp-sidebar-overlay ${isOpen ? "active" : ""}`} onClick={onToggle} />
      <aside className={`sp-sidebar ${isOpen ? "open" : ""}`}>
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #0096c7, #00b4d8)" }}>
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ShopifyPulse</span>
          </div>
        </div>
        <nav className="mt-2 pb-4">
          {navItems.map((item) => (
            <Link key={item.id} to={item.href} className={`sp-sidebar-link ${activePage === item.id ? "active" : ""}`}>
              <item.icon className="w-5 h-5" /><span>{item.label}</span>
            </Link>
          ))}
          <div className="sp-sidebar-separator" />
          <Link to="/app/ai-insights" className="sp-sidebar-link" style={{ color: "#7bcce8" }}>
            <Sparkles className="w-5 h-5" style={{ color: "#00b4d8" }} />
            <span>AI Insights</span>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "#0096c7", color: "#fff" }}>AI</span>
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

function TopBar({ onMenuToggle, isDark, onThemeToggle, shopName }: { onMenuToggle: () => void; isDark: boolean; onThemeToggle: () => void; shopName: string; }) {
  return (
    <header className="sp-top-bar">
      <div className="flex items-center gap-3">
        <button className="sp-icon-btn lg:hidden" onClick={onMenuToggle}><Menu className="w-5 h-5" /></button>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer border" style={{ background: "var(--bg-surface-secondary)", borderColor: "var(--border-default)", color: "var(--text-secondary)" }}>
          <Calendar className="w-4 h-4" /><span className="hidden sm:inline">Last 30 Days</span><ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
      <div className="flex-1 max-w-lg mx-4 lg:mx-8 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
          <input type="text" placeholder="Search ShopifyPulse..." className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition border" style={{ background: "var(--bg-surface-secondary)", borderColor: "var(--border-default)", color: "var(--text-primary)" }} />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button className="sp-ask-ai-btn"><Sparkles className="w-4 h-4" /><span className="hidden sm:inline">Ask AI</span></button>
        <button className="sp-icon-btn relative"><Bell className="w-[18px] h-[18px]" /><div className="sp-notif-badge">3</div></button>
        <button className="sp-icon-btn" onClick={onThemeToggle} title="Toggle theme">
          {isDark ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
        <div className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ml-1" style={{ background: "linear-gradient(135deg, #0077b6, #00b4d8)" }}>
          <span className="text-white text-sm font-semibold">{shopName.substring(0, 2).toUpperCase()}</span>
        </div>
      </div>
    </header>
  );
}

function KPICard({ label, value, trend, trendType, delay }: KPIData & { delay: number }) {
  const isPositive = trendType === "positive";
  const isNegative = trendType === "negative";
  const sparkOpts = {
    chart: { type: "area" as const, height: 32, sparkline: { enabled: true }, animations: { enabled: false } },
    stroke: { curve: "smooth" as const, width: 2 },
    fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.4, opacityTo: 0.05, stops: [0, 100] } },
    colors: [isPositive ? "#059669" : isNegative ? "#dc2626" : "#0077b6"],
    tooltip: { enabled: false },
  };
  return (
    <div className={`sp-kpi-card sp-animate-in sp-d${delay}`}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>{label}</div>
      <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{value}</div>
      <div className="flex items-center justify-between mt-3">
        <div className="w-20 h-8">
          <ClientChart options={sparkOpts} series={[{ data: [10, 15, 12, 18, 14, 20, 16, 22, 18, 25] }]} type="area" height={32} />
        </div>
        <span className={`sp-badge ${isPositive ? "sp-badge-green" : isNegative ? "sp-badge-red" : "sp-badge-yellow"}`}>
          {isPositive ? "+" : ""}{trend}%
        </span>
      </div>
    </div>
  );
}

function AIBriefBanner() {
  const insights = [
    { type: "success", text: "Revenue up 12% driven by SAVE20 promo success." },
    { type: "warning", text: "237 customers at churn risk - win-back campaign ready." },
    { type: "info", text: "3 SKUs will stockout within 5 days - reorder recommended." },
  ];
  return (
    <div className="sp-ai-brief sp-animate-in">
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 text-cyan-200" />
            <h2 className="text-lg font-bold text-white">AI Daily Brief</h2>
          </div>
          <div className="space-y-2">
            {insights.map((insight, i) => (
              <div key={i} className="flex items-center gap-2 text-sm" style={{ color: "rgba(179,224,240,0.9)" }}>
                <span className={`w-2 h-2 rounded-full ${i === 0 ? "sp-pulse-dot bg-teal-300" : i === 1 ? "bg-yellow-300" : "bg-blue-300"}`} />
                {insight.text}
              </div>
            ))}
          </div>
        </div>
        <button className="px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 backdrop-blur-sm whitespace-nowrap hover:bg-white/30" style={{ background: "rgba(255,255,255,0.2)", color: "#fff" }}>
          View Full Report <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function ChartCard({ title, children, delay = 0, className = "" }: { title: string; children: React.ReactNode; delay?: number; className?: string; }) {
  return (
    <div className={`sp-dash-card p-5 sp-animate-in ${delay > 0 ? `sp-d${delay}` : ""} ${className}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 opacity-0 hover:opacity-50 transition-opacity" style={{ color: "var(--text-secondary)" }} />
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>{title}</h3>
        </div>
        <button className="opacity-0 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Maximize2 className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>
      {children}
    </div>
  );
}

function AlertFeed() {
  const alerts: AlertItem[] = [
    { id: "1", type: "critical", title: "Revenue drop detected", description: "Revenue fell 18% vs. last Tuesday.", timestamp: "2m" },
    { id: "2", type: "warning", title: "High cart abandonment", description: "Spiked to 78% in the last hour.", timestamp: "15m" },
    { id: "3", type: "warning", title: "Shipping delay warning", description: "FedEx delays in Northeast region.", timestamp: "32m" },
    { id: "4", type: "info", title: "Organic traffic spike", description: "Up 34% from Google in 2 hours.", timestamp: "1h" },
    { id: "5", type: "critical", title: "Inventory critically low", description: "Blue Hoodie XL: 3 units left.", timestamp: "2h" },
  ];
  const getStyle = (t: string) => t === "critical" ? { bg: "bg-red-50", border: "border-red-100", dot: "red" } : t === "warning" ? { bg: "bg-yellow-50", border: "border-yellow-100", dot: "yellow" } : { bg: "bg-green-50", border: "border-green-100", dot: "green" };
  return (
    <div className="sp-dash-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <GripVertical className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>Alerts & Anomalies</h3>
      </div>
      <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
        {alerts.map((a) => { const s = getStyle(a.type); return (
          <div key={a.id} className={`sp-alert-item ${s.bg} border ${s.border}`}>
            <div className={`sp-alert-dot ${s.dot}`} />
            <div className="flex-1">
              <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>{a.title}</div>
              <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{a.description}</div>
            </div>
            <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{a.timestamp}</span>
          </div>
        ); })}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { shopName, metrics, currency } = useLoaderData<typeof loader>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const toggleTheme = () => { setIsDark(!isDark); document.documentElement.classList.toggle("dark"); };
  const formatCurrency = (value: number) => new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: value > 1000 ? 0 : 2, maximumFractionDigits: value > 1000 ? 0 : 2 }).format(value);
  const kpiData: KPIData[] = [
    { label: "Revenue", value: formatCurrency(metrics.revenue), trend: 12, trendType: "positive" },
    { label: "Orders", value: metrics.orders.toString(), trend: 5, trendType: "positive" },
    { label: "AOV", value: formatCurrency(metrics.aov), trend: 2, trendType: "negative" },
    { label: "CR", value: `${metrics.conversionRate}%`, trend: 1.5, trendType: "positive" },
    { label: "Profit", value: `${metrics.profitMargin}%`, trend: 8, trendType: "positive" },
  ];

  const revByHourOpts = { chart: { type: "bar" as const, height: 230, toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 4, columnWidth: "55%", distributed: true } }, colors: ["#94a3b8","#94a3b8","#94a3b8","#f59e0b","#f97316","#ef4444","#ef4444","#f97316","#f59e0b","#22c55e","#22c55e","#22c55e","#ef4444","#f97316","#f59e0b","#22c55e","#22c55e","#f59e0b","#94a3b8","#94a3b8","#94a3b8","#94a3b8","#94a3b8","#94a3b8"], legend: { show: false }, xaxis: { categories: ["12a","1a","2a","3a","4a","5a","6a","7a","8a","9a","10a","11a","12p","1p","2p","3p","4p","5p","6p","7p","8p","9p","10p","11p"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => `$${(v/1000).toFixed(1)}K` } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false }, tooltip: { y: { formatter: (v: number) => `$${v.toLocaleString()}` } } };
  const revByHourSeries = [{ name: "Revenue", data: [200,100,150,180,120,300,400,800,1200,1500,1400,1600,2200,1800,1400,1600,1380,1200,900,700,500,400,300,200] }];

  const gaugeOpts = { chart: { type: "radialBar" as const, height: 220 }, plotOptions: { radialBar: { startAngle: -135, endAngle: 135, track: { background: "#e7e7e7", strokeWidth: "100%" }, dataLabels: { name: { show: true, fontSize: "14px", offsetY: 20, color: "#0077b6" }, value: { fontSize: "36px", fontWeight: 700, color: "#023e58", offsetY: -15, formatter: () => "78" } }, hollow: { size: "65%" } } }, colors: ["#0077b6"], stroke: { lineCap: "round" as const }, labels: ["Health Score"] };

  const revByChannelOpts = { chart: { type: "area" as const, height: 230, toolbar: { show: false }, stacked: false }, stroke: { curve: "smooth" as const, width: 2 }, colors: ["#0077b6", "#22c55e", "#f59e0b"], fill: { type: "gradient", gradient: { shadeIntensity: 1, opacityFrom: 0.3, opacityTo: 0.05 } }, xaxis: { categories: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => `$${(v/1000).toFixed(0)}K` } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false }, legend: { position: "bottom" as const, fontSize: "11px" } };
  const revByChannelSeries = [{ name: "Online Store", data: [8000,9200,7800,10500,14200,11000,9500] }, { name: "Social", data: [2000,2400,3100,2800,3500,4200,3000] }, { name: "Marketplace", data: [1500,1800,1200,2000,2800,2200,1800] }];

  const trafficOpts = { chart: { type: "donut" as const, height: 230 }, labels: ["Organic","Paid","Social","Direct"], colors: ["#0077b6","#8b5cf6","#22c55e","#ef4444"], plotOptions: { pie: { donut: { size: "65%", labels: { show: true, total: { show: true, label: "Total", fontSize: "12px", formatter: () => "100" } } } } }, dataLabels: { enabled: true, formatter: (v: number) => `${v.toFixed(0)}%` }, legend: { position: "bottom" as const, fontSize: "11px" } };
  const trafficSeries = [42, 28, 18, 12];

  const funnelColors = ["#0077b6","#0096c7","#22c55e","#f59e0b","#ef4444"];
  const funnelData = [{n:"Visitors",v:12500},{n:"Cart",v:8200},{n:"Checkout",v:4100},{n:"Purchase",v:1800},{n:"Repeat",v:680}];

  const heatmapData = [
    {name:"Traffic",data:[{x:"Mon",y:82},{x:"Tue",y:61},{x:"Wed",y:23},{x:"Thu",y:48},{x:"Fri",y:85},{x:"Sat",y:33},{x:"Sun",y:81}]},
    {name:"AOV",data:[{x:"Mon",y:27},{x:"Tue",y:57},{x:"Wed",y:63},{x:"Thu",y:38},{x:"Fri",y:38},{x:"Sat",y:30},{x:"Sun",y:64}]},
    {name:"Conversion",data:[{x:"Mon",y:18},{x:"Tue",y:76},{x:"Wed",y:36},{x:"Thu",y:58},{x:"Fri",y:57},{x:"Sat",y:31},{x:"Sun",y:54}]},
    {name:"Orders",data:[{x:"Mon",y:77},{x:"Tue",y:20},{x:"Wed",y:55},{x:"Thu",y:19},{x:"Fri",y:59},{x:"Sat",y:40},{x:"Sun",y:25}]},
    {name:"Revenue",data:[{x:"Mon",y:13},{x:"Tue",y:50},{x:"Wed",y:46},{x:"Thu",y:40},{x:"Fri",y:11},{x:"Sat",y:23},{x:"Sun",y:81}]},
  ];
  const heatmapOpts = { chart: { type: "heatmap" as const, height: 230, toolbar: { show: false } }, plotOptions: { heatmap: { radius: 4, colorScale: { ranges: [{from:0,to:20,color:"#e2e8f0",name:"Low"},{from:21,to:40,color:"#22c55e",name:"Med-Low"},{from:41,to:60,color:"#f59e0b",name:"Medium"},{from:61,to:80,color:"#f97316",name:"High"},{from:81,to:100,color:"#ef4444",name:"Very High"}] } } }, dataLabels: { enabled: true, style: { fontSize: "10px", colors: ["#fff"] } }, xaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" } } } };

  const salesHeatData = [
    {name:"Wk4",data:[{x:"Mon",y:24},{x:"Tue",y:28},{x:"Wed",y:16},{x:"Thu",y:14},{x:"Fri",y:74},{x:"Sat",y:20},{x:"Sun",y:62}]},
    {name:"Wk3",data:[{x:"Mon",y:35},{x:"Tue",y:39},{x:"Wed",y:28},{x:"Thu",y:45},{x:"Fri",y:74},{x:"Sat",y:19},{x:"Sun",y:51}]},
    {name:"Wk2",data:[{x:"Mon",y:22},{x:"Tue",y:25},{x:"Wed",y:57},{x:"Thu",y:24},{x:"Fri",y:30},{x:"Sat",y:44},{x:"Sun",y:14}]},
    {name:"Wk1",data:[{x:"Mon",y:35},{x:"Tue",y:36},{x:"Wed",y:22},{x:"Thu",y:61},{x:"Fri",y:13},{x:"Sat",y:15},{x:"Sun",y:5}]},
  ];
  const salesHeatOpts = { chart: { type: "heatmap" as const, height: 200, toolbar: { show: false } }, plotOptions: { heatmap: { radius: 4, colorScale: { ranges: [{from:0,to:20,color:"#e2e8f0",name:"Low"},{from:21,to:40,color:"#22c55e",name:"Med-Low"},{from:41,to:60,color:"#f59e0b",name:"Medium"},{from:61,to:80,color:"#f97316",name:"High"},{from:81,to:100,color:"#ef4444",name:"Very High"}] } } }, dataLabels: { enabled: true, style: { fontSize: "10px", colors: ["#fff"] } }, xaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" } } } };

  const yoyOpts = { chart: { type: "bar" as const, height: 230, toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 3, columnWidth: "40%" } }, colors: ["#0077b6","#22c55e"], xaxis: { categories: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => `$${(v/1000).toFixed(0)}K` } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false }, legend: { position: "top" as const, horizontalAlign: "right" as const } };
  const yoySeries = [{ name: "2025", data: [42000,38000,55000,48000,62000,58000,95000,72000,68000,0,0,0] }, { name: "2024", data: [35000,32000,45000,42000,52000,49000,78000,65000,60000,55000,48000,42000] }];

  const waterfallOpts = { chart: { type: "bar" as const, height: 220, toolbar: { show: false } }, plotOptions: { bar: { borderRadius: 3, columnWidth: "50%" } }, colors: ["#22c55e","#ef4444","#ef4444","#f97316","#f59e0b"], xaxis: { categories: ["Gross","Discounts","Shipping","COGS","Ad Spend"], labels: { style: { colors: "#6b8299", fontSize: "10px" } } }, yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" }, formatter: (v: number) => `$${(v/1000).toFixed(0)}K` } }, grid: { borderColor: "#e2e8f0", strokeDashArray: 3 }, dataLabels: { enabled: false } };
  const waterfallSeries = [{ name: "Amount", data: [148000, 21500, 12000, 45000, 18500] }];

  const custAcqOpts = { chart: { type: "donut" as const, height: 200 }, labels: ["New","Returning"], colors: ["#0077b6","#22c55e"], plotOptions: { pie: { donut: { size: "70%", labels: { show: true, total: { show: true, label: "Total", fontSize: "12px", formatter: () => "12,847" } } } } }, dataLabels: { enabled: false }, legend: { show: false } };
  const custAcqSeries = [842, 12005];

  const goalData = [
    { label: "Revenue: $150K", pct: 78, color: "#0077b6" },
    { label: "Orders: 2,000", pct: 65, color: "#22c55e" },
    { label: "Customers: 1,000", pct: 84, color: "#22c55e" },
    { label: "Profit Margin: 20%", pct: 92, color: "#8b5cf6" },
    { label: "Ad ROAS: 4.0x", pct: 60, color: "#ef4444" },
  ];

  const coupons = [
    { name: "SAVE20", uses: 500 }, { name: "WELCOME10", uses: 450 },
    { name: "BLACKFRIDAY", uses: 300 }, { name: "VIPONLY", uses: 200 }, { name: "SOCIAL15", uses: 100 },
  ];

  const aiActions = [
    { text: "Restock Blue Hoodie XL - 3 days left", tag: "Inventory", btn: "Action", color: "#ef4444" },
    { text: "Disable SAVE20 coupon - $4.2K loss", tag: "Discounts", btn: "Disable", color: "#ef4444" },
    { text: "Shift $2.2K budget Meta to Google", tag: "Marketing", btn: "Review", color: "#f59e0b" },
    { text: "Win-back flow for 237 customers", tag: "CRM", btn: "Set Up", color: "#22c55e" },
    { text: "Asia-Pacific expansion review +15%", tag: "Strategy", btn: "Explore", color: "#22c55e" },
  ];

  const fulfillSteps = [
    { label: "Received", value: 312, color: "#0077b6" },
    { label: "Processing", value: 45, color: "#f59e0b" },
    { label: "Shipped", value: 198, color: "#f97316" },
    { label: "Delivered", value: 52, color: "#22c55e" },
    { label: "Completed", value: 17, color: "#0096c7" },
  ];
  return (
    <div className={isDark ? "dark" : ""}>
      <Sidebar isOpen={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} activePage="dashboard" />
      <div className="sp-main-content">
        <TopBar onMenuToggle={() => setSidebarOpen(!sidebarOpen)} isDark={isDark} onThemeToggle={toggleTheme} shopName={shopName} />
        <main className="p-4 lg:p-6 space-y-4">
          <AIBriefBanner />
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {kpiData.map((kpi, i) => (<KPICard key={kpi.label} {...kpi} delay={i + 1} />))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard title="Revenue by Hour" delay={1} className="lg:col-span-3">
              <ClientChart options={revByHourOpts} series={revByHourSeries} type="bar" height={230} />
            </ChartCard>
            <ChartCard title="Store Health Score" delay={2} className="lg:col-span-2">
              <div className="flex justify-center"><ClientChart options={gaugeOpts} series={[78]} type="radialBar" height={220} /></div>
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ChartCard title="Revenue by Channel" delay={3}>
              <ClientChart options={revByChannelOpts} series={revByChannelSeries} type="area" height={230} />
            </ChartCard>
            <ChartCard title="Traffic Sources" delay={4}>
              <ClientChart options={trafficOpts} series={trafficSeries} type="donut" height={230} />
            </ChartCard>
            <ChartCard title="Conversion Funnel" delay={5}>
              <div className="space-y-2 py-2">
                {funnelData.map((item, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="rounded-md py-1.5 text-center text-white text-xs font-bold" style={{ background: funnelColors[i], width: `${(item.v / 12500) * 100}%`, minWidth: "60px" }}>{item.v.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <ChartCard title="Weekly Performance Scorecard" delay={6}>
                <ClientChart options={heatmapOpts} series={heatmapData} type="heatmap" height={230} />
              </ChartCard>
            </div>
            <div className="lg:col-span-5"><AlertFeed /></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Sales Heatmap" delay={7}>
              <ClientChart options={salesHeatOpts} series={salesHeatData} type="heatmap" height={200} />
            </ChartCard>
            <ChartCard title="YoY Revenue" delay={8}>
              <ClientChart options={yoyOpts} series={yoySeries} type="bar" height={230} />
            </ChartCard>
          </div>
          {/* FULFILLMENT & SHIPPING */}
          <div className="sp-section-label">FULFILLMENT & SHIPPING</div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCard title="Order Fulfillment Pipeline" delay={9}>
              <div className="flex items-center gap-1 mb-4">
                {fulfillSteps.map((step, i) => (
                  <div key={i} className="flex-1 text-center">
                    <div className="text-lg font-bold" style={{ color: step.color }}>{step.value}</div>
                    <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{step.label}</div>
                    {i < fulfillSteps.length - 1 && <ChevronRight className="w-4 h-4 mx-auto" style={{ color: "var(--text-secondary)" }} />}
                  </div>
                ))}
              </div>
              <div className="text-xs" style={{ color: "var(--text-secondary)" }}>Avg Fulfillment: <b>2.3 days</b></div>
              <div className="mt-2 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: "rgba(0,119,182,0.08)", color: "#0077b6" }}>
                <Sparkles className="w-3.5 h-3.5" /> 12 orders stuck in Processing &gt; 48hrs. Suggest bulk-fulfillment action.
              </div>
            </ChartCard>
            <ChartCard title="Shipping Performance" delay={10}>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center"><div className="text-xl font-bold" style={{ color: "#22c55e" }}>94.2%</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>On-Time</div></div>
                <div className="text-center"><div className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>$6.80</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Avg Cost</div></div>
                <div className="text-center"><div className="text-xl font-bold" style={{ color: "#ef4444" }}>8</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Exceptions</div></div>
              </div>
              <div className="space-y-2">
                {[{n:"USPS",v:92},{n:"FedEx",v:88},{n:"DHL",v:95}].map((c) => (
                  <div key={c.n} className="flex items-center gap-2">
                    <span className="text-xs w-12" style={{ color: "var(--text-secondary)" }}>{c.n}</span>
                    <div className="flex-1 h-2 rounded-full" style={{ background: "var(--bg-surface-secondary)" }}>
                      <div className="h-2 rounded-full" style={{ width: `${c.v}%`, background: c.v > 90 ? "#22c55e" : "#f59e0b" }} />
                    </div>
                    <span className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>~{c.v}%</span>
                  </div>
                ))}
              </div>
            </ChartCard>
          </div>
          {/* INVENTORY, CUSTOMERS & PROFITABILITY */}
          <div className="sp-section-label">INVENTORY, CUSTOMERS & PROFITABILITY</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Inventory Health" delay={11}>
              <div className="grid grid-cols-4 gap-2 mb-3">
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>1,248</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Total</div></div>
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "#22c55e" }}>1,102</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>In Stock</div></div>
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "#f59e0b" }}>98</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Low</div></div>
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "#ef4444" }}>48</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Out</div></div>
              </div>
              <div className="text-xs font-medium mb-2" style={{ color: "var(--text-primary)" }}>Top SKUs at Risk</div>
              <div className="space-y-1">
                {["Blue Hoodie XL","White Sneakers M","Black T-Shirt L"].map((s) => (
                  <div key={s} className="flex items-center justify-between text-xs p-1.5 rounded" style={{ background: "var(--bg-surface-secondary)" }}>
                    <span style={{ color: "var(--text-primary)" }}>{s}</span>
                    <span className="font-medium" style={{ color: "#ef4444" }}>5d</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: "rgba(0,119,182,0.08)", color: "#0077b6" }}>
                <Sparkles className="w-3.5 h-3.5" /> 3 top-selling SKUs will stockout within 5 days.
              </div>
            </ChartCard>
            <ChartCard title="Customer Acquisition" delay={12}>
              <div className="flex justify-center mb-3"><ClientChart options={custAcqOpts} series={custAcqSeries} type="donut" height={160} /></div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span style={{ color: "var(--text-secondary)" }}>New: </span><b>842</b> <span style={{ color: "#22c55e" }}>+5.1%</span></div>
                <div><span style={{ color: "var(--text-secondary)" }}>CAC: </span><b>$12.40</b> <span style={{ color: "#22c55e" }}>-3%</span></div>
                <div><span style={{ color: "var(--text-secondary)" }}>LTV:CAC: </span><b>3.2x</b></div>
                <div><span style={{ color: "var(--text-secondary)" }}>Churn: </span><b>14%</b> <span style={{ color: "#ef4444" }}>+3.2%</span></div>
              </div>
            </ChartCard>
            <ChartCard title="Profit & Cost Waterfall" delay={13}>
              <ClientChart options={waterfallOpts} series={waterfallSeries} type="bar" height={220} />
              <div className="mt-1 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: "rgba(0,119,182,0.08)", color: "#0077b6" }}>
                <Sparkles className="w-3.5 h-3.5" /> Discounts & returns = 14.5% of gross. Up 3% vs. last period.
              </div>
            </ChartCard>
          </div>
          {/* GOALS, DISCOUNTS & AI ACTIONS */}
          <div className="sp-section-label">GOALS, DISCOUNTS & AI ACTIONS</div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <ChartCard title="Monthly Goal Tracker" delay={14}>
              <div className="space-y-3">
                {goalData.map((g, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span style={{ color: "var(--text-primary)" }}>{g.label}</span>
                      <span className="font-semibold" style={{ color: g.color }}>{g.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full" style={{ background: "var(--bg-surface-secondary)" }}>
                      <div className="h-2 rounded-full transition-all" style={{ width: `${g.pct}%`, background: g.color }} />
                    </div>
                    <div className="text-[10px] mt-0.5" style={{ color: "var(--text-secondary)" }}>8 days remaining</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 rounded-lg text-xs flex items-center gap-2" style={{ background: "rgba(0,119,182,0.08)", color: "#0077b6" }}>
                <Sparkles className="w-3.5 h-3.5" /> You'll miss Revenue target by ~$12K. Increase Google Shopping spend.
              </div>
            </ChartCard>
            <ChartCard title="Discount & Coupon Health" delay={15}>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>12</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Active</div></div>
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>$12.4K</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Discounted</div></div>
                <div className="text-center"><div className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>$8.20</div><div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>Avg/Order</div></div>
              </div>
              <div className="space-y-1.5">
                {coupons.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs p-1.5 rounded" style={{ background: "var(--bg-surface-secondary)" }}>
                    <span className="font-mono font-medium" style={{ color: "var(--text-primary)" }}>{c.name}</span>
                    <span style={{ color: "var(--text-secondary)" }}>{c.uses} uses</span>
                  </div>
                ))}
              </div>
              <div className="mt-2 p-2 rounded-lg text-xs" style={{ background: "rgba(239,68,68,0.08)", color: "#ef4444" }}>
                SAVE20 leaked to 3 sites. 847 unauthorized uses. -$4,200
              </div>
            </ChartCard>
            <ChartCard title="AI Action Items" delay={16}>
              <div className="space-y-2">
                {aiActions.map((a, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs p-2 rounded-lg" style={{ background: "var(--bg-surface-secondary)" }}>
                    <div className="flex-1">
                      <div style={{ color: "var(--text-primary)" }}>{a.text}</div>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: "rgba(0,119,182,0.1)", color: "#0077b6" }}>{a.tag}</span>
                    </div>
                    <button className="px-2 py-1 rounded text-[10px] font-medium text-white" style={{ background: a.color }}>{a.btn}</button>
                  </div>
                ))}
              </div>
              <a href="#" className="block text-center text-xs mt-3 font-medium" style={{ color: "#0077b6" }}>View All 12 Actions</a>
            </ChartCard>
          </div>
          <footer className="sp-page-footer">
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--accent-primary)" }}>Export Report</button>
              <button className="px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--accent-primary)" }}>Schedule</button>
            </div>
            <div style={{ color: "var(--text-secondary)" }}>Showing: Last 30 Days | All Channels</div>
          </footer>
        </main>
      </div>
    </div>
  );
}
