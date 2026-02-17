import { Card, Text, BlockStack, ProgressBar, InlineStack } from '@shopify/polaris';

interface RevenueGoalChartProps {
  currentRevenue: number;
  dailyGoal: number;
  currency: string;
}

export function RevenueGoalChart({ currentRevenue, dailyGoal, currency }: RevenueGoalChartProps) {
  const progress = Math.min((currentRevenue / dailyGoal) * 100, 100);
  const isOnTrack = currentRevenue >= dailyGoal;

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <Text variant="headingMd" as="h2">
            Daily Revenue vs. Goal
          </Text>
          <Text variant="headingSm" as="p" tone={isOnTrack ? 'success' : 'subdued'}>
            {progress.toFixed(1)}%
          </Text>
        </InlineStack>
        
        <BlockStack gap="200">
          <ProgressBar progress={progress} tone={isOnTrack ? 'success' : 'primary'} size="medium" />
          
          <InlineStack align="space-between">
            <BlockStack gap="050">
              <Text variant="bodyMd" as="p" tone="subdued">
                Current Revenue
              </Text>
              <Text variant="headingLg" as="p">
                {currency} {currentRevenue.toLocaleString()}
              </Text>
            </BlockStack>
            
            <BlockStack gap="050" align="end">
              <Text variant="bodyMd" as="p" tone="subdued">
                Daily Goal
              </Text>
              <Text variant="headingLg" as="p">
                {currency} {dailyGoal.toLocaleString()}
              </Text>
            </BlockStack>
          </InlineStack>

          {currentRevenue < dailyGoal && (
            <div style={{
              padding: '12px',
              backgroundColor: '#FEF3C7',
              borderRadius: '8px',
              border: '1px solid #F59E0B30'
            }}>
              <Text variant="bodySm" as="p">
                Need {currency} {(dailyGoal - currentRevenue).toLocaleString()} more to reach today's goal
              </Text>
            </div>
          )}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
