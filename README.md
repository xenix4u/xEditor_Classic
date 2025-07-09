# XEditor - Professional WYSIWYG Editor

XEditor is a powerful, modern WYSIWYG editor built with TypeScript, designed to be comparable to Froala Editor. It provides a rich text editing experience with a modular architecture and extensive customization options.

## Features

### Core Features
- ✅ **Rich Text Editing**: Full contentEditable-based editor with modern API
- ✅ **Modular Architecture**: Plugin-based system for extensibility
- ✅ **Customizable Toolbar**: Flexible toolbar with drag-and-drop support
- ✅ **Undo/Redo**: Multi-level history management
- ✅ **Auto-save**: Automatic content saving with recovery
- ✅ **Theme Support**: Built-in light/dark themes

### Text Formatting
- ✅ Bold, Italic, Underline, Strikethrough
- ✅ Headings (H1-H6)
- ✅ Paragraph styles
- ✅ Lists (ordered, unordered, nested)
- ✅ Blockquotes
- ✅ Code blocks

### Media Support
- ✅ Image insertion (URL and upload)
- ✅ Drag-and-drop image upload with visual feedback
- ✅ Paste image from clipboard
- ✅ Image resizing with handles
- ✅ Automatic image resizing to max width
- ✅ Image compression with quality settings
- ✅ Base64 encoding option

### Advanced Features
- ✅ Plugin system
- ✅ Command architecture
- ✅ Event system
- ✅ Keyboard shortcuts
- ✅ Content sanitization
- ✅ TypeScript support

## Installation

```bash
npm install xeditor
```

## Quick Start

```javascript
import XEditor from 'xeditor';
import 'xeditor/dist/xeditor.min.css';

const editor = new XEditor({
  container: '#editor',
  height: 400,
  placeholder: 'Start typing...',
  onChange: (content) => {
    console.log('Content changed:', content);
  }
});
```

## Configuration Options

```typescript
const editor = new XEditor({
  container: '#editor',          // Element or selector
  height: 400,                   // Height in pixels or string
  width: '100%',                 // Width in pixels or string
  placeholder: 'Type here...',   // Placeholder text
  theme: 'light',                // 'light' or 'dark'
  language: 'en',                // Language code
  toolbar: {                     // Toolbar configuration
    items: ['bold', 'italic'],
    position: 'top',
    sticky: true
  },
  autoSave: {                    // Auto-save configuration
    enabled: true,
    interval: 30000,
    key: 'xeditor-content'
  },
  image: {                       // Image configuration
    maxWidth: 800,               // Max width in pixels
    maxSize: 5,                  // Max file size in MB
    quality: 0.85,               // JPEG compression quality
    resizeBeforeUpload: true,    // Resize before uploading
    upload: async (file) => {    // Custom upload handler
      // Upload to server and return URL
      return uploadedUrl;
    }
  },
  onChange: (content) => {},     // Content change callback
  onReady: () => {},            // Editor ready callback
  onFocus: () => {},            // Focus callback
  onBlur: () => {}              // Blur callback
});
```

## API Methods

```javascript
// Get/Set content
editor.getContent();                    // Get HTML content
editor.setContent('<p>Hello</p>');     // Set HTML content
editor.insertContent('<b>Text</b>');   // Insert at cursor

// Commands
editor.execCommand('bold');             // Execute command
editor.queryCommandState('bold');       // Check command state

// Focus management
editor.focus();                         // Focus editor
editor.blur();                          // Blur editor

// Events
editor.on('change', handler);           // Listen to events
editor.off('change', handler);          // Remove listener

// Cleanup
editor.destroy();                       // Destroy editor
```

## Custom Toolbar

```javascript
const editor = new XEditor({
  container: '#editor',
  toolbar: {
    items: [
      'bold', 'italic', 'underline', '|',
      'heading', 'paragraph', '|',
      'orderedList', 'unorderedList', '|',
      'link', 'image', '|',
      'undo', 'redo'
    ],
    position: 'top',
    sticky: true
  }
});
```

## Image Handling

### Drag and Drop
Images can be dragged directly into the editor:
- Visual feedback shows drop zone
- Images are inserted at cursor position
- Automatic resizing applies based on configuration

### Configuration Options
```javascript
const editor = new XEditor({
  container: '#editor',
  image: {
    maxWidth: 1200,              // Maximum width (default: 1200px)
    maxSize: 10,                 // Maximum file size in MB (default: 10MB)
    quality: 0.85,               // JPEG quality 0-1 (default: 0.85)
    resizeBeforeUpload: true,    // Resize before upload (default: true)
    upload: async (file) => {    // Custom upload handler
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const data = await response.json();
      return data.url;
    }
  }
});
```

### Features
- **Automatic Resizing**: Images larger than maxWidth are automatically resized
- **Aspect Ratio Preservation**: Original proportions are maintained
- **Quality Control**: JPEG compression with configurable quality
- **Multiple Upload Methods**:
  - Toolbar button with file picker
  - Drag and drop from desktop
  - Paste from clipboard
  - Drag from other web pages

## Creating Plugins

```javascript
class MyPlugin {
  name = 'myplugin';

  init(editor) {
    // Register commands
    editor.commands.register('mycommand', {
      execute: () => {
        console.log('My command executed');
      }
    });

    // Add toolbar items
    return {
      toolbar: [{
        name: 'mybutton',
        icon: '★',
        tooltip: 'My Button',
        command: 'mycommand'
      }]
    };
  }

  destroy() {
    // Cleanup
  }
}

// Register plugin
editor.plugins.register(new MyPlugin());
```

## Development

### Setup
```bash
git clone https://github.com/yourusername/xeditor.git
cd xeditor
npm install
```

### Commands
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run test     # Run tests
npm run lint     # Run linter
```

### Project Structure
```
xEditor/
├── src/
│   ├── core/          # Core editor functionality
│   ├── plugins/       # Built-in plugins
│   ├── ui/           # UI components
│   ├── utils/        # Utilities
│   ├── styles/       # CSS styles
│   └── types/        # TypeScript types
├── dist/             # Build output
├── demo/             # Demo files
└── tests/            # Test files
```

## Browser Support
- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- IE11 (with polyfills)

## Contributing
Contributions are welcome! Please read our contributing guidelines before submitting PRs.

## License
MIT License - see LICENSE file for details

## Roadmap

### Upcoming Features
- [ ] Table editor with advanced features
- [ ] Link management with preview
- [ ] Code syntax highlighting
- [ ] Real-time collaboration
- [ ] Mathematical formula support
- [ ] Chart integration
- [ ] Video embedding
- [ ] More language translations
- [ ] WordPress/Joomla plugins
- [ ] React/Vue/Angular components

## Acknowledgments
Built with modern web technologies and inspired by the best WYSIWYG editors.