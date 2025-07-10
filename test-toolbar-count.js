const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const toolbarInfo = await page.evaluate(() => {
    const toolbar = document.querySelector('#editor1 .xeditor-toolbar');
    if (!toolbar) return { error: 'Toolbar not found' };
    
    const items = Array.from(toolbar.children);
    const itemTypes = items.map((item, index) => ({
      index,
      className: item.className,
      tagName: item.tagName,
      isVisible: item.offsetWidth > 0,
      isSeparator: item.classList.contains('xeditor-toolbar__separator'),
      isLineBreak: item.classList.contains('toolbar-line-break'),
      width: item.offsetWidth,
      text: item.textContent.trim().substring(0, 10)
    }));
    
    return {
      totalItems: items.length,
      visibleItems: items.filter(i => i.offsetWidth > 0).length,
      toolbarWidth: toolbar.offsetWidth,
      toolbarHeight: toolbar.offsetHeight,
      itemTypes
    };
  });
  
  console.log('Toolbar Info:', JSON.stringify(toolbarInfo, null, 2));
  
  await browser.close();
})();