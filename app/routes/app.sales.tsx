import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, InlineGrid, ProgressBar, DataTable, Divider } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useState, useEffect, lazy, Suspense } from 'react';

const Chart = typeof window !== 'undefined' ? lazy(() => import('react-apexcharts')) : () => null;

function ClientChart(props: any) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <div style={{ height: props.height || 200 }} />;
  return (
    <Suspense fallback={<div style={{ height: props.height || 200 }} />}>
      <Chart {...props} />
    </Suspense>
  );
}

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

  const grossRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0'), 0);
  const totalDiscounts = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalDiscountsSet?.shopMoney?.amount || '0'), 0);
  const totalTax = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalTaxSet?.shopMoney?.amount || '0'), 0);
  const totalShipping = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalShippingPriceSet?.shopMoney?.amount || '0'), 0);
  const netRevenue = grossRevenue - totalDiscounts;
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || 'USD';
  const aov = orders.length > 0 ? grossRevenue / orders.length : 0;

  const revenueByDay: Record<string, number> = {};
  orders.forEach((o: any) => {
    const date = new Date(o.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    revenueByDay[date] = (revenueByDay[date] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
  });

  const paymentMethods: Record<string, number> = {};
  orders.forEach((o: any) => {
    const gateway = o.transactions?.[0]?.gateway || 'Unknown';
    paymentMethods[gateway] = (paymentMethods[gateway] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
  });

  const revenueByCountry: Record<string, number> = {};
  orders.forEach((o: any) => {
    const country = o.billingAddress?.country || 'Unknown';
    revenueByCountry[country] = (revenueByCountry[country] || 0) + parseFloat(o.totalPriceSet?.shopMoney?.amount || '0');
  });

  const ordersByDayOfWeek: Record<string, number> = {};
  orders.forEach((o: any) => {
    const day = new Date(o.createdAt).toLocaleDateString('en-US', { weekday: 'short' });
    ordersByDayOfWeek[day] = (ordersByDayOfWeek[day] || 0) + 1;
  });

  const topOrders = orders.slice(0, 10).map((o: any) => ({
    name: o.name,
    customer: o.customer?.displayName || 'Guest',
    amount: o.totalPriceSet?.shopMoney?.amount,
    status: o.displayFinancialStatus,
    date: o.createdAt
  }));

  return json({
    metrics: { grossRevenue, netRevenue, totalDiscounts, totalTax, totalShipping, aov, totalOrders: orders.length, currency },
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

  const maxRevDay = Math.max(...Object.values(revenueByDay as Record<string, number>), 1);
  const maxPayment = Math.max(...Object.values(paymentMethods as Record<string, number>), 1);
  const maxCountryRev = Math.max(...Object.values(revenueByCountry as Record<string, number>), 1);

  // Revenue Waterfall Chart
  const waterfallOpts = {
    chart: { type: 'bar' as const, height: 250, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '50%', distributed: true } },
    colors: ['#22c55e', '#ef4444', '#f59e0b', '#0096c7', '#6366f1'],
    xaxis: { categories: ['Gross', 'Discounts', 'Tax', 'Shipping', 'Net'], labels: { style: { colors: '#6b8299', fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: '#6b8299', fontSize: '11px' }, formatter: (v: number) => formatCurrency(v) } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
    dataLabels: { enabled: false },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
  };
  const waterfallSeries = [{ name: 'Amount', data: [metrics.grossRevenue, metrics.totalDiscounts, metrics.totalTax, metrics.totalShipping, metrics.netRevenue] }];

  // Orders by Day of Week Chart
  const dayOfWeekOpts = {
    chart: { type: 'bar' as const, height: 200, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 4, columnWidth: '55%', distributed: true } },
    colors: ['#6366f1', '#6366f1', '#6366f1', '#6366f1', '#6366f1', '#6366f1', '#6366f1'],
    xaxis: { categories: Object.keys(ordersByDayOfWeek as Record<string, number>), labels: { style: { colors: '#6b8299', fontSize: '11px' } } },
    yaxis: { labels: { style: { colors: '#6b8299', fontSize: '11px' } } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
    dataLabels: { enabled: true, style: { fontSize: '11px', colors: ['#fff'] } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => v + ' orders' } }
  };
  const dayOfWeekSeries = [{ name: 'Orders', data: Object.values(ordersByDayOfWeek as Record<string, number>) }];

  // Revenue by Day Chart
  const revByDayOpts = {
    chart: { type: 'bar' as const, height: 200, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, horizontal: true, barHeight: '60%', distributed: true } },
    colors: ['#0077b6'],
    xaxis: { labels: { style: { colors: '#6b8299', fontSize: '11px' }, formatter: (v: number) => formatCurrency(v) } },
    yaxis: { labels: { style: { colors: '#6b8299', fontSize: '11px' } } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v: number) => formatCurrency(v), style: { fontSize: '10px', colors: ['#fff'] } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
  };
  const revByDaySeries = [{
    name: 'Revenue',
    data: Object.entries(revenueByDay as Record<string, number>).slice(0, 10).map(([_, amount]) => amount)
  }];
  const revByDayCategories = Object.entries(revenueByDay as Record<string, number>).slice(0, 10).map(([date]) => date);

  // Payment Methods Chart
  const paymentOpts = {
    chart: { type: 'donut' as const, height: 200 },
    labels: Object.keys(paymentMethods as Record<string, number>),
    colors: ['#0077b6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6'],
    plotOptions: { pie: { donut: { size: '65%', labels: { show: true, total: { show: true, label: 'Total', formatter: () => formatCurrency(Object.values(paymentMethods as Record<string, number>).reduce((a: number, b: number) => a + b, 0)) } } } } },
    dataLabels: { enabled: false },
    legend: { position: 'bottom' as const, fontSize: '11px' }
  };
  const paymentSeries = Object.values(paymentMethods as Record<string, number>);

  // Revenue by Country Chart
  const countryOpts = {
    chart: { type: 'bar' as const, height: 200, toolbar: { show: false } },
    plotOptions: { bar: { borderRadius: 3, horizontal: true, barHeight: '60%', distributed: true } },
    colors: ['#22c55e', '#0077b6', '#f59e0b', '#ef4444', '#8b5cf6'],
    xaxis: { labels: { style: { colors: '#6b8299', fontSize: '11px' }, formatter: (v: number) => formatCurrency(v) } },
    yaxis: { labels: { style: { colors: '#6b8299', fontSize: '11px' } } },
    grid: { borderColor: '#e2e8f0', strokeDashArray: 3 },
    dataLabels: { enabled: true, formatter: (v: number) => formatCurrency(v), style: { fontSize: '10px', colors: ['#fff'] } },
    legend: { show: false },
    tooltip: { y: { formatter: (v: number) => formatCurrency(v) } }
  };
  const countrySeries = [{
    name: 'Revenue',
    data: Object.entries(revenueByCountry as Record<string, number>).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([_, amount]) => amount)
  }];
  const countryCategories = Object.entries(revenueByCountry as Record<string, number>).sort((a, b) => (b[1] as number) - (a[1] as number)).slice(0, 8).map(([country]) => country);

  return (
    <Page title="Sales & Revenue Analytics">
      <BlockStack gap="400">

        {/* ROW 1: Revenue KPI Strip */}
        <InlineGrid columns={4} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="span" variant="bodySm" tone="subdued">Gross Revenue</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.grossRevenue)}</Text>
              <Badge tone="success">{`${metrics.totalOrders} orders`}</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="span" variant="bodySm" tone="subdued">Net Revenue</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.netRevenue)}</Text>
              <Text as="span" variant="bodySm" tone="subdued">After discounts</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="span" variant="bodySm" tone="subdued">Total Discounts</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.totalDiscounts)}</Text>
              <Badge tone="attention">{`-${((metrics.totalDiscounts / (metrics.grossRevenue || 1)) * 100).toFixed(1)}%`}</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="span" variant="bodySm" tone="subdued">AOV</Text>
              <Text as="p" variant="headingLg">{formatCurrency(metrics.aov)}</Text>
              <Text as="span" variant="bodySm" tone="subdued">Per order</Text>
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ROW 2: Revenue Waterfall Chart */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Revenue Waterfall</Text>
            <ClientChart
              options={waterfallOpts}
              series={waterfallSeries}
              type="bar"
              height={250}
            />
          </BlockStack>
        </Card>

        {/* ROW 3: Revenue by Day + Payment Methods */}
        <InlineGrid columns={['twoThirds', 'oneThird']} gap="400">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Revenue by Day</Text>
              <ClientChart
                options={{...revByDayOpts, yaxis: { ...revByDayOpts.yaxis, categories: revByDayCategories }}}
                series={revByDaySeries}
                type="bar"
                height={200}
              />
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Payment Methods</Text>
              <ClientChart
                options={paymentOpts}
                series={paymentSeries}
                type="donut"
                height={200}
              />
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ROW 4: Revenue by Country + Orders by Day of Week */}
        <InlineGrid columns={['twoThirds', 'oneThird']} gap="400">
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Revenue by Country</Text>
              <ClientChart
                options={{...countryOpts, yaxis: { ...countryOpts.yaxis, categories: countryCategories }}}
                series={countrySeries}
                type="bar"
                height={200}
              />
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">Orders by Day of Week</Text>
              <ClientChart
                options={dayOfWeekOpts}
                series={dayOfWeekSeries}
                type="bar"
                height={200}
              />
            </BlockStack>
          </Card>
        </InlineGrid>

        {/* ROW 5: Recent Orders Table */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Recent Orders</Text>
            <DataTable
              columnContentTypes={['text', 'text', 'text', 'numeric']}
              headings={['Order', 'Customer', 'Status', 'Amount']}
              rows={(topOrders as any[]).map((order: any) => [
                order.name,
                order.customer,
                order.status,
                formatCurrency(parseFloat(order.amount))
              ])}
            />
          </BlockStack>
        </Card>

        {/* ROW 6: AOV Analysis */}
        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">AOV Analysis</Text>
              <Badge tone="success">{`Current: ${formatCurrency(metrics.aov)}`}</Badge>
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
