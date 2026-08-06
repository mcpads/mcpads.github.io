import assert from "node:assert/strict";
import test from "node:test";

import { findCurrentNavigationSection } from "../src/navigation.ts";

const pageSections = [
  { navigationId: "journey", top: 1_000 },
  { navigationId: "retroir", top: 1_800 },
  { navigationId: "work", top: 2_500 },
  { navigationId: "work", top: 3_200 },
  { navigationId: "about", top: 3_800 },
];

test("hero has no current navigation section", () => {
  assert.equal(findCurrentNavigationSection(500, pageSections), null);
});

test("navigation follows the page story in document order", () => {
  assert.equal(findCurrentNavigationSection(1_200, pageSections), "journey");
  assert.equal(findCurrentNavigationSection(2_000, pageSections), "retroir");
  assert.equal(findCurrentNavigationSection(2_700, pageSections), "work");
  assert.equal(findCurrentNavigationSection(3_400, pageSections), "work");
  assert.equal(findCurrentNavigationSection(4_000, pageSections), "about");
});
