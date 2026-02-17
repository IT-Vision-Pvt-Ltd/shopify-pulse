import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { Page, Card, Layout, Text, BlockStack } from "@shopify/polaris";
import { authenticate } from "../shopify.server";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);

  return json({
    shop: session.shop,
  });
};

export default function AppIndex() {
  const { shop } = useLoaderData<typeof loader>();

  return (
    <Page title="GrowthPilot AI Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <BlockStack gap="400">
              <Text as="h2" variant="headingMd">
                Welcome to GrowthPilot AI
              </Text>
              <Text as="p" variant="bodyMd">
                Connected to shop: {shop}
              </Text>
              <Text as="p" variant="bodyMd">
                Your analytics dashboard is loading...
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
