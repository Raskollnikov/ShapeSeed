import { WORDLIST } from "./wordList.js";

if (WORDLIST.length !== 2048) {
  document.addEventListener("DOMContentLoaded", () => {
    document.body.innerHTML =
      '<div style="color:#ff3355;font-family:monospace;padding:40px;font-size:1.2rem">CRITICAL: WORDLIST INTEGRITY FAILURE (' +
      WORDLIST.length +
      "/2048). DO NOT USE THIS FILE.</div>";
  });
  throw new Error("WORDLIST integrity failure");
}

const ARGON2_KNOWN_GOOD =
  "e1f853e0267888fdfbcbc19716593599c261f060e2346a36d0ca213c1a273787";

async function argon2SelfTest() {
  const status = document.getElementById("selfTestStatus");
  try {
    const knownSalt = new Uint8Array(32);
    const result = await argon2.hash({
      pass: "ShapeSeedTest",
      salt: knownSalt,
      time: 3,
      mem: 65536,
      hashLen: 32,
      parallelism: 1,
      type: argon2.ArgonType.Argon2id,
    });
    const hex = Array.from(result.hash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (hex !== ARGON2_KNOWN_GOOD) {
      status.textContent = "ARGON2 FAIL";
      status.style.color = "var(--red)";
      document.body.innerHTML =
        '<div style="color:#ff3355;font-family:monospace;padding:40px;font-size:1.2rem">CRITICAL: ARGON2 SELF-TEST FAILED. DO NOT USE.</div>';
      throw new Error("Argon2 self-test failed");
    }
    status.textContent = "✓ ARGON2 OK";
    status.style.color = "var(--green)";
  } catch (err) {
    if (err.message !== "Argon2 self-test failed") {
      status.textContent = " ARGON2 ERROR";
      status.style.color = "var(--red)";
    }
    throw err;
  }
}

let COLS = 32,
  ROWS = 8;
let activeLayer = "A";
let isDrawing = false;
let paintValue = 1;
let brushSize = 1;
let eraseMode = false;
let showBitNums = false;
let currentMode = "basic";
let splitGuide = false;

let wipeTimer = null;
let wipeSeconds = 0;

function startWipeCountdown() {
  cancelWipe();
  wipeSeconds = 60;
  document.getElementById("wipeBar").classList.add("active");
  updateWipeDisplay();
  wipeTimer = setInterval(() => {
    wipeSeconds--;
    updateWipeDisplay();
    if (wipeSeconds <= 0) wipeOutput();
  }, 1000);
}

function updateWipeDisplay() {
  document.getElementById("wipeCountdown").textContent =
    `OUTPUT WIPES IN: ${wipeSeconds}s`;
}

function cancelWipe() {
  if (wipeTimer) {
    clearInterval(wipeTimer);
    wipeTimer = null;
  }
  document.getElementById("wipeBar").classList.remove("active");
}

function wipeOutput() {
  cancelWipe();
  document.getElementById("hexVal").textContent = "- wiped -";
  document.getElementById("binVal").textContent = "- wiped -";
  document.getElementById("wordGrid").innerHTML =
    '<span style="color:var(--dim);font-size:0.65rem">- output wiped -</span>';
  document.getElementById("stepDetail").textContent = "- wiped -";
  document.getElementById("saltInput").value = "";
  document.getElementById("wipeBar").classList.remove("active");
}

const layers = {
  A: new Uint8Array(256),
  B: new Uint8Array(256),
  NOISE: new Uint8Array(256),
};

const canvas = document.getElementById("mainCanvas");
const ctx = canvas.getContext("2d");

function bitIndex(col, row) {
  const linearPos = row * COLS + col;
  return 255 - linearPos;
}

function cellSize() {
  return canvas.width / COLS;
}

function resize() {
  const containerWidth = canvas.parentElement
    ? canvas.parentElement.clientWidth
    : window.innerWidth - 340;
  const minCellSize = 28;
  const naturalCellW = containerWidth / COLS;
  const cellW = Math.max(naturalCellW, minCellSize);
  canvas.width = Math.round(cellW * COLS);
  canvas.height = Math.round(cellW * ROWS);
  draw();
}

function toggleSplit() {
  splitGuide = !splitGuide;
  document.getElementById("btnSplit").classList.toggle("on", splitGuide);
  draw();
}

function canvasPos(evt) {
  const r = canvas.getBoundingClientRect();
  const scaleX = canvas.width / r.width;
  const scaleY = canvas.height / r.height;
  const x = (evt.clientX - r.left) * scaleX;
  const y = (evt.clientY - r.top) * scaleY;
  const cs = cellSize();
  const col = Math.max(0, Math.min(COLS - 1, Math.floor(x / cs)));
  const row = Math.max(0, Math.min(ROWS - 1, Math.floor(y / cs)));
  return { col, row };
}

const COLOR = {
  A: {
    lit: "#00ff41",
    fill: "rgba(0,60,15,0.9)",
    ghost: "rgba(0,255,65,0.09)",
  },
  B: {
    lit: "#cc55ff",
    fill: "rgba(50,0,80,0.9)",
    ghost: "rgba(180,60,255,0.09)",
  },
  NOISE: {
    lit: "#ffaa00",
    fill: "rgba(60,40,0,0.9)",
    ghost: "rgba(255,170,0,0.1)",
  },
};

function draw() {
  const cs = cellSize();
  ctx.fillStyle = "#0d110d";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (splitGuide) {
    const halfCols = Math.floor(COLS / 2);
    const halfRows = Math.floor(ROWS / 2);
    const midX = halfCols * cs;
    const midY = halfRows * cs;

    ctx.fillStyle = "rgba(0, 255, 65, 0.07)";
    ctx.fillRect(0, 0, midX, midY);

    ctx.fillStyle = "rgba(180, 60, 255, 0.10)";
    ctx.fillRect(midX, 0, canvas.width - midX, midY);

    ctx.fillStyle = "rgba(0, 255, 65, 0.04)";
    ctx.fillRect(0, midY, midX, canvas.height - midY);

    ctx.fillStyle = "rgba(180, 60, 255, 0.06)";
    ctx.fillRect(midX, midY, canvas.width - midX, canvas.height - midY);

    ctx.strokeStyle = "rgba(0, 229, 255, 0.6)";
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(midX, 0);
    ctx.lineTo(midX, canvas.height);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, midY);
    ctx.lineTo(canvas.width, midY);
    ctx.stroke();
    ctx.setLineDash([]);

    const labelSize = Math.max(11, Math.floor(cs * 0.52));
    ctx.font = `bold ${labelSize}px "Share Tech Mono",monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    ctx.fillStyle = "rgba(0, 255, 65, 0.6)";
    ctx.fillText("A ↖", midX * 0.5, midY * 0.35);

    ctx.fillStyle = "rgba(180, 60, 255, 0.65)";
    ctx.fillText("B ↗", midX + (canvas.width - midX) * 0.5, midY * 0.35);

    ctx.fillStyle = "rgba(0, 255, 65, 0.45)";
    ctx.fillText("A ↙", midX * 0.5, midY + (canvas.height - midY) * 0.35);

    ctx.fillStyle = "rgba(180, 60, 255, 0.5)";
    ctx.fillText(
      "B ↘",
      midX + (canvas.width - midX) * 0.5,
      midY + (canvas.height - midY) * 0.35,
    );
  }
  const fontSize = Math.max(5, Math.floor(cs * 0.28));
  ctx.font = `${fontSize}px "Share Tech Mono",monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const bitNum = bitIndex(col, row);
      const x = col * cs + 1,
        y = row * cs + 1,
        w = cs - 2,
        h = cs - 2;

      if (activeLayer === "MERGED") {
        const merged =
          layers.A[bitNum] ^ layers.B[bitNum] ^ layers.NOISE[bitNum];
        if (!merged) {
          ctx.fillStyle = "#0d110d";
          ctx.fillRect(x, y, w, h);
          ctx.strokeStyle = "rgba(0,255,65,0.12)";
          ctx.lineWidth = 0.5;
          ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
          continue;
        }
        const a = layers.A[bitNum],
          b = layers.B[bitNum],
          n = layers.NOISE[bitNum];
        ctx.fillStyle =
          a && !b && !n
            ? "#003c0f"
            : !a && b && !n
              ? "#320050"
              : !a && !b && n
                ? "#3c2800"
                : "#005055";
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = "#00e5ff";
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        continue;
      }

      ctx.fillStyle = "#0d110d";
      ctx.fillRect(x, y, w, h);

      if (activeLayer !== "A" && layers.A[bitNum]) {
        ctx.fillStyle = COLOR.A.ghost;
        ctx.fillRect(x, y, w, h);
      }
      if (activeLayer !== "B" && layers.B[bitNum]) {
        ctx.fillStyle = COLOR.B.ghost;
        ctx.fillRect(x, y, w, h);
      }
      if (activeLayer !== "NOISE" && layers.NOISE[bitNum]) {
        ctx.fillStyle = COLOR.NOISE.ghost;
        ctx.fillRect(x, y, w, h);
      }

      const val = layers[activeLayer][bitNum];
      if (val) {
        ctx.fillStyle = COLOR[activeLayer].fill;
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = COLOR[activeLayer].lit;
        ctx.lineWidth = 0.8;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        if (showBitNums) {
          ctx.fillStyle = "rgba(255,255,255,0.4)";
          ctx.fillText(bitNum, x + w / 2, y + h / 2);
        }
      } else {
        ctx.strokeStyle = "rgba(0,255,65,0.22)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
        if (showBitNums) {
          ctx.fillStyle = "rgba(0,255,65,0.2)";
          ctx.fillText(bitNum, x + w / 2, y + h / 2);
        }
      }
    }
  }

  if (activeLayer === "NOISE") {
    const corners = [
      { c: 0, r: 0 },
      { c: COLS - 1, r: 0 },
      { c: 0, r: ROWS - 1 },
      { c: COLS - 1, r: ROWS - 1 },
    ];
    corners.forEach(({ c, r }) => {
      for (let dr = -1; dr <= 2; dr++)
        for (let dc = -1; dc <= 2; dc++) {
          const cc = c + dc,
            rr = r + dr;
          if (
            cc < 0 ||
            cc >= COLS ||
            rr < 0 ||
            rr >= ROWS ||
            (cc === c && rr === r)
          )
            continue;
          ctx.fillStyle = "rgba(255,170,0,0.07)";
          ctx.fillRect(cc * cs, rr * cs, cs, cs);
        }
      ctx.strokeStyle = "rgba(255,170,0,0.35)";
      ctx.lineWidth = 1.2;
      ctx.strokeRect(c * cs + 0.5, r * cs + 0.5, cs - 1, cs - 1);
    });
  }

  updateUI();
  updateStamps();
}

