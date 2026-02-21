import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, TextField, Button, Divider, Select, Checkbox, Banner } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useState } from 'react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const admin = null; const session = { shop: "demo.myshopify.com" };
  
  const response = await admin.graphql(`{
    shop {
      name
      email
      currencyCode
      primaryDomain { url host }
      plan { displayName partnerDevelopment }
      billingAddress { country city }
      timezoneAbbreviation
    }
  }`);
  
  const data = await response.json();
  return json({ shop: data.data.shop });
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [lowStockAlert, setLowStockAlert] = useState(true);
  const [dailyReport, setDailyReport] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState('10');
  const [reportFrequency, setReportFrequency] = useState('weekly');
  
  return (
    <Page title="Settings" subtitle="Configure your dashboard preferences">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Store Information */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Store Information</Text>
                <Divider />
                <BlockStack gap="300">
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Store Name</Text>
                    <Text as="span" fontWeight="semibold">{shop.name}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Email</Text>
                    <Text as="span" fontWeight="semibold">{shop.email}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Currency</Text>
                    <Badge>{shop.currencyCode}</Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Domain</Text>
                    <Text as="span" fontWeight="semibold">{shop.primaryDomain?.host || 'N/A'}</Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Plan</Text>
                    <Badge tone={shop.plan?.partnerDevelopment ? 'info' : 'success'}>
                      {shop.plan?.displayName || 'Standard'}
                    </Badge>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Location</Text>
                    <Text as="span" fontWeight="semibold">
                      {shop.billingAddress?.city}, {shop.billingAddress?.country}
                    </Text>
                  </InlineStack>
                  <InlineStack align="space-between">
                    <Text as="span" tone="subdued">Timezone</Text>
                    <Badge>{shop.timezoneAbbreviation}</Badge>
                  </InlineStack>
                </BlockStack>
              </BlockStack>
            </Card>
            
            {/* Notification Settings */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Notification Settings</Text>
                <Divider />
                <BlockStack gap="300">
                  <Checkbox
                    label="Email Notifications"
                    helpText="Receive email alerts for important events"
                    checked={emailNotifications}
                    onChange={setEmailNotifications}
                  />
                  <Checkbox
                    label="Low Stock Alerts"
                    helpText="Get notified when products are running low"
                    checked={lowStockAlert}
                    onChange={setLowStockAlert}
                  />
                  <Checkbox
                    label="Daily Sales Report"
                    helpText="Receive a daily summary of sales"
                    checked={dailyReport}
                    onChange={setDailyReport}
                  />
                </BlockStack>
              </BlockStack>
            </Card>
            
            {/* Alert Thresholds */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Alert Configuration</Text>
                <Divider />
                <InlineStack gap="400">
                  <Box minWidth="250px">
                    <TextField
                      label="Low Stock Threshold"
                      type="number"
                      value={alertThreshold}
                      onChange={setAlertThreshold}
                      helpText="Alert when inventory falls below this number"
                      autoComplete="off"
                    />
                  </Box>
                  <Box minWidth="250px">
                    <Select
                      label="Report Frequency"
                      options={[
                        { label: 'Daily', value: 'daily' },
                        { label: 'Weekly', value: 'weekly' },
                        { label: 'Monthly', value: 'monthly' }
                      ]}
                      value={reportFrequency}
                      onChange={setReportFrequency}
                      helpText="How often to send summary reports"
                    />
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
            
            {/* Dashboard Navigation */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Quick Navigation</Text>
                <Divider />
                <InlineStack gap="300" wrap={true}>
                  <Button url="/app" variant="secondary">Dashboard</Button>
                  <Button url="/app/sales" variant="secondary">Sales</Button>
                  <Button url="/app/products" variant="secondary">Products</Button>
                  <Button url="/app/orders" variant="secondary">Orders</Button>
                  <Button url="/app/customers" variant="secondary">Customers</Button>
                  <Button url="/app/ai-insights" variant="secondary">AI Insights</Button>
                </InlineStack>
              </BlockStack>
            </Card>
            
            {/* App Info */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">About Shopify Pulse</Text>
                <Divider />
                <Banner title="Version 1.0.0" tone="info">
                  <p>Shopify Pulse - Your comprehensive analytics dashboard for Shopify stores.</p>
                </Banner>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">
                    Features: Sales Analytics, Product Tracking, Order Management, Customer Insights, AI-Powered Recommendations
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
            
            {/* Save Button */}
            <InlineStack align="end">
              <Button variant="primary" size="large">Save Settings</Button>
            </InlineStack>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
