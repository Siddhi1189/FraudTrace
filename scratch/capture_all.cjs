const WebSocket = require('../backend/node_modules/ws');
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/siddh/.gemini/antigravity-ide/brain/231d4a07-6c17-4efc-8ddd-8ccab3e6613c';

async function captureCaseWorkspace() {
  const ws = new WebSocket('ws://localhost:9222/devtools/page/B56FBE354F410B3208C06E81F0BE3489');
  let id = 1;
  const callbacks = new Map();

  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const msgId = id++;
      callbacks.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params }));
    });
  }

  ws.on('message', (d) => {
    try {
      const msg = JSON.parse(d.toString());
      if (msg.id && callbacks.has(msg.id)) {
        callbacks.get(msg.id).resolve(msg.result);
        callbacks.delete(msg.id);
      }
    } catch {}
  });

  await new Promise(r => ws.on('open', r));

  // 1. Ensure on /cases
  await send('Runtime.evaluate', { expression: `window.location.href = 'http://localhost:5173/cases'` });
  await new Promise(r => setTimeout(r, 1200));

  // 2. Click first row to navigate to case detail
  await send('Runtime.evaluate', { expression: `document.querySelector('tbody tr')?.click()` });
  await new Promise(r => setTimeout(r, 1200));

  // Capture Case Detail (Attached Alerts tab)
  const shotDetail = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_detail_page.png'), Buffer.from(shotDetail.data, 'base64'));
  console.log('Saved case_detail_page.png!');

  // 3. Click Investigation Notes tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Investigation Notes'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const shotNotes = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_detail_notes.png'), Buffer.from(shotNotes.data, 'base64'));
  console.log('Saved case_detail_notes.png!');

  // 4. Click Audit Trail tab
  await send('Runtime.evaluate', {
    expression: `(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Audit Trail'));
      if (btn) btn.click();
    })()`
  });
  await new Promise(r => setTimeout(r, 800));

  const shotAudit = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_audit_trail.png'), Buffer.from(shotAudit.data, 'base64'));
  console.log('Saved case_audit_trail.png!');

  // 5. Navigate to /alerts and open drawer with Escalate to Case
  await send('Runtime.evaluate', { expression: `window.location.href = 'http://localhost:5173/alerts'` });
  await new Promise(r => setTimeout(r, 1200));

  await send('Runtime.evaluate', { expression: `document.querySelector('tbody tr')?.click()` });
  await new Promise(r => setTimeout(r, 800));

  const shotAlerts = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'alert_case_escalation_drawer.png'), Buffer.from(shotAlerts.data, 'base64'));
  console.log('Saved alert_case_escalation_drawer.png!');

  ws.close();
  process.exit(0);
}

captureCaseWorkspace().catch(e => { console.error(e); process.exit(1); });
