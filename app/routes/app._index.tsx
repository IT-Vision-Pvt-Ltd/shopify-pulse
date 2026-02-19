import { useLoaderData, useSearchParams, Link } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { useState, useEffect, useMemo } from "react";
import { authenticate } from "../shopify.server";
import {
  LayoutDashboard,
  TrendingUp,
  Box,
  Users,
  Megaphone,
  Warehouse,
  BarChart3,
  Sparkles,
  Settings,
  ChevronDown,
  Calendar,
  Search,
  Bell,
  Moon,
  Sun,
  Menu,
  GripVertical,
  Maximize2,
  ArrowRight,
  UserPlus,
  Repeat,
  Activity,
  Zap,
  ChevronRight,
  Package,
  Truck,
  AlertCircle,
  CheckCircle,
  TrendingDown,
} from "lucide-react";
import Chart from "react-apexcharts";

// Types
interface KPIData {
  label: string;
  value: string;
  trend: number;
  trendType: "positive" | "negative" | "neutral";
}

interface AlertItem {
  id: string;
  type: "critical" | "warning" | "info";
  title: string;
  description: string;
  timestamp: string;
}

// Loader - Preserves existing data fetching logic
export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch basic shop data
  const shopResponse = await admin.graphql(`
    query {
      shop {
        name
        currencyCode
      }
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
            displayFinancialStatus
          }
        }
      }
      products(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            totalInventory
            variants(first: 1) {
              edges {
                node {
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
  `);

  const shopData = await shopResponse.json();

  // Calculate metrics
  const orders = shopData.data?.orders?.edges || [];
  const totalRevenue = orders.reduce((sum: number, edge: any) => {
    return sum + parseFloat(edge.node.totalPriceSet?.shopMoney?.amount || 0);
  }, 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? totalRevenue / orderCount : 0;

  return json({
    shopName: shopData.data?.shop?.name || "Your Store",
    currency: shopData.data?.shop?.currencyCode || "USD",
    shopDomain: session.shop,
    metrics: {
      revenue: totalRevenue,
      orders: orderCount,
      aov: aov,
      conversionRate: 3.2,
      profitMargin: 18.4,
    },
    recentOrders: orders.slice(0, 5),
    products: shopData.data?.products?.edges || [],
  });
};

// Sidebar Component
function Sidebar({ 
  isOpen, 
  onToggle, 
  activePage 
}: { 
  isOpen: boolean; 
  onToggle: () => void;
  activePage: string;
}) {
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
      <div 
        className={`sp-sidebar-overlay ${isOpen ? 'active' : ''}`} 
        onClick={onToggle}
      />
      <aside className={`sp-sidebar ${isOpen ? 'open' : ''}`}>
        <div className="p-5 pb-3">
          <div className="flex items-center gap-3">
            <div 
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #0096c7, #00b4d8)" }}
            >
              <Zap className="w-5 h-5 text-white" />
            </div>
            <span className="text-white font-bold text-lg tracking-tight">ShopifyPulse</span>
          </div>
        </div>
        <nav className="mt-2 pb-4">
          {navItems.map((item) => (
            <Link
              key={item.id}
              to={item.href}
              className={`sp-sidebar-link ${activePage === item.id ? 'active' : ''}`}
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </Link>
          ))}
          <div className="sp-sidebar-separator" />
          <Link
            to="/app/ai-insights"
            className="sp-sidebar-link"
            style={{ color: "#7bcce8" }}
          >
            <Sparkles className="w-5 h-5" style={{ color: "#00b4d8" }} />
            <span>AI Insights</span>
            <span 
              className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: "#0096c7", color: "#fff" }}
            >
              AI
            </span>
          </Link>
          <Link to="/app/settings" className="sp-sidebar-link">
            <Settings className="w-5 h-5" />
            <span>Settings</span>
          </Link>
        </nav>
        <div className="mt-auto p-3">
          <div className="sp-store-selector">
            <span>Select Store</span>
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
      </aside>
    </>
  );
}

