# Cache Implementation Examples

This document provides practical examples of how to implement caching for different types of APIs in the Brevio backend.

## 1. User Profile API (Live Data with Short TTL)

### Implementation
```javascript
// routes/user.routes.js
router.get('/profile', protect, userProfileCacheMiddleware(300), getUserProfile); // 5 min cache
```

### Cache Invalidation
```javascript
// controllers/user.controller.js
export const updateUserProfile = async (req, res) => {
  try {
    // ... update logic ...
    
    // Invalidate cache after successful update
    const cacheKey = `user_profile_${userId}`;
    cache.users.del(cacheKey);
    
    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    // ... error handling ...
  }
};
```

### Why This Approach?
- **Short TTL (5 minutes)**: User profiles don't change frequently, but when they do, users expect to see updates quickly
- **Cache Invalidation**: Immediately clear cache when profile is updated
- **Performance Benefit**: Reduces database load for frequently accessed profile data

## 2. Real-Time Data APIs (No Caching)

### Examples of Real-Time Data
- Payment status checks
- Live chat messages
- Real-time notifications
- Security-sensitive operations

### Implementation
```javascript
// routes/payment.routes.js
router.get('/status/:paymentId', protect, realTimeDataMiddleware(), getPaymentStatus);

// routes/chat.routes.js
router.get('/messages/:chatId', protect, realTimeDataMiddleware(), getChatMessages);

// routes/auth.routes.js
router.delete('/logout', protect, realTimeDataMiddleware(), logout);
```

### Headers Set by realTimeDataMiddleware
```
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
X-Cache: BYPASS
```

## 3. Analytics and Dashboard Data (Medium TTL)

### Implementation
```javascript
// routes/analytics.routes.js
router.get('/dashboard', protect, analyticsCacheMiddleware(600), getDashboardStats); // 10 min cache
router.get('/revenue', protect, analyticsCacheMiddleware(900), getRevenueStats); // 15 min cache

// routes/user.routes.js (Admin)
router.get('/stats', restrictTo('admin'), analyticsCacheMiddleware(600), getUserStats);
```

### Why Medium TTL?
- Analytics data is aggregated and doesn't need to be real-time
- Users can tolerate slight delays in dashboard updates
- Significant performance improvement for expensive aggregation queries

## 4. Content Lists with Special Logic (Custom Middleware)

### Creator Content with Shuffle
```javascript
// routes/creatorContent.routes.js
router.get('/', protect, creatorContentCacheMiddleware(600), getAllContent);
```

### Custom Middleware Implementation
```javascript
export const creatorContentCacheMiddleware = (ttl = 600) => {
  return async (req, res, next) => {
    // ... cache check logic ...
    
    // Apply shuffle to cached data
    if (cachedData && cachedData.content) {
      cachedData.content.sort(() => Math.random() - 0.5);
      res.setHeader('X-Shuffle-Applied', 'true');
    }
    
    // ... rest of middleware ...
  };
};
```

## 5. Static/Semi-Static Data (Long TTL)

### Examples
- Categories and tags
- Channel information
- System configuration

### Implementation
```javascript
// routes/category.routes.js
router.get('/', categoryCacheMiddleware(1800), getAllCategories); // 30 min cache

// routes/channel.routes.js
router.get('/:id', channelCacheMiddleware(900), getChannelInfo); // 15 min cache
```

## 6. Cache Strategy Decision Tree

```
Is the data security-sensitive or payment-related?
├── YES → Use realTimeDataMiddleware() (No caching)
└── NO → Continue

Does the data change frequently (multiple times per minute)?
├── YES → Use realTimeDataMiddleware() (No caching)
└── NO → Continue

Is it user-specific data that may change?
├── YES → Use userProfileCacheMiddleware(300) (5 min TTL)
└── NO → Continue

Is it analytics/aggregated data?
├── YES → Use analyticsCacheMiddleware(600) (10 min TTL)
└── NO → Continue

Is it static/semi-static content?
├── YES → Use appropriate cache middleware (15-30 min TTL)
└── NO → Evaluate case-by-case
```

## 7. Cache Headers Reference

### Cache Hit Response
```
X-Cache: HIT
X-Cache-TTL: 245
X-Cache-Key: user_profile_12345
```

### Cache Miss Response
```
X-Cache: MISS
X-Cache-TTL: 300
X-Cache-Key: user_profile_12345
```

### No Cache Response
```
X-Cache: BYPASS
Cache-Control: no-cache, no-store, must-revalidate
Pragma: no-cache
Expires: 0
```

## 8. Testing Cache Implementation

### Manual Testing
```bash
# Test cache hit/miss
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/users/profile
# Check X-Cache header in response

# Test cache invalidation
curl -X PATCH -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"name":"Updated Name"}' \
     http://localhost:5000/api/users/profile

# Verify cache was cleared
curl -H "Authorization: Bearer <token>" http://localhost:5000/api/users/profile
# Should show X-Cache: MISS
```

### Automated Testing
```javascript
// test/cache.test.js
describe('User Profile Caching', () => {
  it('should cache user profile data', async () => {
    const response1 = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response1.headers['x-cache']).toBe('MISS');
    
    const response2 = await request(app)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${token}`);
    
    expect(response2.headers['x-cache']).toBe('HIT');
  });
  
  it('should invalidate cache on profile update', async () => {
    // ... test implementation ...
  });
});
```

## 9. Monitoring and Alerting

### Key Metrics to Track
```javascript
// Cache hit ratio calculation
const cacheHitRatio = (cacheHits / (cacheHits + cacheMisses)) * 100;

// Alert if hit ratio drops below 70%
if (cacheHitRatio < 70) {
  console.warn(`Low cache hit ratio: ${cacheHitRatio}%`);
}
```

### Cache Statistics Endpoint
```javascript
// routes/admin.routes.js
router.get('/cache/stats', restrictTo('admin'), getCacheStats);

// controllers/admin.controller.js
export const getCacheStats = async (req, res) => {
  const stats = {
    users: cache.users.getStats(),
    content: cache.videos.getStats(),
    api: cache.api.getStats()
  };
  
  res.json({ success: true, stats });
};
```

## 10. Best Practices Summary

1. **Always include cache headers** for debugging and monitoring
2. **Implement proper error handling** - cache failures shouldn't break functionality
3. **Use appropriate TTL values** based on data update frequency
4. **Implement cache invalidation** for data that changes
5. **Monitor cache performance** with hit/miss ratios
6. **Test cache behavior** in your test suite
7. **Document cache strategies** for each endpoint
8. **Consider memory usage** and implement cache size limits
9. **Use user-specific cache keys** to prevent data leakage
10. **Never cache sensitive data** like passwords or tokens

This approach ensures optimal performance while maintaining data freshness and security requirements.