//go:build linux && libvirt
// +build linux,libvirt

package libvirt

import (
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"time"
)

// VMTemplateService handles VM template operations
type VMTemplateService struct {
	db *sql.DB
}

// NewVMTemplateService creates a new VM template service
func NewVMTemplateService(db *sql.DB) *VMTemplateService {
	return &VMTemplateService{db: db}
}

// VMTemplateCreateRequest represents a request to create a VM template
type VMTemplateCreateRequest struct {
	Name               string            `json:"name" binding:"required"`
	Description        string            `json:"description"`
	OSType             string            `json:"os_type" binding:"required"`
	OSVariant          string            `json:"os_variant,omitempty"`
	MinMemory          uint64            `json:"min_memory" binding:"required"`       // in MB
	RecommendedMemory  uint64            `json:"recommended_memory,omitempty"`
	MinVCPUs           uint              `json:"min_vcpus" binding:"required"`
	RecommendedVCPUs   uint              `json:"recommended_vcpus,omitempty"`
	MinDisk            uint64            `json:"min_disk" binding:"required"`         // in GB
	RecommendedDisk    uint64            `json:"recommended_disk,omitempty"`
	DiskFormat         string            `json:"disk_format,omitempty"`
	NetworkModel       string            `json:"network_model,omitempty"`
	GraphicsType       string            `json:"graphics_type,omitempty"`
	CloudInit          bool              `json:"cloud_init"`
	UEFIBoot           bool              `json:"uefi_boot"`
	SecureBoot         bool              `json:"secure_boot"`
	TPM                bool              `json:"tpm"`
	Metadata           map[string]string `json:"metadata,omitempty"`
}

// VMTemplateUpdateRequest represents a request to update a VM template
type VMTemplateUpdateRequest struct {
	Description        *string           `json:"description,omitempty"`
	OSVariant          *string           `json:"os_variant,omitempty"`
	RecommendedMemory  *uint64           `json:"recommended_memory,omitempty"`
	RecommendedVCPUs   *uint             `json:"recommended_vcpus,omitempty"`
	RecommendedDisk    *uint64           `json:"recommended_disk,omitempty"`
	DiskFormat         *string           `json:"disk_format,omitempty"`
	NetworkModel       *string           `json:"network_model,omitempty"`
	GraphicsType       *string           `json:"graphics_type,omitempty"`
	CloudInit          *bool             `json:"cloud_init,omitempty"`
	UEFIBoot           *bool             `json:"uefi_boot,omitempty"`
	SecureBoot         *bool             `json:"secure_boot,omitempty"`
	TPM                *bool             `json:"tpm,omitempty"`
	Metadata           map[string]string `json:"metadata,omitempty"`
}

// Note: VMTemplate type is now defined in types.go to avoid duplication

// ListTemplates retrieves all VM templates
func (s *VMTemplateService) ListTemplates(ctx context.Context) ([]VMTemplate, error) {
	query := `
		SELECT id, name, description, os_type, os_variant, min_memory, recommended_memory,
		       min_vcpus, recommended_vcpus, min_disk, recommended_disk, disk_format,
		       network_model, graphics_type, cloud_init, uefi_boot, secure_boot, tpm,
		       metadata, created_at, updated_at
		FROM vm_templates
		ORDER BY name
	`

	rows, err := s.db.QueryContext(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("failed to query templates: %w", err)
	}
	defer rows.Close()

	var templates []VMTemplate
	for rows.Next() {
		var t VMTemplate
		var metadataJSON sql.NullString
		var osVariant sql.NullString
		var recMemory, recVCPUs, recDisk sql.NullInt64

		err := rows.Scan(
			&t.ID, &t.Name, &t.Description, &t.OSType, &osVariant,
			&t.MinMemory, &recMemory, &t.MinVCPUs, &recVCPUs,
			&t.MinDisk, &recDisk, &t.DiskFormat, &t.NetworkModel,
			&t.GraphicsType, &t.CloudInit, &t.UEFIBoot, &t.SecureBoot,
			&t.TPM, &metadataJSON, &t.CreatedAt, &t.UpdatedAt,
		)
		if err != nil {
			return nil, fmt.Errorf("failed to scan template: %w", err)
		}

		if osVariant.Valid {
			t.OSVariant = osVariant.String
		}
		if recMemory.Valid {
			t.RecommendedMemory = uint64(recMemory.Int64)
		}
		if recVCPUs.Valid {
			t.RecommendedVCPUs = uint(recVCPUs.Int64)
		}
		if recDisk.Valid {
			t.RecommendedDisk = uint64(recDisk.Int64)
		}

		if metadataJSON.Valid && metadataJSON.String != "" {
			if err := json.Unmarshal([]byte(metadataJSON.String), &t.Metadata); err != nil {
				// Log error but don't fail the entire operation
				t.Metadata = make(map[string]string)
			}
		}

		templates = append(templates, t)
	}

	return templates, rows.Err()
}

