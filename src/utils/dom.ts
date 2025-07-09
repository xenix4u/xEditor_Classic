export function createElement(
  tag: string,
  attributes?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElement {
  const element = document.createElement(tag);
  
  if (attributes) {
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'className') {
        element.className = value;
      } else if (key.startsWith('data-')) {
        element.setAttribute(key, value);
      } else {
        (element as any)[key] = value;
      }
    });
  }
  
  if (children) {
    children.forEach(child => {
      if (typeof child === 'string') {
        element.appendChild(document.createTextNode(child));
      } else {
        element.appendChild(child);
      }
    });
  }
  
  return element;
}

export function removeElement(element: Element): void {
  element.parentNode?.removeChild(element);
}

export function addClass(element: Element, ...classNames: string[]): void {
  element.classList.add(...classNames);
}

export function removeClass(element: Element, ...classNames: string[]): void {
  element.classList.remove(...classNames);
}

export function hasClass(element: Element, className: string): boolean {
  return element.classList.contains(className);
}

export function toggleClass(element: Element, className: string, force?: boolean): boolean {
  return element.classList.toggle(className, force);
}

export function getSelection(): Selection | null {
  return window.getSelection();
}

export function saveSelection(): Range | null {
  const selection = getSelection();
  if (selection && selection.rangeCount > 0) {
    return selection.getRangeAt(0).cloneRange();
  }
  return null;
}

export function restoreSelection(range: Range | null): void {
  if (!range) return;
  
  const selection = getSelection();
  if (selection) {
    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function isElement(node: Node): node is Element {
  return node.nodeType === Node.ELEMENT_NODE;
}

export function isTextNode(node: Node): node is Text {
  return node.nodeType === Node.TEXT_NODE;
}

export function findParentElement(
  node: Node,
  predicate: (element: Element) => boolean
): Element | null {
  let current: Node | null = node;
  
  while (current && current !== document.body) {
    if (isElement(current) && predicate(current)) {
      return current;
    }
    current = current.parentNode;
  }
  
  return null;
}

export function getComputedStyleValue(element: Element, property: string): string {
  return window.getComputedStyle(element).getPropertyValue(property);
}

export function setAttributes(element: Element, attributes: Record<string, string>): void {
  Object.entries(attributes).forEach(([key, value]) => {
    element.setAttribute(key, value);
  });
}

export function removeAttributes(element: Element, ...attributeNames: string[]): void {
  attributeNames.forEach(name => element.removeAttribute(name));
}

export function isInViewport(element: Element): boolean {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

export function scrollIntoView(element: Element, options?: ScrollIntoViewOptions): void {
  element.scrollIntoView(options || { behavior: 'smooth', block: 'nearest' });
}

export function getCaretPosition(element: Element): number {
  let caretPos = 0;
  const selection = window.getSelection();
  
  if (selection && selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const preCaretRange = range.cloneRange();
    preCaretRange.selectNodeContents(element);
    preCaretRange.setEnd(range.endContainer, range.endOffset);
    caretPos = preCaretRange.toString().length;
  }
  
  return caretPos;
}

export function setCaretPosition(element: Element, position: number): void {
  const textNode = element.firstChild;
  if (textNode && isTextNode(textNode)) {
    const range = document.createRange();
    const selection = window.getSelection();
    
    const length = textNode.textContent?.length || 0;
    const safePosition = Math.min(position, length);
    
    range.setStart(textNode, safePosition);
    range.collapse(true);
    
    selection?.removeAllRanges();
    selection?.addRange(range);
  }
}

export function insertNodeAtCaret(node: Node): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  range.deleteContents();
  range.insertNode(node);
  
  range.setStartAfter(node);
  range.setEndAfter(node);
  range.collapse(false);
  
  selection.removeAllRanges();
  selection.addRange(range);
}

export function wrapSelection(tagName: string, attributes?: Record<string, string>): void {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return;
  
  const range = selection.getRangeAt(0);
  const wrapper = createElement(tagName, attributes);
  
  try {
    range.surroundContents(wrapper);
  } catch (e) {
    wrapper.appendChild(range.extractContents());
    range.insertNode(wrapper);
  }
  
  selection.removeAllRanges();
  selection.addRange(range);
}