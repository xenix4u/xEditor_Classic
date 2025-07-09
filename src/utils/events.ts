import { EventEmitter } from '../types';

export class EventEmitterImpl implements EventEmitter {
  private events: Map<string, Set<Function>> = new Map();

  on(event: string, handler: Function): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler);
  }

  off(event: string, handler: Function): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.events.delete(event);
      }
    }
  }

  once(event: string, handler: Function): void {
    const wrapper = (...args: any[]) => {
      handler(...args);
      this.off(event, wrapper);
    };
    this.on(event, wrapper);
  }

  emit(event: string, ...args: any[]): void {
    const handlers = this.events.get(event);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(...args);
        } catch (error) {
          console.error(`Error in event handler for "${event}":`, error);
        }
      });
    }
  }

  clear(): void {
    this.events.clear();
  }
}

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

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  
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

export function createKeyboardEvent(
  type: string,
  options: KeyboardEventInit
): KeyboardEvent {
  const event = new KeyboardEvent(type, options);
  return event;
}

export function createCustomEvent(
  type: string,
  detail?: any
): CustomEvent {
  return new CustomEvent(type, { detail, bubbles: true, cancelable: true });
}

export function preventEvent(event: Event): void {
  event.preventDefault();
  event.stopPropagation();
}

export function addEventListeners(
  element: Element,
  events: Record<string, EventListener>
): () => void {
  const entries = Object.entries(events);
  
  entries.forEach(([event, handler]) => {
    element.addEventListener(event, handler);
  });
  
  return () => {
    entries.forEach(([event, handler]) => {
      element.removeEventListener(event, handler);
    });
  };
}