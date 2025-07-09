export interface EditorError {
  message: string;
  code: string;
  details?: any;
}

export class ErrorHandler {
  private static instance: ErrorHandler;
  private errorListeners: ((error: EditorError) => void)[] = [];

  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler();
    }
    return ErrorHandler.instance;
  }

  handle(error: Error | EditorError, userMessage?: string): void {
    const editorError: EditorError = {
      message: userMessage || this.getUserFriendlyMessage(error),
      code: this.getErrorCode(error),
      details: error
    };

    console.error('XEditor Error:', editorError);
    
    // Notify error listeners
    this.errorListeners.forEach(listener => {
      try {
        listener(editorError);
      } catch (e) {
        console.error('Error in error listener:', e);
      }
    });

    // Show user-friendly notification
    this.showNotification(editorError.message);
  }

  addErrorListener(listener: (error: EditorError) => void): void {
    this.errorListeners.push(listener);
  }

  removeErrorListener(listener: (error: EditorError) => void): void {
    const index = this.errorListeners.indexOf(listener);
    if (index > -1) {
      this.errorListeners.splice(index, 1);
    }
  }

  private getUserFriendlyMessage(error: Error | EditorError): string {
    if ('code' in error) {
      switch (error.code) {
        case 'IMAGE_UPLOAD_FAILED':
          return 'Failed to upload image. Please try again.';
        case 'INVALID_HTML':
          return 'The content contains invalid HTML. Some formatting may be lost.';
        case 'CLIPBOARD_ACCESS_DENIED':
          return 'Clipboard access denied. Please check your browser permissions.';
        case 'UNSUPPORTED_FORMAT':
          return 'This file format is not supported.';
        case 'FILE_TOO_LARGE':
          return 'The file is too large. Please choose a smaller file.';
        default:
          return 'An error occurred. Please try again.';
      }
    }

    // Handle specific error types
    if (error.message.includes('localStorage')) {
      return 'Unable to save data. Please check your browser storage settings.';
    }
    
    if (error.message.includes('network')) {
      return 'Network error. Please check your internet connection.';
    }

    return 'An unexpected error occurred. Please try again.';
  }

  private getErrorCode(error: Error | EditorError): string {
    if ('code' in error && typeof error.code === 'string') {
      return error.code;
    }
    
    // Infer error code from error type/message
    if (error.message.includes('upload')) return 'UPLOAD_ERROR';
    if (error.message.includes('parse')) return 'PARSE_ERROR';
    if (error.message.includes('network')) return 'NETWORK_ERROR';
    if (error.message.includes('permission')) return 'PERMISSION_ERROR';
    
    return 'UNKNOWN_ERROR';
  }

  private showNotification(message: string): void {
    // Create a simple notification element
    const notification = document.createElement('div');
    notification.className = 'xeditor-notification xeditor-notification--error';
    notification.textContent = message;
    notification.setAttribute('role', 'alert');
    
    // Add to body
    document.body.appendChild(notification);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.classList.add('xeditor-notification--fade-out');
      setTimeout(() => notification.remove(), 300);
    }, 5000);
  }
}

// Create a global error handler
export const errorHandler = ErrorHandler.getInstance();

// Wrap function with error handling
export function withErrorHandling<T extends (...args: any[]) => any>(
  fn: T,
  errorMessage?: string
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      
      // Handle promises
      if (result instanceof Promise) {
        return result.catch((error: Error) => {
          errorHandler.handle(error, errorMessage);
          throw error;
        });
      }
      
      return result;
    } catch (error) {
      errorHandler.handle(error as Error, errorMessage);
      throw error;
    }
  }) as T;
}