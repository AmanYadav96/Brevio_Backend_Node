import { Server } from 'socket.io';
import FileUpload from '../models/fileUpload.model.js';

class SocketService {
  constructor() {
    this.io = null;
    this.uploadSessions = new Map(); // Track active upload sessions
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

      // Handle chunk upload start
      socket.on('chunk-upload-start', (data) => {
        const { userId, fileId, fileName, fileSize, totalChunks } = data;
        this.uploadSessions.set(fileId, {
          userId,
          fileName,
          fileSize,
          totalChunks,
          uploadedChunks: 0,
          uploadedBytes: 0,
          startTime: Date.now()
        });
        
        console.log(`Starting chunked upload for file ${fileName} (${fileId})`);
        this.emitUploadStatus(userId, fileId, 'started', 0);
      });

      // Handle chunk upload progress
      socket.on('chunk-upload-progress', (data) => {
        const { fileId, chunkIndex, chunkSize } = data;
        const session = this.uploadSessions.get(fileId);
        
        if (session) {
          session.uploadedChunks++;
          session.uploadedBytes += chunkSize;
          
          const progress = Math.round((session.uploadedBytes / session.fileSize) * 100);
          const elapsed = (Date.now() - session.startTime) / 1000; // seconds
          const speed = session.uploadedBytes / elapsed; // bytes per second
          
          this.emitUploadStatus(
            session.userId, 
            fileId, 
            'uploading', 
            progress, 
            {
              uploadedBytes: session.uploadedBytes,
              totalBytes: session.fileSize,
              speed: Math.round(speed / 1024), // KB/s
              remainingTime: Math.round((session.fileSize - session.uploadedBytes) / speed)
            }
          );
        }
      });

      socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
      });
    });

    console.log('Socket.io initialized');
    return this.io;
  }

  // Emit upload status with detailed information
  // Emit upload status with detailed information
  emitUploadStatus(userId, fileId, status, progress, details = {}) {
    if (!this.io) return;
    
    // Add console logging for upload progress
    console.log(`Upload progress for file ${fileId}: ${progress}% (${status})`, 
      details.uploadedBytes && details.totalBytes ? 
      `${Math.round(details.uploadedBytes / 1024 / 1024 * 100) / 100}MB / ${Math.round(details.totalBytes / 1024 / 1024 * 100) / 100}MB` : 
      '');
    
    this.io.to(`upload-${userId}`).emit('upload-status', {
      fileId,
      status,
      progress,
      ...details,
      timestamp: Date.now()
    });
  }

  // Emit upload progress to specific user
  // Enhance the emitUploadProgress method to include more details
  // Emit upload progress to specific user
  emitUploadProgress(userId, fileId, progress) {
    if (!this.io) return;
    
    // Add console logging for regular upload progress
    console.log(`Regular upload progress for file ${fileId}: ${progress}%`);
    
    // Try to get the file upload record for more details
    FileUpload.findById(fileId)
      .then(fileUpload => {
        if (fileUpload) {
          const uploadedBytes = Math.round((progress / 100) * fileUpload.fileSize);
          const elapsed = (Date.now() - new Date(fileUpload.createdAt).getTime()) / 1000; // seconds
          let speed = 0;
          let remainingTime = 0;
          
          if (elapsed > 0) {
            speed = uploadedBytes / elapsed; // bytes per second
            remainingTime = Math.round((fileUpload.fileSize - uploadedBytes) / speed); // seconds
          }
          
          // Log detailed progress information
          console.log(`Upload details for ${fileUpload.fileName}: ${Math.round(uploadedBytes / 1024 / 1024 * 100) / 100}MB / ${Math.round(fileUpload.fileSize / 1024 / 1024 * 100) / 100}MB, Speed: ${Math.round(speed / 1024)}KB/s, Remaining: ${remainingTime}s`);
          
          this.emitUploadStatus(
            userId, 
            fileId, 
            fileUpload.status, 
            progress, 
            {
              uploadedBytes: uploadedBytes,
              totalBytes: fileUpload.fileSize,
              speed: Math.round(speed / 1024), // KB/s
              remainingTime: remainingTime
            }
          );
        } else {
          // Fallback to basic progress update if file record not found
          this.io.to(`upload-${userId}`).emit('upload-progress', {
            fileId,
            progress
          });
        }
      })
      .catch(err => {
        console.error('Error getting file upload details:', err);
        // Fallback to basic progress update
        this.io.to(`upload-${userId}`).emit('upload-progress', {
          fileId,
          progress
        });
      });
  }

  // Emit upload completion to specific user
  emitUploadComplete(userId, fileId, url) {
    if (!this.io) return;
    
    const session = this.uploadSessions.get(fileId);
    if (session) {
      const totalTime = (Date.now() - session.startTime) / 1000; // seconds
      this.uploadSessions.delete(fileId); // Clean up session
      
      this.io.to(`upload-${userId}`).emit('upload-complete', {
        fileId,
        url,
        fileName: session.fileName,
        fileSize: session.fileSize,
        uploadTime: totalTime
      });
    } else {
      this.io.to(`upload-${userId}`).emit('upload-complete', {
        fileId,
        url
      });
    }
  }

  // Emit upload error to specific user
  emitUploadError(userId, fileId, error) {
    if (!this.io) return;
    
    const session = this.uploadSessions.get(fileId);
    if (session) {
      this.uploadSessions.delete(fileId); // Clean up session
    }
    
    this.io.to(`upload-${userId}`).emit('upload-error', {
      fileId,
      error
    });
  }
}

export default new SocketService();