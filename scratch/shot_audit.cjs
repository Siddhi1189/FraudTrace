const WebSocket = require(require('path').resolve(__dirname, '../backend/node_modules/ws'));
const fs = require('fs');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/siddh/.gemini/antigravity-ide/brain/231d4a07-6c17-4efc-8ddd-8ccab3e6613c';

async function main() {
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

  // 1. Click Audit Trail tab
  await send('Runtime.evaluate', {
    expression: `Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Audit Trail'))?.click()`
  });
  await new Promise(r => setTimeout(r, 800));

  const shotAudit = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'case_audit_trail.png'), Buffer.from(shotAudit.data, 'base64'));
  console.log('Saved case_audit_trail.png!');

  // 2. Navigate to /alerts and open drawer
  await send('Runtime.evaluate', {
    expression: `window.location.href = 'http://localhost:5173/alerts'`
  });
  await new Promise(r => setTimeout(r, 1200));

  await send('Runtime.evaluate', {
    expression: `document.querySelector('tbody tr')?.click()`
  });
  await new Promise(r => setTimeout(r, 800));

  const shotAlerts = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(path.join(ARTIFACT_DIR, 'alert_case_escalation_drawer.png'), Buffer.from(shotAlerts.data, 'base64'));
  console.log('Saved alert_case_escalation_drawer.png!');

  ws.close();
  process.exit(0);
}

main().catch(console.error);
