import Channel from "../models/channel.model.js"
import { AppError } from "../utils/app-error.js"

export const createChannel = async (req, res) => {
  try {
    const uploads = req.uploads
    const body = req.body // Get the body from request
    const user = req.user // Get the authenticated user

    if (uploads.thumbnail) {
      body.thumbnail = uploads.thumbnail.url  // Extract just the URL
    }

    // Add the owner information
    body.owner = {
      name: body.ownerName || user.name || 'Default Name', // Use provided name or user name
      email: body.ownerEmail || user.email, // Use provided email or user email
      stripeAccountId: body.stripeAccountId || 'acct_default' // Use provided stripeAccountId or a default
    }

    const channel = await Channel.create(body)
    return res.status(201).json({ success: true, channel })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: `Channel with name "${error.keyValue.name}" already exists` 
      })
    }
    console.error("Create channel error:", error)
    return res.status(500).json({ success: false, message: "Failed to create channel: " + error.message })
  }
}

// Remove index creation from here
export const getChannelDashboard = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 5
    const skip = (page - 1) * limit
    const search = req.query.search || ''
    const status = req.query.status

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

    return res.json({
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
    return res.status(500).json({ success: false, message: "Failed to fetch dashboard data" })
  }
}

export const getAllChannels = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const search = req.query.search || ''
    const status = req.query.status
    const type = req.query.type

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

    return res.json({
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
    return res.status(500).json({ success: false, message: "Failed to fetch channels" })
  }
}

export const getChannel = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
      .select('name thumbnail status type price owner createdAt updatedAt')
      .lean()

    if (!channel || !channel.isActive) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }
    return res.json({ success: true, channel })
  } catch (error) {
    console.error("Get channel error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch channel" })
  }
}

export const updateChannel = async (req, res) => {
  try {
    const body = req.body
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }
    return res.json({ success: true, channel })
  } catch (error) {
    console.error("Update channel error:", error)
    return res.status(500).json({ success: false, message: "Failed to update channel" })
  }
}

export const deleteChannel = async (req, res) => {
  try {
    const channel = await Channel.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }
    return res.json({ success: true, message: "Channel deleted successfully" })
  } catch (error) {
    console.error("Delete channel error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete channel" })
  }
}

export const getChannelStats = async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.id)
    if (!channel) {
      return res.status(404).json({ success: false, message: "Channel not found" })
    }
    // Add your stats calculation logic here
    return res.json({ 
      success: true, 
      stats: {
        totalSubscribers: 0,
        totalRevenue: 0,
        // Add more stats as needed
      } 
    })
  } catch (error) {
    console.error("Get channel stats error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch channel stats" })
  }
}