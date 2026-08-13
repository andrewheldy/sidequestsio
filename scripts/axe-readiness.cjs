const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto(process.env.READINESS_URL || "http://localhost:4174", { waitUntil: "networkidle" });
  await page.evaluate(() => sessionStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload({ waitUntil: "networkidle" });
  await page.evaluate(() => {
    for (const element of document.querySelectorAll("[style*='opacity']")) {
      element.style.opacity = "1";
      element.style.transform = "none";
    }
  });
  await page.addScriptTag({ path: process.env.AXE_PATH });
  const result = await page.evaluate(async () => await axe.run(document, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"] },
  }));
  const report = {
    violations: result.violations.map((violation) => ({
      id: violation.id,
      impact: violation.impact,
      nodes: violation.nodes.length,
      details: violation.nodes.map((node) => ({ target: node.target, summary: node.failureSummary })),
    })),
    incomplete: result.incomplete.map((item) => ({
      id: item.id,
      nodes: item.nodes.length,
      targets: item.nodes.map((node) => node.target),
    })),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (report.violations.length > 0) process.exitCode = 1;
  await browser.close();
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
