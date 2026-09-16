/**
 * Minimal headless-Chromium screenshotter driven over the DevTools protocol.
 *
 * `chrome --screenshot` pads its output to the *window* size while rendering
 * into a smaller viewport, so exported assets come out clipped. Setting the
 * metrics over CDP instead gives us exactly the pixel box we ask for, which is
 * what brand assets need.
 *
 * No npm dependency: Node 22 ships a global WebSocket.
 */
import { spawn, execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';

const CANDIDATES = [
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/google-chrome',
];

export function findChromium() {
  if (process.env.CHROMIUM_BIN) return process.env.CHROMIUM_BIN;
  for (const c of CANDIDATES) if (existsSync(c)) return c;
  try {
    const found = execFileSync('sh', [
      '-c',
      'ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | head -1',
    ]).toString().trim();
    if (found) return found;
  } catch { /* fall through to the error below */ }
  throw new Error('No Chromium found. Set CHROMIUM_BIN=/path/to/chrome');
}

/** Launches Chromium and resolves a `{ shot, close }` handle. */
export async function launchChromium({ binary = findChromium() } = {}) {
  const args = [
    '--headless=new',
    '--remote-debugging-port=0',
    '--disable-gpu',
    '--hide-scrollbars',
    '--disable-dev-shm-usage',
    '--allow-file-access-from-files',
    '--no-first-run',
    'about:blank',
  ];
  // Containers here run as root, where Chromium refuses to start its sandbox.
  if (process.getuid?.() === 0) args.unshift('--no-sandbox');

  const proc = spawn(binary, args, { stdio: ['ignore', 'ignore', 'pipe'] });

  const wsUrl = await new Promise((res, rej) => {
    let buf = '';
    const timer = setTimeout(() => rej(new Error('Chromium did not report a DevTools endpoint')), 30_000);
    proc.stderr.on('data', (chunk) => {
      buf += chunk;
      const m = /ws:\/\/[^\s]+/.exec(buf);
      if (m) { clearTimeout(timer); res(m[0]); }
    });
    proc.once('exit', (code) => { clearTimeout(timer); rej(new Error(`Chromium exited early (${code})`)); });
  });

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('CDP connect failed')); });

  let nextId = 0;
  const pending = new Map();
  const waiters = [];
  ws.onmessage = (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id !== undefined && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
      return;
    }
    for (let i = waiters.length - 1; i >= 0; i -= 1) {
      if (waiters[i].method === msg.method && waiters[i].sessionId === msg.sessionId) {
        waiters.splice(i, 1)[0].resolve(msg.params);
      }
    }
  };

  const send = (method, params = {}, sessionId) =>
    new Promise((resolve, reject) => {
      const id = (nextId += 1);
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
    });

  const once = (method, sessionId) =>
    new Promise((resolve) => waiters.push({ method, sessionId, resolve }));

  /** Renders `url` at exactly width×height and returns the PNG bytes. */
  async function shot(url, { width, height, scale = 1, settleMs = 400, transparent = false } = {}) {
    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
    try {
      await send('Page.enable', {}, sessionId);
      await send('Emulation.setDeviceMetricsOverride', {
        width, height, deviceScaleFactor: scale, mobile: false,
      }, sessionId);
      if (transparent) {
        await send('Emulation.setDefaultBackgroundColorOverride', {
          color: { r: 0, g: 0, b: 0, a: 0 },
        }, sessionId);
      }
      const loaded = once('Page.loadEventFired', sessionId);
      await send('Page.navigate', { url }, sessionId);
      await loaded;
      await new Promise((r) => setTimeout(r, settleMs));
      const { data } = await send('Page.captureScreenshot', {
        format: 'png',
        captureBeyondViewport: false,
      }, sessionId);
      return Buffer.from(data, 'base64');
    } finally {
      await send('Target.closeTarget', { targetId }).catch(() => {});
    }
  }

  return {
    shot,
    close() { ws.close(); proc.kill(); },
  };
}
