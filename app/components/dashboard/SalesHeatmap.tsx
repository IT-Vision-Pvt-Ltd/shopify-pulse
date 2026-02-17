import { Card } from "@shopify/polaris";

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
