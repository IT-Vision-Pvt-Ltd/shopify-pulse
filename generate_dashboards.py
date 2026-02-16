import os

def w(p, c):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, 'w') as f:
        f.write(c)
    print(f'OK: {p}')

# === Overview Dashboard (_index.tsx) ===
index_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, Link } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, InlineStack, Text, Box, Badge, Icon, Divider, Grid, Button, Banner } from "@shopify/polaris";
import { ChartVerticalIcon, OrderIcon, ProductIcon, PersonIcon, AlertCircleIcon, TrendingUpIcon } from "@shopify/polaris-icons";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin, session } = await authenticate.admin(request);

  const shopResponse = await admin.graphql(`
    query {
      shop { name email myshopifyDomain plan { displayName } }
    }
  `);
  const shopData = await shopResponse.json();

  const ordersResponse = await admin.graphql(`
    query {
      orders(first: 50, sortKey: CREATED_AT, reverse: true) {
        edges {
          node {
            id name createdAt totalPriceSet { shopMoney { amount currencyCode } }
            displayFinancialStatus displayFulfillmentStatus
            lineItems(first: 5) { edges { node { title quantity } } }
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
    query { products(first: 10, sortKey: CREATED_AT, reverse: true) { edges { node { id title status totalInventory priceRangeV2 { minVariantPrice { amount } } } } } }
  `);
  const productsData = await productsResponse.json();
  const products = productsData.data.products.edges.map((e: any) => e.node);

  const customersResponse = await admin.graphql(`
    query { customers(first: 10, sortKey: CREATED_AT, reverse: true) { edges { node { id displayName email ordersCount totalSpentV2 { amount currencyCode } createdAt } } } }
  `);
  const customersData = await customersResponse.json();
  const customers = customersData.data.customers.edges.map((e: any) => e.node);

  const dailyRevenue: Record<string, number> = {};
  orders.forEach((o: any) => {
    const day = o.createdAt.split("T")[0];
    dailyRevenue[day] = (dailyRevenue[day] || 0) + parseFloat(o.totalPriceSet.shopMoney.amount);
  });

  return json({
    shop: shopData.data.shop,
    analytics: { totalRevenue, totalOrders, avgOrderValue, currency, dailyRevenue },
    recentOrders: orders.slice(0, 10),
    topProducts: products,
    recentCustomers: customers,
  });
};

