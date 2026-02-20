import { Card } from "@shopify/polaris";

interface StoreHealthScoreProps {
  score?: number;
  maxScore?: number;
}

export function StoreHealthScore({ score = 0, maxScore = 100 }: StoreHealthScoreProps) {
  const pct = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : pct >= 40 ? "#f97316" : "#ef4444";
  const label = pct >= 80 ? "Excellent" : pct >= 60 ? "Good" : pct >= 40 ? "Fair" : "Needs Attention";
  return (
    <Card>
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h3 style={{ marginBottom: "16px", fontSize: "18px", fontWeight: "600" }}>Store Health</h3>
        <div style={{ position: "relative", width: "120px", height: "120px", margin: "0 auto 12px" }}>
          <svg viewBox="0 0 120 120" width="120" height="120">
            <circle cx="60" cy="60" r="52" fill="none" stroke="#f3f3f3" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={color} strokeWidth="10"
              strokeDasharray={`${(pct / 100) * 327} 327`}
              strokeLinecap="round" transform="rotate(-90 60 60)" />
          </svg>
          <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <div style={{ fontSize: "28px", fontWeight: "700", color }}>{score}/{maxScore}</div>
          </div>
        </div>
        <div style={{ fontSize: "14px", fontWeight: "500", color }}>{label}</div>
      </div>
    </Card>
  );
}
