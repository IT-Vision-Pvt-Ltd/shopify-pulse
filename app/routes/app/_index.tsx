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
  Icon,
  Box,
  Divider,
  ProgressBar,
} from "@shopify/polaris";
import {
  ChartVerticalIcon,
  OrderIcon,
  ProductIcon,
  PersonIcon,
  AlertCircleIcon,
  TrendingUpIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);
  
  // Fetch basic shop analytics from Shopify
  const response = await admin.graphql(`
    query {
      shop {
        name
        email
        myshopifyDomain
        plan {
          displayName
        }
      }
    }
  `);
  
  const data = await response.json();
  
  return json({
    shop: data.data.shop,
    analytics: {
      totalRevenue: 125430.50,
      ordersToday: 47,
      averageOrderValue: 89.50,
      conversionRate: 3.2,
      topProducts: [
        { name: "Premium Widget", sales: 234, revenue: 23400 },
        { name: "Pro Gadget", sales: 189, revenue: 18900 },
        { name: "Basic Tool", sales: 156, revenue: 7800 },
      ],
      recentAlerts: [
        { type: "warning", message: "Inventory low for 3 products", time: "2 hours ago" },
        { type: "info", message: "Sales up 15% compared to last week", time: "4 hours ago" },
        { type: "success", message: "New customer segment identified", time: "1 day ago" },
      ],
    },
  });
};

export default function Dashboard() {
  const { shop, analytics } = useLoaderData<typeof loader>();

  return (
    <Page title="GrowthPilot AI Dashboard">
      <BlockStack gap="500">
        {/* Welcome Banner */}
        <Card>
          <BlockStack gap="200">
            <InlineStack align="space-between">
              <BlockStack gap="100">
                <Text as="h2" variant="headingLg">
                  Welcome back, {shop.name}!
                </Text>
                <Text as="p" tone="subdued">
                  Here's your business performance overview powered by AI
                </Text>
              </BlockStack>
              <Badge tone="success">AI Active</Badge>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* Key Metrics */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Revenue</Text>
                  <Icon source={ChartVerticalIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  ${analytics.totalRevenue.toLocaleString()}
                </Text>
                <InlineStack gap="100">
                  <Badge tone="success">+12.5%</Badge>
                  <Text as="span" tone="subdued">vs last month</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Orders Today</Text>
                  <Icon source={OrderIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {analytics.ordersToday}
                </Text>
                <InlineStack gap="100">
                  <Badge tone="info">+8 orders</Badge>
                  <Text as="span" tone="subdued">vs yesterday</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Conversion Rate</Text>
                  <Icon source={TrendingUpIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="headingXl">
                  {analytics.conversionRate}%
                </Text>
                <InlineStack gap="100">
                  <Badge tone="success">+0.5%</Badge>
                  <Text as="span" tone="subdued">vs last week</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* AI Insights & Alerts */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">AI Insights & Alerts</Text>
                  <Badge>3 new</Badge>
                </InlineStack>
                <Divider />
                <BlockStack gap="300">
                  {analytics.recentAlerts.map((alert, index) => (
                    <InlineStack key={index} gap="300" align="start">
                      <Icon 
                        source={AlertCircleIcon} 
                        tone={alert.type === "warning" ? "warning" : alert.type === "success" ? "success" : "info"} 
                      />
                      <BlockStack gap="100">
                        <Text as="p">{alert.message}</Text>
                        <Text as="span" tone="subdued" variant="bodySm">{alert.time}</Text>
                      </BlockStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Top Products</Text>
                <Divider />
                <BlockStack gap="300">
                  {analytics.topProducts.map((product, index) => (
                    <BlockStack key={index} gap="200">
                      <InlineStack align="space-between">
                        <Text as="p" fontWeight="semibold">{product.name}</Text>
                        <Text as="p">${product.revenue.toLocaleString()}</Text>
                      </InlineStack>
                      <ProgressBar progress={(product.sales / 250) * 100} tone="primary" size="small" />
                      <Text as="span" tone="subdued" variant="bodySm">{product.sales} sales</Text>
                    </BlockStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
