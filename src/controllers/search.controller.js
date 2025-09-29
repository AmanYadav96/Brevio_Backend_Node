import CreatorContent, { ContentType } from '../models/creatorContent.model.js'
import User, { UserRole } from '../models/user.model.js'
import Video from '../models/video.model.js'
import Channel from '../models/channel.model.js'
import { AppError } from '../utils/app-error.js'

/**
 * Universal search function that searches across short films, creators, and videos
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @returns {Object} Combined search results
 */
export const universalSearch = async (req, res) => {
  try {
    console.log('🔍 SEARCH API CALLED - Starting universal search');
    console.log('🚀 Server restarted - ready to process searches with shorts support');
    const {
      q: searchQuery = '',
      page = 1,
      limit = 10,
      type = 'all', // 'all', 'content', 'creators', 'videos'
      sortBy = 'relevance',
      sortOrder = 'desc'
    } = req.query
    console.log('📝 Search Parameters:', { searchQuery, type, page, limit, sortBy, sortOrder });

    if (!searchQuery.trim()) {
      console.log('❌ Search query is empty');
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      })
    }

    console.log('✅ Search query validation passed');
    console.log('🔤 Search query length:', searchQuery.length);

    const searchRegex = new RegExp(searchQuery, 'i')
    console.log('🔍 Created search regex:', searchRegex);
    
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
    console.log('📊 Pagination settings:', { skip, limitNum, sortOptions });

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
    console.log('📋 Initialized results object');

    // Search short films (creator content)
    if (type === 'all' || type === 'content' || type === 'shorts') {
      console.log('🎬 Starting content search...');
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
      console.log('🔍 Content query:', JSON.stringify(contentQuery, null, 2));

      console.log('🚀 Executing content aggregation pipeline...');
      let shortFilms = await CreatorContent.aggregate([
        {
          $match: contentQuery
        },
        {
          $lookup: {
            from: 'users',
            localField: 'creator',
            foreignField: '_id',
            as: 'creator',
            pipeline: [{ $project: { name: 1, username: 1, profilePicture: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'genres',
            localField: 'genre',
            foreignField: '_id',
            as: 'genre',
            pipeline: [{ $project: { name: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'contentId',
            as: 'likes'
          }
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'contentId',
            as: 'comments',
            pipeline: [{ $match: { status: 'active' } }]
          }
        },
        {
          $addFields: {
            creator: { $arrayElemAt: ['$creator', 0] },
            genre: { $arrayElemAt: ['$genre', 0] },
            likesCount: { $size: '$likes' },
            commentsCount: { $size: '$comments' }
          }
        },
        {
          $project: {
            likes: 0,
            comments: 0
          }
        },
        { $sort: sortOptions }
      ])
      console.log('📊 Content search results count:', shortFilms.length);

      // Also search by creator name and add those results
      console.log('👤 Searching for creators with matching names...');
      const creatorsWithMatchingNames = await User.find({
        role: UserRole.CREATOR,
        name: searchRegex
      }).select('_id')
      console.log('👥 Found creators with matching names:', creatorsWithMatchingNames.length);

      if (creatorsWithMatchingNames.length > 0) {
        const creatorIds = creatorsWithMatchingNames.map(c => c._id)
        console.log('🔍 Searching content by creator IDs:', creatorIds.length);
        const creatorBasedContent = await CreatorContent.aggregate([
          {
            $match: {
              contentType: ContentType.SHORT_FILM,
              status: 'published',
              creator: { $in: creatorIds }
            }
          },
          {
            $lookup: {
              from: 'users',
              localField: 'creator',
              foreignField: '_id',
              as: 'creator',
              pipeline: [{ $project: { name: 1, username: 1, profilePicture: 1 } }]
            }
          },
          {
            $lookup: {
              from: 'genres',
              localField: 'genre',
              foreignField: '_id',
              as: 'genre',
              pipeline: [{ $project: { name: 1 } }]
            }
          },
          {
            $lookup: {
              from: 'likes',
              localField: '_id',
              foreignField: 'contentId',
              as: 'likes'
            }
          },
          {
            $lookup: {
              from: 'comments',
              localField: '_id',
              foreignField: 'contentId',
              as: 'comments',
              pipeline: [{ $match: { status: 'active' } }]
            }
          },
          {
            $addFields: {
              creator: { $arrayElemAt: ['$creator', 0] },
              genre: { $arrayElemAt: ['$genre', 0] },
              likesCount: { $size: '$likes' },
              commentsCount: { $size: '$comments' }
            }
          },
          {
            $project: {
              likes: 0,
              comments: 0
            }
          },
          { $sort: sortOptions }
        ])
        console.log('📊 Creator-based content results:', creatorBasedContent.length);

        // Combine results and remove duplicates
        console.log('🔄 Combining results: direct matches + creator-based matches');
        const combinedResults = [...shortFilms, ...creatorBasedContent]
        const uniqueResults = combinedResults.filter((item, index, self) => 
          index === self.findIndex(t => t._id.toString() === item._id.toString())
        )
        shortFilms = uniqueResults
        console.log('✅ Final combined short films count:', shortFilms.length);
      } else {
        console.log('✅ Final short films count (direct matches only):', shortFilms.length);
      }

      // Apply pagination after combining results
      const totalShortFilms = shortFilms.length
      const paginatedShortFilms = shortFilms.slice(
        (type === 'content' || type === 'shorts') ? skip : 0,
        (type === 'content' || type === 'shorts') ? skip + limitNum : Math.ceil(limitNum / 3)
      )
      
      results.shortFilms = paginatedShortFilms
      if (type === 'content' || type === 'shorts') {
        results.totalResults = totalShortFilms
        results.pagination.totalPages = Math.ceil(totalShortFilms / limitNum)
      }
    }

    // Search creators
    if (type === 'all' || type === 'creators') {
      console.log('👥 Starting creators search...');
      const creatorQuery = {
        role: UserRole.CREATOR,
        $or: [
          { name: searchRegex },
          { username: searchRegex },
          { bio: searchRegex }
        ]
      }
      console.log('🔍 Creator query:', JSON.stringify(creatorQuery, null, 2));

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
      console.log('🎥 Starting videos search...');
      // Search by video content fields
      const contentVideoQuery = {
        isActive: true,
        status: 'published',
        $or: [
          { title: searchRegex },
          { description: searchRegex }
        ]
      }
      console.log('🔍 Video query:', JSON.stringify(contentVideoQuery, null, 2));

      console.log('🚀 Executing video aggregation pipeline...');
      let videos = await Video.aggregate([
        {
          $match: contentVideoQuery
        },
        {
          $lookup: {
            from: 'channels',
            localField: 'channel',
            foreignField: '_id',
            as: 'channel',
            pipeline: [
              {
                $lookup: {
                  from: 'users',
                  localField: 'owner',
                  foreignField: '_id',
                  as: 'owner',
                  pipeline: [{ $project: { name: 1, profilePicture: 1 } }]
                }
              },
              {
                $addFields: {
                  owner: { $arrayElemAt: ['$owner', 0] }
                }
              },
              { $project: { name: 1, description: 1, owner: 1 } }
            ]
          }
        },
        {
          $lookup: {
            from: 'genres',
            localField: 'genre',
            foreignField: '_id',
            as: 'genre',
            pipeline: [{ $project: { name: 1, description: 1 } }]
          }
        },
        {
          $lookup: {
            from: 'likes',
            localField: '_id',
            foreignField: 'videoId',
            as: 'likes'
          }
        },
        {
          $lookup: {
            from: 'comments',
            localField: '_id',
            foreignField: 'videoId',
            as: 'comments',
            pipeline: [{ $match: { status: 'active' } }]
          }
        },
        {
          $addFields: {
            channel: { $arrayElemAt: ['$channel', 0] },
            genre: { $arrayElemAt: ['$genre', 0] },
            likesCount: { $size: '$likes' },
            commentsCount: { $size: '$comments' }
          }
        },
        {
          $project: {
            likes: 0,
            comments: 0
          }
        },
        { $sort: sortOptions }
      ])
      console.log('📊 Video search results count:', videos.length);

      // Also search by channel owner name
      console.log('👤 Searching for channel owners with matching names...');
      const channelOwnersWithMatchingNames = await User.find({
        name: searchRegex
      }).select('_id')
      console.log('👥 Found channel owners with matching names:', channelOwnersWithMatchingNames.length);

      if (channelOwnersWithMatchingNames.length > 0) {
        // Find channels owned by these users
        const matchingChannels = await Channel.find({
          owner: { $in: channelOwnersWithMatchingNames.map(u => u._id) }
        }).select('_id')
        console.log('📺 Found matching channels:', matchingChannels.length);

        if (matchingChannels.length > 0) {
          console.log('🔍 Searching videos by channel IDs...');
          const channelBasedVideos = await Video.aggregate([
            {
              $match: {
                isActive: true,
                status: 'published',
                channel: { $in: matchingChannels.map(c => c._id) }
              }
            },
            {
              $lookup: {
                from: 'channels',
                localField: 'channel',
                foreignField: '_id',
                as: 'channel',
                pipeline: [
                  {
                    $lookup: {
                      from: 'users',
                      localField: 'owner',
                      foreignField: '_id',
                      as: 'owner',
                      pipeline: [{ $project: { name: 1, profilePicture: 1 } }]
                    }
                  },
                  {
                    $addFields: {
                      owner: { $arrayElemAt: ['$owner', 0] }
                    }
                  },
                  { $project: { name: 1, description: 1, owner: 1 } }
                ]
              }
            },
            {
              $lookup: {
                from: 'genres',
                localField: 'genre',
                foreignField: '_id',
                as: 'genre',
                pipeline: [{ $project: { name: 1, description: 1 } }]
              }
            },
            {
              $lookup: {
                from: 'likes',
                localField: '_id',
                foreignField: 'videoId',
                as: 'likes'
              }
            },
            {
              $lookup: {
                from: 'comments',
                localField: '_id',
                foreignField: 'videoId',
                as: 'comments',
                pipeline: [{ $match: { isActive: true } }]
              }
            },
            {
              $addFields: {
                channel: { $arrayElemAt: ['$channel', 0] },
                genre: { $arrayElemAt: ['$genre', 0] },
                likesCount: { $size: '$likes' },
                commentsCount: { $size: '$comments' }
              }
            },
            {
              $project: {
                likes: 0,
                comments: 0
              }
            },
            { $sort: sortOptions }
          ])
          console.log('📊 Channel-based video results:', channelBasedVideos.length);

          // Combine results and remove duplicates
          console.log('🔄 Combining video results: direct matches + channel-based matches');
          const combinedVideoResults = [...videos, ...channelBasedVideos]
          const uniqueVideoResults = combinedVideoResults.filter((item, index, self) => 
            index === self.findIndex(t => t._id.toString() === item._id.toString())
          )
          videos = uniqueVideoResults
          console.log('✅ Final combined videos count:', videos.length);
        } else {
          console.log('✅ Final videos count (direct matches only):', videos.length);
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