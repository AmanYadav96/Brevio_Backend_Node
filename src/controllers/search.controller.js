import CreatorContent, { ContentType } from '../models/creatorContent.model.js'
import User, { UserRole } from '../models/user.model.js'
import Video from '../models/video.model.js'
import { AppError } from '../utils/app-error.js'

/**
 * Universal search function that searches across short films, creators, and videos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Combined search results
 */
export const universalSearch = async (req, res) => {
  try {
    const {
      q: searchQuery = '',
      page = 1,
      limit = 10,
      type = 'all', // 'all', 'content', 'creators', 'videos'
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query

    if (!searchQuery.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      })
    }

    const searchRegex = new RegExp(searchQuery, 'i')
    const skip = (parseInt(page) - 1) * parseInt(limit)
    const limitNum = parseInt(limit)

    // Define sort options
    const sortOptions = {}
    if (sortBy === 'relevance') {
      sortOptions.views = sortOrder === 'desc' ? -1 : 1
      sortOptions.createdAt = -1
    } else if (sortBy === 'date') {
      sortOptions.createdAt = sortOrder === 'desc' ? -1 : 1
    } else if (sortBy === 'views') {
      sortOptions.views = sortOrder === 'desc' ? -1 : 1
    } else {
      sortOptions.createdAt = -1
    }

    let results = {
      shortFilms: [],
      creators: [],
      videos: [],
      totalResults: 0,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        totalPages: 0
      }
    }

    // Search short films (creator content)
    if (type === 'all' || type === 'content') {
      // Search by content fields
      const contentQuery = {
        contentType: ContentType.SHORT_FILM,
        status: 'published',
        $or: [
          { title: searchRegex },
          { description: searchRegex },
          { tags: searchRegex }
        ]
      }

      let shortFilms = await CreatorContent.find(contentQuery)
         .populate('creator', 'name username profilePicture')
         .populate('genre', 'name')
         .sort(sortOptions)
         .lean()

      // Also search by creator name and add those results
      const creatorsWithMatchingNames = await User.find({
        role: UserRole.CREATOR,
        name: searchRegex
      }).select('_id')

      if (creatorsWithMatchingNames.length > 0) {
        const creatorIds = creatorsWithMatchingNames.map(c => c._id)
        const creatorBasedContent = await CreatorContent.find({
          contentType: ContentType.SHORT_FILM,
          status: 'published',
          creator: { $in: creatorIds }
        })
        .populate('creator', 'name username profilePicture')
        .populate('genre', 'name')
        .sort(sortOptions)
        .lean()

        // Combine results and remove duplicates
        const combinedResults = [...shortFilms, ...creatorBasedContent]
        const uniqueResults = combinedResults.filter((item, index, self) => 
          index === self.findIndex(t => t._id.toString() === item._id.toString())
        )
        shortFilms = uniqueResults
      }

      // Apply pagination after combining results
      const totalShortFilms = shortFilms.length
      const paginatedShortFilms = shortFilms.slice(
        type === 'content' ? skip : 0,
        type === 'content' ? skip + limitNum : Math.ceil(limitNum / 3)
      )
      
      results.shortFilms = paginatedShortFilms
      if (type === 'content') {
        results.totalResults = totalShortFilms
        results.pagination.totalPages = Math.ceil(totalShortFilms / limitNum)
      }
    }

    // Search creators
    if (type === 'all' || type === 'creators') {
      const creatorQuery = {
        role: UserRole.CREATOR,
        $or: [
          { name: searchRegex },
          { username: searchRegex },
          { bio: searchRegex }
        ]
      }

      const [creators, creatorsCount] = await Promise.all([
        User.find(creatorQuery)
          .select('_id name username bio profilePicture createdAt')
          .sort({ createdAt: -1 })
          .skip(type === 'creators' ? skip : 0)
          .limit(type === 'creators' ? limitNum : Math.ceil(limitNum / 3))
          .lean(),
        User.countDocuments(creatorQuery)
      ])

      results.creators = creators
      if (type === 'creators') {
        results.totalResults = creatorsCount
        results.pagination.totalPages = Math.ceil(creatorsCount / limitNum)
      }
    }

    // Search videos
    if (type === 'all' || type === 'videos') {
      // Search by video content fields
      const contentVideoQuery = {
        isActive: true,
        status: 'published',
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      }

      let videos = await Video.find(contentVideoQuery)
        .populate('channel', 'name description owner')
        .populate({
          path: 'channel',
          populate: {
            path: 'owner',
            select: 'name profilePicture'
          }
        })
        .populate('genre', 'name description')
        .sort(sortOptions)
        .lean()

      // Also search by channel owner name
      const channelOwnersWithMatchingNames = await User.find({
        name: searchRegex
      }).select('_id')

      if (channelOwnersWithMatchingNames.length > 0) {
        // Find channels owned by these users
        const { Channel } = await import('../models/channel.model.js')
        const matchingChannels = await Channel.find({
          owner: { $in: channelOwnersWithMatchingNames.map(u => u._id) }
        }).select('_id')

        if (matchingChannels.length > 0) {
          const channelBasedVideos = await Video.find({
            isActive: true,
            status: 'published',
            channel: { $in: matchingChannels.map(c => c._id) }
          })
          .populate('channel', 'name description owner')
          .populate({
            path: 'channel',
            populate: {
              path: 'owner',
              select: 'name profilePicture'
            }
          })
          .populate('genre', 'name description')
          .sort(sortOptions)
          .lean()

          // Combine results and remove duplicates
          const combinedVideoResults = [...videos, ...channelBasedVideos]
          const uniqueVideoResults = combinedVideoResults.filter((item, index, self) => 
            index === self.findIndex(t => t._id.toString() === item._id.toString())
          )
          videos = uniqueVideoResults
        }
      }

      // Apply pagination after combining results
      const totalVideos = videos.length
      const paginatedVideos = videos.slice(
        type === 'videos' ? skip : 0,
        type === 'videos' ? skip + limitNum : Math.ceil(limitNum / 3)
      )

      results.videos = paginatedVideos
      if (type === 'videos') {
        results.totalResults = totalVideos
        results.pagination.totalPages = Math.ceil(totalVideos / limitNum)
      }
    }

    // Calculate total results for 'all' type
    if (type === 'all') {
      results.totalResults = results.shortFilms.length + results.creators.length + results.videos.length
      results.pagination.totalPages = Math.ceil(results.totalResults / limitNum)
    }

    return res.json({
      success: true,
      query: searchQuery,
      type,
      results,
      message: `Found ${results.totalResults} results for "${searchQuery}"`
    })

  } catch (error) {
    console.error('Universal search error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to perform search'
    })
  }
}

