const { app, BrowserWindow, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow = null;
let scraperWindow = null;

// Path to store project list data
const dataFilePath = path.join(app.getPath('userData'), 'projects.json');

// Memory store of comments during an active scrape session
let activeScrapedComments = [];
let activeConfig = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    resizable: true,
    icon: path.join(__dirname, 'Icon', 'Icon.png'), // fallback icon if present
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src', 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (scraperWindow) {
      scraperWindow.close();
    }
  });
}

app.whenReady().then(() => {
  // Hide application menu bar (File, Edit, View, etc.)
  Menu.setApplicationMenu(null);
  
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC IPC HANDLERS FOR PROJECTS STORAGE ---

// Read projects list
ipcMain.handle('get-projects', async () => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      return JSON.parse(data);
    }
    return [];
  } catch (err) {
    console.error('Error reading projects file:', err);
    return [];
  }
});

// Save or Update a project (Auto-save)
ipcMain.handle('save-project', async (event, project) => {
  try {
    let projects = [];
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      projects = JSON.parse(data);
    }

    const index = projects.findIndex(p => p.id === project.id);
    if (index !== -1) {
      projects[index] = project; // Update existing
    } else {
      projects.push(project); // Insert new
    }

    fs.writeFileSync(dataFilePath, JSON.stringify(projects, null, 2), 'utf8');
    return projects;
  } catch (err) {
    console.error('Error saving project:', err);
    throw err;
  }
});

// Delete a project
ipcMain.handle('delete-project', async (event, projectId) => {
  try {
    if (fs.existsSync(dataFilePath)) {
      const data = fs.readFileSync(dataFilePath, 'utf8');
      let projects = JSON.parse(data);
      projects = projects.filter(p => p.id !== projectId);
      fs.writeFileSync(dataFilePath, JSON.stringify(projects, null, 2), 'utf8');
      return projects;
    }
    return [];
  } catch (err) {
    console.error('Error deleting project:', err);
    throw err;
  }
});

// --- IPC SCRAPING CONTROL ---

ipcMain.on('start-scraping', (event, config) => {
  activeConfig = config;
  activeScrapedComments = [];

  if (scraperWindow) {
    try { scraperWindow.close(); } catch(e) {}
  }

  // Create scraper browser window (visible) with persistent session partition
  scraperWindow = new BrowserWindow({
    width: 1000,
    height: 800,
    title: `Scraper - ${config.platform.toUpperCase()} (${config.url})`,
    icon: path.join(__dirname, 'Icon', 'Icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'src', 'scraper-preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      partition: 'persist:scraper'
    }
  });

  // Set desktop user agent to prevent redirects and allow standard login screens
  scraperWindow.webContents.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36');

  scraperWindow.loadURL(config.url);

  // Open Developer Tools by default for debugging DOM elements & scraping activity
  scraperWindow.webContents.openDevTools();

  // When DOM is ready, initialize scraping settings in the scraper window
  scraperWindow.webContents.on('dom-ready', () => {
    if (scraperWindow) {
      scraperWindow.webContents.send('init-scraper', {
        targetCount: config.targetCount,
        platform: config.platform
      });
    }
  });

  // Handle manual closure of scraper window by user
  scraperWindow.on('close', () => {
    // If it's closed and we haven't officially completed, complete with whatever we got
    if (mainWindow) {
      mainWindow.webContents.send('scraping-completed', activeScrapedComments);
    }
    scraperWindow = null;
  });
});

ipcMain.on('cancel-scraping', () => {
  if (scraperWindow) {
    scraperWindow.close();
    scraperWindow = null;
  }
});

// Forward real-time comments from scraper window to main dashboard window
ipcMain.on('scraping-chunk', (event, data) => {
  activeScrapedComments = data.comments;
  if (mainWindow) {
    mainWindow.webContents.send('scraping-progress', {
      currentCount: data.currentCount,
      targetCount: data.targetCount,
      commentsPreview: data.comments.slice(0, 100) // 100 preview rows
    });
  }
});

// Handle finished event from scraper
ipcMain.on('scraping-finished', (event, finalComments) => {
  activeScrapedComments = finalComments;
  
  if (mainWindow) {
    mainWindow.webContents.send('scraping-completed', finalComments);
  }
  
  if (scraperWindow) {
    // Prevent the close listener from triggering a second completed event
    scraperWindow.removeAllListeners('close');
    scraperWindow.close();
    scraperWindow = null;
  }
});

// --- IPC CSV EXPORTER ---

ipcMain.handle('download-csv', async (event, { projectId, filename, comments }) => {
  if (!comments || comments.length === 0) return { success: false, error: 'No comments to download' };

  const defaultPath = filename ? `${filename}.csv` : 'dataset.csv';

  const { filePath, canceled } = await dialog.showSaveDialog(mainWindow, {
    title: 'Download Dataset CSV',
    defaultPath: defaultPath,
    filters: [
      { name: 'CSV Files', extensions: ['csv'] }
    ]
  });

  if (canceled || !filePath) {
    return { success: false, error: 'Save canceled' };
  }

  try {
    const csvContent = convertToCSV(comments);
    // Write UTF-8 with BOM to ensure Excel opens Indonesian special chars / emojis correctly
    fs.writeFileSync(filePath, '\ufeff' + csvContent, 'utf8');
    return { success: true, filePath };
  } catch (err) {
    console.error('Error saving CSV:', err);
    return { success: false, error: err.message };
  }
});

// Helper: Convert comments data to valid CSV format
function convertToCSV(data) {
  const headers = ['No', 'Author', 'Comment', 'Platform', 'Date'];
  const rows = data.map(item => [
    item.no || '',
    item.author || '',
    item.comment || '',
    item.platform || '',
    item.date || ''
  ]);
  
  const escapeField = (val) => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    // Escape quotes, commas, and newlines
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  
  const headerRow = headers.map(escapeField).join(',');
  const dataRows = rows.map(row => row.map(escapeField).join(',')).join('\r\n');
  
  return headerRow + '\r\n' + dataRows;
}
