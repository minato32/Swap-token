import { Request, Response, NextFunction } from "express";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  console.error("Unhandled error:", err);

  const safeMessages = [
    "Price data unavailable",
    "Unable to estimate LayerZero bridge fee",
    "Same-chain swaps are not available",
  ];

  const userMessage = safeMessages.find((m) => err.message?.includes(m)) || "Internal server error";

  res.status(500).json({
    success: false,
    error: userMessage,
  });
}
