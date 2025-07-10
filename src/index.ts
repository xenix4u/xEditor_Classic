import { xEditor } from './core/editor';
import { EditorConfig } from './types';
import './styles/editor.css';

export default xEditor;
export { xEditor, EditorConfig };

export * from './types';

if (typeof window !== 'undefined') {
  (window as any).xEditor = xEditor;
}