import re

# Fix Dashboard: remove sidebar/topbar wrapper from app._index.tsx
with open('app/routes/app._index.tsx') as f:
    lines = f.readlines()

new_lines = []
skip_sidebar_overlay = False
for i, line in enumerate(lines):
    # Skip sidebar-overlay div
    if 'sp-sidebar-overlay' in line:
        skip_sidebar_overlay = True
        continue
    if skip_sidebar_overlay and line.strip().startswith('<aside className'):
        skip_sidebar_overlay = False
        continue
    # Remove the outer dark wrapper
    if '<div className={isDark' in line and 'dark' in line:
        new_lines.append('    <div className="sp-dashboard-wrapper">\n')
        continue
    # Remove Sidebar component
    if '<Sidebar isOpen=' in line:
        continue
    # Remove sp-main-content wrapper
    if 'className="sp-main-content"' in line:
        continue
    # Remove TopBar component
    if '<TopBar dateRange=' in line:
        continue
    # Keep everything else
    new_lines.append(line)

with open('app/routes/app._index.tsx', 'w') as f:
    f.writelines(new_lines)

print(f'Fixed dashboard: {len(lines)} -> {len(new_lines)} lines')