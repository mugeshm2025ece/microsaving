import { request } from "./api.js";
import { navigateTo, onPage } from "./navigation.js";

const loanRows = document.querySelector("#loans-rows");
const loanCount = document.querySelector("#loans-count");
const loanFeedback = document.querySelector("#loans-feedback");
const groupFilter = document.querySelector("#loan-group-filter");
const memberFilter = document.querySelector("#loan-member-filter");
const createDialog = document.querySelector("#loan-create-dialog");
const createForm = document.querySelector("#loan-create-form");
const createGroupSelect = document.querySelector("#loan-create-group");
const createMemberSelect = document.querySelector("#loan-create-member");
const createError = document.querySelector("#loan-create-error");
const createButton = document.querySelector("#submit-loan-create");

const currencyFormatter = new Intl.NumberFormat(undefined, {
	style: "currency",
	currency: "INR",
	maximumFractionDigits: 2
});
const dateFormatter = new Intl.DateTimeFormat(undefined, { dateStyle: "medium" });
const state = { groups: [], members: [], loans: [] };
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
	loanFeedback.textContent = message;
	loanFeedback.classList.toggle("is-error", isError);
	loanFeedback.hidden = false;
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

function getGroup(groupId) {
	return state.groups.find(group => String(group.id) === String(groupId));
}

function getMember(memberId) {
	return state.members.find(member => String(member.id) === String(memberId));
}

function membersForGroup(groupId) {
	return state.members.filter(member => String(member.groupId) === String(groupId));
}

function setOptions(select, prompt, items, labelFor) {
	select.innerHTML = `<option value="">${escapeHtml(prompt)}</option>${items.map(item => `<option value="${escapeHtml(item.id)}">${escapeHtml(labelFor(item))}</option>`).join("")}`;
}

function updateMemberOptions() {
	const selectedGroup = groupFilter.value || "all";
	const currentMember = memberFilter.value || "all";
	const visibleMembers = selectedGroup === "all" ? state.members : membersForGroup(selectedGroup);
	setOptions(memberFilter, "All members", visibleMembers, member => member.memberName);
	memberFilter.value = visibleMembers.some(member => String(member.id) === currentMember) ? currentMember : "";

	const groupId = createGroupSelect.value;
	const availableMembers = groupId ? membersForGroup(groupId) : [];
	setOptions(createMemberSelect, groupId ? "Choose a member" : "Choose a group first", availableMembers, member => member.memberName);
	createMemberSelect.disabled = !groupId || availableMembers.length === 0;
}

function renderGroupOptions() {
	const previousFilter = groupFilter.value || "all";
	const previousCreateGroup = createGroupSelect.value;
	setOptions(groupFilter, "All groups", state.groups, group => group.groupName);
	setOptions(createGroupSelect, "Choose a group", state.groups, group => group.groupName);
	groupFilter.value = previousFilter === "all" || state.groups.some(group => String(group.id) === previousFilter) ? previousFilter : "all";
	if (state.groups.some(group => String(group.id) === previousCreateGroup)) createGroupSelect.value = previousCreateGroup;
	updateMemberOptions();
}

function renderLoans(loans) {
	loanCount.textContent = `${loans.length} ${loans.length === 1 ? "loan" : "loans"}`;
	if (loans.length === 0) {
		loanRows.innerHTML = '<tr><td colspan="6" class="table-message">No loans match this selection.</td></tr>';
		return;
	}

	const orderedLoans = [...loans].sort((first, second) =>
		String(second.loanDate).localeCompare(String(first.loanDate)) || Number(second.id) - Number(first.id)
	);
	loanRows.innerHTML = orderedLoans.map(loan => {
		const member = getMember(loan.memberId);
		const group = getGroup(loan.groupId);
		const status = loan.loanStatus || "Unavailable";
		return `
			<tr>
				<td class="group-name-cell">${escapeHtml(member?.memberName || `Member ${loan.memberId}`)}</td>
				<td>${escapeHtml(group?.groupName || `Group ${loan.groupId}`)}</td>
				<td class="loan-amount-cell">${escapeHtml(formatAmount(loan.amount))}</td>
				<td>${escapeHtml(formatDate(loan.loanDate))}</td>
				<td><span class="loan-status">${escapeHtml(status)}</span></td>
				<td class="group-id-cell">${escapeHtml(loan.id)}</td>
			</tr>`;
	}).join("");
}

