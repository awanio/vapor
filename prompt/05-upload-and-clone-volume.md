
# Upload and clone volume Featues

Add upload and clone volume features to virtualization volumes.

## Upload Volume from Local

Your fist task is to add upload volume from local feature to virtualization volumes. You need to improve the following button:

web/src/views/virtualization/virtualization-volumes.ts

```html
<button
    class="btn btn-primary"
    @click=${this.handleCreateVolume}
    title="Create Volume"
>
    + Volume
</button>
```

Change from single button to become a dropdown button that have options for upload volume from local and Create Volume (this is the one that is currently used). The dropdown should be similar to the one in web/src/views/docker-tab.ts.

```html
<div class="action-menu">
    <button class="btn btn-primary" @click=${(e: Event) => this.toggleImageActionsMenu(e)}>+ Add Image</button>
    <div class="action-dropdown ${this.showImageActionsDropdown ? 'show' : ''}">
        <button @click=${() => { this.closeAllMenus(); this.showPullImageModal = true; }}>Pull Image</button>
        <button @click=${() => { this.closeAllMenus(); this.showUploadImageDialog(); }}>Upload Image</button>
    </div>
</div>
```

Look at /home/kandar/repo/vapor/internal/routes/docker.go line 115 to know how upload image with TUS protocol is implemented in API side for docker-tab.ts

The TUS protocol also implemented in in web/src/views/virtualization/virtualization-backups.ts. And this one is internal/routes/libvirt.go line 110 the API side of virtualization-backups.ts for TUS protocol.

Similar to create, the upload form should be a form inside a right drawer. The form should accept numbers of image type which is qcow2, vmdk, qed, vdi and raw.

The form file input should be able to drag and drop file.

The form style should follow the existing patern. You can use renderCreateContainerDrawer() as an reference. The drawer should has fixed header and footer. The action button should be at the footer. You also to follow how the fiend wraped in a section.  The drawer and form style should adaptive to light and dark mode.

## Clone Existing Volume

Your second task is to fix the web/src/components/virtualization/volume-clone-dialog.ts. The form style still not following the existing patern. You can use renderCreateContainerDrawer() as an reference. The drawer should has fixed header and footer. The action button should be at the footer. You also to follow how the fiend wraped in a section. The drawer and form style should adaptive to light and dark mode.

## Improve the volume Details Drawer

Your third task is to improve the volume details drawer. Improve the style and layout to make it more user friendly. You also need to improve the slide in and slide out animation. It still does not have slide out animation at the moment.

