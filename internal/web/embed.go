package web

import (
	"embed"
	"io/fs"
	"net/http"
)

// Embed the entire web/dist directory
//
//go:embed all:dist
var embeddedFiles embed.FS

// GetFileSystem returns the embedded filesystem for serving
func GetFileSystem() (http.FileSystem, error) {
	fsys, err := fs.Sub(embeddedFiles, "dist")
	if err != nil {
		return nil, err
	}
	return http.FS(fsys), nil
}

// HasWebUI checks if web UI files are embedded
func HasWebUI() bool {
	// Check if index.html exists in the embedded files
	_, err := embeddedFiles.ReadFile("dist/index.html")
	return err == nil
}

// GetIndexHTML returns the content of index.html
func GetIndexHTML() ([]byte, error) {
	return embeddedFiles.ReadFile("dist/index.html")
}
