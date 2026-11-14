import { chromium } from '@playwright/test';
import { gzipSync } from 'node:zlib';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.FITSPACE_BASE_URL || 'http://127.0.0.1:3000';
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  args: [
    '--no-sandbox',
    '--enable-unsafe-swiftshader',
    '--use-angle=swiftshader',
  ],
});
try {
  const html = await (await fetch(base)).text();
  const initialScripts = [
    ...new Set(
      [...html.matchAll(/<script[^>]+src="([^"]+\.js)"/g)].map((m) => m[1]),
    ),
  ];
  let initialGzipBytes = 0;
  for (const path of initialScripts)
    initialGzipBytes += gzipSync(
      Buffer.from(await (await fetch(new URL(path, base))).arrayBuffer()),
    ).length;
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  await page.addInitScript(() => {
    window.__fitspacePerf = { submittedTriangles: 0, frames: [], lcp: 0 };
    new PerformanceObserver((list) => {
      window.__fitspacePerf.lcp = list.getEntries().at(-1).startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    for (const method of [
      'drawElements',
      'drawArrays',
      'drawElementsInstanced',
      'drawArraysInstanced',
    ]) {
      const original = WebGL2RenderingContext.prototype[method];
      WebGL2RenderingContext.prototype[method] = function (...args) {
        if (args[0] === this.TRIANGLES) {
          const count = method.includes('Elements') ? args[1] : args[2];
          const instances = method.endsWith('Instanced') ? args.at(-1) : 1;
          window.__fitspacePerf.submittedTriangles += (count * instances) / 3;
        }
        return original.apply(this, args);
      };
    }
  });
  await page.goto(base);
  await page.getByTestId('room-scene').waitFor();
  await page.waitForFunction(() =>
    document.querySelector('[data-ready="true"]'),
  );
  await page.getByRole('button', { name: 'Animate camera' }).click();
  const rendering = await page.evaluate(async () => {
    const result = window.__fitspacePerf;
    const canvas = document.querySelector('canvas');
    const gl = canvas.getContext('webgl2');
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = debug
      ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER);
    const samples = [];
    let last = performance.now();
    const start = last;
    result.submittedTriangles = 0;
    await new Promise((resolve) => {
      function frame(now) {
        samples.push({ ms: now - last, triangles: result.submittedTriangles });
        result.submittedTriangles = 0;
        last = now;
        if (now - start >= 30000) resolve();
        else requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    });
    const times = samples.map((x) => x.ms).sort((a, b) => a - b);
    const triangles = samples
      .map((x) => x.triangles)
      .filter((x) => x > 0)
      .sort((a, b) => a - b);
    return {
      renderer,
      seconds: (last - start) / 1000,
      frames: samples.length,
      averageFps: samples.length / ((last - start) / 1000),
      medianFrameMs: times[Math.floor(times.length / 2)],
      medianSubmittedTrianglesPerFrame:
        triangles[Math.floor(triangles.length / 2)],
      lcpUnthrottledMs: result.lcp,
    };
  });
  const resources = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((r) => ({
      name: r.name,
      bytes: r.encodedBodySize,
      type: r.initiatorType,
    })),
  );
  const javascript = resources.filter((r) =>
    new URL(r.name).pathname.endsWith('.js'),
  );
  await page.close();
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  await mobile.addInitScript(() => {
    window.__fitspaceLcp = 0;
    new PerformanceObserver((list) => {
      window.__fitspaceLcp = list.getEntries().at(-1).startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  const cdp = await mobile.context().newCDPSession(mobile);
  await cdp.send('Network.enable');
  await cdp.send('Network.emulateNetworkConditions', {
    offline: false,
    latency: 150,
    downloadThroughput: 200000,
    uploadThroughput: 93750,
  });
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await mobile.goto(base);
  await mobile.waitForFunction(
    () => document.querySelector('[data-ready="true"]'),
    { timeout: 60000 },
  );
  // Capture LCP after the room and shell settle; this is a reproducible lab sample, not field data.
  await mobile.screenshot({ path: 'test-results/performance-mobile.png' });
  const mobileLcpMs = await mobile.evaluate(() => window.__fitspaceLcp);
  const report = {
    timestamp: new Date().toISOString(),
    browser: browser.version(),
    platform: process.platform,
    viewport: '1440x1000',
    initialScriptCount: initialScripts.length,
    initialShellGzipKiB: Math.round((initialGzipBytes / 1024) * 10) / 10,
    allLoadedJsEncodedKiB:
      Math.round(
        (javascript.reduce((sum, r) => sum + r.bytes, 0) / 1024) * 10,
      ) / 10,
    externalDemoAssetBytes: 0,
    rendering,
    mobile: {
      viewport: '390x844',
      cpuSlowdown: 4,
      latencyMs: 150,
      downloadBytesPerSecond: 200000,
      lcpMs: mobileLcpMs,
    },
    limitations: [
      'SwiftShader software rendering; not an integrated-GPU reference-device validation.',
      'Submitted triangles include shadow passes; not a unique visible-geometry count.',
      'Gzip shell figure is computed from HTML script sources; actual transfer compression may differ.',
      'Single lab LCP sample; not a field performance percentile.',
    ],
  };
  await mkdir('test-results', { recursive: true });
  await writeFile(
    'test-results/performance.json',
    JSON.stringify(report, null, 2) + '\n',
  );
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