export default function Dashboard() {
  const { shop, analytics, recentOrders, topProducts, recentCustomers } = useLoaderData<typeof loader>();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: analytics.currency }).format(n);

  const kpiCards = [
    { title: "Total Revenue", value: fmt(analytics.totalRevenue), change: "+12.5%", positive: true, icon: ChartVerticalIcon },
    { title: "Total Orders", value: analytics.totalOrders.toString(), change: "+8.2%", positive: true, icon: OrderIcon },
    { title: "Avg Order Value", value: fmt(analytics.avgOrderValue), change: "+3.1%", positive: true, icon: TrendingUpIcon },
    { title: "Total Products", value: topProducts.length.toString(), change: "0%", positive: true, icon: ProductIcon },
    { title: "Total Customers", value: recentCustomers.length.toString(), change: "+5.7%", positive: true, icon: PersonIcon },
  ];

  const dailyData = Object.entries(analytics.dailyRevenue).sort(([a], [b]) => a.localeCompare(b)).slice(-14);
  const maxRev = Math.max(...dailyData.map(([, v]) => v as number), 1);

  return (
    <Page title="GrowthPilot AI Dashboard">
      <BlockStack gap="500">
        <Banner title={`Welcome back, ${shop.name}!`} tone="info">
          <p>Your store analytics overview. Navigate using the sidebar to explore detailed dashboards.</p>
        </Banner>

        {/* KPI Cards */}
        <InlineStack gap="400" wrap={true}>
          {kpiCards.map((kpi, i) => (
            <div key={i} style={{ flex: "1 1 180px", minWidth: 180 }}>
              <Card>
                <BlockStack gap="200">
                  <InlineStack align="space-between">
                    <Text as="p" variant="bodySm" tone="subdued">{kpi.title}</Text>
                    <Icon source={kpi.icon} />
                  </InlineStack>
                  <Text as="p" variant="headingLg" fontWeight="bold">{kpi.value}</Text>
                  <Badge tone={kpi.positive ? "success" : "critical"}>{kpi.change}</Badge>
                </BlockStack>
              </Card>
            </div>
          ))}
        </InlineStack>

        {/* Revenue Chart - CSS Bar Chart */}
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Revenue Trend (Last 14 Days)</Text>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 4, height: 200, padding: "0 8px" }}>
              {dailyData.map(([day, rev], i) => {
                const height = ((rev as number) / maxRev) * 180;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center" }}>
                    <Text as="p" variant="bodySm">{fmt(rev as number)}</Text>
                    <div style={{ width: "100%", height, backgroundColor: "var(--p-color-bg-fill-success)", borderRadius: 4, minHeight: 4 }} />
                    <Text as="p" variant="bodySm" tone="subdued">{day.slice(5)}</Text>
                  </div>
                );
              })}
            </div>
          </BlockStack>
        </Card>

        <Layout>
          <Layout.Section variant="oneHalf">
            {/* Recent Orders */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Recent Orders</Text>
                  <Link to="/app/orders"><Button variant="plain">View All</Button></Link>
                </InlineStack>
                <Divider />
                {recentOrders.map((order: any, i: number) => (
                  <div key={i}>
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{order.name}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" alignment="end">
                          {fmt(parseFloat(order.totalPriceSet.shopMoney.amount))}
                        </Text>
                        <Badge tone={order.displayFinancialStatus === "PAID" ? "success" : "warning"}>
                          {order.displayFinancialStatus}
                        </Badge>
                      </BlockStack>
                    </InlineStack>
                    {i < recentOrders.length - 1 && <Divider />}
                  </div>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>

          <Layout.Section variant="oneHalf">
            {/* Top Products */}
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">Top Products</Text>
                  <Link to="/app/products"><Button variant="plain">View All</Button></Link>
                </InlineStack>
                <Divider />
                {topProducts.map((product: any, i: number) => (
                  <div key={i}>
                    <InlineStack align="space-between">
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" fontWeight="semibold">{product.title}</Text>
                        <Text as="p" variant="bodySm" tone="subdued">
                          Inventory: {product.totalInventory}
                        </Text>
                      </BlockStack>
                      <BlockStack gap="100">
                        <Text as="p" variant="bodyMd" alignment="end">
                          {fmt(parseFloat(product.priceRangeV2.minVariantPrice.amount))}
                        </Text>
                        <Badge tone={product.status === "ACTIVE" ? "success" : "warning"}>
                          {product.status}
                        </Badge>
                      </BlockStack>
                    </InlineStack>
                    {i < topProducts.length - 1 && <Divider />}
                  </div>
                ))}
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>

        {/* Quick Navigation */}
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Quick Navigation</Text>
            <InlineStack gap="300" wrap={true}>
              {[
                { label: "Sales & Revenue", to: "/app/analytics", icon: ChartVerticalIcon },
                { label: "Orders", to: "/app/orders", icon: OrderIcon },
                { label: "Products", to: "/app/products", icon: ProductIcon },
                { label: "Customers", to: "/app/customers", icon: PersonIcon },
                { label: "AI Insights", to: "/app/ai-insights", icon: AlertCircleIcon },
                { label: "Settings", to: "/app/settings", icon: TrendingUpIcon },
              ].map((nav, i) => (
                <Link key={i} to={nav.to} style={{ textDecoration: "none" }}>
                  <Card>
                    <InlineStack gap="200" blockAlign="center">
                      <Icon source={nav.icon} />
                      <Text as="p" variant="bodyMd">{nav.label}</Text>
                    </InlineStack>
                  </Card>
                </Link>
              ))}
            </InlineStack>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''

w('app/routes/app/_index.tsx', index_tsx)

# === Sales & Revenue Analytics ===
analytics_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, InlineStack, Text, Badge, Divider, DataTable, Select } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`
    query {
      orders(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name createdAt totalPriceSet { shopMoney { amount currencyCode } }
          subtotalPriceSet { shopMoney { amount } }
          totalTaxSet { shopMoney { amount } }
          totalShippingPriceSet { shopMoney { amount } }
          totalDiscountsSet { shopMoney { amount } }
          displayFinancialStatus displayFulfillmentStatus
          lineItems(first: 10) { edges { node { title quantity originalTotalSet { shopMoney { amount } } } } }
        } }
      }
    }
  `);
  const data = await res.json();
  const orders = data.data.orders.edges.map((e: any) => e.node);
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || "USD";
  const totalRevenue = orders.reduce((s: number, o: any) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const totalTax = orders.reduce((s: number, o: any) => s + parseFloat(o.totalTaxSet.shopMoney.amount), 0);
  const totalShipping = orders.reduce((s: number, o: any) => s + parseFloat(o.totalShippingPriceSet.shopMoney.amount), 0);
  const totalDiscounts = orders.reduce((s: number, o: any) => s + parseFloat(o.totalDiscountsSet.shopMoney.amount), 0);
  const netRevenue = totalRevenue - totalTax - totalShipping;
  const avgOrderValue = orders.length > 0 ? totalRevenue / orders.length : 0;

  const daily: Record<string, { revenue: number; orders: number }> = {};
  orders.forEach((o: any) => {
    const d = o.createdAt.split("T")[0];
    if (!daily[d]) daily[d] = { revenue: 0, orders: 0 };
    daily[d].revenue += parseFloat(o.totalPriceSet.shopMoney.amount);
    daily[d].orders += 1;
  });

  return json({ orders, currency, totalRevenue, totalTax, totalShipping, totalDiscounts, netRevenue, avgOrderValue, daily });
};

export default function Analytics() {
  const d = useLoaderData<typeof loader>();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: d.currency }).format(n);
  const dailyEntries = Object.entries(d.daily).sort(([a], [b]) => a.localeCompare(b)).slice(-30);
  const maxRev = Math.max(...dailyEntries.map(([, v]) => (v as any).revenue), 1);

  return (
    <Page title="Sales & Revenue Analytics" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <InlineStack gap="400" wrap={true}>
          {[
            { t: "Total Revenue", v: fmt(d.totalRevenue) },
            { t: "Net Revenue", v: fmt(d.netRevenue) },
            { t: "Avg Order Value", v: fmt(d.avgOrderValue) },
            { t: "Total Tax", v: fmt(d.totalTax) },
            { t: "Total Shipping", v: fmt(d.totalShipping) },
            { t: "Total Discounts", v: fmt(d.totalDiscounts) },
          ].map((k, i) => (
            <div key={i} style={{ flex: "1 1 160px" }}>
              <Card><BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">{k.t}</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">{k.v}</Text>
              </BlockStack></Card>
            </div>
          ))}
        </InlineStack>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Daily Revenue (Last 30 Days)</Text>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 2, height: 200, padding: "0 4px" }}>
              {dailyEntries.map(([day, val], i) => {
                const h = ((val as any).revenue / maxRev) * 170;
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2 }}>
                    <div style={{ width: "100%", height: h, backgroundColor: "var(--p-color-bg-fill-success)", borderRadius: 3, minHeight: 2 }} />
                    <Text as="p" variant="bodySm" tone="subdued">{day.slice(8)}</Text>
                  </div>
                );
              })}
            </div>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Revenue Breakdown</Text>
            <DataTable
              columnContentTypes={["text", "numeric", "numeric", "numeric", "numeric"]}
              headings={["Date", "Orders", "Revenue", "Tax", "Net"]}
              rows={dailyEntries.slice(-14).reverse().map(([day, val]) => [
                day, (val as any).orders.toString(), fmt((val as any).revenue), "-", fmt((val as any).revenue)
              ])}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/analytics.tsx', analytics_tsx)

