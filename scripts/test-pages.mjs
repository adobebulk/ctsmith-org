import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const pagesUrl = pathToFileURL(join(root, "functions/_lib/pages.js")).href;
const { HOME_PATH, pagePath, isReservedPageSlug, assertPageSlug, pageBody } = await import(pagesUrl);

test("homepage path is content root index", () => {
  assert.equal(HOME_PATH, "site/content/_index.md");
});

test("page path is a leaf bundle", () => {
  assert.equal(pagePath("about"), "site/content/pages/about/index.md");
});

test("reserved slugs reject CMS and asset routes", () => {
  for (const slug of ["admin", "api", "assets", "projects", "posts", "css", "pages", "index"]) {
    assert.equal(isReservedPageSlug(slug), true, slug);
    assert.throws(() => assertPageSlug(slug), /reserved/);
  }
});

test("about is a valid page slug", () => {
  assert.equal(isReservedPageSlug("about"), false);
  assert.equal(assertPageSlug("about"), "about");
});

test("invalid slugs are rejected", () => {
  assert.throws(() => assertPageSlug(""), /invalid/);
  assert.throws(() => assertPageSlug("Hello World"), /invalid/);
  assert.throws(() => assertPageSlug("foo_bar"), /invalid/);
});

test("committed about page is a pages bundle", () => {
  const raw = readFileSync(join(root, "site/content/pages/about/index.md"), "utf8");
  assert.match(raw, /^---\n/);
  assert.match(raw, /title: "About"/);
  assert.match(raw, /nav: true/);
  assert.match(raw, /draft: false/);
});

test("pageBody strips the leading blank line from front matter", () => {
  assert.equal(pageBody("\nHello"), "Hello");
  assert.equal(pageBody("Hello"), "Hello");
  assert.equal(pageBody(""), "");
});

test("homepage front matter has splash fields", () => {
  const raw = readFileSync(join(root, "site/content/_index.md"), "utf8");
  assert.match(raw, /title: "C\.T\. Smith"/);
  assert.match(raw, /tagline: "Do the Right Thing\."/);
});
