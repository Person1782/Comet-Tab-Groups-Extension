const snapshotsKey = 'tabGroupSnapshots';
const savedGroupsKey = 'savedTabGroups';
let eventQueue = Promise.resolve();
let removalRefreshTimer;

function enqueue(operation) {
  eventQueue = eventQueue.then(operation).catch((error) => {
    console.error('Unable to save tab groups:', error);
  });
  return eventQueue;
}

async function snapshotActiveGroups() {
  const [groups, tabs, stored] = await Promise.all([
    chrome.tabGroups.query({}),
    chrome.tabs.query({}),
    chrome.storage.local.get(snapshotsKey)
  ]);
  const snapshots = stored[snapshotsKey] ?? {};

  for (const group of groups) {
    const groupTabs = tabs
      .filter((tab) => tab.groupId === group.id && tab.url)
      .sort((first, second) => first.index - second.index)
      .map((tab) => ({ title: tab.title || tab.url, url: tab.url }));

    snapshots[group.id] = {
      title: group.title || 'Unnamed group',
      color: group.color,
      collapsed: group.collapsed,
      tabs: groupTabs
    };
  }

  await chrome.storage.local.set({ [snapshotsKey]: snapshots });
}

async function archiveRemovedGroup(groupId) {
  const stored = await chrome.storage.local.get([snapshotsKey, savedGroupsKey, 'savedTabCollections']);
  const snapshots = stored[snapshotsKey] ?? {};
  const snapshot = snapshots[groupId];
  const collectionGroups = (stored.savedTabCollections ?? []).flatMap((collection) => collection.groups);
  const isSavedInCollection = collectionGroups.some((group) => group.sourceGroupId === groupId);

  if (snapshot?.tabs.length && !isSavedInCollection) {
    const savedGroups = stored[savedGroupsKey] ?? [];
    savedGroups.unshift({
      id: `${Date.now()}-${groupId}`,
      title: snapshot.title,
      color: snapshot.color,
      collapsed: snapshot.collapsed,
      tabs: snapshot.tabs,
      savedAt: Date.now()
    });
    await chrome.storage.local.set({ [savedGroupsKey]: savedGroups });
  }

  delete snapshots[groupId];
  await chrome.storage.local.set({ [snapshotsKey]: snapshots });
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  enqueue(snapshotActiveGroups);
});

chrome.runtime.onStartup.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  enqueue(snapshotActiveGroups);
});

chrome.tabGroups.onCreated.addListener(() => enqueue(snapshotActiveGroups));
chrome.tabGroups.onUpdated.addListener(() => enqueue(snapshotActiveGroups));
chrome.tabGroups.onRemoved.addListener((group) => {
  enqueue(() => archiveRemovedGroup(group.id));
});
chrome.tabs.onCreated.addListener(() => enqueue(snapshotActiveGroups));
chrome.tabs.onUpdated.addListener(() => enqueue(snapshotActiveGroups));
chrome.tabs.onRemoved.addListener(() => {
  clearTimeout(removalRefreshTimer);
  removalRefreshTimer = setTimeout(() => enqueue(snapshotActiveGroups), 200);
});
