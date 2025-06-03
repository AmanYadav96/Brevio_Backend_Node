import SubscriptionPlan from "../models/subscription.model.js"
import { AppError } from "../utils/app-error.js"

export const createPlan = async (req, res) => {
  try {
    const body = req.body
    const plan = await SubscriptionPlan.create(body)
    return res.status(201).json({ success: true, plan })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: `Plan with name "${error.keyValue.name}" already exists` 
      })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors).map(err => err.message).join(", ") 
      })
    }
    console.error("Create plan error:", error)
    return res.status(500).json({ success: false, message: "Failed to create plan" })
  }
}

export const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
    return res.json({ success: true, plans })
  } catch (error) {
    console.error("Get all plans error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch plans" })
  }
}

export const getPlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findById(req.params.id)
    if (!plan || !plan.isActive) {
      return res.status(404).json({ success: false, message: "Plan not found" })
    }
    return res.json({ success: true, plan })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid plan ID" })
    }
    console.error("Get plan error:", error)
    return res.status(500).json({ success: false, message: "Failed to fetch plan" })
  }
}

export const updatePlan = async (req, res) => {
  try {
    const body = req.body
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" })
    }
    return res.json({ success: true, plan })
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ 
        success: false, 
        message: `Plan with name "${error.keyValue.name}" already exists` 
      })
    }
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid plan ID" })
    }
    if (error.name === "ValidationError") {
      return res.status(400).json({ 
        success: false, 
        message: Object.values(error.errors).map(err => err.message).join(", ") 
      })
    }
    console.error("Update plan error:", error)
    return res.status(500).json({ success: false, message: "Failed to update plan" })
  }
}

export const deletePlan = async (req, res) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    )
    if (!plan) {
      return res.status(404).json({ success: false, message: "Plan not found" })
    }
    return res.json({ success: true, message: "Plan deleted successfully" })
  } catch (error) {
    if (error.name === "CastError") {
      return res.status(400).json({ success: false, message: "Invalid plan ID" })
    }
    console.error("Delete plan error:", error)
    return res.status(500).json({ success: false, message: "Failed to delete plan" })
  }
}