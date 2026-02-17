
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, InlineStack, Text, Box, Badge, Icon, Divider, Grid, Button, Banner } from "@shopify/polaris";
import RevenueByHourChart from "../../components/dashboard/RevenueByHourChart";
import WeeklyScorecard from "../../components/dashboard/WeeklyScorecard";
import YoYRevenueChart from "../../components/dashboard/YoYRevenueChart";
import AlertsFeed from "../../components/dashboard/AlertsFeed";
import RevenueGoalChart from "../../components/dashboard/RevenueGoalChart";
import { ChartVerticalIcon, OrderIcon, ProductIcon, PersonIcon, AlertCircleIcon, TrendingUpIcon } from "@shopify/polaris-icons";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const shopResponse = await admin.graphql(`
    query {
      shop { name email myshopifyDomain plan { displayName } }
    }
  `);
  const shopData = await shopResponse.json();

  const ordersResponse = await admin.graphql(`
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id name createdAt totalPriceSet { shopMoney { amount currencyCode } }
            displayFinancialStatus displayFulfillmentStatus
            lineItems(first: 5) { edges { node { title quantity } } }
          }
        }
      }
    }
  `);
  const ordersData = await ordersResponse.json();
  const orders = ordersData.data.orders.edges.map((e: any) => e.node);

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || "USD";

  const productsResponse = await admin.graphql(`
    query { products(first: 10, sortKey: CREATED_AT, reverse: true) { edges { node { id title status totalInventory priceRangeV2 { minVariantPrice { amount } } } } } }
  `);
  const productsData = await productsResponse.json();
  const products = productsData.data.products.edges.map((e: any) => e.node);

  const customersResponse = await admin.graphql(`
    query { customers(first: 10, sortKey: CREATED_AT, reverse: true) { edges { node { id displayName email ordersCount totalSpentV2 { amount currencyCode } createdAt } } } }
  `);
  const customersData = await customersResponse.json();
  const customers = customersData.data.customers.edges.map((e: any) => e.node);

  const dailyRevenue: Record<string, number> = {};
  orders.forEach((o: any) => {
    const day = o.createdAt.split("T")[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + parseFloat(o.totalPriceSet.shopMoney.amount);
  });

  return json({
    shop: shopData.data.shop,
    analytics: { totalRevenue, totalOrders, avgOrderValue, currency, dailyRevenue },
    recentOrders: orders.slice(0, 10),
    topProducts: products,
    recentCustomers: customers,
  });
};

