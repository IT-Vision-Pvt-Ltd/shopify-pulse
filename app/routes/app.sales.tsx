import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, InlineGrid, ProgressBar, DataTable, Divider } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`{
    orders(first: 100, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          id
          name
          createdAt
          totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          displayFinancialStatus
          displayFulfillmentStatus
          customer { displayName }
          billingAddress { country provinceCode city }
          lineItems(first: 5) {
            edges { node { title quantity } }
          }
          transactions(first: 1) { gateway }
        }
      }
    }
  }`);

  const data = await response.json();
  const orders = data.data?.orders?.edges?.map((e: any) => e.node) || [];

  // Calculate revenue metrics
  const grossRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'), 0);
  const totalDiscounts = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalDiscountsSet?.shopMoney?.amount || '0'), 0);
  const totalTax = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalTaxSet?.shopMoney?.amount || '0'), 0);
  const totalShipping = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalShippingPriceSet?.shopMoney?.amount || '0'), 0);
  const refunds = orders.filter((o: any) => o.displayFinancialStatus === 'REFUNDED').length;
  const netRevenue = grossRevenue - totalDiscounts;
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || 'USD';
  const aov = orders.length > 0 ? grossRevenue / orders.length : 0;

  // Revenue by day
  const revenueByDay: Record<string, number> = {};
  orders.forEach((o: any) => {
    const date = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueByDay[date] = (revenueByDay[date] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
  });

  // Revenue by payment method
  const paymentMethods: Record<string, number> = {};
  orders.forEach((o: any) => {
    const gateway = o.transactions?.[0]?.gateway || 'Unknown';
    paymentMethods[gateway] = (paymentMethods[gateway] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
  });

  // Revenue by country
  const revenueByCountry: Record<string, number> = {};
  orders.forEach((o: any) => {
    const country = o.billingAddress?.country || 'Unknown';
    revenueByCountry[country] = (revenueByCountry[country] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
  });

  // Orders by day of week
  const ordersByDayOfWeek: Record<string, number> = {};
  orders.forEach((o: any) => {
    const day = new Date(o.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
    ordersByDayOfWeek[day] = (ordersByDayOfWeek[day] || 0) + 1;
  });

  // Top orders
  const topOrders = orders.slice(0, 10).map((o: any) => ({
    name: o.name,
    customer: o.customer?.displayName || 'Guest',
    amount: o.totalPriceSet?.shopMoney?.amount,
    status: o.displayFinancialStatus,
    date: o.createdAt
  }));

  return json({
    metrics: { grossRevenue, netRevenue, totalDiscounts, totalTax, totalShipping, refunds, aov, totalOrders: orders.length, currency },
    revenueByDay,
    paymentMethods,
    revenueByCountry,
    ordersByDayOfWeek,
    topOrders
  });
};

export default function SalesRevenue() {
  const { metrics, revenueByDay, paymentMethods, revenueByCountry, ordersByDayOfWeek, topOrders } = useLoaderData<typeof loader>();

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: metrics.currency }).format(val);
  const maxRevDay = Math.max(...Object.values(revenueByDay), 1);
  const maxPayment = Math.max(...Object.values(paymentMethods), 1);

  return (
    <Page title="Sales & Revenue Analytics">
      <BlockStack gap="600">

        {/* ROW 1: Revenue KPI Strip */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Gross Revenue</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.grossRevenue)}</Text>
              <Badge tone="success">{metrics.totalOrders} orders</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Net Revenue</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.netRevenue)}</Text>
              <Text as="span" variant="bodySm" tone="subdued">After discounts</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Total Discounts</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.totalDiscounts)}</Text>
              <Badge tone="attention">-{((metrics.totalDiscounts / metrics.grossRevenue) * 100 || 0).toFixed(1)}%</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">AOV</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.aov)}</Text>
              <Text as="span" variant="bodySm" tone="subdued">Per order</Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ROW 2: Revenue Waterfall Breakdown */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Revenue Waterfall</Text>
            <InlineStack gap="200" align="start" blockAlign="end">
              <BlockStack gap="100" inlineAlign="center">
                <div style={{width:'60px',height:'100px',backgroundColor:'#22C55E',borderRadius:'4px'}} />
                <Text as="span" variant="bodySm">Gross</Text>
                <Text as="span" variant="bodySm" fontWeight="bold">{formatCurrency(metrics.grossRevenue)}</Text>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <div style={{width:'60px',height:`${Math.max((metrics.totalDiscounts / metrics.grossRevenue) * 100, 5)}px`,backgroundColor:'#EF4444',borderRadius:'4px'}} />
                <Text as="span" variant="bodySm">Discounts</Text>
                <Text as="span" variant="bodySm" fontWeight="bold">-{formatCurrency(metrics.totalDiscounts)}</Text>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <div style={{width:'60px',height:`${Math.max((metrics.totalTax / metrics.grossRevenue) * 100, 5)}px`,backgroundColor:'#F59E0B',borderRadius:'4px'}} />
                <Text as="span" variant="bodySm">Tax</Text>
                <Text as="span" variant="bodySm" fontWeight="bold">{formatCurrency(metrics.totalTax)}</Text>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <div style={{width:'60px',height:`${Math.max((metrics.totalShipping / metrics.grossRevenue) * 100, 5)}px`,backgroundColor:'#3B82F6',borderRadius:'4px'}} />
                <Text as="span" variant="bodySm">Shipping</Text>
                <Text as="span" variant="bodySm" fontWeight="bold">{formatCurrency(metrics.totalShipping)}</Text>
              </BlockStack>
              <BlockStack gap="100" inlineAlign="center">
                <div style={{width:'60px',height:'80px',backgroundColor:'#5C6AC4',borderRadius:'4px'}} />
                <Text as="span" variant="bodySm">Net</Text>
                <Text as="span" variant="bodySm" fontWeight="bold">{formatCurrency(metrics.netRevenue)}</Text>
              </BlockStack>
            </InlineStack>
          </BlockStack>
        </Card>

        {/* ROW 3: Revenue by Day + Payment Methods */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Revenue by Day</Text>
                <BlockStack gap="200">
                  {Object.entries(revenueByDay).slice(0, 10).map(([date, amount]) => (
                    <InlineStack key={date} align="space-between" blockAlign="center">
                      <Text as="span" variant="bodySm">{date}</Text>
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{width:'150px',height:'12px',backgroundColor:'#E4E5E7',borderRadius:'6px',overflow:'hidden'}}>
                          <div style={{width:`${(amount as number / maxRevDay) * 100}%`,height:'100%',backgroundColor:'#5C6AC4',borderRadius:'6px'}} />
                        </div>
                        <Text as="span" variant="bodySm" fontWeight="semibold" alignment="end">{formatCurrency(amount as number)}</Text>
                      </InlineStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Payment Methods</Text>
                <BlockStack gap="300">
                  {Object.entries(paymentMethods).map(([method, amount]) => (
                    <BlockStack key={method} gap="100">
                      <InlineStack align="space-between">
                        <Text as="span" variant="bodySm">{method}</Text>
                        <Text as="span" variant="bodySm" fontWeight="semibold">{formatCurrency(amount as number)}</Text>
                      </InlineStack>
                      <ProgressBar progress={(amount as number / maxPayment) * 100} tone="primary" size="small" />
                    </BlockStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* ROW 4: Revenue by Country + Orders by Day of Week */}
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Revenue by Country</Text>
                <BlockStack gap="200">
                  {Object.entries(revenueByCountry).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([country, amount]) => (
                    <InlineStack key={country} align="space-between" blockAlign="center">
                      <Text as="span" variant="bodySm">{country}</Text>
                      <InlineStack gap="200" blockAlign="center">
                        <div style={{width:'120px',height:'10px',backgroundColor:'#E4E5E7',borderRadius:'5px',overflow:'hidden'}}>
                          <div style={{width:`${(amount as number / Math.max(...Object.values(revenueByCountry))) * 100}%`,height:'100%',backgroundColor:'#22C55E',borderRadius:'5px'}} />
                        </div>
                        <Text as="span" variant="bodySm" fontWeight="semibold">{formatCurrency(amount as number)}</Text>
                      </InlineStack>
                    </InlineStack>
                  ))}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Orders by Day of Week</Text>
                <InlineStack gap="200" align="center">
                  {Object.entries(ordersByDayOfWeek).map(([day, count]) => (
                    <BlockStack key={day} gap="200" inlineAlign="center">
                      <div style={{width:'30px',backgroundColor:'#5C6AC4',borderRadius:'4px 4px 0 0',height:`${Math.max((count as number / Math.max(...Object.values(ordersByDayOfWeek))) * 60, 8)}px`}} />
                      <Text as="span" variant="bodySm">{day}</Text>
                      <Text as="span" variant="bodySm" fontWeight="bold">{count as number}</Text>
                    </BlockStack>
                  ))}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* ROW 5: Top Orders Table */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Recent Orders</Text>
            <BlockStack gap="200">
              <InlineStack align="space-between">
                <Text as="span" variant="bodySm" fontWeight="bold" tone="subdued">Order</Text>
                <Text as="span" variant="bodySm" fontWeight="bold" tone="subdued">Customer</Text>
                <Text as="span" variant="bodySm" fontWeight="bold" tone="subdued">Status</Text>
                <Text as="span" variant="bodySm" fontWeight="bold" tone="subdued">Amount</Text>
              </InlineStack>
              <Divider />
              {topOrders.map((order: any, i: number) => (
                <InlineStack key={i} align="space-between" blockAlign="center">
                  <Text as="span" variant="bodySm" fontWeight="semibold">{order.name}</Text>
                  <Text as="span" variant="bodySm">{order.customer}</Text>
                  <Badge tone={order.status === 'PAID' ? 'success' : order.status === 'PENDING' ? 'attention' : 'info'}>{order.status}</Badge>
                  <Text as="span" variant="bodySm" fontWeight="semibold">{formatCurrency(parseFloat(order.amount))}</Text>
                </InlineStack>
              ))}
            </BlockStack>
          </BlockStack>
        </Card>

        {/* ROW 6: AOV Trend Analysis */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">AOV Analysis</Text>
              <Badge tone="success">Current: {formatCurrency(metrics.aov)}</Badge>
            </InlineStack>
            <InlineGrid columns={3} gap="400">
              <BlockStack gap="200">
                <Text as="span" variant="bodySm" tone="subdued">Total Orders</Text>
                <Text as="p" variant="headingMd">{metrics.totalOrders}</Text>
              </BlockStack>
              <BlockStack gap="200">
                <Text as="span" variant="bodySm" tone="subdued">Avg Tax per Order</Text>
                <Text as="p" variant="headingMd">{formatCurrency(metrics.totalOrders > 0 ? metrics.totalTax / metrics.totalOrders : 0)}</Text>
              </BlockStack>
              <BlockStack gap="200">
                <Text as="span" variant="bodySm" tone="subdued">Avg Shipping per Order</Text>
                <Text as="p" variant="headingMd">{formatCurrency(metrics.totalOrders > 0 ? metrics.totalShipping / metrics.totalOrders : 0)}</Text>
              </BlockStack>
            </InlineGrid>
          </BlockStack>
        </Card>

      </BlockStack>
    </Page>
  );
}
