import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Card, Text, BlockStack } from '@shopify/polaris';

interface ChannelData {
  month: string;
  onlineStore: number;
  pos: number;
  social: number;
  marketplace: number;
}

interface RevenueByChannelChartProps {
  data: ChannelData[];
  currency: string;
}

export function RevenueByChannelChart({ data, currency }: RevenueByChannelChartProps) {
  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Revenue by Channel
        </Text>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
              <XAxis dataKey="month" stroke="#71717a" />
              <YAxis stroke="#71717a" />
              <Tooltip
                contentStyle={{ backgroundColor: '#fff', border: '1px solid #e4e4e7' }}
                formatter={(value: number) => `${currency} ${value.toLocaleString()}`}
              />
              <Legend />
              <Area type="monotone" dataKey="onlineStore" stackId="1" stroke="#635BFF" fill="#635BFF" name="Online Store" />
              <Area type="monotone" dataKey="pos" stackId="1" stroke="#10B981" fill="#10B981" name="POS" />
              <Area type="monotone" dataKey="social" stackId="1" stroke="#EC4899" fill="#EC4899" name="Social" />
              <Area type="monotone" dataKey="marketplace" stackId="1" stroke="#F59E0B" fill="#F59E0B" name="Marketplace" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </BlockStack>
    </Card>
  );
}
