const savedGroupsElement = document.querySelector('#saved-groups');
const savedCollectionsElement = document.querySelector('#saved-collections');
const refreshButton = document.querySelector('#refresh');
const saveWindowButton = document.querySelector('#save-window');
const collectionDialog = document.querySelector('#collection-dialog');
const collectionForm = document.querySelector('#collection-form');
const collectionNameInput = document.querySelector('#collection-name');
const collectionOptionsElement = document.querySelector('#collection-options');
const collectionErrorElement = document.querySelector('#collection-error');
const snapshotsKey = 'savedTabGroups';
const collectionsKey = 'savedTabCollections';

const fallbackColors = {
  grey: '#64748b',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  pink: '#ec4899',
  purple: '#8b5cf6',
  cyan: '#06b6d4',
  orange: '#f97316'
};

async function loadSavedGroups() {
  const stored = await chrome.storage.local.get([snapshotsKey, collectionsKey]);
  renderSavedGroups(stored[snapshotsKey] ?? []);
  renderCollections(stored[collectionsKey] ?? []);
}

function renderSavedGroups(savedGroups) {
  savedGroupsElement.replaceChildren();

  if (savedGroups.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No saved groups yet.';
    savedGroupsElement.append(emptyState);
    return;
  }

  for (const savedGroup of savedGroups) {
    const section = document.createElement('section');
    section.className = 'saved-group';
    section.style.setProperty('--group-color', fallbackColors[savedGroup.color] ?? fallbackColors.grey);

    const header = document.createElement('div');
    header.className = 'saved-group-header';

    const name = document.createElement('span');
    name.className = 'saved-group-name';
    name.textContent = savedGroup.title;

    const restoreButton = document.createElement('button');
    restoreButton.className = 'restore-button';
    restoreButton.type = 'button';
    restoreButton.textContent = 'Restore';
    restoreButton.addEventListener('click', () => restoreGroup(savedGroup));

    const deleteButton = createDeleteButton(`Delete ${savedGroup.title}`, () => deleteSavedGroup(savedGroup.id));

    const tabsList = document.createElement('ul');
    tabsList.className = 'saved-tabs';
    for (const tab of savedGroup.tabs) {
      const item = document.createElement('li');
      item.textContent = tab.title || tab.url;
      tabsList.append(item);
    }

    const actions = document.createElement('div');
    actions.className = 'saved-actions';
    actions.append(restoreButton, deleteButton);

    header.append(name, actions);
    section.append(header, tabsList);
    savedGroupsElement.append(section);
  }
}

function renderCollections(collections) {
  savedCollectionsElement.replaceChildren();

  if (collections.length === 0) {
    const emptyState = document.createElement('p');
    emptyState.className = 'empty-state';
    emptyState.textContent = 'No collections yet.';
    savedCollectionsElement.append(emptyState);
    return;
  }

  for (const collection of collections) {
    const section = document.createElement('section');
    section.className = 'collection';

    const header = document.createElement('div');
    header.className = 'collection-header';

    const details = document.createElement('div');
    details.className = 'collection-details';

    const name = document.createElement('span');
    name.className = 'saved-group-name';
    name.textContent = collection.title;

    const count = document.createElement('span');
    count.className = 'collection-count';
    count.textContent = `${collection.groups.length} group${collection.groups.length === 1 ? '' : 's'}`;

    const restoreButton = document.createElement('button');
    restoreButton.className = 'restore-button';
    restoreButton.type = 'button';
    restoreButton.textContent = 'Restore all';
    restoreButton.addEventListener('click', () => restoreCollection(collection.id));

    const deleteButton = createDeleteButton(`Delete ${collection.title}`, () => deleteCollection(collection.id));

    details.append(name, count);
    const actions = document.createElement('div');
    actions.className = 'saved-actions';
    actions.append(restoreButton, deleteButton);
    header.append(details, actions);
    section.append(header);

    for (const group of collection.groups) {
      const groupDetails = document.createElement('details');
      groupDetails.className = 'collection-group';
      groupDetails.style.setProperty('--group-color', fallbackColors[group.color] ?? fallbackColors.grey);

      const summary = document.createElement('summary');
      summary.className = 'collection-group-summary';
      summary.textContent = `${group.title} · ${group.tabs.length} tab${group.tabs.length === 1 ? '' : 's'}`;

      const tabsList = document.createElement('ul');
      tabsList.className = 'saved-tabs';
      for (const tab of group.tabs) {
        const item = document.createElement('li');
        item.textContent = tab.title || tab.url;
        tabsList.append(item);
      }

      const deleteGroupButton = createDeleteButton(
        `Delete ${group.title} from ${collection.title}`,
        () => deleteCollectionGroup(collection.id, group.id)
      );
      deleteGroupButton.classList.add('collection-delete-button');
      groupDetails.append(summary, tabsList, deleteGroupButton);
      section.append(groupDetails);
    }

    savedCollectionsElement.append(section);
  }
}

