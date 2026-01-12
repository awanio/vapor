Epic: Enhance VM Backup Feature

Enhance vm backup mostly UI but also need to make sure the also ready for all UI related operations.

Tasks:

1. Improve the new backup creation form component at web/src/views/virtualization/virtualization-backups.ts. The issue is, the Virtual machine dropdown field show empty list if user navigate directly to /virtualization/backups route then click create backup button on the top left corner. This is not happened if the user visit vm list page earlyer then navigate to backup list page. I think this is related to state management where the vms data has not populated yet.

2. Make sure all the options fields in web/src/views/virtualization/virtualization-backups.ts component are supported by the API such as backup type full or incremental or diffrential, the compression format, the encryption option etc. Take out the field if the API is not ready. Look at createBackup function in internal/routes/libvirt.go:887 to see how api handling the backup creation.

3. Look at "Include memory" field, the checkbox position is in center. It look not appropriate. Improve it.

4. Look at "Create" button, the style is inconsistent especially the rounded style.

5. The style of dropdown filter button for status and type at vm backup list is still inconsistent. The placement order should filter option first then the search input. Please look at web/src/views/virtualization/virtualization-backups.ts to compare and follow the existing implementation style.

6. Improve the web/src/components/virtualization/vm-backups-tab.ts component. The modal placement should be in the center of the screen not in the right drawer. Then also fix the "Include memory" field style. the position is broken compare to other fileds