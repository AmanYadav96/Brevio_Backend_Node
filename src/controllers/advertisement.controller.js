import Advertisement from "../models/advertisement.model.js"

export const createAdvertisement = async (req, res) => {
  try {
    const uploads = req.uploads
    const body = req.body

    if (uploads.thumbnail) {
      body.thumbnail = uploads.thumbnail
    }
    if (uploads.videoFile) {
      body.videoUrl = uploads.videoFile
      body.duration = uploads.duration || 0
    }

    const advertisement = await Advertisement.create(body)
    return res.status(201).json({ success: true, advertisement })
  } catch (error) {
    console.error("Create advertisement error:", error)
    return res.status(500).json({ success: false, message: "Failed to create advertisement" })
  }
}

export const getAllAdvertisements = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = 10
    const skip = (page - 1) * limit
    const status = req.query.status
    const deviceType = req.query.deviceType

    const query = { isActive: true }
    if (status) query.status = status
    if (deviceType) query.deviceType = deviceType

    const [advertisements, total] = await Promise.all([
      Advertisement.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Advertisement.countDocuments(query)
    ])

    return res.json({
      success: true,
      advertisements,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit
      }
    })
  } catch (error) {
    console.error("Get advertisements error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch advertisements" })
  }
}

// Get advertisement by ID
export const getAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(req.params.id)
    
    if (!advertisement || !advertisement.isActive) {
      return res.status(404).json({ success: false, message: "Advertisement not found" })
    }
    
    return res.json({ success: true, advertisement })
  } catch (error) {
    console.error("Get advertisement by ID error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch advertisement" })
  }
}

export const updateAdvertisement = async (req, res) => {
  try {
    const body = req.body
    const advertisement = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" })
    }
    return res.json({ success: true, advertisement })
  } catch (error) {
    console.error("Update advertisement error:", error)
    return res.status(500).json({ success: false, message: "Failed to update advertisement" })
  }
}

export const deleteAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!advertisement) {
      return res.status(404).json({ success: false, message: "Advertisement not found" })
    }
    return res.json({ success: true, message: "Advertisement deleted successfully" })
  } catch (error) {
    console.error("Delete advertisement error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete advertisement" })
  }
}