async function loadLoansFromApi() {
	loanCount.textContent = "Loading";
	loanRows.innerHTML = '<tr><td colspan="6" class="table-message">Loading loans…</td></tr>';

	try {
		state.groups = await request("/api/groups");
		const memberLists = await Promise.all(
			state.groups.map(group => request(`/api/groups/${encodeURIComponent(group.id)}/members`))
		);
		state.members = memberLists.flat();
		renderGroupOptions();

		const selectedGroupId = groupFilter.value;
		const selectedMemberId = memberFilter.value;
		let loans;
		if (selectedMemberId) {
			loans = await request(`/api/members/${encodeURIComponent(selectedMemberId)}/loans`);
		} else {
			const groups = selectedGroupId && selectedGroupId !== "all"
				? state.groups.filter(group => String(group.id) === selectedGroupId)
				: state.groups;
			const loanLists = await Promise.all(
				groups.map(group => request(`/api/groups/${encodeURIComponent(group.id)}/loans`))
			);
			loans = loanLists.flat();
		}
		state.loans = loans;
		renderLoans(loans);
		return true;
	} catch (error) {
		loanCount.textContent = "Unavailable";
		loanRows.innerHTML = `<tr><td colspan="6" class="table-message table-error">${escapeHtml(error.message)}</td></tr>`;
		showFeedback(error.message, true);
		return false;
	}
}

function loadLoans() {
	if (loadPromise) return loadPromise;
	loadPromise = loadLoansFromApi().finally(() => {
		loadPromise = null;
	});
	return loadPromise;
}

async function openLoanForm() {
	const loaded = await navigateTo("loans");
	if (!loaded) return;
	if (state.members.length === 0) {
		showFeedback("Add a member before creating a loan.", true);
		return;
	}
	createForm.reset();
	createError.hidden = true;
	document.querySelector("#loan-date").value = todayValue();
	if (groupFilter.value && groupFilter.value !== "all") createGroupSelect.value = groupFilter.value;
	updateMemberOptions();
	createDialog.showModal();
}

document.querySelectorAll('[data-action="create-loan"]').forEach(button => {
	button.addEventListener("click", event => {
		event.preventDefault();
		openLoanForm();
	});
});

document.querySelector("#open-loan-form").addEventListener("click", openLoanForm);
document.querySelector("#refresh-loans").addEventListener("click", () => {
	loanFeedback.hidden = true;
	loadLoans();
});
groupFilter.addEventListener("change", () => {
	updateMemberOptions();
	loadLoans();
});
memberFilter.addEventListener("change", loadLoans);
createGroupSelect.addEventListener("change", () => {
	updateMemberOptions();
});
document.querySelector("#close-loan-create").addEventListener("click", () => createDialog.close());
document.querySelector("#cancel-loan-create").addEventListener("click", () => createDialog.close());

createForm.addEventListener("submit", async event => {
	event.preventDefault();
	createError.hidden = true;
	const values = new FormData(createForm);
	const amount = Number(values.get("amount"));
	if (!Number.isFinite(amount) || amount <= 0) {
		createError.textContent = "Loan amount must be greater than zero.";
		createError.hidden = false;
		return;
	}
	createButton.disabled = true;

	try {
		await request(`/api/members/${encodeURIComponent(values.get("memberId"))}/loans`, {
			method: "POST",
			body: JSON.stringify({ amount: values.get("amount"), loanDate: values.get("loanDate") })
		});
		createDialog.close();
		createForm.reset();
		groupFilter.value = String(values.get("groupId"));
		memberFilter.value = String(values.get("memberId"));
		const refreshed = await loadLoans();
		window.dispatchEvent(new Event("microsave:refresh-dashboard"));
		showFeedback(refreshed ? "Loan created successfully." : "Loan created successfully, but the loan list could not be refreshed.", !refreshed);
	} catch (error) {
		createError.textContent = error.message;
		createError.hidden = false;
	} finally {
		createButton.disabled = false;
	}
});

onPage("loans", () => {
	loanFeedback.hidden = true;
	return loadLoans();
});
