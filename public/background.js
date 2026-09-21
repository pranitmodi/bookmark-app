chrome.runtime.onInstalled.addListener((details) => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: false }).catch(() => {});
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage();
  }
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'openSidePanel') {
    const open = async () => {
      const windowId = sender.tab?.windowId;
      if (windowId) {
        await chrome.sidePanel.open({ windowId });
        sendResponse({ ok: true });
        return;
      }
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.windowId) {
        await chrome.sidePanel.open({ windowId: tab.windowId });
      }
      sendResponse({ ok: true });
    };
    open().catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }
});
