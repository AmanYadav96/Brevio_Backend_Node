import swaggerJsdoc from 'swagger-jsdoc'

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
    './src/docs/*.js'  // This will include all .js files in the docs folder
  ]
}

export const swaggerSpec = swaggerJsdoc(options)