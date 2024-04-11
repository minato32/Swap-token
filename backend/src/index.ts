import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import quoteRouter from "./routes/quote";
import swapRouter from "./routes/swap";
import { errorHandler } from "./middleware/errorHandler";

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || "http://localhost:3000" }));
app.use(express.json());

app.use("/quote", quoteRouter);
app.use("/swap", swapRouter);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
