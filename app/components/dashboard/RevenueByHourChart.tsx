import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Text, BlockStack } from '@shopify/polaris';

interface RevenueByHourChartProps {
  data: Array<{
    hour: string;
    today: number;
    yesterday: number;
  }>;
  currency: string;
}

export function RevenueByHourChart({ data = [], currency = "USD" }: RevenueByHourChartProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Revenue by Hour (Today)
        </Text>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="hour" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7' }}
                formatter={(value: number) => `${currency} ${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="today" fill="#635BFF" name="Today" />
              <Bar dataKey="yesterday" fill="#B5B3F5" name="Yesterday" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}
