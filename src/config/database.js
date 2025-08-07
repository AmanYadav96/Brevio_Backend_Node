import mongoose from "mongoose"

// Advanced connection pooling configuration for high performance
const connectionOptions = {
  // Connection Pool Settings (similar to HikariCP)
  maxPoolSize: 100,           // Maximum number of connections in the pool
  minPoolSize: 10,            // Minimum number of connections to maintain
  maxIdleTimeMS: 300000,      // Close connections after 5 minutes of inactivity
  waitQueueTimeoutMS: 10000,  // How long to wait for a connection from pool
  
  // Connection Timeouts
  serverSelectionTimeoutMS: 30000,  // How long to try selecting a server
  socketTimeoutMS: 60000,           // How long to wait for socket operations
  connectTimeoutMS: 30000,          // How long to wait for initial connection
  
  // Performance Optimizations
  bufferCommands: false,      // Disable command buffering
  
  // Replica Set & Sharding (only for replica sets)
  // readPreference: 'secondaryPreferred',  // Commented out for single MongoDB instance
  retryWrites: true,          // Retry failed writes
  retryReads: true,           // Retry failed reads
  
  // Compression
  compressors: ['zlib'],
  zlibCompressionLevel: 6,
  
  // Heartbeat
  heartbeatFrequencyMS: 10000,  // Check server health every 10 seconds
  
  // Development vs Production settings (compatible with single instance)
  autoIndex: process.env.NODE_ENV !== 'production', // Enable auto-indexing in development
  autoCreate: process.env.NODE_ENV !== 'production'  // Enable auto-collection creation in development
}

// Connection pool monitoring and statistics
let connectionStats = {
  totalConnections: 0,
  activeConnections: 0,
  idleConnections: 0,
  connectionErrors: 0,
  lastError: null
}

export const connectDB = async () => {
  try {
    // Check if MongoDB URI is available
    if (!process.env.MONGODB_URI || process.env.MONGODB_URI.includes('your_mongodb_uri_here')) {
      console.log('⚠️  MongoDB URI not configured - running without database');
      return null;
    }
    
    // Set mongoose global options for better performance
    mongoose.set('strictQuery', true)
    mongoose.set('sanitizeFilter', true)
    
    const conn = await mongoose.connect(process.env.MONGODB_URI, connectionOptions)
    
    // Connection event listeners for monitoring
    conn.connection.on('connected', () => {
      console.log('✅ MongoDB Connected Successfully')
      connectionStats.totalConnections++
    })
    
    conn.connection.on('error', (err) => {
      console.error('❌ MongoDB Connection Error:', err.message)
      connectionStats.connectionErrors++
      connectionStats.lastError = err.message
    })
    
    conn.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB Disconnected')
    })
    
    conn.connection.on('reconnected', () => {
      console.log('🔄 MongoDB Reconnected')
    })
    
    // Log connection pool stats periodically
    setInterval(() => {
      const db = mongoose.connection.db
      if (db) {
        console.log('📊 Connection Pool Stats:', {
          host: conn.connection.host,
          readyState: conn.connection.readyState,
          poolSize: connectionOptions.maxPoolSize,
          ...connectionStats
        })
      }
    }, 60000) // Log every minute
    
    console.log(`🚀 MongoDB Connected: ${conn.connection.host}`)
    console.log(`📈 Pool Configuration: Max=${connectionOptions.maxPoolSize}, Min=${connectionOptions.minPoolSize}`)
    
    return conn
  } catch (error) {
    console.error(`💥 Database Connection Failed: ${error.message}`)
    console.log('⚠️  Server will continue without database functionality')
    connectionStats.connectionErrors++
    connectionStats.lastError = error.message
    return null
  }
}

// Get connection statistics (useful for monitoring)
export const getConnectionStats = () => {
  return {
    ...connectionStats,
    currentState: mongoose.connection.readyState,
    host: mongoose.connection.host,
    name: mongoose.connection.name
  }
}

// Graceful shutdown function
export const closeDB = async () => {
  try {
    await mongoose.connection.close()
    console.log('🔒 MongoDB connection closed gracefully')
  } catch (error) {
    console.error('❌ Error closing MongoDB connection:', error.message)
  }
}
