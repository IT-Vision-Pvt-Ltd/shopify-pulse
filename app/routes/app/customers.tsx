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
  TextField,
} from "@shopify/polaris";
import {
  PersonIcon,
  EmailIcon,
  LocationIcon,
  OrderIcon,
  CashDollarIcon,
  CalendarIcon,
  TrendingUpIcon,
  StarIcon,
} from "@shopify/polaris-icons";
import { useState, useCallback } from "react";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  // Fetch customers from Shopify
  const response = await admin.graphql(`
    query {
      customers(first: 50) {
        edges {
          node {
            id
            firstName
            lastName
            email
            phone
            ordersCount
            totalSpent
            createdAt
            updatedAt
            defaultAddress {
              city
              country
            }
            tags
            state
          }
        }
      }
    }
  `);

  const data = await response.json();
  const customers = data.data?.customers?.edges?.map((edge: any) => edge.node) || [];

  // Calculate customer segments
  const totalCustomers = customers.length;
  const newCustomers = customers.filter((c: any) => {
    const created = new Date(c.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return created > thirtyDaysAgo;
  }).length;

  const repeatCustomers = customers.filter((c: any) => 
    parseInt(c.ordersCount) > 1
  ).length;

  const vipCustomers = customers.filter((c: any) => 
    parseFloat(c.totalSpent) > 500
  ).length;

  const avgOrderValue = customers.length > 0 
    ? customers.reduce((sum: number, c: any) => sum + parseFloat(c.totalSpent || 0), 0) / 
      customers.reduce((sum: number, c: any) => sum + parseInt(c.ordersCount || 0), 0) || 0
    : 0;

  return json({
    customers,
    stats: {
      totalCustomers,
      newCustomers,
      repeatCustomers,
      vipCustomers,
      avgOrderValue,
      repeatRate: totalCustomers > 0 ? ((repeatCustomers / totalCustomers) * 100).toFixed(1) : 0,
    },
  });
};

