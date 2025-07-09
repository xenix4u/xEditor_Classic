import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface CharCategory {
  name: string;
  chars: Array<{
    char: string;
    name: string;
    code?: string;
  }>;
}

export class SpecialCharsPlugin implements Plugin {
  name = 'special-chars';
  private editor!: Editor;
  private dialog?: HTMLElement;
  private searchInput?: HTMLInputElement;
  
  private categories: CharCategory[] = [
    {
      name: 'Currency',
      chars: [
        { char: '¢', name: 'Cent sign', code: '&cent;' },
        { char: '£', name: 'Pound sign', code: '&pound;' },
        { char: '¤', name: 'Currency sign', code: '&curren;' },
        { char: '¥', name: 'Yen sign', code: '&yen;' },
        { char: '€', name: 'Euro sign', code: '&euro;' },
        { char: '₹', name: 'Indian Rupee', code: '&#8377;' },
        { char: '₽', name: 'Russian Ruble', code: '&#8381;' },
        { char: '₿', name: 'Bitcoin', code: '&#8383;' },
        { char: '$', name: 'Dollar sign', code: '&dollar;' },
        { char: '¢', name: 'Cent', code: '&cent;' },
        { char: '₱', name: 'Peso sign', code: '&#8369;' },
        { char: '₩', name: 'Won sign', code: '&#8361;' },
        { char: '₪', name: 'Shekel sign', code: '&#8362;' },
        { char: '₫', name: 'Dong sign', code: '&#8363;' },
        { char: '₦', name: 'Naira sign', code: '&#8358;' }
      ]
    },
    {
      name: 'Mathematical',
      chars: [
        { char: '±', name: 'Plus-minus sign', code: '&plusmn;' },
        { char: '×', name: 'Multiplication sign', code: '&times;' },
        { char: '÷', name: 'Division sign', code: '&divide;' },
        { char: '≠', name: 'Not equal to', code: '&ne;' },
        { char: '≈', name: 'Almost equal to', code: '&asymp;' },
        { char: '≤', name: 'Less than or equal to', code: '&le;' },
        { char: '≥', name: 'Greater than or equal to', code: '&ge;' },
        { char: '∞', name: 'Infinity', code: '&infin;' },
        { char: '∑', name: 'Summation', code: '&sum;' },
        { char: '∏', name: 'Product', code: '&prod;' },
        { char: '√', name: 'Square root', code: '&radic;' },
        { char: '∫', name: 'Integral', code: '&int;' },
        { char: '∂', name: 'Partial differential', code: '&part;' },
        { char: '∆', name: 'Delta', code: '&Delta;' },
        { char: '∇', name: 'Nabla', code: '&nabla;' },
        { char: '∈', name: 'Element of', code: '&isin;' },
        { char: '∉', name: 'Not an element of', code: '&notin;' },
        { char: '⊂', name: 'Subset of', code: '&sub;' },
        { char: '⊃', name: 'Superset of', code: '&sup;' },
        { char: '∪', name: 'Union', code: '&cup;' },
        { char: '∩', name: 'Intersection', code: '&cap;' },
        { char: '∅', name: 'Empty set', code: '&empty;' }
      ]
    },
    {
      name: 'Greek Letters',
      chars: [
        { char: 'α', name: 'Alpha', code: '&alpha;' },
        { char: 'β', name: 'Beta', code: '&beta;' },
        { char: 'γ', name: 'Gamma', code: '&gamma;' },
        { char: 'δ', name: 'Delta', code: '&delta;' },
        { char: 'ε', name: 'Epsilon', code: '&epsilon;' },
        { char: 'ζ', name: 'Zeta', code: '&zeta;' },
        { char: 'η', name: 'Eta', code: '&eta;' },
        { char: 'θ', name: 'Theta', code: '&theta;' },
        { char: 'λ', name: 'Lambda', code: '&lambda;' },
        { char: 'μ', name: 'Mu', code: '&mu;' },
        { char: 'π', name: 'Pi', code: '&pi;' },
        { char: 'ρ', name: 'Rho', code: '&rho;' },
        { char: 'σ', name: 'Sigma', code: '&sigma;' },
        { char: 'τ', name: 'Tau', code: '&tau;' },
        { char: 'φ', name: 'Phi', code: '&phi;' },
        { char: 'ψ', name: 'Psi', code: '&psi;' },
        { char: 'ω', name: 'Omega', code: '&omega;' },
        { char: 'Ω', name: 'Omega (capital)', code: '&Omega;' }
      ]
    },
    {
      name: 'Arrows',
      chars: [
        { char: '←', name: 'Left arrow', code: '&larr;' },
        { char: '→', name: 'Right arrow', code: '&rarr;' },
        { char: '↑', name: 'Up arrow', code: '&uarr;' },
        { char: '↓', name: 'Down arrow', code: '&darr;' },
        { char: '↔', name: 'Left-right arrow', code: '&harr;' },
        { char: '↕', name: 'Up-down arrow', code: '&#8597;' },
        { char: '⇐', name: 'Left double arrow', code: '&lArr;' },
        { char: '⇒', name: 'Right double arrow', code: '&rArr;' },
        { char: '⇑', name: 'Up double arrow', code: '&uArr;' },
        { char: '⇓', name: 'Down double arrow', code: '&dArr;' },
        { char: '⇔', name: 'Left-right double arrow', code: '&hArr;' },
        { char: '↖', name: 'North-west arrow', code: '&#8598;' },
        { char: '↗', name: 'North-east arrow', code: '&#8599;' },
        { char: '↘', name: 'South-east arrow', code: '&#8600;' },
        { char: '↙', name: 'South-west arrow', code: '&#8601;' }
      ]
    },
    {
      name: 'Punctuation',
      chars: [
        { char: '§', name: 'Section sign', code: '&sect;' },
        { char: '¶', name: 'Paragraph sign', code: '&para;' },
        { char: '†', name: 'Dagger', code: '&dagger;' },
        { char: '‡', name: 'Double dagger', code: '&Dagger;' },
        { char: '•', name: 'Bullet', code: '&bull;' },
        { char: '…', name: 'Horizontal ellipsis', code: '&hellip;' },
        { char: '‰', name: 'Per mille', code: '&permil;' },
        { char: '′', name: 'Prime', code: '&prime;' },
        { char: '″', name: 'Double prime', code: '&Prime;' },
        { char: '‹', name: 'Single left angle quote', code: '&lsaquo;' },
        { char: '›', name: 'Single right angle quote', code: '&rsaquo;' },
        { char: '«', name: 'Left double angle quote', code: '&laquo;' },
        { char: '»', name: 'Right double angle quote', code: '&raquo;' },
        { char: '\u2018', name: 'Left single quote', code: '&lsquo;' },
        { char: '\u2019', name: 'Right single quote', code: '&rsquo;' },
        { char: '\u201C', name: 'Left double quote', code: '&ldquo;' },
        { char: '\u201D', name: 'Right double quote', code: '&rdquo;' },
        { char: '„', name: 'Low double quote', code: '&bdquo;' },
        { char: '–', name: 'En dash', code: '&ndash;' },
        { char: '—', name: 'Em dash', code: '&mdash;' },
        { char: '¡', name: 'Inverted exclamation', code: '&iexcl;' },
        { char: '¿', name: 'Inverted question', code: '&iquest;' }
      ]
    },
    {
      name: 'Symbols',
      chars: [
        { char: '©', name: 'Copyright', code: '&copy;' },
        { char: '®', name: 'Registered trademark', code: '&reg;' },
        { char: '™', name: 'Trademark', code: '&trade;' },
        { char: '℗', name: 'Sound recording copyright', code: '&#8471;' },
        { char: '°', name: 'Degree', code: '&deg;' },
        { char: '¹', name: 'Superscript 1', code: '&sup1;' },
        { char: '²', name: 'Superscript 2', code: '&sup2;' },
        { char: '³', name: 'Superscript 3', code: '&sup3;' },
        { char: '¼', name: 'One quarter', code: '&frac14;' },
        { char: '½', name: 'One half', code: '&frac12;' },
        { char: '¾', name: 'Three quarters', code: '&frac34;' },
        { char: '⅓', name: 'One third', code: '&#8531;' },
        { char: '⅔', name: 'Two thirds', code: '&#8532;' },
        { char: '⅛', name: 'One eighth', code: '&#8539;' },
        { char: '⅜', name: 'Three eighths', code: '&#8540;' },
        { char: '⅝', name: 'Five eighths', code: '&#8541;' },
        { char: '⅞', name: 'Seven eighths', code: '&#8542;' },
        { char: '№', name: 'Numero sign', code: '&#8470;' },
        { char: '℃', name: 'Celsius', code: '&#8451;' },
        { char: '℉', name: 'Fahrenheit', code: '&#8457;' },
        { char: '♠', name: 'Spade suit', code: '&spades;' },
        { char: '♣', name: 'Club suit', code: '&clubs;' },
        { char: '♥', name: 'Heart suit', code: '&hearts;' },
        { char: '♦', name: 'Diamond suit', code: '&diams;' },
        { char: '♪', name: 'Eighth note', code: '&#9834;' },
        { char: '♫', name: 'Beamed eighth notes', code: '&#9835;' }
      ]
    },
    {
      name: 'Latin Extended',
      chars: [
        { char: 'À', name: 'A grave', code: '&Agrave;' },
        { char: 'Á', name: 'A acute', code: '&Aacute;' },
        { char: 'Â', name: 'A circumflex', code: '&Acirc;' },
        { char: 'Ã', name: 'A tilde', code: '&Atilde;' },
        { char: 'Ä', name: 'A diaeresis', code: '&Auml;' },
        { char: 'Å', name: 'A ring', code: '&Aring;' },
        { char: 'Æ', name: 'AE ligature', code: '&AElig;' },
        { char: 'Ç', name: 'C cedilla', code: '&Ccedil;' },
        { char: 'È', name: 'E grave', code: '&Egrave;' },
        { char: 'É', name: 'E acute', code: '&Eacute;' },
        { char: 'Ê', name: 'E circumflex', code: '&Ecirc;' },
        { char: 'Ë', name: 'E diaeresis', code: '&Euml;' },
        { char: 'Ì', name: 'I grave', code: '&Igrave;' },
        { char: 'Í', name: 'I acute', code: '&Iacute;' },
        { char: 'Î', name: 'I circumflex', code: '&Icirc;' },
        { char: 'Ï', name: 'I diaeresis', code: '&Iuml;' },
        { char: 'Ñ', name: 'N tilde', code: '&Ntilde;' },
        { char: 'Ò', name: 'O grave', code: '&Ograve;' },
        { char: 'Ó', name: 'O acute', code: '&Oacute;' },
        { char: 'Ô', name: 'O circumflex', code: '&Ocirc;' },
        { char: 'Õ', name: 'O tilde', code: '&Otilde;' },
        { char: 'Ö', name: 'O diaeresis', code: '&Ouml;' },
        { char: 'Ø', name: 'O stroke', code: '&Oslash;' },
        { char: 'Ù', name: 'U grave', code: '&Ugrave;' },
        { char: 'Ú', name: 'U acute', code: '&Uacute;' },
        { char: 'Û', name: 'U circumflex', code: '&Ucirc;' },
        { char: 'Ü', name: 'U diaeresis', code: '&Uuml;' },
        { char: 'Ý', name: 'Y acute', code: '&Yacute;' },
        { char: 'ß', name: 'German sharp s', code: '&szlig;' },
        { char: 'Œ', name: 'OE ligature', code: '&OElig;' }
      ]
    }
  ];

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showCharPicker = this.showCharPicker.bind(this);
    