export default function Dashboard() {
  const { shop, analytics, recentOrders, topProducts, recentCustomers } = useLoaderData<typeof loader>();

  // Sample chart data for visualizations
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    today: Math.floor(Math.random() * 1000) + 500,
    yesterday: Math.floor(Math.random() * 1000) + 400,
  }));

  const weeklyData = [
    { day: 'Mon', revenue: 12500, orders: 85, score: 78 },
    { day: 'Tue', revenue: 15200, orders: 92, score: 82 },
    { day: 'Wed', revenue: 14800, orders: 88, score: 80 },
    { day: 'Thu', revenue: 16500, orders: 95, score: 85 },
    { day: 'Fri', revenue: 18900, orders: 105, score: 88 },
    { day: 'Sat', revenue: 22100, orders: 120, score: 92 },
    { day: 'Sun', revenue: 19800, orders: 110, score: 87 },
  ];

  const alerts = [
    { id: 1, type: 'warning', message: 'Inventory low on 3 products', time: '2 hours ago' },
    { id: 2, type: 'success', message: 'Sales target achieved for today', time: '5 hours ago' },
    { id: 3, type: 'info', message: 'New customer segment identified', time: '1 day ago' },
  ];

  const revenueGoal = { current: analytics.totalRevenue, goal: 100000 };
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: analytics.currency }).format(n);

  const kpiCards = [
    { title: "Total Revenue", value: fmt(analytics.totalRevenue), change: "+12.5%", positive: true, icon: ChartVerticalIcon },
    { title: "Total Orders", value: analytics.totalOrders.toString(), change: "+8.2%", positive: true, icon: OrderIcon },
    { title: "Avg Order Value", value: fmt(analytics.avgOrderValue), change: "+3.1%", positive: true, icon: TrendingUpIcon },
    { title: "Total Products", value: topProducts.length.toString(), change: "0%", positive: true, icon: ProductIcon },
    { title: "Total Customers", value: recentCustomers.length.toString(), change: "+5.7%", positive: true, icon: PersonIcon },
  ];

  const dailyData = Object.entries(analytics.dailyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const maxRev = Math.max(...dailyData.map(([, v]) => v as number), 1);

  return (
    <Page title="GrowthPilot AI Dashboard">
      <BlockStack gap="500">
        <Banner title={`Welcome back, ${shop.name}!`} tone="info">
          <p>Your store analytics overview. Navigate using the sidebar to explore detailed dashboards.</p>
        </Banner>

        {/* KPI Cards */}
        <InlineStack gap="400" wrap={true}>
          {kpiCards.map((kpi, i) => (
            <div key={i} style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodySm" tone="subdued">{kpi.title}</Text>
                    <Icon source={kpi.icon} />
                  </InlineStack>
                  <Text as="p" variant="headingLg" fontWeight="bold">{kpi.value}</Text>
                  <Badge tone={kpi.positive ? "success" : "critical"}>{kpi.change}</Badge>
                </BlockStack>
              </Card>
            </div>
          ))}
        </InlineStack>

        {/* Revenue Chart - CSS Bar Chart */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Revenue Trend (Last 14 Days)</Text>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200, padding: "0 8px" }}>
              {dailyData.map(([day, rev], i) => {
                const height = ((rev as number) / maxRev) * 180;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Text as="p" variant="bodySm">{fmt(rev as number)}</Text>
                    <div style={{ width: "100%", height, backgroundColor: "var(--p-color-bg-fill-success)", borderRadius: 4, minHeight: 4 }} />
                    <Text as="p" variant="bodySm" tone="subdued">{day.slice(5)}</Text>
                  </div>
                );
              })}
            </div>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section variant="oneHalf">
            {/* Recent Orders */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Recent Orders</Text>
                  <Link to="/app/orders"><Button variant="plain">View All</Button></Link>
                </InlineStack>
                <Divider />
                {recentOrders.map((order: any, i: number) => (
                  <div key={i}>
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{order.name}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" alignment="end">
                          {fmt(parseFloat(order.totalPriceSet.shopMoney.amount))}
                        </Text>
                        <Badge tone={order.displayFinancialStatus === "PAID" ? "success" : "warning"}>
                          {order.displayFinancialStatus}
                        </Badge>
                      </BlockStack>
                    </InlineStack>
                    {i < recentOrders.length - 1 && <Divider />}
                  </div>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            {/* Top Products */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Top Products</Text>
                  <Link to="/app/products"><Button variant="plain">View All</Button></Link>
                </InlineStack>
                <Divider />
                {topProducts.map((product: any, i: number) => (
                  <div key={i}>
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{product.title}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Inventory: {product.totalInventory}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" alignment="end">
                          {fmt(parseFloat(product.priceRangeV2.minVariantPrice.amount))}
                        </Text>
                        <Badge tone={product.status === "ACTIVE" ? "success" : "warning"}>
                          {product.status}
                        </Badge>
                      </BlockStack>
                    </InlineStack>
                    {i < topProducts.length - 1 && <Divider />}
                  </div>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Quick Navigation */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Quick Navigation</Text>
            <InlineStack gap="300" wrap={true}>
              {[
                { label: "Sales & Revenue", to: "/app/analytics", icon: ChartVerticalIcon },
                { label: "Orders", to: "/app/orders", icon: OrderIcon },
                { label: "Products", to: "/app/products", icon: ProductIcon },
                { label: "Customers", to: "/app/customers", icon: PersonIcon },
                { label: "AI Insights", to: "/app/ai-insights", icon: AlertCircleIcon },
                { label: "Settings", to: "/app/settings", icon: TrendingUpIcon },
              ].map((nav, i) => (
                <Link key={i} to={nav.to} style={{ textDecoration: "none" }}>
                  <Card>
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={nav.icon} />
                      <Text as="p" variant="bodyMd">{nav.label}</Text>
                    </InlineStack>
                  </Card>
                </Link>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
