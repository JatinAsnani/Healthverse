import { spawn } from 'child_process';

const edge = spawn('C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', [
  '--headless=new',
  '--remote-debugging-port=9228',
  'http://localhost:5173/login'
]);

setTimeout(async () => {
  try {
    const list = await fetch('http://localhost:9228/json/list').then(r => r.json());
    const pageTab = list.find(t => t.type === 'page');

    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: "const btns = Array.from(document.querySelectorAll('button')); const d1 = btns.find(b => b.innerText.includes('Doctor 1')); if (d1) d1.click(); 'CLICKED';"
        }
      }));
    };
    ws.onmessage = (msg) => {
      const data = JSON.parse(msg.data);
      if (data.id === 1) {
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 2,
            method: 'Runtime.evaluate',
            params: { expression: 'document.body.innerText' }
          }));
        }, 1500);
      }
      if (data.id === 2) {
        console.log('=== DOCTOR DASHBOARD CONTENT ===');
        console.log(data.result?.result?.value);
        console.log('=== END CONTENT ===');
        ws.close();
        edge.kill();
        process.exit(0);
      }
    };
  } catch (e) {
    console.error('Error:', e.message);
    edge.kill();
    process.exit(1);
  }
}, 3000);