export default function Customers() {
  const { customers, stats } = useLoaderData<typeof loader>();
  const [searchValue, setSearchValue] = useState("");
  const [segment, setSegment] = useState<string[]>([]);

  const handleSearchChange = useCallback((value: string) => setSearchValue(value), []);
  const handleSegmentChange = useCallback((value: string[]) => setSegment(value), []);
  const handleClearAll = useCallback(() => {
    setSearchValue("");
    setSegment([]);
  }, []);

  const filteredCustomers = customers.filter((customer: any) => {
    const matchesSearch = searchValue === "" || 
      `${customer.firstName} ${customer.lastName}`.toLowerCase().includes(searchValue.toLowerCase()) ||
      customer.email?.toLowerCase().includes(searchValue.toLowerCase());
    
    const matchesSegment = segment.length === 0 || 
      (segment.includes("vip") && parseFloat(customer.totalSpent) > 500) ||
      (segment.includes("repeat") && parseInt(customer.ordersCount) > 1) ||
      (segment.includes("new") && new Date(customer.createdAt) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    
    return matchesSearch && matchesSegment;
  });

  const rows = filteredCustomers.map((customer: any) => [
    <InlineStack gap="200" blockAlign="center">
      <div style={{ 
        width: 32, 
        height: 32, 
        borderRadius: "50%", 
        background: "#5C6AC4", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        color: "white",
        fontSize: 12,
        fontWeight: 600 
      }}>
        {customer.firstName?.[0]}{customer.lastName?.[0]}
      </div>
      <BlockStack gap="0">
        <Text as="span" fontWeight="semibold">
          {customer.firstName} {customer.lastName}
        </Text>
        <Text as="span" tone="subdued" variant="bodySm">
          {customer.email}
        </Text>
      </BlockStack>
    </InlineStack>,
    customer.defaultAddress?.city && customer.defaultAddress?.country 
      ? `${customer.defaultAddress.city}, ${customer.defaultAddress.country}`
      : "—",
    customer.ordersCount || 0,
    `$${parseFloat(customer.totalSpent || 0).toLocaleString()}`,
    <Badge tone={parseFloat(customer.totalSpent) > 500 ? "success" : parseFloat(customer.totalSpent) > 100 ? "info" : "attention"}>
      {parseFloat(customer.totalSpent) > 500 ? "VIP" : parseFloat(customer.totalSpent) > 100 ? "Regular" : "New"}
    </Badge>,
    new Date(customer.createdAt).toLocaleDateString(),
  ]);

  return (
    <Page
      title="Customers"
      subtitle="Analyze customer behavior and segments"
      primaryAction={
        <Button variant="primary" icon={PersonIcon}>
          Export Customers
        </Button>
      }
    >
      <BlockStack gap="500">
        {/* Customer Stats */}
        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Total Customers</Text>
                  <Icon source={PersonIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.totalCustomers.toLocaleString()}
                </Text>
                <InlineStack gap="100">
                  <Badge tone="success">+{stats.newCustomers} new</Badge>
                  <Text as="span" tone="subdued" variant="bodySm">this month</Text>
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Repeat Rate</Text>
                  <Icon source={TrendingUpIcon} tone="info" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.repeatRate}%
                </Text>
                <BlockStack gap="100">
                  <ProgressBar progress={parseFloat(stats.repeatRate as string)} tone="primary" size="small" />
                  <Text as="span" tone="subdued" variant="bodySm">
                    {stats.repeatCustomers} repeat customers
                  </Text>
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">VIP Customers</Text>
                  <Icon source={StarIcon} tone="warning" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  {stats.vipCustomers}
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">
                  Spent over $500 lifetime
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        <Layout>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="200">
                <InlineStack align="space-between">
                  <Text as="h3" variant="headingMd">Avg Order Value</Text>
                  <Icon source={CashDollarIcon} tone="success" />
                </InlineStack>
                <Text as="p" variant="heading2xl">
                  ${stats.avgOrderValue.toFixed(2)}
                </Text>
                <Text as="span" tone="subdued" variant="bodySm">
                  Per customer order
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Customer Segments */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Customer Segments</Text>
            <Divider />
            <Layout>
              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" fontWeight="semibold">New Customers</Text>
                    <Badge tone="info">{stats.newCustomers}</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.newCustomers / stats.totalCustomers) * 100} 
                    tone="info" 
                    size="small" 
                  />
                  <Text as="span" tone="subdued" variant="bodySm">
                    Joined in last 30 days
                  </Text>
                </BlockStack>
              </Layout.Section>

              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" fontWeight="semibold">Repeat Buyers</Text>
                    <Badge tone="success">{stats.repeatCustomers}</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.repeatCustomers / stats.totalCustomers) * 100} 
                    tone="success" 
                    size="small" 
                  />
                  <Text as="span" tone="subdued" variant="bodySm">
                    2+ orders placed
                  </Text>
                </BlockStack>
              </Layout.Section>

              <Layout.Section variant="oneThird">
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="span" fontWeight="semibold">VIP Members</Text>
                    <Badge tone="warning">{stats.vipCustomers}</Badge>
                  </InlineStack>
                  <ProgressBar 
                    progress={(stats.vipCustomers / stats.totalCustomers) * 100} 
                    tone="warning" 
                    size="small" 
                  />
                  <Text as="span" tone="subdued" variant="bodySm">
                    $500+ lifetime value
                  </Text>
                </BlockStack>
              </Layout.Section>
            </Layout>
          </BlockStack>
        </Card>

        {/* Customer List */}
        <Card padding="0">
          <BlockStack gap="0">
            <Box padding="400">
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">All Customers</Text>
                <Filters
                  queryValue={searchValue}
                  queryPlaceholder="Search customers..."
                  onQueryChange={handleSearchChange}
                  onQueryClear={() => setSearchValue("")}
                  onClearAll={handleClearAll}
                  filters={[
                    {
                      key: "segment",
                      label: "Segment",
                      filter: (
                        <ChoiceList
                          title="Segment"
                          titleHidden
                          choices={[
                            { label: "VIP Customers", value: "vip" },
                            { label: "Repeat Buyers", value: "repeat" },
                            { label: "New Customers", value: "new" },
                          ]}
                          selected={segment}
                          onChange={handleSegmentChange}
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
              columnContentTypes={["text", "text", "numeric", "numeric", "text", "text"]}
              headings={["Customer", "Location", "Orders", "Total Spent", "Segment", "Joined"]}
              rows={rows}
              footerContent={`Showing ${filteredCustomers.length} of ${customers.length} customers`}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
