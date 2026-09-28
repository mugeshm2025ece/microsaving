import { request } from "./api.js";
import { navigateTo, onPage } from "./navigation.js";

const contributionRows = document.querySelector("#contributions-rows");
const totalElement = document.querySelector("#contributions-total");
const recordCount = document.querySelector("#contributions-record-count");
const historyCount = document.querySelector("#contribution-history-count");
const memberSummarySelect = document.querySelector("#contribution-member-summary");
const memberTotalElement = document.querySelector("#member-contribution-total");
const contributionFeedback = document.querySelector("#contributions-feedback");
const createDialog = document.querySelector("#contribution-create-dialog");
const createForm = document.querySelector("#contribution-create-form");
const createMemberSelect = document.querySelector("#contribution-member");
const createError = document.querySelector("#contribution-create-error");
const createButton = document.querySelector("#submit-contribution-create");

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const state = { groups: [], members: [], contributions: [] };
let contributionLoadPromise;

function escapeHtml(value) {
	return String(value ?? "").replace(/[&<>"']/g, character => ({
		"&": "&amp;",
		"<": "&lt;",
		">": "&gt;",
		'"': "&quot;",
		"'": "&#39;"
	})[character]);
}

function formatAmount(amount) {
	return currencyFormatter.format(Number(amount) || 0);
}

function formatDate(value) {
	return dateFormatter.format(new Date(`${value}T00:00:00`));
}

