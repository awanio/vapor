package routes

import (
	"bufio"
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os/exec"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/awanio/vapor/internal/auth"
	"github.com/gin-gonic/gin"
)

type OSVariant struct {
	ShortID string `json:"short_id"`
	Name    string `json:"name"`
	Version string `json:"version,omitempty"`
	Family  string `json:"family,omitempty"`
	Distro  string `json:"distro,omitempty"`
	Vendor  string `json:"vendor,omitempty"`
	ID      string `json:"id,omitempty"`
}

const osVariantsCacheTTL = 10 * time.Minute

var (
	osVariantsCacheMu  sync.Mutex
	osVariantsCached   []OSVariant
	osVariantsCachedAt time.Time
)

func OSInfoRoutes(r *gin.RouterGroup, authService *auth.EnhancedService) {
	virtualization := r.Group("/virtualization")
	if authService != nil {
		virtualization.Use(authService.AuthMiddleware())
	}
	virtualization.GET("/os-variants", listOSVariants())
}

func listOSVariants() gin.HandlerFunc {
	return func(c *gin.Context) {
		q := strings.TrimSpace(c.Query("q"))
		family := strings.TrimSpace(c.Query("family"))

		limit := 0
		if limitStr := strings.TrimSpace(c.Query("limit")); limitStr != "" {
			parsed, err := strconv.Atoi(limitStr)
			if err != nil || parsed < 0 {
				sendComputeError(c, "INVALID_LIMIT", "Invalid limit parameter", fmt.Errorf("limit must be a non-negative integer"), http.StatusBadRequest)
				return
			}
			if parsed > 2000 {
				parsed = 2000
			}
			limit = parsed
		}

		variants, err := getOSVariantsCached(c.Request.Context())
		if err != nil {
			if errors.Is(err, exec.ErrNotFound) {
				sendComputeError(c, "OSINFO_QUERY_UNAVAILABLE", "osinfo-query is not available on this host", err, http.StatusServiceUnavailable)
				return
			}
			sendComputeError(c, "LIST_OS_VARIANTS_FAILED", "Failed to list OS variants", err, http.StatusInternalServerError)
			return
		}

		filtered := filterOSVariants(variants, q, family, limit)

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"data": gin.H{
				"variants": filtered,
				"count":    len(filtered),
			},
		})
	}
}

func filterOSVariants(items []OSVariant, q string, family string, limit int) []OSVariant {
	q = strings.ToLower(q)
	family = strings.ToLower(family)

	matches := make([]OSVariant, 0, len(items))
	for _, v := range items {
		if family != "" && strings.ToLower(v.Family) != family {
			continue
		}
		if q != "" {
			blob := strings.ToLower(strings.Join([]string{v.ShortID, v.Name, v.Version, v.Distro, v.Vendor, v.ID}, " "))
			if !strings.Contains(blob, q) {
				continue
			}
		}
		matches = append(matches, v)
		if limit > 0 && len(matches) >= limit {
			break
		}
	}

	return matches
}

func getOSVariantsCached(ctx context.Context) ([]OSVariant, error) {
	osVariantsCacheMu.Lock()
	defer osVariantsCacheMu.Unlock()

	if osVariantsCached != nil && time.Since(osVariantsCachedAt) < osVariantsCacheTTL {
		out := make([]OSVariant, len(osVariantsCached))
		copy(out, osVariantsCached)
		return out, nil
	}

	variants, err := queryOSVariants(ctx)
	if err != nil {
		return nil, err
	}

	osVariantsCached = variants
	osVariantsCachedAt = time.Now()

	out := make([]OSVariant, len(osVariantsCached))
	copy(out, osVariantsCached)
	return out, nil
}

func queryOSVariants(ctx context.Context) ([]OSVariant, error) {
	// Use explicit fields for stable parsing.
	args := []string{
		"os",
		"--fields=short-id,name,version,family,distro,vendor,id",
		"--sort=short-id",
	}

	cmd := exec.CommandContext(ctx, "osinfo-query", args...)
	output, err := cmd.CombinedOutput()
	if err != nil {
		// Preserve stderr/stdout in the error to aid debugging.
		if len(output) > 0 {
			return nil, fmt.Errorf("osinfo-query failed: %w: %s", err, strings.TrimSpace(string(output)))
		}
		return nil, err
	}

	variants, err := parseOSInfoQueryOutput(output)
	if err != nil {
		return nil, err
	}
	return variants, nil
}

func parseOSInfoQueryOutput(output []byte) ([]OSVariant, error) {
	scanner := bufio.NewScanner(bytes.NewReader(output))
	variants := make([]OSVariant, 0)

	for scanner.Scan() {
		line := strings.TrimSpace(scanner.Text())
		if line == "" {
			continue
		}
		if strings.HasPrefix(line, "Short ID") {
			continue
		}
		if strings.HasPrefix(line, "-") {
			continue
		}

		cols := strings.Split(line, "|")
		for i := range cols {
			cols[i] = strings.TrimSpace(cols[i])
		}
		if len(cols) < 2 {
			continue
		}

		v := OSVariant{ShortID: cols[0]}
		if len(cols) > 1 {
			v.Name = cols[1]
		}
		if len(cols) > 2 {
			v.Version = cols[2]
		}
		if len(cols) > 3 {
			v.Family = cols[3]
		}
		if len(cols) > 4 {
			v.Distro = cols[4]
		}
		if len(cols) > 5 {
			v.Vendor = cols[5]
		}
		if len(cols) > 6 {
			v.ID = cols[6]
		}

		if v.ShortID == "" {
			continue
		}
		variants = append(variants, v)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("failed to parse osinfo-query output: %w", err)
	}

	return variants, nil
}
