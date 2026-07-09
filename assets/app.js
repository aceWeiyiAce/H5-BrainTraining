const STORAGE_KEYS = {
  gridSize: "lastSelectedGridSize",
  records: "trainingRecords",
};

const state = {
  route: { name: "home" },
  timer: null,
  toastTimer: null,
};

const app = document.querySelector("#app");
const wordData = normalizeWordData(window.BRAIN_TRAINING_WORD_DATA || { units: [] });

function normalizeWordData(data) {
  return {
    units: (data.units || [])
      .map((unit) => ({
        title: unit.title || (unit.unit ? `高一词汇 Unit ${unit.unit}` : ""),
        words: (unit.words || [])
          .map((item) => ({
            word: String(item.word || "").toLowerCase(),
            meaning: item.meaning || "",
            partOfSpeech: item.part_of_speech || item.partOfSpeech || "",
            phonetic: item.phonetic || "",
          }))
          .filter((item) => item.word.length > 0),
      }))
      .filter((unit) => unit.words.length > 0),
  };
}

function setRoute(route) {
  stopTimer();
  state.route = route;
  render();
}

function render() {
  if (state.route.name === "home") renderHome();
  if (state.route.name === "gridSettings") renderGridSettings();
  if (state.route.name === "gridGame") renderGridGame();
  if (state.route.name === "wordUnits") renderWordUnits();
  if (state.route.name === "wordPractice") renderWordPractice();
  if (state.route.name === "wordList") renderWordList();
}

function shell(title, content, canGoBack = true) {
  app.innerHTML = `
    <header class="topbar">
      <button class="icon-button" data-action="back" aria-label="返回">${canGoBack ? "‹" : ""}</button>
      <h1 class="topbar-title">${escapeHtml(title)}</h1>
      <span></span>
    </header>
    <main class="screen">${content}</main>
  `;
  const back = app.querySelector('[data-action="back"]');
  if (back && canGoBack) back.addEventListener("click", goBack);
}

function goBack() {
  const route = state.route;
  if (route.name === "gridSettings" || route.name === "wordUnits") return setRoute({ name: "home" });
  if (route.name === "gridGame") return setRoute({ name: "gridSettings" });
  if (route.name === "wordPractice") return setRoute({ name: "wordUnits" });
  if (route.name === "wordList") return setRoute({ name: "wordPractice", unitIndex: route.unitIndex, session: route.session });
  setRoute({ name: "home" });
}

function renderHome() {
  shell(
    "脑力锻炼",
    `
      <div class="list">
        <button class="row" data-action="grid">
          <span>
            <p class="row-title">舒特尔方格</p>
            <p class="row-subtitle">训练专注力、视觉搜索和短时记忆</p>
          </span>
          <span class="chevron">›</span>
        </button>
        <button class="row disabled" data-action="math">
          <span>
            <p class="row-title">速算挑战</p>
            <p class="row-subtitle">快速计算能力训练</p>
          </span>
        </button>
        <button class="row" data-action="words">
          <span>
            <p class="row-title">单词拼写</p>
            <p class="row-subtitle">词汇记忆与拼写训练</p>
          </span>
          <span class="chevron">›</span>
        </button>
      </div>
    `,
    false,
  );
  app.querySelector('[data-action="grid"]').addEventListener("click", () => setRoute({ name: "gridSettings" }));
  app.querySelector('[data-action="words"]').addEventListener("click", () => setRoute({ name: "wordUnits" }));
  app.querySelector('[data-action="math"]').addEventListener("click", () => showToast("敬请期待，正在开发中！"));
}

