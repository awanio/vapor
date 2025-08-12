package network

// platformSpecificInit performs any Linux-specific initialization
func platformSpecificInit() error {
	// On Linux, netlink operations require certain capabilities
	// This is just a placeholder for any Linux-specific setup
	return nil
}

// isNetlinkSupported returns true on Linux as netlink is a Linux kernel feature
func isNetlinkSupported() bool {
	return true
}
