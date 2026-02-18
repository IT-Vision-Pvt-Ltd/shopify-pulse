import re

f = 'app/routes/app._index.tsx'
c = open(f).read()

# 1. Add missing imports for RevenueByChannelChart and TrafficSourcesChart
old_import = "import { SalesHeatmap } from \"../components/dashboard/SalesHeatmap\";"
new_import = old_import + "\nimport { RevenueByChannelChart } from \"../components/dashboard/RevenueByChannelChart\";\nimport { TrafficSourcesChart } from \"../components/dashboard/TrafficSourcesChart\";"
c = c.replace(old_import, new_import)

# 2. Find the Revenue by Hour section and replace with the component
# The current Revenue by Hour is just a Card with title "Revenue by Hour" and inner Text "85" "out of 100"
# We need to find the InlineGrid section that has "Revenue by Hour" and "Store Health Score"
old_rev_section = '''<Card>
              <Text as="h3" variant="headingMd">Revenue by Hour</Text>
            </Card>'''
new_rev_section = '''<Card>
              <RevenueByHourChart />
            </Card>'''
if old_rev_section in c:
    c = c.replace(old_rev_section, new_rev_section)
    print("Fixed Revenue by Hour section")
else:
    print("Could not find Revenue by Hour section, trying alternative...")
    # Try to find it with different spacing
    idx = c.find('Revenue by Hour')
    if idx != -1:
        print(f"Found 'Revenue by Hour' at position {idx}")
        # Show context
        print("Context:", repr(c[idx-100:idx+100]))

# 3. Add missing chart components to the Grid section
# Current Grid has ConversionFunnelChart, StoreHealthScore, SalesHeatmap
# Add RevenueByChannelChart, TrafficSourcesChart, YoYRevenueChart, AlertsFeed, WeeklyScorecardChart
old_grid_end = '''<Grid.Cell columnSpan={{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}>
              <SalesHeatmap />
            </Grid.Cell>
          </Grid>'''

new_grid_end = '''<Grid.Cell columnSpan={{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}>
              <SalesHeatmap />
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <RevenueByChannelChart />
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <TrafficSourcesChart />
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <YoYRevenueChart />
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}>
              <AlertsFeed />
            </Grid.Cell>
            <Grid.Cell columnSpan={{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}>
              <WeeklyScorecardChart />
            </Grid.Cell>
          </Grid>'''

if old_grid_end in c:
    c = c.replace(old_grid_end, new_grid_end)
    print("Added missing charts to Grid")
else:
    print("Could not find Grid end section")
    # Debug
    idx = c.find('</Grid>')
    if idx != -1:
        print("Found </Grid> at:", idx)
        print("Context before:", repr(c[idx-200:idx+10]))

open(f, 'w').write(c)
print("Done! File updated.")