function renderGridSettings() {
  const saved = Number(localStorage.getItem(STORAGE_KEYS.gridSize)) || 4;
  shell(
    "方格设置",
    `
      <div class="segmented" role="tablist">
        ${[3, 4, 5, 6]
          .map((size) => `<button class="segment ${size === saved ? "active" : ""}" data-size="${size}">${size}×${size}</button>`)
          .join("")}
      </div>
      <div class="button-stack">
        <button class="primary-button" data-action="start">开始训练</button>
      </div>
    `,
  );
  let selectedSize = saved;
  app.querySelectorAll("[data-size]").forEach((button) => {
    button.addEventListener("click", () => {
      selectedSize = Number(button.dataset.size);
      localStorage.setItem(STORAGE_KEYS.gridSize, selectedSize);
      app.querySelectorAll("[data-size]").forEach((item) => item.classList.toggle("active", item === button));
    });
  });
  app.querySelector('[data-action="start"]').addEventListener("click", () => {
    localStorage.setItem(STORAGE_KEYS.gridSize, selectedSize);
    setRoute({ name: "gridGame", game: createGridGame(selectedSize) });
  });
}

function createGridGame(size) {
  return {
    size,
    phase: "memory",
    elapsed: 0,
    memoryDuration: 0,
    recallDuration: 0,
    numbers: shuffle(Array.from({ length: size * size }, (_, index) => index + 1)),
    inputs: Array.from({ length: size * size }, () => ""),
    completed: false,
  };
}

function renderGridGame() {
  const game = state.route.game || createGridGame(4);
  state.route.game = game;
  shell("舒特尔方格", gridGameMarkup(game));
  bindGridGame(game);
  startTick(game, () => {
    updateGridTimers(game);
  });
}

function gridGameMarkup(game) {
  return `
    ${timerMarkup(game.phase === "memory" ? game.elapsed : game.memoryDuration, game.phase === "filling" ? game.elapsed : game.recallDuration)}
    <div class="grid-board" style="grid-template-columns: repeat(${game.size}, minmax(0, 1fr));">
      ${game.numbers
        .map((number, index) => {
          if (game.phase === "memory") return `<div class="grid-cell">${number}</div>`;
          return `<label class="grid-cell" data-cell="${index}"><input inputmode="numeric" pattern="[0-9]*" maxlength="2" value="${escapeHtml(game.inputs[index])}" data-index="${index}" ${game.phase === "completed" ? "disabled" : ""} /></label>`;
        })
        .join("")}
    </div>
    <div class="button-stack">
      <button class="primary-button" data-action="fill" ${game.phase === "memory" ? "" : "disabled"}>${game.phase === "memory" ? "开始填写" : "填写中..."}</button>
    </div>
  `;
}

function bindGridGame(game) {
  const fill = app.querySelector('[data-action="fill"]');
  fill.addEventListener("click", () => {
    if (game.phase !== "memory") return;
    game.memoryDuration = game.elapsed;
    game.elapsed = 0;
    game.phase = "filling";
    renderGridGame();
    const firstInput = app.querySelector(".grid-cell input");
    if (firstInput) firstInput.focus();
  });
  app.querySelectorAll(".grid-cell input").forEach((input) => {
    input.addEventListener("input", () => {
      const index = Number(input.dataset.index);
      game.inputs[index] = input.value.replace(/\D/g, "").slice(0, 2);
      input.value = game.inputs[index];
      validateGrid(game);
    });
  });
}

function validateGrid(game) {
  if (game.completed || game.inputs.some((input) => input.length === 0)) return;
  for (let index = 0; index < game.inputs.length; index += 1) {
    if (Number(game.inputs[index]) !== game.numbers[index]) {
      flash(`[data-cell="${index}"]`);
      return;
    }
  }
  game.completed = true;
  game.phase = "completed";
  game.recallDuration = game.elapsed;
  stopTimer();
  saveRecord({ gridSize: game.size, memoryTime: game.memoryDuration, recallTime: game.recallDuration, date: new Date().toISOString(), type: "grid" });
  showModal("Success", randomItem(["太棒了！记忆力超群！", "完成得很漂亮，继续保持！", "你的专注力越来越强了！", "挑战成功，表现优秀！", "好样的，大脑正在变强！"]), () => setRoute({ name: "home" }));
}

