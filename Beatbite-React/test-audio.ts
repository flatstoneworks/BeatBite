import { chromium } from '@playwright/test';

async function testAudioPassthrough() {
  console.log('Starting Playwright test...\n');

  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-fake-ui-for-media-stream', // Auto-grant mic permission
      '--use-fake-device-for-media-stream', // Use fake mic
      '--autoplay-policy=no-user-gesture-required',
    ],
  });

  const context = await browser.newContext({
    permissions: ['microphone'],
    ignoreHTTPSErrors: true, // Accept self-signed cert
  });

  const page = await context.newPage();

  // Collect console messages
  const consoleLogs: string[] = [];
  const consoleErrors: string[] = [];

  page.on('console', (msg) => {
    const text = `[${msg.type()}] ${msg.text()}`;
    consoleLogs.push(text);
    if (msg.type() === 'error') {
      consoleErrors.push(text);
    }
  });

  page.on('pageerror', (err) => {
    consoleErrors.push(`[pageerror] ${err.message}`);
  });

  try {
    // Navigate to the app
    console.log('1. Loading page...');
    await page.goto('https://localhost:9020', {
      waitUntil: 'networkidle',
      timeout: 10000
    });
    console.log('   Page loaded successfully\n');

    // Wait for app to initialize
    await page.waitForTimeout(1000);

    // Check initial state
    console.log('2. Checking initial state...');
    const initialText = await page.textContent('body');
    if (initialText?.includes('TAP TO START')) {
      console.log('   Initial state: Ready (TAP TO START visible)\n');
    } else if (initialText?.includes('Initializing')) {
      console.log('   Initial state: Still initializing...\n');
      await page.waitForTimeout(2000);
    } else if (initialText?.includes('permission')) {
      console.log('   Initial state: Permission issue\n');
    } else {
      console.log(`   Initial state: Unknown - "${initialText?.substring(0, 100)}"\n`);
    }

    // Click to start passthrough
    console.log('3. Clicking to start passthrough...');
    await page.click('body', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    // Check if listening started
    const afterClickText = await page.textContent('body');
    if (afterClickText?.includes('LISTENING')) {
      console.log('   Passthrough STARTED successfully!\n');
    } else {
      console.log(`   State after click: "${afterClickText?.substring(0, 100)}"\n`);
    }

    // Wait a moment to let audio run
    await page.waitForTimeout(2000);

    // Check if still listening
    console.log('4. Checking if still listening after 2 seconds...');
    const stillListening = await page.textContent('body');
    if (stillListening?.includes('LISTENING')) {
      console.log('   Still LISTENING - passthrough is stable!\n');
    } else {
      console.log(`   State changed to: "${stillListening?.substring(0, 100)}"\n`);
    }

    // Click to stop
    console.log('5. Clicking to stop passthrough...');
    await page.click('body', { position: { x: 400, y: 300 } });
    await page.waitForTimeout(500);

    const afterStopText = await page.textContent('body');
    if (afterStopText?.includes('TAP TO START')) {
      console.log('   Passthrough STOPPED successfully!\n');
    } else {
      console.log(`   State after stop: "${afterStopText?.substring(0, 100)}"\n`);
    }

    // Print console logs
    console.log('=== Browser Console Logs ===');
    consoleLogs.forEach(log => console.log(log));

    if (consoleErrors.length > 0) {
      console.log('\n=== ERRORS ===');
      consoleErrors.forEach(err => console.log(err));
    } else {
      console.log('\nNo errors detected!');
    }

  } catch (error) {
    console.error('Test failed:', error);
    console.log('\n=== Console Errors ===');
    consoleErrors.forEach(err => console.log(err));
  } finally {
    await browser.close();
  }
}

testAudioPassthrough();
