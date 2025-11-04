package network

// NoOpBackend is a no-operation persistence backend that does nothing.
// It is used when persistence is disabled or when no suitable backend is available.
type NoOpBackend struct{}

// SaveInterface does nothing and returns no error
func (b *NoOpBackend) SaveInterface(config InterfaceConfig) error {
	return nil
}

// DeleteInterface does nothing and returns no error
func (b *NoOpBackend) DeleteInterface(name string) error {
	return nil
}

// SaveBridge does nothing and returns no error
func (b *NoOpBackend) SaveBridge(config BridgeConfig) error {
	return nil
}

// DeleteBridge does nothing and returns no error
func (b *NoOpBackend) DeleteBridge(name string) error {
	return nil
}

// SaveBond does nothing and returns no error
func (b *NoOpBackend) SaveBond(config BondConfig) error {
	return nil
}

// DeleteBond does nothing and returns no error
func (b *NoOpBackend) DeleteBond(name string) error {
	return nil
}

// SaveVLAN does nothing and returns no error
func (b *NoOpBackend) SaveVLAN(config VLANConfig) error {
	return nil
}

// DeleteVLAN does nothing and returns no error
func (b *NoOpBackend) DeleteVLAN(name string) error {
	return nil
}

// SystemReload does nothing and returns no error
func (b *NoOpBackend) SystemReload() error {
	return nil
}

// BackendType returns BackendNone
func (b *NoOpBackend) BackendType() NetworkBackendType {
	return BackendNone
}
