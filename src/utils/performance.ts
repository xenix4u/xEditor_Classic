/**
 * Debounce function to limit the rate of function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      func.apply(context, args);
    }, wait);
  };
}

/**
 * Throttle function to limit function calls to at most once per interval
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean = false;
  
  return function(this: any, ...args: Parameters<T>) {
    const context = this;
    
    if (!inThrottle) {
      func.apply(context, args);
      inThrottle = true;
      
      setTimeout(() => {
        inThrottle = false;
      }, limit);
    }
  };
}

/**
 * Request idle callback with fallback
 */
export function requestIdleCallback(
  callback: () => void,
  options?: { timeout?: number }
): void {
  if ('requestIdleCallback' in window) {
    (window as any).requestIdleCallback(callback, options);
  } else {
    // Fallback for browsers that don't support requestIdleCallback
    setTimeout(callback, 0);
  }
}

/**
 * Create a virtual scrolling container for large content
 */
export class VirtualScroller {
  private container: HTMLElement;
  private itemHeight: number;
  private items: any[];
  private visibleItems: number;
  private scrollTop: number = 0;
  private renderCallback: (item: any, index: number) => HTMLElement;

  constructor(
    container: HTMLElement,
    items: any[],
    itemHeight: number,
    renderCallback: (item: any, index: number) => HTMLElement
  ) {
    this.container = container;
    this.items = items;
    this.itemHeight = itemHeight;
    this.renderCallback = renderCallback;
    
    const containerHeight = container.clientHeight;
    this.visibleItems = Math.ceil(containerHeight / itemHeight) + 1;
    
    this.init();
  }

  private init(): void {
    // Create virtual height
    const totalHeight = this.items.length * this.itemHeight;
    const spacer = document.createElement('div');
    spacer.style.height = `${totalHeight}px`;
    spacer.style.position = 'relative';
    
    this.container.appendChild(spacer);
    
    // Handle scroll
    this.container.addEventListener('scroll', throttle(() => {
      this.scrollTop = this.container.scrollTop;
      this.render();
    }, 50));
    
    // Initial render
    this.render();
  }

  private render(): void {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(
      startIndex + this.visibleItems,
      this.items.length
    );
    
    // Clear previous items
    const spacer = this.container.firstElementChild as HTMLElement;
    while (spacer.firstChild) {
      spacer.removeChild(spacer.firstChild);
    }
    
    // Render visible items
    for (let i = startIndex; i < endIndex; i++) {
      const item = this.renderCallback(this.items[i], i);
      item.style.position = 'absolute';
      item.style.top = `${i * this.itemHeight}px`;
      item.style.left = '0';
      item.style.right = '0';
      spacer.appendChild(item);
    }
  }

  updateItems(items: any[]): void {
    this.items = items;
    const totalHeight = this.items.length * this.itemHeight;
    const spacer = this.container.firstElementChild as HTMLElement;
    spacer.style.height = `${totalHeight}px`;
    this.render();
  }
}

/**
 * Lazy load images
 */
export class LazyImageLoader {
  private observer: IntersectionObserver;

  constructor() {
    this.observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            const src = img.getAttribute('data-src');
            
            if (src) {
              img.src = src;
              img.removeAttribute('data-src');
              this.observer.unobserve(img);
            }
          }
        });
      },
      {
        rootMargin: '50px'
      }
    );
  }

  observe(img: HTMLImageElement): void {
    if (img.getAttribute('data-src')) {
      this.observer.observe(img);
    }
  }

  disconnect(): void {
    this.observer.disconnect();
  }
}

/**
 * Memory-efficient DOM manipulation
 */
export class DOMBatch {
  private operations: (() => void)[] = [];
  private scheduled: boolean = false;

  add(operation: () => void): void {
    this.operations.push(operation);
    
    if (!this.scheduled) {
      this.scheduled = true;
      requestAnimationFrame(() => this.flush());
    }
  }

  private flush(): void {
    const operations = this.operations.slice();
    this.operations = [];
    this.scheduled = false;
    
    operations.forEach(op => op());
  }
}

/**
 * Content chunking for large documents
 */
export function chunkContent(content: string, chunkSize: number = 50000): string[] {
  const chunks: string[] = [];
  
  for (let i = 0; i < content.length; i += chunkSize) {
    chunks.push(content.slice(i, i + chunkSize));
  }
  
  return chunks;
}

/**
 * Optimize large content handling
 */
export function optimizeContent(content: string): string {
  // Remove excessive whitespace
  content = content.replace(/\s+/g, ' ');
  
  // Remove empty attributes
  content = content.replace(/\s+(?:class|style|id)=""/g, '');
  
  // Remove comments
  content = content.replace(/<!--[\s\S]*?-->/g, '');
  
  return content.trim();
}