function renderWordUnits() {
  shell(
    "选择单元",
    `<div class="list">${wordData.units
      .map(
        (unit, index) => `
          <button class="row" data-unit="${index}">
            <span>
              <p class="row-title">${escapeHtml(unit.title)}</p>
              <p class="row-subtitle">${unit.words.length} 个单词</p>
            </span>
            <span class="chevron">›</span>
          </button>
        `,
      )
      .join("")}</div>`,
  );
  app.querySelectorAll("[data-unit]").forEach((button) => {
    button.addEventListener("click", () => setRoute({ name: "wordPractice", unitIndex: Number(button.dataset.unit), session: createWordSession(Number(button.dataset.unit)) }));
  });
}

function createWordSession(unitIndex) {
  const unit = wordData.units[unitIndex];
  return {
    words: shuffle(unit.words),
    current: 0,
    phase: "memory",
    elapsed: 0,
    memoryDuration: 0,
    recallDuration: 0,
    inputs: [],
    completedWordIndex: -1,
  };
}

function configureWord(session) {
  const word = session.words[session.current] || { word: "" };
  session.phase = "memory";
  session.elapsed = 0;
  session.memoryDuration = 0;
  session.recallDuration = 0;
  session.inputs = Array.from({ length: word.word.length }, () => "");
}

function renderWordPractice() {
  const unit = wordData.units[state.route.unitIndex];
  const session = state.route.session || createWordSession(state.route.unitIndex);
  state.route.session = session;
  if (!session.inputs.length) configureWord(session);
  const word = session.words[session.current] || { word: "", phonetic: "", meaning: "", partOfSpeech: "" };
  shell(unit.title, wordPracticeMarkup(unit, session, word));
  bindWordPractice(unit, session, word);
  startTick(session, () => updateWordTimers(session));
}

function wordPracticeMarkup(unit, session, word) {
  const filling = session.phase === "filling";
  const readOnly = filling ? "" : "readonly";
  const memorySeconds = session.phase === "memory" ? session.elapsed : session.memoryDuration;
  const recallSeconds = session.phase === "filling" ? session.recallDuration + session.elapsed : session.recallDuration;
  return `
    ${timerMarkup(memorySeconds, recallSeconds)}
    <section class="word-panel">
      <h2 class="word-text ${filling ? "hidden" : ""}">${escapeHtml(word.word)}</h2>
      <div class="phonetic-row ${filling ? "hidden" : ""}">
        <button class="speak-button" data-action="speak" aria-label="播放发音">🔊</button>
        <span>${escapeHtml(word.phonetic || "音标待补充")}</span>
      </div>
      <p class="meaning ${filling ? "hidden" : ""}">${escapeHtml(formatMeaning(word))}</p>
    </section>
    <div class="letters">
      ${Array.from({ length: word.word.length }, (_, index) => `<label class="letter-box ${filling ? "" : "memory-ready"}" data-letter-box="${index}"><input maxlength="1" autocapitalize="none" autocomplete="off" spellcheck="false" data-letter="${index}" value="${escapeHtml(session.inputs[index] || "")}" ${readOnly} /></label>`).join("")}
    </div>
    <div class="button-stack">
      <button class="secondary-button ${session.current > 0 ? "" : "hidden"}" data-action="previous">上一个</button>
      <button class="secondary-button" data-action="hint" ${filling ? "" : "disabled"}>提示</button>
      <button class="primary-button" data-action="fill" ${session.phase === "memory" ? "" : "disabled"}>${session.phase === "memory" ? "开始填写" : session.phase === "completed" ? "已完成" : "填写中..."}</button>
      <button class="secondary-button" data-action="ordered">查看全部（顺序）</button>
      <button class="secondary-button" data-action="shuffled">查看全部（无序）</button>
    </div>
  `;
}

