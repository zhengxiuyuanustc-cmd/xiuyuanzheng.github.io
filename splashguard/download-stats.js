/* Public GitHub APK-asset counts, never clicks, installations, or unique people. */
(function (browser) {
  "use strict";
  var REPOSITORY = "zhengxiuyuanustc-cmd/SplashGuard";
  var API = "https://api.github.com/repos/" + REPOSITORY + "/releases";
  var PER_PAGE = 100;
  var MAX_PAGES = 10;
  var TIMEOUT_MS = 4000;

  function fail(code) { throw new Error(code); }
  function nonnegativeInteger(value) { return Number.isSafeInteger(value) && value >= 0; }
  function requireArray(value) { if (!Array.isArray(value)) fail("invalid_array"); return value; }
  function validTime(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) return false;
    var time = Date.parse(value);
    return Number.isFinite(time) && new Date(time).toISOString().replace(".000Z", "Z") === value.replace(".000Z", "Z");
  }
  function validateAsset(asset) {
    if (!asset || !Number.isSafeInteger(asset.id) || asset.id <= 0) fail("invalid_asset_id");
    if (typeof asset.name !== "string" || !/\.apk$/i.test(asset.name)) fail("invalid_apk_name");
    if (typeof asset.release_tag !== "string" || !asset.release_tag) fail("invalid_release_tag");
    if (!nonnegativeInteger(asset.download_count)) fail("invalid_download_count");
    return { id: asset.id, name: asset.name, release_tag: asset.release_tag, download_count: asset.download_count };
  }
  function sumAssets(input) {
    var seen = new Map(), total = 0, assets = [];
    requireArray(input).forEach(function (item) {
      var asset = validateAsset(item), previous = seen.get(asset.id);
      if (previous) {
        if (previous.name !== asset.name || previous.release_tag !== asset.release_tag || previous.download_count !== asset.download_count) fail("conflicting_duplicate_asset");
        return;
      }
      seen.set(asset.id, asset);
      total += asset.download_count;
      if (!nonnegativeInteger(total)) fail("download_count_overflow");
      assets.push(asset);
    });
    assets.sort(function (a, b) { return a.id - b.id; });
    return { total_download_count: total, asset_count: assets.length, assets: assets };
  }
  function aggregateReleases(releases) {
    var candidates = [];
    requireArray(releases).forEach(function (release) {
      if (!release || typeof release.draft !== "boolean") fail("invalid_release");
      if (release.draft) return;
      if (typeof release.tag_name !== "string" || !release.tag_name) fail("invalid_release_tag");
      requireArray(release.assets).forEach(function (asset) {
        if (!asset || typeof asset.name !== "string" || typeof asset.state !== "string") fail("invalid_asset");
        if (asset.state !== "uploaded" || !/\.apk$/i.test(asset.name)) return;
        candidates.push({ id: asset.id, name: asset.name, release_tag: release.tag_name, download_count: asset.download_count });
      });
    });
    return sumAssets(candidates);
  }
  function validateSnapshot(value) {
    if (!value || value.schema_version !== 1 || value.repository !== REPOSITORY || value.source !== "github-release-apk-assets") fail("invalid_snapshot_source");
    if (!validTime(value.captured_at)) fail("invalid_snapshot_time");
    if (!Number.isSafeInteger(value.api_pages) || value.api_pages < 1 || value.api_pages > MAX_PAGES) fail("invalid_page_count");
    var result = sumAssets(value.assets);
    if (!nonnegativeInteger(value.total_download_count) || value.total_download_count !== result.total_download_count || value.asset_count !== result.asset_count || value.assets.length !== result.asset_count) fail("invalid_snapshot_total");
    return {
      schema_version: 1, repository: REPOSITORY, source: "github-release-apk-assets",
      captured_at: value.captured_at, api_pages: value.api_pages,
      total_download_count: result.total_download_count, asset_count: result.asset_count, assets: result.assets
    };
  }
  async function requestJson(fetchImpl, url, signal) {
    var response = await fetchImpl(url, {
      method: "GET", credentials: "omit", referrerPolicy: "no-referrer", cache: "no-store",
      headers: { Accept: "application/vnd.github+json" }, signal: signal
    });
    if (!response || !response.ok) fail("request_failed");
    return response.json();
  }
  async function fetchReleaseStats(fetchImpl, signal, clock) {
    var releases = [];
    for (var page = 1; page <= MAX_PAGES; page++) {
      var batch = requireArray(await requestJson(fetchImpl, API + "?per_page=" + PER_PAGE + "&page=" + page, signal));
      if (batch.length > PER_PAGE) fail("invalid_page_size");
      releases = releases.concat(batch);
      if (batch.length < PER_PAGE) {
        var aggregate = aggregateReleases(releases);
        return validateSnapshot({
          schema_version: 1, repository: REPOSITORY, source: "github-release-apk-assets",
          captured_at: (clock || function () { return new Date(); })().toISOString(), api_pages: page,
          total_download_count: aggregate.total_download_count, asset_count: aggregate.asset_count, assets: aggregate.assets
        });
      }
    }
    fail("page_limit_exceeded");
  }
  async function withTimeout(operation, duration, Controller) {
    var Abort = Controller || (typeof AbortController !== "undefined" ? AbortController : null);
    if (!Abort) fail("abort_controller_unavailable");
    var controller = new Abort(), timer;
    try {
      return await Promise.race([
        Promise.resolve().then(function () { return operation(controller.signal); }),
        new Promise(function (_, reject) {
          timer = setTimeout(function () { controller.abort(); reject(new Error("request_timeout")); }, duration || TIMEOUT_MS);
        })
      ]);
    } finally { clearTimeout(timer); }
  }

  function formatTime(value) {
    try { return new Date(value).toLocaleString("zh-CN", { timeZone: "Asia/Shanghai", hour12: false }) + "（北京时间）"; }
    catch (_) { return value; }
  }
  function updateRoots(roots, snapshot, status) {
    roots.forEach(function (root) {
      var count = root.querySelector("[data-download-count]");
      var time = root.querySelector("[data-download-time]");
      var note = root.querySelector("[data-download-status]");
      if (count) count.textContent = snapshot ? String(snapshot.total_download_count) : "暂不可用";
      if (time) time.textContent = snapshot ? "统计读取于 " + formatTime(snapshot.captured_at) : "尚无可用快照";
      if (note) note.textContent = status;
      root.setAttribute("aria-busy", "false");
    });
  }
  async function loadCounters(roots, fetchImpl, snapshotUrl) {
    var snapshot = null;
    roots.forEach(function (root) { root.setAttribute("aria-busy", "true"); });
    try {
      snapshot = validateSnapshot(await withTimeout(function (signal) { return requestJson(fetchImpl, snapshotUrl, signal); }));
      updateRoots(roots, snapshot, "已显示GitHub发行附件快照；不含本站直接下载，不代表安装量或独立用户。");
    } catch (_) {
      updateRoots(roots, null, "未取得完整可校验的快照，不显示估算数。");
    }
    var liveRoots = roots.filter(function (root) { return root.getAttribute("data-download-live") === "true"; });
    if (!liveRoots.length) return;
    try {
      var live = await withTimeout(function (signal) { return fetchReleaseStats(fetchImpl, signal); });
      updateRoots(liveRoots, live, "已读取GitHub公开统计；不含本站直接下载，不代表安装量或独立用户。");
    } catch (_) {
      updateRoots(liveRoots, snapshot, snapshot ? "实时更新暂不可用，保留上次快照及其读取时间。" : "统计暂不可用，未使用估算值或补零。");
    }
  }

  var exportsForTests = {
    aggregateReleases: aggregateReleases, validateSnapshot: validateSnapshot,
    fetchReleaseStats: fetchReleaseStats, withTimeout: withTimeout, loadCounters: loadCounters
  };
  if (typeof module !== "undefined" && module.exports) module.exports = exportsForTests;
  if (browser && browser.document) {
    var doc = browser.document;
    var scriptUrl = doc.currentScript && doc.currentScript.src;
    var snapshotUrl = new URL("download-stats.json", scriptUrl || doc.baseURI).href;
    var boot = function () {
      var roots = Array.prototype.slice.call(doc.querySelectorAll("[data-download-stats]"));
      if (!roots.length) return;
      if (typeof browser.fetch !== "function") { updateRoots(roots, null, "当前浏览器无法读取统计快照。"); return; }
      loadCounters(roots, browser.fetch.bind(browser), snapshotUrl).catch(function () { updateRoots(roots, null, "统计暂不可用。"); });
    };
    if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot, { once: true }); else boot();
  }
})(typeof window !== "undefined" ? window : null);