function paintAt(col, row, val) {
  if (activeLayer === "MERGED") return;
  const layer = layers[activeLayer];

  let noiseRemaining = 0;
  if (activeLayer === "NOISE" && val === 1) {
    const currentCount = layer.reduce((s, v) => s + v, 0);
    noiseRemaining = Math.max(0, 10 - currentCount);
  }

  for (let dr = 0; dr < brushSize; dr++) {
    for (let dc = 0; dc < brushSize; dc++) {
      const cc = col + dc,
        rr = row + dr;
      if (cc < 0 || cc >= COLS || rr < 0 || rr >= ROWS) continue;
      const bNum = bitIndex(cc, rr);

      if (activeLayer === "NOISE" && val === 1) {
        if (layer[bNum] === 0) {
          if (noiseRemaining <= 0) continue;
          noiseRemaining--;
        }
      }
      layer[bNum] = val;
    }
  }
}

canvas.addEventListener("mousedown", (e) => {
  isDrawing = true;
  const { col, row } = canvasPos(e);
  const bNum = bitIndex(col, row);
  const currentVal = activeLayer !== "MERGED" ? layers[activeLayer][bNum] : 0;
  paintValue = eraseMode ? 0 : currentVal ? 0 : 1;
  paintAt(col, row, paintValue);
  draw();
});
canvas.addEventListener("mousemove", (e) => {
  const { col, row } = canvasPos(e);
  const bNum = bitIndex(col, row);
  document.getElementById("cursorInfo").textContent =
    `COL ${col + 1}  ROW ${row + 1}  BIT ${bNum}`;
  if (!isDrawing) return;
  paintAt(col, row, paintValue);
  draw();
});
canvas.addEventListener("mouseup", () => {
  isDrawing = false;
});
canvas.addEventListener("mouseleave", () => {
  isDrawing = false;
});

