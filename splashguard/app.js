"use strict";
(() => {
  const $ = (selector) => document.querySelector(selector);
  let brand = "全部";
  const search = $("#guide-search");
  const filters = [...document.querySelectorAll(".filter")];
  const searchable = "华为 huawei goa-al80 harmonyos 4.2 android 12 api31 哔哩哔哩 bilibili 9.15.0 开屏清净 后台 无障碍 启动管理 广告传感器";
  const normalize = (value) => value.trim().toLowerCase();
  function renderGuides() {
    const terms = normalize(search.value).split(/\s+/).filter(Boolean);
    const matches = (brand === "全部" || brand === "华为") && terms.every(term => searchable.replace(/\s+/g, "").includes(term));
    $("#guide-results").hidden = !matches;
    $("#guide-empty").hidden = matches;
    $("#guide-status").textContent = matches ? "显示已实测的华为 GOA-AL80 指南。" : "没有匹配的已复核记录。其他机型仍在征集中。";
    filters.forEach(button => {
      const active = button.dataset.brand === brand;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    });
  }
  filters.forEach(button => button.addEventListener("click", () => { brand = button.dataset.brand; renderGuides(); }));
  search.addEventListener("input", renderGuides);
  $("#empty-contribute").addEventListener("click", () => {
    const select = $("#contribution-brand");
    if (brand !== "全部") select.value = brand;
  });
  let toastTimer;
  function toast(message) {
    clearTimeout(toastTimer);
    $("#toast").textContent = message;
    $("#toast").classList.add("visible");
    toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 3500);
  }
  async function copyText(value, fallback) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(value);
      toast("已复制。");
    } catch {
      fallback?.focus();
      fallback?.select?.();
      if (fallback && !fallback.select) {
        const range = document.createRange(); range.selectNodeContents(fallback);
        const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
      }
      toast("浏览器未允许复制，请手动复制已选中的内容。");
    }
  }
  $("#copy-hash").addEventListener("click", () => copyText($("#apk-hash").textContent, $("#apk-hash")));
  $("#copy-draft").addEventListener("click", () => copyText($("#draft-text").value, $("#draft-text")));
  const form = $("#contribution-form");
  const invalidateDraft = () => { $("#draft-result").hidden = true; $("#github-draft").removeAttribute("href"); };
  form.addEventListener("input", invalidateDraft);
  form.addEventListener("change", invalidateDraft);
  form.querySelectorAll("input[required], textarea[required]").forEach(field => field.addEventListener("input", () => field.setCustomValidity("")));
  form.addEventListener("submit", event => {
    event.preventDefault();
    for (const field of form.querySelectorAll("input[required]:not([type=checkbox]), textarea[required]")) {
      field.setCustomValidity(field.value.trim() ? "" : "请填写有效内容，不能只有空格。");
    }
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const get = (key) => String(data.get(key) || "").trim();
    const body = ["## 机型与版本", `- 品牌：${get("brand")}`, `- 型号：${get("model")}`, `- 系统：${get("system")}`, `- 目标 App 与版本：${get("target")}`, `- 开屏清净版本：${get("version")}`, "", "## 实际观察", get("result"), "", "## 设置路径、步骤与影响范围", get("steps"), "", "## 日期与公开来源", get("source") || "未提供，待补充", "", "## 提交说明", "我已检查内容不含账号、密码、手机号、IMEI或设备序列号。", "本记录是社区报告，尚未作为本站已复核指南；未出现广告不等于跳过成功。"].join("\n");
    $("#draft-text").value = body;
    const url = new URL("https://github.com/zhengxiuyuanustc-cmd/SplashGuard/issues/new");
    url.searchParams.set("title", `[机型反馈] ${get("brand")} ${get("model")} / ${get("system")}`);
    url.searchParams.set("body", body);
    if (url.toString().length > 7000) {
      url.searchParams.delete("body");
      $("#draft-transport-note").textContent = "草稿较长，请先复制，在GitHub页面粘贴。此链接只向GitHub发送标题，并可能保留在浏览历史；在GitHub确认提交后，内容才成为公开Issue。社区报告需经复核才收录。";
    } else {
      $("#draft-transport-note").textContent = "生成草稿只在本页进行。点击前往GitHub时，草稿会随链接发送给GitHub，并可能保留在浏览历史；只有在GitHub确认提交后，才发布为公开Issue。社区报告需经复核才收录为本站指南。";
    }
    $("#github-draft").href = url.toString();
    $("#draft-result").hidden = false;
    $("#draft-result").scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "center" });
    $("#draft-text").focus({ preventScroll: true });
  });
})();