function todayValue() {
	const now = new Date();
	return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function showFeedback(message, isError = false) {
	contributionFeedback.textContent = message;
	contributionFeedback.classList.toggle("is-error", isError);
	contributionFeedback.hidden = false;
}

function getMember(memberId) {
	return state.members.find(member => String(member.id) === String(memberId));
}

function getGroup(groupId) {
	return state.groups.find(group => String(group.id) === String(groupId));
}

function renderMemberOptions() {
	const options = state.members.map(member => {
		const group = getGroup(member.groupId);
		return `<option value="${escapeHtml(member.id)}">${escapeHtml(member.memberName)}${group ? ` · ${escapeHtml(group.groupName)}` : ""}</option>`;
	}).join("");
	createMemberSelect.innerHTML = `<option value="">Choose a member</option>${options}`;
	memberSummarySelect.innerHTML = `<option value="">Choose a member</option>${options}`;
	memberSummarySelect.disabled = state.members.length === 0;
}

function renderContributions() {
	const contributions = [...state.contributions].sort((first, second) =>
		String(second.contributionDate).localeCompare(String(first.contributionDate)) || Number(second.id) - Number(first.id)
	);
	const total = contributions.reduce((sum, item) => sum + Number(item.amount), 0);
	totalElement.textContent = formatAmount(total);
	recordCount.textContent = String(contributions.length);
	historyCount.textContent = `${contributions.length} ${contributions.length === 1 ? "record" : "records"}`;

	if (contributions.length === 0) {
		contributionRows.innerHTML = '<tr><td colspan="5" class="table-message">No contributions recorded yet. Add a contribution to begin the history.</td></tr>';
		updateMemberTotal();
		return;
	}

	contributionRows.innerHTML = contributions.map(contribution => {
		const member = getMember(contribution.memberId);
		const group = member ? getGroup(member.groupId) : null;
		return `
			<tr>
				<td>${escapeHtml(formatDate(contribution.contributionDate))}</td>
				<td class="group-name-cell">${escapeHtml(member?.memberName || `Member ${contribution.memberId}`)}</td>
				<td>${escapeHtml(group?.groupName || (member ? `Group ${member.groupId}` : "Unavailable"))}</td>
				<td class="group-id-cell">${escapeHtml(contribution.id)}</td>
				<td class="contribution-amount-cell">${escapeHtml(formatAmount(contribution.amount))}</td>
			</tr>`;
	}).join("");
	updateMemberTotal();
}

function updateMemberTotal() {
	const selectedMemberId = memberSummarySelect.value;
	if (!selectedMemberId) {
		memberTotalElement.textContent = "--";
		return;
	}
	const amount = state.contributions
		.filter(contribution => String(contribution.memberId) === selectedMemberId)
		.reduce((sum, contribution) => sum + Number(contribution.amount), 0);
	memberTotalElement.textContent = formatAmount(amount);
}

function loadContributionData() {
	if (contributionLoadPromise) return contributionLoadPromise;
	contributionLoadPromise = loadContributionDataFromApi().finally(() => {
		contributionLoadPromise = null;
	});
	return contributionLoadPromise;
}

async function loadContributionDataFromApi() {
	totalElement.textContent = "Loading";
	recordCount.textContent = "--";
	historyCount.textContent = "Loading";
	contributionRows.innerHTML = '<tr><td colspan="5" class="table-message">Loading contributions…</td></tr>';

	try {
		state.groups = await request("/api/groups");
		const memberLists = await Promise.all(
			state.groups.map(group => request(`/api/groups/${encodeURIComponent(group.id)}/members`))
		);
		state.members = memberLists.flat();
		const contributionLists = await Promise.all(
			state.members.map(member => request(`/api/members/${encodeURIComponent(member.id)}/contributions`))
		);
		state.contributions = contributionLists.flat();
		renderMemberOptions();
		renderContributions();
		return true;
	} catch (error) {
		totalElement.textContent = "Unavailable";
		recordCount.textContent = "Unavailable";
		historyCount.textContent = "Unavailable";
		contributionRows.innerHTML = `<tr><td colspan="5" class="table-message table-error">${escapeHtml(error.message)}</td></tr>`;
		showFeedback(error.message, true);
		return false;
	}
}

async function openContributionForm() {
	const loaded = await navigateTo("contributions");
	if (!loaded) return;
	if (state.members.length === 0) {
		showFeedback("Add a member before recording a contribution.", true);
		return;
	}
	createForm.reset();
	createError.hidden = true;
	document.querySelector("#contribution-date").value = todayValue();
	createDialog.showModal();
}

document.querySelectorAll('[data-action="add-contribution"]').forEach(button => {
	button.addEventListener("click", event => {
		event.preventDefault();
		openContributionForm();
	});
});

document.querySelector("#open-contribution-form").addEventListener("click", openContributionForm);
document.querySelector("#refresh-contributions").addEventListener("click", () => {
	contributionFeedback.hidden = true;
	loadContributionData();
});
memberSummarySelect.addEventListener("change", updateMemberTotal);
document.querySelector("#close-contribution-create").addEventListener("click", () => createDialog.close());
document.querySelector("#cancel-contribution-create").addEventListener("click", () => createDialog.close());

createForm.addEventListener("submit", async event => {
	event.preventDefault();
	createError.hidden = true;
	const values = new FormData(createForm);
	const amount = Number(values.get("amount"));
	if (!Number.isFinite(amount) || amount <= 0) {
		createError.textContent = "Contribution amount must be greater than zero.";
		createError.hidden = false;
		return;
	}
	createButton.disabled = true;

	try {
		await request(`/api/members/${encodeURIComponent(values.get("memberId"))}/contributions`, {
			method: "POST",
			body: JSON.stringify({ amount: values.get("amount"), contributionDate: values.get("contributionDate") })
		});
		window.dispatchEvent(new Event("microsave:refresh-dashboard"));
		createDialog.close();
		createForm.reset();
		const refreshed = await loadContributionData();
		showFeedback(refreshed ? "Contribution recorded successfully." : "Contribution was recorded, but the history could not be refreshed.", !refreshed);
	} catch (error) {
		createError.textContent = error.message;
		createError.hidden = false;
	} finally {
		createButton.disabled = false;
	}
});

onPage("contributions", () => {
	contributionFeedback.hidden = true;
	return loadContributionData();
});
