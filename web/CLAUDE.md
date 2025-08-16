# Vapor WebUI

This is a web interface working directory of Vapor: an opensource Linux OS managemnet system including users, network, storage, Container CRI and Docker, Kubernetes, Helm, Ansible, and virtualization with Libvirt. Please read and explore the current work dir so you have better understanding of the project. This web folder is part of mono repo from /Users/kandar/Workspaces/vapor/api. You can the ./README.md ../README.md ../docs/index.md ../development/ to add more knowladge. Yo can alo read the ../openapi.yaml to get more detail info how to use each of API endpoints.

## Guidance component implementation:

* Use table to list the contents
* Use right drawar for presenting the detial of a content
* Put search tex input on the left top of table
* If it need filter such as drop-down filter, put it at the left side of the search element
* Use client side search functionality, Except if the API endpoint stated that it has ability to do the search
* put "create" or the same functionality (upload, add etc) button on the right side aligned with search box
* If the "create" button clicked, it highly encorage to use right drawer to present the input form.
* In each row of data, always add "Action" column at the right side.
* It use three dots as the icon of the action button.
* it will open dropdown when get clicked.
* if one of the action will cause the data in row change, ()such as delete, stop, start, restart etc) use confirmation dialog modal.

## Stack

* Plain Javascript
* TypeScript
* Vite
* Lit