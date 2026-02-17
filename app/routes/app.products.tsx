
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Badge, DataTable, TextField, ProgressBar } from "@shopify/polaris";
import { authenticate } from "../shopify.server";
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
