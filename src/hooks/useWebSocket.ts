import { useEffect, useRef, useCallback, useState } from 'react';
import { useSession } from 'next-auth/react';
import { io, Socket } from 'socket.io-client';

// Singleton Socket.IO instance
let globalSocket: Socket | null = null;
let globalSocketPromise: Promise<Socket> | null = null;
let globalListeners: Map<string, Set<Function>> = new Map();

export interface UseWebSocketOptions {
  enabled?: boolean;
  onScanProgress?: (scanId: string, progress: number) => void;
  onScanCompleted?: (scanId: string, data: any) => void;
  onScanFailed?: (scanId: string, error: string) => void;
  onScanCancelled?: (scanId: string) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: Event) => void;
}

// Create or get existing Socket.IO connection
async function getOrCreateSocket(userId: string): Promise<Socket> {
  if (globalSocket?.connected) {
    return globalSocket;
  }

  if (globalSocketPromise) {
    return globalSocketPromise;
  }

  globalSocketPromise = new Promise(async (resolve, reject) => {
    try {
      // Initialize Socket.IO server if not already done
      await fetch('/api/socketio');

      // Create Socket.IO client
      const socket = io({
        path: '/api/socketio',
        auth: { token: userId },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000
      });

      socket.on('connect', () => {
        console.log('Socket.IO connected - real-time updates enabled');
        globalSocket = socket;
        globalSocketPromise = null;
        resolve(socket);
      });

      socket.on('disconnect', (reason) => {
        console.log('Socket.IO disconnected - falling back to polling');
        globalSocket = null;
        globalSocketPromise = null;
      });

      socket.on('connect_error', (error: Error) => {
        console.error('Socket.IO connection error:', error);
        globalSocket = null;
        globalSocketPromise = null;
        reject(error);
      });

      // Handle scan updates
      socket.on('scan_update', (message) => {
        console.log('Socket.IO: Scan update received:', message.type, message.scanId);
        
        // Notify all listeners
        const listeners = globalListeners.get(message.type) || new Set();
        listeners.forEach((listener: Function) => {
          try {
            listener(message);
          } catch (error) {
            console.error('Error in Socket.IO listener:', error);
          }
        });
      });

    } catch (error) {
      globalSocketPromise = null;
      reject(error);
    }
  });

  return globalSocketPromise;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
  const { data: session, status } = useSession();
  const [isConnected, setIsConnected] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const listenersRef = useRef<Set<string>>(new Set());
  
  const {
    enabled = true,
    onScanProgress,
    onScanCompleted,
    onScanFailed,
    onScanCancelled,
    onConnect,
    onDisconnect,
    onError
  } = options;

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!enabled || status !== 'authenticated' || !session?.user?.id) {
      return;
    }

    let mounted = true;

    const initSocket = async () => {
      try {
        const socket = await getOrCreateSocket(session.user.id);
        
        if (!mounted) return;

        setIsConnected(socket.connected);
        setLastError(null);

        // Register listeners for this component
        const listeners = [
          { type: 'scan_progress', handler: onScanProgress },
          { type: 'scan_completed', handler: onScanCompleted },
          { type: 'scan_failed', handler: onScanFailed },
          { type: 'scan_cancelled', handler: onScanCancelled }
        ];

        listeners.forEach(({ type, handler }) => {
          if (handler) {
            if (!globalListeners.has(type)) {
              globalListeners.set(type, new Set());
            }
            globalListeners.get(type)!.add(handler);
            listenersRef.current.add(type);
          }
        });

        // Update connection status
        if (socket.connected) {
          onConnect?.();
        }

        // Listen for connection changes
        const handleConnect = () => {
          if (mounted) {
            setIsConnected(true);
            setLastError(null);
            onConnect?.();
          }
        };

        const handleDisconnect = () => {
          if (mounted) {
            setIsConnected(false);
            onDisconnect?.();
          }
        };

        const handleError = (error: Error) => {
          if (mounted) {
            setLastError('Connection failed');
            onError?.(error as any);
          }
        };

        socket.on('connect', handleConnect);
        socket.on('disconnect', handleDisconnect);
        socket.on('connect_error', handleError);

        // Cleanup function
        return () => {
          socket.off('connect', handleConnect);
          socket.off('disconnect', handleDisconnect);
          socket.off('connect_error', handleError);
        };

      } catch (error) {
        if (mounted) {
          console.error('Failed to initialize Socket.IO:', error);
          setLastError('Connection failed');
          onError?.(error as any);
        }
      }
    };

    initSocket();

    return () => {
      mounted = false;
      
      // Remove listeners for this component
      listenersRef.current.forEach(type => {
        const listeners = globalListeners.get(type);
        if (listeners) {
          listeners.delete(onScanProgress!);
          listeners.delete(onScanCompleted!);
          listeners.delete(onScanFailed!);
          listeners.delete(onScanCancelled!);
          
          if (listeners.size === 0) {
            globalListeners.delete(type);
          }
        }
      });
      listenersRef.current.clear();
    };
  }, [enabled, status, session?.user?.id]); // Removed callback dependencies

  // Send message through Socket.IO
  const sendMessage = useCallback((message: any) => {
    if (globalSocket?.connected) {
      globalSocket.emit('message', message);
      return true;
    }
    return false;
  }, []);

  return {
    isConnected,
    lastError,
    sendMessage,
    socket: globalSocket
  };
}
