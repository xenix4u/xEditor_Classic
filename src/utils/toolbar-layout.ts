/**
 * Toolbar layout utilities
 */

export interface ToolbarGroup {
  name: string;
  items: (string | { name: string; priority?: 'high' | 'medium' | 'low' })[];
}

export const defaultToolbarGroups: ToolbarGroup[] = [
  {
    name: 'text-format',
    items: ['bold', 'italic', 'underline', 'strikethrough']
  },
  {
    name: 'font',
    items: ['fontFamily', 'fontSize']
  },
  {
    name: 'color',
    items: ['textColor', 'backgroundColor']
  },
  {
    name: 'align',
    items: ['alignLeft', 'alignCenter', 'alignRight', 'alignJustify']
  },
  {
    name: 'list',
    items: ['orderedList', 'unorderedList', 'checklist', 'indent', 'outdent']
  },
  {
    name: 'block',
    items: ['heading', 'paragraph', 'blockquote']
  },
  {
    name: 'insert',
    items: ['link', 'image', 'video', 'table', 'code', 'horizontalRule']
  },
  {
    name: 'special',
    items: ['emoji', 'specialChars', 'formElements', 'fileManager']
  },
  {
    name: 'tools',
    items: ['findReplace', 'comments', 'track-changes']
  },
  {
    name: 'history',
    items: ['undo', 'redo']
  },
  {
    name: 'view',
    items: ['markdown', 'statistics', 'sourceCode', 'fullscreen', 'print']
  }
];

/**
 * Convert flat toolbar items to grouped layout
 */
export function groupToolbarItems(items: string[]): string[] {
  const grouped: string[] = [];
  const itemSet = new Set(items);
  const processedItems = new Set<string>();

  // Process each group
  for (const group of defaultToolbarGroups) {
    const groupItems: string[] = [];
    
    // Find items that belong to this group
    for (const item of group.items) {
      const itemName = typeof item === 'string' ? item : item.name;
      if (itemSet.has(itemName) && !processedItems.has(itemName)) {
        groupItems.push(itemName);
        processedItems.add(itemName);
      }
    }
    
    // Add group items with separator
    if (groupItems.length > 0) {
      grouped.push(...groupItems, '|');
    }
  }
  
  // Add any remaining items that weren't in groups
  for (const item of items) {
    if (!processedItems.has(item) && item !== '|') {
      grouped.push(item);
    }
  }
  
  // Remove trailing separator
  if (grouped[grouped.length - 1] === '|') {
    grouped.pop();
  }
  
  return grouped;
}

/**
 * Create a multi-row toolbar layout
 */
export function createMultiRowLayout(items: string[], maxItemsPerRow: number = 15): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let itemCount = 0;
  
  for (const item of items) {
    if (item === '|') {
      currentRow.push(item);
      // Start new row after major groups
      if (itemCount > maxItemsPerRow) {
        rows.push(currentRow);
        currentRow = [];
        itemCount = 0;
      }
    } else {
      currentRow.push(item);
      itemCount++;
      
      if (itemCount >= maxItemsPerRow) {
        // Find the last separator and break there
        const lastSeparatorIndex = currentRow.lastIndexOf('|');
        if (lastSeparatorIndex > 0) {
          const nextRow = currentRow.splice(lastSeparatorIndex + 1);
          rows.push(currentRow);
          currentRow = nextRow;
          itemCount = nextRow.length;
        }
      }
    }
  }
  
  if (currentRow.length > 0) {
    rows.push(currentRow);
  }
  
  return rows;
}

/**
 * Get responsive toolbar configuration
 */
export function getResponsiveToolbar(screenWidth: number): string[] {
  if (screenWidth < 600) {
    // Mobile: Essential tools only
    return [
      'bold', 'italic', 'underline', '|',
      'heading', '|',
      'orderedList', 'unorderedList', '|',
      'link', 'image', '|',
      'undo', 'redo'
    ];
  } else if (screenWidth < 900) {
    // Tablet: Common tools
    return [
      'bold', 'italic', 'underline', '|',
      'heading', 'paragraph', '|',
      'alignLeft', 'alignCenter', 'alignRight', '|',
      'orderedList', 'unorderedList', '|',
      'link', 'image', 'table', '|',
      'undo', 'redo', '|',
      'sourceCode', 'fullscreen'
    ];
  } else {
    // Desktop: All tools
    return defaultToolbarGroups.flatMap(group => 
      [...group.items.map(item => typeof item === 'string' ? item : item.name), '|']
    ).slice(0, -1); // Remove last separator
  }
}