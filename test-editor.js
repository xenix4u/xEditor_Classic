const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Navigate to the page
  await page.goto('http://localhost:8080');
  
  // Wait for editor to be available
  await page.waitForFunction(() => window.xeditor && window.xeditor.XEditor, { timeout: 5000 });
  
  // Check if editors are initialized
  const editorsInfo = await page.evaluate(() => {
    const editors = [];
    
    // Check if xeditor global exists
    if (!window.xeditor) {
      return { error: 'xeditor global not found' };
    }
    
    // Check if editor containers exist
    const containers = ['#editor1', '#editor2', '#editor3'];
    containers.forEach((selector, index) => {
      const element = document.querySelector(selector);
      if (element) {
        // Check if editor is actually rendered
        const hasToolbar = element.querySelector('.xeditor-toolbar');
        const hasContent = element.querySelector('.xeditor-content');
        editors.push({
          selector,
          exists: true,
          hasToolbar: !!hasToolbar,
          hasContent: !!hasContent,
          innerHTML: element.innerHTML.length > 0
        });
      } else {
        editors.push({ selector, exists: false });
      }
    });
    
    return { editors, xeditorAvailable: true };
  });
  
  console.log('Editor Test Results:');
  console.log(JSON.stringify(editorsInfo, null, 2));
  
  await browser.close();
})();