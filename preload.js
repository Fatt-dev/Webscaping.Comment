const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  getProjects: () => ipcRenderer.invoke('get-projects'),
  saveProject: (project) => ipcRenderer.invoke('save-project', project),
  deleteProject: (id) => ipcRenderer.invoke('delete-project', id),
  startScraping: (config) => ipcRenderer.send('start-scraping', config),
  cancelScraping: () => ipcRenderer.send('cancel-scraping'),
  finishScraping: () => ipcRenderer.send('finish-scraping'),
  downloadCsv: (projectId, filename, comments) => ipcRenderer.invoke('download-csv', { projectId, filename, comments }),
  
  // Real-time update event listeners
  onScrapingProgress: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('scraping-progress', subscription);
    return () => ipcRenderer.removeListener('scraping-progress', subscription);
  },
  onScrapingCompleted: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('scraping-completed', subscription);
    return () => ipcRenderer.removeListener('scraping-completed', subscription);
  },
  onScrapingCancelled: (callback) => {
    const subscription = (event) => callback();
    ipcRenderer.on('scraping-cancelled', subscription);
    return () => ipcRenderer.removeListener('scraping-cancelled', subscription);
  },
  onScrapingFailed: (callback) => {
    const subscription = (event, data) => callback(data);
    ipcRenderer.on('scraping-failed', subscription);
    return () => ipcRenderer.removeListener('scraping-failed', subscription);
  }
});
