
const fs = require("fs");
const out = "app/routes/app.sales.tsx";
let c = "";
c += `import { useState, useEffect, Suspense, lazy } from "react";\n`;
c += `import { json } from "@remix-run/node";\n`;
c += `import type { LoaderFunctionArgs } from "@remix-run/node";\n`;
c += `import { useLoaderData } from "@remix-run/react";\n`;
c += `import { authenticate } from "../shopify.server";\n\n`;
fs.writeFileSync(out, c);
console.log("ok");
