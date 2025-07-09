import { XEditor } from './core/editor';
import { EditorConfig } from './types';
import './styles/editor.css';

export default XEditor;
export { XEditor, EditorConfig };

export * from './types';

if (typeof window !== 'undefined') {
  (window as any).XEditor = XEditor;
}