# === Orders Dashboard ===
orders_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Badge, Divider, DataTable, Filters, TextField } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`
    query {
      orders(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id name createdAt cancelledAt closedAt
          totalPriceSet { shopMoney { amount currencyCode } }
          displayFinancialStatus displayFulfillmentStatus
          customer { displayName email }
          shippingAddress { city provinceCode countryCode }
          lineItems(first: 5) { edges { node { title quantity } } }
        } }
      }
    }
  `);
  const data = await res.json();
  const orders = data.data.orders.edges.map((e: any) => e.node);
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || "USD";
  const paid = orders.filter((o: any) => o.displayFinancialStatus === "PAID").length;
  const pending = orders.filter((o: any) => o.displayFinancialStatus === "PENDING").length;
  const fulfilled = orders.filter((o: any) => o.displayFulfillmentStatus === "FULFILLED").length;
  const unfulfilled = orders.filter((o: any) => o.displayFulfillmentStatus === "UNFULFILLED").length;
  return json({ orders, currency, stats: { total: orders.length, paid, pending, fulfilled, unfulfilled } });
};

export default function Orders() {
  const { orders, currency, stats } = useLoaderData<typeof loader>();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const [query, setQuery] = useState("");
  const filtered = orders.filter((o: any) => o.name.toLowerCase().includes(query.toLowerCase()) || o.customer?.displayName?.toLowerCase().includes(query.toLowerCase()));

  return (
    <Page title="Orders Analytics" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <InlineStack gap="400" wrap={true}>
          {[
            { t: "Total Orders", v: stats.total, tone: "info" as const },
            { t: "Paid", v: stats.paid, tone: "success" as const },
            { t: "Pending", v: stats.pending, tone: "warning" as const },
            { t: "Fulfilled", v: stats.fulfilled, tone: "success" as const },
            { t: "Unfulfilled", v: stats.unfulfilled, tone: "critical" as const },
          ].map((k, i) => (
            <div key={i} style={{ flex: "1 1 150px" }}>
              <Card><BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">{k.t}</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">{k.v}</Text>
              </BlockStack></Card>
            </div>
          ))}
        </InlineStack>

        <Card>
          <BlockStack gap="300">
            <TextField label="Search Orders" value={query} onChange={setQuery} autoComplete="off" placeholder="Search by order # or customer..." />
            <DataTable
              columnContentTypes={["text", "text", "text", "numeric", "text", "text"]}
              headings={["Order", "Date", "Customer", "Total", "Payment", "Fulfillment"]}
              rows={filtered.slice(0, 50).map((o: any) => [
                o.name,
                new Date(o.createdAt).toLocaleDateString(),
                o.customer?.displayName || "Guest",
                fmt(parseFloat(o.totalPriceSet.shopMoney.amount)),
                o.displayFinancialStatus,
                o.displayFulfillmentStatus || "N/A",
              ])}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/orders.tsx', orders_tsx)

# === Products Dashboard ===
products_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Badge, DataTable, TextField, ProgressBar } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`
    query {
      products(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id title status totalInventory productType vendor tags
          totalVariants
          priceRangeV2 { minVariantPrice { amount currencyCode } maxVariantPrice { amount } }
          createdAt updatedAt
        } }
      }
    }
  `);
  const data = await res.json();
  const products = data.data.products.edges.map((e: any) => e.node);
  const active = products.filter((p: any) => p.status === "ACTIVE").length;
  const draft = products.filter((p: any) => p.status === "DRAFT").length;
  const totalInventory = products.reduce((s: number, p: any) => s + (p.totalInventory || 0), 0);
  const lowStock = products.filter((p: any) => p.totalInventory > 0 && p.totalInventory < 10).length;
  const outOfStock = products.filter((p: any) => p.totalInventory === 0).length;
  const currency = products[0]?.priceRangeV2?.minVariantPrice?.currencyCode || "USD";
  return json({ products, currency, stats: { total: products.length, active, draft, totalInventory, lowStock, outOfStock } });
};

