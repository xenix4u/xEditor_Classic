import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface FormElementConfig {
  enabledElements?: string[];
  defaultStyles?: boolean;
}

export class FormElementsPlugin implements Plugin {
  name = 'form-elements';
  private editor!: Editor;
  private config: FormElementConfig;
  private dialog?: HTMLElement;

  toolbar: ToolbarItem[] = [];

  constructor(config: FormElementConfig = {}) {
    this.config = {
      enabledElements: config.enabledElements || [
        'button', 'input', 'textarea', 'select', 'checkbox', 'radio'
      ],
      defaultStyles: config.defaultStyles !== false,
      ...config
    };
  }

  init(editor: Editor): void {
    this.editor = editor;
    
    console.log('FormElementsPlugin initialized with editor:', editor);
    
    // Make methods available
    (this as any).showFormElementsDialog = this.showFormElementsDialog.bind(this);
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
  }

  private showFormElementsDialog(): void {
    console.log('showFormElementsDialog called');
    
    if (this.dialog) {
      this.dialog.remove();
    }
    
    this.dialog = this.createDialog();
    document.body.appendChild(this.dialog);
    
    console.log('Form elements dialog created and appended to body');
  }

  private createDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-formelements-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-formelements-dialog'
    });

    // Header
    const header = createElement('div', {
      className: 'xeditor-formelements-header'
    });

    const title = createElement('h3', {}, ['Insert Form Element']);

    const closeBtn = createElement('button', {
      className: 'xeditor-formelements-close',
      type: 'button',
      'aria-label': 'Close'
    }, ['×']);

    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Content
    const content = createElement('div', {
      className: 'xeditor-formelements-content'
    });

    // Element type selector
    const typeSection = createElement('div', {
      className: 'xeditor-formelements-section'
    });

    const typeLabel = createElement('label', {}, ['Element Type:']);
    const typeSelect = createElement('select', {
      className: 'xeditor-formelements-select'
    }) as HTMLSelectElement;

    const elementTypes = [
      { value: 'button', label: 'Button' },
      { value: 'input', label: 'Text Input' },
      { value: 'textarea', label: 'Textarea' },
      { value: 'select', label: 'Dropdown' },
      { value: 'checkbox', label: 'Checkbox' },
      { value: 'radio', label: 'Radio Button' },
      { value: 'email', label: 'Email Input' },
      { value: 'number', label: 'Number Input' },
      { value: 'date', label: 'Date Picker' },
      { value: 'range', label: 'Range Slider' },
      { value: 'color', label: 'Color Picker' },
      { value: 'file', label: 'File Upload' }
    ];

    elementTypes.forEach((type, index) => {
      // Check if this element type is enabled
      const isEnabled = this.config.enabledElements?.includes(type.value) || 
                       this.config.enabledElements?.includes('input') ||
                       !this.config.enabledElements; // If no specific config, enable all
      
      if (isEnabled) {
        const option = createElement('option', {
          value: type.value
        }, [type.label]);
        
        // Set button as default (first option)
        if (index === 0) {
          (option as HTMLOptionElement).selected = true;
        }
        
        typeSelect.appendChild(option);
      }
    });

    typeSection.appendChild(typeLabel);
    typeSection.appendChild(typeSelect);
    content.appendChild(typeSection);

    // Properties container
    const propertiesContainer = createElement('div', {
      className: 'xeditor-formelements-properties'
    });

    // Update properties when type changes
    typeSelect.addEventListener('change', () => {
      this.updateProperties(propertiesContainer, typeSelect.value);
      // Update preview immediately when type changes
      setTimeout(() => {
        this.updatePreview(
          previewContainer,
          typeSelect.value,
          this.getPropertiesValues(propertiesContainer)
        );
      }, 10); // Small delay to ensure properties are updated first
    });

    // Initialize with first type
    this.updateProperties(propertiesContainer, typeSelect.value);
    
    content.appendChild(propertiesContainer);

    // Preview
    const previewSection = createElement('div', {
      className: 'xeditor-formelements-preview-section'
    });

    const previewLabel = createElement('h4', {}, ['Preview:']);
    const previewContainer = createElement('div', {
      className: 'xeditor-formelements-preview'
    });

    previewSection.appendChild(previewLabel);
    previewSection.appendChild(previewContainer);
    content.appendChild(previewSection);

    // Footer
    const footer = createElement('div', {
      className: 'xeditor-formelements-footer'
    });

    const cancelBtn = createElement('button', {
      className: 'xeditor-formelements-btn xeditor-formelements-btn--secondary',
      type: 'button'
    }, ['Cancel']);

    const insertBtn = createElement('button', {
      className: 'xeditor-formelements-btn xeditor-formelements-btn--primary',
      type: 'button'
    }, ['Insert']);

    cancelBtn.addEventListener('click', () => {
      overlay.remove();
    });

    insertBtn.addEventListener('click', () => {
      const properties = this.getPropertiesValues(propertiesContainer);
      const html = this.generateFormElement(typeSelect.value, properties);
      
      console.log('Form Element Properties:', properties);
      console.log('Generated HTML:', html);
      console.log('Editor content before:', this.editor.contentElement.innerHTML);
      
      // Focus the editor first
      this.editor.focus();
      
      try {
        this.editor.execCommand('insertHTML', html);
        console.log('insertHTML command executed successfully');
        console.log('Editor content after:', this.editor.contentElement.innerHTML);
      } catch (error) {
        console.error('insertHTML command failed:', error);
      }
      
      overlay.remove();
    });

    footer.appendChild(cancelBtn);
    footer.appendChild(insertBtn);

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(content);
    dialog.appendChild(footer);

    overlay.appendChild(dialog);

    // Update preview on property change
    propertiesContainer.addEventListener('input', () => {
      this.updatePreview(
        previewContainer,
        typeSelect.value,
        this.getPropertiesValues(propertiesContainer)
      );
    });
    
    // Also update preview on change events (for dropdowns and checkboxes)
    propertiesContainer.addEventListener('change', () => {
      this.updatePreview(
        previewContainer,
        typeSelect.value,
        this.getPropertiesValues(propertiesContainer)
      );
    });

    // Initial preview - add slight delay to ensure DOM is ready
    setTimeout(() => {
      this.updatePreview(
        previewContainer,
        typeSelect.value,
        this.getPropertiesValues(propertiesContainer)
      );
    }, 50);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    return overlay;
  }

  private updateProperties(container: HTMLElement, elementType: string): void {
    container.innerHTML = '';

    const properties = this.getPropertiesForType(elementType);
    
    properties.forEach(prop => {
      const propertyField = this.createPropertyField(prop);
      container.appendChild(propertyField);
    });
    
    // Add event listeners to new property fields for preview updates
    const inputs = container.querySelectorAll('input, select, textarea');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        // Trigger preview update - this will be handled by the parent container listeners
        const event = new Event('input', { bubbles: true });
        container.dispatchEvent(event);
      });
      input.addEventListener('change', () => {
        // Trigger preview update - this will be handled by the parent container listeners
        const event = new Event('change', { bubbles: true });
        container.dispatchEvent(event);
      });
    });
  }

  private getPropertiesForType(elementType: string): Array<{
    name: string;
    label: string;
    type: string;
    defaultValue?: string;
    options?: string[];
  }> {
    const commonProps = [
      { name: 'id', label: 'ID', type: 'text' },
      { name: 'name', label: 'Name', type: 'text' },
      { name: 'className', label: 'CSS Class', type: 'text' }
    ];

    const specificProps: Record<string, any[]> = {
      button: [
        { name: 'text', label: 'Button Text', type: 'text', defaultValue: 'Click Me' },
        { name: 'type', label: 'Button Type', type: 'select', 
          options: ['button', 'submit', 'reset'], defaultValue: 'button' },
        { name: 'variant', label: 'Style Variant', type: 'select',
          options: ['primary', 'secondary', 'success', 'danger', 'warning'], defaultValue: 'primary' }
      ],
      input: [
        { name: 'placeholder', label: 'Placeholder', type: 'text' },
        { name: 'value', label: 'Default Value', type: 'text' },
        { name: 'required', label: 'Required', type: 'checkbox' }
      ],
      textarea: [
        { name: 'placeholder', label: 'Placeholder', type: 'text' },
        { name: 'rows', label: 'Rows', type: 'number', defaultValue: '4' },
        { name: 'cols', label: 'Columns', type: 'number', defaultValue: '50' }
      ],
      select: [
        { name: 'options', label: 'Options (one per line)', type: 'textarea',
          defaultValue: 'Option 1\nOption 2\nOption 3' },
        { name: 'multiple', label: 'Multiple Selection', type: 'checkbox' }
      ],
      checkbox: [
        { name: 'label', label: 'Label Text', type: 'text', defaultValue: 'Check me' },
        { name: 'checked', label: 'Checked by Default', type: 'checkbox' }
      ],
      radio: [
        { name: 'label', label: 'Label Text', type: 'text', defaultValue: 'Select me' },
        { name: 'value', label: 'Value', type: 'text' },
        { name: 'checked', label: 'Checked by Default', type: 'checkbox' }
      ],
      email: [
        { name: 'placeholder', label: 'Placeholder', type: 'text', defaultValue: 'email@example.com' },
        { name: 'required', label: 'Required', type: 'checkbox' }
      ],
      number: [
        { name: 'placeholder', label: 'Placeholder', type: 'text' },
        { name: 'min', label: 'Minimum', type: 'number' },
        { name: 'max', label: 'Maximum', type: 'number' },
        { name: 'step', label: 'Step', type: 'number', defaultValue: '1' }
      ],
      date: [
        { name: 'min', label: 'Minimum Date', type: 'date' },
        { name: 'max', label: 'Maximum Date', type: 'date' }
      ],
      range: [
        { name: 'min', label: 'Minimum', type: 'number', defaultValue: '0' },
        { name: 'max', label: 'Maximum', type: 'number', defaultValue: '100' },
        { name: 'step', label: 'Step', type: 'number', defaultValue: '1' },
        { name: 'value', label: 'Default Value', type: 'number', defaultValue: '50' }
      ],
      color: [
        { name: 'value', label: 'Default Color', type: 'color', defaultValue: '#000000' }
      ],
      file: [
        { name: 'accept', label: 'Accept File Types', type: 'text', defaultValue: 'image/*' },
        { name: 'multiple', label: 'Multiple Files', type: 'checkbox' }
      ]
    };

    return [...commonProps, ...(specificProps[elementType] || [])];
  }

  private createPropertyField(property: any): HTMLElement {
    const field = createElement('div', {
      className: 'xeditor-formelements-field'
    });

    const label = createElement('label', {}, [property.label + ':']);
    field.appendChild(label);

    let input: HTMLElement;

    switch (property.type) {
      case 'select':
        input = createElement('select', {
          className: 'xeditor-formelements-input',
          name: property.name
        }) as HTMLSelectElement;
        
        property.options.forEach((opt: string) => {
          const option = createElement('option', {
            value: opt
          }, [opt]);
          if (opt === property.defaultValue) {
            (option as HTMLOptionElement).selected = true;
          }
          input.appendChild(option);
        });
        break;

      case 'textarea':
        input = createElement('textarea', {
          className: 'xeditor-formelements-input',
          name: property.name,
          rows: '3'
        }) as HTMLTextAreaElement;
        if (property.defaultValue) {
          (input as HTMLTextAreaElement).value = property.defaultValue;
        }
        break;

      case 'checkbox':
        input = createElement('input', {
          type: 'checkbox',
          name: property.name,
          className: 'xeditor-formelements-checkbox'
        }) as HTMLInputElement;
        break;

      default:
        input = createElement('input', {
          type: property.type,
          className: 'xeditor-formelements-input',
          name: property.name,
          value: property.defaultValue || ''
        }) as HTMLInputElement;
    }

    field.appendChild(input);
    return field;
  }

  private getPropertiesValues(container: HTMLElement): Record<string, any> {
    const values: Record<string, any> = {};
    
    container.querySelectorAll('input, select, textarea').forEach(element => {
      const el = element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      const name = el.name;
      
      if (el.type === 'checkbox') {
        values[name] = (el as HTMLInputElement).checked;
      } else {
        values[name] = el.value;
      }
    });

    return values;
  }

  private updatePreview(container: HTMLElement, elementType: string, properties: Record<string, any>): void {
    const html = this.generateFormElement(elementType, properties, true);
    console.log('Preview HTML for', elementType, ':', html);
    container.innerHTML = html;
  }

  private generateFormElement(elementType: string, properties: Record<string, any>, _isPreview = false): string {
    const id = properties.id || '';
    const name = properties.name || '';
    const className = properties.className || '';
    
    const baseAttrs = [
      id ? `id="${id}"` : '',
      name ? `name="${name}"` : '',
      className ? `class="${className}"` : ''
    ].filter(Boolean).join(' ');

    switch (elementType) {
      case 'button':
        const btnClass = this.config.defaultStyles ? 
          `xeditor-btn xeditor-btn--${properties.variant || 'primary'} ${className}`.trim() : 
          className;
        const buttonAttrs = [
          `type="${properties.type || 'button'}"`,
          id ? `id="${id}"` : '',
          btnClass ? `class="${btnClass}"` : ''
        ].filter(Boolean).join(' ');
        return `<button ${buttonAttrs}>${properties.text || 'Button'}</button>`;

      case 'checkbox':
      case 'radio':
        const inputId = id || `form-${elementType}-${Date.now()}`;
        return `
          <div class="xeditor-form-group">
            <input type="${elementType}" id="${inputId}" ${name ? `name="${name}"` : ''} ${properties.value ? `value="${properties.value}"` : ''} ${properties.checked ? 'checked' : ''}>
            <label for="${inputId}">${properties.label || 'Label'}</label>
          </div>
        `;

      case 'select':
        const options = (properties.options || '').split('\n').filter((o: string) => o.trim());
        return `
          <select ${baseAttrs} ${properties.multiple ? 'multiple' : ''}>
            ${options.map((opt: string) => `<option value="${opt}">${opt}</option>`).join('')}
          </select>
        `;

      case 'textarea':
        return `<textarea ${baseAttrs} placeholder="${properties.placeholder || ''}" rows="${properties.rows || 4}" cols="${properties.cols || 50}"></textarea>`;

      case 'email':
      case 'number':
      case 'date':
      case 'range':
      case 'color':
      case 'file':
        const inputAttrs = this.getInputAttributes(elementType, properties);
        return `<input type="${elementType}" ${baseAttrs} ${inputAttrs}>`;

      default: // text input
        return `<input type="text" ${baseAttrs} placeholder="${properties.placeholder || ''}" value="${properties.value || ''}" ${properties.required ? 'required' : ''}>`;
    }
  }

  private getInputAttributes(type: string, properties: Record<string, any>): string {
    const attrs: string[] = [];

    switch (type) {
      case 'email':
        if (properties.placeholder) attrs.push(`placeholder="${properties.placeholder}"`);
        if (properties.required) attrs.push('required');
        break;
        
      case 'number':
      case 'range':
        if (properties.placeholder) attrs.push(`placeholder="${properties.placeholder}"`);
        if (properties.min !== undefined) attrs.push(`min="${properties.min}"`);
        if (properties.max !== undefined) attrs.push(`max="${properties.max}"`);
        if (properties.step) attrs.push(`step="${properties.step}"`);
        if (properties.value) attrs.push(`value="${properties.value}"`);
        break;
        
      case 'date':
        if (properties.min) attrs.push(`min="${properties.min}"`);
        if (properties.max) attrs.push(`max="${properties.max}"`);
        break;
        
      case 'color':
        if (properties.value) attrs.push(`value="${properties.value}"`);
        break;
        
      case 'file':
        if (properties.accept) attrs.push(`accept="${properties.accept}"`);
        if (properties.multiple) attrs.push('multiple');
        break;
    }

    return attrs.join(' ');
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-formelements-overlay {
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
      
      .xeditor-formelements-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90vw;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      
      .xeditor-formelements-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-formelements-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .xeditor-formelements-close {
        background: none;
        border: none;
        font-size: 24px;
        cursor: pointer;
        padding: 0;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 4px;
        transition: background-color 0.2s;
      }
      
      .xeditor-formelements-close:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-formelements-content {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }
      
      .xeditor-formelements-section {
        margin-bottom: 20px;
      }
      
      .xeditor-formelements-section label {
        display: block;
        margin-bottom: 8px;
        font-weight: 500;
      }
      
      .xeditor-formelements-select,
      .xeditor-formelements-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .xeditor-formelements-field {
        margin-bottom: 16px;
      }
      
      .xeditor-formelements-field label {
        display: block;
        margin-bottom: 4px;
        font-size: 14px;
        color: #555;
      }
      
      .xeditor-formelements-checkbox {
        margin-right: 8px;
      }
      
      .xeditor-formelements-preview-section {
        margin-top: 20px;
        padding-top: 20px;
        border-top: 1px solid #e0e0e0;
      }
      
      .xeditor-formelements-preview-section h4 {
        margin: 0 0 12px 0;
        font-size: 16px;
      }
      
      .xeditor-formelements-preview {
        padding: 16px;
        background-color: #f8f9fa;
        border: 1px solid #e0e0e0;
        border-radius: 4px;
        min-height: 60px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .xeditor-formelements-footer {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        padding: 16px 20px;
        border-top: 1px solid #e0e0e0;
      }
      
      .xeditor-formelements-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
      }
      
      .xeditor-formelements-btn--primary {
        background-color: var(--xeditor-primary);
        color: white;
      }
      
      .xeditor-formelements-btn--primary:hover {
        background-color: var(--xeditor-primary-hover);
      }
      
      .xeditor-formelements-btn--secondary {
        background-color: #e9ecef;
        color: #333;
      }
      
      .xeditor-formelements-btn--secondary:hover {
        background-color: #dee2e6;
      }
      
      /* Default form element styles */
      .xeditor-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.2s;
        display: inline-block;
      }
      
      .xeditor-btn--primary {
        background-color: #007bff;
        color: white;
      }
      
      .xeditor-btn--primary:hover {
        background-color: #0069d9;
      }
      
      .xeditor-btn--secondary {
        background-color: #6c757d;
        color: white;
      }
      
      .xeditor-btn--secondary:hover {
        background-color: #5a6268;
      }
      
      .xeditor-btn--success {
        background-color: #28a745;
        color: white;
      }
      
      .xeditor-btn--success:hover {
        background-color: #218838;
      }
      
      .xeditor-btn--danger {
        background-color: #dc3545;
        color: white;
      }
      
      .xeditor-btn--danger:hover {
        background-color: #c82333;
      }
      
      .xeditor-btn--warning {
        background-color: #ffc107;
        color: #212529;
      }
      
      .xeditor-btn--warning:hover {
        background-color: #e0a800;
      }
      
      .xeditor-form-group {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-formelements-dialog {
        background: #2d2d2d;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-formelements-header,
      [data-theme="dark"] .xeditor-formelements-preview-section,
      [data-theme="dark"] .xeditor-formelements-footer {
        border-color: #444;
      }
      
      [data-theme="dark"] .xeditor-formelements-close:hover {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-formelements-select,
      [data-theme="dark"] .xeditor-formelements-input {
        background: #3d3d3d;
        border-color: #555;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-formelements-preview {
        background-color: #3d3d3d;
        border-color: #555;
      }
      
      [data-theme="dark"] .xeditor-formelements-field label {
        color: #aaa;
      }
    `;
    
    document.head.appendChild(style);
  }
}