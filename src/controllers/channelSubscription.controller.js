import ChannelSubscription from '../models/channelSubscription.model.js'
import Channel from '../models/channel.model.js'
import User from '../models/user.model.js'
import Subscription from '../models/subscription.model.js'

// Subscribe a user to a channel
export const subscribeToChannel = async (c) => {
  try {
    const { channelId, subscriptionId } = c.req.json()
    const userId = c.get('user')._id

    // Check if channel exists
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return c.json({ success: false, message: 'Channel not found' }, 404)
    }

    // Check if subscription plan exists
    const subscription = await Subscription.findById(subscriptionId)
    if (!subscription) {
      return c.json({ success: false, message: 'Subscription plan not found' }, 404)
    }

    // Check if user is already subscribed to this channel
    const existingSubscription = await ChannelSubscription.findOne({
      user: userId,
      channel: channelId
    })

    if (existingSubscription && existingSubscription.isActive) {
      return c.json({ 
        success: false, 
        message: 'You are already subscribed to this channel' 
      }, 400)
    }

    // Calculate end date based on subscription duration
    const startDate = new Date()
    const endDate = new Date()
    
    // Add months based on subscription duration
    if (subscription.duration === 'monthly') {
      endDate.setMonth(endDate.getMonth() + 1)
    } else if (subscription.duration === 'quarterly') {
      endDate.setMonth(endDate.getMonth() + 3)
    } else if (subscription.duration === 'yearly') {
      endDate.setFullYear(endDate.getFullYear() + 1)
    }

    // Create new subscription or update existing one
    let channelSubscription
    
    if (existingSubscription) {
      // Update existing subscription
      channelSubscription = await ChannelSubscription.findByIdAndUpdate(
        existingSubscription._id,
        {
          subscription: subscriptionId,
          startDate,
          endDate,
          isActive: true,
          autoRenew: true,
          $push: {
            paymentHistory: {
              paymentId: `payment_${Date.now()}`,
              amount: subscription.price,
              status: 'completed'
            }
          }
        },
        { new: true }
      )
    } else {
      // Create new subscription
      channelSubscription = await ChannelSubscription.create({
        user: userId,
        channel: channelId,
        subscription: subscriptionId,
        startDate,
        endDate,
        paymentHistory: [{
          paymentId: `payment_${Date.now()}`,
          amount: subscription.price,
          status: 'completed'
        }]
      })
    }

    return c.json({
      success: true,
      message: 'Successfully subscribed to channel',
      data: channelSubscription
    })
  } catch (error) {
    console.error('Error subscribing to channel:', error)
    return c.json({ 
      success: false, 
      message: 'Failed to subscribe to channel', 
      error: error.message 
    }, 500)
  }
}

// Get all channels a user is subscribed to
export const getUserSubscriptions = async (c) => {
  try {
    const userId = c.get('user')._id
    
    const subscriptions = await ChannelSubscription.find({ 
      user: userId,
      isActive: true,
      endDate: { $gt: new Date() }
    })
    .populate('channel', 'name description thumbnail')
    .populate('subscription', 'name price duration')
    
    return c.json({
      success: true,
      count: subscriptions.length,
      data: subscriptions
    })
  } catch (error) {
    console.error('Error getting user subscriptions:', error)
    return c.json({ 
      success: false, 
      message: 'Failed to get subscriptions', 
      error: error.message 
    }, 500)
  }
}

// Get all subscribers of a channel
export const getChannelSubscribers = async (c) => {
  try {
    const { channelId } = c.req.param()
    
    // Check if user is channel owner
    const channel = await Channel.findById(channelId)
    if (!channel) {
      return c.json({ success: false, message: 'Channel not found' }, 404)
    }
    
    if (channel.owner.toString() !== c.get('user')._id.toString()) {
      return c.json({ 
        success: false, 
        message: 'You are not authorized to view this information' 
      }, 403)
    }
    
    const subscribers = await ChannelSubscription.find({ 
      channel: channelId,
      isActive: true,
      endDate: { $gt: new Date() }
    })
    .populate('user', 'name email profilePicture')
    .populate('subscription', 'name price duration')
    
    return c.json({
      success: true,
      count: subscribers.length,
      data: subscribers
    })
  } catch (error) {
    console.error('Error getting channel subscribers:', error)
    return c.json({ 
      success: false, 
      message: 'Failed to get subscribers', 
      error: error.message 
    }, 500)
  }
}

// Cancel a subscription
export const cancelSubscription = async (c) => {
  try {
    const { subscriptionId } = c.req.param()
    const userId = c.get('user')._id
    
    const channelSubscription = await ChannelSubscription.findById(subscriptionId)
    
    if (!channelSubscription) {
      return c.json({ success: false, message: 'Subscription not found' }, 404)
    }
    
    // Check if user owns this subscription
    if (channelSubscription.user.toString() !== userId.toString()) {
      return c.json({ 
        success: false, 
        message: 'You are not authorized to cancel this subscription' 
      }, 403)
    }
    
    // Update subscription
    channelSubscription.autoRenew = false
    await channelSubscription.save()
    
    return c.json({
      success: true,
      message: 'Subscription will not renew at the end of the current period',
      data: channelSubscription
    })
  } catch (error) {
    console.error('Error canceling subscription:', error)
    return c.json({ 
      success: false, 
      message: 'Failed to cancel subscription', 
      error: error.message 
    }, 500)
  }
}

// Check if user is subscribed to a channel
export const checkSubscription = async (c) => {
  try {
    const { channelId } = c.req.param()
    const userId = c.get('user')._id
    
    const subscription = await ChannelSubscription.findOne({
      user: userId,
      channel: channelId,
      isActive: true,
      endDate: { $gt: new Date() }
    })
    
    return c.json({
      success: true,
      isSubscribed: !!subscription,
      data: subscription
    })
  } catch (error) {
    console.error('Error checking subscription:', error)
    return c.json({ 
      success: false, 
      message: 'Failed to check subscription', 
      error: error.message 
    }, 500)
  }
}

// Update last watched time
export const updateLastWatched = async (c) => {
  try {
    const { channelId } = c.req.param()
    const userId = c.get('user')._id
    
    const subscription = await ChannelSubscription.findOneAndUpdate(
      {
        user: userId,
        channel: channelId,
        isActive: true,
        endDate: { $gt: new Date() }
      },
      { lastWatched: new Date() },
      { new: true }
    )
    
    if (!subscription) {
      return c.json({ 
        success: false, 
        message: 'Active subscription not found' 
      }, 404)
    }
    
    return c.json({
      success: true,
      message: 'Last watched time updated',
      data: subscription
    })
  } catch (error) {
    console.error('Error updating last watched time:', error)
    return c.json({ 
      success: false, 
      message: 'Failed to update last watched time', 
      error: error.message 
    }, 500)
  }
}