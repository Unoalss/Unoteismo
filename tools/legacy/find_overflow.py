import subprocess, json

# We can run Chrome with --dump-dom or evaluate javascript via a test page or simple script
script = """
const all = document.querySelectorAll('*');
const bad = [];
for (const el of all) {
  if (el.scrollWidth > 375 || el.offsetWidth > 375) {
    bad.push({
      tag: el.tagName,
      id: el.id,
      className: el.className,
      offsetWidth: el.offsetWidth,
      scrollWidth: el.scrollWidth
    });
  }
}
console.log(JSON.stringify(bad.slice(0, 15)));
"""

cmd = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "--headless=new",
    "--disable-gpu",
    "--window-size=375,812",
    "http://localhost:8085/biblia.html"
]

# Let's create a small html file that tests this
test_html = f"""
<!DOCTYPE html>
<html>
<body>
<iframe src="http://localhost:8085/biblia.html" style="width:375px;height:812px;border:none;"></iframe>
<script>
window.addEventListener('load', () => {{
  setTimeout(() => {{
    const doc = document.querySelector('iframe').contentDocument;
    const all = doc.querySelectorAll('*');
    const bad = [];
    for (const el of all) {{
      if (el.scrollWidth > 375 || el.offsetWidth > 375) {{
        bad.push({{
          tag: el.tagName,
          id: el.id,
          className: el.className,
          offsetWidth: el.offsetWidth,
          scrollWidth: el.scrollWidth
        }});
      }}
    }}
    console.log('OVERFLOW_ELEMENTS:' + JSON.stringify(bad));
  }}, 1000);
}});
</script>
</body>
</html>
"""
with open('test_overflow.html', 'w', encoding='utf-8') as f:
    f.write(test_html)

out = subprocess.run([
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    "--headless=new",
    "--disable-gpu",
    "--enable-logging",
    "--v=1",
    "test_overflow.html"
], capture_output=True, text=True, timeout=10)

print("Stdout:", out.stdout)
print("Stderr:", out.stderr)