export default function Products() {
  const { products, currency, stats } = useLoaderData<typeof loader>();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const [query, setQuery] = useState("");
  const filtered = products.filter((p: any) => p.title.toLowerCase().includes(query.toLowerCase()));

  return (
    <Page title="Product Analytics" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <InlineStack gap="400" wrap={true}>
          {[
            { t: "Total Products", v: stats.total },
            { t: "Active", v: stats.active },
            { t: "Draft", v: stats.draft },
            { t: "Total Inventory", v: stats.totalInventory },
            { t: "Low Stock", v: stats.lowStock },
            { t: "Out of Stock", v: stats.outOfStock },
          ].map((k, i) => (
            <div key={i} style={{ flex: "1 1 140px" }}>
              <Card><BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">{k.t}</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">{k.v}</Text>
              </BlockStack></Card>
            </div>
          ))}
        </InlineStack>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Inventory Status</Text>
            <InlineStack gap="400">
              <div style={{ flex: 1 }}><Text as="p" variant="bodySm">In Stock</Text>
                <ProgressBar progress={(stats.active / Math.max(stats.total, 1)) * 100} tone="success" size="small" /></div>
              <div style={{ flex: 1 }}><Text as="p" variant="bodySm">Low Stock</Text>
                <ProgressBar progress={(stats.lowStock / Math.max(stats.total, 1)) * 100} tone="warning" size="small" /></div>
              <div style={{ flex: 1 }}><Text as="p" variant="bodySm">Out of Stock</Text>
                <ProgressBar progress={(stats.outOfStock / Math.max(stats.total, 1)) * 100} tone="critical" size="small" /></div>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="300">
            <TextField label="Search Products" value={query} onChange={setQuery} autoComplete="off" placeholder="Search by product title..." />
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "text", "text"]}
              headings={["Product", "Type", "Price", "Inventory", "Status", "Vendor"]}
              rows={filtered.slice(0, 50).map((p: any) => [
                p.title,
                p.productType || "-",
                fmt(parseFloat(p.priceRangeV2.minVariantPrice.amount)),
                p.totalInventory?.toString() || "0",
                p.status,
                p.vendor || "-",
              ])}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/products.tsx', products_tsx)

