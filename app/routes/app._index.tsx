import { json } from '@remix-run/node';
import { useLoaderData, Link } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, Button, Divider, ProgressBar, InlineGrid } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`{
    orders(first: 50, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          createdAt
          totalPriceSet { shopMoney { amount } }
          displayFulfillmentStatus
          displayFinancialStatus
        }
      }
    }
    products(first: 50, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          title
          totalInventory
          tracksInventory
          status
        }
      }
    }
    customers(first: 50, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          numberOfOrders
          amountSpent { amount }
          createdAt
        }
      }
    }
    shop { name currencyCode }
  }`);
  
  const data = await response.json();
  const orders = data.data.orders.edges;
  const products = data.data.products.edges;
  const customers = data.data.customers.edges;
  
  // Calculate key metrics
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.node.totalPriceSet.shopMoney.amount), 0);
  const totalOrders = orders.length;
  const totalProducts = products.length;
  const totalCustomers = customers.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fulfilledOrders = orders.filter((o: any) => o.node.displayFulfillmentStatus === 'FULFILLED').length;
  const lowStockProducts = products.filter((p: any) => p.node.tracksInventory && p.node.totalInventory < 10 && p.node.totalInventory > 0).length;
  const outOfStockProducts = products.filter((p: any) => p.node.tracksInventory && p.node.totalInventory === 0).length;
  const newCustomers = customers.filter((c: any) => {
    const created = new Date(c.node.createdAt);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created > thirtyDaysAgo;
  }).length;
  
  return json({
    metrics: { totalRevenue, totalOrders, totalProducts, totalCustomers, avgOrderValue, fulfilledOrders, lowStockProducts, outOfStockProducts, newCustomers },
    shopName: data.data.shop.name,
    currency: data.data.shop.currencyCode
  });
};

export default function Index() {
  const { metrics, shopName, currency } = useLoaderData<typeof loader>();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  
  const dashboards = [
    { title: 'Sales Analytics', description: 'Track revenue, trends, and performance', url: '/app/sales', badge: 'Revenue', badgeTone: 'success' as const },
    { title: 'Products', description: 'Monitor inventory and product performance', url: '/app/products', badge: `${metrics.lowStockProducts} Low Stock`, badgeTone: metrics.lowStockProducts > 0 ? 'warning' as const : 'success' as const },
    { title: 'Orders', description: 'View and manage all orders', url: '/app/orders', badge: `${metrics.totalOrders} Orders`, badgeTone: 'info' as const },
    { title: 'Customers', description: 'Understand your customer base', url: '/app/customers', badge: `${metrics.newCustomers} New`, badgeTone: 'success' as const },
    { title: 'AI Insights', description: 'Smart recommendations and alerts', url: '/app/ai-insights', badge: 'AI Powered', badgeTone: 'info' as const },
    { title: 'Settings', description: 'Configure dashboard preferences', url: '/app/settings', badge: 'Config', badgeTone: 'default' as const }
  ];
  
  return (
    <Page title="Shopify Pulse" subtitle={`Welcome back! Here\'s an overview of ${shopName}`}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="500">
            {/* Key Metrics Overview */}
            <InlineGrid columns={4} gap="400">
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Revenue</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(metrics.totalRevenue)}</Text>
                  <Badge tone="success">Last 50 orders</Badge>
                </BlockStack>
              </Box>
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Orders</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{metrics.totalOrders}</Text>
                  <InlineStack gap="100">
                    <Badge tone="success">{metrics.fulfilledOrders} Fulfilled</Badge>
                  </InlineStack>
                </BlockStack>
              </Box>
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Products</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{metrics.totalProducts}</Text>
                  <InlineStack gap="100">
                    {metrics.lowStockProducts > 0 && <Badge tone="warning">{metrics.lowStockProducts} Low</Badge>}
                    {metrics.outOfStockProducts > 0 && <Badge tone="critical">{metrics.outOfStockProducts} Out</Badge>}
                    {metrics.lowStockProducts === 0 && metrics.outOfStockProducts === 0 && <Badge tone="success">All Good</Badge>}
                  </InlineStack>
                </BlockStack>
              </Box>
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Customers</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{metrics.totalCustomers}</Text>
                  <Badge tone="success">+{metrics.newCustomers} new (30d)</Badge>
                </BlockStack>
              </Box>
            </InlineGrid>
            
            {/* Average Order Value */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Average Order Value</Text>
                  <Text as="span" variant="headingLg" fontWeight="bold">{formatCurrency(metrics.avgOrderValue)}</Text>
                </InlineStack>
                <ProgressBar progress={Math.min((metrics.avgOrderValue / 200) * 100, 100)} size="small" tone="primary" />
              </BlockStack>
            </Card>
            
            {/* Dashboard Navigation */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Dashboards</Text>
                <Divider />
                <InlineGrid columns={3} gap="400">
                  {dashboards.map((dashboard) => (
                    <Box key={dashboard.title} padding="400" background="bg-surface-secondary" borderRadius="200">
                      <BlockStack gap="200">
                        <InlineStack align="space-between">
                          <Text as="span" variant="headingMd" fontWeight="semibold">{dashboard.title}</Text>
                          <Badge tone={dashboard.badgeTone}>{dashboard.badge}</Badge>
                        </InlineStack>
                        <Text as="span" variant="bodySm" tone="subdued">{dashboard.description}</Text>
                        <Button url={dashboard.url} variant="secondary">View Dashboard</Button>
                      </BlockStack>
                    </Box>
                  ))}
                </InlineGrid>
              </BlockStack>
            </Card>
            
            {/* Quick Stats */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Quick Stats</Text>
                <Divider />
                <InlineStack gap="400">
                  <Box padding="300" background="bg-surface-success" borderRadius="200" minWidth="150px">
                    <BlockStack gap="100" align="center">
                      <Text as="span" variant="headingLg" fontWeight="bold">{Math.round((metrics.fulfilledOrders / metrics.totalOrders) * 100) || 0}%</Text>
                      <Text as="span" variant="bodySm">Fulfillment Rate</Text>
                    </BlockStack>
                  </Box>
                  <Box padding="300" background="bg-surface-info" borderRadius="200" minWidth="150px">
                    <BlockStack gap="100" align="center">
                      <Text as="span" variant="headingLg" fontWeight="bold">{formatCurrency(metrics.avgOrderValue)}</Text>
                      <Text as="span" variant="bodySm">Avg Order Value</Text>
                    </BlockStack>
                  </Box>
                  <Box padding="300" background="bg-surface-warning" borderRadius="200" minWidth="150px">
                    <BlockStack gap="100" align="center">
                      <Text as="span" variant="headingLg" fontWeight="bold">{metrics.lowStockProducts + metrics.outOfStockProducts}</Text>
                      <Text as="span" variant="bodySm">Inventory Alerts</Text>
                    </BlockStack>
                  </Box>
                  <Box padding="300" background="bg-surface-secondary" borderRadius="200" minWidth="150px">
                    <BlockStack gap="100" align="center">
                      <Text as="span" variant="headingLg" fontWeight="bold">{metrics.newCustomers}</Text>
                      <Text as="span" variant="bodySm">New Customers (30d)</Text>
                    </BlockStack>
                  </Box>
                </InlineStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
