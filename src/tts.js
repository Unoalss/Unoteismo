// Edge TTS Client para Cloudflare Workers
// Vozes Neurais gratuitas da Microsoft em alta definição

const TRUSTED_CLIENT_TOKEN = "6A5AA1D4EAFF4E9FB37E23D68491D6F4";
const READALOUD_BASE = "speech.platform.bing.com/consumer/speech/synthesize/readaloud";
const SYNTHESIS_URL = `https://${READALOUD_BASE}/edge/v1`;
const CHROMIUM_FULL_VERSION = "143.0.3650.75";
const CHROMIUM_MAJOR_VERSION = CHROMIUM_FULL_VERSION.split(".")[0];
const SEC_MS_GEC_VERSION = `1-${CHROMIUM_FULL_VERSION}`;

const BASE_HEADERS = {
  "User-Agent": `Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${CHROMIUM_MAJOR_VERSION}.0.0.0 Safari/537.36 Edg/${CHROMIUM_MAJOR_VERSION}.0.0.0`,
  "Accept-Language": "en-US,en;q=0.9",
};

const UPGRADE_HEADERS = {
  ...BASE_HEADERS,
  "Accept-Encoding": "gzip, deflate, br, zstd",
  Pragma: "no-cache",
  "Cache-Control": "no-cache",
  Origin: "chrome-extension://jdiccldimpdaibmpdkjnbmckianbfold",
  "Sec-WebSocket-Version": "13",
  Upgrade: "websocket",
};

function normalizeVoiceName(voice) {
  const v = (voice || "pt-BR-AntonioNeural").trim();
  if (v.includes("Microsoft Server Speech")) return v;
  
  const shortMatch = /^([a-z]{2,})-([A-Z]{2,})-(.+Neural)$/.exec(v);
  if (!shortMatch) return v;

  const [, lang, region, name] = shortMatch;
  return `Microsoft Server Speech Text to Speech Voice (${lang}-${region}, ${name})`;
}

function escapeXml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function removeInvalidXmlCharacters(text) {
  return (text || "").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/g, " ");
}

function makeConnectionId() {
  return crypto.randomUUID().replace(/-/g, "");
}

function makeMuid() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

async function makeSecMsGec() {
  const winEpoch = 11644473600;
  const secondsToNs = 1e9;
  let ticks = Date.now() / 1000;
  ticks += winEpoch;
  ticks -= ticks % 300;
  ticks *= secondsToNs / 100;
  const payload = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(payload));
  return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}

function dateToString() {
  const d = new Date();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dayName = days[d.getUTCDay()];
  const monthName = months[d.getUTCMonth()];
  const day = String(d.getUTCDate()).padStart(2, '0');
  const year = d.getUTCFullYear();
  const hours = String(d.getUTCHours()).padStart(2, '0');
  const mins = String(d.getUTCMinutes()).padStart(2, '0');
  const secs = String(d.getUTCSeconds()).padStart(2, '0');
  return `${dayName} ${monthName} ${day} ${year} ${hours}:${mins}:${secs} GMT+0000 (Coordinated Universal Time)`;
}

function buildSpeechConfigMessage() {
  return (
    `X-Timestamp:${dateToString()}\r\n` +
    "Content-Type:application/json; charset=utf-8\r\n" +
    "Path:speech.config\r\n\r\n" +
    '{"context":{"synthesis":{"audio":{"metadataoptions":{"sentenceBoundaryEnabled":"false","wordBoundaryEnabled":"false"},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}\r\n'
  );
}

function buildSsmlMessage(requestId, voice, text, speedRate = "+0%") {
  const ssml =
    "<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>" +
    `<voice name='${voice}'><prosody pitch='+0Hz' rate='${speedRate}' volume='+0%'>${escapeXml(
      removeInvalidXmlCharacters(text)
    )}</prosody></voice></speak>`;

  return (
    `X-RequestId:${requestId}\r\n` +
    "Content-Type:application/ssml+xml\r\n" +
    `X-Timestamp:${dateToString()}Z\r\n` +
    "Path:ssml\r\n\r\n" +
    ssml
  );
}

