import { Card, Text, BlockStack } from '@shopify/polaris';

interface WeeklyData {
  week: string;
  revenue: number;
  orders: number;
  convRate: number;
}

interface WeeklyScorecardProps {
  data: WeeklyData[];
  currency: string;
}

export function WeeklyScorecard({ data, currency }: WeeklyScorecardProps) {
  // Calculate percentiles for color coding
  const getColor = (value: number, values: number[]) => {
    const sorted = [...values].sort((a, b) => a - b);
    const percentile = (sorted.indexOf(value) / sorted.length) * 100;
    if (percentile >= 75) return '#10B981'; // Green
    if (percentile >= 50) return '#F59E0B'; // Orange
    if (percentile >= 25) return '#EF4444'; // Red
    return '#DC2626'; // Dark red
  };

  const revenues = data.map(d => d.revenue);
  const convRates = data.map(d => d.convRate);

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Weekly Performance Scorecard (Last 12 Weeks)
        </Text>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ backgroundColor: '#f4f4f5' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #e4e4e7' }}>Week</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e4e4e7' }}>Revenue</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e4e4e7' }}>Orders</th>
                <th style={{ padding: '12px', textAlign: 'right', borderBottom: '2px solid #e4e4e7' }}>Conv %</th>
              </tr>
            </thead>
            <tbody>
              {data.map((week) => (
                <tr key={week.week} style={{ borderBottom: '1px solid #e4e4e7' }}>
                  <td style={{ padding: '12px', fontWeight: 600 }}>{week.week}</td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'right',
                    backgroundColor: getColor(week.revenue, revenues) + '20',
                    color: getColor(week.revenue, revenues),
                    fontWeight: 600
                  }}>
                    {currency} {week.revenue.toLocaleString()}
                  </td>
                  <td style={{ padding: '12px', textAlign: 'right' }}>{week.orders}</td>
                  <td style={{
                    padding: '12px',
                    textAlign: 'right',
                    backgroundColor: getColor(week.convRate, convRates) + '20',
                    color: getColor(week.convRate, convRates),
                    fontWeight: 600
                  }}>
                    {week.convRate}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </BlockStack>
    </Card>
  );
}
