import { Card } from "@shopify/polaris";

interface FunnelStage {
  stage: string;
  value: number;
  pct: number;
  color: string;
}

interface ConversionFunnelChartProps {
  data?: FunnelStage[];
}

const defaultFunnelData: FunnelStage[] = [
  { stage: "Sessions", value: 0, pct: 100, color: "#5C6AC4" },
  { stage: "Product Views", value: 0, pct: 0, color: "#47C1BF" },
  { stage: "Add to Cart", value: 0, pct: 0, color: "#9C6ADE" },
  { stage: "Checkout", value: 0, pct: 0, color: "#F49342" },
  { stage: "Purchase", value: 0, pct: 0, color: "#50B83C" },
];

export function ConversionFunnelChart({ data = defaultFunnelData }: ConversionFunnelChartProps) {
  const mx = data[0]?.value || 1;
  return (
    <Card>
      <div style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "4px", fontSize: "18px", fontWeight: "600" }}>Conversion Funnel</h3>
        <p style={{ marginBottom: "20px", fontSize: "13px", color: "#8c9196" }}>Sessions to Purchase</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ width: "100px", fontSize: "13px", textAlign: "right", color: "#6d7175" }}>{item.stage}</div>
              <div style={{ flex: 1, position: "relative", height: "28px", backgroundColor: "#f3f3f3", borderRadius: "4px", overflow: "hidden" }}>
                <div
                  style={{ position: "absolute", left: 0, top: 0, height: "100%", width: (item.value / mx * 100) + "%", backgroundColor: item.color, borderRadius: "4px", transition: "width 0.5s ease", display: "flex", alignItems: "center", paddingLeft: "8px" }}>
                  <span style={{ color: "#fff", fontSize: "12px", fontWeight: "500", whiteSpace: "nowrap" }}>
                    {item.value.toLocaleString()} ({item.pct}%)
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "16px", justifyContent: "center" }}>
          {data.map((item, i) => (
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
