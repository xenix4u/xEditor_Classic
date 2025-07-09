import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement, addClass, removeClass } from '../../utils/dom';

interface TableConfig {
  defaultRows?: number;
  defaultCols?: number;
  maxRows?: number;
  maxCols?: number;
  cellMinWidth?: number;
  showBorders?: boolean;
  defaultCellPadding?: string;
  defaultBorderColor?: string;
}

export class TablePlugin implements Plugin {
  name = 'table';
  private editor!: Editor;
  private config: TableConfig;
  private selectedTable: HTMLTableElement | null = null;
  private selectedCell: HTMLTableCellElement | null = null;
  private contextMenu: HTMLElement | null = null;

  toolbar: ToolbarItem[] = [];

  constructor(config: TableConfig = {}) {
    this.config = {
      defaultRows: config.defaultRows || 3,
      defaultCols: config.defaultCols || 3,
      maxRows: config.maxRows || 20,
      maxCols: config.maxCols || 20,
      cellMinWidth: config.cellMinWidth || 100,
      showBorders: config.showBorders !== false,
      defaultCellPadding: config.defaultCellPadding || '8px',
      defaultBorderColor: config.defaultBorderColor || '#ddd'
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showTableDialog = this.showTableDialog.bind(this);
    
    // Register commands
    this.registerCommands();
    
    // Add event listeners
    this.editor.contentElement.addEventListener('click', this.handleClick);
    this.editor.contentElement.addEventListener('contextmenu', this.handleContextMenu);
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    this.editor.contentElement.removeEventListener('click', this.handleClick);
    this.editor.contentElement.removeEventListener('contextmenu', this.handleContextMenu);
    this.removeContextMenu();
  }

  private registerCommands(): void {
    this.editor.commands.register('insertTable', {
      execute: (value?: any) => {
        if (Array.isArray(value) && value.length === 2) {
          this.insertTable(value[0], value[1]);
        } else {
          this.insertTable(this.config.defaultRows!, this.config.defaultCols!);
        }
      }
    });

    this.editor.commands.register('addRowAbove', {
      execute: () => this.addRow('above')
    });

    this.editor.commands.register('addRowBelow', {
      execute: () => this.addRow('below')
    });

    this.editor.commands.register('addColumnLeft', {
      execute: () => this.addColumn('left')
    });

    this.editor.commands.register('addColumnRight', {
      execute: () => this.addColumn('right')
    });

    this.editor.commands.register('deleteRow', {
      execute: () => this.deleteRow()
    });

    this.editor.commands.register('deleteColumn', {
      execute: () => this.deleteColumn()
    });

    this.editor.commands.register('deleteTable', {
      execute: () => this.deleteTable()
    });

    this.editor.commands.register('mergeCells', {
      execute: () => this.mergeCells()
    });

    this.editor.commands.register('splitCell', {
      execute: () => this.splitCell()
    });

    this.editor.commands.register('alignTable', {
      execute: (align: string) => this.alignTable(align)
    });

    this.editor.commands.register('setCellBackground', {
      execute: (color: string) => this.setCellBackground(color)
    });
  }

  private showTableDialog(): void {
    const dialog = this.createTableDialog();
    document.body.appendChild(dialog);
  }

  private createTableDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-table-dialog-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-table-dialog'
    });

    const title = createElement('h3', {}, ['Insert Table']);

    // Table preview
    const preview = createElement('div', {
      className: 'xeditor-table-preview'
    });

    const previewTable = createElement('table', {
      className: 'xeditor-table-preview-table'
    }) as HTMLTableElement;

    preview.appendChild(previewTable);

    const gridContainer = createElement('div', {
      className: 'xeditor-table-grid-container'
    });

    const grid = createElement('div', {
      className: 'xeditor-table-grid'
    });

    const sizeLabel = createElement('div', {
      className: 'xeditor-table-size-label'
    }, ['0 × 0']);

    // Create grid cells
    for (let row = 0; row < 10; row++) {
      for (let col = 0; col < 10; col++) {
        const cell = createElement('div', {
          className: 'xeditor-table-grid-cell',
          'data-row': String(row),
          'data-col': String(col)
        });

        cell.addEventListener('mouseenter', () => {
          this.highlightGridCells(grid, row, col);
          sizeLabel.textContent = `${col + 1} × ${row + 1}`;
          this.updateTablePreview(previewTable, row + 1, col + 1);
        });

        cell.addEventListener('click', () => {
          this.editor.selection.restore();
          this.insertTable(row + 1, col + 1, {
            borders: borderCheckbox.checked,
            header: headerCheckbox.checked
          });
          document.body.removeChild(overlay);
        });

        grid.appendChild(cell);
      }
    }

    grid.addEventListener('mouseleave', () => {
      this.highlightGridCells(grid, -1, -1);
      sizeLabel.textContent = '0 × 0';
      this.updateTablePreview(previewTable, 0, 0);
    });

    // Table options section - removed unused variable

    // Style options
    const styleOptions = createElement('div', {
      className: 'xeditor-table-style-options'
    });

    const borderCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'table-border',
      checked: 'checked'
    }) as HTMLInputElement;

    const borderLabel = createElement('label', {
      htmlFor: 'table-border'
    }, ['Show borders']);

    const headerCheckbox = createElement('input', {
      type: 'checkbox',
      id: 'table-header'
    }) as HTMLInputElement;

    const headerLabel = createElement('label', {
      htmlFor: 'table-header'
    }, ['First row as header']);

    styleOptions.appendChild(borderCheckbox);
    styleOptions.appendChild(borderLabel);
    styleOptions.appendChild(headerCheckbox);
    styleOptions.appendChild(headerLabel);

    // Custom size inputs
    const customSize = createElement('div', {
      className: 'xeditor-table-custom-size'
    });

    const rowInput = createElement('input', {
      type: 'number',
      min: '1',
      max: String(this.config.maxRows),
      value: String(this.config.defaultRows),
      placeholder: 'Rows'
    }) as HTMLInputElement;

    const colInput = createElement('input', {
      type: 'number',
      min: '1',
      max: String(this.config.maxCols),
      value: String(this.config.defaultCols),
      placeholder: 'Columns'
    }) as HTMLInputElement;

    const insertBtn = createElement('button', {
      className: 'xeditor-table-insert-btn'
    }, ['Insert']);

    insertBtn.addEventListener('click', () => {
      const rows = parseInt(rowInput.value) || this.config.defaultRows!;
      const cols = parseInt(colInput.value) || this.config.defaultCols!;
      
      this.editor.selection.restore();
      this.insertTable(rows, cols, {
        borders: borderCheckbox.checked,
        header: headerCheckbox.checked
      });
      document.body.removeChild(overlay);
    });

    customSize.appendChild(rowInput);
    customSize.appendChild(createElement('span', {}, [' × ']));
    customSize.appendChild(colInput);
    customSize.appendChild(insertBtn);

    const closeBtn = createElement('button', {
      className: 'xeditor-table-dialog-close',
      type: 'button'
    }, ['×']);

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(overlay);
    });

    gridContainer.appendChild(grid);
    gridContainer.appendChild(sizeLabel);

    dialog.appendChild(closeBtn);
    dialog.appendChild(title);
    dialog.appendChild(preview);
    dialog.appendChild(gridContainer);
    dialog.appendChild(styleOptions);
    dialog.appendChild(customSize);

    overlay.appendChild(dialog);

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        document.body.removeChild(overlay);
      }
    });

    return overlay;
  }

  private highlightGridCells(grid: HTMLElement, maxRow: number, maxCol: number): void {
    const cells = grid.querySelectorAll('.xeditor-table-grid-cell');
    
    cells.forEach(cell => {
      const row = parseInt(cell.getAttribute('data-row')!);
      const col = parseInt(cell.getAttribute('data-col')!);
      
      if (row <= maxRow && col <= maxCol) {
        addClass(cell as HTMLElement, 'highlighted');
      } else {
        removeClass(cell as HTMLElement, 'highlighted');
      }
    });
  }

  private updateTablePreview(previewTable: HTMLTableElement, rows: number, cols: number): void {
    previewTable.innerHTML = '';
    
    if (rows === 0 || cols === 0) return;
    
    const tbody = createElement('tbody');
    
    for (let r = 0; r < Math.min(rows, 5); r++) {
      const tr = createElement('tr');
      
      for (let c = 0; c < Math.min(cols, 5); c++) {
        const td = createElement('td');
        tr.appendChild(td);
      }
      
      tbody.appendChild(tr);
    }
    
    previewTable.appendChild(tbody);
  }

  private insertTable(rows: number, cols: number, options?: { borders?: boolean; header?: boolean }): void {
    const table = createElement('table', {
      className: options?.borders !== false ? 'xeditor-table' : 'xeditor-table xeditor-table-no-border'
    }) as HTMLTableElement;

    // Create header if requested
    if (options?.header) {
      const thead = createElement('thead');
      const headerRow = createElement('tr');
      
      for (let c = 0; c < cols; c++) {
        const th = createElement('th');
        th.innerHTML = `Header ${c + 1}`;
        headerRow.appendChild(th);
      }
      
      thead.appendChild(headerRow);
      table.appendChild(thead);
      rows--; // Decrease body rows by 1
    }

    const tbody = createElement('tbody');

    for (let r = 0; r < rows; r++) {
      const tr = createElement('tr');
      
      for (let c = 0; c < cols; c++) {
        const td = createElement('td');
        td.innerHTML = '<br>'; // Ensure cell has content
        tr.appendChild(td);
      }
      
      tbody.appendChild(tr);
    }

    table.appendChild(tbody);

    // Insert at current position
    this.editor.focus();
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      range.deleteContents();
      
      // Insert table
      range.insertNode(table);
      
      // Add line break after table
      const br = document.createElement('br');
      range.setStartAfter(table);
      range.insertNode(br);
      
      // Move cursor after table
      range.setStartAfter(br);
      range.collapse(true);
      selection.removeAllRanges();
      selection.addRange(range);
    }

    this.editor.history.record();
  }

  private handleClick = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    
    // Find if we clicked on a table element
    const cell = target.closest('td, th');
    const table = target.closest('table');
    
    if (cell && table && table.classList.contains('xeditor-table')) {
      this.selectCell(cell as HTMLTableCellElement);
      this.selectedTable = table as HTMLTableElement;
    } else {
      this.deselectCell();
      this.selectedTable = null;
    }
  };

  private handleContextMenu = (e: MouseEvent): void => {
    const target = e.target as HTMLElement;
    const cell = target.closest('td, th');
    const table = target.closest('table');
    
    if (cell && table && table.classList.contains('xeditor-table')) {
      e.preventDefault();
      this.selectedCell = cell as HTMLTableCellElement;
      this.selectedTable = table as HTMLTableElement;
      this.showContextMenu(e.clientX, e.clientY);
    }
  };

  private selectCell(cell: HTMLTableCellElement): void {
    this.deselectCell();
    this.selectedCell = cell;
    addClass(cell, 'xeditor-table-cell-selected');
  }

  private deselectCell(): void {
    if (this.selectedCell) {
      removeClass(this.selectedCell, 'xeditor-table-cell-selected');
      this.selectedCell = null;
    }
  }

  private showContextMenu(x: number, y: number): void {
    this.removeContextMenu();
    
    const menu = createElement('div', {
      className: 'xeditor-table-context-menu'
    });

    const menuItems = [
      { text: 'Add Row Above', action: () => this.addRow('above') },
      { text: 'Add Row Below', action: () => this.addRow('below') },
      { text: 'Add Column Left', action: () => this.addColumn('left') },
      { text: 'Add Column Right', action: () => this.addColumn('right') },
      { type: 'separator' },
      { text: 'Delete Row', action: () => this.deleteRow() },
      { text: 'Delete Column', action: () => this.deleteColumn() },
      { text: 'Delete Table', action: () => this.deleteTable() },
      { type: 'separator' },
      { text: 'Merge Cells', action: () => this.mergeCells() },
      { text: 'Split Cell', action: () => this.splitCell() },
      { type: 'separator' },
      { text: 'Align Left', action: () => this.alignTable('left') },
      { text: 'Align Center', action: () => this.alignTable('center') },
      { text: 'Align Right', action: () => this.alignTable('right') },
      { type: 'separator' },
      { text: 'Cell Background', action: () => this.showCellColorPicker() }
    ];

    menuItems.forEach(item => {
      if (item.type === 'separator') {
        menu.appendChild(createElement('div', {
          className: 'xeditor-table-context-menu-separator'
        }));
      } else {
        const menuItem = createElement('div', {
          className: 'xeditor-table-context-menu-item'
        }, [item.text!]);

        menuItem.addEventListener('click', () => {
          item.action!();
          this.removeContextMenu();
        });

        menu.appendChild(menuItem);
      }
    });

    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;

    document.body.appendChild(menu);
    this.contextMenu = menu;

    // Close menu on click outside
    setTimeout(() => {
      document.addEventListener('click', this.handleOutsideClick);
    }, 0);
  }

  private removeContextMenu(): void {
    if (this.contextMenu) {
      this.contextMenu.remove();
      this.contextMenu = null;
      document.removeEventListener('click', this.handleOutsideClick);
    }
  }

  private handleOutsideClick = (): void => {
    this.removeContextMenu();
  };

  private addRow(position: 'above' | 'below'): void {
    if (!this.selectedCell || !this.selectedTable) return;

    const row = this.selectedCell.parentElement as HTMLTableRowElement;
    const newRow = createElement('tr') as HTMLTableRowElement;
    const cellCount = row.cells.length;

    for (let i = 0; i < cellCount; i++) {
      const cell = createElement('td');
      cell.innerHTML = '<br>';
      newRow.appendChild(cell);
    }

    if (position === 'above') {
      row.parentNode!.insertBefore(newRow, row);
    } else {
      row.parentNode!.insertBefore(newRow, row.nextSibling);
    }

    this.editor.history.record();
  }

  private addColumn(position: 'left' | 'right'): void {
    if (!this.selectedCell || !this.selectedTable) return;

    const cellIndex = this.selectedCell.cellIndex;
    const rows = this.selectedTable.rows;

    for (let i = 0; i < rows.length; i++) {
      const newCell = createElement('td');
      newCell.innerHTML = '<br>';
      
      if (position === 'left') {
        rows[i].insertBefore(newCell, rows[i].cells[cellIndex]);
      } else {
        rows[i].insertBefore(newCell, rows[i].cells[cellIndex + 1] || null);
      }
    }

    this.editor.history.record();
  }

  private deleteRow(): void {
    if (!this.selectedCell || !this.selectedTable) return;

    const row = this.selectedCell.parentElement as HTMLTableRowElement;
    
    // Don't delete if it's the last row
    if (this.selectedTable.rows.length > 1) {
      row.remove();
      this.editor.history.record();
    }
  }

  private deleteColumn(): void {
    if (!this.selectedCell || !this.selectedTable) return;

    const cellIndex = this.selectedCell.cellIndex;
    const rows = this.selectedTable.rows;
    
    // Don't delete if it's the last column
    if (rows[0].cells.length > 1) {
      for (let i = 0; i < rows.length; i++) {
        rows[i].deleteCell(cellIndex);
      }
      this.editor.history.record();
    }
  }

  private deleteTable(): void {
    if (!this.selectedTable) return;

    this.selectedTable.remove();
    this.selectedTable = null;
    this.selectedCell = null;
    this.editor.history.record();
  }

  private mergeCells(): void {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);
    const cells = this.getSelectedCells(range);
    
    if (cells.length < 2) {
      alert('Please select at least 2 cells to merge.');
      return;
    }

    // Check if cells form a rectangle
    if (!this.isValidCellSelection(cells)) {
      alert('Selected cells must form a rectangle.');
      return;
    }

    // Calculate rowspan and colspan
    const minRow = Math.min(...cells.map(c => (c.parentElement as HTMLTableRowElement).rowIndex));
    const maxRow = Math.max(...cells.map(c => (c.parentElement as HTMLTableRowElement).rowIndex));
    const minCol = Math.min(...cells.map(c => this.getCellRealIndex(c)));
    const maxCol = Math.max(...cells.map(c => this.getCellRealIndex(c) + (c.colSpan || 1) - 1));

    const rowspan = maxRow - minRow + 1;
    const colspan = maxCol - minCol + 1;

    // Keep the top-left cell and remove others
    const keepCell = cells.find(c => 
      (c.parentElement as HTMLTableRowElement).rowIndex === minRow && 
      this.getCellRealIndex(c) === minCol
    );

    if (!keepCell) return;

    // Combine content
    const content = cells
      .filter(c => c.textContent?.trim())
      .map(c => c.innerHTML)
      .join('<br>');
    keepCell.innerHTML = content || '<br>';
    keepCell.rowSpan = rowspan;
    keepCell.colSpan = colspan;
    keepCell.style.verticalAlign = 'top';

    // Remove other cells
    cells.forEach(cell => {
      if (cell !== keepCell) {
        cell.remove();
      }
    });

    // Select the merged cell
    const newRange = document.createRange();
    newRange.selectNodeContents(keepCell);
    selection.removeAllRanges();
    selection.addRange(newRange);

    this.editor.history.record();
  }

  private splitCell(): void {
    if (!this.selectedCell) {
      alert('Please select a cell to split.');
      return;
    }

    const rowspan = this.selectedCell.rowSpan || 1;
    const colspan = this.selectedCell.colSpan || 1;

    if (rowspan === 1 && colspan === 1) {
      alert('This cell is not merged and cannot be split.');
      return;
    }

    // Save content
    const content = this.selectedCell.innerHTML;

    // Reset spans
    this.selectedCell.rowSpan = 1;
    this.selectedCell.colSpan = 1;

    // Add cells to fill the space
    const row = this.selectedCell.parentElement as HTMLTableRowElement;
    const rowIndex = row.rowIndex;
    const cellRealIndex = this.getCellRealIndex(this.selectedCell);

    // Add cells in the same row
    for (let c = 1; c < colspan; c++) {
      const newCell = createElement('td') as HTMLTableCellElement;
      newCell.innerHTML = '<br>';
      this.insertCellAtIndex(row, newCell, cellRealIndex + c);
    }

    // Add cells in subsequent rows
    const table = this.getTableFromCell(this.selectedCell);
    for (let r = 1; r < rowspan; r++) {
      const targetRow = table.rows[rowIndex + r];
      if (targetRow) {
        for (let c = 0; c < colspan; c++) {
          const newCell = createElement('td') as HTMLTableCellElement;
          newCell.innerHTML = '<br>';
          this.insertCellAtIndex(targetRow, newCell, cellRealIndex + c);
        }
      }
    }

    // Keep content in the original cell
    this.selectedCell.innerHTML = content;

    this.editor.history.record();
  }

  private getSelectedCells(range: Range): HTMLTableCellElement[] {
    const cells: HTMLTableCellElement[] = [];
    const container = range.commonAncestorContainer;
    
    const table = (container.nodeType === Node.TEXT_NODE ? 
      container.parentElement : container as HTMLElement)?.closest('table');
      
    if (!table) return cells;

    // Get all cells that are at least partially selected
    const allCells = table.querySelectorAll('td, th');
    allCells.forEach(cell => {
      if (range.intersectsNode(cell) || this.isNodeInRange(cell, range)) {
        cells.push(cell as HTMLTableCellElement);
      }
    });

    return cells;
  }

  private isNodeInRange(node: Node, range: Range): boolean {
    const nodeRange = document.createRange();
    nodeRange.selectNode(node);
    
    return range.compareBoundaryPoints(Range.START_TO_END, nodeRange) >= 0 &&
           range.compareBoundaryPoints(Range.END_TO_START, nodeRange) <= 0;
  }

  private isValidCellSelection(cells: HTMLTableCellElement[]): boolean {
    if (cells.length < 2) return false;

    const rows = new Set<number>();
    const cols = new Set<number>();

    cells.forEach(cell => {
      const row = (cell.parentElement as HTMLTableRowElement).rowIndex;
      const col = this.getCellRealIndex(cell);
      
      for (let r = 0; r < (cell.rowSpan || 1); r++) {
        for (let c = 0; c < (cell.colSpan || 1); c++) {
          rows.add(row + r);
          cols.add(col + c);
        }
      }
    });

    const minRow = Math.min(...rows);
    const maxRow = Math.max(...rows);
    const minCol = Math.min(...cols);
    const maxCol = Math.max(...cols);

    // Check if selection forms a rectangle
    const expectedCellCount = (maxRow - minRow + 1) * (maxCol - minCol + 1);
    return rows.size * cols.size === expectedCellCount;
  }

  private getCellRealIndex(cell: HTMLTableCellElement): number {
    const row = cell.parentElement as HTMLTableRowElement;
    let index = 0;
    
    for (let i = 0; i < row.cells.length; i++) {
      if (row.cells[i] === cell) {
        return index;
      }
      index += row.cells[i].colSpan || 1;
    }
    
    return index;
  }

  private insertCellAtIndex(row: HTMLTableRowElement, cell: HTMLTableCellElement, index: number): void {
    let currentIndex = 0;
    let insertBefore: HTMLTableCellElement | null = null;
    
    for (let i = 0; i < row.cells.length; i++) {
      if (currentIndex >= index) {
        insertBefore = row.cells[i];
        break;
      }
      currentIndex += row.cells[i].colSpan || 1;
    }
    
    row.insertBefore(cell, insertBefore);
  }

  private getTableFromCell(cell: HTMLTableCellElement): HTMLTableElement {
    return cell.closest('table') as HTMLTableElement;
  }

  private alignTable(align: string): void {
    if (!this.selectedTable) return;
    
    this.selectedTable.style.marginLeft = align === 'left' ? '0' : 'auto';
    this.selectedTable.style.marginRight = align === 'right' ? '0' : 'auto';
    
    this.editor.history.record();
  }

  private setCellBackground(color: string): void {
    if (!this.selectedCell) return;
    
    this.selectedCell.style.backgroundColor = color;
    this.editor.history.record();
  }

  private showCellColorPicker(): void {
    if (!this.selectedCell) return;
    
    const colorPicker = this.createColorPicker((color: string) => {
      this.setCellBackground(color);
    });
    
    // Position near the cell
    const rect = this.selectedCell.getBoundingClientRect();
    colorPicker.style.position = 'fixed';
    colorPicker.style.left = `${rect.left}px`;
    colorPicker.style.top = `${rect.bottom + 5}px`;
    
    document.body.appendChild(colorPicker);
  }

  private createColorPicker(onSelect: (color: string) => void): HTMLElement {
    const picker = createElement('div', {
      className: 'xeditor-table-color-picker'
    });
    
    const colors = [
      '#ffffff', '#f8f9fa', '#e9ecef', '#dee2e6', '#ced4da', '#adb5bd',
      '#ff6b6b', '#f06595', '#cc5de8', '#845ef7', '#5c7cfa', '#339af0',
      '#22b8cf', '#20c997', '#51cf66', '#94d82d', '#ffd43b', '#ff922b',
      '#495057', '#343a40', '#212529', '#ff0000', '#00ff00', '#0000ff'
    ];
    
    colors.forEach(color => {
      const colorBtn = createElement('button', {
        className: 'xeditor-table-color-btn',
        style: `background-color: ${color}`
      });
      
      colorBtn.addEventListener('click', () => {
        onSelect(color);
        picker.remove();
      });
      
      picker.appendChild(colorBtn);
    });
    
    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeColorPicker(e) {
        if (!picker.contains(e.target as Node)) {
          picker.remove();
          document.removeEventListener('click', closeColorPicker);
        }
      });
    }, 0);
    
    return picker;
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-table {
        border-collapse: collapse;
        width: 100%;
        margin: 10px 0;
      }
      
      .xeditor-table td,
      .xeditor-table th {
        border: 1px solid var(--xeditor-border);
        padding: ${this.config.defaultCellPadding};
        min-width: ${this.config.cellMinWidth}px;
        position: relative;
        transition: background-color 0.2s;
      }
      
      .xeditor-table th {
        background-color: #f8f9fa;
        font-weight: bold;
        text-align: left;
      }
      
      .xeditor-table-no-border,
      .xeditor-table-no-border td,
      .xeditor-table-no-border th {
        border: none;
      }
      
      .xeditor-table-cell-selected {
        background-color: rgba(0, 123, 255, 0.1);
        outline: 2px solid var(--xeditor-primary);
      }
      
      /* Table dialog styles */
      .xeditor-table-dialog-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
      }
      
      .xeditor-table-dialog {
        position: relative;
        background-color: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        padding: 20px;
        width: 400px;
        max-width: 90vw;
      }
      
      .xeditor-table-dialog h3 {
        margin: 0 0 20px 0;
      }
      
      .xeditor-table-dialog-close {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        color: #666;
      }
      
      .xeditor-table-grid-container {
        margin-bottom: 20px;
      }
      
      .xeditor-table-grid {
        display: grid;
        grid-template-columns: repeat(10, 30px);
        gap: 1px;
        margin-bottom: 10px;
        background-color: #ddd;
        border: 1px solid #ddd;
        padding: 1px;
      }
      
      .xeditor-table-grid-cell {
        width: 30px;
        height: 25px;
        background-color: white;
        cursor: pointer;
        transition: all 0.1s;
        position: relative;
      }
      
      .xeditor-table-grid-cell:hover {
        background-color: #e3f2fd;
      }
      
      .xeditor-table-grid-cell.highlighted {
        background-color: #2196f3;
      }
      
      .xeditor-table-size-label {
        text-align: center;
        font-size: 14px;
        color: #666;
        margin-top: 5px;
        font-weight: 500;
      }
      
      .xeditor-table-custom-size {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 10px;
        margin-top: 20px;
      }
      
      .xeditor-table-custom-size input {
        width: 80px;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        text-align: center;
      }
      
      .xeditor-table-custom-size input:focus {
        outline: none;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-table-insert-btn {
        padding: 10px 24px;
        background-color: #2196f3;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: background-color 0.2s;
      }
      
      .xeditor-table-insert-btn:hover {
        background-color: #1976d2;
      }
      
      /* Context menu styles */
      .xeditor-table-context-menu {
        position: fixed;
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        padding: 4px 0;
        z-index: 10001;
        min-width: 150px;
      }
      
      .xeditor-table-context-menu-item {
        padding: 8px 16px;
        cursor: pointer;
        font-size: 14px;
      }
      
      .xeditor-table-context-menu-item:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-table-context-menu-separator {
        height: 1px;
        background-color: #ddd;
        margin: 4px 0;
      }
      
      /* Table preview */
      .xeditor-table-preview {
        margin-bottom: 20px;
        padding: 20px;
        background-color: #fafafa;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        min-height: 120px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .xeditor-table-preview-table {
        border-collapse: collapse;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      }
      
      .xeditor-table-preview-table td {
        width: 40px;
        height: 25px;
        border: 1px solid #e0e0e0;
        background-color: white;
      }
      
      /* Style options */
      .xeditor-table-style-options {
        display: flex;
        gap: 30px;
        margin-bottom: 20px;
        padding: 15px;
        background-color: #f5f5f5;
        border-radius: 4px;
        font-size: 14px;
      }
      
      .xeditor-table-style-options label {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        user-select: none;
      }
      
      .xeditor-table-style-options input[type="checkbox"] {
        width: 16px;
        height: 16px;
        cursor: pointer;
      }
      
      /* Color picker */
      .xeditor-table-color-picker {
        background-color: white;
        border: 1px solid #ddd;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
        padding: 8px;
        display: grid;
        grid-template-columns: repeat(6, 24px);
        gap: 4px;
        z-index: 10002;
      }
      
      .xeditor-table-color-btn {
        width: 24px;
        height: 24px;
        border: 1px solid #ddd;
        border-radius: 2px;
        cursor: pointer;
        transition: transform 0.1s;
      }
      
      .xeditor-table-color-btn:hover {
        transform: scale(1.1);
        border-color: #333;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-table-dialog {
        background-color: #343a40;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-table-dialog-close {
        color: #adb5bd;
      }
      
      [data-theme="dark"] .xeditor-table-grid {
        background-color: #495057;
        border-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-grid-cell {
        background-color: #343a40;
      }
      
      [data-theme="dark"] .xeditor-table-grid-cell:hover {
        background-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-grid-cell.highlighted {
        background-color: #0d6efd;
      }
      
      [data-theme="dark"] .xeditor-table-custom-size input {
        background-color: #495057;
        color: #f8f9fa;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-table-context-menu {
        background-color: #343a40;
        border-color: #495057;
        color: #f8f9fa;
      }
      
      [data-theme="dark"] .xeditor-table-context-menu-item:hover {
        background-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-context-menu-separator {
        background-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-preview {
        background-color: #2d333b;
        border-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-style-options {
        background-color: #2d333b;
      }
      
      [data-theme="dark"] .xeditor-table-preview-table td {
        background-color: #495057;
        border-color: #6c757d;
      }
      
      [data-theme="dark"] .xeditor-table th {
        background-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-color-picker {
        background-color: #343a40;
        border-color: #495057;
      }
      
      [data-theme="dark"] .xeditor-table-color-btn {
        border-color: #6c757d;
      }
    `;
    
    document.head.appendChild(style);
  }
}