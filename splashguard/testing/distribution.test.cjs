"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const digest = name => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, name))).digest("hex");

test("trial APK matches its public identity and source validation record", () => {
  const meta = JSON.parse(read("downloads/validation-0.1.16.json"));
  assert.equal(meta.version, "0.1.16");
  assert.equal(meta.version_code, 17);
  assert.equal(meta.channel, "compatibility-preview");
  assert.equal(meta.file, "SplashGuard-0.1.16-nondebug-preview.apk");
  assert.equal(meta.sha256, "1decac1c3a0cff3c0c23cc8b626317d9d25dbb84c84189965b5bdb0df4f4fa51");
  assert.equal(digest("downloads/" + meta.file), meta.sha256);
  assert.equal(fs.statSync(path.join(root, "downloads", meta.file)).size, meta.bytes);
  assert.equal(meta.bytes, 135797);
  assert.equal(meta.main_source_commit, "d46b9e92bbc821335e71b3f9986ad539a2f29c84");
  assert.equal(meta.debuggable, false);
  assert.deepEqual(meta.declared_uses_permissions, []);
  assert.equal(meta.can_perform_gestures, false);
  assert.equal(meta.native_harmony_automatic_skip_supported, false);
  assert.ok(read("testing/index.html").includes(meta.sha256));
});

test("all mirrored APK checksums agree and the original primary download remains", () => {
  const lines = read("downloads/SHA256SUMS.txt").trim().split(/\r?\n/);
  const seen = new Set();
  for (const line of lines) {
    const match = /^([a-f0-9]{64})  (SplashGuard-[a-zA-Z0-9.-]+\.apk)$/.exec(line);
    assert.ok(match, "invalid checksum line");
    assert.ok(!seen.has(match[2]), "duplicate checksum filename");
    seen.add(match[2]);
    assert.equal(digest("downloads/" + match[2]), match[1]);
  }
  assert.ok(seen.has("SplashGuard-0.1.7-preview.apk"));
  assert.ok(seen.has("SplashGuard-0.1.16-nondebug-preview.apk"));
  assert.equal(digest("downloads/SplashGuard-0.1.7-preview.apk"), "9acc48129e9f12d282cc18da73374c0a38fe32e17596b87eba044371ab6c3e64");
  const home = read("index.html");
  assert.ok(home.includes('href="downloads/SplashGuard-0.1.7-preview.apk"'));
  assert.ok(!home.includes('href="downloads/SplashGuard-0.1.16-nondebug-preview.apk"'));
  assert.ok(home.includes('href="testing/"'));
});

test("trial page references existing local files and disallows automatic network submission", () => {
  const html = read("testing/index.html");
  for (const [, reference] of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
    if (/^(?:https?:|data:|#)/.test(reference)) continue;
    const pathname = reference.split(/[?#]/)[0];
    const target = path.resolve(root, "testing", pathname);
    const siteRoot = path.dirname(root);
    assert.ok(target === siteRoot || target.startsWith(siteRoot + path.sep), "reference escapes site repository");
    assert.ok(fs.existsSync(target), "missing local reference: " + reference);
  }
  assert.ok(html.includes("connect-src 'none'"));
  assert.ok(html.includes("form-action 'none'"));
  assert.ok(!/<form[^>]+action=/i.test(html));
});
