import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Text, BlockStack } from '@shopify/polaris';

interface YoYRevenueChartProps {
  data: Array<{
    month: string;
    [key: string]: string | number;
  }>;
  currency: string;
}

export function YoYRevenueChart({ data = [], currency = "USD" }: YoYRevenueChartProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Monthly Revenue (Year-over-Year)
        </Text>
        <div style={{ height: 350 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7' }}
                formatter={(value: number) => `${currency} ${value.toLocaleString()}`}
              />
              <Legend />
              <Bar dataKey="2024" fill="#94A3B8" name="2024" />
              <Bar dataKey="2025" fill="#635BFF" name="2025" />
              <Bar dataKey="2026" fill="#10B981" name="2026" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}