// GetTemplate retrieves a specific VM template by ID
func (s *VMTemplateService) GetTemplate(ctx context.Context, id int) (*VMTemplate, error) {
	query := `
		SELECT id, name, description, os_type, os_variant, min_memory, recommended_memory,
		       min_vcpus, recommended_vcpus, min_disk, recommended_disk, disk_format,
		       network_model, graphics_type, cloud_init, uefi_boot, secure_boot, tpm,
		       metadata, created_at, updated_at
		FROM vm_templates
		WHERE id = ?
	`

	var t VMTemplate
	var metadataJSON sql.NullString
	var osVariant sql.NullString
	var recMemory, recVCPUs, recDisk sql.NullInt64

	err := s.db.QueryRowContext(ctx, query, id).Scan(
		&t.ID, &t.Name, &t.Description, &t.OSType, &osVariant,
		&t.MinMemory, &recMemory, &t.MinVCPUs, &recVCPUs,
		&t.MinDisk, &recDisk, &t.DiskFormat, &t.NetworkModel,
		&t.GraphicsType, &t.CloudInit, &t.UEFIBoot, &t.SecureBoot,
		&t.TPM, &metadataJSON, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	if osVariant.Valid {
		t.OSVariant = osVariant.String
	}
	if recMemory.Valid {
		t.RecommendedMemory = uint64(recMemory.Int64)
	}
	if recVCPUs.Valid {
		t.RecommendedVCPUs = uint(recVCPUs.Int64)
	}
	if recDisk.Valid {
		t.RecommendedDisk = uint64(recDisk.Int64)
	}

	if metadataJSON.Valid && metadataJSON.String != "" {
		if err := json.Unmarshal([]byte(metadataJSON.String), &t.Metadata); err != nil {
			t.Metadata = make(map[string]string)
		}
	}

	return &t, nil
}

// GetTemplateByName retrieves a specific VM template by name
func (s *VMTemplateService) GetTemplateByName(ctx context.Context, name string) (*VMTemplate, error) {
	query := `
		SELECT id, name, description, os_type, os_variant, min_memory, recommended_memory,
		       min_vcpus, recommended_vcpus, min_disk, recommended_disk, disk_format,
		       network_model, graphics_type, cloud_init, uefi_boot, secure_boot, tpm,
		       metadata, created_at, updated_at
		FROM vm_templates
		WHERE name = ?
	`

	var t VMTemplate
	var metadataJSON sql.NullString
	var osVariant sql.NullString
	var recMemory, recVCPUs, recDisk sql.NullInt64

	err := s.db.QueryRowContext(ctx, query, name).Scan(
		&t.ID, &t.Name, &t.Description, &t.OSType, &osVariant,
		&t.MinMemory, &recMemory, &t.MinVCPUs, &recVCPUs,
		&t.MinDisk, &recDisk, &t.DiskFormat, &t.NetworkModel,
		&t.GraphicsType, &t.CloudInit, &t.UEFIBoot, &t.SecureBoot,
		&t.TPM, &metadataJSON, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		if err == sql.ErrNoRows {
			return nil, fmt.Errorf("template not found")
		}
		return nil, fmt.Errorf("failed to get template: %w", err)
	}

	if osVariant.Valid {
		t.OSVariant = osVariant.String
	}
	if recMemory.Valid {
		t.RecommendedMemory = uint64(recMemory.Int64)
	}
	if recVCPUs.Valid {
		t.RecommendedVCPUs = uint(recVCPUs.Int64)
	}
	if recDisk.Valid {
		t.RecommendedDisk = uint64(recDisk.Int64)
	}

	if metadataJSON.Valid && metadataJSON.String != "" {
		if err := json.Unmarshal([]byte(metadataJSON.String), &t.Metadata); err != nil {
			t.Metadata = make(map[string]string)
		}
	}

	return &t, nil
}

// CreateTemplate creates a new VM template
func (s *VMTemplateService) CreateTemplate(ctx context.Context, req *VMTemplateCreateRequest) (*VMTemplate, error) {
	// Set defaults
	if req.DiskFormat == "" {
		req.DiskFormat = "qcow2"
	}
	if req.NetworkModel == "" {
		req.NetworkModel = "virtio"
	}
	if req.GraphicsType == "" {
		req.GraphicsType = "vnc"
	}

	var metadataJSON string
	if req.Metadata != nil && len(req.Metadata) > 0 {
		data, err := json.Marshal(req.Metadata)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal metadata: %w", err)
		}
		metadataJSON = string(data)
	}

	query := `
		INSERT INTO vm_templates (
			name, description, os_type, os_variant, min_memory, recommended_memory,
			min_vcpus, recommended_vcpus, min_disk, recommended_disk, disk_format,
			network_model, graphics_type, cloud_init, uefi_boot, secure_boot, tpm, metadata
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	result, err := s.db.ExecContext(ctx, query,
		req.Name, req.Description, req.OSType, nullString(req.OSVariant),
		req.MinMemory, nullInt64(int64(req.RecommendedMemory)),
		req.MinVCPUs, nullInt64(int64(req.RecommendedVCPUs)),
		req.MinDisk, nullInt64(int64(req.RecommendedDisk)),
		req.DiskFormat, req.NetworkModel, req.GraphicsType,
		req.CloudInit, req.UEFIBoot, req.SecureBoot, req.TPM,
		nullString(metadataJSON),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create template: %w", err)
	}

	id, err := result.LastInsertId()
	if err != nil {
		return nil, fmt.Errorf("failed to get template ID: %w", err)
	}

	return s.GetTemplate(ctx, int(id))
}

// UpdateTemplate updates an existing VM template
func (s *VMTemplateService) UpdateTemplate(ctx context.Context, id int, req *VMTemplateUpdateRequest) (*VMTemplate, error) {
	// Build dynamic update query
	updates := []string{}
	args := []interface{}{}

	if req.Description != nil {
		updates = append(updates, "description = ?")
		args = append(args, *req.Description)
	}
	if req.OSVariant != nil {
		updates = append(updates, "os_variant = ?")
		args = append(args, nullString(*req.OSVariant))
	}
	if req.RecommendedMemory != nil {
		updates = append(updates, "recommended_memory = ?")
		args = append(args, nullInt64(int64(*req.RecommendedMemory)))
	}
	if req.RecommendedVCPUs != nil {
		updates = append(updates, "recommended_vcpus = ?")
		args = append(args, nullInt64(int64(*req.RecommendedVCPUs)))
	}
	if req.RecommendedDisk != nil {
		updates = append(updates, "recommended_disk = ?")
		args = append(args, nullInt64(int64(*req.RecommendedDisk)))
	}
	if req.DiskFormat != nil {
		updates = append(updates, "disk_format = ?")
		args = append(args, *req.DiskFormat)
	}
	if req.NetworkModel != nil {
		updates = append(updates, "network_model = ?")
		args = append(args, *req.NetworkModel)
	}
	if req.GraphicsType != nil {
		updates = append(updates, "graphics_type = ?")
		args = append(args, *req.GraphicsType)
	}
	if req.CloudInit != nil {
		updates = append(updates, "cloud_init = ?")
		args = append(args, *req.CloudInit)
	}
	if req.UEFIBoot != nil {
		updates = append(updates, "uefi_boot = ?")
		args = append(args, *req.UEFIBoot)
	}
	if req.SecureBoot != nil {
		updates = append(updates, "secure_boot = ?")
		args = append(args, *req.SecureBoot)
	}
	if req.TPM != nil {
		updates = append(updates, "tpm = ?")
		args = append(args, *req.TPM)
	}
	if req.Metadata != nil {
		data, err := json.Marshal(req.Metadata)
		if err != nil {
			return nil, fmt.Errorf("failed to marshal metadata: %w", err)
		}
		updates = append(updates, "metadata = ?")
		args = append(args, string(data))
	}

	if len(updates) == 0 {
		return s.GetTemplate(ctx, id)
	}

	// Add updated_at
	updates = append(updates, "updated_at = CURRENT_TIMESTAMP")

	// Add ID to args
	args = append(args, id)

	query := fmt.Sprintf(
		"UPDATE vm_templates SET %s WHERE id = ?",
		joinStrings(updates, ", "),
	)

	_, err := s.db.ExecContext(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("failed to update template: %w", err)
	}

	return s.GetTemplate(ctx, id)
}

// DeleteTemplate deletes a VM template
func (s *VMTemplateService) DeleteTemplate(ctx context.Context, id int) error {
	query := "DELETE FROM vm_templates WHERE id = ?"
	result, err := s.db.ExecContext(ctx, query, id)
	if err != nil {
		return fmt.Errorf("failed to delete template: %w", err)
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return fmt.Errorf("failed to get affected rows: %w", err)
	}

	if rows == 0 {
		return fmt.Errorf("template not found")
	}

	return nil
}

// Helper functions
func nullString(s string) sql.NullString {
	if s == "" {
		return sql.NullString{Valid: false}
	}
	return sql.NullString{String: s, Valid: true}
}

func nullInt64(i int64) sql.NullInt64 {
	if i == 0 {
		return sql.NullInt64{Valid: false}
	}
	return sql.NullInt64{Int64: i, Valid: true}
}

func joinStrings(strs []string, sep string) string {
	result := ""
	for i, s := range strs {
		if i > 0 {
			result += sep
		}
		result += s
	}
	return result
}
