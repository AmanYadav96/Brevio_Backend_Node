import jwt from "jsonwebtoken"
import axios from "axios"
import jwksClient from "jwks-rsa"

// Create a JWKS client to fetch Apple's public keys
const client = jwksClient({
  jwksUri: 'https://appleid.apple.com/auth/keys',
  cache: true,
  cacheMaxAge: 86400000 // 1 day
})

// Function to get the signing key
const getSigningKey = (kid) => {
  return new Promise((resolve, reject) => {
    client.getSigningKey(kid, (err, key) => {
      if (err) return reject(err)
      const signingKey = key.getPublicKey()
      resolve(signingKey)
    })
  })
}

// Verify Apple ID token
export const verifyAppleToken = async (idToken) => {
  try {
    // Decode the token without verification to get the kid (Key ID)
    const decoded = jwt.decode(idToken, { complete: true })
    
    if (!decoded || !decoded.header || !decoded.header.kid) {
      throw new Error('Invalid token')
    }

    // Get the signing key
    const key = await getSigningKey(decoded.header.kid)

    // Verify the token
    const verified = jwt.verify(idToken, key, {
      algorithms: ['RS256'],
      audience: process.env.APPLE_CLIENT_ID,
      issuer: 'https://appleid.apple.com'
    })

    return verified
  } catch (error) {
    throw new Error(`Apple token verification failed: ${error.message}`)
  }
}