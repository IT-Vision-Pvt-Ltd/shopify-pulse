import { useState, useCallback } from "react";
import { Outlet, useLoaderData, useLocation, useSearchParams } from "@remix-run/react";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { json } from "@remix-run/node";
import {
  AppProvider,
  Frame,
  Navigation,
  TopBar,
  Icon,
  Text,
} from "@shopify/polaris";
import {
  HomeIcon,
  ChartVerticalIcon,
  ProductIcon,
  PersonIcon,
  CartIcon,
  TargetIcon,
  MagicIcon,
  SettingsIcon,
  OrderIcon,
  InventoryIcon,
} from "@shopify/polaris-icons";
import { authenticate } from "../shopify.server";
import polarisTranslations from "@shopify/polaris/locales/en.json";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  const apiKey = process.env.SHOPIFY_API_KEY || "";
  return json({ apiKey });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((active: boolean) => !active),
    []
  );

  // Preserve shop/host query params for navigation
  const qs = searchParams.toString() ? "?" + searchParams.toString() : "";
  const currentPath = location.pathname;

  // Navigation items based on design document
  const navigationMarkup = (
    <Navigation location={currentPath}>
      <Navigation.Section
        title="Dashboard"
        items={[
          {
            url: "/app" + qs,
            label: "Executive Command Center",
            icon: HomeIcon,
            exactMatch: true,
          },
        ]}
      />
      <Navigation.Section
        title="Analytics"
        items={[
          { url: "/app/sales" + qs, label: "Sales & Revenue", icon: ChartVerticalIcon },
          { url: "/app/products" + qs, label: "Product Intelligence", icon: ProductIcon },
          { url: "/app/customers" + qs, label: "Customer Intelligence", icon: PersonIcon },
          { url: "/app/orders" + qs, label: "Orders", icon: OrderIcon },
        ]}
      />
      <Navigation.Section
        title="Operations"
        items={[
          { url: "/app/conversion" + qs, label: "Conversion Funnel", icon: CartIcon },
          { url: "/app/marketing" + qs, label: "Marketing Attribution", icon: TargetIcon },
          { url: "/app/inventory" + qs, label: "Inventory", icon: InventoryIcon },
        ]}
      />
      <Navigation.Section
        title="Intelligence"
        items={[
          { url: "/app/ai-insights" + qs, label: "AI Insights Hub", icon: MagicIcon, badge: "NEW" },
        ]}
      />
      <Navigation.Section
        title="Settings"
        items={[
          { url: "/app/settings" + qs, label: "Settings", icon: SettingsIcon },
        ]}
        separator
      />
    </Navigation>
  );

  // Top bar with logo
  const topBarMarkup = (
    <TopBar
      showNavigationToggle
      onNavigationToggle={toggleMobileNavigationActive}
    />
  );

  // Logo for the Frame
  const logo = {
    topBarSource: "",
    width: 124,
    url: "/app" + qs,
    accessibilityLabel: "GrowthPilot AI",
  };

  return (
    <AppProvider i18n={polarisTranslations} isEmbeddedApp={false} apiKey={apiKey}>
      <Frame
        logo={logo}
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
    <div style={{ padding: "20px", fontFamily: "Inter, sans-serif" }}>
      <h1 style={{ color: "#EF4444" }}>Error</h1>
      <p>Something went wrong. Please try again.</p>
    </div>
  );
}
