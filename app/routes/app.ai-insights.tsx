import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, Banner, ProgressBar, Divider, Button } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  // Fetch comprehensive data for AI analysis
  const response = await admin.graphql(`{
    orders(first: 100, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          createdAt
          totalPriceSet { shopMoney { amount } }
          lineItems(first: 10) { edges { node { title quantity sku } } }
        }
      }
    }
    products(first: 50, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          title
          totalInventory
          tracksInventory
          variants(first: 5) { edges { node { inventoryQuantity price } } }
        }
      }
    }
    customers(first: 50, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          numberOfOrders
          totalSpentV2 { amount }
          createdAt
          updatedAt
        }
      }
    }
    shop { currencyCode name }
  }`);
  
  const data = await response.json();
  
  // Generate AI insights
  const orders = data.data.orders.edges;
  const products = data.data.products.edges;
  const customers = data.data.customers.edges;
  
  // Sales trend analysis
  const recentRevenue = orders.slice(0, 30).reduce((sum: number, o: any) => sum + parseFloat(o.node.totalPriceSet.shopMoney.amount), 0);
  const olderRevenue = orders.slice(30, 60).reduce((sum: number, o: any) => sum + parseFloat(o.node.totalPriceSet.shopMoney.amount), 0);
  const revenueTrend = olderRevenue > 0 ? ((recentRevenue - olderRevenue) / olderRevenue * 100).toFixed(1) : 0;
  
  // Inventory alerts
  const lowStockProducts = products.filter((p: any) => p.node.tracksInventory && p.node.totalInventory < 10 && p.node.totalInventory > 0);
  const outOfStockProducts = products.filter((p: any) => p.node.tracksInventory && p.node.totalInventory === 0);
  
  // Customer insights
  const avgOrdersPerCustomer = customers.length > 0 ? customers.reduce((sum: number, c: any) => sum + (c.node.numberOfOrders || 0), 0) / customers.length : 0;
  const avgCustomerSpend = customers.length > 0 ? customers.reduce((sum: number, c: any) => sum + parseFloat(c.node.totalSpentV2?.amount || 0), 0) / customers.length : 0;
  
  // Generate insights array
  const insights = [];
  
  if (parseFloat(revenueTrend as string) > 10) {
    insights.push({ type: 'success', title: 'Revenue Growing', message: `Sales are up ${revenueTrend}% compared to the previous period. Great momentum!`, priority: 'high' });
  } else if (parseFloat(revenueTrend as string) < -10) {
    insights.push({ type: 'warning', title: 'Revenue Declining', message: `Sales are down ${Math.abs(parseFloat(revenueTrend as string))}%. Consider running promotions.`, priority: 'high' });
  }
  
  if (lowStockProducts.length > 0) {
    insights.push({ type: 'warning', title: 'Low Stock Alert', message: `${lowStockProducts.length} products have low inventory. Restock soon to avoid lost sales.`, priority: 'medium' });
  }
  
  if (outOfStockProducts.length > 0) {
    insights.push({ type: 'critical', title: 'Out of Stock', message: `${outOfStockProducts.length} products are out of stock. Urgent restocking needed.`, priority: 'high' });
  }
  
  if (avgOrdersPerCustomer < 1.5) {
    insights.push({ type: 'info', title: 'Customer Retention Opportunity', message: 'Average orders per customer is low. Consider loyalty programs or email campaigns.', priority: 'medium' });
  }
  
  // Best sellers analysis
  const productSales: any = {};
  orders.forEach((o: any) => {
    o.node.lineItems.edges.forEach((item: any) => {
      productSales[item.node.title] = (productSales[item.node.title] || 0) + item.node.quantity;
    });
  });
  const topSellers = Object.entries(productSales).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  
  return json({ 
    insights, 
    metrics: { recentRevenue, revenueTrend, lowStockProducts: lowStockProducts.length, outOfStockProducts: outOfStockProducts.length, avgOrdersPerCustomer: avgOrdersPerCustomer.toFixed(1), avgCustomerSpend },
    topSellers,
    currency: data.data.shop.currencyCode,
    shopName: data.data.shop.name
  });
};

