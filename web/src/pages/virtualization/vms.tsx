import React from 'react';
import VirtualizationVMsEnhanced from '../../components/virtualization/virtualization-vms-enhanced';

/**
 * Virtual Machines Page
 * 
 * This page displays and manages virtual machines using the Nanostore-backed
 * VirtualizationVMsEnhanced component. The component fetches data from
 * the /virtualization/computes API endpoint and stores it in the global
 * Nanostore state, making it accessible to other components.
 */
const VirtualMachinesPage: React.FC = () => {
  return (
    <div className="container mx-auto py-6">
      <VirtualizationVMsEnhanced />
    </div>
  );
};

export default VirtualMachinesPage;
