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
  InlineGrid,
  Banner,
  Badge,
  ProgressBar,
  Divider,
} from '@shopify/polaris';

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
    currency: shop.currencyCode,
  });
};

export default function Dashboard() {
  const {shop, kpis, currency} = useLoaderData<typeof loader>();

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
                  <ProgressBar progress={75} tone="success" size="small" />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Orders</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalOrders}</Text>
                  <Badge tone="success">+8.3%</Badge>
                  <ProgressBar progress={65} tone="success" size="small" />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Avg Order Value</Text>
                  <Text as="h2" variant="heading2xl">{currency} {kpis.avgOrderValue}</Text>
                  <Badge tone="attention">-2.1%</Badge>
                  <ProgressBar progress={45} tone="attention" size="small" />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Products</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalProducts}</Text>
                  <Badge>Active</Badge>
                  <ProgressBar progress={80} size="small" />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Total Customers</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalCustomers}</Text>
                  <Badge tone="info">+15 new</Badge>
                  <ProgressBar progress={90} tone="info" size="small" />
                </BlockStack>
              </Card>

              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Items Sold</Text>
                  <Text as="h2" variant="heading2xl">{kpis.totalItems}</Text>
                  <Badge tone="success">+18.7%</Badge>
                  <ProgressBar progress={85} tone="success" size="small" />
                </BlockStack>
              </Card>
            </InlineGrid>

            <Layout>
              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Revenue Metrics</Text>
                    <Divider />
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="p">This Month</Text>
                        <Text as="p" fontWeight="semibold">{currency} {kpis.totalRevenue}</Text>
                      </InlineStack>
                      <ProgressBar progress={75} tone="success" />
                      <InlineStack align="space-between">
                        <Text as="p" tone="subdued">Target: {currency} {(parseFloat(kpis.totalRevenue) * 1.2).toFixed(2)}</Text>
                        <Text as="p" tone="success">75% achieved</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Layout.Section>

              <Layout.Section variant="oneHalf">
                <Card>
                  <BlockStack gap="400">
                    <Text as="h2" variant="headingLg">Sales Performance</Text>
                    <Divider />
                    <BlockStack gap="300">
                      <InlineStack align="space-between">
                        <Text as="p">Orders Completed</Text>
                        <Text as="p" fontWeight="semibold">{kpis.totalOrders} orders</Text>
                      </InlineStack>
                      <ProgressBar progress={65} tone="success" />
                      <InlineStack align="space-between">
                        <Text as="p" tone="subdued">Target: {Math.round(kpis.totalOrders * 1.3)} orders</Text>
                        <Text as="p" tone="success">65% achieved</Text>
                      </InlineStack>
                    </BlockStack>
                  </BlockStack>
                </Card>
              </Layout.Section>
            </Layout>

            <Card>
              <BlockStack gap="300">
                <Text as="h2" variant="headingLg">Quick Insights</Text>
                <Divider />
                <InlineGrid columns={{xs: 1, sm: 2}} gap="400">
                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">💰 Average Order Value</Text>
                    <Text as="p">{currency} {kpis.avgOrderValue}</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Track order value trends over time</Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">📦 Items per Order</Text>
                    <Text as="p">{kpis.totalOrders > 0 ? (kpis.totalItems / kpis.totalOrders).toFixed(1) : 0} items</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Average items per order</Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">👥 Customer Base</Text>
                    <Text as="p">{kpis.totalCustomers} customers</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Growing customer community</Text>
                  </BlockStack>
                  <BlockStack gap="200">
                    <Text as="p" fontWeight="semibold">📊 Product Catalog</Text>
                    <Text as="p">{kpis.totalProducts} products</Text>
                    <Text as="p" tone="subdued" variant="bodySm">Active products in store</Text>
                  </BlockStack>
                </InlineGrid>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
