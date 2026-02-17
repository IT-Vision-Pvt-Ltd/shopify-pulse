
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
