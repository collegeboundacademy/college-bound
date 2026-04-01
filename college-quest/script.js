const app = document.getElementById("app");
const API_BASE = "http://localhost:8080/api/quest-board";

let backendStatus = "Local only";

const initialState = {
  player: {
    name: "Student",
    level: 1,
    xp: 35,
    xpNeeded: 100,
    coins: 12,
    streak: 2,
  },
  dailyQuests: [
    {
      id: "ask-expert",
      title: "Ask the Expert",
      description: "Ask a teacher, counselor, or adult one question about college.",
      xpReward: 20,
      coinReward: 5,
      type: "daily",
      completed: false,
      icon: "💬",
    },
    {
      id: "college-deep-dive",
      title: "College Deep Dive",
      description: "Spend 5 minutes researching one college.",
      xpReward: 15,
      coinReward: 3,
      type: "daily",
      completed: false,
      icon: "🔎",
    },
    {
      id: "future-reflection",
      title: "Future Reflection",
      description: "Write down 3 goals, interests, or future ideas.",
      xpReward: 10,
      coinReward: 0,
      type: "daily",
      completed: false,
      icon: "📝",
    },
  ],
  majorQuests: [
    {
      id: "join-something",
      title: "Join Something",
      description: "Try a club, activity, or school event.",
      xpReward: 25,
      coinReward: 10,
      type: "major",
      completed: false,
      icon: "🎯",
    },
    {
      id: "talk-counselor",
      title: "Talk to a Counselor",
      description: "Have a real conversation about your future path.",
      xpReward: 25,
      coinReward: 5,
      type: "major",
      completed: false,
      icon: "🧭",
    },
    {
      id: "scholarship-scout",
      title: "Scholarship Scout",
      description: "Find one scholarship or financial aid opportunity.",
      xpReward: 20,
      coinReward: 4,
      type: "major",
      completed: false,
      icon: "🎓",
    },
  ],
  bonusQuest: {
    id: "campus-curiosity",
    title: "Campus Curiosity",
    description: "Ask someone what they studied after high school and what they learned from it.",
    xpReward: 30,
    coinReward: 10,
    type: "bonus",
    completed: false,
    icon: "🌟",
  },
  badges: [
    { id: "first-step", label: "First Step", icon: "🥾", unlocked: false },
    { id: "on-a-roll", label: "On a Roll", icon: "🔥", unlocked: false },
    { id: "explorer", label: "Explorer", icon: "🧠", unlocked: false },
    { id: "scholarship-scout", label: "Scholarship Scout", icon: "🏅", unlocked: false },
  ],
  ui: {
    feedback: "",
    levelUp: false,
    lastRewardByQuest: {},
  },
};

let state = cloneState(initialState);

function cloneState(source) {
  return {
    player: { ...source.player },
    dailyQuests: source.dailyQuests.map((quest) => ({ ...quest })),
    majorQuests: source.majorQuests.map((quest) => ({ ...quest })),
    bonusQuest: { ...source.bonusQuest },
    badges: source.badges.map((badge) => ({ ...badge })),
    ui: {
      feedback: "",
      levelUp: false,
      lastRewardByQuest: {},
    },
  };
}

function hydrateState(payload) {
  const hydrated = cloneState(initialState);

  if (!payload || typeof payload !== "object") {
    return hydrated;
  }

  if (payload.player && typeof payload.player === "object") {
    hydrated.player = { ...hydrated.player, ...payload.player };
  }

  if (Array.isArray(payload.dailyQuests)) {
    hydrated.dailyQuests = payload.dailyQuests.map((quest) => ({ ...quest }));
  }

  if (Array.isArray(payload.majorQuests)) {
    hydrated.majorQuests = payload.majorQuests.map((quest) => ({ ...quest }));
  }

  if (payload.bonusQuest && typeof payload.bonusQuest === "object") {
    hydrated.bonusQuest = { ...payload.bonusQuest };
  }

  if (Array.isArray(payload.badges)) {
    hydrated.badges = payload.badges.map((badge) => ({ ...badge }));
  }

  return hydrated;
}

function serializeStateForBackend() {
  return {
    player: state.player,
    dailyQuests: state.dailyQuests,
    majorQuests: state.majorQuests,
    bonusQuest: state.bonusQuest,
    badges: state.badges,
  };
}

