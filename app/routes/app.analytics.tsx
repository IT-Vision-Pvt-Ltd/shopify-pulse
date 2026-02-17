
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Layout, Card, BlockStack, InlineStack, Text, Badge, Divider, DataTable, Select } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
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
