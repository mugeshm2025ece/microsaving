import { request } from "./api.js";
import { currentRoute, navigateTo, onPage } from "./navigation.js";

const memberRows = document.querySelector("#members-rows");
const memberCount = document.querySelector("#members-count");
const memberFeedback = document.querySelector("#members-feedback");
const groupFilter = document.querySelector("#member-group-filter");
const createDialog = document.querySelector("#member-create-dialog");
const createForm = document.querySelector("#member-create-form");
const createGroupSelect = document.querySelector("#member-create-group");
const createError = document.querySelector("#member-create-error");
const createButton = document.querySelector("#submit-member-create");
const detailsDialog = document.querySelector("#member-details-dialog");
const detailsList = document.querySelector("#member-detail-list");

const state = { groups: null };
let groupsRequest;

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
	memberFeedback.textContent = message;
	memberFeedback.classList.toggle("is-error", isError);
	memberFeedback.hidden = false;
}

function groupName(groupId) {
	return state.groups?.find(group => String(group.id) === String(groupId))?.groupName || `Group ${groupId}`;
}

function renderGroupOptions() {
	const selectedFilter = groupFilter.value || "all";
	const groupOptions = state.groups.map(group => `<option value="${escapeHtml(group.id)}">${escapeHtml(group.groupName)}</option>`).join("");
	groupFilter.innerHTML = `<option value="all">All groups</option>${groupOptions}`;
	createGroupSelect.innerHTML = `<option value="">Choose a group</option>${groupOptions}`;

	if ([...groupFilter.options].some(option => option.value === selectedFilter)) groupFilter.value = selectedFilter;
}

async function loadGroups() {
	if (state.groups) return state.groups;
	if (!groupsRequest) {
		groupsRequest = request("/api/groups").then(groups => {
			state.groups = groups;
			renderGroupOptions();
			return groups;
		}).finally(() => {
			groupsRequest = null;
		});
	}
	return groupsRequest;
}

function renderMembers(members) {
	memberCount.textContent = `${members.length} ${members.length === 1 ? "member" : "members"}`;
	if (members.length === 0) {
		const filtered = groupFilter.value !== "all";
		memberRows.innerHTML = `<tr><td colspan="4" class="table-message">${filtered ? "No members in this group yet." : "No members yet. Add a member to get started."}</td></tr>`;
		return;
	}

	memberRows.innerHTML = members.map(member => `
		<tr>
			<td class="group-name-cell">${escapeHtml(member.memberName)}</td>
			<td class="group-id-cell">${escapeHtml(member.id)}</td>
			<td>${escapeHtml(groupName(member.groupId))}</td>
			<td class="group-action-cell"><button class="text-button" type="button" data-member-details="${escapeHtml(member.id)}">View details <span aria-hidden="true">↗</span></button></td>
		</tr>`).join("");
}

async function loadMembers() {
	memberCount.textContent = "Loading";
	memberRows.innerHTML = '<tr><td colspan="4" class="table-message">Loading members…</td></tr>';

	try {
		const groups = await loadGroups();
		const selectedGroup = groupFilter.value || "all";
		let members;
		if (selectedGroup === "all") {
			const lists = await Promise.all(groups.map(group => request(`/api/groups/${encodeURIComponent(group.id)}/members`)));
			members = lists.flat();
		} else {
			members = await request(`/api/groups/${encodeURIComponent(selectedGroup)}/members`);
		}
		renderMembers(members);
		return true;
	} catch (error) {
		memberCount.textContent = "Unavailable";
		memberRows.innerHTML = `<tr><td colspan="4" class="table-message table-error">${escapeHtml(error.message)}</td></tr>`;
		showFeedback(error.message, true);
		return false;
	}
}

async function openMemberForm() {
	const loaded = await navigateTo("members");
	if (!loaded) return;
	try {
		const groups = state.groups || [];
		if (groups.length === 0) {
			showFeedback("Create a group before adding a member.", true);
			return;
		}

		createForm.reset();
		createError.hidden = true;
		const preferredGroup = groupFilter.value !== "all" ? groupFilter.value : "";
		if (preferredGroup && groups.some(group => String(group.id) === preferredGroup)) createGroupSelect.value = preferredGroup;
		createDialog.showModal();
	} catch (error) {
		showFeedback(error.message, true);
	}
}

document.querySelectorAll('[data-action="add-member"]').forEach(button => {
	button.addEventListener("click", openMemberForm);
});

document.querySelector("#open-member-form").addEventListener("click", openMemberForm);
window.addEventListener("microsave:groups-changed", () => {
	state.groups = null;
	groupsRequest = null;
	if (currentRoute() === "members") loadMembers();
});
document.querySelector("#refresh-members").addEventListener("click", async () => {
	memberFeedback.hidden = true;
	state.groups = null;
	await loadMembers();
});
groupFilter.addEventListener("change", () => {
	memberFeedback.hidden = true;
	loadMembers();
});

document.querySelector("#close-member-create").addEventListener("click", () => createDialog.close());
document.querySelector("#cancel-member-create").addEventListener("click", () => createDialog.close());
document.querySelector("#close-member-details").addEventListener("click", () => detailsDialog.close());

createForm.addEventListener("submit", async event => {
	event.preventDefault();
	createError.hidden = true;
	createButton.disabled = true;
	const values = new FormData(createForm);
	const groupId = values.get("groupId");

	try {
		await request(`/api/groups/${encodeURIComponent(groupId)}/members`, {
			method: "POST",
			body: JSON.stringify({ memberName: values.get("memberName").trim() })
		});
		window.dispatchEvent(new Event("microsave:refresh-dashboard"));
		createDialog.close();
		groupFilter.value = String(groupId);
		const refreshed = await loadMembers();
		showFeedback(refreshed ? "Member added successfully." : "Member was added, but the member list could not be refreshed.", !refreshed);
		createForm.reset();
	} catch (error) {
		createError.textContent = error.message;
		createError.hidden = false;
	} finally {
		createButton.disabled = false;
	}
});

memberRows.addEventListener("click", async event => {
	const button = event.target.closest("[data-member-details]");
	if (!button) return;

	button.disabled = true;
	try {
		const member = await request(`/api/members/${encodeURIComponent(button.dataset.memberDetails)}`);
		detailsList.innerHTML = `
			<div><dt>Member name</dt><dd>${escapeHtml(member.memberName)}</dd></div>
			<div><dt>Member ID</dt><dd>${escapeHtml(member.id)}</dd></div>
			<div><dt>Savings group</dt><dd>${escapeHtml(groupName(member.groupId))}</dd></div>
			<div><dt>Group ID</dt><dd>${escapeHtml(member.groupId)}</dd></div>`;
		detailsDialog.showModal();
	} catch (error) {
		showFeedback(error.message, true);
	} finally {
		button.disabled = false;
	}
});

onPage("members", () => {
	memberFeedback.hidden = true;
	return loadMembers();
});
