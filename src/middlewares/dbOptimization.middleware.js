import cacheService, { userCache, videoCache, channelCache, categoryCache, apiCache } from '../services/cache.service.js'
import { getConnectionStats } from '../config/database.js'

// Database optimization middleware for caching and performance
export const dbOptimizationMiddleware = (options = {}) => {
  const {
    cacheType = 'api',
    ttl = 300, // 5 minutes default
    keyGenerator = null,
    skipCache = false,
    invalidateOnMutation = true
  } = options

  return async (req, res, next) => {
    // Skip caching for mutations (POST, PUT, DELETE, PATCH) unless specified
    if (skipCache || (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && !options.cacheWrites)) {
      return next()
    }

    // Generate cache key
    const cacheKey = keyGenerator ? 
      keyGenerator(req) : 
      `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`

    try {
      // Try to get from cache first
      const cachedData = cacheService.get(cacheType, cacheKey)
      
      if (cachedData) {
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': ttl
        })
        
        return res.json(cachedData)
      }

      // If not in cache, continue to controller
      res.set('X-Cache', 'MISS')
      
      // Override res.json to cache the response
      const originalJson = res.json
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          cacheService.set(cacheType, cacheKey, data, ttl)
          res.set('X-Cache-Stored', 'true')
        }
        
        return originalJson.call(this, data)
      }

      next()
    } catch (error) {
      console.error('Cache middleware error:', error)
      next() // Continue without caching on error
    }
  }
}

// Specific caching middleware for different endpoints
export const userCacheMiddleware = dbOptimizationMiddleware({
  cacheType: 'users',
  ttl: 900, // 15 minutes
  keyGenerator: (req) => `user:${req.params.id || req.user?.id}:${req.originalUrl}`
})

export const videoCacheMiddleware = dbOptimizationMiddleware({
  cacheType: 'videos',
  ttl: 1800, // 30 minutes
  keyGenerator: (req) => `video:${req.params.id}:${req.query.quality || 'default'}`
})

export const channelCacheMiddleware = dbOptimizationMiddleware({
  cacheType: 'channels',
  ttl: 3600, // 1 hour
  keyGenerator: (req) => `channel:${req.params.id}:${req.originalUrl}`
})

export const categoryCacheMiddleware = dbOptimizationMiddleware({
  cacheType: 'categories',
  ttl: 86400, // 24 hours
  keyGenerator: (req) => `categories:${req.originalUrl}:${req.query.lang || 'en'}`
})

// Special caching middleware for creator content with shuffle logic
export const creatorContentCacheMiddleware = (options = {}) => {
  const {
    cacheType = 'api',
    ttl = 300, // 5 minutes default
    keyGenerator = null,
    skipCache = false
  } = options

  return async (req, res, next) => {
    // Skip caching for mutations
    if (skipCache || ['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
      return next()
    }

    // Generate cache key (exclude shuffle from key since we want to cache base data)
    const baseKey = keyGenerator ? 
      keyGenerator(req) : 
      `${req.method}:${req.originalUrl}:${JSON.stringify(req.query)}:${req.user?.id || 'anonymous'}`
    
    // Remove any shuffle-related params from cache key to cache base data
    const cacheKey = baseKey.replace(/shuffle[^&]*&?/g, '').replace(/&&/g, '&')

    try {
      // Try to get from cache first
      const cachedData = cacheService.get(cacheType, cacheKey)
      
      if (cachedData) {
        // Apply shuffle logic to cached data if it contains content array
        let responseData = { ...cachedData }
        if (responseData.content && Array.isArray(responseData.content)) {
          // Apply the same shuffle logic as in the controller
          responseData.content = [...responseData.content].sort(() => Math.random() - 0.5)
        }
        
        // Add cache headers
        res.set({
          'X-Cache': 'HIT',
          'X-Cache-Key': cacheKey,
          'X-Cache-TTL': ttl,
          'X-Shuffle-Applied': 'true'
        })
        
        return res.json(responseData)
      }

      // If not in cache, continue to controller
      res.set('X-Cache', 'MISS')
      
      // Override res.json to cache the response (before shuffle)
      const originalJson = res.json
      res.json = function(data) {
        // Only cache successful responses
        if (res.statusCode >= 200 && res.statusCode < 300) {
          // Cache the data before any client-side modifications
          let dataToCache = { ...data }
          
          // If this is creator content with shuffled data, cache the original order
          // We'll re-shuffle on each request from cache
          cacheService.set(cacheType, cacheKey, dataToCache, ttl)
          res.set('X-Cache-Stored', 'true')
        }
        
        return originalJson.call(this, data)
      }

      next()
    } catch (error) {
      console.error('Creator content cache middleware error:', error)
      next() // Continue without caching on error
    }
  }
}

// Cache invalidation middleware for mutations
export const cacheInvalidationMiddleware = (options = {}) => {
  const { patterns = [], cacheTypes = ['api'] } = options

  return async (req, res, next) => {
    // Override res.json to invalidate cache after successful mutations
    const originalJson = res.json
    res.json = function(data) {
      // Only invalidate on successful mutations
      if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && 
          res.statusCode >= 200 && res.statusCode < 300) {
        
        // Invalidate specific patterns
        patterns.forEach(pattern => {
          cacheTypes.forEach(cacheType => {
            const invalidatedCount = cacheService.invalidatePattern(cacheType, pattern)
            console.log(`🔄 Invalidated ${invalidatedCount} cache entries for pattern: ${pattern}`)
          })
        })
        
        // Auto-invalidate based on route
        const routePatterns = extractPatternsFromRoute(req)
        routePatterns.forEach(pattern => {
          cacheTypes.forEach(cacheType => {
            cacheService.invalidatePattern(cacheType, pattern)
          })
        })
      }
      
      return originalJson.call(this, data)
    }

    next()
  }
}

