const WebSocket = require('../backend/node_modules/ws');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/siddh/.gemini/antigravity-ide/brain/231d4a07-6c17-4efc-8ddd-8ccab3e6613c';

async function testCasesUI() {
  const tabs = await fetch('http://localhost:9222/json').then(r => r.json());
  const tab = tabs.find(t => t.url.includes('5173'));
  if (!tab) throw new Error('No 5173 tab found!');

  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.on('message', (data) => {
    const msg = JSON.parse(data);
    if (msg.id && callbacks.has(msg.id)) {
      const { resolve, reject } = callbacks.get(msg.id);
      callbacks.delete(msg.id);
      if (msg.error) reject(msg.error);
      else resolve(msg.result);
    }
  });

  await new Promise(r => ws.on('open', r));
  console.log('Connected to CDP');
  await send('Page.enable');
  await send('Runtime.enable');
  await send('Runtime.evaluate', { expression: `window.location.href = 'http://localhost:5173/cases'` });
  await new Promise(r => setTimeout(r, 1500));

  // Capture /cases screenshot
  const shotCases = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'cases_list_page.png'), Buffer.from(shotCases.data, 'base64'));
  console.log('Saved cases_list_page.png');

  // Inspect Cases list table
  const tableData = await send('Runtime.evaluate', {
    expression: `(() => {
      const rows = Array.from(document.querySelectorAll('tbody tr'));
      return rows.map(r => ({
        caseNumber: r.querySelector('td:nth-child(1)')?.innerText.trim(),
        title: r.querySelector('td:nth-child(2)')?.innerText.trim(),
        status: r.querySelector('td:nth-child(3)')?.innerText.trim(),
        disposition: r.querySelector('td:nth-child(4)')?.innerText.trim(),
        alerts: r.querySelector('td:nth-child(5)')?.innerText.trim(),
        createdBy: r.querySelector('td:nth-child(6)')?.innerText.trim(),
      }));
    })()`,
    returnByValue: true
  });
  console.log('--- Cases List Table ---');
  console.log(JSON.stringify(tableData.result.value, null, 2));

  // 2. Click the first row to navigate to Case Detail
  await send('Runtime.evaluate', {
    expression: `document.querySelector('tbody tr').click()`
  });
  await new Promise(r => setTimeout(r, 1500));

  const detailUrl = await send('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  console.log('Navigated to Case Detail URL:', detailUrl.result.value);

  // 3. Capture Case Detail screenshot
  const shotDetail = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_detail_page.png'), Buffer.from(shotDetail.data, 'base64'));
  console.log('Saved case_detail_page.png');

  // 4. Inspect Case Detail DOM
  const detailData = await send('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      return {
        title: h1?.innerText,
        badges: Array.from(h1?.parentElement?.querySelectorAll('span') || []).map(s => s.innerText.trim()),
        tabs: Array.from(document.querySelectorAll('button')).filter(b => b.innerText.includes('Attached Alerts') || b.innerText.includes('Investigation Notes') || b.innerText.includes('Audit Trail')).map(b => b.innerText.trim()),
        alertsCount: document.querySelectorAll('.space-y-3 > div').length
      };
    })()`,
    returnByValue: true
  });
  console.log('--- Case Detail DOM ---');
  console.log(JSON.stringify(detailData.result.value, null, 2));

  // 5. Click Audit Trail Tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Audit Trail'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 1000));

  // Capture Audit Trail screenshot
  const shotAudit = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_audit_trail.png'), Buffer.from(shotAudit.data, 'base64'));
  console.log('Saved case_audit_trail.png');

  // Inspect Audit Trail items
  const auditData = await send('Runtime.evaluate', {
    expression: `(() => {
      return Array.from(document.querySelectorAll('.font-mono.font-bold')).map(el => el.innerText.trim());
    })()`,
    returnByValue: true
  });
  console.log('Audit events rendered in UI:', auditData.result.value);

  // 6. Test Direct Hard Reload on Case Detail
  console.log('Testing page reload persistence...');
  await send('Runtime.evaluate', { expression: 'location.reload()' });
  await new Promise(r => setTimeout(r, 2000));

  const reloadedData = await send('Runtime.evaluate', {
    expression: `(() => {
      const h1 = document.querySelector('h1');
      return {
        url: window.location.href,
        title: h1?.innerText,
        badges: Array.from(h1?.parentElement?.querySelectorAll('span') || []).map(s => s.innerText.trim()),
      };
    })()`,
    returnByValue: true
  });
  console.log('Reloaded Page State:', reloadedData.result.value);

  // Capture reloaded screenshot
  const shotReloaded = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_detail_reloaded.png'), Buffer.from(shotReloaded.data, 'base64'));
  console.log('Saved case_detail_reloaded.png');

  ws.close();
  process.exit(0);
}

testCasesUI().catch(err => { console.error('Error:', err); process.exit(1); });
