import { useLoaderData } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Box,
  Icon,
  Badge,
  Divider,
  Grid,
  InlineGrid,
  SkeletonBodyText,
} from "@shopify/polaris";
import {
  ArrowUpIcon,
  ArrowDownIcon,
  MagicIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import { RevenueByHourChart } from '../components/dashboard/RevenueByHourChart';
import { WeeklyScorecard } from '../components/dashboard/WeeklyScorecard';
import { YoYRevenueChart } from '../components/dashboard/YoYRevenueChart';
import { AlertsFeed } from '../components/dashboard/AlertsFeed';
import { RevenueGoalChart } from '../components/dashboard/RevenueGoalChart';
import { ConversionFunnelChart } from "../components/dashboard/ConversionFunnelChart";
import { StoreHealthScore } from "../components/dashboard/StoreHealthScore";
import { SalesHeatmap } from "../components/dashboard/SalesHeatmap";
import { RevenueByChannelChart } from "../components/dashboard/RevenueByChannelChart";
import { TrafficSourcesChart } from "../components/dashboard/TrafficSourcesChart";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  // Fetch basic shop data
  const shopResponse = await admin.graphql(`
    query {
      shop {
        name
        currencyCode
      }
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            totalPriceSet { shopMoney { amount currencyCode } }
            createdAt
          }
        }
      }
      products(first: 10, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            title
            totalInventory
          }
        }
      }
    }
  `);

  const shopData = await shopResponse.json();
  
  // Calculate metrics
  const orders = shopData.data?.orders?.edges || [];
  const totalRevenue = orders.reduce((sum: number, edge: any) => {
    return sum + parseFloat(edge.node.totalPriceSet?.shopMoney?.amount || 0);
  }, 0);
  const orderCount = orders.length;
  const aov = orderCount > 0 ? totalRevenue / orderCount : 0;
  
  return json({
    shopName: shopData.data?.shop?.name || "Your Store",
    currency: shopData.data?.shop?.currencyCode || "USD",
    metrics: {
      revenue: totalRevenue,
      orders: orderCount,
      aov: aov,
      conversionRate: 3.2, // Placeholder
      profitMargin: 28.5, // Placeholder
    },
    recentOrders: orders.slice(0, 5),
    products: shopData.data?.products?.edges || [],
  });
};

