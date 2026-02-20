import { Outlet, useLoaderData, useLocation, useSearchParams } from "@remix-run/react";
import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server";
import "../styles/global.css";
import "../styles/dashboard.css";
import { LayoutDashboard, TrendingUp, Package, Users, Megaphone, Warehouse, FileText, Sparkles, Settings, ChevronDown, Search, Bell, Moon } from "lucide-react";

export const headers: HeadersFunction = () => ({ "Cache-Control": "no-store" });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  try {
    const { session } = await authenticate.admin(request);
    return json({ apiKey: process.env.SHOPIFY_API_KEY || ""  , shop: session?.shop || "", initials: (session?.shop || "SP").substring(0, 2).toUpperCase() });
  } catch (error) {
    return json({ apiKey: process.env.SHOPIFY_API_KEY || "", shop: "", initials: "SP" });
  }
};

const NAV = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/app" },
  { label: "Sales & Revenue", icon: TrendingUp, href: "/app/sales" },
  { label: "Products", icon: Package, href: "/app/products" },
  { label: "Customer Intelligence", icon: Users, href: "/app/customers" },
  { label: "Marketing", icon: Megaphone, href: "/app/marketing" },
  { label: "Inventory", icon: Warehouse, href: "/app/inventory" },
  { label: "Reports", icon: FileText, href: "/app/reports" },
];

function Sidebar({ currentPath, qs }: { currentPath: string; qs: string }) {
  const isActive = (href: string) => href === "/app" ? (currentPath === "/app" || currentPath === "/app/") : currentPath.startsWith(href);
  return (
    <aside className="sp-sidebar">
      <div className="sp-sidebar-logo">
        <div className="sp-logo-icon"><Sparkles size={20} color="white" /></div>
        <span className="sp-logo-text">ShopifyPulse</span>
      </div>
      <nav className="sp-sidebar-nav">
        {NAV.map(({ label, icon: Icon, href }) => (
          <a key={href} href={href + (qs ? "?" + qs : "")} className={`sp-nav-item ${isActive(href) ? "sp-nav-active" : ""}`}>
            <Icon size={18} /><span>{label}</span>
          </a>
        ))}
      </nav>
      <div className="sp-sidebar-bottom">
        <a href="/app/ai-insights" className="sp-nav-item sp-nav-ai">
          <Sparkles size={18} /><span>AI Insights</span><span className="sp-ai-badge">AI</span>
        </a>
        <a href="/app/settings" className="sp-nav-item">
          <Settings size={18} /><span>Settings</span>
        </a>
        <div className="sp-store-selector">
          <span>Select Store</span><ChevronDown size={16} />
        </div>
      </div>
    </aside>
  );
}

function TopBar({ initials }: { initials: string }) {
  return (
    <header className="sp-topbar">
      <div className="sp-topbar-left">
        <div className="sp-date-picker">
          <select defaultValue="30">
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
          </select>
        </div>
      </div>
      <div className="sp-topbar-center">
        <div className="sp-search-box">
          <Search size={16} />
          <input type="text" placeholder="Search ShopifyPulse..." />
        </div>
      </div>
      <div className="sp-topbar-right">
        <button className="sp-ask-ai-btn"><Sparkles size={14} /><span>Ask AI</span></button>
        <div className="sp-notif-bell"><Bell size={18} /><span className="sp-notif-count">3</span></div>
        <button className="sp-dark-toggle"><Moon size={18} /></button>
        <div className="sp-user-avatar">{initials}</div>
      </div>
    </header>
  );
}

export default function App() {
  const { apiKey, initials } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  return (
    <AppProvider isEmbeddedApp={false} apiKey={apiKey}>
      <div className="sp-app-layout">
        <Sidebar currentPath={location.pathname} qs={searchParams.toString()} />
        <div className="sp-main-area">
          <TopBar initials={initials} />
          <main className="sp-content"><Outlet /></main>
        </div>
      </div>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return (
    <div style={{ padding: "20px", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ color: "#EF4444" }}>Error</h1>
      <p>Something went wrong. Please try again.</p>
    </div>
  );
}
