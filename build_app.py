import os

def write_file(path, content):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w') as f:
        f.write(content)
    print(f'Written: {path}')

# ============================================================
# 1. app.tsx - Main layout with full 15-page navigation
# ============================================================
write_file('app/routes/app.tsx', r"""import { useState } from 'react';
import { json } from '@remix-run/node';
import { Outlet, useLoaderData, useLocation, useSearchParams } from '@remix-run/react';
import { AppProvider } from '@shopify/shopify-app-remix/react';
import { Frame, Navigation, TopBar } from '@shopify/polaris';
import {
  HomeIcon,
  ChartVerticalIcon,
  ProductIcon,
  PersonIcon,
  CartIcon,
  TargetIcon,
  DiscountIcon,
  ChartHistogramGrowthIcon,
  InventoryIcon,
  CashDollarIcon,
  RefreshIcon,
  ViewIcon,
  FlaskIcon,
  StarIcon,
  SettingsIcon,
} from '@shopify/polaris-icons';
import type { LoaderFunctionArgs } from '@remix-run/node';

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const apiKey = process.env.SHOPIFY_API_KEY || '';
  return json({ apiKey });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);
  const toggleMobileNavigationActive = () => setMobileNavigationActive((active: boolean) => !active);

  const qs = searchParams.toString() ? '?' + searchParams.toString() : '';
  const currentPath = location.pathname;

  const navigationMarkup = (
    <Navigation location={currentPath}>
      <Navigation.Section
        title="Dashboard"
        items={[
          { url: '/app' + qs, label: 'Dashboard', icon: HomeIcon, exactMatch: true },
          { url: '/app/sales' + qs, label: 'Sales & Revenue', icon: ChartVerticalIcon },
          { url: '/app/products' + qs, label: 'Products', icon: ProductIcon },
          { url: '/app/customers' + qs, label: 'Customers', icon: PersonIcon },
          { url: '/app/conversion' + qs, label: 'Conversion Funnel', icon: CartIcon },
          { url: '/app/marketing' + qs, label: 'Marketing', icon: TargetIcon },
          { url: '/app/discounts' + qs, label: 'Discounts', icon: DiscountIcon },
          { url: '/app/forecasting' + qs, label: 'Forecasting', icon: ChartHistogramGrowthIcon },
          { url: '/app/inventory' + qs, label: 'Inventory', icon: InventoryIcon },
          { url: '/app/financials' + qs, label: 'Financials', icon: CashDollarIcon },
          { url: '/app/subscriptions' + qs, label: 'Subscriptions', icon: RefreshIcon },
          { url: '/app/competitive' + qs, label: 'Competitive Intel', icon: ViewIcon },
          { url: '/app/abtesting' + qs, label: 'A/B Testing', icon: FlaskIcon },
        ]}
      />
      <Navigation.Section
        title="Intelligence"
        items={[
          { url: '/app/ai-insights' + qs, label: 'AI Insights', icon: StarIcon },
        ]}
        separator
      />
      <Navigation.Section
        title="Settings"
        items={[
          { url: '/app/settings' + qs, label: 'Settings', icon: SettingsIcon },
        ]}
        separator
      />
    </Navigation>
  );

  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
    />
  );

  return (
    <AppProvider isEmbeddedApp={false} apiKey={apiKey}>
      <Frame
        topBar={topBarMarkup}
        navigation={navigationMarkup}
        showMobileNavigation={mobileNavigationActive}
        onNavigationDismiss={toggleMobileNavigationActive}
      >
        <Outlet />
      </Frame>
    </AppProvider>
  );
}

export function ErrorBoundary() {
  return (
    <div style={{padding: '20px'}}>
      <h1>Error</h1>
      <p>Something went wrong. Please try again.</p>
    </div>
  );
}
""")

print('\napp.tsx generated successfully!')
