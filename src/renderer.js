// DOM Elements Selection
const btnOpenCreate = document.getElementById('btn-open-create');
const btnModalClose = document.getElementById('btn-modal-close');
const projectModal = document.getElementById('project-modal');
const projectForm = document.getElementById('project-form');

const inputProjectName = document.getElementById('input-project-name');
const inputPlatform = document.getElementById('input-platform');
const inputUrl = document.getElementById('input-url');
const inputTargetCount = document.getElementById('input-target-count');
const chkUnlimited = document.getElementById('chk-unlimited');
const urlValidationError = document.getElementById('url-validation-error');

const viewIdle = document.getElementById('view-idle');
const viewScraping = document.getElementById('view-scraping');
const viewCompleted = document.getElementById('view-completed');
const viewFailed = document.getElementById('view-failed');

const btnCancelScraping = document.getElementById('btn-cancel-scraping');
const btnFinishScraping = document.getElementById('btn-finish-scraping');
const btnFailedReset = document.getElementById('btn-failed-reset');
const btnDownloadDataset = document.getElementById('btn-download-dataset');
const btnBackToIdle = document.getElementById('btn-back-to-idle');

const commentsTableBody = document.getElementById('comments-table-body');
const datasetTitleText = document.getElementById('dataset-title-text');
const datasetCountBadge = document.getElementById('dataset-count-badge');

const footerProgress = document.getElementById('footer-progress');
const footerDownload = document.getElementById('footer-download');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressBarText = document.getElementById('progress-bar-text');

const projectListItems = document.getElementById('project-list-items');

// Custom Delete Confirmation Modal Elements
const deleteModal = document.getElementById('delete-modal');
const deleteProjectName = document.getElementById('delete-project-name');
const btnDeleteConfirm = document.getElementById('btn-delete-confirm');
const btnDeleteCancel = document.getElementById('btn-delete-cancel');
const btnDeleteClose = document.getElementById('btn-delete-close');

// Active App State
let projects = [];
let activeProject = null;
let currentScrapingComments = [];
let projectIdToDelete = null;

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', async () => {
  await loadProjects();
  setupEventListeners();
  
  // Set default view
  switchState('idle');
});

// Load projects from electron store
async function loadProjects() {
  try {
    projects = await window.api.getProjects();
    renderProjectsList();
  } catch (err) {
    console.error('Failed to load projects:', err);
  }
}

