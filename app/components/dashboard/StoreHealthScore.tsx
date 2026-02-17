import { Card } from "@shopify/polaris";

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
