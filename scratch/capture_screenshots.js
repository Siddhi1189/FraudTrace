import fs from 'fs';

async function main() {
  const targetsRes = await fetch('http://localhost:9222/json');
  const targets = await targetsRes.json();
  const page = targets.find((t) => t.type === 'page' && t.url.includes('localhost:5173')) || targets.find((t) => t.type === 'page');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let msgId = 1;

  const send = (method, params = {}) => new Promise((resolve, reject) => {
    const cur = msgId++;
    const handler = (e) => {
      const d = JSON.parse(e.data);
      if (d.id === cur) {
        ws.removeEventListener('message', handler);
        if (d.error) reject(d.error);
        else resolve(d.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id: cur, method, params }));
  });

  await new Promise((r) => (ws.onopen = r));
  console.log('Connected to Chrome CDP:', page.url);

  await send('Page.enable');
  await send('Runtime.enable');

  // Get analyst auth token
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'analyst@fraudtrace.local', password: 'Password123!' }),
  });
  const { token, user } = await loginRes.json();

  // Navigate to /data
  console.log('Navigating to http://localhost:5173/data');
  await send('Page.navigate', { url: 'http://localhost:5173/data' });
  await new Promise((r) => setTimeout(r, 2000));

  // Set auth tokens in localStorage and reload if needed
  await send('Runtime.evaluate', {
    expression: `
      localStorage.setItem('ft_token', '${token}');
      localStorage.setItem('ft_user', JSON.stringify(${JSON.stringify(user)}));
    `,
  });

  // Inject CSV file and click Upload
  const csvFile = 'c:\\Users\\siddh\\OneDrive\\Desktop\\FraudTrace\\scratch\\sample_with_errors.csv';
  const csvText = fs.readFileSync(csvFile, 'utf8');

  console.log('Injecting CSV file and triggering upload...');
  const uploadEval = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const input = document.querySelector('input[type="file"]');
        if (!input) return 'file input not found';
        const file = new File([${JSON.stringify(csvText)}], 'sample_with_errors.csv', { type: 'text/csv' });
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return 'file set';
      })()
    `,
  });
  console.log('File injection result:', uploadEval.value);
  await new Promise((r) => setTimeout(r, 500));

  // Click Upload CSV button
  const clickEval = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const btn = btns.find(b => b.textContent.includes('Upload CSV'));
        if (!btn) return 'btn not found';
        btn.click();
        return 'clicked';
      })()
    `,
  });
  console.log('Click result:', clickEval.value);

  // Wait for upload response to render in UI
  await new Promise((r) => setTimeout(r, 2500));

  // Screenshot 1: Data Page Upload Result
  const mediaDir = 'C:\\Users\\siddh\\.gemini\\antigravity-ide\\brain\\231d4a07-6c17-4efc-8ddd-8ccab3e6613c\\.tempmediaStorage';
  const dataShot = await send('Page.captureScreenshot', { format: 'png' });
  const dataShotPath = `${mediaDir}\\25_data_page_csv_upload_result.png`;
  fs.writeFileSync(dataShotPath, Buffer.from(dataShot.data, 'base64'));
  console.log('Captured Data Page CSV upload result:', dataShotPath);

  // Navigate to /alerts
  console.log('Navigating to http://localhost:5173/alerts');
  await send('Page.navigate', { url: 'http://localhost:5173/alerts' });
  await new Promise((r) => setTimeout(r, 2000));

  // Open first alert triage drawer
  console.log('Opening Triage Drawer...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const inspectBtn = document.querySelector('button[aria-label="Inspect alert"]') || document.querySelector('tbody tr');
        if (inspectBtn) inspectBtn.click();
      })()
    `,
  });
  await new Promise((r) => setTimeout(r, 1200));

  // Screenshot 2: Alerts Triage Drawer
  const alertsShot = await send('Page.captureScreenshot', { format: 'png' });
  const alertsShotPath = `${mediaDir}\\26_alerts_triage_drawer.png`;
  fs.writeFileSync(alertsShotPath, Buffer.from(alertsShot.data, 'base64'));
  console.log('Captured Alerts Triage Drawer screenshot:', alertsShotPath);

  ws.close();
  console.log('Done!');
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
