import { Card } from "@shopify/polaris";

interface TrafficSource {
  source: string;
  visitors: number;
  percentage: number;
}

interface TrafficSourcesChartProps {
  data?: TrafficSource[];
}

const defaultData: TrafficSource[] = [
  { source: "Organic Search", visitors: 0, percentage: 0 },
];

const barColors = ["#5C6AC4", "#47C1BF", "#F49342", "#7B61FF", "#E4A1FF"];

export function TrafficSourcesChart({ data = defaultData }: TrafficSourcesChartProps) {
  return (
    <Card>
      <div style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>Traffic Sources</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {data.map((item, index) => (
            <div key={index} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: "4px", fontSize: "14px" }}>{item.source}</div>
                <div style={{ position: "relative", height: "8px", backgroundColor: "#f3f3f3", borderRadius: "4px", overflow: "hidden" }}>
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      height: "100%",
                      width: `${item.percentage}%`,
                      backgroundColor: barColors[index % barColors.length],
                      transition: "width 0.3s ease"
                    }}
                  />
                </div>
              </div>
              <div style={{ minWidth: "60px", textAlign: "right", fontSize: "14px", fontWeight: "500" }}>
                {item.visitors}%
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "16px", justifyContent: "center" }}>
          {data.map((item, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              <div style={{ width: "10px", height: "10px", borderRadius: "2px", backgroundColor: barColors[i % barColors.length] }} />
              <span style={{ fontSize: "12px", color: "#6d7175" }}>{item.source}</span>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
