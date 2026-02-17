import { Card } from "@shopify/polaris";

export function TrafficSourcesChart() {
  const trafficData = [
    { source: "Organic Search", visitors: 45, percentage: 45 },
    { source: "Direct", visitors: 25, percentage: 25 },
    { source: "Social Media", visitors: 15, percentage: 15 },
    { source: "Referral", visitors: 10, percentage: 10 },
    { source: "Email", visitors: 5, percentage: 5 },
  ];

  return (
    <Card>
      <div style={{ padding: "20px" }}>
        <h3 style={{ marginBottom: "20px", fontSize: "18px", fontWeight: "600" }}>Traffic Sources</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {trafficData.map((item, index) => (
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
                      backgroundColor: index === 0 ? "#5C6AC4" : index === 1 ? "#47C1BF" : index === 2 ? "#F49342" : index === 3 ? "#7B61FF" : "#E4A1FF",
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
      </div>
    </Card>
  );
}