// TopBar Component
function TopBar({ 
  onMenuToggle, 
  isDark, 
  onThemeToggle,
  shopName 
}: { 
  onMenuToggle: () => void; 
  isDark: boolean;
  onThemeToggle: () => void;
  shopName: string;
}) {
  return (
    <header className="sp-top-bar">
      <div className="flex items-center gap-3">
        <button 
          className="sp-icon-btn lg:hidden" 
          onClick={onMenuToggle}
        >
          <Menu className="w-5 h-5" />
        </button>
        <div 
          className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm cursor-pointer border"
          style={{ 
            background: "var(--bg-surface-secondary)",
            borderColor: "var(--border-default)",
            color: "var(--text-secondary)"
          }}
        >
          <Calendar className="w-4 h-4" />
          <span className="hidden sm:inline">Last 30 Days</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </div>
      </div>
      
      <div className="flex-1 max-w-lg mx-4 lg:mx-8 hidden sm:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-gray-400" />
          <input
            type="text"
            placeholder="Search ShopifyPulse..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-sm focus:outline-none transition border"
            style={{
              background: "var(--bg-surface-secondary)",
              borderColor: "var(--border-default)",
              color: "var(--text-primary)"
            }}
          />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="sp-ask-ai-btn">
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Ask AI</span>
        </button>
        <button className="sp-icon-btn relative">
          <Bell className="w-[18px] h-[18px]" />
          <div className="sp-notif-badge">3</div>
        </button>
        <button 
          className="sp-icon-btn" 
          onClick={onThemeToggle}
          title="Toggle theme"
        >
          {isDark ? (
            <Sun className="w-[18px] h-[18px]" />
          ) : (
            <Moon className="w-[18px] h-[18px]" />
          )}
        </button>
        <div 
          className="w-9 h-9 rounded-full flex items-center justify-center cursor-pointer ml-1"
          style={{ background: "linear-gradient(135deg, #0077b6, #00b4d8)" }}
        >
          <span className="text-white text-sm font-semibold">
            {shopName.substring(0, 2).toUpperCase()}
          </span>
        </div>
      </div>
    </header>
  );
}

// KPI Card Component
function KPICard({ 
  label, 
  value, 
  trend, 
  trendType,
  delay 
}: KPIData & { delay: number }) {
  const isPositive = trendType === "positive";
  const isNegative = trendType === "negative";

  // Sparkline chart options
  const sparklineOptions = {
    chart: {
      type: "area" as const,
      height: 32,
      sparkline: { enabled: true },
      animations: { enabled: false },
    },
    stroke: {
      curve: "smooth" as const,
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.4,
        opacityTo: 0.05,
        stops: [0, 100],
      },
    },
    colors: [isPositive ? "#059669" : isNegative ? "#dc2626" : "#0077b6"],
    tooltip: { enabled: false },
  };

  const sparklineData = {
    series: [{
      data: [10, 15, 12, 18, 14, 20, 16, 22, 18, 25],
    }],
  };

  return (
    <div className={`sp-kpi-card sp-animate-in sp-d${delay}`}>
      <div className="text-xs font-semibold uppercase tracking-wider mb-1" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
      <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        {value}
      </div>
      <div className="flex items-center justify-between mt-3">
        <div className="w-20 h-8">
          <Chart
            options={sparklineOptions}
            series={sparklineData.series}
            type="area"
            height={32}
          />
        </div>
        <span className={`sp-badge ${isPositive ? 'sp-badge-green' : isNegative ? 'sp-badge-red' : 'sp-badge-yellow'}`}>
          {isPositive ? "+" : ""}{trend}%
        </span>
      </div>
    </div>
  );
}

