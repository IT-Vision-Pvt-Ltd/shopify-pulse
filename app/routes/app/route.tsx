import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useLocation } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../../shopify.server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { Frame, Navigation, TopBar } from "@shopify/polaris";
import { useState, useCallback } from "react";
import {
  HomeIcon,
  OrderIcon,
  ProductIcon,
  PersonIcon,
  ChartVerticalFilledIcon,
  SettingsIcon,
  BillIcon,
  AlertCircleIcon,
  FileIcon,
  WandIcon,
} from "@shopify/polaris-icons";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return json({ apiKey: process.env.SHOPIFY_API_KEY || "" });
};

export default function App() {
  const { apiKey } = useLoaderData<typeof loader>();
  const location = useLocation();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((active) => !active),
    [],
  );

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        title="Dashboard"
        items={[
          {
            url: "/app",
            label: "Overview",
            icon: HomeIcon,
            matchPaths: ["/app"],
          },
          {
            url: "/app/analytics",
            label: "Analytics",
            icon: ChartVerticalFilledIcon,
          },
          {
            url: "/app/orders",
            label: "Orders",
            icon: OrderIcon,
          },
          {
            url: "/app/products",
            label: "Products",
            icon: ProductIcon,
          },
          {
            url: "/app/customers",
            label: "Customers",
            icon: PersonIcon,
          },
        ]}
      />
      <Navigation.Section
        title="Intelligence"
        items={[
          {
            url: "/app/ai-insights",
            label: "AI Insights",
            icon: WandIcon,
          },
          {
            url: "/app/alerts",
            label: "Alerts",
            icon: AlertCircleIcon,
          },
          {
            url: "/app/reports",
            label: "Reports",
            icon: FileIcon,
          },
        ]}
      />
      <Navigation.Section
        title="Settings"
        items={[
          {
            url: "/app/billing",
            label: "Billing",
            icon: BillIcon,
          },
          {
            url: "/app/settings",
            label: "Settings",
            icon: SettingsIcon,
          },
        ]}
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

// Shopify embedded app best practice: Error boundaries
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
