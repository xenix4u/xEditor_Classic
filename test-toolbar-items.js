const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8080', { waitUntil: 'networkidle2' });
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const toolbarInfo = await page.evaluate(() => {
    const toolbar = document.querySelector('#editor1 .xeditor-toolbar');
    const itemsContainer = document.querySelector('#editor1 .xeditor-toolbar__items');
    
    if (!toolbar || !itemsContainer) return { error: 'Toolbar or items container not found' };
    
    const items = Array.from(itemsContainer.children);
    const first10Items = items.slice(0, 10).map((item, index) => ({
      index,
      className: item.className,
      tagName: item.tagName,
      isSeparator: item.classList.contains('xeditor-toolbar__separator'),
      width: item.offsetWidth,
      text: item.textContent.trim().substring(0, 20)
    }));
    
    return {
      toolbarStructure: {
        toolbarClasses: toolbar.className,
        toolbarChildren: Array.from(toolbar.children).map(c => c.className),
      },
      itemsContainerInfo: {
        className: itemsContainer.className,
        width: itemsContainer.offsetWidth,
        height: itemsContainer.offsetHeight,
        display: window.getComputedStyle(itemsContainer).display,
        flexWrap: window.getComputedStyle(itemsContainer).flexWrap,
        totalItems: items.length
      },
      first10Items
    };
  });
  
  console.log('Toolbar Structure:', JSON.stringify(toolbarInfo, null, 2));
  
  await browser.close();
})();