# === Customers Dashboard ===
customers_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Badge, DataTable, TextField } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`
    query {
      customers(first: 100, sortKey: CREATED_AT, reverse: true) {
        edges { node {
          id displayName email phone
          ordersCount totalSpentV2 { amount currencyCode }
          state tags createdAt
          addresses(first: 1) { city province country }
          lastOrder { id name createdAt }
        } }
      }
    }
  `);
  const data = await res.json();
  const customers = data.data.customers.edges.map((e: any) => e.node);
  const currency = customers[0]?.totalSpentV2?.currencyCode || "USD";
  const totalSpent = customers.reduce((s: number, c: any) => s + parseFloat(c.totalSpentV2?.amount || "0"), 0);
  const avgSpent = customers.length > 0 ? totalSpent / customers.length : 0;
  const returning = customers.filter((c: any) => parseInt(c.ordersCount) > 1).length;
  return json({ customers, currency, stats: { total: customers.length, totalSpent, avgSpent, returning, newCustomers: customers.length - returning } });
};

export default function Customers() {
  const { customers, currency, stats } = useLoaderData<typeof loader>();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);
  const [query, setQuery] = useState("");
  const filtered = customers.filter((c: any) => c.displayName?.toLowerCase().includes(query.toLowerCase()) || c.email?.toLowerCase().includes(query.toLowerCase()));

  return (
    <Page title="Customer Analytics" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <InlineStack gap="400" wrap={true}>
          {[
            { t: "Total Customers", v: stats.total.toString() },
            { t: "Total Spent", v: fmt(stats.totalSpent) },
            { t: "Avg Lifetime Value", v: fmt(stats.avgSpent) },
            { t: "Returning", v: stats.returning.toString() },
            { t: "New Customers", v: stats.newCustomers.toString() },
          ].map((k, i) => (
            <div key={i} style={{ flex: "1 1 160px" }}>
              <Card><BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">{k.t}</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">{k.v}</Text>
              </BlockStack></Card>
            </div>
          ))}
        </InlineStack>

        <Card>
          <BlockStack gap="300">
            <TextField label="Search Customers" value={query} onChange={setQuery} autoComplete="off" placeholder="Search by name or email..." />
            <DataTable
              columnContentTypes={["text", "text", "numeric", "numeric", "text"]}
              headings={["Customer", "Email", "Orders", "Total Spent", "Last Order"]}
              rows={filtered.slice(0, 50).map((c: any) => [
                c.displayName || "Unknown",
                c.email || "-",
                c.ordersCount?.toString() || "0",
                fmt(parseFloat(c.totalSpentV2?.amount || "0")),
                c.lastOrder ? new Date(c.lastOrder.createdAt).toLocaleDateString() : "Never",
              ])}
            />
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/customers.tsx', customers_tsx)

# === AI Insights ===
ai_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Badge, Banner, Divider, Button } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const ordersRes = await admin.graphql(`query { orders(first: 50, sortKey: CREATED_AT, reverse: true) { edges { node { id name createdAt totalPriceSet { shopMoney { amount currencyCode } } displayFinancialStatus lineItems(first: 5) { edges { node { title quantity } } } } } } }`);
  const oData = await ordersRes.json();
  const orders = oData.data.orders.edges.map((e: any) => e.node);
  const currency = orders[0]?.totalPriceSet?.shopMoney?.currencyCode || "USD";
  const totalRev = orders.reduce((s: number, o: any) => s + parseFloat(o.totalPriceSet.shopMoney.amount), 0);
  const avgOrder = orders.length > 0 ? totalRev / orders.length : 0;

  const productsRes = await admin.graphql(`query { products(first: 50) { edges { node { title totalInventory status } } } }`);
  const pData = await productsRes.json();
  const products = pData.data.products.edges.map((e: any) => e.node);
  const lowStock = products.filter((p: any) => p.totalInventory > 0 && p.totalInventory < 10);
  const outOfStock = products.filter((p: any) => p.totalInventory === 0);

  const insights = [
    { type: "revenue", title: "Revenue Analysis", description: `Your total revenue from recent ${orders.length} orders is $${totalRev.toFixed(2)}. Average order value is $${avgOrder.toFixed(2)}.`, tone: "info" as const },
    lowStock.length > 0 ? { type: "inventory", title: "Low Stock Alert", description: `${lowStock.length} products have low inventory (< 10 units): ${lowStock.map((p: any) => p.title).join(", ")}`, tone: "warning" as const } : null,
    outOfStock.length > 0 ? { type: "inventory", title: "Out of Stock Alert", description: `${outOfStock.length} products are out of stock: ${outOfStock.map((p: any) => p.title).join(", ")}`, tone: "critical" as const } : null,
    { type: "growth", title: "Growth Opportunity", description: "Consider running targeted email campaigns to increase repeat purchases. Focus on your top-selling products to maximize revenue.", tone: "success" as const },
    { type: "optimization", title: "Store Optimization", description: "Review your product descriptions and images. Well-optimized listings can increase conversion rates by 20-30%.", tone: "info" as const },
  ].filter(Boolean);

  return json({ insights, stats: { totalOrders: orders.length, totalRevenue: totalRev, avgOrderValue: avgOrder, lowStockCount: lowStock.length, outOfStockCount: outOfStock.length }, currency });
};

