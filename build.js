const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('--- Starting Cbtshire.ai Unified Build ---');

// 1. Build frontend
const frontendDir = path.join(__dirname, 'frontend');
console.log('Building Vite frontend in:', frontendDir);
execSync('npm install && npm run build', { cwd: frontendDir, stdio: 'inherit' });

const srcDist = path.join(frontendDir, 'dist');
if (!fs.existsSync(srcDist)) {
  console.error('Frontend dist folder not found at:', srcDist);
  process.exit(1);
}

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

// 2. Copy build output to root dist, public, and build so every Vercel setting works
const rootDist = path.join(__dirname, 'dist');
const rootPublic = path.join(__dirname, 'public');
const rootBuild = path.join(__dirname, 'build');

console.log('Syncing dist to root locations...');
copyDirSync(srcDist, rootDist);
copyDirSync(srcDist, rootPublic);
copyDirSync(srcDist, rootBuild);

// Also copy index.html to root
fs.copyFileSync(path.join(srcDist, 'index.html'), path.join(__dirname, 'index.html'));

console.log('--- Unified Build Finished Successfully ---');
