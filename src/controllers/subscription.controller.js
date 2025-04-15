import SubscriptionPlan from "../models/subscription.model.js"
import { AppError } from "../utils/app-error.js"

export const createPlan = async (c) => {
  try {
    const body = await c.req.json()
    const plan = await SubscriptionPlan.create(body)
    return c.json({ success: true, plan }, 201)
  } catch (error) {
    if (error.code === 11000) {
      return c.json({ 
        success: false, 
        message: `Plan with name "${error.keyValue.name}" already exists` 
      }, 400)
    }
    if (error.name === "ValidationError") {
      return c.json({ 
        success: false, 
        message: Object.values(error.errors).map(err => err.message).join(", ") 
      }, 400)
    }
    console.error("Create plan error:", error)
    return c.json({ success: false, message: "Failed to create plan" }, 500)
  }
}

export const getAllPlans = async (c) => {
  try {
    const plans = await SubscriptionPlan.find({ isActive: true })
    return c.json({ success: true, plans })
  } catch (error) {
    console.error("Get all plans error:", error)
    return c.json({ success: false, message: "Failed to fetch plans" }, 500)
  }
}

export const getPlan = async (c) => {
  try {
    const plan = await SubscriptionPlan.findById(c.req.param("id"))
    if (!plan || !plan.isActive) {
      return c.json({ success: false, message: "Plan not found" }, 404)
    }
    return c.json({ success: true, plan })
  } catch (error) {
    if (error.name === "CastError") {
      return c.json({ success: false, message: "Invalid plan ID" }, 400)
    }
    console.error("Get plan error:", error)
    return c.json({ success: false, message: "Failed to fetch plan" }, 500)
  }
}

export const updatePlan = async (c) => {
  try {
    const body = await c.req.json()
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      c.req.param("id"),
      { $set: body },
      { new: true, runValidators: true }
    )
    if (!plan) {
      return c.json({ success: false, message: "Plan not found" }, 404)
    }
    return c.json({ success: true, plan })
  } catch (error) {
    if (error.code === 11000) {
      return c.json({ 
        success: false, 
        message: `Plan with name "${error.keyValue.name}" already exists` 
      }, 400)
    }
    if (error.name === "CastError") {
      return c.json({ success: false, message: "Invalid plan ID" }, 400)
    }
    if (error.name === "ValidationError") {
      return c.json({ 
        success: false, 
        message: Object.values(error.errors).map(err => err.message).join(", ") 
      }, 400)
    }
    console.error("Update plan error:", error)
    return c.json({ success: false, message: "Failed to update plan" }, 500)
  }
}

export const deletePlan = async (c) => {
  try {
    const plan = await SubscriptionPlan.findByIdAndUpdate(
      c.req.param("id"),
      { isActive: false },
      { new: true }
    )
    if (!plan) {
      return c.json({ success: false, message: "Plan not found" }, 404)
    }
    return c.json({ success: true, message: "Plan deleted successfully" })
  } catch (error) {
    if (error.name === "CastError") {
      return c.json({ success: false, message: "Invalid plan ID" }, 400)
    }
    console.error("Delete plan error:", error)
    return c.json({ success: false, message: "Failed to delete plan" }, 500)
  }
}