/**
 * Get search suggestions based on partial query
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Search suggestions
 */
export const getSearchSuggestions = async (req, res) => {
  try {
    const { q: searchQuery = '', limit = 5 } = req.query

    if (!searchQuery.trim() || searchQuery.length < 2) {
      return res.json({
        success: true,
        suggestions: []
      })
    }

    const searchRegex = new RegExp(`^${searchQuery}`, 'i')
    const limitNum = parseInt(limit)

    // Get suggestions from different sources
    const [contentSuggestions, creatorSuggestions, videoSuggestions] = await Promise.all([
      // Short film titles
      CreatorContent.find({
        contentType: 'SHORT_FILM',
        status: 'published',
        title: searchRegex
      })
        .select('title')
        .limit(limitNum)
        .lean(),
      
      // Creator names
      User.find({
        role: UserRole.CREATOR,
        $or: [
          { name: searchRegex },
          { username: searchRegex }
        ]
      })
        .select('name username')
        .limit(limitNum)
        .lean(),
      
      // Video titles
      Video.find({
        isActive: true,
        status: 'published',
        title: searchRegex
      })
        .select('title')
        .limit(limitNum)
        .lean()
    ])

    // Combine and format suggestions
    const suggestions = []
    
    contentSuggestions.forEach(content => {
      suggestions.push({
        text: content.title,
        type: 'short_film'
      })
    })
    
    creatorSuggestions.forEach(creator => {
      suggestions.push({
        text: creator.name,
        type: 'creator'
      })
      if (creator.username && creator.username !== creator.name) {
        suggestions.push({
          text: creator.username,
          type: 'creator'
        })
      }
    })
    
    videoSuggestions.forEach(video => {
      suggestions.push({
        text: video.title,
        type: 'video'
      })
    })

    // Remove duplicates and limit results
    const uniqueSuggestions = suggestions
      .filter((suggestion, index, self) => 
        index === self.findIndex(s => s.text.toLowerCase() === suggestion.text.toLowerCase())
      )
      .slice(0, limitNum)

    return res.json({
      success: true,
      suggestions: uniqueSuggestions
    })

  } catch (error) {
    console.error('Get search suggestions error:', error)
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to get search suggestions'
    })
  }
}