export default function AIInsights() {
  const { insights, metrics, topSellers, currency, shopName } = useLoaderData<typeof loader>();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  
  const getBannerTone = (type: string) => {
    const tones: any = { success: 'success', warning: 'warning', critical: 'critical', info: 'info' };
    return tones[type] || 'info';
  };
  
  return (
    <Page title="AI Insights" subtitle={`Smart analytics for ${shopName}`}>
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* Key Metrics */}
            <InlineStack gap="400" wrap={false}>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Recent Revenue (30 orders)</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(metrics.recentRevenue)}</Text>
                  <Badge tone={parseFloat(metrics.revenueTrend) > 0 ? 'success' : 'warning'}>
                    {parseFloat(metrics.revenueTrend) > 0 ? '+' : ''}{metrics.revenueTrend}% trend
                  </Badge>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Inventory Alerts</Text>
                  <InlineStack gap="200">
                    <Badge tone="warning">{metrics.lowStockProducts} Low</Badge>
                    <Badge tone="critical">{metrics.outOfStockProducts} Out</Badge>
                  </InlineStack>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Avg Orders/Customer</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{metrics.avgOrdersPerCustomer}</Text>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Avg Customer Spend</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(metrics.avgCustomerSpend)}</Text>
                </BlockStack>
              </Box>
            </InlineStack>
            
            {/* AI Insights Banners */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">AI-Generated Insights</Text>
                  <Badge tone="info">Powered by Analytics</Badge>
                </InlineStack>
                <Divider />
                {insights.length > 0 ? (
                  <BlockStack gap="300">
                    {insights.map((insight: any, index: number) => (
                      <Banner key={index} title={insight.title} tone={getBannerTone(insight.type)}>
                        <p>{insight.message}</p>
                      </Banner>
                    ))}
                  </BlockStack>
                ) : (
                  <Banner title="All Clear!" tone="success">
                    <p>No critical issues detected. Your store is performing well!</p>
                  </Banner>
                )}
              </BlockStack>
            </Card>
            
            {/* Top Selling Products */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Top Selling Products (Recent Orders)</Text>
                <Divider />
                <BlockStack gap="200">
                  {topSellers.map(([name, quantity]: [string, any], index: number) => (
                    <Box key={name} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Box padding="200" background="bg-fill-success" borderRadius="full">
                            <Text as="span" variant="bodySm" fontWeight="bold">#{index + 1}</Text>
                          </Box>
                          <Text as="span" fontWeight="semibold">{name}</Text>
                        </InlineStack>
                        <Badge tone="success">{quantity} sold</Badge>
                      </InlineStack>
                    </Box>
                  ))}
                  {topSellers.length === 0 && (
                    <Text as="p" tone="subdued">No sales data available yet.</Text>
                  )}
                </BlockStack>
              </BlockStack>
            </Card>
            
            {/* Recommendations */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Recommended Actions</Text>
                <Divider />
                <BlockStack gap="200">
                  <Box padding="300" background="bg-surface-info" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" fontWeight="semibold">Review Inventory Levels</Text>
                        <Text as="span" variant="bodySm" tone="subdued">Check products with low stock to prevent stockouts</Text>
                      </BlockStack>
                      <Button url="/app/products">View Products</Button>
                    </InlineStack>
                  </Box>
                  <Box padding="300" background="bg-surface-success" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" fontWeight="semibold">Engage Customers</Text>
                        <Text as="span" variant="bodySm" tone="subdued">Reach out to inactive customers with personalized offers</Text>
                      </BlockStack>
                      <Button url="/app/customers">View Customers</Button>
                    </InlineStack>
                  </Box>
                  <Box padding="300" background="bg-surface-warning" borderRadius="200">
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" fontWeight="semibold">Analyze Sales Trends</Text>
                        <Text as="span" variant="bodySm" tone="subdued">Deep dive into your sales performance</Text>
                      </BlockStack>
                      <Button url="/app/sales">View Sales</Button>
                    </InlineStack>
                  </Box>
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
