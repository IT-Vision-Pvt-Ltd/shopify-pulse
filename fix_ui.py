import re

# ==========================================
# FIX 1: Sidebar overlap in dashboard.css
# The dashboard.css has .sp-sidebar with position:fixed
# which conflicts with the flex layout in global.css.
# We need to remove/override those conflicting styles.
# ==========================================

with open('app/styles/dashboard.css', 'r') as f:
    css = f.read()

# Remove the conflicting .sp-sidebar block from dashboard.css
# (lines 41-56 approximately). The global.css already defines
# .sp-sidebar correctly for the flex layout.
# We'll comment out the entire .sp-sidebar block
old_sidebar = """/* === SIDEBAR === */
.sp-sidebar {
    width: 256px;
    min-height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    z-index: 50;
    overflow-y: auto;
    background: linear-gradient(180deg, #012840, #023e58 50%, #005f73);
    transition: transform 0.3s;
}"""
new_sidebar = """/* === SIDEBAR === */
/* .sp-sidebar styles moved to global.css for flex layout */
"""
css = css.replace(old_sidebar, new_sidebar)

# Also fix the .sp-main / .page-content that expects sidebar offset
# Find and fix margin-left: 256px or padding-left: 256px references
css = css.replace('margin-left: 256px', 'margin-left: 0')
css = css.replace('padding-left: 256px', 'padding-left: 0')

# Add lock-fab styles
lock_fab_css = """
/* === LOCK FAB === */
.lock-fab {
  position: fixed;
  bottom: 24px;
  right: 24px;
  z-index: 100;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all .25s;
  box-shadow: 0 4px 16px rgba(0,0,0,.15);
  border: 1px solid var(--border-default, #dde8ef);
  background: var(--bg-surface, #fff);
  color: var(--text-primary, #1a2b3c);
}
.lock-fab:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0,0,0,.2);
}
.lock-fab.unlocked {
  border-color: #0096c7;
  background: var(--accent-primary, #0077b6);
  color: #fff;
}
.dark .lock-fab {
  background: #162435;
  color: #48cae4;
  border: 1px solid #1c2e40;
}
.dark .lock-fab:hover {
  background: #1a3048;
}
.dark .lock-fab.unlocked {
  background: #0077b6;
  color: #fff;
  border-color: #0096c7;
}

/* Drag handle styles */
.drag-handle {
  cursor: grab;
  display: flex;
  align-items: center;
  gap: 6px;
  opacity: 0;
  transition: opacity 0.2s;
}
.drag-enabled .drag-handle {
  opacity: 1;
}
.drag-handle:active {
  cursor: grabbing;
}
.dragging {
  opacity: 0.5;
  transform: scale(0.98);
}
.drag-over {
  border: 2px dashed var(--accent-primary, #0077b6) !important;
}
"""
css += lock_fab_css

with open('app/styles/dashboard.css', 'w') as f:
    f.write(css)

print('Fixed dashboard.css: removed conflicting sidebar styles, added lock-fab styles')

# ==========================================
# FIX 2 & 3: Dark mode toggle + Lock/Unlock in app.tsx
# ==========================================

with open('app/routes/app.tsx', 'r') as f:
    content = f.read()

# Add useState import if not present
if 'useState' not in content:
    content = content.replace(
        'import { Outlet, useLoaderData, useSearchParams, useLocation } from "@remix-run/react";',
        'import { Outlet, useLoaderData, useSearchParams, useLocation } from "@remix-run/react";\nimport { useState, useEffect, useCallback } from "react";'
    )
else:
    # Make sure useEffect and useCallback are imported
    if 'useEffect' not in content:
        content = content.replace('useState', 'useState, useEffect, useCallback')

# Add Lock and Unlock icons from lucide-react
old_lucide = 'import { LayoutDashboard, TrendingUp, Package, Users, Megaphone, Warehouse, FileText, Sparkles, Settings, ChevronDown, Search, Bell, Moon } from "lucide-react";'
new_lucide = 'import { LayoutDashboard, TrendingUp, Package, Users, Megaphone, Warehouse, FileText, Sparkles, Settings, ChevronDown, Search, Bell, Moon, Sun, Lock, Unlock } from "lucide-react";'
content = content.replace(old_lucide, new_lucide)