function createDeleteButton(label, onClick) {
  const button = document.createElement('button');
  button.className = 'delete-button';
  button.type = 'button';
  button.textContent = 'Delete';
  button.title = label;
  button.setAttribute('aria-label', label);
  button.addEventListener('click', onClick);
  return button;
}

async function deleteSavedGroup(groupId) {
  const stored = await chrome.storage.local.get(snapshotsKey);
  const savedGroups = (stored[snapshotsKey] ?? []).filter((group) => group.id !== groupId);
  await chrome.storage.local.set({ [snapshotsKey]: savedGroups });
}

async function deleteCollection(collectionId) {
  const stored = await chrome.storage.local.get(collectionsKey);
  const collections = (stored[collectionsKey] ?? []).filter((collection) => collection.id !== collectionId);
  await chrome.storage.local.set({ [collectionsKey]: collections });
}

async function deleteCollectionGroup(collectionId, groupId) {
  const stored = await chrome.storage.local.get(collectionsKey);
  const collections = stored[collectionsKey] ?? [];
  const collection = collections.find((item) => item.id === collectionId);
  if (!collection) return;

  collection.groups = collection.groups.filter((group) => group.id !== groupId);
  const updatedCollections = collection.groups.length
    ? collections
    : collections.filter((item) => item.id !== collectionId);
  await chrome.storage.local.set({ [collectionsKey]: updatedCollections });
}

async function getCollectionChoices() {
  const [tabs, stored] = await Promise.all([
    chrome.tabs.query({ currentWindow: true }),
    chrome.storage.local.get(snapshotsKey)
  ]);
  const windowId = tabs[0]?.windowId;
  const groups = windowId === undefined ? [] : await chrome.tabGroups.query({ windowId });
  const openGroups = groups.map((group) => {
    const groupTabs = tabs
      .filter((tab) => tab.groupId === group.id && tab.url)
      .sort((first, second) => first.index - second.index);
    return {
      key: `open-${group.id}`,
      groupId: group.id,
      title: group.title || 'Unnamed group',
      color: group.color,
      collapsed: group.collapsed,
      tabIds: groupTabs.map((tab) => tab.id),
      tabs: groupTabs.map((tab) => ({ title: tab.title || tab.url, url: tab.url }))
    };
  }).filter((group) => group.tabs.length > 0);
  const savedGroups = (stored[snapshotsKey] ?? []).map((group) => ({
    key: `saved-${group.id}`,
    title: group.title,
    color: group.color,
    collapsed: group.collapsed,
    tabs: group.tabs
  }));

  return { openGroups, savedGroups };
}

function renderCollectionChoices(choices) {
  collectionOptionsElement.replaceChildren();

  for (const [heading, groups] of [
    ['Open groups', choices.openGroups],
    ['Saved groups', choices.savedGroups]
  ]) {
    const fieldset = document.createElement('fieldset');
    fieldset.className = 'collection-choice-set';

    const legend = document.createElement('legend');
    legend.textContent = heading;
    fieldset.append(legend);

    if (groups.length === 0) {
      const emptyState = document.createElement('p');
      emptyState.className = 'choice-empty';
      emptyState.textContent = 'None available';
      fieldset.append(emptyState);
    }

    for (const group of groups) {
      const label = document.createElement('label');
      label.className = 'collection-choice';

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.name = 'collection-group';
      checkbox.value = group.key;

      const title = document.createElement('span');
      title.textContent = `${group.title} (${group.tabs.length})`;

      label.append(checkbox, title);
      fieldset.append(label);
    }

    collectionOptionsElement.append(fieldset);
  }
}

