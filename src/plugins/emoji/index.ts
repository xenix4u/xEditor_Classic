import { Plugin, Editor, ToolbarItem } from '../../types';
import { createElement } from '../../utils/dom';

interface EmojiCategory {
  name: string;
  icon: string;
  emojis: string[];
}

export class EmojiPlugin implements Plugin {
  name = 'emoji';
  private editor!: Editor;
  private dialog?: HTMLElement;
  private searchInput?: HTMLInputElement;
  
  private categories: EmojiCategory[] = [
    {
      name: 'Smileys & Emotion',
      icon: '😀',
      emojis: ['😀', '😃', '😄', '😁', '😆', '😅', '🤣', '😂', '🙂', '🙃', '😉', '😊', '😇', '🥰', '😍', '🤩', '😘', '😗', '☺️', '😚', '😙', '😋', '😛', '😜', '🤪', '😝', '🤑', '🤗', '🤭', '🤫', '🤔', '🤐', '🤨', '😐', '😑', '😶', '😏', '😒', '🙄', '😬', '🤥', '😌', '😔', '😪', '🤤', '😴', '😷', '🤒', '🤕', '🤢', '🤮', '🤧', '🥵', '🥶', '🥴', '😵', '🤯', '🤠', '🥳', '😎', '🤓', '🧐', '😕', '😟', '🙁', '☹️', '😮', '😯', '😲', '😳', '🥺', '😦', '😧', '😨', '😰', '😥', '😢', '😭', '😱', '😖', '😣', '😞', '😓', '😩', '😫', '🥱', '😤', '😡', '😠', '🤬', '😈', '👿', '💀', '☠️', '💩', '🤡', '👹', '👺', '👻', '👽', '👾', '🤖']
    },
    {
      name: 'People & Body',
      icon: '👋',
      emojis: ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💅', '🤳', '💪', '🦾', '🦵', '🦿', '🦶', '👂', '🦻', '👃', '🧠', '🦷', '🦴', '👀', '👁️', '👅', '👄', '💋', '🩸']
    },
    {
      name: 'Animals & Nature',
      icon: '🐶',
      emojis: ['🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐽', '🐸', '🐵', '🙈', '🙉', '🙊', '🐒', '🐔', '🐧', '🐦', '🐤', '🐣', '🐥', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🦗', '🕷️', '🕸️', '🦂', '🐢', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🦧', '🐘', '🦛', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🦙', '🐐', '🦌', '🐕', '🐩', '🦮', '🐕‍🦺', '🐈', '🐓', '🦃', '🦚', '🦜', '🦢', '🦩', '🕊️', '🐇', '🦝', '🦨', '🦡', '🦦', '🦥', '🐁', '🐀', '🐿️', '🦔']
    },
    {
      name: 'Food & Drink',
      icon: '🍎',
      emojis: ['🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🥭', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥬', '🥒', '🌶️', '🌽', '🥕', '🧄', '🧅', '🥔', '🍠', '🥐', '🥖', '🍞', '🥨', '🥯', '🧇', '🧆', '🥙', '🥚', '🍳', '🥘', '🍲', '🥣', '🥗', '🍿', '🧈', '🧂', '🥫', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍠', '🍢', '🍣', '🍤', '🍥', '🥮', '🍡', '🥟', '🥠', '🥡', '🦪', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '🍼', '🥛', '☕', '🍵', '🧉', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🧊', '🍾', '🥤', '🧋', '🧃']
    },
    {
      name: 'Activities',
      icon: '⚽',
      emojis: ['⚽', '🏀', '🏈', '⚾', '🥎', '🎾', '🏐', '🏉', '🥏', '🎱', '🪀', '🏓', '🏸', '🏒', '🏑', '🥍', '🏏', '🥅', '⛳', '🪁', '🏹', '🎣', '🤿', '🥊', '🥋', '🎽', '🛹', '🛷', '⛸️', '🥌', '🎿', '⛷️', '🏂', '🪂', '🏋️', '🤼', '🤸', '🤺', '🤾', '🏌️', '🏇', '🧘', '🏄', '🏊', '🤽', '🚣', '🧗', '🚵', '🚴', '🏆', '🥇', '🥈', '🥉', '🏅', '🎖️', '🏵️', '🎗️', '🎫', '🎟️', '🎪', '🤹', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎹', '🥁', '🎷', '🎺', '🎸', '🪕', '🎻', '🎲', '🎯', '🎳', '🎮', '🎰', '🧩']
    },
    {
      name: 'Travel & Places',
      icon: '🚗',
      emojis: ['🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🦯', '🦽', '🦼', '🛴', '🚲', '🛵', '🏍️', '🛺', '🚨', '🚔', '🚍', '🚘', '🚖', '🚡', '🚠', '🚟', '🚃', '🚋', '🚞', '🚝', '🚄', '🚅', '🚈', '🚂', '🚆', '🚇', '🚊', '🚉', '✈️', '🛫', '🛬', '🛩️', '💺', '🛰️', '🚀', '🛸', '🚁', '🛶', '⛵', '🚤', '🛥️', '🛳️', '⚓', '⛽', '🚧', '🚦', '🚥', '🚏', '🗺️', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️', '🎡', '🎢', '🎠', '⛲', '⛱️', '🏖️', '🏝️', '🏜️', '🌋', '⛰️', '🏔️', '🗻', '🏕️', '⛺', '🏠', '🏡', '🏘️', '🏚️', '🏗️', '🏭', '🏢', '🏬', '🏣', '🏤', '🏥', '🏦', '🏨', '🏪', '🏫', '🏩', '💒', '🏛️', '⛪', '🕌', '🕍', '🛕', '🕋', '⛩️', '🛤️', '🛣️', '🗾', '🎑', '🏞️', '🌅', '🌄', '🌠', '🎇', '🎆', '🌇', '🌆', '🏙️', '🌃', '🌌', '🌉', '🌁']
    },
    {
      name: 'Objects',
      icon: '💡',
      emojis: ['⌚', '📱', '📲', '💻', '⌨️', '🖥️', '🖨️', '🖱️', '🖲️', '🕹️', '🗜️', '💽', '💾', '💿', '📀', '📼', '📷', '📸', '📹', '🎥', '📽️', '🎞️', '📞', '☎️', '📟', '📠', '📺', '📻', '🎙️', '🎚️', '🎛️', '🧭', '⏱️', '⏲️', '⏰', '🕰️', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯️', '🪔', '🧯', '🛢️', '💸', '💵', '💴', '💶', '💷', '💰', '💳', '💎', '⚖️', '🧰', '🔧', '🔨', '⚒️', '🛠️', '⛏️', '🔩', '⚙️', '🧱', '⛓️', '🧲', '🔫', '💣', '🧨', '🪓', '🔪', '🗡️', '⚔️', '🛡️', '🚬', '⚰️', '⚱️', '🏺', '🔮', '📿', '🧿', '💈', '⚗️', '🔭', '🔬', '🕳️', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡️', '🧹', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪒', '🧽', '🧴', '🛎️', '🔑', '🗝️', '🚪', '🪑', '🛋️', '🛏️', '🛌', '🧸', '🖼️', '🛍️', '🛒', '🎁', '🎈', '🎏', '🎀', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉️', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷️', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒️', '🗓️', '📆', '📅', '🗑️', '📇', '🗃️', '🗳️', '🗄️', '📋', '📁', '📂', '🗂️', '🗞️', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇️', '📐', '📏', '🧮', '📌', '📍', '✂️', '🖊️', '🖋️', '✒️', '🖌️', '🖍️', '📝', '✏️', '🔍', '🔎', '🔏', '🔐', '🔒', '🔓']
    },
    {
      name: 'Symbols',
      icon: '❤️',
      emojis: ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮️', '✝️', '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '☦️', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛️', '🉑', '☢️', '☣️', '📴', '📳', '🈶', '🈚', '🈸', '🈺', '🈷️', '✴️', '🆚', '💮', '🉐', '㊙️', '㊗️', '🈴', '🈵', '🈹', '🈲', '🅰️', '🅱️', '🆎', '🆑', '🅾️', '🆘', '❌', '⭕', '🛑', '⛔', '📛', '🚫', '💯', '💢', '♨️', '🚷', '🚯', '🚳', '🚱', '🔞', '📵', '🚭', '❗', '❕', '❓', '❔', '‼️', '⁉️', '🔅', '🔆', '〽️', '⚠️', '🚸', '🔱', '⚜️', '🔰', '♻️', '✅', '🈯', '💹', '❇️', '✳️', '❎', '🌐', '💠', 'Ⓜ️', '🌀', '💤', '🏧', '🚾', '♿', '🅿️', '🈳', '🈂️', '🛂', '🛃', '🛄', '🛅', '🚹', '🚺', '🚼', '🚻', '🚮', '🎦', '📶', '🈁', '🔣', 'ℹ️', '🔤', '🔡', '🔠', '🆖', '🆗', '🆙', '🆒', '🆕', '🆓', '0️⃣', '1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟', '🔢', '#️⃣', '*️⃣', '⏏️', '▶️', '⏸️', '⏯️', '⏹️', '⏺️', '⏭️', '⏮️', '⏩', '⏪', '⏫', '⏬', '◀️', '🔼', '🔽', '➡️', '⬅️', '⬆️', '⬇️', '↗️', '↘️', '↙️', '↖️', '↕️', '↔️', '↪️', '↩️', '⤴️', '⤵️', '🔀', '🔁', '🔂', '🔄', '🔃', '🎵', '🎶', '➕', '➖', '➗', '✖️', '♾️', '💲', '💱', '™️', '©️', '®️', '〰️', '➰', '➿', '🔚', '🔙', '🔛', '🔝', '🔜', '✔️', '☑️', '🔘', '🔴', '🟠', '🟡', '🟢', '🔵', '🟣', '⚫', '⚪', '🟤', '🔺', '🔻', '🔸', '🔹', '🔶', '🔷', '🔳', '🔲', '▪️', '▫️', '◾', '◽', '◼️', '◻️', '🟥', '🟧', '🟨', '🟩', '🟦', '🟪', '⬛', '⬜', '🟫', '🔈', '🔇', '🔉', '🔊', '🔔', '🔕', '📣', '📢', '👁️‍🗨️', '💬', '💭', '🗯️', '♠️', '♣️', '♥️', '♦️', '🃏', '🎴', '🀄', '🕐', '🕑', '🕒', '🕓', '🕔', '🕕', '🕖', '🕗', '🕘', '🕙', '🕚', '🕛', '🕜', '🕝', '🕞', '🕟', '🕠', '🕡', '🕢', '🕣', '🕤', '🕥', '🕦', '🕧']
    }
  ];

  toolbar: ToolbarItem[] = [];

  init(editor: Editor): void {
    this.editor = editor;
    
    // Make methods available
    (this as any).showEmojiPicker = this.showEmojiPicker.bind(this);
    
    // Register command
    this.editor.commands.register('insertEmoji', {
      execute: (emoji: string) => this.insertEmoji(emoji)
    });
    
    // Add styles
    this.addStyles();
  }

  destroy(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
  }

  private showEmojiPicker(): void {
    if (this.dialog) {
      this.dialog.remove();
    }
    
    this.dialog = this.createEmojiDialog();
    document.body.appendChild(this.dialog);
    
    // Focus search input
    if (this.searchInput) {
      this.searchInput.focus();
    }
  }

  private createEmojiDialog(): HTMLElement {
    const overlay = createElement('div', {
      className: 'xeditor-emoji-overlay'
    });

    const dialog = createElement('div', {
      className: 'xeditor-emoji-dialog'
    });

    // Header
    const header = createElement('div', {
      className: 'xeditor-emoji-header'
    });

    const title = createElement('h3', {}, ['Insert Emoji']);

    const closeBtn = createElement('button', {
      className: 'xeditor-emoji-close',
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
      className: 'xeditor-emoji-search'
    });

    this.searchInput = createElement('input', {
      type: 'text',
      placeholder: 'Search emojis...',
      className: 'xeditor-emoji-search-input'
    }) as HTMLInputElement;

    this.searchInput.addEventListener('input', () => {
      this.filterEmojis();
    });

    searchContainer.appendChild(this.searchInput);

    // Categories
    const categoriesContainer = createElement('div', {
      className: 'xeditor-emoji-categories'
    });

    this.categories.forEach((category, index) => {
      const categoryBtn = createElement('button', {
        className: 'xeditor-emoji-category-btn',
        type: 'button',
        title: category.name,
        'data-category': String(index)
      }, [category.icon]);

      if (index === 0) {
        categoryBtn.classList.add('active');
      }

      categoryBtn.addEventListener('click', () => {
        this.scrollToCategory(index);
        
        // Update active state
        document.querySelectorAll('.xeditor-emoji-category-btn').forEach(btn => {
          btn.classList.remove('active');
        });
        categoryBtn.classList.add('active');
      });

      categoriesContainer.appendChild(categoryBtn);
    });

    // Content
    const content = createElement('div', {
      className: 'xeditor-emoji-content'
    });

    this.categories.forEach((category, index) => {
      const section = createElement('div', {
        className: 'xeditor-emoji-section',
        'data-category': String(index)
      });

      const sectionTitle = createElement('h4', {
        className: 'xeditor-emoji-section-title'
      }, [category.name]);

      const grid = createElement('div', {
        className: 'xeditor-emoji-grid'
      });

      category.emojis.forEach(emoji => {
        const emojiBtn = createElement('button', {
          className: 'xeditor-emoji-btn',
          type: 'button',
          title: emoji,
          'data-emoji': emoji
        }, [emoji]);

        emojiBtn.addEventListener('click', () => {
          this.insertEmoji(emoji);
          overlay.remove();
        });

        grid.appendChild(emojiBtn);
      });

      section.appendChild(sectionTitle);
      section.appendChild(grid);
      content.appendChild(section);
    });

    // Recently used
    const recentEmojis = this.getRecentEmojis();
    if (recentEmojis.length > 0) {
      const recentSection = createElement('div', {
        className: 'xeditor-emoji-section xeditor-emoji-recent',
        'data-category': 'recent'
      });

      const recentTitle = createElement('h4', {
        className: 'xeditor-emoji-section-title'
      }, ['Recently Used']);

      const recentGrid = createElement('div', {
        className: 'xeditor-emoji-grid'
      });

      recentEmojis.forEach(emoji => {
        const emojiBtn = createElement('button', {
          className: 'xeditor-emoji-btn',
          type: 'button',
          title: emoji,
          'data-emoji': emoji
        }, [emoji]);

        emojiBtn.addEventListener('click', () => {
          this.insertEmoji(emoji);
          overlay.remove();
        });

        recentGrid.appendChild(emojiBtn);
      });

      recentSection.appendChild(recentTitle);
      recentSection.appendChild(recentGrid);
      content.insertBefore(recentSection, content.firstChild);
    }

    // Assemble dialog
    dialog.appendChild(header);
    dialog.appendChild(searchContainer);
    dialog.appendChild(categoriesContainer);
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

  private insertEmoji(emoji: string): void {
    this.editor.execCommand('insertHTML', emoji);
    this.saveRecentEmoji(emoji);
  }

  private filterEmojis(): void {
    const query = this.searchInput!.value.toLowerCase();
    const sections = document.querySelectorAll('.xeditor-emoji-section');
    
    if (!query) {
      sections.forEach(section => {
        (section as HTMLElement).style.display = 'block';
        const buttons = section.querySelectorAll('.xeditor-emoji-btn');
        buttons.forEach(btn => {
          (btn as HTMLElement).style.display = 'inline-flex';
        });
      });
      return;
    }

    sections.forEach(section => {
      const buttons = section.querySelectorAll('.xeditor-emoji-btn');
      let hasVisibleEmojis = false;

      buttons.forEach(btn => {
        const emoji = btn.getAttribute('data-emoji')!;
        const title = btn.getAttribute('title')!.toLowerCase();
        
        if (emoji.includes(query) || title.includes(query)) {
          (btn as HTMLElement).style.display = 'inline-flex';
          hasVisibleEmojis = true;
        } else {
          (btn as HTMLElement).style.display = 'none';
        }
      });

      (section as HTMLElement).style.display = hasVisibleEmojis ? 'block' : 'none';
    });
  }

  private scrollToCategory(index: number): void {
    const section = document.querySelector(`[data-category="${index}"]`);
    if (section) {
      const content = document.querySelector('.xeditor-emoji-content');
      if (content) {
        content.scrollTop = (section as HTMLElement).offsetTop - content.getBoundingClientRect().top;
      }
    }
  }

  private getRecentEmojis(): string[] {
    const stored = localStorage.getItem('xeditor-recent-emojis');
    return stored ? JSON.parse(stored) : [];
  }

  private saveRecentEmoji(emoji: string): void {
    let recent = this.getRecentEmojis();
    
    // Remove if already exists
    recent = recent.filter(e => e !== emoji);
    
    // Add to beginning
    recent.unshift(emoji);
    
    // Keep only last 24
    recent = recent.slice(0, 24);
    
    localStorage.setItem('xeditor-recent-emojis', JSON.stringify(recent));
  }

  private addStyles(): void {
    const style = createElement('style');
    style.textContent = `
      .xeditor-emoji-overlay {
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
      
      .xeditor-emoji-dialog {
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        width: 400px;
        max-width: 90vw;
        height: 500px;
        max-height: 90vh;
        display: flex;
        flex-direction: column;
      }
      
      .xeditor-emoji-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-emoji-header h3 {
        margin: 0;
        font-size: 18px;
      }
      
      .xeditor-emoji-close {
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
      
      .xeditor-emoji-close:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-emoji-search {
        padding: 12px 20px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .xeditor-emoji-search-input {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ddd;
        border-radius: 4px;
        font-size: 14px;
        box-sizing: border-box;
      }
      
      .xeditor-emoji-search-input:focus {
        outline: none;
        border-color: var(--xeditor-primary);
      }
      
      .xeditor-emoji-categories {
        display: flex;
        padding: 8px 20px;
        gap: 4px;
        border-bottom: 1px solid #e0e0e0;
        overflow-x: auto;
      }
      
      .xeditor-emoji-category-btn {
        background: none;
        border: none;
        font-size: 20px;
        padding: 8px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s;
        flex-shrink: 0;
      }
      
      .xeditor-emoji-category-btn:hover {
        background-color: #f0f0f0;
      }
      
      .xeditor-emoji-category-btn.active {
        background-color: #e3f2fd;
      }
      
      .xeditor-emoji-content {
        flex: 1;
        overflow-y: auto;
        padding: 20px;
      }
      
      .xeditor-emoji-section {
        margin-bottom: 24px;
      }
      
      .xeditor-emoji-section-title {
        font-size: 14px;
        color: #666;
        margin: 0 0 12px 0;
      }
      
      .xeditor-emoji-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(36px, 1fr));
        gap: 4px;
      }
      
      .xeditor-emoji-btn {
        background: none;
        border: none;
        font-size: 24px;
        width: 36px;
        height: 36px;
        cursor: pointer;
        border-radius: 4px;
        transition: background-color 0.2s;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }
      
      .xeditor-emoji-btn:hover {
        background-color: #f0f0f0;
      }
      
      /* Dark theme support */
      [data-theme="dark"] .xeditor-emoji-dialog {
        background: #2d2d2d;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-emoji-header,
      [data-theme="dark"] .xeditor-emoji-search,
      [data-theme="dark"] .xeditor-emoji-categories {
        border-color: #444;
      }
      
      [data-theme="dark"] .xeditor-emoji-search-input {
        background: #3d3d3d;
        border-color: #555;
        color: #f0f0f0;
      }
      
      [data-theme="dark"] .xeditor-emoji-close:hover,
      [data-theme="dark"] .xeditor-emoji-category-btn:hover,
      [data-theme="dark"] .xeditor-emoji-btn:hover {
        background-color: #444;
      }
      
      [data-theme="dark"] .xeditor-emoji-category-btn.active {
        background-color: #1976d2;
      }
      
      [data-theme="dark"] .xeditor-emoji-section-title {
        color: #aaa;
      }
    `;
    
    document.head.appendChild(style);
  }
}