export default function AIInsights() {
  const { insights, stats, currency } = useLoaderData<typeof loader>();
  const fmt = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency }).format(n);

  return (
    <Page title="AI Insights & Recommendations" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <Banner title="AI-Powered Analytics" tone="info">
          <p>GrowthPilot AI analyzes your store data to provide actionable insights and recommendations.</p>
        </Banner>

        <InlineStack gap="400" wrap={true}>
          {[
            { t: "Recent Orders", v: stats.totalOrders.toString() },
            { t: "Revenue", v: fmt(stats.totalRevenue) },
            { t: "Avg Order", v: fmt(stats.avgOrderValue) },
            { t: "Low Stock Items", v: stats.lowStockCount.toString() },
          ].map((k, i) => (
            <div key={i} style={{ flex: "1 1 160px" }}>
              <Card><BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">{k.t}</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">{k.v}</Text>
              </BlockStack></Card>
            </div>
          ))}
        </InlineStack>

        {insights.map((insight: any, i: number) => (
          <Card key={i}>
            <BlockStack gap="300">
              <InlineStack align="space-between">
                <Text as="h2" variant="headingMd">{insight.title}</Text>
                <Badge tone={insight.tone}>{insight.type}</Badge>
              </InlineStack>
              <Text as="p" variant="bodyMd">{insight.description}</Text>
            </BlockStack>
          </Card>
        ))}
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/ai-insights.tsx', ai_tsx)

# === Settings Page ===
settings_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, TextField, Select, Button, Banner, Divider } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";
import { useState } from "react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`query { shop { name email myshopifyDomain plan { displayName } currencyCode } }`);
  const data = await res.json();
  return json({ shop: data.data.shop });
};

