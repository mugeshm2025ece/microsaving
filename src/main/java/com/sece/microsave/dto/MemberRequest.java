package com.sece.microsave.dto;

import jakarta.validation.constraints.NotBlank;

public record MemberRequest(@NotBlank String memberName) {
}