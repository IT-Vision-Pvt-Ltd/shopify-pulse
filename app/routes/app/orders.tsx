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
  Filters,
  ChoiceList,
  DatePicker,
} from "@shopify/polaris";
import {
  OrderIcon,
  CashDollarIcon,
  DeliveryIcon,
  ClockIcon,
  CheckCircleIcon,
  AlertCircleIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const response = await admin.graphql(`
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id
            name
            createdAt
            displayFinancialStatus
            displayFulfillmentStatus
            totalPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            customer {
              firstName
              lastName
              email
            }
            lineItems(first: 5) {
              edges {
                node {
                  title
                  quantity
                }
              }
            }
            shippingAddress {
              city
              country
            }
          }
        }
      }
    }
  `);

  const data = await response.json();
  const orders = data.data?.orders?.edges?.map((edge: any) => edge.node) || [];

  const totalOrders = orders.length;
  const totalRevenue = orders.reduce((sum: number, o: any) => 
    sum + parseFloat(o.totalPriceSet?.shopMoney?.amount || 0), 0
  );
  const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const pendingOrders = orders.filter((o: any) => 
    o.displayFulfillmentStatus === "UNFULFILLED" || o.displayFulfillmentStatus === "PARTIALLY_FULFILLED"
  ).length;
  const fulfilledOrders = orders.filter((o: any) => 
    o.displayFulfillmentStatus === "FULFILLED"
  ).length;
  const paidOrders = orders.filter((o: any) => 
    o.displayFinancialStatus === "PAID"
  ).length;
  const pendingPayment = orders.filter((o: any) => 
    o.displayFinancialStatus === "PENDING" || o.displayFinancialStatus === "PARTIALLY_PAID"
  ).length;

  return json({
    orders,
    stats: {
      totalOrders,
      totalRevenue,
      avgOrderValue,
      pendingOrders,
      fulfilledOrders,
      paidOrders,
      pendingPayment,
      fulfillmentRate: totalOrders > 0 ? ((fulfilledOrders / totalOrders) * 100).toFixed(1) : 0,
    },
  });
};

