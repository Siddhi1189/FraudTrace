const WebSocket = require(require('path').join(__dirname, '../backend/node_modules/ws'));
const fs = require('fs');

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

  await send('Runtime.evaluate', {
    expression: 'document.querySelectorAll("tbody tr")[0]?.click()'
  });
  await new Promise(r => setTimeout(r, 1200));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync('C:/Users/siddh/.gemini/antigravity-ide/brain/231d4a07-6c17-4efc-8ddd-8ccab3e6613c/alert_case_escalation_drawer.png', Buffer.from(shot.data, 'base64'));
  console.log('Saved alert_case_escalation_drawer.png!');

  ws.close();
  process.exit(0);
}

main().catch(console.error);
