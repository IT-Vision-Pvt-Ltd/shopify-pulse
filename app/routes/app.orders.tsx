import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, DataTable, Select, Button, Icon, Divider } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useState } from 'react';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const admin = null; const session = { shop: "demo.myshopify.com" };
  
  const response = await admin.graphql(`{
    orders(first: 50, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          displayFinancialStatus
          displayFulfillmentStatus
          totalPriceSet { shopMoney { amount currencyCode } }
          customer { displayName email }
          lineItems(first: 5) { edges { node { title quantity } } }
        }
      }
    }
    shop { currencyCode }
  }`);
  
  const data = await response.json();
  return json({ orders: data.data.orders.edges, currency: data.data.shop.currencyCode });
};

export default function Orders() {
  const { orders, currency } = useLoaderData<typeof loader>();
  const [statusFilter, setStatusFilter] = useState('all');
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  const formatDate = (date: string) => new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  
  // Calculate metrics
  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.node.totalPriceSet.shopMoney.amount), 0);
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const fulfilledOrders = orders.filter((o: any) => o.node.displayFulfillmentStatus === 'FULFILLED').length;
  const pendingOrders = orders.filter((o: any) => o.node.displayFulfillmentStatus === 'UNFULFILLED').length;
  const paidOrders = orders.filter((o: any) => o.node.displayFinancialStatus === 'PAID').length;
  
  // Filter orders
  const filteredOrders = statusFilter === 'all' ? orders : 
    orders.filter((o: any) => {
      if (statusFilter === 'fulfilled') return o.node.displayFulfillmentStatus === 'FULFILLED';
      if (statusFilter === 'unfulfilled') return o.node.displayFulfillmentStatus === 'UNFULFILLED';
      if (statusFilter === 'paid') return o.node.displayFinancialStatus === 'PAID';
      if (statusFilter === 'pending') return o.node.displayFinancialStatus === 'PENDING';
      return true;
    });
  
  // Orders by day of week
  const ordersByDay = orders.reduce((acc: any, o: any) => {
    const day = new Date(o.node.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
    acc[day] = (acc[day] || 0) + 1;
    return acc;
  }, {});
  
  const getStatusBadge = (status: string, type: 'financial' | 'fulfillment') => {
    const badges: any = {
      financial: { PAID: 'success', PENDING: 'attention', REFUNDED: 'critical', PARTIALLY_REFUNDED: 'warning' },
      fulfillment: { FULFILLED: 'success', UNFULFILLED: 'attention', PARTIALLY_FULFILLED: 'warning' }
    };
    return badges[type][status] || 'default';
  };
  
  return (
    <Page title="Orders Dashboard" subtitle="Track and manage all orders">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            {/* KPI Cards */}
            <InlineStack gap="400" wrap={false}>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Orders</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{totalOrders}</Text>
                  <Badge tone="info">Last 50</Badge>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Revenue</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(totalRevenue)}</Text>
                  <Badge tone="success">+12.5%</Badge>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Avg Order Value</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(avgOrderValue)}</Text>
                </BlockStack>
              </Box>
              <Box minWidth="200px" padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Fulfillment Rate</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{totalOrders > 0 ? Math.round((fulfilledOrders/totalOrders)*100) : 0}%</Text>
                  <InlineStack gap="100">
                    <Badge tone="success">{fulfilledOrders} Fulfilled</Badge>
                    <Badge tone="attention">{pendingOrders} Pending</Badge>
                  </InlineStack>
                </BlockStack>
              </Box>
            </InlineStack>
            
            {/* Orders by Day of Week */}
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Orders by Day of Week</Text>
                <InlineStack gap="200" wrap={true}>
                  {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                    <Box key={day} padding="300" background="bg-surface-secondary" borderRadius="200" minWidth="80px">
                      <BlockStack gap="100" align="center">
                        <Text as="span" variant="bodySm" tone="subdued">{day}</Text>
                        <Text as="span" variant="headingLg" fontWeight="bold">{ordersByDay[day] || 0}</Text>
                      </BlockStack>
                    </Box>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
            
            {/* Order Status Overview */}
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Financial Status</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span">Paid</Text>
                      <Badge tone="success">{paidOrders}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Pending</Text>
                      <Badge tone="attention">{orders.filter((o: any) => o.node.displayFinancialStatus === 'PENDING').length}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Refunded</Text>
                      <Badge tone="critical">{orders.filter((o: any) => o.node.displayFinancialStatus === 'REFUNDED').length}</Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Fulfillment Status</Text>
                  <BlockStack gap="200">
                    <InlineStack align="space-between">
                      <Text as="span">Fulfilled</Text>
                      <Badge tone="success">{fulfilledOrders}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Unfulfilled</Text>
                      <Badge tone="attention">{pendingOrders}</Badge>
                    </InlineStack>
                    <InlineStack align="space-between">
                      <Text as="span">Partially</Text>
                      <Badge tone="warning">{orders.filter((o: any) => o.node.displayFulfillmentStatus === 'PARTIALLY_FULFILLED').length}</Badge>
                    </InlineStack>
                  </BlockStack>
                </BlockStack>
              </Card>
            </InlineStack>
            
            {/* Orders Table */}
            <Card>
              <BlockStack gap="400">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Recent Orders</Text>
                  <Select
                    label="Filter by status"
                    labelHidden
                    options={[
                      { label: 'All Orders', value: 'all' },
                      { label: 'Fulfilled', value: 'fulfilled' },
                      { label: 'Unfulfilled', value: 'unfulfilled' },
                      { label: 'Paid', value: 'paid' },
                      { label: 'Pending Payment', value: 'pending' }
                    ]}
                    value={statusFilter}
                    onChange={setStatusFilter}
                  />
                </InlineStack>
                <Divider />
                <BlockStack gap="300">
                  {filteredOrders.slice(0, 20).map((order: any) => (
                    <Box key={order.node.id} padding="300" background="bg-surface-secondary" borderRadius="200">
                      <InlineStack align="space-between" wrap={false}>
                        <BlockStack gap="100">
                          <InlineStack gap="200">
                            <Text as="span" variant="bodyMd" fontWeight="semibold">{order.node.name}</Text>
                            <Badge tone={getStatusBadge(order.node.displayFinancialStatus, 'financial')}>
                              {order.node.displayFinancialStatus?.replace('_', ' ')}
                            </Badge>
                            <Badge tone={getStatusBadge(order.node.displayFulfillmentStatus, 'fulfillment')}>
                              {order.node.displayFulfillmentStatus?.replace('_', ' ')}
                            </Badge>
                          </InlineStack>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {order.node.customer?.displayName || 'Guest'} • {formatDate(order.node.createdAt)}
                          </Text>
                          <Text as="span" variant="bodySm" tone="subdued">
                            {order.node.lineItems.edges.map((item: any) => `${item.node.title} (x${item.node.quantity})`).join(', ')}
                          </Text>
                        </BlockStack>
                        <Text as="span" variant="headingMd" fontWeight="bold">
                          {formatCurrency(parseFloat(order.node.totalPriceSet.shopMoney.amount))}
                        </Text>
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
