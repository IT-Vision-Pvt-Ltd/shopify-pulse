import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  Text,
  BlockStack,
  InlineStack,
  Badge,
  DataTable,
  ProgressBar,
  Box,
  Divider,
  Icon,
  Button,
  Thumbnail,
  Filters,
  ChoiceList,
} from "@shopify/polaris";
import {
  ProductIcon,
  InventoryIcon,
  ChartVerticalIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  CashDollarIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      products(first: 50) {
        edges {
          node {
            id
            title
            status
            totalInventory
            priceRangeV2 {
              minVariantPrice {
                amount
                currencyCode
              }
              maxVariantPrice {
                amount
                currencyCode
              }
            }
            featuredImage {
              url
              altText
            }
            vendor
            productType
            createdAt
            updatedAt
            variants(first: 1) {
              edges {
                node {
                  sku
                  inventoryQuantity
                }
              }
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  const products = data.data?.products?.edges?.map((edge: any) => edge.node) || [];

  const totalProducts = products.length;
  const activeProducts = products.filter((p: any) => p.status === "ACTIVE").length;
  const draftProducts = products.filter((p: any) => p.status === "DRAFT").length;
  const lowStockProducts = products.filter((p: any) => 
    p.totalInventory > 0 && p.totalInventory < 10
  ).length;
  const outOfStockProducts = products.filter((p: any) => 
    p.totalInventory === 0
  ).length;
  const totalInventory = products.reduce((sum: number, p: any) => 
    sum + (p.totalInventory || 0), 0
  );

  return json({
    products,
    stats: {
      totalProducts,
      activeProducts,
      draftProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventory,
    },
  });
};

export default function Products() {
  const { products, stats } = useLoaderData<typeof loader>();
  const [searchValue, setSearchValue] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<string[]>([]);

  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleStatusChange = useCallback((value: string[]) => setStatusFilter(value), []);
  const handleStockChange = useCallback((value: string[]) => setStockFilter(value), []);
  const handleClearAll = useCallback(() => {
    setSearchValue("");
    setStatusFilter([]);
    setStockFilter([]);
  }, []);

  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = searchValue === "" || 
      product.title.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesStatus = statusFilter.length === 0 || 
      statusFilter.includes(product.status.toLowerCase());
    
    const matchesStock = stockFilter.length === 0 ||
      (stockFilter.includes("out") && product.totalInventory === 0) ||
      (stockFilter.includes("low") && product.totalInventory > 0 && product.totalInventory < 10) ||
      (stockFilter.includes("in") && product.totalInventory >= 10);
    
    return matchesSearch && matchesStatus && matchesStock;
  });

  const getStockBadge = (inventory: number) => {
    if (inventory === 0) return <Badge tone="critical">Out of Stock</Badge>;
    if (inventory < 10) return <Badge tone="warning">Low Stock ({inventory})</Badge>;
    return <Badge tone="success">In Stock ({inventory})</Badge>;
  };

  const rows = filteredProducts.map((product: any) => [
    <InlineStack gap="300" blockAlign="center">
      <Thumbnail
        source={product.featuredImage?.url || ""}
        alt={product.featuredImage?.altText || product.title}
        size="small"
      />
      <BlockStack gap="0">
        <Text as="span" fontWeight="semibold">
          {product.title}
        </Text>
        <Text as="span" tone="subdued" variant="bodySm">
          {product.vendor || "No vendor"}
        </Text>
      </BlockStack>
    </InlineStack>,
    <Badge tone={product.status === "ACTIVE" ? "success" : "attention"}>
      {product.status}
    </Badge>,
    `$${parseFloat(product.priceRangeV2?.minVariantPrice?.amount || 0).toFixed(2)}`,
    getStockBadge(product.totalInventory || 0),
    product.productType || "—",
    new Date(product.updatedAt).toLocaleDateString(),
  ]);

  return (
    <Page
      title="Products"
      subtitle="Product performance and inventory insights"
      primaryAction={
        <Button variant="primary" icon={ProductIcon}>
          Export Products
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* Product Stats */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Products</Text>
                  <Icon source={ProductIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.totalProducts}
                </Text>
                <InlineStack gap="200">
                  <Badge tone="success">{stats.activeProducts} active</Badge>
                  <Badge tone="attention">{stats.draftProducts} draft</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Inventory</Text>
                  <Icon source={InventoryIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.totalInventory.toLocaleString()}
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">
                  Units across all products
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Stock Alerts</Text>
                  <Icon source={AlertCircleIcon} tone="critical" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.lowStockProducts + stats.outOfStockProducts}
                </Text>
                <InlineStack gap="200">
                  <Badge tone="critical">{stats.outOfStockProducts} out</Badge>
                  <Badge tone="warning">{stats.lowStockProducts} low</Badge>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Inventory Health */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Inventory Health</Text>
            <Divider />
            <Layout>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" fontWeight="semibold">In Stock</Text>
                    <Badge tone="success">
                      {stats.totalProducts - stats.lowStockProducts - stats.outOfStockProducts}
                    </Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={((stats.totalProducts - stats.lowStockProducts - stats.outOfStockProducts) / stats.totalProducts) * 100} 
                    tone="success" 
                    size="small" 
                  />
                </BlockStack>
              </Layout.Section>

              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" fontWeight="semibold">Low Stock</Text>
                    <Badge tone="warning">{stats.lowStockProducts}</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.lowStockProducts / stats.totalProducts) * 100} 
                    tone="warning" 
                    size="small" 
                  />
                </BlockStack>
              </Layout.Section>

              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" fontWeight="semibold">Out of Stock</Text>
                    <Badge tone="critical">{stats.outOfStockProducts}</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.outOfStockProducts / stats.totalProducts) * 100} 
                    tone="critical" 
                    size="small" 
                  />
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        {/* Product List */}
        <Card padding="0">
          <BlockStack gap="0">
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">All Products</Text>
                <Filters
                  queryValue={searchValue}
                  queryPlaceholder="Search products..."
                  onQueryChange={handleSearchChange}
                  onQueryClear={() => setSearchValue("")}
                  onClearAll={handleClearAll}
                  filters={[
                    {
                      key: "status",
                      label: "Status",
                      filter: (
                        <ChoiceList
                          title="Status"
                          titleHidden
                          choices={[
                            { label: "Active", value: "active" },
                            { label: "Draft", value: "draft" },
                            { label: "Archived", value: "archived" },
                          ]}
                          selected={statusFilter}
                          onChange={handleStatusChange}
                          allowMultiple
                        />
                      ),
                      shortcut: true,
                    },
                    {
                      key: "stock",
                      label: "Stock Level",
                      filter: (
                        <ChoiceList
                          title="Stock Level"
                          titleHidden
                          choices={[
                            { label: "In Stock", value: "in" },
                            { label: "Low Stock", value: "low" },
                            { label: "Out of Stock", value: "out" },
                          ]}
                          selected={stockFilter}
                          onChange={handleStockChange}
                          allowMultiple
                        />
                      ),
                      shortcut: true,
                    },
                  ]}
                />
              </BlockStack>
            </Box>
            <DataTable
              columnContentTypes={["text", "text", "numeric", "text", "text", "text"]}
              headings={["Product", "Status", "Price", "Inventory", "Type", "Updated"]}
              rows={rows}
              footerContent={`Showing ${filteredProducts.length} of ${products.length} products`}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
