import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  DataTable,
  Select,
  Button,
  Box,
} from "@shopify/polaris";
import { useState } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  return json({
    salesData: [
      { date: "2024-02-01", orders: 45, revenue: 4523.50, customers: 38 },
      { date: "2024-02-02", orders: 52, revenue: 5120.00, customers: 45 },
      { date: "2024-02-03", orders: 38, revenue: 3890.25, customers: 32 },
      { date: "2024-02-04", orders: 61, revenue: 6234.00, customers: 55 },
      { date: "2024-02-05", orders: 48, revenue: 4756.75, customers: 41 },
    ],
    metrics: {
      totalOrders: 244,
      totalRevenue: 24524.50,
      averageOrderValue: 100.51,
      totalCustomers: 211,
      returningCustomers: 89,
      newCustomers: 122,
    },
  });
};

export default function Analytics() {
  const { salesData, metrics } = useLoaderData<typeof loader>();
  const [selectedPeriod, setSelectedPeriod] = useState("7days");

  const rows = salesData.map((day) => [
    day.date,
    day.orders.toString(),
    `$${day.revenue.toFixed(2)}`,
    day.customers.toString(),
  ]);

  return (
    <Page
      title="Analytics"
      primaryAction={<Button variant="primary">Export Report</Button>}
    >
      <BlockStack gap="500">
        {/* Period Selector */}
        <Card>
          <InlineStack align="space-between">
            <Text as="h2" variant="headingMd">Sales Analytics</Text>
            <Select
              label="Time period"
              labelHidden
              options={[
                { label: "Last 7 days", value: "7days" },
                { label: "Last 30 days", value: "30days" },
                { label: "Last 90 days", value: "90days" },
                { label: "This year", value: "year" },
              ]}
              value={selectedPeriod}
              onChange={setSelectedPeriod}
            />
          </InlineStack>
        </Card>

        {/* Key Metrics */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Total Orders</Text>
                <Text as="p" variant="headingXl">{metrics.totalOrders}</Text>
                <Badge tone="success">+15% vs last period</Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Total Revenue</Text>
                <Text as="p" variant="headingXl">${metrics.totalRevenue.toLocaleString()}</Text>
                <Badge tone="success">+22% vs last period</Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <Text as="h3" variant="headingMd">Avg Order Value</Text>
                <Text as="p" variant="headingXl">${metrics.averageOrderValue.toFixed(2)}</Text>
                <Badge tone="info">+5% vs last period</Badge>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Customer Metrics */}
        <Layout>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Customer Breakdown</Text>
                <InlineStack gap="400">
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued">New Customers</Text>
                    <Text as="p" variant="headingLg">{metrics.newCustomers}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued">Returning</Text>
                    <Text as="p" variant="headingLg">{metrics.returningCustomers}</Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="p" tone="subdued">Total</Text>
                    <Text as="p" variant="headingLg">{metrics.totalCustomers}</Text>
                  </BlockStack>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneHalf">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">AI Recommendation</Text>
                <Box background="bg-surface-secondary" padding="400" borderRadius="200">
                  <Text as="p">
                    Based on your data, focus on email campaigns targeting returning customers. 
                    They show 40% higher conversion rates than new visitors.
                  </Text>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Data Table */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Daily Sales Data</Text>
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric"]}
              headings={["Date", "Orders", "Revenue", "Customers"]}
              rows={rows}
              totals={["", metrics.totalOrders.toString(), `$${metrics.totalRevenue.toFixed(2)}`, metrics.totalCustomers.toString()]}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
