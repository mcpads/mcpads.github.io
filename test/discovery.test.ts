import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const siteUrl = "https://mcpads.dev/";

test("search engines and AI crawlers are explicitly allowed", async () => {
  const robots = await readFile("public/robots.txt", "utf8");
  const contentSignal = robots.match(/^Content-Signal:\s*(.+)$/im)?.[1];
  const contentSignals = Object.fromEntries(
    (contentSignal ?? "").split(",").map((signal) => {
      const [name, value] = signal.trim().split("=");
      return [name, value];
    }),
  );

  assert.match(robots, /^User-agent:\s*\*$/im);
  assert.match(robots, /^Allow:\s*\/$/im);
  assert.doesNotMatch(robots, /^Disallow:/im);
  assert.deepEqual(contentSignals, {
    search: "yes",
    "ai-input": "yes",
    "ai-train": "yes",
    use: "full",
  });
  assert.match(robots, /^Sitemap:\s*https:\/\/mcpads\.dev\/sitemap\.xml$/im);
});

test("the canonical page is indexable and describes its public identity", async () => {
  const page = await readFile("index.html", "utf8");
  const robotsTag = page.match(/<meta\b(?=[^>]*\bname="robots")[^>]*>/i)?.[0];
  const robotsMeta = robotsTag?.match(/\bcontent="([^"]+)"/i)?.[1];
  const structuredDataSource = page.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i,
  )?.[1];

  assert.match(robotsMeta ?? "", /\bindex\b/i);
  assert.match(robotsMeta ?? "", /\bfollow\b/i);
  assert.doesNotMatch(robotsMeta ?? "", /\bnoindex\b/i);
  assert.match(
    page,
    /<link\b(?=[^>]*\brel="canonical")(?=[^>]*\bhref="https:\/\/mcpads\.dev\/")[^>]*>/i,
  );
  assert.ok(structuredDataSource, "structured profile data must be present");

  const structuredData = JSON.parse(structuredDataSource);
  assert.equal(structuredData["@type"], "ProfilePage");
  assert.equal(structuredData.url, siteUrl);
  assert.equal(structuredData.mainEntity.name, "mcpads");
  assert.deepEqual(structuredData.mainEntity.sameAs, ["https://github.com/mcpads"]);
});

test("the sitemap exposes the canonical page without fragment-only routes", async () => {
  const sitemap = await readFile("public/sitemap.xml", "utf8");

  assert.match(sitemap, /<loc>https:\/\/mcpads\.dev\/<\/loc>/);
  assert.doesNotMatch(sitemap, /<loc>[^<]*#/);
});

test("the social preview image matches its declared Open Graph dimensions", async () => {
  const page = await readFile("index.html", "utf8");
  const image = await readFile("public/og.png");

  assert.deepEqual(image.subarray(1, 4), Buffer.from("PNG"));
  assert.equal(image.readUInt32BE(16), 1_200);
  assert.equal(image.readUInt32BE(20), 630);
  assert.match(page, /property="og:image" content="https:\/\/mcpads\.dev\/og\.png"/i);
  assert.match(page, /property="og:image:width" content="1200"/i);
  assert.match(page, /property="og:image:height" content="630"/i);
});