canvas.addEventListener(
  "touchstart",
  (e) => {
    e.preventDefault();
    const t = e.touches[0];
    canvas.dispatchEvent(
      Object.assign(new MouseEvent("mousedown"), {
        clientX: t.clientX,
        clientY: t.clientY,
      }),
    );
  },
  { passive: false },
);
canvas.addEventListener(
  "touchmove",
  (e) => {
    e.preventDefault();
    const t = e.touches[0];
    canvas.dispatchEvent(
      Object.assign(new MouseEvent("mousemove"), {
        clientX: t.clientX,
        clientY: t.clientY,
      }),
    );
  },
  { passive: false },
);
canvas.addEventListener("touchend", () =>
  canvas.dispatchEvent(new MouseEvent("mouseup")),
);

function setLayer(l) {
  activeLayer = l;
  document.querySelectorAll(".ltab").forEach((t) => t.classList.remove("on"));
  const map = {
    A: "la",
    B: "lb",
    NOISE: "lnoise",
    MERGED: "lmerged",
  };
  document.querySelector(".ltab." + map[l]).classList.add("on");
  const labels = {
    A: "LAYER A - SHAPE 1",
    B: "LAYER B - SHAPE 2",
    NOISE: "NOISE ANCHORS (MAX 10)",
    MERGED: "MERGED PREVIEW (A⊕B⊕NOISE)",
  };
  document.getElementById("layerLabel").textContent = labels[l];
  draw();
}
function setBrush(n) {
  brushSize = n;
  [1, 2, 3].forEach((i) =>
    document.getElementById("brush" + i).classList.remove("on"),
  );
  document.getElementById("brush" + n).classList.add("on");
  draw();
}
function toggleErase() {
  eraseMode = !eraseMode;
  document.getElementById("btnErase").classList.toggle("on", eraseMode);
}
function toggleShowBits() {
  showBitNums = !showBitNums;
  document.getElementById("btnShowBits").classList.toggle("on", showBitNums);
  draw();
}
function setGridMode(cols, rows) {
  const totalBits = Object.values(layers).reduce(
    (s, l) => s + l.reduce((a, b) => a + b, 0),
    0,
  );
  if (totalBits > 0) {
    if (!confirm("Switching grid clears all layers. Continue?")) return;
    Object.values(layers).forEach((l) => l.fill(0));
  }
  COLS = cols;
  ROWS = rows;

  document.getElementById("btn32").classList.toggle("on", cols === 32);
  document.getElementById("btn16").classList.toggle("on", cols === 16);
  resize();
}
function setMode(m) {
  currentMode = m;
  document.getElementById("modeBasic").classList.toggle("on", m === "basic");
  document.getElementById("modeAdv").classList.toggle("on", m === "advanced");
  document.getElementById("advPanel").style.display =
    m === "advanced" ? "block" : "none";
}