function bindWordPractice(unit, session, word) {
  const enterFilling = () => {
    if (session.phase !== "memory") return;
    session.memoryDuration = session.elapsed;
    session.elapsed = 0;
    session.phase = "filling";
    renderWordPractice();
    focusFirstEmptyLetter();
  };
  app.querySelector('[data-action="fill"]').addEventListener("click", enterFilling);
  app.querySelector('[data-action="hint"]').addEventListener("click", () => {
    if (session.phase !== "filling") return;
    session.recallDuration += session.elapsed;
    session.elapsed = session.memoryDuration;
    session.phase = "memory";
    renderWordPractice();
  });
  const previous = app.querySelector('[data-action="previous"]');
  if (previous) {
    previous.addEventListener("click", () => {
      if (session.current <= 0) return;
      session.current -= 1;
      configureWord(session);
      renderWordPractice();
    });
  }
  app.querySelector('[data-action="ordered"]').addEventListener("click", () => setRoute({ name: "wordList", unitIndex: state.route.unitIndex, session, shuffled: false }));
  app.querySelector('[data-action="shuffled"]').addEventListener("click", () => setRoute({ name: "wordList", unitIndex: state.route.unitIndex, session, shuffled: true, words: shuffle(unit.words) }));
  app.querySelector('[data-action="speak"]').addEventListener("click", () => speak(word.word));
  app.querySelectorAll("[data-letter]").forEach((input) => {
    input.addEventListener("focus", () => {
      if (session.phase === "memory") enterFilling();
    });
    input.addEventListener("pointerdown", () => {
      if (session.phase === "memory") enterFilling();
    });
    input.addEventListener("input", () => {
      if (session.phase !== "filling") return;
      const index = Number(input.dataset.letter);
      const letter = firstLetter(input.value);
      session.inputs[index] = letter;
      input.value = letter;
      if (letter && letter !== word.word[index]) flash(`[data-letter-box="${index}"]`);
      validateWord(session, word);
      if (letter) focusLetter(index + 1);
    });
    input.addEventListener("keydown", (event) => {
      if (session.phase !== "filling" || event.key !== "Backspace") return;
      event.preventDefault();
      const index = Number(input.dataset.letter);
      if (input.value) {
        session.inputs[index] = "";
        input.value = "";
      }
      focusLetter(Math.max(0, index - 1));
    });
  });
}

function validateWord(session, word) {
  if (session.inputs.some((input) => input.length === 0)) return;
  for (let index = 0; index < session.inputs.length; index += 1) {
    if (session.inputs[index] !== word.word[index]) {
      flash(`[data-letter-box="${index}"]`);
      return;
    }
  }
  session.recallDuration += session.elapsed;
  saveRecord({ gridSize: word.word.length, memoryTime: session.memoryDuration, recallTime: session.recallDuration, date: new Date().toISOString(), type: "word", word: word.word });
  if (session.current + 1 < session.words.length) {
    session.current += 1;
    configureWord(session);
    renderWordPractice();
    return;
  }
  stopTimer();
  session.phase = "completed";
  const message = `${randomItem(["太棒了，拼写完全正确！", "完成得很漂亮，词汇记忆更稳了！", "反应很快，继续保持！", "挑战成功，这个单词拿下了！", "很好，大脑正在建立更牢的词汇连接！"])}\n\n${word.word}\n${word.phonetic || "音标待补充"}\n${formatMeaning(word)}`;
  showModal("Success", message, () => setRoute({ name: "home" }));
}

function renderWordList() {
  const unit = wordData.units[state.route.unitIndex];
  const words = state.route.shuffled ? state.route.words || shuffle(unit.words) : unit.words;
  shell(
    state.route.shuffled ? "无序词表" : "顺序词表",
    `
      <div class="list-header">${escapeHtml(unit.title)} · ${words.length} 个单词</div>
      <div class="list">
        ${words
          .map(
            (word, index) => `
              <article class="word-card">
                <div class="word-index">${String(index + 1).padStart(2, "0")}</div>
                <div>
                  <h3>${escapeHtml(word.word || "单词待补充")}</h3>
                  <div class="phonetic">${escapeHtml(word.phonetic || "音标待补充")}</div>
                  <p>${escapeHtml(formatMeaning(word))}</p>
                </div>
              </article>
            `,
          )
          .join("")}
      </div>
    `,
  );
}