// AI Brief Banner Component
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
            {insights.map((insight, index) => (
              <div 
                key={index} 
                className="flex items-center gap-2 text-sm"
                style={{ color: "rgba(179, 224, 240, 0.9)" }}
              >
                <span 
                  className={`w-2 h-2 rounded-full ${index === 0 ? 'sp-pulse-dot bg-teal-300' : index === 1 ? 'bg-yellow-300' : 'bg-blue-300'}`} 
                />
                {insight.text}
              </div>
            ))}
          </div>
        </div>
        <button 
          className="px-5 py-2.5 rounded-lg text-sm font-semibold transition flex items-center gap-2 backdrop-blur-sm whitespace-nowrap hover:bg-white/30"
          style={{ background: "rgba(255, 255, 255, 0.2)", color: "#fff" }}
        >
          View Full Report <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// Chart Card Component
function ChartCard({ 
  title, 
  children, 
  delay = 0,
  className = ""
}: { 
  title: string; 
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  return (
    <div 
      className={`sp-dash-card p-5 sp-animate-in ${delay > 0 ? `sp-d${delay}` : ''} ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 opacity-0 hover:opacity-50 transition-opacity" style={{ color: "var(--text-secondary)" }} />
          <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
            {title}
          </h3>
        </div>
        <button className="opacity-0 hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded">
          <Maximize2 className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
        </button>
      </div>
      {children}
    </div>
  );
}

// Alert Feed Component
function AlertFeed() {
  const alerts: AlertItem[] = [
    { id: "1", type: "critical", title: "Revenue drop detected", description: "Revenue fell 18% vs. last Tuesday.", timestamp: "2m" },
    { id: "2", type: "warning", title: "High cart abandonment", description: "Spiked to 78% in the last hour.", timestamp: "15m" },
    { id: "3", type: "warning", title: "Shipping delay warning", description: "FedEx delays in Northeast region.", timestamp: "32m" },
    { id: "4", type: "info", title: "Organic traffic spike", description: "Up 34% from Google in 2 hours.", timestamp: "1h" },
    { id: "5", type: "critical", title: "Inventory critically low", description: "Blue Hoodie XL: 3 units left.", timestamp: "2h" },
  ];

  const getAlertStyles = (type: AlertItem["type"]) => {
    switch (type) {
      case "critical":
        return { bg: "bg-red-50 dark:bg-red-900/20", border: "border-red-100 dark:border-red-900/30", dot: "red" };
      case "warning":
        return { bg: "bg-yellow-50 dark:bg-yellow-900/20", border: "border-yellow-100 dark:border-yellow-900/30", dot: "yellow" };
      case "info":
        return { bg: "bg-green-50 dark:bg-green-900/20", border: "border-green-100 dark:border-green-900/30", dot: "green" };
    }
  };

  return (
    <div className="sp-dash-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <GripVertical className="w-3.5 h-3.5" style={{ color: "var(--text-secondary)" }} />
        <h3 className="font-semibold text-sm" style={{ color: "var(--text-primary)" }}>
          Alerts & Anomalies
        </h3>
      </div>
      <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
        {alerts.map((alert) => {
          const styles = getAlertStyles(alert.type);
          return (
            <div 
              key={alert.id}
              className={`sp-alert-item ${styles.bg} border ${styles.border}`}
            >
              <div className={`sp-alert-dot ${styles.dot}`} />
              <div className="flex-1">
                <div className="text-xs font-medium" style={{ color: "var(--text-primary)" }}>
                  {alert.title}
                </div>
                <div className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                  {alert.description}
                </div>
              </div>
              <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>
                {alert.timestamp}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main Dashboard Component
export default function Dashboard() {
  const { shopName, metrics, currency } = useLoaderData<typeof loader>();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);

  // Toggle theme
  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: value > 1000 ? 0 : 2,
      maximumFractionDigits: value > 1000 ? 0 : 2,
    }).format(value);
  };

  // KPI Data
  const kpiData: KPIData[] = [
    { label: "Revenue", value: formatCurrency(metrics.revenue), trend: 12, trendType: "positive" },
    { label: "Orders", value: metrics.orders.toString(), trend: 5, trendType: "positive" },
    { label: "AOV", value: formatCurrency(metrics.aov), trend: 2, trendType: "negative" },
    { label: "CR", value: `${metrics.conversionRate}%`, trend: 1.5, trendType: "positive" },
    { label: "Profit", value: `${metrics.profitMargin}%`, trend: 8, trendType: "positive" },
  ];

  // Chart Options
  const revenueByHourOptions = {
    chart: { type: "bar", height: 230, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: "60%" } },
    colors: ["#0077b6"],
    xaxis: { 
      categories: ["0", "4", "8", "12", "16", "20", "23"],
      labels: { style: { colors: "#6b8299", fontSize: "10px" } }
    },
    yaxis: { labels: { style: { colors: "#6b8299", fontSize: "10px" } } },
    grid: { borderColor: "var(--border-default)", strokeDashArray: 3 },
    dataLabels: { enabled: false },
  };

  const revenueByHourSeries = [{
    name: "Revenue",
    data: [1200, 800, 2500, 4200, 3800, 5100, 2800],
  }];

  const gaugeOptions = {
    chart: { type: "radialBar", height: 230 },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        track: { background: "var(--bg-surface-secondary)", strokeWidth: "100%" },
        dataLabels: {
          name: { show: false },
          value: {
            fontSize: "36px",
            fontWeight: 700,
            color: "var(--text-primary)",
            formatter: (val: number) => `${val}%`,
          },
        },
        hollow: { size: "70%" },
      },
    },
    colors: ["#0077b6"],
    stroke: { lineCap: "round" },
  };

  const gaugeSeries = [94.2];

  return (
    <div className={isDark ? 'dark' : ''}>
      <Sidebar 
        isOpen={sidebarOpen} 
        onToggle={() => setSidebarOpen(!sidebarOpen)}
        activePage="dashboard"
      />
      
      <div className="sp-main-content">
        <TopBar 
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
          isDark={isDark}
          onThemeToggle={toggleTheme}
          shopName={shopName}
        />

        <main className="p-4 lg:p-6 space-y-4">
          {/* AI Brief Banner */}
          <AIBriefBanner />

          {/* KPI Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
            {kpiData.map((kpi, index) => (
              <KPICard key={kpi.label} {...kpi} delay={index + 1} />
            ))}
          </div>

          {/* Row 1: Revenue by Hour + Health Score */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
            <ChartCard title="Revenue by Hour" delay={1} className="lg:col-span-3">
              <Chart
                options={revenueByHourOptions}
                series={revenueByHourSeries}
                type="bar"
                height={230}
              />
            </ChartCard>
            <ChartCard title="Store Health Score" delay={2} className="lg:col-span-2">
              <div className="flex justify-center">
                <Chart
                  options={gaugeOptions}
                  series={gaugeSeries}
                  type="radialBar"
                  height={230}
                />
              </div>
            </ChartCard>
          </div>

          {/* Row 2: Alerts */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            <div className="lg:col-span-7">
              <ChartCard title="Weekly Performance Scorecard" delay={3}>
                <div 
                  className="h-[230px] flex items-center justify-center rounded-lg"
                  style={{ background: "var(--bg-surface-secondary)" }}
                >
                  <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                    Weekly Performance Heatmap
                  </span>
                </div>
              </ChartCard>
            </div>
            <div className="lg:col-span-5">
              <AlertFeed />
            </div>
          </div>

          {/* Footer */}
          <footer className="sp-page-footer">
            <div className="flex items-center gap-2">
              <button className="px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--accent-primary)" }}>
                Export Report
              </button>
              <button className="px-4 py-2 rounded-lg text-sm font-semibold border flex items-center gap-2" style={{ background: "var(--bg-surface)", borderColor: "var(--border-default)", color: "var(--accent-primary)" }}>
                Schedule
              </button>
            </div>
            <div style={{ color: "var(--text-secondary)" }}>
              Showing: Last 30 Days | All Channels
            </div>
          </footer>
        </main>
      </div>
    </div>
  );
}