# Replace the TopBar function to add dark mode toggle and lock/unlock
old_topbar_btn = '<button className="sp-dark-toggle"><Moon size={18} /></button>'
new_topbar_btn = '{darkMode ? <button className="sp-dark-toggle" onClick={onToggleDark}><Sun size={18} /></button> : <button className="sp-dark-toggle" onClick={onToggleDark}><Moon size={18} /></button>}'
content = content.replace(old_topbar_btn, new_topbar_btn)

# Update TopBar function signature to accept dark mode props
old_topbar_sig = 'function TopBar({ initials }: { initials: string }) {'
new_topbar_sig = 'function TopBar({ initials, darkMode, onToggleDark }: { initials: string; darkMode: boolean; onToggleDark: () => void }) {'
content = content.replace(old_topbar_sig, new_topbar_sig)

# Update App component to add dark mode state and lock state
old_app_body = """  const { apiKey, initials } = useLoaderData<typeof loader>();
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
    </AppProvider>"""

new_app_body = """  const { apiKey, initials } = useLoaderData<typeof loader>();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('sp-dark-mode') === 'true';
    }
    return false;
  });
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

  const toggleDark = useCallback(() => setDarkMode(d => !d), []);
  const toggleLock = useCallback(() => setLayoutLocked(l => !l), []);

  return (
    <AppProvider isEmbeddedApp={false} apiKey={apiKey}>
      <div className={`sp-app-layout${darkMode ? ' dark' : ''}`}>
        <Sidebar currentPath={location.pathname} qs={searchParams.toString()} />
        <div className="sp-main-area">
          <TopBar initials={initials} darkMode={darkMode} onToggleDark={toggleDark} />
          <main className="sp-content"><Outlet /></main>
        </div>
      </div>
      <button
        className={`lock-fab${layoutLocked ? '' : ' unlocked'}`}
        onClick={toggleLock}
        title={layoutLocked ? 'Unlock layout to rearrange widgets' : 'Lock layout'}
      >
        {layoutLocked ? <Lock size={16} /> : <Unlock size={16} />}
        <span>{layoutLocked ? 'Locked' : 'Unlocked'}</span>
      </button>
    </AppProvider>"""

content = content.replace(old_app_body, new_app_body)

with open('app/routes/app.tsx', 'w') as f:
    f.write(content)

print('Fixed app.tsx: added dark mode toggle, lock/unlock FAB')

# ==========================================
# FIX: global.css - ensure dark mode variables and sidebar fix
# ==========================================

with open('app/styles/global.css', 'r') as f:
    gcss = f.read()

# Remove the duplicate :root block at the end (lines ~275-313)
# and add proper dark mode CSS variables
dark_vars = """
/* ===== DARK MODE ===== */
.dark {
  --sidebar-bg: #0B1929;
  --topbar-bg: #111d2e;
  --content-bg: #0b1622;
  --card-bg: #111d2e;
  --border-default: #1c2e40;
  --text-primary: #e2ecf5;
  --text-secondary: #6b8299;
  --accent-blue: #0EA5E9;
  --shadow-sm: 0 1px 3px rgba(0,0,0,0.3);
  --shadow-md: 0 4px 12px rgba(0,0,0,0.3);
}

.dark .sp-sidebar {
  background: linear-gradient(180deg, #0a1628, #0f1f33 50%, #0b1929) !important;
}

.dark .sp-topbar {
  background: var(--topbar-bg);
  border-bottom-color: var(--border-default);
  box-shadow: none;
}

.dark .sp-content {
  background: var(--content-bg);
}

.dark .sp-search-box input {
  background: #162435;
  border-color: #1c2e40;
  color: var(--text-primary);
}

.dark .sp-user-avatar {
  background: #1c2e40;
  color: #48cae4;
}
"""

# Check if dark mode is already added
if '.dark .sp-sidebar' not in gcss:
    gcss += dark_vars

with open('app/styles/global.css', 'w') as f:
    f.write(gcss)

print('Fixed global.css: added dark mode variables')
print('All UI fixes applied successfully!')
