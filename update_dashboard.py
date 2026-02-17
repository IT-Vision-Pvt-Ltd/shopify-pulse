import re

# Read the current dashboard file
with open('app/routes/app._index.tsx', 'r') as f:
    content = f.read()

# Find where to insert the component imports (after the last import)
last_import_pos = content.rfind('import { authenticate')
next_line = content.find('\n', last_import_pos)

# New component imports
component_imports = '''import { RevenueByHourChart } from '../../components/dashboard/RevenueByHourChart';
import { WeeklyScorecard } from '../../components/dashboard/WeeklyScorecard';
import { YoYRevenueChart } from '../../components/dashboard/YoYRevenueChart';
import { AlertsFeed } from '../../components/dashboard/AlertsFeed';
import { RevenueGoalChart } from '../../components/dashboard/RevenueGoalChart';
'''

# Insert the imports
content = content[:next_line+1] + component_imports + content[next_line+1:]

# Add mock data in the loader function for the new components
mock_data_code = '''
  // Weekly data (mock for now - would use real historical data)
  const weeklyData = [
    { week: "W1", revenue: 12000, orders: 45, convRate: 3.2 },
    { week: "W2", revenue: 15000, orders: 52, convRate: 3.8 },
    { week: "W3", revenue: 11000, orders: 38, convRate: 2.9 },
    { week: "W4", revenue: 18000, orders: 61, convRate: 4.1 },
    { week: "W5", revenue: 14000, orders: 48, convRate: 3.5 },
    { week: "W6", revenue: 16500, orders: 55, convRate: 3.7 },
    { week: "W7", revenue: 13000, orders: 44, convRate: 3.1 },
    { week: "W8", revenue: 19000, orders: 65, convRate: 4.3 },
    { week: "W9", revenue: 17500, orders: 58, convRate: 4.0 },
    { week: "W10", revenue: 21000, orders: 72, convRate: 4.5 },
    { week: "W11", revenue: 16000, orders: 53, convRate: 3.6 },
    { week: "W12", revenue: 22000, orders: 75, convRate: 4.8 },
  ];

  // Monthly YoY data
  const monthlyYoYData = [
    { month: "Jan", 2024: 38000, 2025: 42000, 2026: 48000 },
    { month: "Feb", 2024: 35000, 2025: 45000, 2026: 52000 },
    { month: "Mar", 2024: 42000, 2025: 48000, 2026: 0 },
    { month: "Apr", 2024: 45000, 2025: 52000, 2026: 0 },
    { month: "May", 2024: 48000, 2025: 55000, 2026: 0 },
    { month: "Jun", 2024: 52000, 2025: 58000, 2026: 0 },
    { month: "Jul", 2024: 55000, 2025: 62000, 2026: 0 },
    { month: "Aug", 2024: 58000, 2025: 65000, 2026: 0 },
    { month: "Sep", 2024: 62000, 2025: 68000, 2026: 0 },
    { month: "Oct", 2024: 65000, 2025: 72000, 2026: 0 },
    { month: "Nov", 2024: 72000, 2025: 78000, 2026: 0 },
    { month: "Dec", 2024: 85000, 2025: 92000, 2026: 0 },
  ];

  // Alerts data
  const alerts = [
    {
      type: "warning",
      message: "Revenue dropped 34% vs same time yesterday. Conversion rate is down significantly.",
      time: "15 min ago",
    },
    {
      type: "alert",
      message: "SKU-4421 stockout in 5 days. Current stock: 12 units. Reorder recommended.",
      time: "1 hour ago",
    },
    {
      type: "success",
      message: "Conversion rate up 18% this week. Best day: Tuesday (4.2% CR).",
      time: "2 hours ago",
    },
    {
      type: "warning",
      message: "Cart abandonment spike 78% abandonment rate in last 4 hours.",
      time: "3 hours ago",
    },
  ];

  const dailyGoal = 5000;
'''

# Write the modified content
with open('app/routes/app._index.tsx', 'w') as f:
    f.write(content)

print("Dashboard updated successfully!")
