const { spawn } = require('child_process');

const chrome = spawn('C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', [
  '--headless=new',
  '--remote-debugging-port=9222',
  '--window-size=375,812',
  'http://localhost:8085/biblia.html'
]);

setTimeout(async () => {
  try {
    const res = await fetch('http://localhost:9222/json');
    const tabs = await res.json();
    const ws = new WebSocket(tabs[0].webSocketDebuggerUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({
        id: 1,
        method: 'Runtime.evaluate',
        params: {
          expression: `JSON.stringify({
            windowInnerWidth: window.innerWidth,
            bodyScrollWidth: document.body.scrollWidth,
            headerRect: document.querySelector('.biblia-header').getBoundingClientRect(),
            headerLeftRect: document.querySelector('.header-left').getBoundingClientRect(),
            headerRightRect: document.querySelector('.header-right').getBoundingClientRect(),
            headerCenterRect: document.querySelector('.header-center').getBoundingClientRect(),
            vmsRect: document.querySelector('.view-mode-selector').getBoundingClientRect(),
            tabs: Array.from(document.querySelectorAll('.mode-tab')).map(t => ({
              text: t.innerText,
              rect: t.getBoundingClientRect()
            }))
          })`,
          returnByValue: true
        }
      }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === 1) {
        console.log(JSON.stringify(msg));
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
}, 2000);