// Extract cache invalidation patterns from route
function extractPatternsFromRoute(req) {
  const patterns = []
  const { originalUrl, params } = req
  
  // Extract entity type and ID from URL
  if (originalUrl.includes('/users/') && params.id) {
    patterns.push(`user:${params.id}`)
  }
  
  if (originalUrl.includes('/videos/') && params.id) {
    patterns.push(`video:${params.id}`)
    if (req.user?.id) {
      patterns.push(`user:${req.user.id}`) // Invalidate user's video lists
    }
  }
  
  if (originalUrl.includes('/channels/') && params.id) {
    patterns.push(`channel:${params.id}`)
  }
  
  if (originalUrl.includes('/categories/')) {
    patterns.push('categories')
  }
  
  return patterns
}

// Database connection monitoring middleware
export const dbMonitoringMiddleware = (req, res, next) => {
  // Add database stats to response headers (for debugging)
  if (process.env.NODE_ENV === 'development') {
    const stats = getConnectionStats()
    res.set({
      'X-DB-State': stats.currentState,
      'X-DB-Host': stats.host,
      'X-DB-Errors': stats.connectionErrors
    })
  }
  
  next()
}

// Query optimization helper
export const optimizeQuery = (query, options = {}) => {
  const {
    lean = true,
    select = null,
    limit = 100,
    sort = null,
    populate = null
  } = options

  // Apply lean for better performance (returns plain objects)
  if (lean) {
    query = query.lean()
  }

  // Apply field selection
  if (select) {
    query = query.select(select)
  }

  // Apply limit to prevent large result sets
  if (limit) {
    query = query.limit(limit)
  }

  // Apply sorting
  if (sort) {
    query = query.sort(sort)
  }

  // Apply population with field selection
  if (populate) {
    if (Array.isArray(populate)) {
      populate.forEach(pop => query = query.populate(pop))
    } else {
      query = query.populate(populate)
    }
  }

  return query
}

// Batch operation helper to reduce database round trips
export const batchOperations = {
  // Batch find operations
  async batchFind(Model, ids, options = {}) {
    const cacheKey = `batch:${Model.modelName}:${ids.sort().join(',')}`
    
    return await cacheService.getOrSet('api', cacheKey, async () => {
      const query = Model.find({ _id: { $in: ids } })
      return await optimizeQuery(query, options).exec()
    }, 300) // 5 minutes cache
  },

  // Batch aggregation operations
  async batchAggregate(Model, pipelines, cacheKey, ttl = 600) {
    return await cacheService.getOrSet('api', cacheKey, async () => {
      return await Model.aggregate(pipelines).exec()
    }, ttl)
  }
}

// User Profile Cache Middleware - Short TTL for live data
export const userProfileCacheMiddleware = (ttl = 300) => { // 5 minutes default
  return async (req, res, next) => {
    const userId = req.user?._id;
    if (!userId) return next();
    
    const cacheKey = `user_profile_${userId}`;
    
    try {
      // Check cache first
      const cachedData = userCache.get(cacheKey);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', userCache.getTtl(cacheKey));
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }
      
      // Override res.json to cache successful responses
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data.success) {
          userCache.set(cacheKey, data, ttl);
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-TTL', ttl);
          res.setHeader('X-Cache-Key', cacheKey);
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('User profile cache error:', error);
      next();
    }
  };
};

// Real-time Data Middleware - No caching for live data
export const realTimeDataMiddleware = () => {
  return async (req, res, next) => {
    // Add headers to indicate no caching
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('X-Cache', 'BYPASS');
    next();
  };
};

// Analytics Data Cache Middleware - Medium TTL
export const analyticsCacheMiddleware = (ttl = 600) => { // 10 minutes default
  return async (req, res, next) => {
    const userId = req.user?._id;
    const queryParams = JSON.stringify(req.query);
    const cacheKey = `analytics_${req.route.path}_${userId}_${Buffer.from(queryParams).toString('base64')}`;
    
    try {
      const cachedData = apiCache.get(cacheKey);
      if (cachedData) {
        res.setHeader('X-Cache', 'HIT');
        res.setHeader('X-Cache-TTL', apiCache.getTtl(cacheKey));
        res.setHeader('X-Cache-Key', cacheKey);
        return res.json(cachedData);
      }
      
      const originalJson = res.json;
      res.json = function(data) {
        if (res.statusCode === 200 && data.success) {
          apiCache.set(cacheKey, data, ttl);
          res.setHeader('X-Cache', 'MISS');
          res.setHeader('X-Cache-TTL', ttl);
          res.setHeader('X-Cache-Key', cacheKey);
        }
        return originalJson.call(this, data);
      };
      
      next();
    } catch (error) {
      console.error('Analytics cache error:', error);
      next();
    }
  };
};

export default {
  dbOptimizationMiddleware,
  userCacheMiddleware,
  videoCacheMiddleware,
  channelCacheMiddleware,
  categoryCacheMiddleware,
  creatorContentCacheMiddleware,
  cacheInvalidationMiddleware,
  dbMonitoringMiddleware,
  optimizeQuery,
  batchOperations,
  userProfileCacheMiddleware,
  realTimeDataMiddleware,
  analyticsCacheMiddleware
}