f = 'app/routes/app._index.tsx'
lines = open(f).readlines()
# Find Revenue by Hour line
rh = None
for i, l in enumerate(lines):
    if 'Revenue by Hour' in l:
        rh = i
        break
if rh is None:
    print("Not found!")
    exit()
# Find Layout.Section start before it
s = rh
while s > 0 and 'Layout.Section' not in lines[s]:
    s -= 1
# Find the matching </Layout.Section> after it
e = rh
while e < len(lines) and '</Layout.Section>' not in lines[e]:
    e += 1
print(f"Replacing lines {s+1}-{e+1}")
# Print what we're replacing
for i in range(s, e+1):
    print(f"  {i+1}: {lines[i].rstrip()}")
# Replace with RevenueByHourChart component
new_lines = [
    '          <Layout.Section variant="twoThirds">\n',
    '            <Card>\n',
    '              <RevenueByHourChart />\n',
    '            </Card>\n',
    '          </Layout.Section>\n',
]
lines[s:e+1] = new_lines
open(f, 'w').write(''.join(lines))
print("Done! Revenue by Hour section replaced with RevenueByHourChart component.")