function parseTextHeaders(message) {
  const separator = message.indexOf("\r\n\r\n");
  const headerText = separator >= 0 ? message.slice(0, separator) : message;
  const headers = {};
  for (const line of headerText.split("\r\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      headers[line.slice(0, colonIndex)] = line.slice(colonIndex + 1).trim();
    }
  }
  return headers;
}

function parseBinaryAudioFrame(data) {
  if (data.length < 2) throw new Error("binary frame too short");
  const headerLength = (data[0] << 8) | data[1];
  if (data.length < 2 + headerLength) throw new Error("binary frame truncated");
  const headerText = new TextDecoder().decode(data.slice(2, 2 + headerLength));
  const headers = {};
  for (const line of headerText.split("\r\n")) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      headers[line.slice(0, colonIndex)] = line.slice(colonIndex + 1).trim();
    }
  }
  return {
    headers,
    body: data.slice(2 + headerLength)
  };
}

export async function createAudioStream(text, voice = "pt-BR-AntonioNeural", rate = 1.0) {
  const secMsGec = await makeSecMsGec();
  const connectionId = makeConnectionId();
  const url = new URL(SYNTHESIS_URL);
  url.searchParams.set("TrustedClientToken", TRUSTED_CLIENT_TOKEN);
  url.searchParams.set("Sec-MS-GEC", secMsGec);
  url.searchParams.set("Sec-MS-GEC-Version", SEC_MS_GEC_VERSION);
  url.searchParams.set("ConnectionId", connectionId);

  const response = await fetch(url.toString(), {
    headers: {
      ...UPGRADE_HEADERS,
      Cookie: `muid=${makeMuid()};`,
    },
  });

  if (!response.webSocket) {
    const errText = await response.text().catch(() => "");
    throw new Error(`WebSocket upgrade failed with status ${response.status}: ${errText}`);
  }

  const socket = response.webSocket;
  const normalizedVoice = normalizeVoiceName(voice);
  const requestId = makeConnectionId();

  // Calcular taxa de velocidade em formato SSML (ex: "+25%", "-10%")
  let speedRate = "+0%";
  if (rate !== 1.0) {
    const pct = Math.round((rate - 1.0) * 100);
    speedRate = pct >= 0 ? `+${pct}%` : `${pct}%`;
  }

  return new ReadableStream({
    start(controller) {
      let settled = false;

      const finish = () => {
        if (settled) return;
        settled = true;
        try { socket.close(); } catch (_) {}
        controller.close();
      };

      const finishWithError = (err) => {
        if (settled) return;
        settled = true;
        try { socket.close(); } catch (_) {}
        controller.error(err);
      };

      socket.addEventListener("message", async (event) => {
        if (settled) return;
        const data = event.data;

        if (typeof data === "string") {
          const headers = parseTextHeaders(data);
          if (headers.Path === "turn.end") {
            finish();
          }
          return;
        }

        // Dados binários (áudio MP3)
        let bytes;
        if (data instanceof ArrayBuffer) {
          bytes = new Uint8Array(data);
        } else if (data instanceof Uint8Array) {
          bytes = data;
        } else if (typeof Blob !== "undefined" && data instanceof Blob) {
          bytes = new Uint8Array(await data.arrayBuffer());
        }

        if (bytes) {
          try {
            const frame = parseBinaryAudioFrame(bytes);
            if (frame.headers.Path === "audio" && frame.body.length > 0) {
              controller.enqueue(frame.body);
            }
          } catch (e) {
            finishWithError(e);
          }
        }
      });

      socket.addEventListener("close", () => {
        finish();
      });

      socket.addEventListener("error", (e) => {
        finishWithError(new Error("WebSocket error in TTS stream"));
      });

      socket.accept();
      socket.send(buildSpeechConfigMessage());
      socket.send(buildSsmlMessage(requestId, normalizedVoice, text, speedRate));
    },
    cancel() {
      try { socket.close(); } catch (_) {}
    }
  });
}
