const API_VERSION = "2022-11-28";
const LANGUAGE_STORAGE_KEY = "gittyage-language";
const DISPLAY_TIME_ZONE = "Asia/Shanghai";
const COPY = {
  en: {
    htmlLang: "en",
    locale: "en-US",
    documentTitle: "GitHub Account Age Checker",
    heading: "GitHub Account Age Checker",
    description: "Look up a GitHub user and see when the account was created.",
    usernameLabel: "GitHub username",
    usernamePlaceholder: "octocat",
    check: "Check",
    checking: "Checking...",
    resultUsername: "Username",
    resultCreatedAt: "Created at",
    resultAge: "Account age",
    hint: "Public GitHub data only. No token is used in this page.",
    languageButtonLabel: "Switch to Chinese",
    languageCode: "中",
    enterUsername: "Enter a GitHub username.",
    loading: "Loading...",
    missingCreatedAt: "GitHub response did not include created_at.",
    loaded: "Loaded successfully.",
    unable: "Unable to reach GitHub.",
    userNotFound: ({ username }) => `User not found: ${username}`,
    rateLimited: ({ message, resetHeader }) => {
      const resetTime = formatResetTime(resetHeader);
      const resetText = resetTime ? ` Try again after ${resetTime}.` : "";
      return `${message || "GitHub rejected the request."}${resetText} If you are using a proxy or VPN, turn it off or switch networks and try again.`;
    },
    genericError: ({ message }) => message || "Unable to reach GitHub.",
    age: ({ days, hours, minutes }) => `${days} days, ${hours} hours, ${minutes} minutes`,
    ageYears: ({ years }) => `about ${years} years`,
    showYearsLabel: "Show account age in years",
    showDaysLabel: "Show account age in days",
    timeZoneLabel: "China Standard Time",
    footnote: "",
  },
  zh: {
    htmlLang: "zh-CN",
    locale: "zh-CN",
    documentTitle: "GitHub 账号年龄查询",
    heading: "GitHub 账号年龄查询",
    description: "输入 GitHub 用户名，查看账号创建时间。",
    usernameLabel: "GitHub 用户名",
    usernamePlaceholder: "octocat",
    check: "查询",
    checking: "查询中...",
    resultUsername: "用户名",
    resultCreatedAt: "创建时间",
    resultAge: "账号年龄",
    hint: "仅使用 GitHub 公开数据。本页面不会使用或保存令牌。",
    languageButtonLabel: "切换到英文",
    languageCode: "EN",
    enterUsername: "请输入 GitHub 用户名。",
    loading: "加载中...",
    missingCreatedAt: "GitHub 响应中没有 created_at 字段。",
    loaded: "加载成功。",
    unable: "无法连接 GitHub。",
    userNotFound: ({ username }) => `未找到用户：${username}`,
    rateLimited: ({ message, resetHeader }) => {
      const resetTime = formatResetTime(resetHeader);
      const resetText = resetTime ? ` 请在 ${resetTime} 后重试。` : "";
      return `GitHub 拒绝了请求：${message || "可能是请求频率限制。"}${resetText} 如果你正在使用代理或 VPN，请关闭代理或切换网络后再试。`;
    },
    genericError: ({ message }) => message || "无法连接 GitHub。",
    age: ({ days, hours, minutes }) => `${days} 天 ${hours} 小时 ${minutes} 分钟`,
    ageYears: ({ years }) => `约 ${years} 年`,
    showYearsLabel: "以年显示账号年龄",
    showDaysLabel: "以天显示账号年龄",
    timeZoneLabel: "中国标准时间",
    footnote: "",
  },
};

const form = document.getElementById("lookup-form");
const pageTitle = document.getElementById("page-title");
const pageDescription = document.getElementById("page-description");
const languageButton = document.getElementById("language-button");
const languageCode = document.getElementById("language-code");
const usernameInput = document.getElementById("username");
const checkButton = document.getElementById("check-button");
const result = document.getElementById("result");
const labelLogin = document.getElementById("label-login");
const labelCreatedAt = document.getElementById("label-created-at");
const labelAge = document.getElementById("label-age");
const resultLogin = document.getElementById("result-login");
const resultCreatedAt = document.getElementById("result-created-at");
const resultAge = document.getElementById("result-age");
const ageToggle = document.getElementById("age-toggle");
const status = document.getElementById("status");
const hint = document.getElementById("hint");
const footnote = document.getElementById("footnote");

let currentLanguage = getInitialLanguage();
let isBusy = false;
let lastCreatedAt = "";
let ageDisplayMode = "days";
let lastStatus = null;

function getCopy() {
  return COPY[currentLanguage];
}

