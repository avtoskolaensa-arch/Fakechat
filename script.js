const els = {
  selfName: document.getElementById("selfName"),
  otherName: document.getElementById("otherName"),
  chatTitle: document.getElementById("chatTitle"),
  statusTime: document.getElementById("statusTime"),
  batteryPercent: document.getElementById("batteryPercent"),
  dateLabel: document.getElementById("dateLabel"),
  selfAvatar: document.getElementById("selfAvatar"),
  otherAvatar: document.getElementById("otherAvatar"),
  selfSide: document.getElementById("selfSide"),
  speedMultiplier: document.getElementById("speedMultiplier"),
  runDelay: document.getElementById("runDelay"),
  bgTone: document.getElementById("bgTone"),
  applyMetaBtn: document.getElementById("applyMetaBtn"),
  toggleRecordModeBtn: document.getElementById("toggleRecordModeBtn"),
  toggleSoundBtn: document.getElementById("toggleSoundBtn"),
  addMessageBtn: document.getElementById("addMessageBtn"),
  clearMessagesBtn: document.getElementById("clearMessagesBtn"),
  messageBuilder: document.getElementById("messageBuilder"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  runBtn: document.getElementById("runBtn"),
  pauseBtn: document.getElementById("pauseBtn"),
  resumeBtn: document.getElementById("resumeBtn"),
  resetBtn: document.getElementById("resetBtn"),
  copySceneBtn: document.getElementById("copySceneBtn"),
  downloadSceneBtn: document.getElementById("downloadSceneBtn"),
  sceneJson: document.getElementById("sceneJson"),
  sceneFileInput: document.getElementById("sceneFileInput"),
  statusTimeDisplay: document.getElementById("statusTimeDisplay"),
  batteryText: document.getElementById("batteryText"),
  batteryLevel: document.getElementById("batteryLevel"),
  headerAvatar: document.getElementById("headerAvatar"),
  headerName: document.getElementById("headerName"),
  headerSub: document.getElementById("headerSub"),
  dateSeparator: document.getElementById("dateSeparator"),
  messagesScroll: document.getElementById("messagesScroll"),
  messagesList: document.getElementById("messagesList"),
  typingRow: document.getElementById("typingRow"),
  typedDraft: document.getElementById("typedDraft"),
  inputPlaceholder: document.getElementById("inputPlaceholder"),
  sendBtnPreview: document.getElementById("sendBtnPreview"),
  keyboard: document.getElementById("keyboard"),
  iphoneScreen: document.getElementById("iphoneScreen"),
  countdown: document.getElementById("countdown"),
  fullscreenStageBtn: document.getElementById("fullscreenStageBtn"),
  previewArea: document.getElementById("previewArea"),
  stageNote: document.getElementById("stageNote")
};

const rowTemplate = document.getElementById("messageRowTemplate");

let isRunning = false;
let isPaused = false;
let soundEnabled = true;
let activeTimeout = null;
let pendingResolve = null;

const sampleScene = {
  meta: {
    selfName: "გიორგი",
    otherName: "ნიკა",
    chatTitle: "ნიკა",
    statusTime: "20:32",
    batteryPercent: 87,
    dateLabel: "iMessage • დღეს 20:32",
    selfAvatar: "გ",
    otherAvatar: "ნ",
    selfSide: "right",
    speedMultiplier: 1,
    runDelay: 3,
    bgTone: "#f5f5f7"
  },
  messages: [
    {
      speaker: "other",
      text: "გიო რას შვები 👀",
      delay: 800,
      typingDuration: 1100,
      showTyping: true,
      timestamp: "",
      sound: "auto",
      readLabel: ""
    },
    {
      speaker: "self",
      text: "ვიდეოსთვის ჩატს ვაწყობ ახლა 😄",
      delay: 550,
      typingDuration: 1500,
      showTyping: true,
      timestamp: "წაკითხულია",
      sound: "auto",
      readLabel: "Read 20:33"
    },
    {
      speaker: "other",
      text: "ვაა მაგარია, აბა სცენა გამიშვი",
      delay: 900,
      typingDuration: 1700,
      showTyping: true,
      timestamp: "",
      sound: "auto",
      readLabel: ""
    },
    {
      speaker: "self",
      text: "ახლავე გავუშვებ. ესეც emoji 😎🔥",
      delay: 700,
      typingDuration: 1600,
      showTyping: true,
      timestamp: "Delivered",
      sound: "auto",
      readLabel: ""
    }
  ]
};

function setStatus(message) {
  els.stageNote.textContent = message;
}

function applyMetaToPreview(meta) {
  els.statusTimeDisplay.textContent = meta.statusTime || "20:32";
  const battery = Math.max(1, Math.min(100, Number(meta.batteryPercent || 87)));
  els.batteryText.textContent = `${battery}%`;
  els.batteryLevel.style.width = `${battery}%`;
  els.batteryLevel.style.background = battery < 20 ? "#ef4444" : "#22c55e";
  els.headerAvatar.textContent = meta.otherAvatar || "ნ";
  els.headerName.textContent = meta.chatTitle || meta.otherName || "ჩატი";
  els.headerSub.textContent = "iMessage";
  els.dateSeparator.textContent = meta.dateLabel || "";
  els.inputPlaceholder.textContent = "iMessage";
  els.iphoneScreen.style.background = meta.bgTone || "#f5f5f7";
}

function getMetaFromInputs() {
  return {
    selfName: els.selfName.value.trim() || "მე",
    otherName: els.otherName.value.trim() || "მეორე",
    chatTitle: els.chatTitle.value.trim() || els.otherName.value.trim() || "ჩატი",
    statusTime: els.statusTime.value.trim() || "20:32",
    batteryPercent: Number(els.batteryPercent.value) || 87,
    dateLabel: els.dateLabel.value.trim() || "iMessage",
    selfAvatar: (els.selfAvatar.value.trim() || "მე").slice(0, 2),
    otherAvatar: (els.otherAvatar.value.trim() || "ო").slice(0, 2),
    selfSide: els.selfSide.value,
    speedMultiplier: Number(els.speedMultiplier.value) || 1,
    runDelay: Number(els.runDelay.value) || 0,
    bgTone: els.bgTone.value || "#f5f5f7"
  };
}

function sanitizeMessage(msg) {
  return {
    speaker: msg.speaker === "other" ? "other" : "self",
    text: String(msg.text ?? ""),
    delay: Math.max(0, Number(msg.delay ?? 600)),
    typingDuration: Math.max(0, Number(msg.typingDuration ?? 1200)),
    showTyping: msg.showTyping === false || msg.showTyping === "false" ? false : true,
    timestamp: String(msg.timestamp ?? ""),
    sound: ["auto", "send", "receive", "none"].includes(msg.sound) ? msg.sound : "auto",
    readLabel: String(msg.readLabel ?? "")
  };
}

function extractMessagesFromBuilder() {
  return [...els.messageBuilder.querySelectorAll(".msg-row-editor")].map((row) => sanitizeMessage({
    speaker: row.querySelector('[data-field="speaker"]').value,
    text: row.querySelector('[data-field="text"]').value,
    delay: row.querySelector('[data-field="delay"]').value,
    typingDuration: row.querySelector('[data-field="typingDuration"]').value,
    showTyping: row.querySelector('[data-field="showTyping"]').value,
    timestamp: row.querySelector('[data-field="timestamp"]').value,
    sound: row.querySelector('[data-field="sound"]').value,
    readLabel: row.querySelector('[data-field="readLabel"]').value
  }));
}

function buildSceneFromUI() {
  return {
    meta: getMetaFromInputs(),
    messages: extractMessagesFromBuilder()
  };
}

function syncJsonFromUI() {
  const scene = buildSceneFromUI();
  els.sceneJson.value = JSON.stringify(scene, null, 2);
}

function populateMetaInputs(meta) {
  els.selfName.value = meta.selfName ?? "";
  els.otherName.value = meta.otherName ?? "";
  els.chatTitle.value = meta.chatTitle ?? "";
  els.statusTime.value = meta.statusTime ?? "20:32";
  els.batteryPercent.value = meta.batteryPercent ?? 87;
  els.dateLabel.value = meta.dateLabel ?? "";
  els.selfAvatar.value = meta.selfAvatar ?? "";
  els.otherAvatar.value = meta.otherAvatar ?? "";
  els.selfSide.value = meta.selfSide ?? "right";
  els.speedMultiplier.value = String(meta.speedMultiplier ?? 1);
  els.runDelay.value = meta.runDelay ?? 3;
  els.bgTone.value = meta.bgTone ?? "#f5f5f7";
  applyMetaToPreview(getMetaFromInputs());
}

function createBuilderRow(data = {}) {
  const fragment = rowTemplate.content.cloneNode(true);
  const row = fragment.querySelector(".msg-row-editor");

  row.querySelector('[data-field="speaker"]').value = data.speaker || "self";
  row.querySelector('[data-field="text"]').value = data.text || "";
  row.querySelector('[data-field="delay"]').value = data.delay ?? 600;
  row.querySelector('[data-field="typingDuration"]').value = data.typingDuration ?? 1200;
  row.querySelector('[data-field="showTyping"]').value = String(data.showTyping ?? true);
  row.querySelector('[data-field="timestamp"]').value = data.timestamp || "";
  row.querySelector('[data-field="sound"]').value = data.sound || "auto";
  row.querySelector('[data-field="readLabel"]').value = data.readLabel || "";

  row.querySelector(".remove-msg-btn").addEventListener("click", () => {
    row.remove();
    syncJsonFromUI();
  });

  row.querySelector(".move-up-btn").addEventListener("click", () => {
    const prev = row.previousElementSibling;
    if (prev) {
      els.messageBuilder.insertBefore(row, prev);
      syncJsonFromUI();
    }
  });

  row.querySelector(".move-down-btn").addEventListener("click", () => {
    const next = row.nextElementSibling;
    if (next) {
      els.messageBuilder.insertBefore(next, row);
      syncJsonFromUI();
    }
  });

  row.querySelectorAll("input, textarea, select").forEach((field) => {
    field.addEventListener("input", syncJsonFromUI);
    field.addEventListener("change", syncJsonFromUI);
  });

  els.messageBuilder.appendChild(fragment);
}

function populateBuilder(messages = []) {
  els.messageBuilder.innerHTML = "";
  messages.forEach((msg) => createBuilderRow(msg));
  syncJsonFromUI();
}

function loadScene(scene) {
  const meta = scene.meta || sampleScene.meta;
  const messages = Array.isArray(scene.messages) ? scene.messages.map(sanitizeMessage) : [];
  populateMetaInputs(meta);
  populateBuilder(messages);
  resetPreview();
}

function parseSceneJson() {
  try {
    const parsed = JSON.parse(els.sceneJson.value);
    if (!parsed || typeof parsed !== "object") throw new Error("Invalid JSON");
    parsed.messages = Array.isArray(parsed.messages) ? parsed.messages.map(sanitizeMessage) : [];
    parsed.meta = parsed.meta || {};
    return parsed;
  } catch (error) {
    alert("JSON-ში შეცდომაა. გადაამოწმე სცენა.");
    throw error;
  }
}

function sleep(ms) {
  return new Promise((resolve) => {
    const tick = () => {
      if (isPaused) {
        pendingResolve = () => tick();
        return;
      }
      activeTimeout = setTimeout(() => {
        activeTimeout = null;
        resolve();
      }, ms);
    };
    tick();
  });
}

function waitWhilePaused() {
  return new Promise((resolve) => {
    const check = () => {
      if (!isPaused) return resolve();
      activeTimeout = setTimeout(check, 100);
    };
    check();
  });
}

function clearTimers() {
  if (activeTimeout) {
    clearTimeout(activeTimeout);
    activeTimeout = null;
  }
  pendingResolve = null;
}

function resetPreview() {
  clearTimers();
  isRunning = false;
  isPaused = false;
  els.messagesList.innerHTML = "";
  els.typingRow.classList.add("hidden");
  els.typedDraft.textContent = "";
  els.sendBtnPreview.classList.remove("press");
  els.keyboard.querySelectorAll("button").forEach((btn) => btn.classList.remove("key-press"));
  applyMetaToPreview(getMetaFromInputs());
  scrollMessagesToBottom(true);
  setStatus("TikTok-ready 1080×1920 preview");
}

function scrollMessagesToBottom(instant = false) {
  els.messagesScroll.scrollTo({
    top: els.messagesScroll.scrollHeight + 9999,
    behavior: instant ? "instant" : "smooth"
  });
}

function buildMessageBubble(msg, meta) {
  const selfIsRight = meta.selfSide === "right";
  const isSelf = msg.speaker === "self";
  const side = isSelf ? meta.selfSide : (selfIsRight ? "left" : "right");

  const row = document.createElement("div");
  row.className = `message-row ${side}`;

  const wrap = document.createElement("div");
  wrap.className = "bubble-wrap";

  const bubble = document.createElement("div");
  bubble.className = `bubble ${side === "right" ? "bubble-right" : "bubble-left"}`;
  bubble.textContent = msg.text;

  wrap.appendChild(bubble);

  if (msg.timestamp || msg.readLabel) {
    const metaLine = document.createElement("div");
    metaLine.className = "meta-line";
    metaLine.textContent = [msg.timestamp, msg.readLabel].filter(Boolean).join(" • ");
    wrap.appendChild(metaLine);
  }

  row.appendChild(wrap);
  return row;
}

function showTyping(side) {
  const typingBubble = els.typingRow.querySelector(".typing-bubble");
  typingBubble.classList.toggle("bubble-right", side === "right");
  typingBubble.classList.toggle("bubble-left", side !== "right");
  els.typingRow.style.justifyContent = side === "right" ? "flex-end" : "flex-start";
  els.typingRow.classList.remove("hidden");
  scrollMessagesToBottom();
}

function hideTyping() {
  els.typingRow.classList.add("hidden");
}

function pressKeyVisual(char) {
  const target = [...els.keyboard.querySelectorAll("button")]
    .find((btn) => btn.dataset.key === char);
  if (!target) return;
  target.classList.add("key-press");
  setTimeout(() => target.classList.remove("key-press"), 110);
}

function triggerSendButton() {
  els.sendBtnPreview.classList.add("press");
  setTimeout(() => els.sendBtnPreview.classList.remove("press"), 220);
}

function textToKeys(text) {
  return [...text].map((ch) => {
    if (ch === " ") return "space";
    if (ch === "\n") return "return";
    return ch;
  });
}

let audioCtx = null;

function ensureAudio() {
  if (!soundEnabled) return null;
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

function beep({ frequency = 660, duration = 0.04, type = "sine", gain = 0.03 } = {}) {
  const ctx = ensureAudio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = frequency;
  g.gain.value = gain;
  osc.connect(g);
  g.connect(ctx.destination);
  const now = ctx.currentTime;
  g.gain.setValueAtTime(gain, now);
  g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  osc.start(now);
  osc.stop(now + duration);
}

function playTypingSound() {
  beep({ frequency: 900 + Math.random() * 180, duration: 0.018, type: "triangle", gain: 0.012 });
}

function playSendSound() {
  beep({ frequency: 720, duration: 0.04, type: "sine", gain: 0.03 });
  setTimeout(() => beep({ frequency: 980, duration: 0.03, type: "triangle", gain: 0.018 }), 24);
}

function playReceiveSound() {
  beep({ frequency: 520, duration: 0.05, type: "sine", gain: 0.026 });
}

async function typeIntoComposer(text, speedMultiplier = 1) {
  els.typedDraft.textContent = "";
  els.inputPlaceholder.classList.add("hidden");
  const keys = textToKeys(text);
  for (let i = 0; i < keys.length; i += 1) {
    if (!isRunning) return;
    await waitWhilePaused();
    const key = keys[i];
    pressKeyVisual(key);
    playTypingSound();
    els.typedDraft.textContent += key === "space" ? " " : key === "return" ? "\n" : key;
    const delay = Math.max(16, (35 + Math.random() * 42) / speedMultiplier);
    await sleep(delay);
  }
}

function clearComposer() {
  els.typedDraft.textContent = "";
  els.inputPlaceholder.classList.toggle("hidden", false);
}

async function runScene(scene) {
  resetPreview();
  isRunning = true;
  const meta = { ...sampleScene.meta, ...scene.meta };
  const speedMultiplier = Number(meta.speedMultiplier || 1);

  applyMetaToPreview(meta);

  const runDelay = Math.max(0, Number(meta.runDelay || 0));
  if (runDelay > 0) {
    els.countdown.classList.remove("hidden");
    for (let n = runDelay; n > 0; n -= 1) {
      els.countdown.textContent = n;
      await sleep(1000);
      if (!isRunning) return;
    }
    els.countdown.textContent = "REC";
    await sleep(600);
    els.countdown.classList.add("hidden");
  }

  for (const msg of scene.messages.map(sanitizeMessage)) {
    if (!isRunning) break;
    await waitWhilePaused();

    const selfIsRight = meta.selfSide === "right";
    const isSelf = msg.speaker === "self";
    const side = isSelf ? meta.selfSide : (selfIsRight ? "left" : "right");

    if (msg.showTyping) {
      if (isSelf) {
        await typeIntoComposer(msg.text, speedMultiplier);
      } else {
        showTyping(side);
        const typingMs = Math.max(150, msg.typingDuration / speedMultiplier);
        if (msg.sound !== "none") {
          const ticks = Math.max(2, Math.floor(typingMs / 160));
          for (let i = 0; i < ticks; i += 1) {
            if (!isRunning) return;
            playTypingSound();
            await sleep(typingMs / ticks);
          }
        } else {
          await sleep(typingMs);
        }
      }
    } else if (isSelf) {
      els.typedDraft.textContent = msg.text;
      els.inputPlaceholder.classList.add("hidden");
      await sleep(100);
    }

    if (!isRunning) return;
    hideTyping();

    if (isSelf) {
      triggerSendButton();
    }

    const row = buildMessageBubble(msg, meta);
    els.messagesList.appendChild(row);
    scrollMessagesToBottom();

    if (msg.sound !== "none") {
      if (msg.sound === "send" || (msg.sound === "auto" && isSelf)) playSendSound();
      if (msg.sound === "receive" || (msg.sound === "auto" && !isSelf)) playReceiveSound();
    }

    clearComposer();

    const delay = Math.max(60, msg.delay / speedMultiplier);
    await sleep(delay);
  }

  isRunning = false;
  hideTyping();
  clearComposer();
  setStatus("Done — შეგიძლია ისევ გაუშვა ან ახალი სცენა ჩაწერო");
}

function applyJsonToBuilderAndPreview() {
  const scene = parseSceneJson();
  loadScene(scene);
}

function downloadSceneJson() {
  const scene = buildSceneFromUI();
  const blob = new Blob([JSON.stringify(scene, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "scene.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function copySceneJson() {
  syncJsonFromUI();
  navigator.clipboard.writeText(els.sceneJson.value)
    .then(() => setStatus("JSON დაკოპირდა clipboard-ში"))
    .catch(() => setStatus("ვერ დაკოპირდა"));
}

function toggleRecordMode() {
  document.body.classList.toggle("record-mode");
  setStatus(document.body.classList.contains("record-mode")
    ? "Record Mode ON — სცენის ჩაწერისთვის მზადაა"
    : "Record Mode OFF");
}

function toggleSound() {
  soundEnabled = !soundEnabled;
  els.toggleSoundBtn.textContent = `Sound: ${soundEnabled ? "ON" : "OFF"}`;
}

async function enterFullscreenStage() {
  const node = document.getElementById("tiktokStage");
  if (document.fullscreenElement) {
    await document.exitFullscreen();
    return;
  }
  if (node.requestFullscreen) {
    await node.requestFullscreen();
  }
}

function bindMetaInputEvents() {
  [
    els.selfName, els.otherName, els.chatTitle, els.statusTime, els.batteryPercent, els.dateLabel,
    els.selfAvatar, els.otherAvatar, els.selfSide, els.speedMultiplier, els.runDelay, els.bgTone
  ].forEach((input) => {
    input.addEventListener("input", () => {
      applyMetaToPreview(getMetaFromInputs());
      syncJsonFromUI();
    });
    input.addEventListener("change", () => {
      applyMetaToPreview(getMetaFromInputs());
      syncJsonFromUI();
    });
  });
}

els.applyMetaBtn.addEventListener("click", () => {
  applyMetaToPreview(getMetaFromInputs());
  syncJsonFromUI();
  setStatus("Header განახლდა");
});

els.addMessageBtn.addEventListener("click", () => {
  createBuilderRow({ speaker: "self", text: "", delay: 600, typingDuration: 1200, showTyping: true, sound: "auto" });
  syncJsonFromUI();
});

els.clearMessagesBtn.addEventListener("click", () => {
  if (confirm("მართლა გინდა ყველა მესიჯის წაშლა?")) {
    els.messageBuilder.innerHTML = "";
    syncJsonFromUI();
  }
});

els.loadSampleBtn.addEventListener("click", () => {
  loadScene(sampleScene);
  setStatus("Sample scene ჩაიტვირთა");
});

els.runBtn.addEventListener("click", async () => {
  if (isRunning) return;
  syncJsonFromUI();
  const scene = parseSceneJson();
  setStatus("Running...");
  await runScene(scene);
});

els.pauseBtn.addEventListener("click", () => {
  if (!isRunning) return;
  isPaused = true;
  setStatus("Paused");
});

els.resumeBtn.addEventListener("click", () => {
  if (!isRunning) return;
  isPaused = false;
  if (pendingResolve) {
    const resolver = pendingResolve;
    pendingResolve = null;
    resolver();
  }
  setStatus("Running...");
});

els.resetBtn.addEventListener("click", () => {
  isRunning = false;
  isPaused = false;
  resetPreview();
});

els.copySceneBtn.addEventListener("click", copySceneJson);
els.downloadSceneBtn.addEventListener("click", downloadSceneJson);
els.toggleRecordModeBtn.addEventListener("click", toggleRecordMode);
els.toggleSoundBtn.addEventListener("click", toggleSound);
els.fullscreenStageBtn.addEventListener("click", enterFullscreenStage);

els.sceneJson.addEventListener("change", applyJsonToBuilderAndPreview);

els.sceneFileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const scene = JSON.parse(text);
    loadScene(scene);
    setStatus("JSON ჩაიტვირთა");
  } catch {
    alert("ფაილი ვერ წავიკითხე.");
  } finally {
    event.target.value = "";
  }
});

document.addEventListener("keydown", (event) => {
  if (event.code === "Space" && event.target.tagName !== "TEXTAREA" && event.target.tagName !== "INPUT") {
    event.preventDefault();
    if (isRunning) {
      isPaused = !isPaused;
      setStatus(isPaused ? "Paused" : "Running...");
      if (!isPaused && pendingResolve) {
        const resolver = pendingResolve;
        pendingResolve = null;
        resolver();
      }
    }
  }

  if (event.key.toLowerCase() === "r" && event.altKey) {
    event.preventDefault();
    toggleRecordMode();
  }
});

bindMetaInputEvents();
loadScene(sampleScene);