    // Register command
    this.editor.commands.register('insertSpecialChar', {
      execute: (char: string) => this.insertChar(char)
    });
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
  }

  private showCharPicker(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
    
    this.dialog = this.createCharDialog();
    document.body.appendChild(this.dialog);
    
    // Focus search input
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }

  private createCharDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-specialchar-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-specialchar-dialog'
    });

    // Header
    const header = createElement('div', {
      className: 'xeditor-specialchar-header'
    });

    const title = createElement('h3', {}, ['Insert Special Character']);

    const closeBtn = createElement('button', {
      className: 'xeditor-specialchar-close',
      type: 'button',
      'aria-label': 'Close'
    }, ['×']);

    closeBtn.addEventListener('click', () => {
      overlay.remove();
    });

    header.appendChild(title);
    header.appendChild(closeBtn);

    // Search
    const searchContainer = createElement('div', {
      className: 'xeditor-specialchar-search'
    });

    this.searchInput = createElement('input', {
      type: 'text',
      placeholder: 'Search characters...',
      className: 'xeditor-specialchar-search-input'
    }) as HTMLInputElement;

    this.searchInput.addEventListener('input', () => {
      this.filterChars();
    });

    searchContainer.appendChild(this.searchInput);

    // Content
    const content = createElement('div', {
      className: 'xeditor-specialchar-content'
    });

    this.categories.forEach((category, index) => {
      const section = createElement('div', {
        className: 'xeditor-specialchar-section',
        'data-category': String(index)
      });

      const sectionTitle = createElement('h4', {
        className: 'xeditor-specialchar-section-title'
      }, [category.name]);

      const grid = createElement('div', {
        className: 'xeditor-specialchar-grid'
      });

      category.chars.forEach(charInfo => {
        const charBtn = createElement('button', {
          className: 'xeditor-specialchar-btn',
          type: 'button',
          title: `${charInfo.name}${charInfo.code ? ' (' + charInfo.code + ')' : ''}`,
          'data-char': charInfo.char,
          'data-name': charInfo.name.toLowerCase()
        }, [charInfo.char]);

        charBtn.addEventListener('click', () => {
          this.insertChar(charInfo.char);
          overlay.remove();
        });

        grid.appendChild(charBtn);
      });

      section.appendChild(sectionTitle);
      section.appendChild(grid);
      content.appendChild(section);
    });

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(searchContainer);
    dialog.appendChild(content);

    overlay.appendChild(dialog);

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });

    // Close on escape
    overlay.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        overlay.remove();
      }
    });

    return overlay;
  }

  private insertChar(char: string): void {
    this.editor.execCommand('insertHTML', char);
  }

  private filterChars(): void {
    const query = this.searchInput!.value.toLowerCase();
    const sections = document.querySelectorAll('.xeditor-specialchar-section');
    
    if (!query) {
      sections.forEach(section => {
        (section as HTMLElement).style.display = 'block';
        const buttons = section.querySelectorAll('.xeditor-specialchar-btn');
        buttons.forEach(btn => {
          (btn as HTMLElement).style.display = 'inline-flex';
        });
      });
      return;
    }

    sections.forEach(section => {
      const buttons = section.querySelectorAll('.xeditor-specialchar-btn');
      let hasVisibleChars = false;

      buttons.forEach(btn => {
        const char = btn.getAttribute('data-char')!;
        const name = btn.getAttribute('data-name')!;
        const title = btn.getAttribute('title')!.toLowerCase();
        
        if (char.includes(query) || name.includes(query) || title.includes(query)) {
          (btn as HTMLElement).style.display = 'inline-flex';
          hasVisibleChars = true;
        } else {
          (btn as HTMLElement).style.display = 'none';
        }
      });

      (section as HTMLElement).style.display = hasVisibleChars ? 'block' : 'none';
    });
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-specialchar-overlay {
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
      
      .xeditor-specialchar-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 500px;
        max-width: 90vw;
        height: 600px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      
      .xeditor-specialchar-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-specialchar-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .xeditor-specialchar-close {
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
      
      .xeditor-specialchar-close:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-specialchar-search {
        padding: 12px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-specialchar-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .xeditor-specialchar-search-input:focus {
        outline: none;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-specialchar-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .xeditor-specialchar-section {
        margin-bottom: 24px;
      }
      
      .xeditor-specialchar-section-title {
        font-size: 14px;
        color: #666;
        margin: 0 0 12px 0;
        font-weight: 600;
      }
      
      .xeditor-specialchar-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(48px, 1fr));
        gap: 4px;
      }
      
      .xeditor-specialchar-btn {
        background: none;
        border: 1px solid #e0e0e0;
        font-size: 20px;
        width: 48px;
        height: 48px;
        cursor: pointer;
        border-radius: 4px;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      }
      
      .xeditor-specialchar-btn:hover {
        background-color: #f0f0f0;
        border-color: var(--xeditor-primary);
        transform: scale(1.1);
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-specialchar-dialog {
        background: #2d2d2d;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-specialchar-header,
      [data-theme="dark"] .xeditor-specialchar-search {
        border-color: #444;
      }
      
      [data-theme="dark"] .xeditor-specialchar-search-input {
        background: #3d3d3d;
        border-color: #555;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-specialchar-close:hover {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-specialchar-section-title {
        color: #aaa;
      }
      
      [data-theme="dark"] .xeditor-specialchar-btn {
        border-color: #555;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-specialchar-btn:hover {
        background-color: #444;
        border-color: var(--xeditor-primary);
      }
    `;
    
    document.head.appendChild(style);
  }
}