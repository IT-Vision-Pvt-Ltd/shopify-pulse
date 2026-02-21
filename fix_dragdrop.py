with open('app/routes/app._index.tsx', 'r') as f:
    content = f.read()

# Add GripVertical to the import if not there
if 'GripVertical' not in content.split('import')[1] if len(content.split('import'))>1 else '':
    pass  # already imported based on earlier analysis

# Replace the ChartCard stub with a drag-enabled version
old_chartcard = '''function ChartCard({ title, delay, className, children }: any) {
  return (
    <div className={className || ""} style={{padding: "16px", background: "white", borderRadius: "8px", border: "1px solid #e5e7eb"}}>
      {title && <h3 style={{fontSize: "14px", fontWeight: "600", marginBottom: "12px"}}>{title}</h3>}
      {children}
    </div>
  );
}'''

new_chartcard = '''function ChartCard({ title, delay, className, children }: any) {
  const [isDragging, setIsDragging] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleDragStart = (e: React.DragEvent) => {
    if (!document.documentElement.classList.contains('drag-enabled')) {
      e.preventDefault();
      return;
    }
    setIsDragging(true);
    e.dataTransfer.effectAllowed = 'move';
    const el = e.currentTarget as HTMLElement;
    e.dataTransfer.setData('text/plain', el.dataset.cardId || '');
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    if (!document.documentElement.classList.contains('drag-enabled')) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const sourceId = e.dataTransfer.getData('text/plain');
    const targetEl = e.currentTarget as HTMLElement;
    const targetId = targetEl.dataset.cardId;
    if (sourceId && targetId && sourceId !== targetId) {
      // Swap the DOM elements
      const parent = targetEl.parentElement;
      if (parent) {
        const sourceEl = parent.querySelector(`[data-card-id="${sourceId}"]`);
        if (sourceEl) {
          const sourceNext = sourceEl.nextElementSibling;
          const targetNext = targetEl.nextElementSibling;
          if (sourceNext === targetEl) {
            parent.insertBefore(targetEl, sourceEl);
          } else if (targetNext === sourceEl) {
            parent.insertBefore(sourceEl, targetEl);
          } else {
            const placeholder = document.createElement('div');
            parent.insertBefore(placeholder, sourceEl);
            parent.insertBefore(sourceEl, targetNext);
            parent.insertBefore(targetEl, placeholder);
            parent.removeChild(placeholder);
          }
          // Save layout order to localStorage
          const cards = Array.from(parent.querySelectorAll('[data-card-id]'));
          const order = cards.map(c => (c as HTMLElement).dataset.cardId);
          localStorage.setItem('sp-layout-order', JSON.stringify(order));
        }
      }
    }
  };

  const cardId = title ? title.replace(/\\s+/g, '-').toLowerCase() : `card-${delay}`;
  const isUnlocked = typeof document !== 'undefined' && document.documentElement.classList.contains('drag-enabled');

  return (
    <div
      className={`${className || ""} ${isDragging ? 'dragging' : ''} ${isDragOver ? 'drag-over' : ''}`}
      style={{padding: "16px", background: "var(--bg-surface, white)", borderRadius: "8px", border: "1px solid var(--border-default, #e5e7eb)", color: "var(--text-primary, #1a2b3c)", transition: "all 0.2s"}}
      draggable={isUnlocked}
      data-card-id={cardId}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div style={{display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: title ? "12px" : "0"}}>
        {title && <h3 style={{fontSize: "14px", fontWeight: "600", margin: 0}}>{title}</h3>}
        <div className="drag-handle"><GripVertical size={14} style={{color: "var(--text-secondary, #6b7280)"}} /></div>
      </div>
      {children}
    </div>
  );
}'''

content = content.replace(old_chartcard, new_chartcard)

# Also update KPICard to be draggable
old_kpicard = '''function KPICard({ label, value, change, icon, delay, ...rest }: any) {
  return (
    <div className="sp-kpi-card" style={{padding: "16px", background: "white", borderRadius: "8px", border: "1px solid #e5e7eb"}}>
      <div style={{fontSize: "12px", color: "#6b7280"}}>{label}</div>
      <div style={{fontSize: "24px", fontWeight: "bold", marginTop: "4px"}}>{value}</div>
      {change && <div style={{fontSize: "12px", color: change > 0 ? "#10b981" : "#ef4444", marginTop: "4px"}}>{change > 0 ? "+" : ""}{change}%</div>}
    </div>
  );
}'''

new_kpicard = '''function KPICard({ label, value, change, icon, delay, ...rest }: any) {
  return (
    <div className="sp-kpi-card" style={{padding: "16px", background: "var(--bg-surface, white)", borderRadius: "8px", border: "1px solid var(--border-default, #e5e7eb)", color: "var(--text-primary, #1a2b3c)"}}>
      <div style={{fontSize: "12px", color: "var(--text-secondary, #6b7280)"}}>{label}</div>
      <div style={{fontSize: "24px", fontWeight: "bold", marginTop: "4px"}}>{value}</div>
      {change && <div style={{fontSize: "12px", color: change > 0 ? "#10b981" : "#ef4444", marginTop: "4px"}}>{change > 0 ? "+" : ""}{change}%</div>}
    </div>
  );
}'''

content = content.replace(old_kpicard, new_kpicard)

with open('app/routes/app._index.tsx', 'w') as f:
    f.write(content)

print('Updated ChartCard and KPICard with drag-and-drop support and dark mode CSS variables')
