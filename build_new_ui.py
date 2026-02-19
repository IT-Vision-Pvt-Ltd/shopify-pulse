import os

# Read existing file to extract the loader section
with open('app/routes/app._index.tsx', 'r') as f:
    existing = f.read()

# Extract everything from "export const loader" to the return json({ line
# We'll keep the loader intact
loader_start = existing.find('// Loader')
if loader_start == -1:
    loader_start = existing.find('export const loader')

loader_end = existing.find('};', existing.find('return json({'))
if loader_end != -1:
    loader_end += 2

loader_section = existing[loader_start:loader_end] if loader_start != -1 and loader_end != -1 else ''

print(f"Loader section found: {len(loader_section)} chars")
print(f"Starts with: {loader_section[:80]}")

