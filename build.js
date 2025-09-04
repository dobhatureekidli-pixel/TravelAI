const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');

async function build() {
  const distDir = 'dist';

  // Make sure API_KEY is available during build
  if (!process.env.API_KEY) {
      console.warn('Warning: API_KEY environment variable not set. The application will not be able to connect to the Gemini API.');
  }

  // Clean and create dist directory
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);

  // Build TypeScript/TSX file
  await esbuild.build({
    entryPoints: ['index.tsx'],
    bundle: true,
    outfile: path.join(distDir, 'index.js'),
    format: 'esm',
    minify: true,
    define: {
        // Pass the API_KEY from the build environment to the client-side code
        'process.env.API_KEY': JSON.stringify(process.env.API_KEY || '')
    }
  }).catch(() => process.exit(1));

  // Copy static files
  fs.copyFileSync('index.css', path.join(distDir, 'index.css'));
  if (fs.existsSync('metadata.json')) {
      fs.copyFileSync('metadata.json', path.join(distDir, 'metadata.json'));
  }

  // Read, modify, and write index.html for deployment
  let htmlContent = fs.readFileSync('index.html', 'utf-8');
  
  // Remove the development-only importmap
  htmlContent = htmlContent.replace(/<script type="importmap">[\s\S]*?<\/script>/, '');
  
  // Update the script tag to point to the bundled JavaScript file
  htmlContent = htmlContent.replace(
    '<script type="module" src="index.tsx"></script>',
    '<script type="module" src="index.js"></script>'
  );
  
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlContent);

  console.log('Build successful! Output is in the "dist" directory.');
}

build();
