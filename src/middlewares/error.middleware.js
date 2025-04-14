import { AppError } from "../utils/app-error.js"

export const errorHandler = async (c, next) => {
  try {
    await next()
  } catch (error) {
    console.error("Error:", error)

    if (error instanceof AppError) {
      return c.json(
        {
          success: false,
          message: error.message,
        },
        error.statusCode,
      )
    }

    return c.json(
      {
        success: false,
        message: "Something went wrong",
      },
      500,
    )
  }
}