async function loadStateFromBackend() {
  try {
    const response = await fetch(`${API_BASE}/state`, {
      method: "GET",
      headers: { Accept: "application/json" },
      credentials: "include",
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    const payload = await response.json();
    backendStatus = "Connected";

    if (payload && payload.notFound) {
      state.ui.feedback = "Backend connected. No saved progress yet for this user.";
      renderApp();
      return;
    }

    state = hydrateState(payload);
    state.ui.feedback = "Loaded saved progress from backend.";
    renderApp();
  } catch (error) {
    backendStatus = "Offline (local fallback)";
    renderApp();
  }
}

async function persistStateToBackend() {
  try {
    const response = await fetch(`${API_BASE}/state`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(serializeStateForBackend()),
    });

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status}`);
    }

    backendStatus = "Connected";
    renderApp();
  } catch (error) {
    backendStatus = "Offline (local fallback)";
    renderApp();
  }
}

function getXpPercent() {
  return Math.max(0, Math.min(100, (state.player.xp / state.player.xpNeeded) * 100));
}

function totalCompletedQuests() {
  const dailyDone = state.dailyQuests.filter((quest) => quest.completed).length;
  const majorDone = state.majorQuests.filter((quest) => quest.completed).length;
  const bonusDone = state.bonusQuest.completed ? 1 : 0;
  return dailyDone + majorDone + bonusDone;
}

function unlockBadges() {
  const completed = totalCompletedQuests();
  const completedMajor = state.majorQuests.some((quest) => quest.completed);
  const completedDaily = state.dailyQuests.some((quest) => quest.completed);

  state.badges = state.badges.map((badge) => {
    let unlocked = badge.unlocked;

    if (badge.id === "first-step" && completed >= 1) {
      unlocked = true;
    }

    if (badge.id === "on-a-roll" && state.player.streak >= 3) {
      unlocked = true;
    }

    if (badge.id === "explorer" && completedMajor && completedDaily && state.bonusQuest.completed) {
      unlocked = true;
    }

    if (badge.id === "scholarship-scout") {
      unlocked = state.majorQuests.some((quest) => quest.id === "scholarship-scout" && quest.completed);
    }

    return { ...badge, unlocked };
  });
}

function updateLevel() {
  let leveledUp = false;

  while (state.player.xp >= state.player.xpNeeded) {
    state.player.xp -= state.player.xpNeeded;
    state.player.level += 1;
    state.player.xpNeeded = Math.round(state.player.xpNeeded * 1.2);
    leveledUp = true;
  }

  return leveledUp;
}

function getQuestByType(type, id) {
  if (type === "daily") {
    return state.dailyQuests.find((quest) => quest.id === id);
  }

  if (type === "major") {
    return state.majorQuests.find((quest) => quest.id === id);
  }

  if (type === "bonus") {
    return state.bonusQuest.id === id ? state.bonusQuest : null;
  }

  return null;
}

function completeQuest(type, id) {
  const quest = getQuestByType(type, id);
  if (!quest || quest.completed) {
    return;
  }

  state.player.xp += quest.xpReward;
  state.player.coins += quest.coinReward;
  state.player.streak += 1;

  const leveledUp = updateLevel();
  quest.completed = true;

  state.ui.lastRewardByQuest[quest.id] = `+${quest.xpReward} XP | +${quest.coinReward} Coins`;
  state.ui.feedback = `${quest.icon} ${quest.title} complete! +${quest.xpReward} XP, +${quest.coinReward} Coins${leveledUp ? " | Level Up!" : ""}`;
  state.ui.levelUp = leveledUp;

  unlockBadges();
  renderApp();
  persistStateToBackend();
}

function resetDailySession() {
  state.dailyQuests = state.dailyQuests.map((quest) => ({ ...quest, completed: false }));
  state.ui.lastRewardByQuest = {};
  state.ui.feedback = "Daily quests reset for this session.";
  state.ui.levelUp = false;
  renderApp();
  persistStateToBackend();
}

function resetAllProgress() {
  state = cloneState(initialState);
  renderApp();
  persistStateToBackend();
}

function renderStats() {
  const xpPercent = getXpPercent();

  return `
    <section class="qb-grid-5">
      <article class="qb-stat">
        <span class="qb-stat-label">Level</span>
        <strong class="qb-stat-value">${state.player.level}</strong>
      </article>
      <article class="qb-stat">
        <span class="qb-stat-label">XP</span>
        <strong class="qb-stat-value">${state.player.xp} / ${state.player.xpNeeded}</strong>
        <div class="qb-progress-wrap">
          <div class="qb-progress-track">
            <div class="qb-progress-fill" style="width: ${xpPercent}%;"></div>
          </div>
        </div>
      </article>
      <article class="qb-stat">
        <span class="qb-stat-label">Coins</span>
        <strong class="qb-stat-value">🪙 ${state.player.coins}</strong>
      </article>
      <article class="qb-stat">
        <span class="qb-stat-label">Streak</span>
        <strong class="qb-stat-value">🔥 ${state.player.streak}</strong>
      </article>
      <article class="qb-stat">
        <span class="qb-stat-label">Player</span>
        <strong class="qb-stat-value">${state.player.name}</strong>
      </article>
    </section>
  `;
}

function renderQuestCard(quest, extraClass = "") {
  const completedClass = quest.completed ? "qb-complete" : "";
  const rewardText = state.ui.lastRewardByQuest[quest.id];

  return `
    <article class="qb-quest-card ${completedClass} ${extraClass}">
      <div class="qb-quest-head">
        <h3 class="qb-quest-title">${quest.icon} ${quest.title}</h3>
        <button class="qb-btn" data-action="complete" data-type="${quest.type}" data-id="${quest.id}" ${quest.completed ? "disabled" : ""}>
          ${quest.completed ? "Completed" : "Complete"}
        </button>
      </div>
      <p class="qb-quest-desc">${quest.description}</p>
      <div class="qb-rewards">
        <span class="qb-pill qb-pill-xp">+${quest.xpReward} XP</span>
        <span class="qb-pill qb-pill-coin">+${quest.coinReward} Coins</span>
      </div>
      ${rewardText ? `<p class="qb-inline-reward">${rewardText}</p>` : ""}
    </article>
  `;
}

function renderQuests(title, quests) {
  return `
    <section class="qb-section">
      <h2>${title}</h2>
      <div class="qb-quest-list">
        ${quests.map((quest) => renderQuestCard(quest)).join("")}
      </div>
    </section>
  `;
}

function renderBadges() {
  return `
    <section class="qb-section">
      <h2>Badges</h2>
      <div class="qb-badges">
        ${state.badges
          .map((badge) => {
            const className = badge.unlocked ? "qb-badge qb-badge-unlock" : "qb-badge qb-badge-lock";
            return `
              <article class="${className}">
                <span class="qb-badge-icon">${badge.icon}</span>
                <strong>${badge.label}</strong>
                <p class="qb-quest-desc">${badge.unlocked ? "Unlocked" : "Locked"}</p>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderApp() {
  app.innerHTML = `
    <section class="qb-hero">
      <h1>Quest Board</h1>
      <p class="qb-subtitle">Complete real-world college-prep quests to earn XP, coins, levels, and badges.</p>
      <p class="qb-motivate">Small steps now can build your future.</p>
      <p class="qb-backend">Backend status: ${backendStatus}</p>
      <div class="qb-feedback">
        ${state.ui.feedback ? `<p class="qb-feedback-msg">${state.ui.feedback}</p>` : ""}
      </div>
    </section>

    ${renderStats()}

    <div class="qb-layout">
      <div>
        ${renderQuests("Daily Quests", state.dailyQuests)}
        ${renderQuests("Major Quests", state.majorQuests)}
      </div>

      <div>
        <section class="qb-section">
          <h2>Bonus Quest</h2>
          <div class="qb-quest-list">
            ${renderQuestCard(state.bonusQuest, "qb-bonus")}
          </div>
        </section>

        ${renderBadges()}
      </div>
    </div>

    <section class="qb-bottom">
      <h2>Why This Works</h2>
      <p>Real progress becomes easier when it is visible. This board turns small real-life actions into steady momentum toward college readiness.</p>
      <div class="qb-action-row">
        <button class="qb-btn qb-reset" data-action="reset-daily">Reset Daily Quests</button>
        <button class="qb-btn qb-reset" data-action="reset-all">Reset All Progress</button>
      </div>
    </section>
  `;

  app.querySelectorAll("[data-action='complete']").forEach((button) => {
    button.addEventListener("click", () => {
      completeQuest(button.dataset.type, button.dataset.id);
    });
  });

  const resetDailyButton = app.querySelector("[data-action='reset-daily']");
  if (resetDailyButton) {
    resetDailyButton.addEventListener("click", resetDailySession);
  }

  const resetAllButton = app.querySelector("[data-action='reset-all']");
  if (resetAllButton) {
    resetAllButton.addEventListener("click", resetAllProgress);
  }
}

renderApp();
loadStateFromBackend();
