import { request } from "./api.js";
import { onPage } from "./navigation.js";

const state = {
  groups: [],
  members: [],
  contributions: [],
  loans: [],
  repayments: []
};

const summaryElements = Object.fromEntries(
  [...document.querySelectorAll("[data-summary]")].map(element => [element.dataset.summary, element])
);
const currencyFormatter = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });

function formatCurrency(amount) {
  return currencyFormatter.format(Number(amount) || 0);
}

function toMinorUnits(amount) {
  return Math.round(Number(amount) * 100);
}

function formatDate(value) {
  if (!value) return "Date unavailable";
  return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[character]);
}

function setConnection(status, label) {
  const indicator = document.querySelector("#connection-indicator");
  indicator.classList.toggle("is-connected", status === "connected");
  indicator.classList.toggle("is-error", status === "error");
  document.querySelector("#connection-label").textContent = label;
}

function showLoadError(message) {
  for (const element of Object.values(summaryElements)) element.textContent = "Unavailable";
  document.querySelector("#summary-updated").textContent = "Could not load live data";
  document.querySelector("#activity-list").innerHTML = `
    <div class="empty-state">
      <span class="empty-mark" aria-hidden="true">!</span>
      <h3>Dashboard data could not be loaded</h3>
      <p>${escapeHtml(message)}</p>
    </div>`;
  document.querySelector("#activity-count").textContent = "Unavailable";
}

async function loadDashboard() {
  setConnection("connecting", "Loading live data");
  document.querySelector("#summary-updated").textContent = "Loading live data";

  try {
    state.groups = await request("/api/groups");
    const memberLists = await Promise.all(
      state.groups.map(group => request(`/api/groups/${group.id}/members`))
    );
    state.members = memberLists.flat();

    const [contributionLists, loanLists] = await Promise.all([
      Promise.all(state.members.map(member => request(`/api/members/${member.id}/contributions`))),
      Promise.all(state.groups.map(group => request(`/api/groups/${group.id}/loans`)))
    ]);
    state.contributions = contributionLists.flat();
    state.loans = loanLists.flat();
    const repaymentLists = await Promise.all(
      state.loans.map(loan => request(`/api/loans/${loan.id}/repayments`))
    );
    state.repayments = repaymentLists.flat();

    renderSummary();
    renderActivity();
    setConnection("connected", "Connected to API");
    document.querySelector("#summary-updated").textContent = `Updated ${new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit"
    }).format(new Date())}`;
  } catch (error) {
    setConnection("error", "API unavailable");
    showLoadError(error.message);
  }
}

function getOutstandingAmount(loan) {
  const repaid = state.repayments
    .filter(repayment => repayment.loanId === loan.id)
    .reduce((total, repayment) => total + toMinorUnits(repayment.amount), 0);
  return Math.max(toMinorUnits(loan.amount) - repaid, 0) / 100;
}

function renderSummary() {
  const savings = state.contributions.reduce((total, contribution) => total + toMinorUnits(contribution.amount), 0);
  const outstanding = state.loans.reduce((total, loan) => total + toMinorUnits(getOutstandingAmount(loan)), 0);
  summaryElements.groups.textContent = String(state.groups.length);
  summaryElements.members.textContent = String(state.members.length);
  summaryElements.savings.textContent = formatCurrency(savings / 100);
  summaryElements.outstanding.textContent = formatCurrency(outstanding / 100);
  summaryElements.pool.textContent = formatCurrency((savings - outstanding) / 100);
}

function renderActivity() {
  const memberNames = new Map(state.members.map(member => [member.id, member.memberName]));
  const loanById = new Map(state.loans.map(loan => [loan.id, loan]));
  const activities = [
    ...state.contributions.map(item => ({
      kind: "contribution",
      title: `${memberNames.get(item.memberId) || "Member"} saved`,
      detail: "Savings contribution",
      amount: item.amount,
      date: item.contributionDate,
      symbol: "+",
      tone: "amber"
    })),
    ...state.loans.map(item => ({
      kind: "loan",
      title: `${memberNames.get(item.memberId) || "Member"} received a loan`,
      detail: item.loanStatus || "Loan",
      amount: -Number(item.amount),
      date: item.loanDate,
      symbol: "↗",
      tone: "coral"
    })),
    ...state.repayments.map(item => ({
      kind: "repayment",
      title: `${memberNames.get(loanById.get(item.loanId)?.memberId) || "Member"} made a repayment`,
      detail: "Loan repayment",
      amount: item.amount,
      date: item.repaymentDate,
      symbol: "↙",
      tone: "teal"
    }))
  ].sort((first, second) => String(second.date).localeCompare(String(first.date))).slice(0, 8);

  const list = document.querySelector("#activity-list");
  document.querySelector("#activity-count").textContent = `${activities.length} recent ${activities.length === 1 ? "record" : "records"}`;
  if (activities.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <span class="empty-mark" aria-hidden="true">⌁</span>
        <h3>No activity yet</h3>
        <p>Contributions, loans and repayments will appear here as they are recorded.</p>
      </div>`;
    return;
  }

  list.innerHTML = activities.map(activity => `
    <article class="activity-row">
      <span class="activity-symbol ${activity.tone}" aria-hidden="true">${activity.symbol}</span>
      <div class="activity-description">
        <strong>${escapeHtml(activity.title)}</strong>
        <span>${escapeHtml(activity.detail)} · ${formatDate(activity.date)}</span>
      </div>
      <span class="activity-amount">${activity.amount < 0 ? "−" : "+"}${formatCurrency(Math.abs(activity.amount))}</span>
    </article>`).join("");
}

document.querySelector("#refresh-dashboard").addEventListener("click", loadDashboard);
window.addEventListener("microsave:refresh-dashboard", loadDashboard);

const todayText = dateFormatter.format(new Date());
document.querySelector("#today-date").textContent = todayText;
document.querySelector("#welcome-date").textContent = todayText;
onPage("dashboard", loadDashboard);