export default function Orders() {
  const { orders, stats } = useLoaderData<typeof loader>();
  const [searchValue, setSearchValue] = useState("");
  const [fulfillmentFilter, setFulfillmentFilter] = useState<string[]>([]);
  const [paymentFilter, setPaymentFilter] = useState<string[]>([]);

  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleFulfillmentChange = useCallback((value: string[]) => setFulfillmentFilter(value), []);
  const handlePaymentChange = useCallback((value: string[]) => setPaymentFilter(value), []);
  const handleClearAll = useCallback(() => {
    setSearchValue("");
    setFulfillmentFilter([]);
    setPaymentFilter([]);
  }, []);

  const filteredOrders = orders.filter((order: any) => {
    const matchesSearch = searchValue === "" || 
      order.name.toLowerCase().includes(searchValue.toLowerCase()) ||
      `${order.customer?.firstName} ${order.customer?.lastName}`.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesFulfillment = fulfillmentFilter.length === 0 || 
      fulfillmentFilter.includes(order.displayFulfillmentStatus?.toLowerCase() || "");
    
    const matchesPayment = paymentFilter.length === 0 ||
      paymentFilter.includes(order.displayFinancialStatus?.toLowerCase() || "");
    
    return matchesSearch && matchesFulfillment && matchesPayment;
  });

  const getFulfillmentBadge = (status: string) => {
    switch (status) {
      case "FULFILLED": return <Badge tone="success">Fulfilled</Badge>;
      case "PARTIALLY_FULFILLED": return <Badge tone="warning">Partial</Badge>;
      case "UNFULFILLED": return <Badge tone="attention">Unfulfilled</Badge>;
      default: return <Badge>{status || "Unknown"}</Badge>;
    }
  };

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case "PAID": return <Badge tone="success">Paid</Badge>;
      case "PARTIALLY_PAID": return <Badge tone="warning">Partial</Badge>;
      case "PENDING": return <Badge tone="attention">Pending</Badge>;
      case "REFUNDED": return <Badge tone="info">Refunded</Badge>;
      default: return <Badge>{status || "Unknown"}</Badge>;
    }
  };

  const rows = filteredOrders.map((order: any) => [
    <BlockStack gap="0">
      <Text as="span" fontWeight="semibold">{order.name}</Text>
      <Text as="span" tone="subdued" variant="bodySm">
        {new Date(order.createdAt).toLocaleString()}
      </Text>
    </BlockStack>,
    order.customer 
      ? `${order.customer.firstName} ${order.customer.lastName}`
      : "Guest",
    `$${parseFloat(order.totalPriceSet?.shopMoney?.amount || 0).toFixed(2)}`,
    getPaymentBadge(order.displayFinancialStatus),
    getFulfillmentBadge(order.displayFulfillmentStatus),
    order.lineItems?.edges?.length || 0,
  ]);

  return (
    <Page
      title="Orders"
      subtitle="Track and manage your orders"
      primaryAction={
        <Button variant="primary" icon={OrderIcon}>
          Export Orders
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* Order Stats */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Orders</Text>
                  <Icon source={OrderIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.totalOrders}
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">
                  Last 50 orders
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Revenue</Text>
                  <Icon source={CashDollarIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  ${stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">
                  Avg: ${stats.avgOrderValue.toFixed(2)} per order
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Fulfillment Rate</Text>
                  <Icon source={DeliveryIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.fulfillmentRate}%
                </Text>
                <ProgressBar 
                  progress={parseFloat(stats.fulfillmentRate as string)} 
                  tone="primary" 
                  size="small" 
                />
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Order Status Overview */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Order Status Overview</Text>
            <Divider />
            <Layout>
              <Layout.Section variant="oneHalf">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">Fulfillment Status</Text>
                  <InlineStack gap="200">
                    <Badge tone="success">{stats.fulfilledOrders} Fulfilled</Badge>
                    <Badge tone="attention">{stats.pendingOrders} Pending</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.fulfilledOrders / stats.totalOrders) * 100} 
                    tone="success" 
                    size="small" 
                  />
                </BlockStack>
              </Layout.Section>

              <Layout.Section variant="oneHalf">
                <BlockStack gap="300">
                  <Text as="h3" variant="headingSm">Payment Status</Text>
                  <InlineStack gap="200">
                    <Badge tone="success">{stats.paidOrders} Paid</Badge>
                    <Badge tone="attention">{stats.pendingPayment} Pending</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.paidOrders / stats.totalOrders) * 100} 
                    tone="success" 
                    size="small" 
                  />
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        {/* Orders List */}
        <Card padding="0">
          <BlockStack gap="0">
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">Recent Orders</Text>
                <Filters
                  queryValue={searchValue}
                  queryPlaceholder="Search orders..."
                  onQueryChange={handleSearchChange}
                  onQueryClear={() => setSearchValue("")}
                  onClearAll={handleClearAll}
                  filters={[
                    {
                      key: "fulfillment",
                      label: "Fulfillment",
                      filter: (
                        <ChoiceList
                          title="Fulfillment"
                          titleHidden
                          choices={[
                            { label: "Fulfilled", value: "fulfilled" },
                            { label: "Unfulfilled", value: "unfulfilled" },
                            { label: "Partial", value: "partially_fulfilled" },
                          ]}
                          selected={fulfillmentFilter}
                          onChange={handleFulfillmentChange}
                          allowMultiple
                        />
                      ),
                      shortcut: true,
                    },
                    {
                      key: "payment",
                      label: "Payment",
                      filter: (
                        <ChoiceList
                          title="Payment"
                          titleHidden
                          choices={[
                            { label: "Paid", value: "paid" },
                            { label: "Pending", value: "pending" },
                            { label: "Refunded", value: "refunded" },
                          ]}
                          selected={paymentFilter}
                          onChange={handlePaymentChange}
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
              columnContentTypes={["text", "text", "numeric", "text", "text", "numeric"]}
              headings={["Order", "Customer", "Total", "Payment", "Fulfillment", "Items"]}
              rows={rows}
              footerContent={`Showing ${filteredOrders.length} of ${orders.length} orders`}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
