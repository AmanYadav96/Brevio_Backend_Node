import Advertisement from "../models/advertisement.model.js"

export const createAdvertisement = async (c) => {
  try {
    const uploads = c.get('uploads')
    const body = await c.req.json()

    if (uploads.thumbnail) {
      body.thumbnail = uploads.thumbnail
    }
    if (uploads.videoFile) {
      body.videoUrl = uploads.videoFile
      body.duration = uploads.duration || 0
    }

    const advertisement = await Advertisement.create(body)
    return c.json({ success: true, advertisement }, 201)
  } catch (error) {
    console.error("Create advertisement error:", error)
    return c.json({ success: false, message: "Failed to create advertisement" }, 500)
  }
}

export const getAllAdvertisements = async (c) => {
  try {
    const page = parseInt(c.req.query('page')) || 1
    const limit = 10
    const skip = (page - 1) * limit
    const status = c.req.query('status')
    const deviceType = c.req.query('deviceType')

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

    return c.json({
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
    return c.json({ success: false, message: "Failed to fetch advertisements" }, 500)
  }
}

export const updateAdvertisement = async (c) => {
  try {
    const body = await c.req.json()
    const advertisement = await Advertisement.findByIdAndUpdate(
      c.req.param("id"),
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!advertisement) {
      return c.json({ success: false, message: "Advertisement not found" }, 404)
    }
    return c.json({ success: true, advertisement })
  } catch (error) {
    console.error("Update advertisement error:", error)
    return c.json({ success: false, message: "Failed to update advertisement" }, 500)
  }
}

export const deleteAdvertisement = async (c) => {
  try {
    const advertisement = await Advertisement.findByIdAndUpdate(
      c.req.param("id"),
      { isActive: false },
      { new: true }
    )
    if (!advertisement) {
      return c.json({ success: false, message: "Advertisement not found" }, 404)
    }
    return c.json({ success: true, message: "Advertisement deleted successfully" })
  } catch (error) {
    console.error("Delete advertisement error:", error)
    return c.json({ success: false, message: "Failed to delete advertisement" }, 500)
  }
}