function timerMarkup(memorySeconds, recallSeconds) {
  return `
    <div class="timer-grid">
      <div class="timer"><span>记忆时间</span><strong data-memory>${formatSeconds(memorySeconds)} 秒</strong></div>
      <div class="timer"><span>背诵时间</span><strong data-recall>${formatSeconds(recallSeconds)} 秒</strong></div>
    </div>
  `;
}

function startTick(model, onTick) {
  stopTimer();
  if (model.phase === "completed") return;
  state.timer = window.setInterval(() => {
    model.elapsed += 1;
    onTick();
  }, 1000);
}

function stopTimer() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
}

function updateGridTimers(game) {
  const memory = app.querySelector("[data-memory]");
  const recall = app.querySelector("[data-recall]");
  if (memory) memory.textContent = `${formatSeconds(game.phase === "memory" ? game.elapsed : game.memoryDuration)} 秒`;
  if (recall) recall.textContent = `${formatSeconds(game.phase === "filling" ? game.elapsed : game.recallDuration)} 秒`;
}

function updateWordTimers(session) {
  const memory = app.querySelector("[data-memory]");
  const recall = app.querySelector("[data-recall]");
  if (memory) memory.textContent = `${formatSeconds(session.phase === "memory" ? session.elapsed : session.memoryDuration)} 秒`;
  if (recall) recall.textContent = `${formatSeconds(session.phase === "filling" ? session.recallDuration + session.elapsed : session.recallDuration)} 秒`;
}

function formatSeconds(value) {
  return String(Math.max(0, Math.floor(value))).padStart(2, "0");
}

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function formatMeaning(word) {
  const partOfSpeech = word.partOfSpeech || "词性待补充";
  const meaning = word.meaning || "释义待补充";
  const parts = partOfSpeech.replaceAll(" & ", "&").replaceAll(" and ", "&").split("&").map((item) => item.trim()).filter(Boolean);
  const meanings = meaning.split(/[；;]/).map((item) => item.trim()).filter(Boolean);
  if (parts.length > 1 && parts.length === meanings.length) return parts.map((part, index) => `${part} ${meanings[index]}`).join("\n");
  return `${partOfSpeech} ${meaning}`;
}

function firstLetter(text) {
  const match = String(text || "").match(/[A-Za-z]/);
  return match ? match[0].toLowerCase() : "";
}

function focusLetter(index) {
  const input = app.querySelector(`[data-letter="${index}"]`);
  if (input) input.focus();
}

function focusFirstEmptyLetter() {
  const input = [...app.querySelectorAll("[data-letter]")].find((item) => !item.value);
  if (input) input.focus();
}

function speak(text) {
  if (!("speechSynthesis" in window) || !text) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.85;
  window.speechSynthesis.speak(utterance);
}

function saveRecord(record) {
  const records = JSON.parse(localStorage.getItem(STORAGE_KEYS.records) || "[]");
  records.push(record);
  localStorage.setItem(STORAGE_KEYS.records, JSON.stringify(records));
}

function flash(selector) {
  const element = app.querySelector(selector);
  if (!element) return;
  element.classList.add("invalid");
  window.setTimeout(() => element.classList.remove("invalid"), 300);
}

function showToast(message) {
  const oldToast = document.querySelector(".toast");
  if (oldToast) oldToast.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  if (state.toastTimer) window.clearTimeout(state.toastTimer);
  state.toastTimer = window.setTimeout(() => toast.remove(), 1800);
}

function showModal(title, message, onClose) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  backdrop.innerHTML = `
    <section class="modal" role="dialog" aria-modal="true">
      <h2>${escapeHtml(title)}</h2>
      <p>${escapeHtml(message)}</p>
      <button class="primary-button">太棒了</button>
    </section>
  `;
  document.body.appendChild(backdrop);
  backdrop.querySelector("button").addEventListener("click", () => {
    backdrop.remove();
    onClose();
  });
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  if (!window.isSecureContext && !location.hostname.match(/^(localhost|127\.0\.0\.1)$/)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

registerServiceWorker();
render();