async function saveCollection(name, selectedKeys) {
  const choices = await getCollectionChoices();
  const availableGroups = [...choices.openGroups, ...choices.savedGroups];
  const selectedGroups = selectedKeys.map((key) => availableGroups.find((group) => group.key === key));
  if (selectedGroups.some((group) => !group)) throw new Error('A selected group is no longer available.');
  if (selectedGroups.length === 0) throw new Error('Select at least one group.');

  const collectionGroups = selectedGroups.map((group, index) => ({
    id: `collection-group-${Date.now()}-${index}`,
    title: group.title,
    color: group.color,
    collapsed: group.collapsed,
    ...(group.groupId === undefined ? {} : { sourceGroupId: group.groupId }),
    tabs: group.tabs
  }));

  const stored = await chrome.storage.local.get(collectionsKey);
  const collections = stored[collectionsKey] ?? [];
  collections.unshift({
    id: `collection-${Date.now()}`,
    title: name,
    groups: collectionGroups,
    savedAt: Date.now()
  });
  await chrome.storage.local.set({ [collectionsKey]: collections });

  const tabIdsToClose = selectedGroups.flatMap((group) => group.tabIds ?? []);
  if (tabIdsToClose.length > 0) await chrome.tabs.remove(tabIdsToClose);
}

async function restoreGroup(savedGroup) {
  await openSavedGroup(savedGroup);
  const stored = await chrome.storage.local.get(snapshotsKey);
  const savedGroups = (stored[snapshotsKey] ?? []).filter((group) => group.id !== savedGroup.id);
  await chrome.storage.local.set({ [snapshotsKey]: savedGroups });
  await loadSavedGroups();
}

async function openSavedGroup(savedGroup) {
  const restoredTabs = [];
  for (const tab of savedGroup.tabs) {
    const createdTab = await chrome.tabs.create({ url: tab.url, active: false });
    restoredTabs.push(createdTab.id);
  }

  if (restoredTabs.length === 0) return;

  const groupId = await chrome.tabs.group({ tabIds: restoredTabs });
  await chrome.tabGroups.update(groupId, {
    title: savedGroup.title,
    color: savedGroup.color,
    collapsed: savedGroup.collapsed
  });
}

async function restoreCollection(collectionId) {
  const stored = await chrome.storage.local.get(collectionsKey);
  const collection = (stored[collectionsKey] ?? []).find((item) => item.id === collectionId);
  if (!collection) return;

  for (const group of collection.groups) {
    await openSavedGroup(group);

    const latest = await chrome.storage.local.get(collectionsKey);
    const collections = latest[collectionsKey] ?? [];
    const current = collections.find((item) => item.id === collectionId);
    if (!current) continue;

    current.groups = current.groups.filter((item) => item.id !== group.id);
    const updatedCollections = current.groups.length
      ? collections
      : collections.filter((item) => item.id !== collectionId);
    await chrome.storage.local.set({ [collectionsKey]: updatedCollections });
  }

  await loadSavedGroups();
}

refreshButton.addEventListener('click', loadSavedGroups);
saveWindowButton.addEventListener('click', () => {
  collectionNameInput.value = '';
  collectionErrorElement.textContent = '';
  collectionOptionsElement.textContent = 'Loading groups...';
  collectionDialog.showModal();
  collectionNameInput.focus();
  getCollectionChoices().then(renderCollectionChoices).catch((error) => {
    collectionErrorElement.textContent = error.message;
    collectionOptionsElement.replaceChildren();
  });
});

document.querySelector('#cancel-collection').addEventListener('click', () => collectionDialog.close());

collectionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = collectionNameInput.value.trim();
  if (!name) return;
  const selectedKeys = Array.from(collectionForm.querySelectorAll('input[name="collection-group"]:checked'))
    .map((checkbox) => checkbox.value);

  const submitButton = collectionForm.querySelector('[type="submit"]');
  submitButton.disabled = true;
  try {
    await saveCollection(name, selectedKeys);
    collectionDialog.close();
    await loadSavedGroups();
  } catch (error) {
    collectionErrorElement.textContent = error.message;
  } finally {
    submitButton.disabled = false;
  }
});

collectionForm.addEventListener('change', () => {
  collectionErrorElement.textContent = '';
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && (changes[snapshotsKey] || changes[collectionsKey])) loadSavedGroups();
});

loadSavedGroups().catch((error) => {
  savedGroupsElement.textContent = `Unable to load saved groups: ${error.message}`;
});