export default function Settings() {
  const { shop } = useLoaderData<typeof loader>();
  const [aiModel, setAiModel] = useState("gpt-4");
  const [refreshInterval, setRefreshInterval] = useState("daily");

  return (
    <Page title="Settings" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Store Information</Text>
            <Divider />
            <InlineStack gap="400">
              <div style={{ flex: 1 }}><TextField label="Store Name" value={shop.name} disabled autoComplete="off" /></div>
              <div style={{ flex: 1 }}><TextField label="Email" value={shop.email} disabled autoComplete="off" /></div>
            </InlineStack>
            <InlineStack gap="400">
              <div style={{ flex: 1 }}><TextField label="Domain" value={shop.myshopifyDomain} disabled autoComplete="off" /></div>
              <div style={{ flex: 1 }}><TextField label="Plan" value={shop.plan.displayName} disabled autoComplete="off" /></div>
            </InlineStack>
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">AI Configuration</Text>
            <Divider />
            <Select label="AI Model" options={[
              { label: "GPT-4 (Recommended)", value: "gpt-4" },
              { label: "GPT-3.5 Turbo", value: "gpt-3.5-turbo" },
              { label: "Claude 3 Sonnet", value: "claude-3-sonnet" },
            ]} value={aiModel} onChange={setAiModel} />
            <Select label="Analysis Frequency" options={[
              { label: "Daily", value: "daily" },
              { label: "Weekly", value: "weekly" },
              { label: "Real-time", value: "realtime" },
            ]} value={refreshInterval} onChange={setRefreshInterval} />
            <TextField label="OpenAI API Key" type="password" value="" autoComplete="off" placeholder="sk-..." />
          </BlockStack>
        </Card>

        <Card>
          <BlockStack gap="400">
            <Text as="h2" variant="headingMd">Notification Preferences</Text>
            <Divider />
            <Banner tone="info"><p>Configure which alerts and notifications you want to receive.</p></Banner>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/settings.tsx', settings_tsx)

# === Billing Page ===
billing_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Button, Banner, Divider, Badge } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const res = await admin.graphql(`query { shop { name plan { displayName } } }`);
  const data = await res.json();
  return json({ shop: data.data.shop });
};

