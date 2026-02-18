import { Card, Text, BlockStack, InlineStack, Icon, Badge } from '@shopify/polaris';
import { AlertCircleIcon, CheckCircleIcon, InfoIcon } from '@shopify/polaris-icons';

interface Alert {
  type: 'warning' | 'alert' | 'success' | 'info';
  message: string;
  time: string;
}

interface AlertsFeedProps {
  alerts: Alert[];
}

export function AlertsFeed({ alerts = [] }: AlertsFeedProps) {
  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'warning':
        return { icon: AlertCircleIcon, color: '#F59E0B', bgColor: '#FEF3C7' };
      case 'alert':
        return { icon: AlertCircleIcon, color: '#EF4444', bgColor: '#FEE2E2' };
      case 'success':
        return { icon: CheckCircleIcon, color: '#10B981', bgColor: '#D1FAE5' };
      default:
        return { icon: InfoIcon, color: '#635BFF', bgColor: '#EDE9FE' };
    }
  };

  return (
    <Card>
      <BlockStack gap="400">
        <Text variant="headingMd" as="h2">
          Alerts & Anomalies
        </Text>
        <BlockStack gap="300">
          {alerts.map((alert, index) => {
            const { icon, color, bgColor } = getIconAndColor(alert.type);
            return (
              <div
                key={index}
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  backgroundColor: bgColor,
                  border: `1px solid ${color}30`,
                }}
              >
                <InlineStack gap="300" align="start">
                  <div style={{ marginTop: '2px' }}>
                    <Icon source={icon} tone={alert.type === 'success' ? 'success' : alert.type === 'warning' ? 'caution' : 'critical'} />
                  </div>
                  <BlockStack gap="100">
                    <Text as="p" variant="bodyMd">
                      {alert.message}
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      {alert.time}
                    </Text>
                  </BlockStack>
                </InlineStack>
              </div>
            );
          })}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}
