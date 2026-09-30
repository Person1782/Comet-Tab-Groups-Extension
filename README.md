# Comet Tab Archive

A Chrome extension for saving, organizing, and restoring tab groups from the browser side panel.

## Features

- Save open tab groups as individual saved groups.
- Combine selected open and saved groups into named collections.
- Close selected open groups after adding them to a collection.
- Restore a saved group or restore every group in a collection.
- Automatically save a snapshot when an open tab group is closed.
- Keep saved data in Chrome's local extension storage.

## Install

1. Download or clone this project.
2. Open `chrome://extensions` in Chrome.
3. Turn on **Developer mode**.
4. Select **Load unpacked** and choose this project folder.
5. Select the extension icon to open the side panel.

## Use

Select **New collection**, enter a name, and choose one or more groups. Open groups are taken from the current browser window. Saving the collection closes selected open groups and moves selected saved groups out of the saved-groups list into the collection.

Use **Restore all** on a collection to reopen its groups. Restoring consumes the collection entries as they are restored. Use **Restore** on an individual saved group to reopen it. Delete controls remove a saved group or collection from the archive without closing any currently open tabs.

Groups closed outside the collection workflow are automatically added to **Saved groups** when they have tabs to archive.

## Permissions

- `tabs`: read tab titles and URLs, create tabs when restoring, and close selected tabs when saving a collection.
- `tabGroups`: read and recreate tab groups.
- `sidePanel`: display the extension interface in Chrome's side panel.
- `storage`: store snapshots and collections locally in the browser.
# Comet-Tab-Groups-Extension
