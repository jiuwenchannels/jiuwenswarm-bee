'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('bee', {
  openChat: () => ipcRenderer.send('bee:open-chat'),
  setExpanded: (expanded) => ipcRenderer.send('bee:set-expanded', expanded),
  setClickThrough: (enabled) => ipcRenderer.send('bee:set-click-through', enabled),
  hidePet: () => ipcRenderer.send('bee:hide-pet'),
  quit: () => ipcRenderer.send('bee:quit'),
  log: (message) => ipcRenderer.send('bee:log', message),
});
