const STORAGE_KEY = "institute_book1_progress_v1";

const state = {
  bookData: null,
  currentLesson: null,
  currentUnit: null,
  quizIndex: 0,
  quizScore: 0,
  quizAnswered: false,
  progress: loadProgress()
};

// عناصر DOM
const homeView = document.getElementById("home-view");
const lessonView = document.getElementById("lesson-view");
const backBtn = document.getElementById("back-btn");
const headerTitle = document.getElementById("header-title");
const themeToggle = document.getElementById("theme-toggle");
const totalPointsBadge = document.getElementById("total-points-badge");
const overallProgressText = document.getElementById("overall-progress-text");
const overallProgressBar = document.getElementById("overall-progress-bar");
const unitsContainer = document.getElementById("units-container");

const lessonUnitLabel = document.getElementById("lesson-unit-label");
const lessonTitleEn = document.getElementById("lesson-title-en");
const lessonTitleAr = document.getElementById("lesson-title-ar");
const grammarContainer = document.getElementById("grammar-container");
const vocabContainer = document.getElementById("vocab-container");
const quizContainer = document.getElementById("quiz-container");
const tasksContainer = document.getElementById("tasks-container");
const completeLessonBtn = document.getElementById("complete-lesson-btn");
const resetProgressBtn = document.getElementById("reset-progress-btn");
const tabButtons = document.querySelectorAll(".tab-btn");
const tabPanels = document.querySelectorAll(".tab-panel");

// تهيئة التطبيق
document.addEventListener("DOMContentLoaded", async () => {
  applyTheme(state.progress.theme || "light");
  registerServiceWorker();
  bindEvents();
  await loadBookData();
});

function loadProgress() {
  const defaultState = {
    theme: "light",
    points: 0,
    completedLessons: [],
    quizScores: {},
    dailyTasks: {},
    listenedWords: {}
  };
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState;
  } catch {
    return defaultState;
  }
}

function saveProgress() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.progress));
  } catch (err) {
    console.warn("تعذر حفظ التقدم في localStorage:", err);
  }
  updateHeaderStats();
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
  themeToggle.textContent = theme === "dark" ? "☀️" : "🌙";
  state.progress.theme = theme;
}

function bindEvents() {
  themeToggle.addEventListener("click", () => {
    const nextTheme = state.progress.theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    saveProgress();
  });

  backBtn.addEventListener("click", showHomeView);

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  completeLessonBtn.addEventListener("click", toggleLessonComplete);

  resetProgressBtn.addEventListener("click", () => {
    if (confirm("هل أنت متأكد من مسح جميع نقاطك وتقدمك في Book 1؟")) {
      const currentTheme = state.progress.theme;
      localStorage.removeItem(STORAGE_KEY);
      state.progress = loadProgress();
      state.progress.theme = currentTheme;
      saveProgress();
      showHomeView();
    }
  });
}

async function loadBookData() {
  try {
    const response = await fetch("./data/book1.json");
    if (!response.ok) throw new Error("فشل تحميل ملف البيانات");
    state.bookData = await response.json();
    renderHomeView();
    updateHeaderStats();
  } catch (error) {
    unitsContainer.innerHTML = `
      <div class="card">
        <p style="color: var(--danger); font-weight: 700;">تعذر تحميل محتوى الكتاب.</p>
        <p class="muted-text">تأكد من تشغيل التطبيق عبر خادم محلي أو GitHub Pages.</p>
      </div>
    `;
  }
}

function updateHeaderStats() {
  totalPointsBadge.textContent = `${state.progress.points} نقطة`;

  if (!state.bookData) return;
  const totalLessons = state.bookData.units.reduce((sum, u) => sum + u.lessons.length, 0);
  const doneCount = state.progress.completedLessons.length;
  const percent = totalLessons > 0 ? Math.round((doneCount / totalLessons) * 100) : 0;

  overallProgressText.textContent = `${doneCount} من ${totalLessons} دروس مكتملة (${percent}%)`;
  overallProgressBar.style.width = `${percent}%`;
}

function renderHomeView() {
  if (!state.bookData) return;
  unitsContainer.innerHTML = "";

  state.bookData.units.forEach((unit) => {
    const completedInUnit = unit.lessons.filter((l) =>
      state.progress.completedLessons.includes(l.id)
    ).length;

    const unitCard = document.createElement("article");
    unitCard.className = "card unit-card";

    unitCard.innerHTML = `
      <div class="unit-header">
        <div>
          <div class="unit-title-en ltr-text">${unit.titleEn}</div>
          <div class="unit-title-ar">${unit.titleAr}</div>
        </div>
        <span class="status-pill ${completedInUnit === unit.lessons.length ? "done" : ""}">
          ${completedInUnit}/${unit.lessons.length}
        </span>
      </div>
      <div class="lessons-list"></div>
    `;

    const lessonsList = unitCard.querySelector(".lessons-list");
    unit.lessons.forEach((lesson) => {
      const isDone = state.progress.completedLessons.includes(lesson.id);
      const lessonBtn = document.createElement("button");
      lessonBtn.className = "lesson-item";
      lessonBtn.innerHTML = `
        <div class="lesson-info">
          <span class="lesson-name-en ltr-text">${lesson.titleEn}</span>
          <span class="lesson-name-ar">${lesson.titleAr}</span>
        </div>
        <span class="status-pill ${isDone ? "done" : ""}">
          ${isDone ? "مكتمل ✓" : "ابدأ ←"}
        </span>
      `;
      lessonBtn.addEventListener("click", () => openLesson(unit, lesson));
      lessonsList.appendChild(lessonBtn);
    });

    unitsContainer.appendChild(unitCard);
  });
}

