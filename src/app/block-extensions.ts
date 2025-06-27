// Script to block browser extension conflicts
// This can be imported in your layout or pages to prevent extension errors

export function blockExtensionConflicts() {
  // Block Phantom wallet extension
  if (typeof window !== 'undefined') {
    // Prevent Phantom from setting window.phantom.solana
    Object.defineProperty(window, 'phantom', {
      get: () => undefined,
      set: () => {
        // Silently ignore attempts to set phantom
        console.warn('Phantom extension blocked to prevent conflicts');
      },
      configurable: true
    });

    // Block MetaMask extension errors
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args[0];
      if (typeof message === 'string' && 
          (message.includes('MetaMask extension not found') || 
           message.includes('ChromeTransport') ||
           message.includes('phantom'))) {
        // Silently ignore these specific extension errors
        return;
      }
      originalConsoleError.apply(console, args);
    };
  }
}

// Auto-run if this script is loaded
if (typeof window !== 'undefined') {
  blockExtensionConflicts();
} 