// Render the sidebar list of projects
function renderProjectsList() {
  projectListItems.innerHTML = '';
  
  if (projects.length === 0) {
    projectListItems.innerHTML = `
      <div class="project-list-empty">
        Belum ada proyek.<br>Klik tombol plus (+) untuk membuat proyek baru.
      </div>
    `;
    return;
  }

  projects.forEach(project => {
    const item = document.createElement('div');
    item.className = `project-item ${activeProject && activeProject.id === project.id ? 'active' : ''}`;
    
    let statusText = 'Idle';
    if (project.status === 'scraping') {
      statusText = 'Mengambil...';
    } else if (project.status === 'completed') {
      statusText = `Selesai (${project.comments.length} data)`;
    } else if (project.status === 'failed') {
      statusText = 'Gagal';
    }

    item.innerHTML = `
      <div class="project-item-info">
        <div class="project-item-name" title="${escapeHTML(project.name)}">${escapeHTML(project.name)}</div>
        <div class="project-item-meta">
          <span class="badge-platform badge-${project.platform}">${project.platform}</span>
          <span class="project-item-status">${statusText}</span>
        </div>
      </div>
      <button class="btn-delete-project" title="Hapus Proyek" data-id="${project.id}">
        <svg viewBox="0 0 24 24" width="16" height="16" stroke="currentColor" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    // Click item to load it
    item.addEventListener('click', (e) => {
      // Don't trigger load if clicking delete button
      if (e.target.closest('.btn-delete-project')) return;
      selectProject(project);
    });

    // Delete project
    const btnDel = item.querySelector('.btn-delete-project');
    btnDel.addEventListener('click', (e) => {
      e.stopPropagation();
      projectIdToDelete = project.id;
      deleteProjectName.textContent = project.name;
      deleteModal.classList.add('active');
    });

    projectListItems.appendChild(item);
  });
}

// Select and open a project from the sidebar list
function selectProject(project) {
  // If we are actively scraping, prevent switching projects unless canceled
  if (activeProject && activeProject.status === 'scraping') {
    alert('Harap selesaikan atau batalkan proses scraping terlebih dahulu.');
    return;
  }

  activeProject = project;
  renderProjectsList(); // update active highlight

  if (project.status === 'completed') {
    switchState('completed');
    datasetTitleText.textContent = `Hasil Proyek: ${project.name} (Tabel 100 Baris Pertama)`;
    if (project.targetCount <= 0) {
      datasetCountBadge.textContent = `${project.comments.length} Komentar (Tanpa Batas)`;
    } else {
      datasetCountBadge.textContent = `${project.comments.length} / ${project.targetCount} Komentar`;
    }
    populateTable(project.comments);
  } else if (project.status === 'failed') {
    switchState('failed');
  } else {
    // Idle state configuration loaded, wait for start
    switchState('idle');
    progressBarText.textContent = `Konfigurasi proyek "${project.name}" dimuat`;
    progressBarFill.style.width = '0%';
  }
}

// Delete a project
async function deleteProject(id) {
  try {
    projects = await window.api.deleteProject(id);
    if (activeProject && activeProject.id === id) {
      activeProject = null;
      switchState('idle');
      progressBarText.textContent = 'Menunggu proyek baru...';
      progressBarFill.style.width = '0%';
    }
    renderProjectsList();
  } catch (err) {
    console.error('Failed to delete project:', err);
  }
}

// --- STATE MANAGEMENT ---
function switchState(state) {
  // Hide all content views
  viewIdle.classList.remove('active');
  viewScraping.classList.remove('active');
  viewCompleted.classList.remove('active');
  viewFailed.classList.remove('active');

  // Hide all footer control panels
  footerProgress.classList.remove('active');
  footerDownload.classList.remove('active');

  if (state === 'idle') {
    viewIdle.classList.add('active');
    footerProgress.classList.add('active');
  } else if (state === 'scraping') {
    viewScraping.classList.add('active');
    footerProgress.classList.add('active');
  } else if (state === 'completed') {
    viewCompleted.classList.add('active');
    footerDownload.classList.add('active');
  } else if (state === 'failed') {
    viewFailed.classList.add('active');
    footerProgress.classList.add('active');
  }
}

// Populate table with scraped data (only show 100 rows for GUI stability)
function populateTable(comments) {
  commentsTableBody.innerHTML = '';
  
  if (!comments || comments.length === 0) {
    commentsTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center;">Tidak ada data komentar yang ditemukan.</td></tr>';
    return;
  }

  // Slice to max 100 comments to guarantee UI stability
  const displayItems = comments.slice(0, 100);

  displayItems.forEach(item => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td><strong>${item.no}</strong></td>
      <td><span style="font-weight: 600; color: var(--color-blue);">${escapeHTML(item.author)}</span></td>
      <td>${escapeHTML(item.comment)}</td>
      <td><span class="badge-platform badge-${item.platform.toLowerCase()}">${item.platform}</span></td>
      <td style="color: #666; font-size: 11px;">${escapeHTML(item.date)}</td>
    `;
    commentsTableBody.appendChild(row);
  });
}

// --- FORM VALIDATION ---
function validateUrl(platform, url) {
  urlValidationError.style.display = 'none';
  urlValidationError.textContent = '';

  if (!url) return false;

  let isValid = false;
  if (platform === 'youtube') {
    isValid = /(youtube\.com|youtu\.be)/i.test(url);
  } else if (platform === 'tiktok') {
    isValid = /(tiktok\.com)/i.test(url);
  } else if (platform === 'twitter') {
    isValid = /(twitter\.com|x\.com)/i.test(url);
  }

  if (!isValid) {
    urlValidationError.textContent = `URL tidak kompatibel dengan platform ${platform.toUpperCase()}. Harap masukkan tautan yang valid.`;
    urlValidationError.style.display = 'block';
  }

  return isValid;
}

// --- SCRAPING INTERACTION ---

