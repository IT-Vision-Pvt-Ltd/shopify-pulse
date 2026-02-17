import re

# Read the current file
with open('app/routes/app/_index.tsx', 'r') as f:
    content = f.read()

# Step 1: Add chart component imports after the Polaris imports
import_section = '''import { Page, Layout, Card, BlockStack, InlineStack, Text, Box, Badge, Icon, Divider, Grid, Button, Banner } from "@shopify/polaris";
import { ChartVerticalIcon, OrderIcon, ProductIcon, PersonIcon, AlertCircleIcon, TrendingUpIcon } from "@shopify/polaris-icons";
import RevenueByHourChart from "../../components/dashboard/RevenueByHourChart";
import WeeklyScorecard from "../../components/dashboard/WeeklyScorecard";
import YoYRevenueChart from "../../components/dashboard/YoYRevenueChart";
import AlertsFeed from "../../components/dashboard/AlertsFeed";
import RevenueGoalChart from "../../components/dashboard/RevenueGoalChart";
import { authenticate } from "../../shopify.server";'''

old_import = r'import { Page, Layout, Card, BlockStack, InlineStack, Text, Box, Badge, Icon, Divider, Grid, Button, Banner } from "@shopify/polaris";\nimport { ChartVerticalIcon, OrderIcon, ProductIcon, PersonIcon, AlertCircleIcon, TrendingUpIcon } from "@shopify/polaris-icons";\nimport { authenticate } from "../../shopify.server";'

content = content.replace(old_import, import_section)

# Step 2: Find the Dashboard function and add sample chart data
loader_data_line = 'const { shop, analytics, recentOrders, topProducts, recentCustomers } = useLoaderData<typeof loader>();'

chart_data = '''const { shop, analytics, recentOrders, topProducts, recentCustomers } = useLoaderData<typeof loader>();

  // Sample chart data for visualizations
  const hourlyData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    today: Math.floor(Math.random() * 1000) + 500,
    yesterday: Math.floor(Math.random() * 1000) + 400,
  }));

  const weeklyData = [
    { day: 'Mon', revenue: 12500, orders: 85, score: 78 },
    { day: 'Tue', revenue: 15200, orders: 92, score: 82 },
    { day: 'Wed', revenue: 14800, orders: 88, score: 80 },
    { day: 'Thu', revenue: 16500, orders: 95, score: 85 },
    { day: 'Fri', revenue: 18900, orders: 105, score: 88 },
    { day: 'Sat', revenue: 22100, orders: 120, score: 92 },
    { day: 'Sun', revenue: 19800, orders: 110, score: 87 },
  ];

  const alerts = [
    { id: 1, type: 'warning', message: 'Inventory low on 3 products', time: '2 hours ago' },
    { id: 2, type: 'success', message: 'Sales target achieved for today', time: '5 hours ago' },
    { id: 3, type: 'info', message: 'New customer segment identified', time: '1 day ago' },
  ];

  const revenueGoal = { current: analytics.totalRevenue, goal: 100000 };'''

if loader_data_line in content:
    content = content.replace(loader_data_line, chart_data)
    print('✓ Added chart data variables')
else:
    print('✗ Could not find loader data line')

# Write the updated content
with open('app/routes/app/_index.tsx', 'w') as f:
    f.write(content)

print('✓ File updated with chart imports and data')