function showHomeView() {
  lessonView.classList.add("hidden");
  homeView.classList.remove("hidden");
  backBtn.classList.add("hidden");
  headerTitle.textContent = "Book 1 — المنهج التفاعلي";
  renderHomeView();
  updateHeaderStats();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openLesson(unit, lesson) {
  state.currentUnit = unit;
  state.currentLesson = lesson;
  state.quizIndex = 0;
  state.quizScore = 0;
  state.quizAnswered = false;

  homeView.classList.add("hidden");
  lessonView.classList.remove("hidden");
  backBtn.classList.remove("hidden");
  headerTitle.textContent = lesson.titleAr;

  lessonUnitLabel.textContent = unit.titleEn;
  lessonTitleEn.textContent = lesson.titleEn;
  lessonTitleAr.textContent = lesson.titleAr;

  renderGrammarAndVocab(lesson);
  renderQuizQuestion();
  renderDailyTasks(lesson);
  updateCompleteButton();
  switchTab("lesson");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function switchTab(tabName) {
  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", isActive ? "true" : "false");
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("hidden", panel.id !== `tab-${tabName}`);
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });
}

function renderGrammarAndVocab(lesson) {
  // القواعد
  const g = lesson.grammar;
  grammarContainer.innerHTML = `
    <div class="card grammar-card">
      <h3>${g.title}</h3>
      <p class="grammar-summary">${g.explanation}</p>
      <div class="examples-list">
        ${g.examples
          .map(
            (ex) => `
          <div class="example-box">
            <div class="example-text">
              <div class="example-en ltr-text">${ex.en}</div>
              <div class="example-ar">${ex.ar}</div>
            </div>
            <button class="speak-btn" data-speak="${escapeHtml(ex.en)}" aria-label="استماع للمثال">🔊</button>
          </div>
        `
          )
          .join("")}
      </div>
    </div>
  `;

  // المفردات
  vocabContainer.innerHTML = lesson.vocabulary
    .map(
      (item) => `
    <div class="card vocab-card">
      <div class="vocab-content">
        <div class="vocab-word-row ltr-text">
          <span class="vocab-word">${item.word}</span>
          <span class="vocab-phonetic">${item.phonetic}</span>
        </div>
        <div class="vocab-meaning">${item.meaning}</div>
        <div class="vocab-example ltr-text">${item.example}</div>
      </div>
      <button class="speak-btn" data-speak="${escapeHtml(item.word)}" data-word="${escapeHtml(item.word)}" aria-label="نطق الكلمة">
        🔊
      </button>
    </div>
  `
    )
    .join("");

  // ربط أزرار النطق الصوتي
  lessonView.querySelectorAll(".speak-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      speakText(btn.dataset.speak, btn);
      if (btn.dataset.word) {
        trackWordListened(lesson.id, btn.dataset.word);
      }
    });
  });
}