function clearCurrentLayer() {
  if (activeLayer === "MERGED") return;
  layers[activeLayer].fill(0);
  draw();
}
function clearAll() {
  Object.values(layers).forEach((l) => l.fill(0));
  draw();
}

function estimateEntropy(bits) {
  const ones = bits.reduce((s, v) => s + v, 0);
  if (ones === 0 || ones === 256) return 0;
  const p1 = ones / 256,
    p0 = 1 - p1;
  const shannon = -(p1 * Math.log2(p1) + p0 * Math.log2(p0));
  let base = Math.round(shannon * 256 * 0.65);
  let transitions = 0;
  for (let i = 1; i < 256; i++) if (bits[i] !== bits[i - 1]) transitions++;
  const bonus = Math.min(transitions * 0.25, 45);
  const hwPenalty = (Math.abs(ones - 128) / 128) * 18;
  return Math.max(0, Math.min(256, Math.round(base + bonus - hwPenalty)));
}

function updateEntropy() {
  if (currentMode === "advanced") {
    document.getElementById("entBar").style.width = "100%";
    document.getElementById("entBar").style.background = "var(--purple)";
    document.getElementById("entVal").textContent = "256 bits (Argon2id)";
    document.getElementById("entWarn").style.color = "var(--purple)";
    document.getElementById("entWarn").textContent =
      "ARGON2ID ACTIVE - output is 256-bit regardless of drawing";
    return;
  }
  const merged = getMergedBits();
  const ent = estimateEntropy(merged);
  const pct = Math.min((ent / 256) * 100, 100);
  const bar = document.getElementById("entBar");
  const val = document.getElementById("entVal");
  const warn = document.getElementById("entWarn");
  val.textContent = `~${ent} bits`;
  bar.style.width = pct + "%";
  if (ent < 50) {
    bar.style.background = "var(--red)";
    warn.style.color = "var(--red)";
    warn.textContent = "WEAK - simple geometric shape, easily enumerable";
  } else if (ent < 90) {
    bar.style.background = "var(--amber)";
    warn.style.color = "var(--amber)";
    warn.textContent = "◆ MODERATE - add Layer B complexity or more noise";
  } else if (ent < 140) {
    bar.style.background = "#88ff00";
    warn.style.color = "#88ff00";
    warn.textContent = "✓ GOOD - personal shape with solid complexity";
  } else {
    bar.style.background = "var(--green)";
    warn.style.color = "var(--green)";
    warn.textContent = "✓ STRONG - multi-layer pattern, excellent entropy";
  }
}

