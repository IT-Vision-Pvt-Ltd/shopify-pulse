import { json } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { Page, Layout, Card, Text, BlockStack, InlineStack, Box, Badge, InlineGrid, ProgressBar, Divider } from '@shopify/polaris';
import { authenticate } from '../shopify.server';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const response = await admin.graphql(`{
    products(first: 50, sortKey: BEST_SELLING, reverse: true) {
      edges {
        node {
          id
          title
          productType
          vendor
          status
          totalInventory
          tracksInventory
          createdAt
          priceRangeV2 {
            minVariantPrice { amount currencyCode }
            maxVariantPrice { amount currencyCode }
          }
          variants(first: 10) {
            edges {
              node {
                id
                title
                price
                inventoryQuantity
                sku
              }
            }
          }
        }
      }
    }
    orders(first: 100, sortKey: CREATED_AT, reverse: true) {
      edges {
        node {
          lineItems(first: 20) {
            edges {
              node {
                title
                quantity
                product { id }
                originalTotalSet { shopMoney { amount } }
              }
            }
          }
        }
      }
    }
  }`);

  const data = await response.json();
  const products = data.data?.products?.edges?.map((e: any) => e.node) || [];
  const orders = data.data?.orders?.edges?.map((e: any) => e.node) || [];

  // Calculate product sales from orders
  const productSales: Record<string, { units: number; revenue: number }> = {};
  orders.forEach((order: any) => {
    order.lineItems?.edges?.forEach((item: any) => {
      const productId = item.node.product?.id;
      if (productId) {
        if (!productSales[productId]) productSales[productId] = { units: 0, revenue: 0 };
        productSales[productId].units += item.node.quantity;
        productSales[productId].revenue += parseFloat(item.node.originalTotalSet?.shopMoney?.amount || '0');
      }
    });
  });

  // Enrich products with sales data
  const enrichedProducts = products.map((p: any) => {
    const sales = productSales[p.id] || { units: 0, revenue: 0 };
    const price = parseFloat(p.priceRangeV2?.minVariantPrice?.amount || '0');
    return {
      id: p.id,
      title: p.title,
      type: p.productType || 'Uncategorized',
      vendor: p.vendor,
      status: p.status,
      inventory: p.totalInventory,
      price,
      unitsSold: sales.units,
      revenue: sales.revenue,
      variants: p.variants?.edges?.map((v: any) => v.node) || [],
      createdAt: p.createdAt,
    };
  });

  // Sort for various views
  const topByRevenue = [...enrichedProducts].sort((a, b) => b.revenue - a.revenue).slice(0, 10);
  const topByUnits = [...enrichedProducts].sort((a, b) => b.unitsSold - a.unitsSold).slice(0, 10);
  const lowInventory = enrichedProducts.filter((p: any) => p.inventory < 10 && p.inventory > 0).slice(0, 10);
  const outOfStock = enrichedProducts.filter((p: any) => p.inventory === 0);
  const deadStock = enrichedProducts.filter((p: any) => p.unitsSold === 0 && p.inventory > 0).slice(0, 10);

  // Product types breakdown
  const typeBreakdown: Record<string, { count: number; revenue: number }> = {};
  enrichedProducts.forEach((p: any) => {
    if (!typeBreakdown[p.type]) typeBreakdown[p.type] = { count: 0, revenue: 0 };
    typeBreakdown[p.type].count++;
    typeBreakdown[p.type].revenue += p.revenue;
  });

  // KPIs
  const totalProducts = enrichedProducts.length;
  const totalRevenue = enrichedProducts.reduce((sum: number, p: any) => sum + p.revenue, 0);
  const totalUnitsSold = enrichedProducts.reduce((sum: number, p: any) => sum + p.unitsSold, 0);
  const avgPrice = enrichedProducts.length > 0 ? enrichedProducts.reduce((sum: number, p: any) => sum + p.price, 0) / enrichedProducts.length : 0;
  const currency = products[0]?.priceRangeV2?.minVariantPrice?.currencyCode || 'USD';

  return json({
    kpis: { totalProducts, totalRevenue, totalUnitsSold, avgPrice, currency, outOfStockCount: outOfStock.length, lowInventoryCount: lowInventory.length },
    topByRevenue,
    topByUnits,
    lowInventory,
    deadStock,
    typeBreakdown,
  });
};

export default function ProductIntelligence() {
  const { kpis, topByRevenue, topByUnits, lowInventory, deadStock, typeBreakdown } = useLoaderData<typeof loader>();

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: kpis.currency }).format(val);
  const maxRevenue = Math.max(...topByRevenue.map((p: any) => p.revenue), 1);
  const maxUnits = Math.max(...topByUnits.map((p: any) => p.unitsSold), 1);

  return (
    <Page title="Product Intelligence">
      <BlockStack gap="600">

        {/* ROW 1: Product KPIs */}
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4, lg: 6 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Total Products</Text>
              <Text as="p" variant="headingLg">{kpis.totalProducts}</Text>
              <Badge tone="info">Active SKUs</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Product Revenue</Text>
              <Text as="p" variant="headingLg">{formatCurrency(kpis.totalRevenue)}</Text>
              <Text as="span" variant="bodySm" tone="subdued">From orders</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Units Sold</Text>
              <Text as="p" variant="headingLg">{kpis.totalUnitsSold}</Text>
              <Badge tone="success">Total quantity</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Avg Price</Text>
              <Text as="p" variant="headingLg">{formatCurrency(kpis.avgPrice)}</Text>
              <Text as="span" variant="bodySm" tone="subdued">Per product</Text>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Out of Stock</Text>
              <Text as="p" variant="headingLg">{kpis.outOfStockCount}</Text>
              <Badge tone="critical">Needs restock</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="p" variant="bodySm" tone="subdued">Low Inventory</Text>
              <Text as="p" variant="headingLg">{kpis.lowInventoryCount}</Text>
              <Badge tone="warning">Below 10 units</Badge>
            </BlockStack>
          </Card>
        </InlineGrid>
          </BlockStack>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
