import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../../../shopify.server";
import { Page, Layout, Card, Text } from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  return json({
    shopName: "Your Store",
    message: "Welcome to GrowthPilot AI Dashboard"
  });
};

export default function DashboardIndex() {
  const { shopName, message } = useLoaderData<typeof loader>();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <Card>
            <div style={{ padding: '20px' }}>
              <Text as="h2" variant="headingMd">
                {message}
              </Text>
              <div style={{ marginTop: '16px' }}>
                <Text as="p" variant="bodyMd">
                  Shop: {shopName}
                </Text>
                <Text as="p" variant="bodyMd" tone="subdued">
                  Your analytics dashboard is loading...
                </Text>
              </div>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <div style={{ padding: '16px' }}>
              <Text as="h3" variant="headingSm">
                Total Revenue
              </Text>
              <Text as="p" variant="bodyMd">
                $0.00
              </Text>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <div style={{ padding: '16px' }}>
              <Text as="h3" variant="headingSm">
                Orders
              </Text>
              <Text as="p" variant="bodyMd">
                0
              </Text>
            </div>
          </Card>
        </Layout.Section>

        <Layout.Section variant="oneThird">
          <Card>
            <div style={{ padding: '16px' }}>
              <Text as="h3" variant="headingSm">
                Average Order Value
              </Text>
              <Text as="p" variant="bodyMd">
                $0.00
              </Text>
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