function updateUI() {
  const merged = getMergedBits();
  const bits = merged.reduce((s, v) => s + v, 0);
  document.getElementById("bitsSetLabel").textContent = bits + " / 256 BITS";
  const nc = layers.NOISE.reduce((s, v) => s + v, 0);
  document.getElementById("noiseCount").textContent = nc + "/10";

  const noiseList = document.getElementById("noiseBitList");
  const placedBits = [];
  for (let i = 0; i < 256; i++) {
    if (layers.NOISE[i]) placedBits.push(i);
  }
  if (placedBits.length === 0) {
    noiseList.textContent = "- no noise bits placed -";
  } else {
    placedBits.sort((a, b) => b - a);
    noiseList.innerHTML = placedBits
      .map((b) => `<span style="color:var(--amber)">bit ${b}</span>`)
      .join(" · ");
  }
  updateEntropy();
}

function renderStamp(id, bits, color) {
  const c = document.getElementById(id);
  const cx = c.getContext("2d");
  cx.fillStyle = "#0d110d";
  cx.fillRect(0, 0, c.width, c.height);
  const cw = c.width / COLS,
    ch = c.height / ROWS;
  for (let bitNum = 0; bitNum < 256; bitNum++) {
    if (bits[bitNum]) {
      const linearPos = 255 - bitNum;
      const col = linearPos % COLS,
        row = Math.floor(linearPos / COLS);
      cx.fillStyle = color;
      cx.fillRect(col * cw, row * ch, cw, ch);
    }
  }
}

function updateStamps() {
  renderStamp("stampA", layers.A, "#00ff41");
  renderStamp("stampB", layers.B, "#cc55ff");
  renderStamp("stampN", layers.NOISE, "#ffaa00");
  renderStamp("stampM", getMergedBits(), "#00e5ff");
}

function saveStamp() {
  const bits = getMergedBits();
  const CS = 10;
  const out = document.createElement("canvas");
  out.width = COLS * CS;
  out.height = ROWS * CS;
  const ox = out.getContext("2d");
  ox.fillStyle = "#0d110d";
  ox.fillRect(0, 0, out.width, out.height);
  for (let bitNum = 0; bitNum < 256; bitNum++) {
    if (bits[bitNum]) {
      const linearPos = 255 - bitNum;
      const col = linearPos % COLS;
      const row = Math.floor(linearPos / COLS);
      ox.fillStyle = "#00e5ff";
      ox.fillRect(col * CS, row * CS, CS - 1, CS - 1);
    }
  }
  const a = document.createElement("a");
  a.download = "shapeseed-merged-key.png";
  a.href = out.toDataURL();
  a.click();
}

