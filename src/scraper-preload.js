const { ipcRenderer } = require('electron');

// Helper to delay execution
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

let targetCount = 100;
let platform = 'youtube';
let scrapedData = new Map(); // Use map to prevent duplicates by key (Author + CommentText)
let stopRequested = false;

// IPC Listener to configure target and platform
ipcRenderer.on('init-scraper', (event, config) => {
  targetCount = (config.targetCount !== undefined && config.targetCount !== null) ? config.targetCount : 100;
  platform = config.platform || 'youtube';
  console.log(`[Scraper] Initialized for ${platform} aiming for ${targetCount} comments.`);
  
  // Start the scraping loop
  startScrapingLoop();
});

ipcRenderer.on('stop-scraper', () => {
  stopRequested = true;
  console.log('[Scraper] Stop requested.');
});

async function startScrapingLoop() {
  console.log('[Scraper] Starting scraping loop...');
  
  // Initial page load delay
  await sleep(3000);
  
  const isUnlimited = targetCount <= 0;
  
  while (!stopRequested && (isUnlimited || scrapedData.size < targetCount)) {
    // Wait for content to load and render as the user scrolls
    await sleep(1500);
    
    // Extract comments
    const currentChunk = extractComments();
    
    // Add to our persistent store
    currentChunk.forEach(item => {
      const uniqueKey = `${item.author}::${item.comment}`;
      if (!scrapedData.has(uniqueKey) && (isUnlimited || scrapedData.size < targetCount)) {
        scrapedData.set(uniqueKey, item);
      }
    });

    const currentCount = scrapedData.size;
    console.log(`[Scraper] Progress: ${currentCount}/${isUnlimited ? 'Unlimited' : targetCount}`);

    // Send progress chunk back to main process
    const commentsList = Array.from(scrapedData.values()).map((c, index) => ({
      no: index + 1,
      ...c
    }));
    
    ipcRenderer.send('scraping-chunk', {
      comments: commentsList,
      currentCount: currentCount,
      targetCount: targetCount
    });
    
    if (!isUnlimited && scrapedData.size >= targetCount) {
      console.log('[Scraper] Stopped. Reached target count.');
      break;
    }
  }

  // Finalize
  const finalCommentsList = Array.from(scrapedData.values()).map((c, index) => ({
    no: index + 1,
    ...c
  }));
  
  ipcRenderer.send('scraping-finished', finalCommentsList);
}

