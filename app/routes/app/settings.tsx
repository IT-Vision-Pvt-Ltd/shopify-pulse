
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
