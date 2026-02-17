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
          variants(first: 5) {
            edges {
              node {
                inventoryQuantity
                price
              }
            }
          }
        }
      }
    }
    shop { currencyCode }
  }`);
  
  const data = await response.json();
  return json({ products: data.data.products.edges, currency: data.data.shop.currencyCode });
};

export default function Products() {
  const { products, currency } = useLoaderData<typeof loader>();
  
  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount);
  
  // Calculate KPIs
  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.node.status === 'ACTIVE').length;
  const lowInventoryProducts = products.filter((p: any) => p.node.tracksInventory && p.node.totalInventory < 10 && p.node.totalInventory > 0);
  const outOfStockProducts = products.filter((p: any) => p.node.tracksInventory && p.node.totalInventory === 0);
  
  const avgPrice = products.reduce((sum: number, p: any) => {
    const price = parseFloat(p.node.variants.edges[0]?.node.price || 0);
    return sum + price;
  }, 0) / (totalProducts || 1);
  
  const totalInventory = products.reduce((sum: number, p: any) => sum + (p.node.totalInventory || 0), 0);
  
  // Products by type
  const productsByType = products.reduce((acc: any, p: any) => {
    const type = p.node.productType || 'Uncategorized';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  
  // Products by vendor
  const productsByVendor = products.reduce((acc: any, p: any) => {
    const vendor = p.node.vendor || 'Unknown';
    acc[vendor] = (acc[vendor] || 0) + 1;
    return acc;
  }, {});
  
  const topVendors = Object.entries(productsByVendor).sort((a: any, b: any) => b[1] - a[1]).slice(0, 5);
  
  return (
    <Page title="Products Dashboard" subtitle="Monitor your product catalog and inventory">
      <Layout>
        <Layout.Section>
          <BlockStack gap="400">
            <InlineGrid columns={4} gap="400">
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Products</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{totalProducts}</Text>
                  <Badge tone="success">{activeProducts} Active</Badge>
                </BlockStack>
              </Box>
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Total Inventory</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{totalInventory.toLocaleString()}</Text>
                  <Text as="span" variant="bodySm" tone="subdued">units in stock</Text>
                </BlockStack>
              </Box>
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Avg Price</Text>
                  <Text as="span" variant="headingXl" fontWeight="bold">{formatCurrency(avgPrice)}</Text>
                  <Text as="span" variant="bodySm" tone="subdued">Per product</Text>
                </BlockStack>
              </Box>
              <Box padding="400" background="bg-surface" borderRadius="200" shadow="100">
                <BlockStack gap="200">
                  <Text as="span" variant="bodySm" tone="subdued">Inventory Alerts</Text>
                  <InlineStack gap="100">
                    <Badge tone="warning">{lowInventoryProducts.length} Low</Badge>
                    <Badge tone="critical">{outOfStockProducts.length} Out</Badge>
                  </InlineStack>
                </BlockStack>
              </Box>
            </InlineGrid>
            
            <InlineStack gap="400">
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Products by Vendor</Text>
                  <BlockStack gap="200">
                    {topVendors.map(([vendor, count]: [string, any]) => (
                      <BlockStack key={vendor} gap="100">
                        <InlineStack align="space-between">
                          <Text as="span">{vendor}</Text>
                          <Text as="span" fontWeight="semibold">{count}</Text>
                        </InlineStack>
                        <ProgressBar progress={(count / totalProducts) * 100} size="small" tone="primary" />
                      </BlockStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="300">
                  <Text as="h2" variant="headingMd">Products by Type</Text>
                  <BlockStack gap="200">
                    {Object.entries(productsByType).slice(0, 5).map(([type, count]: [string, any]) => (
                      <InlineStack key={type} align="space-between">
                        <Text as="span">{type}</Text>
                        <Badge>{count}</Badge>
                      </InlineStack>
                    ))}
                  </BlockStack>
                </BlockStack>
              </Card>
            </InlineStack>
            
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Low Inventory Products</Text>
                <Divider />
                {lowInventoryProducts.length > 0 ? (
                  <BlockStack gap="200">
                    {lowInventoryProducts.slice(0, 10).map((product: any) => (
                      <Box key={product.node.id} padding="300" background="bg-surface-warning" borderRadius="200">
                        <InlineStack align="space-between">
                          <Text as="span" fontWeight="semibold">{product.node.title}</Text>
                          <Badge tone="warning">{product.node.totalInventory} left</Badge>
                        </InlineStack>
                      </Box>
                    ))}
                  </BlockStack>
                ) : (
                  <Text as="p" tone="subdued">No low inventory products</Text>
                )}
              </BlockStack>
            </Card>
            
            <InlineGrid columns={2} gap="400">
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Avg Price</Text>
                  <Text as="p" variant="headingLg">{formatCurrency(avgPrice)}</Text>
                  <Text as="span" variant="bodySm" tone="subdued">Per product</Text>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Out of Stock</Text>
                  <Text as="p" variant="headingLg">{outOfStockProducts.length}</Text>
                  <Badge tone="critical">Needs restock</Badge>
                </BlockStack>
              </Card>
              <Card>
                <BlockStack gap="200">
                  <Text as="p" variant="bodySm" tone="subdued">Low Inventory</Text>
                  <Text as="p" variant="headingLg">{lowInventoryProducts.length}</Text>
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
