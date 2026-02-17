import { json } from '@remix-run/node';
import type { LoaderFunctionArgs } from '@remix-run/node';
import { useLoaderData } from '@remix-run/react';
import { authenticate } from '../../shopify.server';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const response = await admin.graphql('query { shop { name } }');
  const data = await response.json();
  return json({ shopName: data.data.shop.name });
};

export default function Dashboard() {
  const { shopName } = useLoaderData<typeof loader>();
  return (
    <div style={{ padding: '20px' }}>
      <h1>GrowthPilot AI Dashboard</h1>
      <p>Welcome to {shopName}</p>
      <p>Your analytics dashboard is loading...</p>
    </div>
  );
}