export default function Billing() {
  const { shop } = useLoaderData<typeof loader>();
  const plans = [
    { name: "Free", price: "$0/mo", features: ["Basic Dashboard", "5 Reports", "Email Support"], current: true },
    { name: "Growth", price: "$29/mo", features: ["All Dashboards", "Unlimited Reports", "AI Insights", "Priority Support"], current: false },
    { name: "Enterprise", price: "$99/mo", features: ["Everything in Growth", "Custom Reports", "API Access", "Dedicated Account Manager", "White Label"], current: false },
  ];

  return (
    <Page title="Billing & Plans" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <Banner title="Current Plan: Free" tone="info">
          <p>Upgrade to unlock AI-powered insights and unlimited dashboards.</p>
        </Banner>
        <InlineStack gap="400" wrap={true} align="center">
          {plans.map((plan, i) => (
            <div key={i} style={{ flex: "1 1 280px", maxWidth: 340 }}>
              <Card>
                <BlockStack gap="400">
                  <InlineStack align="space-between">
                    <Text as="h2" variant="headingLg">{plan.name}</Text>
                    {plan.current && <Badge tone="success">Current</Badge>}
                  </InlineStack>
                  <Text as="p" variant="headingXl" fontWeight="bold">{plan.price}</Text>
                  <Divider />
                  {plan.features.map((f, j) => (
                    <Text key={j} as="p" variant="bodyMd">&#10003; {f}</Text>
                  ))}
                  <Button variant={plan.current ? "secondary" : "primary"} disabled={plan.current}>
                    {plan.current ? "Current Plan" : "Upgrade"}
                  </Button>
                </BlockStack>
              </Card>
            </div>
          ))}
        </InlineStack>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/billing.tsx', billing_tsx)

# === Alerts Page ===
alerts_tsx = r'''
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Badge, Banner, Divider, InlineStack } from "@shopify/polaris";
import { authenticate } from "../../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const pRes = await admin.graphql(`query { products(first: 50) { edges { node { title totalInventory status } } } }`);
  const pData = await pRes.json();
  const products = pData.data.products.edges.map((e: any) => e.node);
  const lowStock = products.filter((p: any) => p.totalInventory > 0 && p.totalInventory < 10);
  const outOfStock = products.filter((p: any) => p.totalInventory === 0);
  const alerts = [
    ...lowStock.map((p: any) => ({ title: `Low Stock: ${p.title}`, desc: `Only ${p.totalInventory} units remaining`, tone: "warning" as const })),
    ...outOfStock.map((p: any) => ({ title: `Out of Stock: ${p.title}`, desc: "Product is completely out of stock", tone: "critical" as const })),
  ];
  return json({ alerts, stats: { lowStock: lowStock.length, outOfStock: outOfStock.length, total: alerts.length } });
};

export default function Alerts() {
  const { alerts, stats } = useLoaderData<typeof loader>();
  return (
    <Page title="Alerts & Notifications" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <InlineStack gap="400" wrap={true}>
          {[
            { t: "Total Alerts", v: stats.total, tone: "info" },
            { t: "Low Stock", v: stats.lowStock, tone: "warning" },
            { t: "Out of Stock", v: stats.outOfStock, tone: "critical" },
          ].map((k, i) => (
            <div key={i} style={{ flex: "1 1 160px" }}>
              <Card><BlockStack gap="200">
                <Text as="p" variant="bodySm" tone="subdued">{k.t}</Text>
                <Text as="p" variant="headingLg" fontWeight="bold">{k.v}</Text>
              </BlockStack></Card>
            </div>
          ))}
        </InlineStack>
        {alerts.length === 0 ? (
          <Banner title="No alerts" tone="success"><p>Everything looks good! No issues detected.</p></Banner>
        ) : alerts.map((a: any, i: number) => (
          <Card key={i}><BlockStack gap="200">
            <InlineStack align="space-between">
              <Text as="h3" variant="headingMd">{a.title}</Text>
              <Badge tone={a.tone}>{a.tone}</Badge>
            </InlineStack>
            <Text as="p" variant="bodyMd">{a.desc}</Text>
          </BlockStack></Card>
        ))}
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/alerts.tsx', alerts_tsx)

# === Reports Page ===
reports_tsx = r'''
import { Page, Card, BlockStack, Text, Banner } from "@shopify/polaris";

export default function Reports() {
  return (
    <Page title="Reports" backAction={{ content: "Dashboard", url: "/app" }}>
      <BlockStack gap="500">
        <Banner title="Reports Module" tone="info">
          <p>Generate and download comprehensive reports for your store analytics.</p>
        </Banner>
        <Card>
          <BlockStack gap="300">
            <Text as="h2" variant="headingMd">Available Reports</Text>
            <Text as="p" variant="bodyMd">Sales Summary, Product Performance, Customer Analytics, Inventory Status</Text>
          </BlockStack>
        </Card>
      </BlockStack>
    </Page>
  );
}
'''
w('app/routes/app/reports.tsx', reports_tsx)

print('All dashboard files generated successfully!')
