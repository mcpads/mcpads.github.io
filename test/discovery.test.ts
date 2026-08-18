import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const siteUrl = "https://mcpads.dev/";

interface SitePage {
  file: string;
  url: string;
  label: string;
}

const sitePages: SitePage[] = [
  { file: "index.html", url: siteUrl, label: "home" },
  {
    file: "notes/work-evolution/index.html",
    url: "https://mcpads.dev/notes/work-evolution/",
    label: "work-evolution note",
  },
];

function readMetaContent(page: string, attribute: string, name: string): string | undefined {
  const tag = page.match(
    new RegExp(`<meta\\b(?=[^>]*\\b${attribute}="${name}")[^>]*>`, "i"),
  )?.[0];
  return tag?.match(/\bcontent="([^"]+)"/i)?.[1];
}

function readCanonical(page: string): string | undefined {
  const tag = page.match(/<link\b(?=[^>]*\brel="canonical")[^>]*>/i)?.[0];
  return tag?.match(/\bhref="([^"]+)"/i)?.[1];
}

function readStructuredData(page: string): unknown {
  const source = page.match(
    /<script type="application\/ld\+json">\s*([\s\S]*?)\s*<\/script>/i,
  )?.[1];
  assert.ok(source, "structured data must be present");
  return JSON.parse(source);
}

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

for (const { file, url, label } of sitePages) {
  test(`the ${label} page is indexable and declares where it lives`, async () => {
    const page = await readFile(file, "utf8");
    const robotsMeta = readMetaContent(page, "name", "robots") ?? "";

    assert.match(robotsMeta, /\bindex\b/i);
    assert.match(robotsMeta, /\bfollow\b/i);
    assert.doesNotMatch(robotsMeta, /\bnoindex\b/i);
    assert.equal(readCanonical(page), url);
    assert.equal(readMetaContent(page, "property", "og:url"), url);
    assert.doesNotThrow(() => readStructuredData(page));
  });

  test(`the ${label} page is listed in the sitemap`, async () => {
    const sitemap = await readFile("public/sitemap.xml", "utf8");
    assert.ok(
      sitemap.includes(`<loc>${url}</loc>`),
      `sitemap must list ${url}`,
    );
  });
}

test("the home page declares the public identity behind the site", async () => {
  const page = await readFile("index.html", "utf8");
  const structuredData = readStructuredData(page) as {
    "@type": string;
    url: string;
    mainEntity: { name: string; sameAs: string[] };
  };

  assert.equal(structuredData["@type"], "ProfilePage");
  assert.equal(structuredData.url, siteUrl);
  assert.equal(structuredData.mainEntity.name, "mcpads");
  assert.deepEqual(structuredData.mainEntity.sameAs, ["https://github.com/mcpads"]);
});

test("the sitemap has no fragment-only routes", async () => {
  const sitemap = await readFile("public/sitemap.xml", "utf8");

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
