import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, Avatar, Divider, ProgressBar } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`{
    customers(first: 100, sortKey: UPDATED_AT, reverse: true) {
      edges {
        node {
          id
          displayName
          email
          phone
          createdAt
          updatedAt
          ordersCount
          totalSpentV2 { amount currencyCode }
          averageOrderAmountV2 { amount currencyCode }
          tags
          addresses(first: 1) { city country }
          verifiedEmail
          taxExempt
          state
        }
      }
    }
    shop { currencyCode }
  }`);
  
  const data = await response.json();
  return json({ customers: data.data.customers.edges, currency: data.data.shop.currencyCode });
};

export default function Customers() {
  const { customers, currency } = useLoaderData<typeof loader>();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Calculate metrics
  const totalCustomers = customers.length;
  const totalRevenue = customers.reduce((sum: number, c: any) => sum + parseFloat(c.node.totalSpentV2?.amount || 0), 0);
  const avgLifetimeValue = totalCustomers > 0 ? totalRevenue / totalCustomers : 0;
  const repeatCustomers = customers.filter((c: any) => (c.node.ordersCount || 0) > 1).length;
  const newCustomers = customers.filter((c: any) => {
    const created = new Date(c.node.createdAt);
    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created > thirtyDaysAgo;
  }).length;
  
  // Customer segments
  const vipCustomers = customers.filter((c: any) => parseFloat(c.node.totalSpentV2?.amount || 0) > 500);
  const atRiskCustomers = customers.filter((c: any) => {
    const updated = new Date(c.node.updatedAt);
    const ninetyDaysAgo = new Date(); ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    return updated < ninetyDaysAgo && (c.node.ordersCount || 0) > 0;
  });
  
  // Customers by location
  const customersByCountry = customers.reduce((acc: any, c: any) => {
    const country = c.node.addresses?.[0]?.country || 'Unknown';
    acc[country] = (acc[country] || 0) + 1;
    return acc;
  }, {});
  
  const topCountries = Object.entries(customersByCountry)
    .sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  
  // Top customers by spend
  const topCustomers = [...customers]
    .sort((a: any, b: any) => parseFloat(b.node.totalSpentV2?.amount || 0) - parseFloat(a.node.totalSpentV2?.amount || 0))
    .slice(0, 10);
  
  return (
    <Page title="Customers Dashboard" subtitle="Understand and engage your customer base">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* KPI Cards */}
            <InlineStack gap="400" wrap={false}>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Customers</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{totalCustomers}</Text>
                  <Badge tone="success">+{newCustomers} new (30d)</Badge>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Revenue</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(totalRevenue)}</Text>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Avg Lifetime Value</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(avgLifetimeValue)}</Text>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Repeat Rate</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{totalCustomers > 0 ? Math.round((repeatCustomers/totalCustomers)*100) : 0}%</Text>
                  <Badge tone="info">{repeatCustomers} repeat buyers</Badge>
                </BlockStack>
              </Box>
            </InlineStack>
            
            {/* Customer Segments */}
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Customer Segments</Text>
                  <BlockStack gap="200">
                    <Box padding="300" background="bg-surface-success" borderRadius="200">
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text as="span" fontWeight="semibold">VIP Customers</Text>
                          <Text as="span" variant="bodySm" tone="subdued">Spent over $500</Text>
                        </BlockStack>
                        <Badge tone="success">{vipCustomers.length}</Badge>
                      </InlineStack>
                    </Box>
                    <Box padding="300" background="bg-surface-warning" borderRadius="200">
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text as="span" fontWeight="semibold">At Risk</Text>
                          <Text as="span" variant="bodySm" tone="subdued">No activity 90+ days</Text>
                        </BlockStack>
                        <Badge tone="warning">{atRiskCustomers.length}</Badge>
                      </InlineStack>
                    </Box>
                    <Box padding="300" background="bg-surface-info" borderRadius="200">
                      <InlineStack align="space-between">
                        <BlockStack gap="100">
                          <Text as="span" fontWeight="semibold">New Customers</Text>
                          <Text as="span" variant="bodySm" tone="subdued">Last 30 days</Text>
                        </BlockStack>
                        <Badge tone="info">{newCustomers}</Badge>
                      </InlineStack>
                    </Box>
                  </BlockStack>
                </BlockStack>
              </Card>
              
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Top Locations</Text>
                  <BlockStack gap="200">
                    {topCountries.map(([country, count]: [string, any], i: number) => (
                      <BlockStack key={country} gap="100">
                        <InlineStack align="space-between">
                          <Text as="span">{country}</Text>
                          <Text as="span" fontWeight="semibold">{count}</Text>
                        </InlineStack>
                        <ProgressBar progress={(count / totalCustomers) * 100} size="small" tone="primary" />
                      </BlockStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </InlineStack>
            
            {/* Top Customers */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Top Customers by Spend</Text>
                <Divider />
                <BlockStack gap="300">
                  {topCustomers.map((customer: any, index: number) => (
                    <Box key={customer.node.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack align="space-between" blockAlign="center">
                        <InlineStack gap="300" blockAlign="center">
                          <Box padding="200" background="bg-fill-info" borderRadius="full">
                            <Text as="span" variant="bodySm" fontWeight="bold">#{index + 1}</Text>
                          </Box>
                          <BlockStack gap="100">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">
                              {customer.node.displayName || 'Guest Customer'}
                            </Text>
                            <Text as="span" variant="bodySm" tone="subdued">
                              {customer.node.email} • {customer.node.ordersCount || 0} orders
                            </Text>
                          </BlockStack>
                        </InlineStack>
                        <BlockStack gap="100" inlineAlign="end">
                          <Text as="span" variant="headingMd" fontWeight="bold">
                            {formatCurrency(parseFloat(customer.node.totalSpentV2?.amount || 0))}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">lifetime</Text>
                        </BlockStack>
                      </InlineStack>
                    </Box>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