function getMergedBits() {
  const m = new Uint8Array(256);
  for (let i = 0; i < 256; i++)
    m[i] = layers.A[i] ^ layers.B[i] ^ layers.NOISE[i];
  return m;
}

function bitsToBytes(bits) {
  const bytes = new Uint8Array(32);
  for (let byteIdx = 0; byteIdx < 32; byteIdx++) {
    let byte = 0;
    for (let bitInByte = 0; bitInByte < 8; bitInByte++) {
      const bitNum = 255 - (byteIdx * 8 + bitInByte);
      byte = (byte << 1) | (bits[bitNum] ? 1 : 0);
    }
    bytes[byteIdx] = byte;
  }
  return bytes;
}

function toBinStr(bits) {
  let s = "";
  for (let bitNum = 255; bitNum >= 0; bitNum--) {
    if ((255 - bitNum) % 8 === 0 && bitNum < 255) s += " ";
    s += bits[bitNum];
  }
  return s;
}

function showOutTab(tab, el) {
  ["Hex", "Words", "Steps"].forEach((t) => {
    document.getElementById("out" + t).style.display = "none";
  });
  document.querySelectorAll(".otab").forEach((t) => t.classList.remove("on"));
  document.getElementById("out" + tab).style.display = "block";
  el.classList.add("on");
}

async function sha256(buf) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", buf));
}

