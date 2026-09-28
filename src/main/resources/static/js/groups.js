import { request } from "./api.js";
import { navigateTo, onPage } from "./navigation.js";

const groupsRows = document.querySelector("#groups-rows");
const groupsCount = document.querySelector("#groups-count");
const groupsFeedback = document.querySelector("#groups-feedback");
const createDialog = document.querySelector("#group-create-dialog");
const createForm = document.querySelector("#group-create-form");
const createError = document.querySelector("#group-create-error");
const createButton = document.querySelector("#submit-group-create");
const detailsDialog = document.querySelector("#group-details-dialog");
const detailsList = document.querySelector("#group-detail-list");

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
	groupsFeedback.textContent = message;
	groupsFeedback.classList.toggle("is-error", isError);
	groupsFeedback.hidden = false;
}

function renderGroups(groups) {
	groupsCount.textContent = `${groups.length} ${groups.length === 1 ? "group" : "groups"}`;

	if (groups.length === 0) {
		groupsRows.innerHTML = '<tr><td colspan="3" class="table-message">No groups yet. Create a group to get started.</td></tr>';
		return;
	}

	groupsRows.innerHTML = groups.map(group => `
		<tr>
			<td class="group-name-cell">${escapeHtml(group.groupName)}</td>
			<td class="group-id-cell">${escapeHtml(group.id)}</td>
			<td class="group-action-cell"><button class="text-button" type="button" data-group-details="${escapeHtml(group.id)}">View details <span aria-hidden="true">↗</span></button></td>
		</tr>`).join("");
}

async function loadGroups() {
	groupsCount.textContent = "Loading";
	groupsRows.innerHTML = '<tr><td colspan="3" class="table-message">Loading groups…</td></tr>';

	try {
		const groups = await request("/api/groups");
		renderGroups(groups);
		return true;
	} catch (error) {
		groupsCount.textContent = "Unavailable";
		groupsRows.innerHTML = `<tr><td colspan="3" class="table-message table-error">${escapeHtml(error.message)}</td></tr>`;
		throw error;
	}
}

document.querySelectorAll('[data-action="add-group"]').forEach(button => {
	button.addEventListener("click", () => {
		navigateTo("groups");
		createError.hidden = true;
		createForm.reset();
		createDialog.showModal();
	});
});

document.querySelector("#open-group-form").addEventListener("click", () => {
	createError.hidden = true;
	createForm.reset();
	createDialog.showModal();
});

document.querySelector("#refresh-groups").addEventListener("click", () => {
	groupsFeedback.hidden = true;
	loadGroups().catch(error => showFeedback(error.message, true));
});

document.querySelector("#close-group-create").addEventListener("click", () => createDialog.close());
document.querySelector("#cancel-group-create").addEventListener("click", () => createDialog.close());
document.querySelector("#close-group-details").addEventListener("click", () => detailsDialog.close());

createForm.addEventListener("submit", async event => {
	event.preventDefault();
	createError.hidden = true;
	createButton.disabled = true;

	try {
		const values = new FormData(createForm);
		await request("/api/groups", {
			method: "POST",
			body: JSON.stringify({ groupName: values.get("groupName").trim() })
		});
		window.dispatchEvent(new Event("microsave:refresh-dashboard"));
		window.dispatchEvent(new Event("microsave:groups-changed"));
		createDialog.close();
		createForm.reset();
		await loadGroups();
		showFeedback("Group created successfully.");
	} catch (error) {
		if (createDialog.open) {
			createError.textContent = error.message;
			createError.hidden = false;
		} else {
			showFeedback(`Group was created, but the list could not be refreshed: ${error.message}`, true);
		}
	} finally {
		createButton.disabled = false;
	}
});

groupsRows.addEventListener("click", async event => {
	const button = event.target.closest("[data-group-details]");
	if (!button) return;

	button.disabled = true;
	try {
		const group = await request(`/api/groups/${encodeURIComponent(button.dataset.groupDetails)}`);
		detailsList.innerHTML = `
			<div><dt>Group name</dt><dd>${escapeHtml(group.groupName)}</dd></div>
			<div><dt>Group ID</dt><dd>${escapeHtml(group.id)}</dd></div>`;
		detailsDialog.showModal();
	} catch (error) {
		showFeedback(error.message, true);
	} finally {
		button.disabled = false;
	}
});

onPage("groups", () => {
	groupsFeedback.hidden = true;
	return loadGroups().catch(error => showFeedback(error.message, true));
});
