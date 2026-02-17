
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
