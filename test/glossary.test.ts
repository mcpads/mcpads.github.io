import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const annotatedNotes = [
  "notes/what-you-type/index.html",
  "notes/work-evolution/index.html",
];

function readMarkedTerms(page: string): string[] {
  return Array.from(page.matchAll(/\bdata-term="([^"]+)"/g), (match) => match[1]);
}

function readDefinedTerms(page: string): string[] {
  return Array.from(page.matchAll(/<dd\b[^>]*\bid="glo-([^"]+)"/g), (match) => match[1]);
}

function readTriggers(page: string): [string, string][] {
  return Array.from(
    page.matchAll(/<[a-z]+\b[^>]*\bdata-term="([^"]+)"[^>]*>/g),
    (match) => [match[0], match[1]] as [string, string],
  );
}

function readQuotedPassages(page: string): string[] {
  return Array.from(page.matchAll(/<blockquote\b[\s\S]*?<\/blockquote>/g), (match) => match[0]);
}

for (const file of annotatedNotes) {
  test(`every marked term in ${file} has a definition to show`, async () => {
    const page = await readFile(file, "utf8");
    const defined = new Set(readDefinedTerms(page));
    const marked = readMarkedTerms(page);

    assert.ok(marked.length > 0, "the note must mark at least one term");
    for (const term of marked) {
      assert.ok(defined.has(term), `"${term}" is underlined but never defined`);
    }
  });

  test(`each term in ${file} is defined exactly once`, async () => {
    const page = await readFile(file, "utf8");
    const defined = readDefinedTerms(page);

    assert.deepEqual(
      defined.filter((term, index) => defined.indexOf(term) !== index),
      [],
      "a term defined twice leaves aria-describedby pointing at an ambiguous target",
    );
  });

  test(`quoted prompts in ${file} are left exactly as they were sent`, async () => {
    const page = await readFile(file, "utf8");

    for (const passage of readQuotedPassages(page)) {
      assert.doesNotMatch(
        passage,
        /\bdata-term=/,
        "a quote must carry no markup of ours, so it can still be compared to the original",
      );
    }
  });

  test(`headings in ${file} stay free of term markup`, async () => {
    const page = await readFile(file, "utf8");
    const headings = page.matchAll(/<(h[1-4])\b[\s\S]*?<\/\1>/g);

    for (const [heading] of headings) {
      assert.doesNotMatch(heading, /\bdata-term=/, "headings must read as plain sentences");
    }
  });
}

test("a reader with no working script still gets every definition", async () => {
  for (const file of annotatedNotes) {
    const page = await readFile(file, "utf8");

    for (const term of new Set(readMarkedTerms(page))) {
      const definition = page.match(
        new RegExp(`<dd\\b[^>]*\\bid="glo-${term}"[^>]*>([\\s\\S]*?)</dd>`),
      )?.[1];
      assert.ok(
        definition && definition.replace(/<[^>]+>/g, "").trim().length > 0,
        `"${term}" in ${file} must be readable in the page itself, not only in a popup`,
      );
    }
  }
});

test("marked terms point at the definition a screen reader should announce", async () => {
  for (const file of annotatedNotes) {
    const page = await readFile(file, "utf8");

    for (const [trigger, term] of readTriggers(page)) {
      assert.match(
        trigger,
        new RegExp(`\\baria-describedby="glo-${term}"`),
        `a term trigger in ${file} must name its own definition`,
      );
    }
  }
});

test("marked terms can be reached and operated from the keyboard", async () => {
  for (const file of annotatedNotes) {
    const page = await readFile(file, "utf8");

    for (const [trigger, term] of readTriggers(page)) {
      assert.match(trigger, /\brole="button"/, `"${term}" in ${file} must announce as a button`);
      assert.match(trigger, /\btabindex="0"/, `"${term}" in ${file} must be reachable by Tab`);
    }
  }
});
