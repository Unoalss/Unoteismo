import subprocess, time, json, urllib.request

# Start Chrome with remote debugging
cmd = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "--headless=new",
    "--remote-debugging-port=9222",
    "--window-size=375,812",
    "http://localhost:8085/biblia.html"
]
proc = subprocess.Popen(cmd)
time.sleep(2)

try:
    with urllib.request.urlopen("http://localhost:9222/json") as r:
        tabs = json.loads(r.read().decode())
    ws_url = tabs[0]["webSocketDebuggerUrl"]

    import socket
    # We can use simple websocket client via Python
    import sys
    print("Chrome started successfully on 9222")
finally:
    proc.terminate()
