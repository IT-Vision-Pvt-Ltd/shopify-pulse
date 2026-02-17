import re

with open('app/routes/app/_index.tsx', 'r') as f:
    content = f.read()

# Find and replace the Revenue by Hour placeholder section
revenue_hour_old = r'''<Layout\.Section variant="twoThirds">\s*<Card>\s*<BlockStack gap="400">\s*<Text as="h3" variant="headingMd">\s*Revenue by Hour\s*</Text>\s*<Box[^>]*>[\s\S]*?</Box>\s*</BlockStack>\s*</Card>\s*</Layout\.Section>'''

revenue_hour_new = '''<Layout.Section variant="twoThirds">
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Revenue by Hour</Text>
                  <RevenueByHourChart data={hourlyData} currency={analytics.currency} />
                </BlockStack>
              </Card>
            </Layout.Section>'''

content = re.sub(revenue_hour_old, revenue_hour_new, content, flags=re.MULTILINE | re.DOTALL)
print('✓ Replaced Revenue by Hour chart')

# Find and replace the Store Health Score placeholder section
store_health_old = r'''<Layout\.Section variant="oneThird">\s*<Card>\s*<BlockStack gap="400">\s*<Text as="h3" variant="headingMd">\s*Store Health Score\s*</Text>\s*<Box[^>]*>[\s\S]*?</Box>\s*</BlockStack>\s*</Card>\s*</Layout\.Section>'''

store_health_new = '''<Layout.Section variant="oneThird">
              <Card>
                <BlockStack gap="400">
                  <Text as="h3" variant="headingMd">Store Health Score</Text>
                  <WeeklyScorecard data={weeklyData} />
                  <Box paddingBlockStart="400">
                    <AlertsFeed alerts={alerts} />
                  </Box>
                </BlockStack>
              </Card>
            </Layout.Section>'''

content = re.sub(store_health_old, store_health_new, content, flags=re.MULTILINE | re.DOTALL)
print('✓ Replaced Store Health Score with WeeklyScorecard and AlertsFeed')

with open('app/routes/app/_index.tsx', 'w') as f:
    f.write(content)

print('✓ Chart components integrated successfully')
