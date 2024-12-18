const fs = require('fs');
const path = require('path');

const env = process.argv[2] || 'development';
const EXTENSION_DIR = path.join(__dirname, 'chromeextension');

// Copy the appropriate config
fs.copyFileSync(
  path.join(__dirname, `extension-config.${env}.js`),
  path.join(EXTENSION_DIR, 'extension-config.js')
);

// Read manifest.json from the extension directory
const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

// Set environment-specific settings
if (env === 'development') {
  manifest.name = manifest.name + ' (Dev)';
  // Add any other development-specific manifest changes
}

// Write the updated manifest back to the extension directory
fs.writeFileSync(
  manifestPath,
  JSON.stringify(manifest, null, 2)
);