import swaggerJsdoc from 'swagger-jsdoc'
import '../docs/genre.docs.js'  // Add this line with other doc imports

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Brevio API Documentation',
      version: '1.0.0',
      description: 'API documentation for Brevio Streaming Platform'
    }
  },
  apis: [
    './src/docs/*.js'  // Make sure this pattern matches your docs location
  ]
}

export const swaggerSpec = swaggerJsdoc(options)