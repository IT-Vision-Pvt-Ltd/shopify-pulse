import os

# Fix AlertsFeed - add default empty alerts array
f = 'app/components/dashboard/AlertsFeed.tsx'
c = open(f).read()
c = c.replace(
    'export function AlertsFeed({ alerts }: AlertsFeedProps)',
    'export function AlertsFeed({ alerts = [] }: AlertsFeedProps)'
)
open(f, 'w').write(c)
print(f"Fixed {f}")

# Fix RevenueByHourChart - add default empty data
f = 'app/components/dashboard/RevenueByHourChart.tsx'
c = open(f).read()
c = c.replace(
    '{ data, currency }: RevenueByHourChartProps)',
    '{ data = [], currency = "USD" }: RevenueByHourChartProps)'
)
open(f, 'w').write(c)
print(f"Fixed {f}")

# Fix RevenueByChannelChart - add default empty data
f = 'app/components/dashboard/RevenueByChannelChart.tsx'
c = open(f).read()
c = c.replace(
    '{ data, currency }: RevenueByChannelChartProps)',
    '{ data = [], currency = "USD" }: RevenueByChannelChartProps)'
)
open(f, 'w').write(c)
print(f"Fixed {f}")

# Fix YoYRevenueChart - add default empty data
f = 'app/components/dashboard/YoYRevenueChart.tsx'
c = open(f).read()
c = c.replace(
    '{ data, currency }: YoYRevenueChartProps)',
    '{ data = [], currency = "USD" }: YoYRevenueChartProps)'
)
open(f, 'w').write(c)
print(f"Fixed {f}")

# Fix WeeklyScorecard - add default empty data
f = 'app/components/dashboard/WeeklyScorecard.tsx'
c = open(f).read()
c = c.replace(
    '{ data, currency }: WeeklyScorecardProps)',
    '{ data = [], currency = "USD" }: WeeklyScorecardProps)'
)
open(f, 'w').write(c)
print(f"Fixed {f}")

# Fix RevenueGoalChart - add default values
f = 'app/components/dashboard/RevenueGoalChart.tsx'
c = open(f).read()
c = c.replace(
    '{ currentRevenue, dailyGoal, currency }: RevenueGoalChartProps)',
    '{ currentRevenue = 0, dailyGoal = 1000, currency = "USD" }: RevenueGoalChartProps)'
)
open(f, 'w').write(c)
print(f"Fixed {f}")

print("All components fixed with default props!")
