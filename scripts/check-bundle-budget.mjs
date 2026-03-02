import { gzipSync } from "node:zlib";
import { readFile } from "node:fs/promises";
import process from "node:process";

const bundleFile = "dist/kritibot-widget.js";
const maxRawBytes = Number(process.env.KRITIBOT_MAX_RAW_BYTES || 275 * 1024);
const maxGzipBytes = Number(process.env.KRITIBOT_MAX_GZIP_BYTES || 85 * 1024);

const bundle = await readFile(bundleFile);
const rawBytes = bundle.byteLength;
const gzipBytes = gzipSync(bundle).byteLength;

console.log(
  `Bundle size check: raw=${(rawBytes / 1024).toFixed(2)} kB, gzip=${(
    gzipBytes / 1024
  ).toFixed(2)} kB`
);

if (rawBytes > maxRawBytes || gzipBytes > maxGzipBytes) {
  console.error(
    `Bundle budget failed for ${bundleFile}. Limits: raw<=${(
      maxRawBytes / 1024
    ).toFixed(2)} kB, gzip<=${(maxGzipBytes / 1024).toFixed(2)} kB`
  );
  process.exit(1);
}
