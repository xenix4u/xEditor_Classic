const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Log console messages
  page.on('console', msg => console.log('Browser console:', msg.text()));
  page.on('pageerror', error => console.log('Page error:', error.message));
  
  // Navigate to the page
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  
  // Get page content and check what's available
  const pageInfo = await page.evaluate(() => {
    return {
      title: document.title,
      hasXEditor: typeof window.xeditor !== 'undefined',
      hasXEditorClass: typeof window.XEditor !== 'undefined',
      windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes('editor')),
      containers: {
        editor1: !!document.querySelector('#editor1'),
        editor2: !!document.querySelector('#editor2'),
        editor3: !!document.querySelector('#editor3')
      },
      scriptsLoaded: Array.from(document.scripts).map(s => s.src),
      errors: window.errors || []
    };
  });
  
  console.log('Page Info:');
  console.log(JSON.stringify(pageInfo, null, 2));
  
  // Take screenshot
  await page.screenshot({ path: 'editor-test.png', fullPage: true });
  console.log('Screenshot saved to editor-test.png');
  
  await browser.close();
})();