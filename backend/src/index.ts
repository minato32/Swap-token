import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import path from "path";
import quoteRouter from "./routes/quote";
import swapRouter from "./routes/swap";
import statusRouter from "./routes/status";
import healthRouter from "./routes/health";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "Too many requests, please try again later" },
});
app.use(limiter);

app.use("/quote", quoteRouter);
app.use("/swap", swapRouter);
app.use("/status", statusRouter);
app.use("/health", healthRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