function getInitialLanguage() {
  try {
    const storedLanguage = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (storedLanguage in COPY) {
      return storedLanguage;
    }
  } catch {
    // Ignore storage failures; language detection still works.
  }

  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

function saveLanguage(language) {
  try {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // Persisting the language is optional.
  }
}

function setStatus(message, kind = "") {
  status.textContent = message;
  status.className = `status${kind ? ` ${kind}` : ""}`;
}

function setLocalizedStatus(key, kind = "", values = {}) {
  lastStatus = { key, kind, values };
  renderStatus();
}

function renderStatus() {
  if (!lastStatus) {
    setStatus("", "");
    return;
  }

  const copy = getCopy();
  const statusCopy = copy[lastStatus.key];
  const message = typeof statusCopy === "function"
    ? statusCopy(lastStatus.values)
    : statusCopy;
  setStatus(message, lastStatus.kind);
}

function setBusy(nextBusy) {
  isBusy = nextBusy;
  checkButton.disabled = nextBusy;
  usernameInput.disabled = nextBusy;
  checkButton.textContent = nextBusy ? getCopy().checking : getCopy().check;
}

function formatAge(createdAt) {
  const created = new Date(createdAt);
  const diff = Math.max(0, Date.now() - created.getTime());
  const totalMinutes = Math.floor(diff / 60000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;
  return getCopy().age({ days, hours, minutes });
}

function formatAgeYears(createdAt) {
  const created = new Date(createdAt);
  const diff = Math.max(0, Date.now() - created.getTime());
  const years = diff / (365.2425 * 24 * 60 * 60 * 1000);
  const formattedYears = new Intl.NumberFormat(getCopy().locale, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(years);
  return getCopy().ageYears({ years: formattedYears });
}

function formatCreatedAt(createdAt) {
  const formattedTime = new Intl.DateTimeFormat(getCopy().locale, {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(createdAt));
  return `${formattedTime} (${getCopy().timeZoneLabel})`;
}

function formatResetTime(resetHeader) {
  if (!resetHeader) {
    return "";
  }

  const resetSeconds = Number(resetHeader);
  if (!Number.isFinite(resetSeconds)) {
    return "";
  }

  const resetDate = new Date(resetSeconds * 1000);
  return new Intl.DateTimeFormat(getCopy().locale, {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(resetDate);
}

function applyLanguage() {
  const copy = getCopy();
  document.documentElement.lang = copy.htmlLang;
  document.title = copy.documentTitle;
  pageTitle.textContent = copy.heading;
  pageDescription.textContent = copy.description;
  document.querySelector("label[for='username']").textContent = copy.usernameLabel;
  usernameInput.placeholder = copy.usernamePlaceholder;
  checkButton.textContent = isBusy ? copy.checking : copy.check;
  labelLogin.textContent = copy.resultUsername;
  labelCreatedAt.textContent = copy.resultCreatedAt;
  labelAge.textContent = copy.resultAge;
  hint.textContent = copy.hint;
  footnote.textContent = copy.footnote;
  languageButton.title = copy.languageButtonLabel;
  languageButton.setAttribute("aria-label", copy.languageButtonLabel);
  languageCode.textContent = copy.languageCode;

  if (lastCreatedAt) {
    resultCreatedAt.textContent = formatCreatedAt(lastCreatedAt);
  }
  renderAge();
  renderStatus();
}

function renderAge() {
  if (!lastCreatedAt) {
    resultAge.textContent = "-";
    ageToggle.classList.add("hidden");
    return;
  }

  const copy = getCopy();
  resultAge.textContent = ageDisplayMode === "years"
    ? formatAgeYears(lastCreatedAt)
    : formatAge(lastCreatedAt);

  const label = ageDisplayMode === "years"
    ? copy.showDaysLabel
    : copy.showYearsLabel;
  ageToggle.title = label;
  ageToggle.setAttribute("aria-label", label);
  ageToggle.classList.remove("hidden");
}

async function fetchUser(username) {
  const response = await fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": API_VERSION,
    },
  });

  let payload = {};
  try {
    payload = await response.json();
  } catch {
    payload = {};
  }

  if (!response.ok) {
    const error = new Error(payload.message || `HTTP ${response.status}`);
    error.status = response.status;
    error.payload = payload;
    error.rateLimit = {
      limit: response.headers.get("X-RateLimit-Limit"),
      remaining: response.headers.get("X-RateLimit-Remaining"),
      reset: response.headers.get("X-RateLimit-Reset"),
    };
    throw error;
  }

  return payload;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) {
    setLocalizedStatus("enterUsername", "error");
    result.classList.add("hidden");
    return;
  }

  setBusy(true);
  setLocalizedStatus("loading");
  result.classList.remove("hidden");

  try {
    const user = await fetchUser(username);
    const createdAt = user.created_at;
    if (!createdAt) {
      throw new Error(getCopy().missingCreatedAt);
    }

    lastCreatedAt = createdAt;
    ageDisplayMode = "days";
    resultLogin.textContent = user.login || username;
    resultCreatedAt.textContent = formatCreatedAt(createdAt);
    renderAge();
    setLocalizedStatus("loaded", "success");
  } catch (error) {
    lastCreatedAt = "";
    resultLogin.textContent = "-";
    resultCreatedAt.textContent = "-";
    renderAge();

    if (error.status === 404) {
      setLocalizedStatus("userNotFound", "error", { username });
    } else if (error.status === 403 || error.status === 429) {
      setLocalizedStatus("rateLimited", "error", {
        message: error.message,
        resetHeader: error.rateLimit?.reset,
      });
    } else {
      setLocalizedStatus("genericError", "error", { message: error.message });
    }
  } finally {
    setBusy(false);
  }
});

languageButton.addEventListener("click", () => {
  currentLanguage = currentLanguage === "en" ? "zh" : "en";
  saveLanguage(currentLanguage);
  applyLanguage();
});

ageToggle.addEventListener("click", () => {
  ageDisplayMode = ageDisplayMode === "days" ? "years" : "days";
  renderAge();
});

applyLanguage();
