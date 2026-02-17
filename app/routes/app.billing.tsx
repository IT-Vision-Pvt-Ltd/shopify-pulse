
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, BlockStack, InlineStack, Text, Button, Banner, Divider, Badge } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

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
