import { Card } from "@shopify/polaris";

interface SalesHeatmapProps {
  data?: number[][];
  days?: string[];
}

const defaultDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);

function getColor(val: number): string {
  if (val <= 20) return "#e3f2fd";
  if (val <= 40) return "#90caf9";
  if (val <= 60) return "#42a5f5";
  if (val <= 80) return "#1e88e5";
  return "#0d47a1";
}

export function SalesHeatmap({ data, days = defaultDays }: SalesHeatmapProps) {
  const heatmapData = data || days.map(() => Array(24).fill(0));
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
                {heatmapData[di]?.map((val: number, hi: number) => (
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