async function deriveKey() {
  const btn = document.getElementById("btnDerive");
  btn.textContent = currentMode === "advanced" ? "HASHING..." : "DERIVE KEY";
  btn.style.opacity = "0.6";
  btn.style.pointerEvents = "none";
  await new Promise((r) => setTimeout(r, 10));

  try {
    const merged = getMergedBits();
    const pin = document.getElementById("saltInput").value.trim();
    let entropyBits;
    let derivationNote;

    if (currentMode === "advanced") {
      const xorBytes = bitsToBytes(merged);

      if (!pin) {
        document.getElementById("stepDetail").innerHTML =
          '<span style="color:var(--red)"> ADVANCED MODE REQUIRES A PIN. Enter a PIN first.</span>';
        showOutTab("Steps", document.querySelectorAll(".otab")[2]);
        return;
      }

      const argon2Result = await argon2.hash({
        pass: pin,
        salt: xorBytes,
        time: 3,
        mem: 65536,
        hashLen: 32,
        parallelism: 1,
        type: argon2.ArgonType.Argon2id,
      });

      const hashResult = argon2Result.hash;
      entropyBits = new Uint8Array(256);
      for (let byteIdx = 0; byteIdx < 32; byteIdx++) {
        for (let bit = 0; bit < 8; bit++) {
          const bitNum = 255 - (byteIdx * 8 + bit);
          entropyBits[bitNum] = (hashResult[byteIdx] >> (7 - bit)) & 1;
        }
      }
      derivationNote = `Argon2id(PIN, salt=XOR_bytes, mem=64MB, t=3) -> 256 bits entropy`;
    } else {
      entropyBits = merged;
      derivationNote = "XOR(A⊕B⊕NOISE) -> direct 11-bit chunking";
    }

    const entropyBytes = bitsToBytes(entropyBits);
    const hex = Array.from(entropyBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const checksumHash = await sha256(entropyBytes);
    const checkByte = checksumHash[0];
    const checkBits = new Uint8Array(8);
    for (let i = 0; i < 8; i++) checkBits[i] = (checkByte >> (7 - i)) & 1;

    const allBits = new Uint8Array(264);
    for (let bitNum = 255; bitNum >= 0; bitNum--) {
      allBits[255 - bitNum] = entropyBits[bitNum];
    }
    allBits.set(checkBits, 256);

    const wordIndices = [];
    for (let w = 0; w < 24; w++) {
      let val = 0;
      for (let b = 0; b < 11; b++) val = (val << 1) | allBits[w * 11 + b];
      wordIndices.push(val);
    }

    document.getElementById("hexVal").textContent = hex;
    document.getElementById("binVal").textContent = toBinStr(entropyBits);

    const wg = document.getElementById("wordGrid");
    wg.innerHTML = "";
    wordIndices.forEach((idx, i) => {
      const word = WORDLIST[idx] || `?${idx}`;
      const chip = document.createElement("div");
      chip.className = "word-chip";
      chip.innerHTML = `<span class="wn">${i + 1}</span><span class="ww">${word}</span>`;
      wg.appendChild(chip);
    });

    const hashHex = Array.from(checksumHash)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const chunks = Array.from({ length: 24 }, (_, w) => {
      let s = "";
      for (let b = 0; b < 11; b++) s += allBits[w * 11 + b];
      return s;
    });

    const modeLabel =
      currentMode === "advanced"
        ? `ADVANCED - Argon2id(PIN, salt=XOR, mem=64MB, t=3)`
        : "BASIC - XOR DIRECT";

    document.getElementById("stepDetail").innerHTML = `
<span class="hi">DERIVATION MODE: ${modeLabel}</span><br>
<span style="color:var(--dim)">${derivationNote}</span><br><br>
<span class="hi">STEP 1 - ENTROPY SOURCE (256 BITS)</span><br>
<span class="ha">${hex.toUpperCase()}</span><br><br>
<span class="hi">STEP 2 - SHA-256(entropy) for BIP39 checksum</span><br>
Full hash: <span class="ha">${hashHex.toUpperCase()}</span><br>
Checksum byte[0]: <span class="ha">${checkByte.toString(16).padStart(2, "0").toUpperCase()}</span> -> bits: <span class="ha">${checkBits.join("")}</span><br><br>
<span class="hi">STEP 3 - ALL BITS = ENTROPY ∥ CHECKSUM (264 bits = 24 × 11)</span><br>
<span style="color:var(--dim);font-size:0.55rem">Bit 255 (MSB) first. Each 11-bit chunk -> BIP39 word index (0-2047)</span><br><br>
<span class="hi">STEP 4 - 11-BIT CHUNKS -> INDEX -> WORD</span><br>
${chunks.map((b, i) => `<span style="color:var(--dim);font-size:.55rem">${String(i + 1).padStart(2, " ")}</span> <span class="ha">${b}</span> = <span style="color:var(--white)">${wordIndices[i].toString().padStart(4, " ")}</span> = <span style="color:var(--green)">${WORDLIST[wordIndices[i]] || "?"}</span>`).join("<br>")}<br><br>
<span class="hi">RESULT - 24-WORD BIP39 MNEMONIC</span><br>
<span style="color:var(--green)">${wordIndices.map((idx) => WORDLIST[idx] || "?").join(" ")}</span>
`;

    document
      .querySelector(".output-panel")
      .scrollIntoView({ behavior: "smooth", block: "start" });
    showOutTab("Words", document.querySelectorAll(".otab")[1]);
    startWipeCountdown();
  } catch (err) {
    document.getElementById("stepDetail").innerHTML =
      `<span style="color:var(--red)"> ERROR: ${err.message || err}</span>`;
    showOutTab("Steps", document.querySelectorAll(".otab")[2]);
    startWipeCountdown();
  } finally {
    btn.textContent = "DERIVE KEY";
    btn.style.opacity = "";
    btn.style.pointerEvents = "";
  }
}

window.addEventListener("resize", resize);
window.addEventListener("load", resize);
window.addEventListener("load", () => {
  resize();
  argon2SelfTest();
});

window.setLayer = setLayer;
window.setGridMode = setGridMode;
window.setBrush = setBrush;
window.toggleErase = toggleErase;
window.toggleShowBits = toggleShowBits;
window.toggleSplit = toggleSplit;
window.setMode = setMode;
window.deriveKey = deriveKey;
window.clearCurrentLayer = clearCurrentLayer;
window.clearAll = clearAll;
window.saveStamp = saveStamp;
window.showOutTab = showOutTab;
window.cancelWipe = cancelWipe;
window.wipeOutput = wipeOutput;
