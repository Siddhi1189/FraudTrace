import fs from 'fs';
import path from 'path';

async function run() {
  const targetsRes = await fetch('http://localhost:9222/json');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page' && t.url.includes('localhost:5173')) || targets.find((t) => t.type === 'page');

  if (!page) {
    console.error('No Chrome page found');
    process.exit(1);
  }
  console.log('Connecting to page:', page.title, page.url);

  const ws = new WebSocket(page.webSocketDebuggerUrl);

  let idCounter = 1;
  const callbacks = new Map();

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && callbacks.has(data.id)) {
      const cb = callbacks.get(data.id);
      callbacks.delete(data.id);
      if (data.error) cb.reject(data.error);
      else cb.resolve(data.result);
    }
  };

  const send = (method, params = {}) => {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      callbacks.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  };

  await new Promise((resolve) => ws.onopen = resolve);
  console.log('Connected to CDP');

  await send('Page.enable');
  await send('Runtime.enable');
  await send('DOM.enable');

  // 1. Ensure user is logged in
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'analyst@fraudtrace.local', password: 'Password123!' }),
  });
  const { token, user } = await loginRes.json();

  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('ft_token', '${token}');
      localStorage.setItem('ft_user', JSON.stringify(${JSON.stringify(user)}));
    `,
  });

  // 2. Navigate to /data
  console.log('Navigating to http://localhost:5173/data');
  await send('Page.navigate', { url: 'http://localhost:5173/data' });
  await new Promise((r) => setTimeout(r, 2000));

  // 3. Set file input using DataTransfer
  const filePath = 'C:\\Users\\siddh\\OneDrive\\Desktop\\FraudTrace\\scratch\\sample_with_errors.csv';
  const csvContent = fs.readFileSync(filePath, 'utf8');

  console.log('Injecting CSV file via DataTransfer and dispatching change event...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[type="file"]');
        if (!input) return false;
        const dt = new DataTransfer();
        const file = new File([${JSON.stringify(csvContent)}], 'sample_with_errors.csv', { type: 'text/csv' });
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return true;
      })()
    `,
  });

  await new Promise((r) => setTimeout(r, 500));

  // 4. Click Upload CSV button
  console.log('Clicking Upload CSV button...');
  await send('Runtime.evaluate', {
    expression: `
      const btns = Array.from(document.querySelectorAll('button'));
      const uploadBtn = btns.find(b => b.textContent.includes('Upload CSV'));
      if (uploadBtn && !uploadBtn.disabled) {
        uploadBtn.click();
      } else {
        console.error('Upload button not clickable', uploadBtn?.disabled);
      }
    `,
  });

  // Wait for upload result card to render
  console.log('Waiting for upload result...');
  await new Promise((r) => setTimeout(r, 5000));

  // Capture screenshot of Data page with upload result
  const mediaDir = 'C:\\Users\\siddh\\.gemini\\antigravity-ide\\brain\\231d4a07-6c17-4efc-8ddd-8ccab3e6613c\\.tempmediaStorage';
  if (!fs.existsSync(mediaDir)) {
    fs.mkdirSync(mediaDir, { recursive: true });
  }

  const dataShot = await send('Page.captureScreenshot', { format: 'png' });
  const dataShotPath = path.join(mediaDir, '05_data_page_upload_result.png');
  fs.writeFileSync(dataShotPath, Buffer.from(dataShot.data, 'base64'));
  console.log('Saved Data page screenshot:', dataShotPath);

  // 5. Navigate to /alerts
  console.log('Navigating to http://localhost:5173/alerts');
  await send('Page.navigate', { url: 'http://localhost:5173/alerts' });
  await new Promise((r) => setTimeout(r, 2000));

  // Click on inspect button of first alert
  console.log('Opening Triage Drawer for first alert...');
  await send('Runtime.evaluate', {
    expression: `
      const inspectBtn = document.querySelector('button[aria-label="Inspect alert"]') || document.querySelector('tbody tr');
      if (inspectBtn) inspectBtn.click();
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Capture screenshot of Alerts Triage Drawer
  const alertsShot = await send('Page.captureScreenshot', { format: 'png' });
  const alertsShotPath = path.join(mediaDir, '06_alerts_triage_drawer.png');
  fs.writeFileSync(alertsShotPath, Buffer.from(alertsShot.data, 'base64'));
  console.log('Saved Alerts Triage Drawer screenshot:', alertsShotPath);

  ws.close();
  console.log('Verification screenshots successfully captured.');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
