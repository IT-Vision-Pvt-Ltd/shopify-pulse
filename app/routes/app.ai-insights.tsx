
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Badge, Banner, Divider, Button } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

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
