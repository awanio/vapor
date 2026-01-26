Please update the code in following files:

web/src/components/virtualization/create-vm-wizard-enhanced.ts. especialy at Add Disk and Edit Disk modal at format field.
web/src/views/virtualization/virtualization-volumes.ts. especialy at Format field.
web/src/components/virtualization/volume-upload-drawer.ts. Especialy at input file field.

and update the API side internal/routes/libvirt.go to support volume type only qcow2, vmdk and raw for now.
