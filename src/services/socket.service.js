import { Server } from 'socket.io';

class SocketService {
  constructor() {
    this.io = null;
  }

  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || '*',
        methods: ['GET', 'POST']
      }
    });

    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);
      
      // Join upload room based on user ID
      socket.on('join-upload-room', (userId) => {
        socket.join(`upload-${userId}`);
        console.log(`User ${userId} joined upload room`);
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log('Socket.io initialized');
    return this.io;
  }

  // Emit upload progress to specific user
  emitUploadProgress(userId, fileId, progress) {
    if (!this.io) return;
    
    this.io.to(`upload-${userId}`).emit('upload-progress', {
      fileId,
      progress
    });
  }

  // Emit upload completion to specific user
  emitUploadComplete(userId, fileId, url) {
    if (!this.io) return;
    
    this.io.to(`upload-${userId}`).emit('upload-complete', {
      fileId,
      url
    });
  }

  // Emit upload error to specific user
  emitUploadError(userId, fileId, error) {
    if (!this.io) return;
    
    this.io.to(`upload-${userId}`).emit('upload-error', {
      fileId,
      error
    });
  }
}

export default new SocketService();