const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Navigate and wait for editors
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 2000)); // Give editors time to initialize
  
  // Check editor rendering
  const editorStatus = await page.evaluate(() => {
    const results = {};
    
    ['#editor1', '#editor2', '#editor3'].forEach((selector, index) => {
      const container = document.querySelector(selector);
      if (container) {
        const toolbar = container.querySelector('.xeditor-toolbar');
        const content = container.querySelector('.xeditor-content');
        const buttons = container.querySelectorAll('.xeditor-toolbar__item');
        
        results[`editor${index + 1}`] = {
          containerFound: true,
          hasToolbar: !!toolbar,
          hasContent: !!content,
          toolbarButtons: buttons.length,
          contentEditable: content ? content.contentEditable === 'true' : false,
          contentHeight: content ? content.offsetHeight : 0,
          toolbarHeight: toolbar ? toolbar.offsetHeight : 0
        };
      } else {
        results[`editor${index + 1}`] = { containerFound: false };
      }
    });
    
    return results;
  });
  
  console.log('Editor Rendering Status:');
  console.log(JSON.stringify(editorStatus, null, 2));
  
  // Test typing in editor
  const testTyping = await page.evaluate(() => {
    const editor1Content = document.querySelector('#editor1 .xeditor-content');
    if (editor1Content) {
      editor1Content.focus();
      editor1Content.innerHTML = '<p>Test content typed via JavaScript</p>';
      const event = new Event('input', { bubbles: true });
      editor1Content.dispatchEvent(event);
      return editor1Content.innerHTML;
    }
    return null;
  });
  
  console.log('\nTyping test result:', testTyping);
  
  await browser.close();
})();