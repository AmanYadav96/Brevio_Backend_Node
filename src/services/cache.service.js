import NodeCache from 'node-cache'

// Cache configuration for different data types
const cacheConfigs = {
  // User data cache - 15 minutes TTL
  users: { stdTTL: 900, checkperiod: 120 },
  
  // Video metadata cache - 30 minutes TTL
  videos: { stdTTL: 1800, checkperiod: 300 },
  
  // Channel data cache - 1 hour TTL
  channels: { stdTTL: 3600, checkperiod: 600 },
  
  // Categories/Genres cache - 24 hours TTL (rarely changes)
  categories: { stdTTL: 86400, checkperiod: 3600 },
  
  // Short-term cache for API responses - 5 minutes TTL
  api: { stdTTL: 300, checkperiod: 60 },
  
  // Session cache - 2 hours TTL
  sessions: { stdTTL: 7200, checkperiod: 600 }
}

// Create cache instances
const caches = {
  users: new NodeCache(cacheConfigs.users),
  videos: new NodeCache(cacheConfigs.videos),
  channels: new NodeCache(cacheConfigs.channels),
  categories: new NodeCache(cacheConfigs.categories),
  api: new NodeCache(cacheConfigs.api),
  sessions: new NodeCache(cacheConfigs.sessions)
}

// Cache statistics
let cacheStats = {
  hits: 0,
  misses: 0,
  sets: 0,
  deletes: 0,
  errors: 0
}

// Cache versioning for content freshness
let contentVersion = Date.now()
const versionedKeys = new Set(['content_list', 'creator_content', 'all_content'])

// Generic cache service class
class CacheService {
  constructor() {
    this.setupEventListeners()
  }

  // Setup event listeners for all caches
  setupEventListeners() {
    Object.keys(caches).forEach(cacheType => {
      const cache = caches[cacheType]
      
      cache.on('set', (key, value) => {
        cacheStats.sets++
        console.log(`📦 Cache SET [${cacheType}]: ${key}`)
      })
      
      cache.on('del', (key, value) => {
        cacheStats.deletes++
        console.log(`🗑️ Cache DELETE [${cacheType}]: ${key}`)
      })
      
      cache.on('expired', (key, value) => {
        console.log(`⏰ Cache EXPIRED [${cacheType}]: ${key}`)
      })
    })
  }

  // Get data from cache
  get(cacheType, key) {
    try {
      const cache = caches[cacheType]
      if (!cache) {
        throw new Error(`Cache type '${cacheType}' not found`)
      }
      
      const value = cache.get(key)
      if (value !== undefined) {
        cacheStats.hits++
        console.log(`✅ Cache HIT [${cacheType}]: ${key}`)
        return value
      } else {
        cacheStats.misses++
        console.log(`❌ Cache MISS [${cacheType}]: ${key}`)
        return null
      }
    } catch (error) {
      cacheStats.errors++
      console.error(`💥 Cache GET Error [${cacheType}]:`, error.message)
      return null
    }
  }

  // Set data in cache
  set(cacheType, key, value, ttl = null) {
    try {
      const cache = caches[cacheType]
      if (!cache) {
        throw new Error(`Cache type '${cacheType}' not found`)
      }
      
      const success = ttl ? cache.set(key, value, ttl) : cache.set(key, value)
      return success
    } catch (error) {
      cacheStats.errors++
      console.error(`💥 Cache SET Error [${cacheType}]:`, error.message)
      return false
    }
  }

  // Delete from cache
  del(cacheType, key) {
    try {
      const cache = caches[cacheType]
      if (!cache) {
        throw new Error(`Cache type '${cacheType}' not found`)
      }
      
      return cache.del(key)
    } catch (error) {
      cacheStats.errors++
      console.error(`💥 Cache DELETE Error [${cacheType}]:`, error.message)
      return false
    }
  }

  // Clear entire cache type
  flush(cacheType) {
    try {
      const cache = caches[cacheType]
      if (!cache) {
        throw new Error(`Cache type '${cacheType}' not found`)
      }
      
      cache.flushAll()
      console.log(`🧹 Cache FLUSHED [${cacheType}]`)
      return true
    } catch (error) {
      cacheStats.errors++
      console.error(`💥 Cache FLUSH Error [${cacheType}]:`, error.message)
      return false
    }
  }

