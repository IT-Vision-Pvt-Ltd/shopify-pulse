import { useLoaderData } from '@remix-run/react';
import { json, type LoaderFunctionArgs } from '@remix-run/node';
import { authenticate } from '../../shopify.server';
import {
  Page,
  Layout,
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  Box,
  InlineGrid,
  Banner,
  Badge,
} from '@shopify/polaris';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      shop {
        name
        currencyCode
      }
      orders(first: 50, reverse: true) {
        edges {
          node {
            id
            name
            totalPriceSet {
              shopMoney {
                amount
              }
            }
            createdAt
            lineItems(first: 50) {
              edges {
                node {
                  quantity
                }
              }
            }
          }
        }
      }
      products(first: 50) {
        edges {
          node {
            id
          }
        }
      }
      customers(first: 50) {
        edges {
          node {
            id
          }
        }
      }
    }
  `);

  const data = await response.json();
  const shop = data.data.shop;
  const orders = data.data.orders.edges || [];
  const products = data.data.products.edges || [];
  const customers = data.data.customers.edges || [];

  const totalRevenue = orders.reduce(
    (sum, {node}) => sum + parseFloat(node.totalPriceSet.shopMoney.amount),
    0
  );
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const totalItems = orders.reduce(
    (sum, {node}) =>
      sum + node.lineItems.edges.reduce((s, {node: item}) => s + item.quantity, 0),
    0
  );

  const dailyData: Record<string, {revenue: number; orders: number}> = {};
  orders.forEach(({node}) => {
    const date = new Date(node.createdAt).toISOString().split('T')[0];
    if (!dailyData[date]) {
      dailyData[date] = {revenue: 0, orders: 0};
    }
    dailyData[date].revenue += parseFloat(node.totalPriceSet.shopMoney.amount);
    dailyData[date].orders += 1;
  });

  const chartData = Object.entries(dailyData)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-14)
    .map(([date, data]) => ({
      date: new Date(date).toLocaleDateString('en-US', {month: 'short', day: 'numeric'}),
      revenue: Math.round(data.revenue),
      orders: data.orders,
    }));

  return json({
    shop,
    kpis: {
      totalRevenue: totalRevenue.toFixed(2),
      totalOrders,
      avgOrderValue: avgOrderValue.toFixed(2),
      totalProducts: products.length,
      totalCustomers: customers.length,
      totalItems,
    },
    chartData,
    currency: shop.currencyCode,
  });
};

export default function Dashboard() {
  const {shop, kpis, chartData, currency} = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard Overview">
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            <Banner tone="info">
              <Text as="p" variant="bodyMd">
                Welcome to GrowthPilot AI, {shop.name}! 👋 Track your store performance and make data-driven decisions.
              </Text>
            </Banner>

            <InlineGrid columns={{xs: 1, sm: 2, md: 3, lg: 6}} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Revenue</Text>
                  <Text as="h2" variant="heading2xl">{currency} {kpis.totalRevenue}</Text>
                  <Badge tone="success">+12.5%</Badge>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Orders</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalOrders}</Text>
                  <Badge tone="success">+8.3%</Badge>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Avg Order Value</Text>
                  <Text as="h2" variant="heading2xl">{currency} {kpis.avgOrderValue}</Text>
                  <Badge tone="attention">-2.1%</Badge>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Products</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalProducts}</Text>
                  <Badge>Active</Badge>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Customers</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalCustomers}</Text>
                  <Badge tone="info">+15 new</Badge>
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Items Sold</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalItems}</Text>
                  <Badge tone="success">+18.7%</Badge>
                </BlockStack>
              </Card>
            </InlineGrid>

            <Layout>
              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Revenue Trend (Last 14 Days)</Text>
                    <Box minHeight="300px">
                      <ResponsiveContainer width="100%" height={300}>
                        <AreaChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Area type="monotone" dataKey="revenue" stroke="#008060" fill="#b4e8d1" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </Box>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingMd">Orders Trend (Last 14 Days)</Text>
                    <Box minHeight="300px">
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="orders" fill="#5C6AC4" />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Quick Actions</Text>
                <InlineStack gap="300">
                  <Button variant="primary">View Analytics</Button>
                  <Button>Generate Report</Button>
                  <Button>AI Insights</Button>
                  <Button>Settings</Button>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