// KPI Card Component
function KPICard({ 
  label, 
  value, 
  change, 
  changeType, 
  format = "number" 
}: {
  label: string;
  value: number;
  change: number;
  changeType: "positive" | "negative" | "neutral";
  format?: "number" | "currency" | "percent";
}) {
  const formatValue = (val: number) => {
    switch (format) {
      case "currency":
        return new Intl.NumberFormat("en-US", { 
          style: "currency", 
          currency: "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        }).format(val);
      case "percent":
        return `${val.toFixed(1)}%`;
      default:
        return new Intl.NumberFormat("en-US").format(val);
    }
  };

  return (
    <Card>
      <BlockStack gap="200">
        <Text as="p" variant="bodySm" tone="subdued">
          {label}
        </Text>
        <Text as="p" variant="heading2xl" fontWeight="bold">
          {formatValue(value)}
        </Text>
        <InlineStack gap="100" align="start">
          <Box
            padding="100"
            borderRadius="full"
            background={changeType === "positive" ? "bg-fill-success" : changeType === "negative" ? "bg-fill-critical" : "bg-fill"}
          >
            <InlineStack gap="050" blockAlign="center">
              <Icon source={changeType === "positive" ? ArrowUpIcon : ArrowDownIcon} />
              <Text as="span" variant="bodySm" fontWeight="semibold">
                {Math.abs(change).toFixed(1)}%
              </Text>
            </InlineStack>
          </Box>
          <Text as="span" variant="bodySm" tone="subdued">
            vs last period
          </Text>
        </InlineStack>
      </BlockStack>
    </Card>
  );
}

// AI Insights Card Component
function AIInsightsCard({ insights }: { insights: string[] }) {
  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack gap="200" blockAlign="center">
          <Box
            padding="200"
            borderRadius="200"
            background="bg-fill-magic"
          >
            <Icon source={MagicIcon} tone="magic" />
          </Box>
          <BlockStack gap="0">
            <Text as="h3" variant="headingMd" fontWeight="semibold">
              Today's AI Brief
            </Text>
            <Text as="p" variant="bodySm" tone="subdued">
              Key insights from your data
            </Text>
          </BlockStack>
          <div style={{ marginLeft: "auto" }}>
            <Badge tone="magic">AI Generated</Badge>
          </div>
        </InlineStack>
        <Divider />
        <BlockStack gap="300">
          {insights.map((insight, index) => (
            <InlineStack key={index} gap="200" blockAlign="start">
              <Text as="span" tone="magic">•</Text>
              <Text as="p" variant="bodyMd">
                {insight}
              </Text>
            </InlineStack>
          ))}
        </BlockStack>
      </BlockStack>
    </Card>
  );
}

export default function Dashboard() {
  const { shopName, metrics, recentOrders } = useLoaderData<typeof loader>();

  // Sample AI insights - in production, these would come from AI analysis
  const aiInsights = [
    `Revenue is trending ${metrics.revenue > 1000 ? "above" : "below"} average for this period`,
    `${metrics.orders} orders processed - consider promotional campaigns to boost volume`,
    `Average order value of $${metrics.aov.toFixed(2)} shows healthy customer spending`,
  ];

  return (
    <Page title="Executive Command Center">
      <BlockStack gap="500">
        {/* AI Daily Brief Banner */}
        <AIInsightsCard insights={aiInsights} />

        {/* KPI Cards Row */}
        <Text as="h2" variant="headingLg">
          Key Performance Indicators
        </Text>
        <InlineGrid columns={{ xs: 1, sm: 2, md: 3, lg: 5 }} gap="400">
          <KPICard
            label="Total Revenue"
            value={metrics.revenue}
            change={12.5}
            changeType="positive"
            format="currency"
          />
          <KPICard
            label="Orders"
            value={metrics.orders}
            change={8.3}
            changeType="positive"
            format="number"
          />
          <KPICard
            label="Average Order Value"
            value={metrics.aov}
            change={-2.1}
            changeType="negative"
            format="currency"
          />
          <KPICard
            label="Conversion Rate"
            value={metrics.conversionRate}
            change={0.5}
            changeType="positive"
            format="percent"
          />
          <KPICard
            label="Profit Margin"
            value={metrics.profitMargin}
            change={1.2}
            changeType="positive"
            format="percent"
          />
        </InlineGrid>

        {/* Main Content Grid */}
        <Layout>
          <Layout.Section variant="twoThirds">
            <Card>
              <RevenueByHourChart />
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h3" variant="headingMd">
                  Store Health Score
                </Text>
                <Box minHeight="200px" background="bg-surface-secondary" borderRadius="full" padding="400">
                  <BlockStack gap="200" align="center">
                    <Text as="p" variant="heading3xl" fontWeight="bold" tone="success">
                      85
                    </Text>
                    <Text as="p" variant="bodySm" tone="subdued">
                      out of 100
                    </Text>
                  </BlockStack>
                </Box>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Recent Orders Section */}
        <Card>
          <BlockStack gap="400">
            <Text as="h3" variant="headingMd">
              Recent Orders
            </Text>
            <BlockStack gap="200">
              {recentOrders.length > 0 ? (
                recentOrders.map((order: any) => (
                  <Box key={order.node.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                    <InlineStack align="space-between">
                      <Text as="span" fontWeight="semibold">
                        {order.node.name}
                      </Text>
                      <Text as="span">
                        ${parseFloat(order.node.totalPriceSet?.shopMoney?.amount || 0).toFixed(2)}
                      </Text>
                    </InlineStack>
                  </Box>
                ))
              ) : (
                <Text as="p" tone="subdued">
                  No recent orders found
                </Text>
              )}
            </BlockStack>
          </BlockStack>
        </Card>
      
          <Grid>
              {/* Conversion Funnel */}
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                <ConversionFunnelChart />
              </Grid.Cell>

              {/* Store Health Score */}
              <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
                <StoreHealthScore />
              </Grid.Cell>

              {/* Sales Heatmap */}
              <Grid.Cell columnSpan={{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}>
                <SalesHeatmap />
              </Grid.Cell>
            {/* Revenue by Channel */}
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <RevenueByChannelChart />
            </Grid.Cell>
            {/* Traffic Sources */}
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <TrafficSourcesChart />
            </Grid.Cell>
            {/* Monthly Revenue YoY */}
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <YoYRevenueChart />
            </Grid.Cell>
            {/* Alerts & Anomalies */}
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <AlertsFeed />
            </Grid.Cell>
            {/* Weekly Performance Scorecard */}
            <Grid.Cell columnSpan={{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}>
              <WeeklyScorecard />
            </Grid.Cell>
          </Grid>
        </BlockStack>
    </Page>
  );
}
