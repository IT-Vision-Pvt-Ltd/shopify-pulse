import os

def w(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'Written: {path}')

# 1. ConversionFunnelChart
w('app/components/dashboard/ConversionFunnelChart.tsx', r'''import { Card } from "@shopify/polaris";

const funnelData = [
  { stage: "Sessions", value: 12400, pct: 100, color: "#5C6AC4" },
  { stage: "Product Views", value: 4200, pct: 33.9, color: "#47C1BF" },
  { stage: "Add to Cart", value: 2100, pct: 16.9, color: "#9C6ADE" },
  { stage: "Checkout", value: 1400, pct: 11.3, color: "#F49342" },
  { stage: "Purchase", value: 890, pct: 7.2, color: "#50B83C" },
];

export function ConversionFunnelChart() {
  const mx = funnelData[0].value;
  return (
    <Card>
      <div style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "4px", fontSize: "18px", fontWeight: "600" }}>Conversion Funnel</h3>
        <p style={{ marginBottom: "20px", fontSize: "13px", color: "#8c9196" }}>Sessions to Purchase</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {funnelData.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "100px", fontSize: "13px", textAlign: "right", color: "#6d7175" }}>{item.stage}</div>
              <div style={{ flex: 1, position: "relative", height: "28px", backgroundColor: "#f3f3f3", borderRadius: "4px", overflow: "hidden" }}>
                <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: (item.value / mx * 100) + "%", backgroundColor: item.color, borderRadius: "4px", transition: "width 0.5s ease", display: "flex", alignItems: "center", paddingLeft: "8px" }}>
                  <span style={{ color: "#fff", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" }}>
                    {item.value.toLocaleString()} ({item.pct}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "16px", justifyContent: "center" }}>
          {funnelData.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: item.color }} />
              <span style={{ fontSize: "12px", color: "#6d7175" }}>{item.stage}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
''')
print('Done ConversionFunnelChart')

# 2. StoreHealthScore
w('app/components/dashboard/StoreHealthScore.tsx', r'''import { Card } from "@shopify/polaris";

export function StoreHealthScore() {
  const score = 78;
  const maxScore = 100;
  const pct = (score / maxScore) * 100;
  const color = score >= 80 ? "#50B83C" : score >= 60 ? "#F49342" : "#DE3618";
  return (
    <Card>
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h3 style={{ marginBottom: "4px", fontSize: "18px", fontWeight: "600" }}>Store Health Score</h3>
        <p style={{ marginBottom: "20px", fontSize: "13px", color: "#8c9196" }}>Composite metric</p>
        <div style={{ position: "relative", width: "160px", height: "160px", margin: "0 auto" }}>
          <svg viewBox="0 0 160 160" width="160" height="160">
            <circle cx="80" cy="80" r="70" fill="none" stroke="#e4e5e7" strokeWidth="12" />
            <circle cx="80" cy="80" r="70" fill="none" stroke={color} strokeWidth="12" strokeDasharray={`${pct * 4.4} ${440 - pct * 4.4}`} strokeDashoffset="110" strokeLinecap="round" />
          </svg>
          <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", textAlign: "center" }}>
            <div style={{ fontSize: "13px", color: "#8c9196" }}>Health Score</div>
            <div style={{ fontSize: "28px", fontWeight: "700", color }}>{score}/{maxScore}</div>
          </div>
        </div>
      </div>
    </Card>
  );
}
''')
print('Done StoreHealthScore')