  // Get cache statistics
  getStats() {
    const allStats = {}
    
    Object.keys(caches).forEach(cacheType => {
      const cache = caches[cacheType]
      allStats[cacheType] = {
        keys: cache.keys().length,
        stats: cache.getStats()
      }
    })
    
    return {
      global: cacheStats,
      caches: allStats,
      hitRate: cacheStats.hits / (cacheStats.hits + cacheStats.misses) || 0
    }
  }

  // Cache-aside pattern helper
  async getOrSet(cacheType, key, fetchFunction, ttl = null) {
    // Try to get from cache first
    let data = this.get(cacheType, key)
    
    if (data !== null) {
      return data
    }
    
    // If not in cache, fetch from database
    try {
      data = await fetchFunction()
      if (data !== null && data !== undefined) {
        this.set(cacheType, key, data, ttl)
      }
      return data
    } catch (error) {
      console.error(`💥 Cache getOrSet Error [${cacheType}]:`, error.message)
      throw error
    }
  }

  // Invalidate related cache entries (useful for updates)
  invalidatePattern(cacheType, pattern) {
    try {
      const cache = caches[cacheType]
      if (!cache) {
        throw new Error(`Cache type '${cacheType}' not found`)
      }
      
      const keys = cache.keys()
      const keysToDelete = keys.filter(key => key.includes(pattern))
      
      keysToDelete.forEach(key => cache.del(key))
      
      console.log(`🔄 Cache INVALIDATED [${cacheType}]: ${keysToDelete.length} keys matching '${pattern}'`)
      return keysToDelete.length
    } catch (error) {
      cacheStats.errors++
      console.error(`💥 Cache INVALIDATE Error [${cacheType}]:`, error.message)
      return 0
    }
  }

  // Cache versioning methods
  getVersionedKey(baseKey) {
    if (versionedKeys.has(baseKey)) {
      return `${baseKey}:v${contentVersion}`
    }
    return baseKey
  }

  bumpContentVersion() {
    contentVersion = Date.now()
    console.log(`🔄 Content version bumped to: ${contentVersion}`)
    
    // Invalidate all versioned content caches
    versionedKeys.forEach(baseKey => {
      this.invalidatePattern('api', baseKey)
    })
    
    return contentVersion
  }

  getCurrentContentVersion() {
    return contentVersion
  }
}

// Create singleton instance
const cacheService = new CacheService()

// Helper functions for common cache operations
export const userCache = {
  get: (userId) => cacheService.get('users', `user:${userId}`),
  set: (userId, userData) => cacheService.set('users', `user:${userId}`, userData),
  del: (userId) => cacheService.del('users', `user:${userId}`),
  getOrSet: (userId, fetchFn) => cacheService.getOrSet('users', `user:${userId}`, fetchFn)
}

export const videoCache = {
  get: (videoId) => cacheService.get('videos', `video:${videoId}`),
  set: (videoId, videoData) => cacheService.set('videos', `video:${videoId}`, videoData),
  del: (videoId) => cacheService.del('videos', `video:${videoId}`),
  getOrSet: (videoId, fetchFn) => cacheService.getOrSet('videos', `video:${videoId}`, fetchFn),
  invalidateUser: (userId) => cacheService.invalidatePattern('videos', `user:${userId}`)
}

export const channelCache = {
  get: (channelId) => cacheService.get('channels', `channel:${channelId}`),
  set: (channelId, channelData) => cacheService.set('channels', `channel:${channelId}`, channelData),
  del: (channelId) => cacheService.del('channels', `channel:${channelId}`),
  getOrSet: (channelId, fetchFn) => cacheService.getOrSet('channels', `channel:${channelId}`, fetchFn)
}

export const categoryCache = {
  get: (key) => cacheService.get('categories', key),
  set: (key, data) => cacheService.set('categories', key, data),
  getOrSet: (key, fetchFn) => cacheService.getOrSet('categories', key, fetchFn)
}

export const apiCache = {
  get: (key) => cacheService.get('api', key),
  set: (key, data, ttl) => cacheService.set('api', key, data, ttl),
  getOrSet: (key, fetchFn, ttl) => cacheService.getOrSet('api', key, fetchFn, ttl)
}

export default cacheService