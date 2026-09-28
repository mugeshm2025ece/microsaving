import { request } from "./api.js";

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
const actionDialog = document.querySelector("#action-dialog");
const actionForm = document.querySelector("#action-form");
const formFields = document.querySelector("#form-fields");
const formError = document.querySelector("#form-error");
const notice = document.querySelector("#dashboard-notice");

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

function localDateValue() {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function setConnection(status, label) {
  const indicator = document.querySelector("#connection-indicator");
  indicator.classList.toggle("is-connected", status === "connected");
  indicator.classList.toggle("is-error", status === "error");
  document.querySelector("#connection-label").textContent = label;
}

let noticeTimeout;
function showNotice(message, isError = false) {
  notice.textContent = message;
  notice.classList.toggle("is-error", isError);
  notice.hidden = false;
  clearTimeout(noticeTimeout);
  noticeTimeout = setTimeout(() => { notice.hidden = true; }, 4200);
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

function optionsFor(items, idKey, labelFor, prompt) {
  const options = items.map(item => `<option value="${item[idKey]}">${escapeHtml(labelFor(item))}</option>`).join("");
  return `<option value="">${escapeHtml(prompt)}</option>${options}`;
}

function fieldMarkup({ name, label, type = "text", required = true, value = "", options = "" }) {
  const requiredAttribute = required ? "required" : "";
  if (type === "select") {
    return `<div class="form-field"><label for="field-${name}">${label}</label><select id="field-${name}" name="${name}" ${requiredAttribute}>${options}</select></div>`;
  }
  return `<div class="form-field"><label for="field-${name}">${label}</label><input id="field-${name}" name="${name}" type="${type}" ${type === "number" ? 'min="0.01" step="0.01"' : ""} value="${value}" ${requiredAttribute}></div>`;
}

function getActionConfig(action) {
  const memberOptions = optionsFor(state.members, "id", member => `${member.memberName} · group ${member.groupId}`, "Choose a member");
  const groupOptions = optionsFor(state.groups, "id", group => group.groupName, "Choose a group");
  const loanOptions = optionsFor(state.loans, "id", loan => {
    const memberName = state.members.find(member => member.id === loan.memberId)?.memberName || `Member ${loan.memberId}`;
    return `${memberName} · ${formatCurrency(getOutstandingAmount(loan))} outstanding`;
  }, "Choose a loan");

  const configs = {
    "add-group": {
      title: "Add a group", url: "/api/groups", fields: [
        { name: "groupName", label: "Group name" }
      ], body: values => ({ groupName: values.groupName })
    },
    "add-member": {
      title: "Add a member", fields: [
        { name: "groupId", label: "Savings group", type: "select", options: groupOptions },
        { name: "memberName", label: "Member name" }
      ], url: values => `/api/groups/${values.groupId}/members`, body: values => ({ memberName: values.memberName })
    },
    "add-contribution": {
      title: "Record a contribution", fields: [
        { name: "memberId", label: "Member", type: "select", options: memberOptions },
        { name: "amount", label: "Amount (INR)", type: "number" },
        { name: "contributionDate", label: "Contribution date", type: "date", value: localDateValue() }
      ], url: values => `/api/members/${values.memberId}/contributions`, body: values => ({ amount: Number(values.amount), contributionDate: values.contributionDate })
    },
    "create-loan": {
      title: "Create a loan", fields: [
        { name: "memberId", label: "Member", type: "select", options: memberOptions },
        { name: "amount", label: "Loan amount (INR)", type: "number" },
        { name: "loanDate", label: "Loan date", type: "date", value: localDateValue() }
      ], url: values => `/api/members/${values.memberId}/loans`, body: values => ({ amount: Number(values.amount), loanDate: values.loanDate })
    },
    "record-repayment": {
      title: "Record a repayment", fields: [
        { name: "loanId", label: "Loan", type: "select", options: loanOptions },
        { name: "amount", label: "Repayment amount (INR)", type: "number" },
        { name: "repaymentDate", label: "Repayment date", type: "date", value: localDateValue() }
      ], url: values => `/api/loans/${values.loanId}/repayments`, body: values => ({ amount: Number(values.amount), repaymentDate: values.repaymentDate })
    }
  };
  return configs[action];
}

function openAction(action) {
  const config = getActionConfig(action);
  if (!config) return;
  if (action === "add-member" && state.groups.length === 0) return showNotice("Create a group before adding a member.", true);
  if (["add-contribution", "create-loan"].includes(action) && state.members.length === 0) return showNotice("Add a member before continuing.", true);
  if (action === "record-repayment" && state.loans.length === 0) return showNotice("Create a loan before recording a repayment.", true);

  actionForm.dataset.action = action;
  document.querySelector("#dialog-title").textContent = config.title;
  document.querySelector("#form-fields").innerHTML = config.fields.map(fieldMarkup).join("");
  document.querySelector("#form-error").hidden = true;
  document.querySelector("#submit-dialog").disabled = false;
  actionDialog.showModal();
}

document.querySelectorAll("[data-action]").forEach(element => {
  element.addEventListener("click", event => {
    event.preventDefault();
    openAction(element.dataset.action);
  });
});

document.querySelector("#refresh-dashboard").addEventListener("click", loadDashboard);
document.querySelector("#close-dialog").addEventListener("click", () => actionDialog.close());
document.querySelector("#cancel-dialog").addEventListener("click", () => actionDialog.close());

actionForm.addEventListener("submit", async event => {
  event.preventDefault();
  const config = getActionConfig(actionForm.dataset.action);
  const values = Object.fromEntries(new FormData(actionForm));
  const submitButton = document.querySelector("#submit-dialog");
  submitButton.disabled = true;
  formError.hidden = true;

  try {
    await request(typeof config.url === "function" ? config.url(values) : config.url, {
      method: "POST",
      body: JSON.stringify(config.body(values))
    });
    actionDialog.close();
    showNotice(`${config.title} saved successfully.`);
    await loadDashboard();
  } catch (error) {
    formError.textContent = error.message;
    formError.hidden = false;
  } finally {
    submitButton.disabled = false;
  }
});

const todayText = dateFormatter.format(new Date());
document.querySelector("#today-date").textContent = todayText;
document.querySelector("#welcome-date").textContent = todayText;
loadDashboard();