// Trigger new project creation and start scraping
async function handleStartScraping(name, platform, url, targetCount) {
  // 1. Create project object
  const newProject = {
    id: 'proj_' + Date.now(),
    name: name,
    platform: platform,
    url: url,
    targetCount: parseInt(targetCount),
    status: 'scraping',
    comments: [],
    dateCreated: new Date().toISOString()
  };

  activeProject = newProject;
  currentScrapingComments = [];

  // Auto-Save project metadata to save state immediately
  try {
    projects = await window.api.saveProject(newProject);
    renderProjectsList();
  } catch (err) {
    console.error('Failed to auto-save project:', err);
  }

  // Switch UI to scraping
  switchState('scraping');
  if (newProject.targetCount <= 0) {
    progressBarText.textContent = `Memulai scraping: 0 Komentar (Tanpa Batas)`;
  } else {
    progressBarText.textContent = `Memulai scraping: 0 / ${newProject.targetCount} Komentar`;
  }
  progressBarFill.style.width = '0%';

  // Trigger main process scraper window
  window.api.startScraping({
    url: newProject.url,
    platform: newProject.platform,
    targetCount: newProject.targetCount
  });
}

// --- ELECTRON EVENTS ---

// Listen for scraping progress updates (real-time stream)
const removeProgressListener = window.api.onScrapingProgress((data) => {
  if (!activeProject || activeProject.status !== 'scraping') return;

  const current = data.currentCount;
  const target = data.targetCount;

  if (target <= 0) {
    progressBarFill.style.width = `100%`;
    progressBarText.textContent = `MENGAMBIL DATA: ${current} KOMENTAR (TANPA BATAS)`;
  } else {
    const percent = Math.min(Math.round((current / target) * 100), 100);
    progressBarFill.style.width = `${percent}%`;
    progressBarText.textContent = `MENGAMBIL DATA: ${current} / ${target} KOMENTAR (${percent}%)`;
  }
  
  // Cache current comments in memory
  currentScrapingComments = data.comments;
});

// Listen for scrape completion
const removeCompletedListener = window.api.onScrapingCompleted(async (finalComments) => {
  if (!activeProject || activeProject.status !== 'scraping') return;

  console.log('Scraping completed. Found total of:', finalComments.length);

  // Update project object
  activeProject.status = 'completed';
  activeProject.comments = finalComments;

  // Auto-Save final scraped comments to database
  try {
    projects = await window.api.saveProject(activeProject);
    renderProjectsList();
  } catch (err) {
    console.error('Failed to auto-save final data:', err);
  }

  // Update Workspace to show table
  switchState('completed');
  datasetTitleText.textContent = `Hasil Proyek: ${activeProject.name} (Tabel 100 Baris Pertama)`;
  if (activeProject.targetCount <= 0) {
    datasetCountBadge.textContent = `${finalComments.length} Komentar (Tanpa Batas)`;
  } else {
    datasetCountBadge.textContent = `${finalComments.length} / ${activeProject.targetCount} Komentar`;
  }
  
  populateTable(finalComments);
});

// Listen for scraping cancellation
const removeCancelledListener = window.api.onScrapingCancelled(async () => {
  if (!activeProject || activeProject.status !== 'scraping') return;

  const cancelledProjectId = activeProject.id;
  activeProject = null;

  // Delete the project from database since it was cancelled
  try {
    projects = await window.api.deleteProject(cancelledProjectId);
    renderProjectsList();
  } catch (err) {
    console.error('Failed to delete cancelled project:', err);
  }

  switchState('idle');
  progressBarText.textContent = 'Scraping dibatalkan';
  progressBarFill.style.width = '0%';
});

// Listen for scraping errors
const removeFailedListener = window.api.onScrapingFailed(async (errMessage) => {
  if (!activeProject || activeProject.status !== 'scraping') return;

  activeProject.status = 'failed';
  try {
    projects = await window.api.saveProject(activeProject);
    renderProjectsList();
  } catch (err) {
    console.error('Failed to auto-save failed state:', err);
  }

  switchState('failed');
  document.getElementById('error-message').textContent = errMessage || 'Terjadi kesalahan jaringan atau halaman ditolak.';
});

