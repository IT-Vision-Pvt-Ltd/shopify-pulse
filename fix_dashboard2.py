f = 'app/routes/app._index.tsx'
lines = open(f).readlines()

# Find key line numbers
rev_hour_line = None
grid_close_line = None
for i, line in enumerate(lines):
    if 'Revenue by Hour' in line and 'headingMd' in line:
        rev_hour_line = i
    if '</Grid>' in line and grid_close_line is None:
        grid_close_line = i

print(f"Revenue by Hour at line {rev_hour_line+1 if rev_hour_line else 'NOT FOUND'}")
print(f"</Grid> at line {grid_close_line+1 if grid_close_line else 'NOT FOUND'}")

# 1. Replace Revenue by Hour placeholder with component
# Find the Layout.Section that contains "Revenue by Hour"
if rev_hour_line is not None:
    # Go back to find <Layout.Section
    start = rev_hour_line
    while start > 0 and '<Layout.Section' not in lines[start]:
        start -= 1
    # Go forward to find </Layout.Section>
    end = rev_hour_line
    while end < len(lines) and '</Layout.Section>' not in lines[end]:
        end += 1
    print(f"Revenue by Hour Layout.Section: lines {start+1} to {end+1}")
    # Replace this section with RevenueByHourChart
    new_section = '          <Layout.Section variant="twoThirds">\n            <Card>\n              <RevenueByHourChart />\n            </Card>\n          </Layout.Section>\n'
    lines[start:end+1] = [new_section]
    # Recalculate grid_close_line since we changed line count
    grid_close_line = None
    for i, line in enumerate(lines):
        if '</Grid>' in line and grid_close_line is None:
            grid_close_line = i

# 2. Add missing charts to Grid before </Grid>
if grid_close_line is not None:
    indent = '            '
    new_cells = f'''{indent}{{/* Revenue by Channel */}}
{indent}<Grid.Cell columnSpan={{{{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}}}>
{indent}  <RevenueByChannelChart />
{indent}</Grid.Cell>
{indent}{{/* Traffic Sources */}}
{indent}<Grid.Cell columnSpan={{{{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}}}>
{indent}  <TrafficSourcesChart />
{indent}</Grid.Cell>
{indent}{{/* Monthly Revenue YoY */}}
{indent}<Grid.Cell columnSpan={{{{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}}}>
{indent}  <YoYRevenueChart />
{indent}</Grid.Cell>
{indent}{{/* Alerts & Anomalies */}}
{indent}<Grid.Cell columnSpan={{{{xs: 6, sm: 6, md: 6, lg: 6, xl: 6}}}}>
{indent}  <AlertsFeed />
{indent}</Grid.Cell>
{indent}{{/* Weekly Performance Scorecard */}}
{indent}<Grid.Cell columnSpan={{{{xs: 12, sm: 12, md: 12, lg: 12, xl: 12}}}}>
{indent}  <WeeklyScorecardChart />
{indent}</Grid.Cell>
'''
    lines.insert(grid_close_line, new_cells)
    print("Added 5 missing chart components to Grid")

open(f, 'w').write(''.join(lines))
print("Done! File saved.")
