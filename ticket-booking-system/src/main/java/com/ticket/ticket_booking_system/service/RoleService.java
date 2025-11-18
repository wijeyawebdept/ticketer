package com.ticket.ticket_booking_system.service;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.ticket.ticket_booking_system.dto.CreateRoleRequest;
import com.ticket.ticket_booking_system.dto.RoleDTO;
import com.ticket.ticket_booking_system.entity.Role;
import com.ticket.ticket_booking_system.repository.RoleRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;

    @Transactional(readOnly = true)
    public List<RoleDTO> getAllRoles() {
        return roleRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<RoleDTO> getActiveRoles() {
        return roleRepository.findByIsActive(true).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public RoleDTO getRoleById(UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));
        return convertToDTO(role);
    }

    @Transactional(readOnly = true)
    public RoleDTO getRoleByName(String roleName) {
        Role role = roleRepository.findByRoleName(roleName)
                .orElseThrow(() -> new RuntimeException("Role not found with name: " + roleName));
        return convertToDTO(role);
    }

    @Transactional
    public RoleDTO createRole(CreateRoleRequest request) {
        // Check if role name already exists
        if (roleRepository.existsByRoleName(request.getRoleName())) {
            throw new RuntimeException("Role with name '" + request.getRoleName() + "' already exists");
        }

        Role role = Role.builder()
                .roleName(request.getRoleName())
                .roleDescription(request.getRoleDescription())
                .isSystemRole(false)
                .canManageUsers(request.isCanManageUsers())
                .canManageEvents(request.isCanManageEvents())
                .canManageVenues(request.isCanManageVenues())
                .canManageBookings(request.isCanManageBookings())
                .canViewReports(request.isCanViewReports())
                .canManageRoles(request.isCanManageRoles())
                .isActive(true)
                .build();

        Role savedRole = roleRepository.save(role);
        return convertToDTO(savedRole);
    }

    @Transactional
    public RoleDTO updateRole(UUID roleId, CreateRoleRequest request) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));

        // For system roles, only allow permission updates, not name/description changes
        if (role.getIsSystemRole()) {
            // Check if trying to change name or description
            if (!role.getRoleName().equals(request.getRoleName()) || 
                !role.getRoleDescription().equals(request.getRoleDescription())) {
                throw new RuntimeException("Cannot modify name or description of system roles");
            }
        } else {
            // For custom roles, check if new role name already exists (for other roles)
            if (!role.getRoleName().equals(request.getRoleName()) && 
                roleRepository.existsByRoleName(request.getRoleName())) {
                throw new RuntimeException("Role with name '" + request.getRoleName() + "' already exists");
            }
            // Update name and description for custom roles
            role.setRoleName(request.getRoleName());
            role.setRoleDescription(request.getRoleDescription());
        }

        // Update permissions for both system and custom roles
        role.setCanManageUsers(request.isCanManageUsers());
        role.setCanManageEvents(request.isCanManageEvents());
        role.setCanManageVenues(request.isCanManageVenues());
        role.setCanManageBookings(request.isCanManageBookings());
        role.setCanViewReports(request.isCanViewReports());
        role.setCanManageRoles(request.isCanManageRoles());

        Role updatedRole = roleRepository.save(role);
        return convertToDTO(updatedRole);
    }

    @Transactional
    public void deleteRole(UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));

        // Prevent deletion of system roles
        if (role.getIsSystemRole()) {
            throw new RuntimeException("Cannot delete system roles");
        }

        roleRepository.delete(role);
    }

    @Transactional
    public RoleDTO toggleRoleStatus(UUID roleId) {
        Role role = roleRepository.findById(roleId)
                .orElseThrow(() -> new RuntimeException("Role not found with id: " + roleId));

        // Prevent deactivation of system roles
        if (role.getIsSystemRole()) {
            throw new RuntimeException("Cannot deactivate system roles");
        }

        role.setIsActive(!role.getIsActive());
        Role updatedRole = roleRepository.save(role);
        return convertToDTO(updatedRole);
    }

    private RoleDTO convertToDTO(Role role) {
        return RoleDTO.builder()
                .roleId(role.getRoleId())
                .roleName(role.getRoleName())
                .roleDescription(role.getRoleDescription())
                .isSystemRole(role.getIsSystemRole())
                .canManageUsers(role.getCanManageUsers())
                .canManageEvents(role.getCanManageEvents())
                .canManageVenues(role.getCanManageVenues())
                .canManageBookings(role.getCanManageBookings())
                .canViewReports(role.getCanViewReports())
                .canManageRoles(role.getCanManageRoles())
                .isActive(role.getIsActive())
                .createdAt(role.getCreatedAt())
                .updatedAt(role.getUpdatedAt())
                .build();
    }
}
