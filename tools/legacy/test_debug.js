const http = require('http');
const { exec } = require('child_process');

const chromeProc = exec(`"C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe" --headless --remote-debugging-port=9333 --window-size=375,812 http://localhost:8085/biblia.html`);

setTimeout(() => {
  http.get('http://localhost:9333/json', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      const tabs = JSON.parse(data);
      const wsUrl = tabs[0].webSocketDebuggerUrl;
      const WebSocket = require('ws'); // wait, is ws installed?
    });
  });
}, 2000);