# 3. SalesHeatmap
w('app/components/dashboard/SalesHeatmap.tsx', r'''import { Card } from "@shopify/polaris";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
const heatmapData: number[][] = [
  [12,8,5,3,2,4,10,25,45,52,60,55,48,42,38,50,58,62,48,35,28,20,15,10],
  [15,10,6,4,3,5,12,30,50,58,68,62,55,48,42,55,65,70,55,40,32,22,18,12],
  [10,7,4,2,2,3,8,22,42,48,55,50,45,40,35,48,55,60,45,32,25,18,12,8],
  [14,9,5,3,2,4,11,28,48,55,62,58,52,45,40,52,62,68,52,38,30,22,16,11],
  [18,12,7,5,3,6,15,35,58,65,75,70,62,55,48,62,72,78,65,48,38,28,20,14],
  [25,18,10,8,5,8,20,42,68,78,88,82,75,68,60,72,85,92,78,58,45,35,28,20],
  [20,15,8,6,4,6,16,38,60,70,80,75,68,60,52,65,78,85,70,52,40,30,22,16],
];

function getColor(val: number): string {
  if (val <= 20) return "#e3f2fd";
  if (val <= 40) return "#90caf9";
  if (val <= 60) return "#42a5f5";
  if (val <= 80) return "#1e88e5";
  return "#0d47a1";
}

export function SalesHeatmap() {
  return (
    <Card>
      <div style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "4px", fontSize: "18px", fontWeight: "600" }}>Sales Heatmap</h3>
        <p style={{ marginBottom: "16px", fontSize: "13px", color: "#8c9196" }}>Hour x Day of Week</p>
        <div style={{ overflowX: "auto" }}>
          <div style={{ display: "grid", gridTemplateColumns: "50px repeat(24, 1fr)", gap: "2px", minWidth: "600px" }}>
            <div />
            {hours.map((h) => (
              <div key={h} style={{ fontSize: "10px", textAlign: "center", color: "#8c9196" }}>{h}</div>
            ))}
            {days.map((day, di) => (
              <>
                <div key={day} style={{ fontSize: "12px", display: "flex", alignItems: "center", color: "#6d7175" }}>{day}</div>
                {heatmapData[di].map((val, hi) => (
                  <div key={`${di}-${hi}`} style={{ width: "100%", paddingBottom: "100%", backgroundColor: getColor(val), borderRadius: "2px", position: "relative" }}>
                    <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "8px", color: val > 60 ? "#fff" : "#333" }}>{val}</div>
                  </div>
                ))}
              </>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", marginTop: "12px", justifyContent: "center", alignItems: "center" }}>
          {["0 - 20", "21 - 40", "41 - 60", "61 - 80", "81 - 100"].map((label, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "2px", backgroundColor: ["#e3f2fd","#90caf9","#42a5f5","#1e88e5","#0d47a1"][i] }} />
              <span style={{ fontSize: "11px", color: "#8c9196" }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
''')
print('Done SalesHeatmap')

# 4. Update app._index.tsx to include all new chart components
with open('app/routes/app._index.tsx', 'r') as f:
    content = f.read()

# Add new imports if not already present
new_imports = [
    'import { ConversionFunnelChart } from "../components/dashboard/ConversionFunnelChart";',
    'import { StoreHealthScore } from "../components/dashboard/StoreHealthScore";',
    'import { SalesHeatmap } from "../components/dashboard/SalesHeatmap";',
]

for imp in new_imports:
    if imp not in content:
        # Add after the last existing import
        last_import_pos = content.rfind('import ')
        end_of_line = content.find(';\n', last_import_pos)
        if end_of_line != -1:
            content = content[:end_of_line+2] + imp + '\n' + content[end_of_line+2:]
            print(f'Added import: {imp}')

# Find the closing </Page> and add new components before it
# Look for the pattern to add after existing charts
if 'ConversionFunnelChart' not in content or '<ConversionFunnelChart' not in content:
    # Find a good place to insert - after the existing chart components section
    # Look for </BlockStack> near the end
    insert_marker = '</BlockStack>\n          </BlockStack>\n        </Card>\n      </BlockStack>\n    </Page>'
    
    new_sections = '''\n              {/* Conversion Funnel */}\n              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>\n                <ConversionFunnelChart />\n              </Grid.Cell>\n\n              {/* Store Health Score */}\n              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>\n                <StoreHealthScore />\n              </Grid.Cell>\n\n              {/* Sales Heatmap */}\n              <Grid.Cell columnSpan={{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}>\n                <SalesHeatmap />\n              </Grid.Cell>'''
    
    # Try to find the last </Grid> tag and insert before it
    last_grid_close = content.rfind('</Grid>')
    if last_grid_close != -1:
        content = content[:last_grid_close] + new_sections + '\n            ' + content[last_grid_close:]
        print('Added new chart sections to Grid')
    else:
        # If no Grid, try to add before last </BlockStack>
        last_blockstack = content.rfind('</BlockStack>')
        if last_blockstack != -1:
            grid_section = '''\n          <Grid>''' + new_sections + '''\n          </Grid>'''
            content = content[:last_blockstack] + grid_section + '\n        ' + content[last_blockstack:]
            print('Added new Grid section with charts')

with open('app/routes/app._index.tsx', 'w') as f:
    f.write(content)
print('Updated app._index.tsx')
print('ALL DONE!')
