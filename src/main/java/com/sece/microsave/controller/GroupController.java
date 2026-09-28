package com.sece.microsave.controller;

import com.sece.microsave.entity.Group;
import com.sece.microsave.service.GroupService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/groups")
public class GroupController {

	private final GroupService groupService;

	public GroupController(GroupService groupService) {
		this.groupService = groupService;
	}

	@PostMapping
	public ResponseEntity<GroupResponse> createGroup(@RequestBody GroupRequest request) {
		Group group = groupService.createGroup(request.groupName());
		return ResponseEntity.status(HttpStatus.CREATED).body(toResponse(group));
	}

	@GetMapping
	public List<GroupResponse> getAllGroups() {
		return groupService.getAllGroups().stream().map(this::toResponse).toList();
	}

	@GetMapping("/{groupId}")
	public GroupResponse getGroupById(@PathVariable Long groupId) {
		return toResponse(groupService.getGroupById(groupId));
	}

	private GroupResponse toResponse(Group group) {
		return new GroupResponse(group.getId(), group.getGroupName());
	}

	public record GroupRequest(String groupName) {
	}

	public record GroupResponse(Long id, String groupName) {
	}
}