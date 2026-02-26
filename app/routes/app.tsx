import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import { Outlet, useLoaderData, useSearchParams, useLocation, useNavigate } from "@remix-run/react";
import { useState, useEffect, useCallback, useRef } from "react";
import { authenticate } from "../shopify.server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import "../styles/global.css";
import "../styles/dashboard.css";
import { LayoutDashboard, TrendingUp, Package, Users, Megaphone, Warehouse, FileText, Sparkles, Settings, ChevronDown, Search, Bell, Moon, Sun, Lock, Unlock, X, Send, TrendingUp as TrendUp, AlertTriangle, Award } from "lucide-react";

export const headers: HeadersFunction = () => ({ "Cache-Control": "no-store" });

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "", shop: session.shop, initials: "SP" });
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

const NOTIFICATIONS = [
  { id: 1, text: "Revenue up 12% this week", color: "#22c55e", icon: TrendUp, time: "2h ago" },
  { id: 2, text: "Low stock: Product X has only 3 units left", color: "#f59e0b", icon: AlertTriangle, time: "5h ago" },
  { id: 3, text: "New customer milestone: 500 customers!", color: "#3b82f6", icon: Award, time: "1d ago" },
];

const DATE_OPTIONS = [
  { value: "1", label: "Today" },
  { value: "7", label: "Last 7 Days" },
  { value: "14", label: "Last 14 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "90", label: "Last 90 Days" },
  { value: "365", label: "Last 12 Months" },
  { value: "custom", label: "Custom Range" },
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

function NotificationsDropdown({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div className="sp-notif-dropdown" ref={ref}>
      <div className="sp-notif-dropdown-header">Notifications</div>
      {NOTIFICATIONS.map((n) => (
        <div key={n.id} className="sp-notif-item">
          <div className="sp-notif-dot" style={{ background: n.color }} />
          <div className="sp-notif-text">
            <p>{n.text}</p>
            <span>{n.time}</span>
          </div>
        </div>
      ))}
      <a href="/app/ai-insights" className="sp-notif-view-all">View All →</a>
    </div>
  );
}

function AiPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  const handleSend = () => {
    if (!query.trim()) return;
    navigate(`/app/ai-insights?q=${encodeURIComponent(query.trim())}`);
    setQuery("");
    onClose();
  };

  return (
    <>
      <div className={`sp-ai-panel-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <div className={`sp-ai-panel${open ? ' open' : ''}`}>
        <div className="sp-ai-panel-header">
          <h3><Sparkles size={18} /> Ask AI</h3>
          <button className="sp-ai-panel-close" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="sp-ai-panel-body">
          <div className="sp-ai-panel-welcome">
            <Sparkles size={40} />
            <p style={{ marginTop: 12, fontSize: 14 }}>Ask anything about your store performance, sales trends, or get AI-powered recommendations.</p>
            <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {["What are my top selling products?", "How is my revenue trending?", "Which marketing channel performs best?"].map((q) => (
                <button key={q} onClick={() => { setQuery(q); }} style={{ padding: '8px 12px', border: '1px solid var(--border-default, #e5e7eb)', borderRadius: 8, background: 'transparent', color: 'var(--text-secondary, #6b7280)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>{q}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="sp-ai-panel-footer">
          <input
            className="sp-ai-panel-input"
            placeholder="Ask a question..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
          />
          <button className="sp-ai-panel-send" onClick={handleSend}><Send size={16} /></button>
        </div>
      </div>
    </>
  );
}

function TopBar({ initials, darkMode, onToggleDark, onAskAi, onToggleNotif, showNotif, selectedDays, onDaysChange, showCustomRange, customFrom, customTo, onCustomFromChange, onCustomToChange, onApplyCustom }: {
  initials: string; darkMode: boolean; onToggleDark: () => void;
  onAskAi: () => void; onToggleNotif: () => void; showNotif: boolean;
  selectedDays: string; onDaysChange: (v: string) => void;
  showCustomRange: boolean; customFrom: string; customTo: string;
  onCustomFromChange: (v: string) => void; onCustomToChange: (v: string) => void;
  onApplyCustom: () => void;
}) {
  return (
    <header className="sp-topbar">
      <div className="sp-topbar-left">
        <div className="sp-date-picker">
          <select value={selectedDays} onChange={(e) => onDaysChange(e.target.value)}>
            {DATE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        {showCustomRange && (
          <div className="sp-date-custom-range">
            <input type="date" value={customFrom} onChange={(e) => onCustomFromChange(e.target.value)} />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>to</span>
            <input type="date" value={customTo} onChange={(e) => onCustomToChange(e.target.value)} />
            <button onClick={onApplyCustom} style={{ padding: '5px 10px', background: '#0ea5e9', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer', fontWeight: 600 }}>Apply</button>
          </div>
        )}
      </div>
      <div className="sp-topbar-center">
        <div className="sp-search-box">
          <Search size={16} />
          <input type="text" placeholder="Search ShopifyPulse..." />
        </div>
      </div>
      <div className="sp-topbar-right">
        <button className="sp-ask-ai-btn" onClick={onAskAi}><Sparkles size={14} /><span>Ask AI</span></button>
        <div className="sp-notif-bell" onClick={onToggleNotif} style={{ position: 'relative' }}>
          <Bell size={18} /><span className="sp-notif-count">{NOTIFICATIONS.length}</span>
          {showNotif && <NotificationsDropdown onClose={onToggleNotif} />}
        </div>
        {darkMode ? <button className="sp-dark-toggle" onClick={onToggleDark}><Sun size={18} /></button> : <button className="sp-dark-toggle" onClick={onToggleDark}><Moon size={18} /></button>}
        <div className="sp-user-avatar">{initials}</div>
      </div>
    </header>
  );
}

export default function App() {
  const { apiKey, initials } = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [showAiPanel, setShowAiPanel] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Date selector state
  const [selectedDays, setSelectedDays] = useState(() => {
    if (typeof window !== 'undefined') {
      return searchParams.get('days') || localStorage.getItem('sp-date-range') || '30';
    }
    return '30';
  });
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const showCustomRange = selectedDays === 'custom';

  useEffect(() => {
    const saved = localStorage.getItem('sp-dark-mode');
    if (saved === 'true') setDarkMode(true);
  }, []);

  const [layoutLocked, setLayoutLocked] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sp-layout-locked') !== 'false';
    }
    return true;
  });

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', darkMode);
      document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
      localStorage.setItem('sp-dark-mode', String(darkMode));
    }
  }, [darkMode]);

  useEffect(() => {
    localStorage.setItem('sp-layout-locked', String(layoutLocked));
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('drag-enabled', !layoutLocked);
    }
  }, [layoutLocked]);

  const handleDaysChange = useCallback((value: string) => {
    setSelectedDays(value);
    if (value !== 'custom') {
      localStorage.setItem('sp-date-range', value);
      const newParams = new URLSearchParams(searchParams);
      newParams.set('days', value);
      newParams.delete('from');
      newParams.delete('to');
      setSearchParams(newParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  const handleApplyCustom = useCallback(() => {
    if (customFrom && customTo) {
      const from = new Date(customFrom);
      const to = new Date(customTo);
      const days = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / 86400000));
      localStorage.setItem('sp-date-range', String(days));
      const newParams = new URLSearchParams(searchParams);
      newParams.set('days', String(days));
      newParams.set('from', customFrom);
      newParams.set('to', customTo);
      setSearchParams(newParams, { replace: true });
    }
  }, [customFrom, customTo, searchParams, setSearchParams]);

  const toggleDark = useCallback(() => setDarkMode(d => !d), []);
  const toggleLock = useCallback(() => setLayoutLocked(l => !l), []);
  const toggleAiPanel = useCallback(() => setShowAiPanel(v => !v), []);
  const toggleNotifications = useCallback(() => setShowNotifications(v => !v), []);

  return (
    <AppProvider isEmbeddedApp={false} apiKey={apiKey}>
      <div className={`sp-app-layout${darkMode ? ' dark' : ''}`}>
        <Sidebar currentPath={location.pathname} qs={searchParams.toString()} />
        <div className="sp-main-area">
          <TopBar
            initials={initials}
            darkMode={darkMode}
            onToggleDark={toggleDark}
            onAskAi={toggleAiPanel}
            onToggleNotif={toggleNotifications}
            showNotif={showNotifications}
            selectedDays={selectedDays}
            onDaysChange={handleDaysChange}
            showCustomRange={showCustomRange}
            customFrom={customFrom}
            customTo={customTo}
            onCustomFromChange={setCustomFrom}
            onCustomToChange={setCustomTo}
            onApplyCustom={handleApplyCustom}
          />
          <main className="sp-content"><Outlet /></main>
        </div>
      </div>
      {/* Lock/Unlock FAB */}
      <button
        className={`lock-fab${layoutLocked ? '' : ' unlocked'}`}
        onClick={toggleLock}
        title={layoutLocked ? 'Unlock layout to rearrange widgets' : 'Lock layout'}
      >
        {layoutLocked ? <Lock size={16} /> : <Unlock size={16} />}
        <span>{layoutLocked ? 'Locked' : 'Unlocked'}</span>
      </button>
      {/* Unlock mode banner */}
      {!layoutLocked && (
        <div className="unlock-banner">
          <Unlock size={14} /> Widget rearranging enabled — drag cards to reorder. Full drag-and-drop coming soon!
        </div>
      )}
      {/* AI Slide-out Panel */}
      <AiPanel open={showAiPanel} onClose={() => setShowAiPanel(false)} />
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
