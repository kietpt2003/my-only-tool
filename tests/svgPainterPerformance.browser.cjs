// Optional browser regression: CHROME_BIN can point to another Chrome/Chromium installation.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execFileSync } = require('node:child_process');
const webpack = require('webpack');

const chrome = process.env.CHROME_BIN || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'svg-painter-performance-'));
const config = require('../webpack.config');
config.mode = 'development';
config.devtool = false;
config.entry = path.join(__dirname, 'fixtures/svgPainterPerformance.cjs');
config.output = { path: directory, filename: 'bundle.js' };

webpack(config, (error, stats) => {
  if (error || stats.hasErrors()) {
    console.error(error || stats.toString({ all: false, errors: true }));
    process.exitCode = 1;
    return;
  }
  try {
    const output = execFileSync(chrome, [
      '--headless', '--no-sandbox', '--disable-gpu',
      `--user-data-dir=${path.join(directory, 'profile')}`,
      '--dump-dom', '--virtual-time-budget=20000', '--window-size=1700,1600',
      'file:///' + path.join(directory, 'index.html').replaceAll('\\', '/'),
    ], { encoding: 'utf8', timeout: 60000, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] });
    const result = output.match(/<pre id="result">([^<]+)/)?.[1];
    if (!result?.startsWith('PASS')) throw new Error(output.slice(-2500));
    console.log(result);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
});