function extractComments() {
  const items = [];
  
  if (platform === 'youtube') {
    // Select comment threads
    const threads = document.querySelectorAll('ytd-comment-thread-renderer');
    threads.forEach(thread => {
      // Main comment in thread
      const commentEl = thread.querySelector('ytd-comment-view-model, ytd-comment-renderer');
      if (!commentEl) return;

      const authorEl = commentEl.querySelector('#author-text');
      const textEl = commentEl.querySelector('#content-text');
      const dateEl = commentEl.querySelector('yt-formatted-string.published-time-text, #published-time-text a');

      const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
      const comment = textEl ? textEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : 'Just now';

      if (comment) {
        items.push({ author, comment, platform: 'YouTube', date });
      }
    });
  } 
  else if (platform === 'tiktok') {
    // Log TikTok page diagnostic info
    console.log('[Scraper Diagnostic] Checking TikTok DOM...');
    
    // Find all comment containers
    const commentNodes = document.querySelectorAll(
      'div[data-e2e="comment-item"], ' +
      'div[class*="DivCommentItemContainer"], ' +
      'div[class*="CommentItemContainer"], ' +
      'div[class*="CommentItem"], ' +
      'div[class*="comment-item"], ' +
      '[class*="comment-item"]'
    );
    
    console.log(`[Scraper Diagnostic] Found ${commentNodes.length} potential TikTok comment containers.`);

    if (commentNodes.length === 0) {
      console.warn('[Scraper Diagnostic] No comment containers found. Listing data-e2e attributes in DOM for debugging:');
      const e2eElements = document.querySelectorAll('[data-e2e]');
      const attributes = Array.from(e2eElements).slice(0, 15).map(el => ({
        tag: el.tagName,
        dataE2e: el.getAttribute('data-e2e'),
        classes: el.className,
        textPreview: el.textContent.trim().slice(0, 50)
      }));
      console.warn('[Scraper Diagnostic] Top data-e2e elements:', attributes);
    }

    commentNodes.forEach((node, idx) => {
      // Robust author finder: target username wrapper and get inner text
      const authorEl = node.querySelector(
        '[data-e2e*="comment-username"], ' +
        'div[class*="DivUsernameContentWrapper"] p, ' +
        'div[class*="DivUsernameContentWrapper"] a, ' +
        'a[class*="-StyledUserLink"] p, ' +
        'a[class*="StyledUserLink"] p, ' +
        'span[data-e2e="comment-username"]'
      );

      // Robust comment text finder: target comment-level-1 or level-2 elements
      const textEl = node.querySelector(
        '[data-e2e^="comment-level-"], ' +
        '[data-e2e*="comment-level"], ' +
        'p[data-e2e="comment-text"], ' +
        'p[class*="-PCommentText"], ' +
        'p[class*="comment-text"]'
      );

      // Robust date finder: target placeholder colored text span
      const dateEl = node.querySelector(
        'span[style*="ui-text-placeholder"], ' +
        'span[data-e2e="comment-time"], ' +
        'span[class*="-SpanCreatedTime"], ' +
        'span[class*="comment-time"], ' +
        '[class*="CreatedTime"]'
      );

      const author = authorEl ? authorEl.textContent.trim() : 'Unknown';
      const comment = textEl ? textEl.textContent.trim() : '';
      const date = dateEl ? dateEl.textContent.trim() : 'Just now';

      if (idx === 0) {
        console.log('[Scraper Diagnostic] First comment extraction sample:', { author, comment, date });
        console.log('[Scraper Diagnostic] FIRST CONTAINER HTML:', node.outerHTML);
      }

      if (comment) {
        items.push({ author, comment, platform: 'TikTok', date });
      }
    });
  } 
  else if (platform === 'twitter' || platform === 'twitter-x') {
    // Twitter/X: tweets are inside article[data-testid="tweet"]
    const tweetNodes = document.querySelectorAll('article[data-testid="tweet"]');
    
    // We skip the first article if we are on a tweet detail page, since it's the main post.
    // However, let's keep all for safety, and filter main tweet if needed.
    // To identify if it is a comment, we can check if it's not the top-most main tweet or just scrape them.
    tweetNodes.forEach((node, index) => {
      // In Twitter status pages, index 0 is typically the original tweet.
      // We skip the very first tweet if we want only replies (comments).
      if (index === 0 && window.location.href.includes('/status/')) {
        return; 
      }

      // Author handle/name
      const userNameEl = node.querySelector('div[data-testid="User-Name"]');
      let author = 'Unknown';
      if (userNameEl) {
        // Can get Display name and @handle
        const textParts = userNameEl.textContent.split('·');
        author = textParts[0] ? textParts[0].trim() : 'Unknown';
        // Try to get handle: matches @username
        const match = userNameEl.textContent.match(/@[A-Za-z0-9_]+/);
        if (match) {
          author = `${author} (${match[0]})`;
        }
      }

      // Comment text
      const textEl = node.querySelector('div[data-testid="tweetText"]');
      const comment = textEl ? textEl.textContent.trim() : '';

      // Date
      const timeEl = node.querySelector('time');
      const date = timeEl ? timeEl.getAttribute('datetime') || timeEl.textContent : 'Just now';

      if (comment) {
        items.push({ author, comment, platform: 'Twitter', date });
      }
    });
  }

  return items;
}
