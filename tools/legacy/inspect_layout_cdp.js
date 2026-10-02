const { spawn } = require('child_process');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--window-size=375,812'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ id: 1, method: 'Page.enable' }));
      ws.send(JSON.stringify({ id: 2, method: 'Page.navigate', params: { url: 'http://localhost:8085/biblia.html' } }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.method === 'Page.loadEventFired') {
        setTimeout(() => {
          ws.send(JSON.stringify({
            id: 3,
            method: 'Runtime.evaluate',
            params: {
              expression: `(() => {
                const el = (sel) => document.querySelector(sel);
                const rect = (sel) => {
                  const e = el(sel);
                  if (!e) return null;
                  const r = e.getBoundingClientRect();
                  return { left: Math.round(r.left), top: Math.round(r.top), width: Math.round(r.width), height: Math.round(r.height), right: Math.round(r.right) };
                };
                return JSON.stringify({
                  windowWidth: window.innerWidth,
                  bodyScrollWidth: document.body.scrollWidth,
                  header: rect('.biblia-header'),
                  left: rect('.header-left'),
                  right: rect('.header-right'),
                  center: rect('.header-center'),
                  vms: rect('.view-mode-selector'),
                  tabs: Array.from(document.querySelectorAll('.mode-tab')).map(t => ({
                    text: t.innerText.trim(),
                    display: window.getComputedStyle(t).display,
                    spanDisplay: window.getComputedStyle(t.querySelector('span')).display,
                    rect: { left: Math.round(t.getBoundingClientRect().left), width: Math.round(t.getBoundingClientRect().width) }
                  })),
                  rightButtons: Array.from(document.querySelectorAll('.header-right > *')).map(b => ({
                    tag: b.tagName,
                    id: b.id,
                    className: b.className,
                    rect: { left: Math.round(b.getBoundingClientRect().left), width: Math.round(b.getBoundingClientRect().width), right: Math.round(b.getBoundingClientRect().right) }
                  }))
                });
              })()`,
              returnByValue: true
            }
          }));
        }, 1500);
      }

      if (msg.id === 3) {
        console.log(JSON.stringify(JSON.parse(msg.result.result.value), null, 2));
        ws.close();
        chrome.kill();
        process.exit(0);
      }
    };
  } catch (err) {
    console.error(err);
    chrome.kill();
    process.exit(1);
  }
}, 1000);
