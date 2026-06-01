const fs = require('fs');
const path = require('path');

const srcElectronDist = path.join(__dirname, 'node_modules', 'electron', 'dist');
const destAppDir = path.join(__dirname, 'dist', 'Comment Scraper-win32-x64');
const destResourcesApp = path.join(destAppDir, 'resources', 'app');

console.log('=== STARTING MANUAL ELECTRON PACKAGING ===');
console.log('Source Electron:', srcElectronDist);
console.log('Destination App:', destAppDir);

// Helper to copy directory recursively
function copyDirSync(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
  // 1. Validate source electron dist
  if (!fs.existsSync(srcElectronDist) || !fs.existsSync(path.join(srcElectronDist, 'electron.exe'))) {
    console.error('Error: Base Electron files not found in node_modules! Run manual extraction first.');
    process.exit(1);
  }

  // 2. Clean destAppDir if exists
  if (fs.existsSync(destAppDir)) {
    console.log('Cleaning old build folder...');
    fs.rmSync(destAppDir, { recursive: true, force: true });
  }

  // 3. Copy base Electron distribution
  console.log('Copying base Electron distribution binaries...');
  copyDirSync(srcElectronDist, destAppDir);

  // 4. Rename electron.exe to Comment Scraper.exe with robust retry loop for Windows file locks
  console.log('Renaming launcher executable...');
  const srcExe = path.join(destAppDir, 'electron.exe');
  const destExe = path.join(destAppDir, 'Comment Scraper.exe');
  
  let renamed = false;
  for (let i = 0; i < 10; i++) {
    try {
      if (fs.existsSync(destExe)) {
        fs.unlinkSync(destExe);
      }
      fs.renameSync(srcExe, destExe);
      renamed = true;
      break;
    } catch (err) {
      console.log(`Rename locked, retrying in 300ms... (${i + 1}/10)`);
      const start = Date.now();
      while (Date.now() - start < 300) {}
    }
  }
  if (!renamed) {
    throw new Error(`Failed to rename launcher after multiple retries.`);
  }

  // 5. Remove default_app.asar (Electron welcome app) to force it to load our custom /app folder
  const defaultAppAsar = path.join(destAppDir, 'resources', 'default_app.asar');
  if (fs.existsSync(defaultAppAsar)) {
    console.log('Removing default_app.asar...');
    fs.unlinkSync(defaultAppAsar);
  }

  // 6. Create resources/app directory and copy source files
  console.log('Creating resources/app folder...');
  fs.mkdirSync(destResourcesApp, { recursive: true });

  console.log('Copying application source files...');
  // Copy configuration and preload
  fs.copyFileSync(path.join(__dirname, 'main.js'), path.join(destResourcesApp, 'main.js'));
  fs.copyFileSync(path.join(__dirname, 'preload.js'), path.join(destResourcesApp, 'preload.js'));
  
  // Create production package.json
  const prodPackageJson = {
    name: 'comment-scraper',
    version: '1.0.0',
    main: 'main.js'
  };
  fs.writeFileSync(
    path.join(destResourcesApp, 'package.json'), 
    JSON.stringify(prodPackageJson, null, 2), 
    'utf8'
  );

  // Copy src folder recursively
  copyDirSync(path.join(__dirname, 'src'), path.join(destResourcesApp, 'src'));

  // Copy Icon folder recursively
  copyDirSync(path.join(__dirname, 'Icon'), path.join(destResourcesApp, 'Icon'));

  console.log('=== PACKAGING SUCCESSFUL ===');
  console.log('Offline Portable folder ready at: D:\\Scraper\\dist\\Comment Scraper-win32-x64');
  console.log('You can open "Comment Scraper.exe" to run the app.');
} catch (err) {
  console.error('Packaging failed with error:', err);
  process.exit(1);
}