function speakText(text, btnElement) {
  if (!("speechSynthesis" in window)) {
    alert("عذراً، متصفحك لا يدعم ميزة النطق الصوتي.");
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.9;

  document.querySelectorAll(".speak-btn.speaking").forEach((b) => b.classList.remove("speaking"));
  if (btnElement) btnElement.classList.add("speaking");

  utterance.onend = () => {
    if (btnElement) btnElement.classList.remove("speaking");
  };
  utterance.onerror = () => {
    if (btnElement) btnElement.classList.remove("speaking");
  };

  window.speechSynthesis.speak(utterance);
}

function trackWordListened(lessonId, word) {
  if (!state.progress.listenedWords[lessonId]) {
    state.progress.listenedWords[lessonId] = [];
  }
  if (!state.progress.listenedWords[lessonId].includes(word)) {
    state.progress.listenedWords[lessonId].push(word);
    state.progress.points += 2;
    saveProgress();
  }
}

function renderQuizQuestion() {
  const lesson = state.currentLesson;
  const questions = lesson.quiz;

  if (state.quizIndex >= questions.length) {
    renderQuizResult(questions.length);
    return;
  }

  const q = questions[state.quizIndex];
  state.quizAnswered = false;

  quizContainer.innerHTML = `
    <div class="card">
      <div class="quiz-header">
        <span>السؤال ${state.quizIndex + 1} من ${questions.length}</span>
        <span>النقاط الحالية: ${state.quizScore}</span>
      </div>
      <div class="quiz-question ltr-text">${q.question}</div>
      <div class="quiz-options">
        ${q.options
          .map(
            (opt, idx) => `
          <button class="quiz-option-btn ltr-text" data-index="${idx}">${opt}</button>
        `
          )
          .join("")}
      </div>
      <div id="quiz-feedback-area"></div>
    </div>
  `;

  const optionBtns = quizContainer.querySelectorAll(".quiz-option-btn");
  optionBtns.forEach((btn) => {
    btn.addEventListener("click", () => handleQuizAnswer(Number(btn.dataset.index), optionBtns, q));
  });
}

function handleQuizAnswer(selectedIndex, optionBtns, q) {
  if (state.quizAnswered) return;
  state.quizAnswered = true;

  const isCorrect = selectedIndex === q.correctIndex;
  if (isCorrect) {
    state.quizScore += 1;
    state.progress.points += 5;
    saveProgress();
  }

  optionBtns.forEach((btn, idx) => {
    btn.disabled = true;
    if (idx === q.correctIndex) {
      btn.classList.add("correct");
    } else if (idx === selectedIndex && !isCorrect) {
      btn.classList.add("wrong");
    }
  });

  const feedbackArea = document.getElementById("quiz-feedback-area");
  feedbackArea.innerHTML = `
    <div class="quiz-feedback ${isCorrect ? "correct" : "wrong"}">
      <strong>${isCorrect ? "إجابة صحيحة! (+5 نقاط)" : "إجابة غير صحيحة"}</strong>
      <p style="margin-top: 4px;">${q.explanation}</p>
    </div>
    <button id="next-question-btn" class="primary-btn full-width" style="margin-top: 12px;">
      ${state.quizIndex + 1 < state.currentLesson.quiz.length ? "السؤال التالي ←" : "عرض النتيجة"}
    </button>
  `;

  document.getElementById("next-question-btn").addEventListener("click", () => {
    state.quizIndex += 1;
    renderQuizQuestion();
  });
}

function renderQuizResult(total) {
  const percent = Math.round((state.quizScore / total) * 100);
  const lessonId = state.currentLesson.id;

  const prevBest = state.progress.quizScores[lessonId]?.bestPercentage || 0;
  state.progress.quizScores[lessonId] = {
    score: state.quizScore,
    total,
    bestPercentage: Math.max(prevBest, percent)
  };
  saveProgress();

  quizContainer.innerHTML = `
    <div class="card quiz-result-box">
      <h3>انتهى الاختبار! 🎉</h3>
      <div class="quiz-score-big">${state.quizScore} / ${total}</div>
      <p class="muted-text">نسبة النجاح: ${percent}%</p>
      <button id="retry-quiz-btn" class="primary-btn full-width">إعادة الاختبار</button>
    </div>
  `;

  document.getElementById("retry-quiz-btn").addEventListener("click", () => {
    state.quizIndex = 0;
    state.quizScore = 0;
    renderQuizQuestion();
  });
}

function renderDailyTasks(lesson) {
  const savedTasks = state.progress.dailyTasks[lesson.id] || {};
  tasksContainer.innerHTML = "";

  lesson.dailyTasks.forEach((task) => {
    const isChecked = Boolean(savedTasks[task.id]);
    const label = document.createElement("label");
    label.className = `task-item ${isChecked ? "checked" : ""}`;
    label.innerHTML = `
      <input type="checkbox" ${isChecked ? "checked" : ""} />
      <span>${task.title}</span>
    `;

    const checkbox = label.querySelector("input");
    checkbox.addEventListener("change", () => {
      if (!state.progress.dailyTasks[lesson.id]) {
        state.progress.dailyTasks[lesson.id] = {};
      }
      state.progress.dailyTasks[lesson.id][task.id] = checkbox.checked;
      label.classList.toggle("checked", checkbox.checked);
      state.progress.points += checkbox.checked ? 5 : -5;
      if (state.progress.points < 0) state.progress.points = 0;
      saveProgress();
    });

    tasksContainer.appendChild(label);
  });
}

function toggleLessonComplete() {
  const lessonId = state.currentLesson.id;
  const idx = state.progress.completedLessons.indexOf(lessonId);

  if (idx === -1) {
    state.progress.completedLessons.push(lessonId);
    state.progress.points += 20;
  } else {
    state.progress.completedLessons.splice(idx, 1);
    state.progress.points = Math.max(0, state.progress.points - 20);
  }

  saveProgress();
  updateCompleteButton();
}

function updateCompleteButton() {
  const isDone = state.progress.completedLessons.includes(state.currentLesson.id);
  completeLessonBtn.textContent = isDone
    ? "الدرس مكتمل ✓ (اضغط للإلغاء)"
    : "تحديد الدرس كمكتمل (+20 نقطة)";
  completeLessonBtn.classList.toggle("completed", isDone);
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("./sw.js").catch((err) => {
      console.warn("فشل تسجيل Service Worker:", err);
    });
  }
}
