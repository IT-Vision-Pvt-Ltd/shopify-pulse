import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import { authenticate } from "../../../shopify.server";
import { Page, Layout, Card, Text } from "@shopify/polaris";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  
  const response = await admin.graphql(`
    query {
      shop {
        name
      }
      orders(first: 10) {
        edges {
          node {
            id
            name
            totalPriceSet {
              shopMoney {
                amount
              }
            }
          }
        }
      }
    }
  `);
  
  const data = await response.json();
  
  return json({
    shop: data.data.shop,
    orders: data.data.orders.edges,
  });
};

export default function DashboardIndex() {
  const { shop, orders } = useLoaderData<typeof loader>();
  
  const totalRevenue = orders.reduce((sum: number, order: any) => {
    return sum + parseFloat(order.node.totalPriceSet.shopMoney.amount);
  }, 0);
  
  return (
    <Page title="Dashboard Overview" subtitle={`Welcome to ${shop.name}`}>
      <Layout>
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Quick Stats
            </Text>
            <div style={{ marginTop: '16px' }}>
              <Text as="p" variant="bodyMd">
                Total Orders: {orders.length}
              </Text>
              <Text as="p" variant="bodyMd">
                Total Revenue: ${totalRevenue.toFixed(2)}
              </Text>
              <Text as="p" variant="bodyMd">
                Average Order Value: ${orders.length > 0 ? (totalRevenue / orders.length).toFixed(2) : '0.00'}
              </Text>
            </div>
          </Card>
        </Layout.Section>
        
        <Layout.Section>
          <Card>
            <Text as="h2" variant="headingMd">
              Recent Orders
            </Text>
            <div style={{ marginTop: '16px' }}>
              {orders.map((order: any) => (
                <div key={order.node.id} style={{ padding: '8px 0', borderBottom: '1px solid #e1e3e5' }}>
                  <Text as="p" variant="bodyMd">
                    {order.node.name} - ${parseFloat(order.node.totalPriceSet.shopMoney.amount).toFixed(2)}
                  </Text>
                </div>
              ))}
            </div>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
