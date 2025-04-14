import stripe from "../config/stripe.js"

export const createStripeCustomer = async (email, name) => {
  try {
    const customer = await stripe.customers.create({
      email,
      name,
    })

    return customer
  } catch (error) {
    console.error("Create Stripe customer error:", error)
    throw error
  }
}

export const createPaymentIntent = async (amount, currency, customerId) => {
  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
      customer: customerId,
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return paymentIntent
  } catch (error) {
    console.error("Create payment intent error:", error)
    throw error
  }
}

export const createSubscriptionProduct = async (name, description) => {
  try {
    const product = await stripe.products.create({
      name,
      description,
    })

    return product
  } catch (error) {
    console.error("Create subscription product error:", error)
    throw error
  }
}

export const createSubscriptionPrice = async (productId, amount, interval) => {
  try {
    const price = await stripe.prices.create({
      product: productId,
      unit_amount: amount,
      currency: "usd",
      recurring: {
        interval,
      },
    })

    return price
  } catch (error) {
    console.error("Create subscription price error:", error)
    throw error
  }
}