// --- UI LISTENERS SETUP ---
function setupEventListeners() {
  // Modal toggle
  btnOpenCreate.addEventListener('click', () => {
    projectForm.reset();
    urlValidationError.style.display = 'none';
    
    // Ensure inputs are correctly reset to default state
    chkUnlimited.checked = false;
    inputTargetCount.disabled = false;
    inputTargetCount.required = true;
    inputTargetCount.value = '100';
    inputTargetCount.placeholder = 'Contoh: 100';
    inputTargetCount.style.opacity = '1';

    projectModal.classList.add('active');
    inputProjectName.focus();
  });

  btnModalClose.addEventListener('click', () => {
    projectModal.classList.remove('active');
  });

  // Close modal when clicking outside box
  projectModal.addEventListener('click', (e) => {
    if (e.target === projectModal) {
      projectModal.classList.remove('active');
    }
  });

  // Checkbox Unlimited toggle
  chkUnlimited.addEventListener('change', () => {
    if (chkUnlimited.checked) {
      inputTargetCount.disabled = true;
      inputTargetCount.required = false;
      inputTargetCount.value = '';
      inputTargetCount.placeholder = 'Tanpa Batas';
      inputTargetCount.style.opacity = '0.7';
    } else {
      inputTargetCount.disabled = false;
      inputTargetCount.required = true;
      inputTargetCount.value = '100';
      inputTargetCount.placeholder = 'Contoh: 100';
      inputTargetCount.style.opacity = '1';
    }
  });

  // Platform select validation change
  inputPlatform.addEventListener('change', () => {
    if (inputUrl.value) {
      validateUrl(inputPlatform.value, inputUrl.value);
    }
  });

  // URL input keyup validation
  inputUrl.addEventListener('input', () => {
    if (inputPlatform.value) {
      validateUrl(inputPlatform.value, inputUrl.value);
    }
  });

  // Project form submit
  projectForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const name = inputProjectName.value.trim();
    const platform = inputPlatform.value;
    const url = inputUrl.value.trim();
    const isUnlimited = chkUnlimited.checked;
    const count = isUnlimited ? 0 : parseInt(inputTargetCount.value);

    if (!validateUrl(platform, url)) {
      return; // Stop if invalid URL
    }

    projectModal.classList.remove('active');
    handleStartScraping(name, platform, url, count);
  });

  // Finish scraping process
  btnFinishScraping.addEventListener('click', () => {
    window.api.finishScraping();
  });

  // Cancel scraping process
  btnCancelScraping.addEventListener('click', () => {
    if (confirm('Apakah Anda yakin ingin membatalkan scraping? Seluruh data komentar yang telah dikumpulkan dalam sesi ini akan dihapus.')) {
      window.api.cancelScraping();
    }
  });

  // Reset Failed View
  btnFailedReset.addEventListener('click', () => {
    switchState('idle');
    progressBarText.textContent = 'Menunggu proyek baru...';
    progressBarFill.style.width = '0%';
  });

  // Download CSV Event
  btnDownloadDataset.addEventListener('click', async () => {
    if (!activeProject || !activeProject.comments || activeProject.comments.length === 0) {
      alert('Tidak ada data komentar untuk diunduh.');
      return;
    }

    const cleanFilename = activeProject.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    try {
      const response = await window.api.downloadCsv(
        activeProject.id, 
        cleanFilename, 
        activeProject.comments
      );

      if (response.success) {
        alert(`Berhasil mengunduh dataset! Disimpan di:\n${response.filePath}`);
      } else if (response.error !== 'Save canceled') {
        alert(`Gagal mengunduh dataset: ${response.error}`);
      }
    } catch (err) {
      alert(`Terjadi kesalahan saat mengunduh berkas: ${err.message}`);
    }
  });

  // Kembali ke dashboard & buat proyek baru
  btnBackToIdle.addEventListener('click', () => {
    // Reset active project in memory and update sidebar style
    activeProject = null;
    renderProjectsList();

    // Switch state to idle
    switchState('idle');
    progressBarText.textContent = 'Menunggu proyek baru...';
    progressBarFill.style.width = '0%';

    // Open project modal automatically for supreme ease of use
    projectForm.reset();
    urlValidationError.style.display = 'none';
    projectModal.classList.add('active');
    inputProjectName.focus();
  });

  // Delete project confirmation modal events
  btnDeleteCancel.addEventListener('click', () => {
    deleteModal.classList.remove('active');
    projectIdToDelete = null;
  });

  btnDeleteClose.addEventListener('click', () => {
    deleteModal.classList.remove('active');
    projectIdToDelete = null;
  });

  deleteModal.addEventListener('click', (e) => {
    if (e.target === deleteModal) {
      deleteModal.classList.remove('active');
      projectIdToDelete = null;
    }
  });

  btnDeleteConfirm.addEventListener('click', async () => {
    if (projectIdToDelete) {
      await deleteProject(projectIdToDelete);
      deleteModal.classList.remove('active');
      projectIdToDelete = null;
    }
  });
}

// Utility to escape HTML to prevent XSS in tables
function escapeHTML(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
