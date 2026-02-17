import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, Text, BlockStack, InlineGrid, Box, Badge, Icon, InlineStack, Divider } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);

  const shopResponse = await admin.graphql(`
    query { shop { name email myshopifyDomain plan { displayName } } }
  `);
  const shopData = await shopResponse.json();

  const ordersResponse = await admin.graphql(`
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id name createdAt totalPriceSet { shopMoney { amount currencyCode } }
            displayFinancialStatus displayFulfillmentStatus
          }
        }
      }
    }
  `);
  const ordersData = await ordersResponse.json();
  const orders = ordersData.data.orders.edges.map((e: any) => e.node);

  const totalRevenue = orders.reduce((sum: number, o: any) => sum + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const totalOrders = orders.length;
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || "USD";

  const productsResponse = await admin.graphql(`
    query { products(first: 10, sortKey: CREATED_AT, reverse: true) { edges { node { id title status totalInventory } } } }
  `);
  const productsData = await productsResponse.json();
  const products = productsData.data.products.edges.map((e: any) => e.node);

  const customersResponse = await admin.graphql(`
    query { customers(first: 10, sortKey: CREATED_AT, reverse: true) { edges { node { id displayName email ordersCount totalSpentV2 { amount currencyCode } } } } }
  `);
  const customersData = await customersResponse.json();
  const customers = customersData.data.customers.edges.map((e: any) => e.node);

  return json({
    shop: shopData.data.shop,
    totalRevenue,
    totalOrders,
    avgOrderValue,
    currency,
    recentOrders: orders.slice(0, 5),
    products: products.slice(0, 5),
    customers: customers.slice(0, 5),
  });
};

export default function Dashboard() {
  const { shop, totalRevenue, totalOrders, avgOrderValue, currency, recentOrders, products, customers } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard" subtitle={`Welcome back, ${shop.name}`}>
      <BlockStack gap="500">
        <InlineGrid columns={{ xs: 1, sm: 2, md: 4 }} gap="400">
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Total Revenue</Text>
              <Text as="p" variant="headingLg">{currency} {totalRevenue.toFixed(2)}</Text>
              <Badge tone="success">Last 50 orders</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Total Orders</Text>
              <Text as="p" variant="headingLg">{totalOrders}</Text>
              <Badge tone="info">Recent activity</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Avg Order Value</Text>
              <Text as="p" variant="headingLg">{currency} {avgOrderValue.toFixed(2)}</Text>
              <Badge tone="attention">Per order</Badge>
            </BlockStack>
          </Card>
          <Card>
            <BlockStack gap="200">
              <Text as="h3" variant="headingSm">Store Plan</Text>
              <Text as="p" variant="headingLg">{shop.plan?.displayName || "N/A"}</Text>
              <Badge>{shop.myshopifyDomain}</Badge>
            </BlockStack>
          </Card>
        </InlineGrid>

        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Recent Orders</Text>
                <Divider />
                {recentOrders.map((order: any) => (
                  <InlineStack key={order.id} align="space-between" blockAlign="center">
                    <BlockStack gap="100">
                      <Text as="span" variant="bodyMd" fontWeight="semibold">{order.name}</Text>
                      <Text as="span" variant="bodySm" tone="subdued">{new Date(order.createdAt).toLocaleDateString()}</Text>
                    </BlockStack>
                    <InlineStack gap="200">
                      <Badge tone={order.displayFinancialStatus === "PAID" ? "success" : "warning"}>{order.displayFinancialStatus}</Badge>
                      <Text as="span" variant="bodyMd">{currency} {parseFloat(order.totalPriceSet.shopMoney.amount).toFixed(2)}</Text>
                    </InlineStack>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Top Products</Text>
                <Divider />
                {products.map((product: any) => (
                  <InlineStack key={product.id} align="space-between" blockAlign="center">
                    <Text as="span" variant="bodyMd">{product.title}</Text>
                    <Badge>{product.totalInventory} in stock</Badge>
                  </InlineStack>
                ))}
              </BlockStack>
            </Card>
            <Box paddingBlockStart="400">
              <Card>
                <BlockStack gap="400">
                  <Text as="h2" variant="headingMd">Recent Customers</Text>
                  <Divider />
                  {customers.map((customer: any) => (
                    <InlineStack key={customer.id} align="space-between" blockAlign="center">
                      <BlockStack gap="100">
                        <Text as="span" variant="bodyMd">{customer.displayName}</Text>
                        <Text as="span" variant="bodySm" tone="subdued">{customer.email}</Text>
                      </BlockStack>
                      <Text as="span" variant="bodyMd">{customer.totalSpentV2?.amount ? `${currency} ${parseFloat(customer.totalSpentV2.amount).toFixed(2)}` : "$0.00"}</Text>
                    </InlineStack>
                  ))}
                </BlockStack>
              </Card>
            </Box>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
