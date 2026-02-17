
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, Text, Badge, Banner, Divider, InlineStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

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
