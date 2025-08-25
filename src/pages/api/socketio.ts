import { NextApiRequest, NextApiResponse } from 'next';
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { auth } from '@/lib/auth';

// Store the Socket.IO server instance
let io: SocketIOServer | null = null;

// Store connected users
const connectedUsers = new Map<string, string>(); // socketId -> userId

export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Add null checks for res.socket
  if (!res.socket) {
    console.error('Socket not available');
    res.status(500).json({ error: 'Socket not available' });
    return;
  }

  if (res.socket.server.io) {
    // Only log once per request, not on every connection attempt
    if (!res.socket.server.ioInitialized) {
      console.log('Socket.IO server already running');
      res.socket.server.ioInitialized = true;
    }
    res.end();
    return;
  }

  console.log('Setting up Socket.IO server...');
  
  const httpServer: HTTPServer = res.socket.server as any;
  
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXTAUTH_URL || "http://localhost:3000",
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/api/socketio'
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      // Get token from handshake auth
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication token required'));
      }

      // Store userId in socket data (we'll validate on message send)
      socket.data.userId = token;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.userId;
    console.log(`Socket connected: ${socket.id} for user: ${userId}`);
    
    // Store the connection
    connectedUsers.set(socket.id, userId);
    
    // Join user-specific room
    socket.join(`user:${userId}`);

    socket.on('disconnect', () => {
      // Only log disconnections if they're not from page navigation
      if (connectedUsers.has(socket.id)) {
        console.log(`Socket disconnected: ${socket.id} for user: ${userId}`);
        connectedUsers.delete(socket.id);
      }
    });

    socket.on('error', (error) => {
      console.error(`Socket error for ${socket.id}:`, error);
    });
  });

  // Store the io instance on the server
  (res.socket.server as any).io = io;
  
  res.end();
}

// Export helper functions for use in other parts of the app
export function getIO(): SocketIOServer | null {
  return io;
}

export function sendToUser(userId: string, message: any): void {
  if (io) {
    try {
      io.to(`user:${userId}`).emit('scan_update', message);
      console.log(`Sent message to user ${userId}:`, message.type);
    } catch (error) {
      console.error('Failed to send message to user:', error);
    }
  }
}

export function broadcastMessage(message: any) {
  if (io) {
    try {
      io.emit('scan_update', message);
      console.log('Broadcasted message to all users:', message.type);
    } catch (error) {
      console.error('Failed to broadcast message:', error);
    }
  }
}

export function getConnectedUserCount(): number {
  return connectedUsers.size;
}

export function isUserConnected(userId: string): boolean {
  return Array.from(connectedUsers.values()).includes(userId);
}
