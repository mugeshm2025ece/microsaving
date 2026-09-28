import { request } from "./api.js";
import { navigateTo, onPage } from "./navigation.js";

const repaymentRows = document.querySelector("#repayments-rows");
const repaymentCount = document.querySelector("#repayments-count");
const repaymentFilter = document.querySelector("#repayment-loan-filter");
const selectedLoanPanel = document.querySelector("#repayment-selected-loan");
const repaymentFeedback = document.querySelector("#repayments-feedback");
const createDialog = document.querySelector("#repayment-create-dialog");
const createForm = document.querySelector("#repayment-create-form");
const createLoanSelect = document.querySelector("#repayment-create-loan");
const createLoanContext = document.querySelector("#repayment-loan-context");
const createError = document.querySelector("#repayment-create-error");
const createButton = document.querySelector("#submit-repayment-create");

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const state = { groups: [], members: [], loans: [], repayments: [] };
let loadPromise;

function escapeHtml(value) {
	return String(value ?? "").replace(/[&<>"']/g, character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	})[character]);
}

function showFeedback(message, isError = false) {
	repaymentFeedback.textContent = message;
	repaymentFeedback.classList.toggle("is-error", isError);
	repaymentFeedback.hidden = false;
}

function formatAmount(amount) {
	return currencyFormatter.format(Number(amount) || 0);
}

function formatDate(value) {
	if (!value) return "Date unavailable";
	return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function todayValue() {
	const now = new Date();
	return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function getLoan(loanId) {
	return state.loans.find(loan => String(loan.id) === String(loanId));
}

function getMember(memberId) {
	return state.members.find(member => String(member.id) === String(memberId));
}

function getGroup(groupId) {
	return state.groups.find(group => String(group.id) === String(groupId));
}

function loanLabel(loan) {
	const member = getMember(loan.memberId);
	const group = getGroup(loan.groupId);
	return `Loan ${loan.id} · ${member?.memberName || `Member ${loan.memberId}`} · ${formatAmount(loan.amount)}${group ? ` · ${group.groupName}` : ""}`;
}

function renderLoanOptions() {
	const options = state.loans.map(loan => `<option value="${escapeHtml(loan.id)}">${escapeHtml(loanLabel(loan))}</option>`).join("");
	const currentFilter = repaymentFilter.value;
	const currentCreate = createLoanSelect.value;
	repaymentFilter.innerHTML = `<option value="all">All loans</option>${options}`;
	createLoanSelect.innerHTML = `<option value="">Choose a loan</option>${options}`;
	if (state.loans.some(loan => String(loan.id) === currentFilter)) repaymentFilter.value = currentFilter;
	if (state.loans.some(loan => String(loan.id) === currentCreate)) createLoanSelect.value = currentCreate;
	renderSelectedLoan();
	updateCreateLoanContext();
}

function renderSelectedLoan() {
	const loan = repaymentFilter.value && repaymentFilter.value !== "all" ? getLoan(repaymentFilter.value) : null;
	if (!loan) {
		selectedLoanPanel.hidden = true;
		selectedLoanPanel.innerHTML = "";
		return;
	}
	selectedLoanPanel.innerHTML = `
		<div><span>Loan amount</span><strong>${escapeHtml(formatAmount(loan.amount))}</strong></div>
		<div><span>Loan date</span><strong>${escapeHtml(formatDate(loan.loanDate))}</strong></div>
		<div><span>Status</span><strong>${escapeHtml(loan.loanStatus || "Unavailable")}</strong></div>
		<div><span>Outstanding amount</span><strong>Not provided by API</strong></div>`;
	selectedLoanPanel.hidden = false;
}

function updateCreateLoanContext() {
	const loan = getLoan(createLoanSelect.value);
	if (!loan) {
		createLoanContext.hidden = true;
		createLoanContext.innerHTML = "";
		return;
	}
	createLoanContext.innerHTML = `
		<div><dt>Loan amount</dt><dd>${escapeHtml(formatAmount(loan.amount))}</dd></div>
		<div><dt>Loan date</dt><dd>${escapeHtml(formatDate(loan.loanDate))}</dd></div>
		<div><dt>Loan status</dt><dd>${escapeHtml(loan.loanStatus || "Unavailable")}</dd></div>
		<div><dt>Outstanding amount</dt><dd>Not provided by API</dd></div>`;
	createLoanContext.hidden = false;
}

function renderRepayments() {
	const loanId = repaymentFilter.value;
	const repayments = state.repayments
		.filter(repayment => loanId === "all" || !loanId || String(repayment.loanId) === loanId)
		.sort((first, second) => String(second.repaymentDate).localeCompare(String(first.repaymentDate)) || Number(second.id) - Number(first.id));
	repaymentCount.textContent = `${repayments.length} ${repayments.length === 1 ? "repayment" : "repayments"}`;

	if (repayments.length === 0) {
		repaymentRows.innerHTML = '<tr><td colspan="6" class="table-message">No repayments recorded for this selection.</td></tr>';
		return;
	}

	repaymentRows.innerHTML = repayments.map(repayment => {
		const loan = getLoan(repayment.loanId);
		const member = loan ? getMember(loan.memberId) : null;
		const group = loan ? getGroup(loan.groupId) : null;
		return `
			<tr>
				<td>${escapeHtml(formatDate(repayment.repaymentDate))}</td>
				<td class="group-name-cell">${escapeHtml(member?.memberName || (loan ? `Member ${loan.memberId}` : "Unavailable"))}</td>
				<td>${escapeHtml(group?.groupName || (loan ? `Group ${loan.groupId}` : "Unavailable"))}</td>
				<td class="group-id-cell">${escapeHtml(repayment.loanId)}</td>
				<td class="group-id-cell">${escapeHtml(repayment.id)}</td>
				<td class="repayment-amount-cell">${escapeHtml(formatAmount(repayment.amount))}</td>
			</tr>`;
	}).join("");
}

async function loadRepaymentDataFromApi() {
	repaymentCount.textContent = "Loading";
	repaymentRows.innerHTML = '<tr><td colspan="6" class="table-message">Loading repayments…</td></tr>';

	try {
		state.groups = await request("/api/groups");
		const memberLists = await Promise.all(
			state.groups.map(group => request(`/api/groups/${encodeURIComponent(group.id)}/members`))
		);
		state.members = memberLists.flat();
		const loanLists = await Promise.all(
			state.groups.map(group => request(`/api/groups/${encodeURIComponent(group.id)}/loans`))
		);
		state.loans = loanLists.flat();
		renderLoanOptions();
		const repaymentLists = await Promise.all(
			state.loans.map(loan => request(`/api/loans/${encodeURIComponent(loan.id)}/repayments`))
		);
		state.repayments = repaymentLists.flat();
		renderRepayments();
		return true;
	} catch (error) {
		repaymentCount.textContent = "Unavailable";
		repaymentRows.innerHTML = `<tr><td colspan="6" class="table-message table-error">${escapeHtml(error.message)}</td></tr>`;
		showFeedback(error.message, true);
		return false;
	}
}

function loadRepaymentData() {
	if (loadPromise) return loadPromise;
	loadPromise = loadRepaymentDataFromApi().finally(() => {
		loadPromise = null;
	});
	return loadPromise;
}

async function openRepaymentForm() {
	const loaded = await navigateTo("repayments");
	if (!loaded) return;
	if (state.loans.length === 0) {
		showFeedback("Create a loan before recording a repayment.", true);
		return;
	}
	createForm.reset();
	createError.hidden = true;
	document.querySelector("#repayment-date").value = todayValue();
	if (repaymentFilter.value && repaymentFilter.value !== "all") createLoanSelect.value = repaymentFilter.value;
	updateCreateLoanContext();
	createDialog.showModal();
}

document.querySelectorAll('[data-action="record-repayment"]').forEach(button => {
	button.addEventListener("click", event => {
		event.preventDefault();
		openRepaymentForm();
	});
});

document.querySelector("#open-repayment-form").addEventListener("click", openRepaymentForm);
document.querySelector("#refresh-repayments").addEventListener("click", () => {
	repaymentFeedback.hidden = true;
	loadRepaymentData();
});
repaymentFilter.addEventListener("change", () => {
	renderSelectedLoan();
	renderRepayments();
});
createLoanSelect.addEventListener("change", updateCreateLoanContext);
document.querySelector("#close-repayment-create").addEventListener("click", () => createDialog.close());
document.querySelector("#cancel-repayment-create").addEventListener("click", () => createDialog.close());

createForm.addEventListener("submit", async event => {
	event.preventDefault();
	createError.hidden = true;
	const values = new FormData(createForm);
	const amount = Number(values.get("amount"));
	if (!Number.isFinite(amount) || amount <= 0) {
		createError.textContent = "Repayment amount must be greater than zero.";
		createError.hidden = false;
		return;
	}
	createButton.disabled = true;

	try {
		await request(`/api/loans/${encodeURIComponent(values.get("loanId"))}/repayments`, {
			method: "POST",
			body: JSON.stringify({ amount, repaymentDate: values.get("repaymentDate") })
		});
		createDialog.close();
		createForm.reset();
		repaymentFilter.value = String(values.get("loanId"));
		const refreshed = await loadRepaymentData();
		window.dispatchEvent(new Event("microsave:refresh-dashboard"));
		showFeedback(refreshed ? "Repayment recorded successfully." : "Repayment recorded successfully, but repayment history could not be refreshed.", !refreshed);
	} catch (error) {
		createError.textContent = error.message;
		createError.hidden = false;
	} finally {
		createButton.disabled = false;
	}
});

onPage("repayments", () => {
	repaymentFeedback.hidden = true;
	return loadRepaymentData();
});
