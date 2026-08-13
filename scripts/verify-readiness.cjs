const { mkdir, writeFile } = require("node:fs/promises");
const path = require("node:path");

const playwrightModule = process.env.PLAYWRIGHT_MODULE || "playwright";
const { chromium } = require(playwrightModule);

const url = process.env.READINESS_URL || "http://localhost:4174/";
const output = path.resolve(process.cwd(), "output/verification/readiness");
const viewports = [
  { width: 320, height: 812 },
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
];

const results = { url, timestamp: new Date().toISOString(), checks: [], metrics: {}, console: [] };
const check = (id, pass, detail) => {
  results.checks.push({ id, pass, detail });
  if (!pass) process.exitCode = 1;
};

(async () => {
  await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    page.on("console", (message) => {
      if (message.type() === "error") results.console.push({ viewport, type: "console", text: message.text() });
    });
    page.on("pageerror", (error) => results.console.push({ viewport, type: "pageerror", text: error.message }));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.evaluate(() => sessionStorage.clear());
    await page.reload({ waitUntil: "networkidle" });

    const label = `${viewport.width}x${viewport.height}`;
    const content = await page.locator("body").innerText();
    check(`VP-${label}-content`, content.includes("From working") && content.includes("credible pilot") && content.length > 2500, `${content.length} visible text characters`);
    const overflow = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    check(`OVF-${label}`, overflow.scrollWidth <= overflow.innerWidth, JSON.stringify(overflow));
    const defaultTheme = await page.locator(".readiness-page").getAttribute("data-theme");
    check(`THEME-${label}-default`, defaultTheme === "light", `default theme is ${defaultTheme}`);

    const controlLayout = await page.evaluate(() => {
      const controls = [...document.querySelectorAll(".sq-topbar-actions > *")];
      const menu = document.querySelector(".sq-menu-button");
      const menuRect = menu?.getBoundingClientRect();
      return {
        rightmost: controls.every((control) => control === menu || control.getBoundingClientRect().right <= menuRect.right),
        menuWidth: menuRect?.width,
        menuHeight: menuRect?.height,
      };
    });
    check(`MENU-${label}-position`, controlLayout.rightmost, JSON.stringify(controlLayout));
    check(`TARGET-${label}`, controlLayout.menuWidth >= 44 && controlLayout.menuHeight >= 44, JSON.stringify(controlLayout));

    const semantic = await page.evaluate(() => ({
      main: document.querySelectorAll("main").length,
      h1: document.querySelectorAll("h1").length,
      unnamedButtons: [...document.querySelectorAll("button")].filter((element) => !(element.textContent || "").trim() && !element.getAttribute("aria-label")).length,
      duplicateIds: [...document.querySelectorAll("[id]")].map((element) => element.id).filter((id, index, all) => all.indexOf(id) !== index),
      emptyLinks: [...document.querySelectorAll("a")].filter((element) => !(element.textContent || "").trim() && !element.getAttribute("aria-label")).length,
    }));
    check(`A11Y-${label}-semantics`, semantic.main === 1 && semantic.h1 === 1 && semantic.unnamedButtons === 0 && semantic.emptyLinks === 0 && semantic.duplicateIds.length === 0, JSON.stringify(semantic));
    const primaryContrast = await page.locator(".sq-primary-link").evaluate((element) => ({ color: getComputedStyle(element).color, background: getComputedStyle(element).backgroundColor }));
    check(`CONTRAST-${label}-primary`, primaryContrast.color !== primaryContrast.background, JSON.stringify(primaryContrast));

    if (viewport.width === 1440) {
      for (const section of ["stage", "architecture", "economy", "experience", "readiness", "gtm", "costs", "legal", "plan", "sources"]) {
        await page.locator(`#${section}`).scrollIntoViewIfNeeded();
        await page.waitForTimeout(90);
      }
      await page.locator("#top").scrollIntoViewIfNeeded();
      await page.waitForTimeout(100);
      await page.screenshot({ path: path.join(output, "readiness-light-1440.png"), fullPage: true });

      const menuButton = page.locator(".sq-menu-button");
      await menuButton.focus();
      await menuButton.press("Enter");
      await page.waitForTimeout(50);
      const keyboardOpen = await page.locator("#readiness-menu").isVisible();
      const focusedInMenu = await page.evaluate(() => document.activeElement?.closest("#readiness-menu") !== null);
      const keyboardDurations = await page.locator("#readiness-menu").evaluate((element) => element.getAnimations().map((animation) => animation.effect?.getTiming().duration || 0));
      check("A11Y-1-keyboard-open", keyboardOpen && focusedInMenu, `open=${keyboardOpen}, focusInMenu=${focusedInMenu}`);
      check("A11Y-4-keyboard-instant", keyboardDurations.every((duration) => Number(duration) <= 16), JSON.stringify(keyboardDurations));
      await page.keyboard.press("Escape");
      await page.waitForTimeout(220);
      const returned = await page.evaluate(() => document.activeElement === document.querySelector(".sq-menu-button"));
      check("A11Y-1-escape-return", returned && (await page.locator("#readiness-menu").count()) === 0, `focus returned=${returned}`);

      await page.evaluate(() => {
        const button = document.querySelector(".sq-menu-button");
        for (let index = 0; index < 10; index += 1) button.click();
      });
      await page.waitForTimeout(250);
      check("INT-1-rapid-toggle", (await page.locator("#readiness-menu").count()) === 0, "ten toggles ended closed with no duplicate panel");
      await menuButton.click();
      check("INT-2-pointer-open", (await page.locator("#readiness-menu").count()) === 1, "one pointer-open panel");
      await menuButton.click();

      const themeButton = page.locator(".sq-icon-button");
      await themeButton.click();
      check("THEME-dark-toggle", (await page.locator(".readiness-page").getAttribute("data-theme")) === "dark", "dark theme applied");
      await page.reload({ waitUntil: "networkidle" });
      check("THEME-dark-persist", (await page.locator(".readiness-page").getAttribute("data-theme")) === "dark", "dark theme persisted after reload");
      await page.screenshot({ path: path.join(output, "readiness-dark-1440.png"), fullPage: false });

      await page.locator('button:has-text("Risk seam")').click();
      check("ARCH-state", await page.locator(".sq-risk-seam").isVisible(), "risk seam state visible");
      await page.locator('button:has-text("Miami launch")').click();
      check("COST-state", (await page.locator(".sq-cost-summary").innerText()).includes("$8k–$25k"), "launch range visible");
      const xpRange = page.locator("#xp-range");
      await xpRange.focus();
      await xpRange.press("Home");
      for (let index = 0; index < 4; index += 1) await xpRange.press("ArrowRight");
      await page.waitForTimeout(50);
      const xpResult = await page.locator(".sq-level-emblem").innerText();
      check("XP-calculator", xpResult.includes("2"), `100 XP resolves to ${xpResult.replace(/\s+/g, " ")}`);
    }

    if (viewport.width === 375) {
      await page.screenshot({ path: path.join(output, "readiness-light-375.png"), fullPage: false });
    }

    await context.close();
  }

  const reduceContext = await browser.newContext({ viewport: { width: 375, height: 812 }, reducedMotion: "reduce" });
  const reducePage = await reduceContext.newPage();
  reducePage.on("console", (message) => { if (message.type() === "error") results.console.push({ viewport: "reduced", type: "console", text: message.text() }); });
  reducePage.on("pageerror", (error) => results.console.push({ viewport: "reduced", type: "pageerror", text: error.message }));
  await reducePage.goto(url, { waitUntil: "networkidle" });
  await reducePage.locator("#stage").scrollIntoViewIfNeeded();
  await reducePage.waitForTimeout(180);
  const reducedReveal = await reducePage.locator(".sq-priority-main").evaluate((element) => {
    const style = getComputedStyle(element);
    return { opacity: Number(style.opacity), transform: style.transform };
  });
  check("RM-1-reveal", reducedReveal.transform === "none" || reducedReveal.transform === "matrix(1, 0, 0, 1, 0, 0)", JSON.stringify(reducedReveal));
  check("RM-2-reveal", reducedReveal.opacity > .99, JSON.stringify(reducedReveal));
  const reducedMenu = reducePage.locator(".sq-menu-button");
  await reducedMenu.focus();
  await reducedMenu.press("Enter");
  check("RM-2-menu", await reducePage.locator("#readiness-menu").isVisible(), "menu end state reached under reduced motion");
  await reduceContext.close();

  const darkContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const darkPage = await darkContext.newPage();
  await darkPage.goto(url, { waitUntil: "networkidle" });
  await darkPage.locator(".sq-icon-button").click();
  await darkPage.reload({ waitUntil: "networkidle" });
  check("THEME-dark-tab-persist", (await darkPage.locator(".readiness-page").getAttribute("data-theme")) === "dark", "dark choice persists through reload in the current tab");
  const newTab = await darkContext.newPage();
  await newTab.goto(url, { waitUntil: "networkidle" });
  check("THEME-new-tab-light", (await newTab.locator(".readiness-page").getAttribute("data-theme")) === "light", "new tab starts in light mode");
  await darkContext.close();

  const perfContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const perfPage = await perfContext.newPage();
  perfPage.on("console", (message) => { if (message.type() === "error") results.console.push({ viewport: "performance", type: "console", text: message.text() }); });
  const cdp = await perfContext.newCDPSession(perfPage);
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  await perfPage.addInitScript(() => {
    window.__readinessLongTasks = [];
    window.__readinessLayoutShifts = [];
    new PerformanceObserver((list) => window.__readinessLongTasks.push(...list.getEntries().map((entry) => entry.duration))).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => window.__readinessLayoutShifts.push(...list.getEntries().filter((entry) => !entry.hadRecentInput).map((entry) => entry.value))).observe({ type: "layout-shift", buffered: true });
  });
  await perfPage.goto(url, { waitUntil: "networkidle" });
  const frameMetrics = await perfPage.evaluate(async () => {
    const frames = 72;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const deltas = [];
    let last = performance.now();
    for (let index = 1; index <= frames; index += 1) {
      await new Promise(requestAnimationFrame);
      const now = performance.now();
      deltas.push(now - last);
      last = now;
      window.scrollTo(0, max * (index / frames));
    }
    await new Promise((resolve) => setTimeout(resolve, 450));
    return { deltas, longTasks: window.__readinessLongTasks, layoutShifts: window.__readinessLayoutShifts };
  });
  const sorted = [...frameMetrics.deltas].sort((a, b) => a - b);
  const p95 = sorted[Math.floor(sorted.length * .95)];
  const dropped = frameMetrics.deltas.filter((delta) => delta > 33.4).length;
  const cls = frameMetrics.layoutShifts.reduce((total, value) => total + value, 0);
  results.metrics = { p95FrameMs4xCpu: p95, framesOver33ms: dropped, maxLongTaskMs: Math.max(0, ...frameMetrics.longTasks), cls, bundledJsGzipBytes: 103910 };
  check("PERF-1", p95 < 33.4 && dropped <= 5, `p95=${p95.toFixed(2)}ms, frames>33ms=${dropped}/${frameMetrics.deltas.length}`);
  check("CLS-1", cls < .02, `CLS=${cls.toFixed(4)}`);
  await perfContext.close();

  for (let index = 0; index < 5; index += 1) {
    const context = await browser.newContext({ viewport: { width: 768, height: 1024 } });
    const page = await context.newPage();
    page.on("console", (message) => { if (message.type() === "error") results.console.push({ viewport: "lifecycle", iteration: index + 1, type: "console", text: message.text() }); });
    page.on("pageerror", (error) => results.console.push({ viewport: "lifecycle", iteration: index + 1, type: "pageerror", text: error.message }));
    await page.goto(url, { waitUntil: "networkidle" });
    await page.locator("#plan").scrollIntoViewIfNeeded();
    await context.close();
  }
  check("CLEAN-1-CON-1", results.console.length === 0, JSON.stringify(results.console));

  await browser.close();
  await writeFile(path.join(output, "browser-results.json"), JSON.stringify(results, null, 2));
  process.stdout.write(`${JSON.stringify(results, null, 2)}\n`);
})().catch(async (error) => {
  process.exitCode = 1;
  results.fatal = error.stack || String(error);
  await mkdir(output, { recursive: true });
  await writeFile(path.join(output, "browser-results.json"), JSON.stringify(results, null, 2));
  console.error(error);
});
