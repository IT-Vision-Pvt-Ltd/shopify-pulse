import re

# Read the file
with open('app/routes/app._index.tsx', 'r') as f:
    content = f.read()

# 1. Replace the static import of react-apexcharts with a dynamic client-only approach
old_import = 'import Chart from "react-apexcharts";'
new_import = '''// Dynamic import for react-apexcharts (SSR-safe: avoids "window is not defined")
import { lazy, Suspense } from "react";

const Chart = typeof window !== "undefined" 
  ? lazy(() => import("react-apexcharts"))
  : () => null;

function ClientChart(props: any) {
  const [isClient, setIsClient] = useState(false);
  useEffect(() => { setIsClient(true); }, []);
  if (!isClient) return <div style={{ height: props.height || 230 }} />;
  return (
    <Suspense fallback={<div style={{ height: props.height || 230 }} />}>
      <Chart {...props} />
    </Suspense>
  );
}'''

content = content.replace(old_import, new_import)

# 2. Also need to make sure useState and useEffect are not duplicated in the import
# Since the file already imports { useState, useEffect, useMemo } from "react"
# and we added lazy, Suspense from "react" separately, let's merge them

# Remove the separate lazy/Suspense import we just added and merge into existing react import
content = content.replace(
    'import { useState, useEffect, useMemo } from "react";',
    'import { useState, useEffect, useMemo, lazy, Suspense } from "react";'
)
content = content.replace(
    'import { lazy, Suspense } from "react";\n\n',
    ''
)

# 3. Replace all <Chart with <ClientChart
content = content.replace('<Chart\n', '<ClientChart\n')
content = content.replace('<Chart ', '<ClientChart ')

with open('app/routes/app._index.tsx', 'w') as f:
    f.write(content)

print('Done! Fixed SSR issue with react-apexcharts')
print('Changes made:')
print('1. Replaced static import with lazy/dynamic import')
print('2. Added ClientChart wrapper component')
print('3. Replaced all <Chart> usages with <ClientChart>')
