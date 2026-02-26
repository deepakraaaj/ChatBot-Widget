import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import process from "node:process";

const bundleFile = "dist/kritibot-widget.js";
const sriFile = "dist/kritibot-widget.sri.json";
const version = process.env.npm_package_version || "0.0.0";

const bundle = await readFile(bundleFile);
const integrity = `sha384-${createHash("sha384").update(bundle).digest("base64")}`;

const sriManifest = {
  version,
  file: bundleFile,
  integrity,
};

await writeFile(sriFile, `${JSON.stringify(sriManifest, null, 2)}\n`, "utf8");

console.log(`Wrote ${sriFile}`);
console.log(`integrity=${integrity}`);
