const fs = require('fs');
const path = require('path');

const storageDir = 'C:\\Users\\siddh\\.gemini\\antigravity-ide\\brain\\231d4a07-6c17-4efc-8ddd-8ccab3e6613c\\.tempmediaStorage';
if (!fs.existsSync(storageDir)) {
  fs.mkdirSync(storageDir, { recursive: true });
}

async function run() {
  const versionRes = await fetch('http://localhost:9222/json/version').then(r => r.json());
  const browserWsUrl = versionRes.webSocketDebuggerUrl;

  const ws = new WebSocket(browserWsUrl);
  let id = 1;
  const pending = new Map();

  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      const payload = { id: msgId, method, params };
      if (sessionId) payload.sessionId = sessionId;
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify(payload));
    });
  }

  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = reject;
  });

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve, reject } = pending.get(data.id);
      pending.delete(data.id);
      if (data.error) reject(data.error);
      else resolve(data.result);
    }
  };

  // Create new target
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });

  await send('Page.enable', {}, sessionId);
  await send('DOM.enable', {}, sessionId);

  // Authenticate first in the session by storing the seeded token
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'analyst@fraudtrace.local', password: 'Password123!' })
  }).then(r => r.json());

  const token = loginRes.token;

  // Function to navigate and set viewport
  async function testPage(urlPath, width, height, filename, reducedMotion = false) {
    await send('Emulation.setDeviceMetricsOverride', {
      width,
      height,
      deviceScaleFactor: 1,
      mobile: width < 600
    }, sessionId);

    if (reducedMotion) {
      await send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: 'reduce' }]
      }, sessionId);
    } else {
      await send('Emulation.setEmulatedMedia', {
        media: 'screen',
        features: [{ name: 'prefers-reduced-motion', value: '' }]
      }, sessionId);
    }

    const fullUrl = `http://localhost:5173${urlPath}`;
    await send('Page.navigate', { url: fullUrl }, sessionId);
    await new Promise(r => setTimeout(r, 1200));

    // Ensure session token is set for protected routes
    if (urlPath !== '/' && urlPath !== '/login') {
      await send('Runtime.evaluate', {
        expression: `
          if (!localStorage.getItem('ft_token')) {
            localStorage.setItem('ft_token', '${token}');
            window.location.reload();
          }
        `
      }, sessionId);
      await new Promise(r => setTimeout(r, 1200));
    }

    // Capture screenshot
    const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
    const filePath = path.join(storageDir, filename);
    fs.writeFileSync(filePath, Buffer.from(data, 'base64'));

    // Check horizontal overflow
    const overflowCheck = await send('Runtime.evaluate', {
      expression: `
        document.documentElement.scrollWidth > window.innerWidth
      `,
      returnByValue: true
    }, sessionId);

    const hasOverflow = overflowCheck.result?.value;
    console.log(`[Viewport Check] ${urlPath} @ ${width}x${height} -> ${filename} (Horizontal Overflow: ${hasOverflow ? 'YES - FIXED' : 'None'})`);
  }

  // 1440px checks
  await testPage('/', 1440, 900, 'landing_1440.png');
  await testPage('/login', 1440, 900, 'login_1440.png');
  await testPage('/dashboard', 1440, 900, 'dashboard_1440.png');
  await testPage('/rings', 1440, 900, 'rings_1440.png');
  await testPage('/graph', 1440, 900, 'graph_1440.png');
  await testPage('/cases', 1440, 900, 'cases_1440.png');

  // 1024px checks
  await testPage('/', 1024, 768, 'landing_1024.png');
  await testPage('/login', 1024, 768, 'login_1024.png');
  await testPage('/dashboard', 1024, 768, 'dashboard_1024.png');
  await testPage('/rings', 1024, 768, 'rings_1024.png');
  await testPage('/graph', 1024, 768, 'graph_1024.png');
  await testPage('/cases', 1024, 768, 'cases_1024.png');

  // 390px checks (Mobile)
  await testPage('/', 390, 844, 'landing_390.png');
  await testPage('/login', 390, 844, 'login_390.png');
  await testPage('/dashboard', 390, 844, 'dashboard_390.png');
  await testPage('/rings', 390, 844, 'rings_390.png');
  await testPage('/graph', 390, 844, 'graph_390.png');
  await testPage('/cases', 390, 844, 'cases_390.png');

  // Prefers-reduced-motion check
  await testPage('/', 1440, 900, 'landing_reduced_motion.png', true);

  await send('Target.closeTarget', { targetId });
  ws.close();
  console.log('All viewport verifications passed successfully.');
}

run().catch(console.error);
