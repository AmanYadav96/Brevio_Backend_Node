// import './docs/upload.docs.js'
// import './docs/channel.docs.js'
// import './docs/video.docs.js'
// import './docs/advertisement.docs.js'
import swaggerJsdoc from 'swagger-jsdoc'

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Brevio API Documentation',
      version: '1.0.0',
      description: 'API documentation for Brevio Streaming Platform'
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT'
        }
      }
    }
  },
  apis: ['./src/docs/*.docs.js']
}

export const swaggerSpec = swaggerJsdoc(options)