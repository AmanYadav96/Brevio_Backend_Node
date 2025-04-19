import Channel from "../models/channel.model.js"
import { AppError } from "../utils/app-error.js"

export const createChannel = async (c) => {
  try {
    const uploads = c.get('uploads')
    const body = await c.req.json()

    if (uploads.thumbnail) {
      body.thumbnail = uploads.thumbnail
    }

    const channel = await Channel.create(body)
    return c.json({ success: true, channel }, 201)
  } catch (error) {
    if (error.code === 11000) {
      return c.json({ 
        success: false, 
        message: `Channel with name "${error.keyValue.name}" already exists` 
      }, 400)
    }
    console.error("Create channel error:", error)
    return c.json({ success: false, message: "Failed to create channel" }, 500)
  }
}

// Remove index creation from here
export const getChannelDashboard = async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1
    const limit = 5
    const skip = (page - 1) * limit
    const search = c.req.query('search') || ''
    const status = c.req.query('status')

    // Build query
    const query = { isActive: true }
    if (search) {
      query.name = { $regex: search, $options: 'i' }
    }
    if (status) query.status = status

    // Get data with basic queries
    const [stats, channels, total] = await Promise.all([
      Channel.aggregate([
        {
          $group: {
            _id: null,
            totalChannels: { $sum: 1 },
            activeChannels: {
              $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] }
            },
            inactiveChannels: {
              $sum: { $cond: [{ $eq: ["$status", "inactive"] }, 1, 0] }
            },
            suspendedChannels: {
              $sum: { $cond: [{ $eq: ["$status", "suspended"] }, 1, 0] }
            }
          }
        }
      ]),
      Channel.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Channel.countDocuments(query)
    ])

    return c.json({
      success: true,
      stats: stats[0] || {
        totalChannels: 0,
        activeChannels: 0,
        inactiveChannels: 0,
        suspendedChannels: 0
      },
      data: {
        channels,
        pagination: {
          total,
          pages: Math.ceil(total / limit),
          page,
          limit
        }
      }
    })
  } catch (error) {
    console.error("Dashboard error:", error)
    return c.json({ success: false, message: "Failed to fetch dashboard data" }, 500)
  }
}

export const getAllChannels = async (c) => {
  try {
    const [page, search, status, type] = await Promise.all([
      parseInt(c.req.query('page')) || 1,
      c.req.query('search') || '',
      c.req.query('status'),
      c.req.query('type')
    ])

    const limit = 5
    const skip = (page - 1) * limit

    const query = { isActive: true }
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { 'owner.name': { $regex: search, $options: 'i' } }
      ]
    }
    if (status) query.status = status
    if (type) query.type = type

    const [channels, total] = await Promise.all([
      Channel.find(query)
        .select('name thumbnail status type price owner createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Channel.countDocuments(query)
    ])

    return c.json({
      success: true,
      channels,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    })
  } catch (error) {
    console.error("Get channels error:", error)
    return c.json({ success: false, message: "Failed to fetch channels" }, 500)
  }
}

export const getChannel = async (c) => {
  try {
    const channel = await Channel.findById(c.req.param("id"))
      .select('name thumbnail status type price owner createdAt updatedAt')
      .lean()

    if (!channel || !channel.isActive) {
      return c.json({ success: false, message: "Channel not found" }, 404)
    }
    return c.json({ success: true, channel })
  } catch (error) {
    console.error("Get channel error:", error)
    return c.json({ success: false, message: "Failed to fetch channel" }, 500)
  }
}

export const updateChannel = async (c) => {
  try {
    const body = await c.req.json()
    const channel = await Channel.findByIdAndUpdate(
      c.req.param("id"),
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!channel) {
      return c.json({ success: false, message: "Channel not found" }, 404)
    }
    return c.json({ success: true, channel })
  } catch (error) {
    console.error("Update channel error:", error)
    return c.json({ success: false, message: "Failed to update channel" }, 500)
  }
}

export const deleteChannel = async (c) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      c.req.param("id"),
      { isActive: false },
      { new: true }
    )
    if (!channel) {
      return c.json({ success: false, message: "Channel not found" }, 404)
    }
    return c.json({ success: true, message: "Channel deleted successfully" })
  } catch (error) {
    console.error("Delete channel error:", error)
    return c.json({ success: false, message: "Failed to delete channel" }, 500)
  }
}

export const getChannelStats = async (c) => {
  try {
    const channel = await Channel.findById(c.req.param("id"))
    if (!channel) {
      return c.json({ success: false, message: "Channel not found" }, 404)
    }
    // Add your stats calculation logic here
    return c.json({ 
      success: true, 
      stats: {
        totalSubscribers: 0,
        totalRevenue: 0,
        // Add more stats as needed
      } 
    })
  } catch (error) {
    console.error("Get channel stats error:", error)
    return c.json({ success: false, message: "Failed to fetch channel stats" }, 500)
  }
}