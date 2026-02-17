import { json, type LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError, useLocation, useSearchParams } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { authenticate } from "../shopify.server";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";
import { Frame, Navigation, TopBar } from "@shopify/polaris";
import { useState, useCallback, useMemo } from "react";
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
  const [searchParams] = useSearchParams();
  const [mobileNavigationActive, setMobileNavigationActive] = useState(false);

  const toggleMobileNavigationActive = useCallback(
    () => setMobileNavigationActive((active) => !active),
    [],
  );

  const qs = useMemo(() => {
    const params = new URLSearchParams();
    if (searchParams.get("shop")) params.set("shop", searchParams.get("shop")!);
    if (searchParams.get("host")) params.set("host", searchParams.get("host")!);
    const str = params.toString();
    return str ? `?${str}` : "";
  }, [searchParams]);

  const navigationMarkup = (
    <Navigation location={location.pathname}>
      <Navigation.Section
        title="Dashboard"
        items={[
          {
            url: `/app${qs}`,
            label: "Overview",
            icon: HomeIcon,
            matchPaths: ["/app"],
          },
          {
            url: `/app/analytics${qs}`,
            label: "Analytics",
            icon: ChartVerticalFilledIcon,
          },
          {
            url: `/app/orders${qs}`,
            label: "Orders",
            icon: OrderIcon,
          },
          {
            url: `/app/products${qs}`,
            label: "Products",
            icon: ProductIcon,
          },
          {
            url: `/app/customers${qs}`,
            label: "Customers",
            icon: PersonIcon,
          },
        ]}
      />
      <Navigation.Section
        title="Intelligence"
        items={[
          {
            url: `/app/ai-insights${qs}`,
            label: "AI Insights",
            icon: WandIcon,
          },
          {
            url: `/app/alerts${qs}`,
            label: "Alerts",
            icon: AlertCircleIcon,
          },
          {
            url: `/app/reports${qs}`,
            label: "Reports",
            icon: FileIcon,
          },
        ]}
      />
      <Navigation.Section
        title="Settings"
        items={[
          {
            url: `/app/billing${qs}`,
            label: "Billing",
            icon: BillIcon,
          },
          {
            url: `/app/settings${qs}`,
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

export function ErrorBoundary() {
  return boundary.error(useRouteError());
}
