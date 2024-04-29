import { Router, Request, Response, NextFunction } from "express";
import { query, validationResult } from "express-validator";
import { getQuote } from "../services/priceService";
import { getSupportedChains } from "../config/chains";
import { AppError } from "../middleware/errorHandler";
import { onPriceUpdate } from "../services/binanceWsService";

const router = Router();

const supportedChains = getSupportedChains();

const validateQuote = [
  query("fromToken")
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("fromToken must be a valid Ethereum address"),
  query("toToken")
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("toToken must be a valid Ethereum address"),
  query("amount")
    .isFloat({ min: 0.000001, max: 1e18 })
    .withMessage("amount must be a positive number"),
  query("fromChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`fromChain must be one of: ${supportedChains.join(", ")}`),
  query("toChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`toChain must be one of: ${supportedChains.join(", ")}`),
];

router.get("/", validateQuote, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, errors.array()[0].msg);
    }

    const { fromToken, toToken, amount, fromChain, toChain } = req.query as Record<string, string>;

    const quote = await getQuote(fromToken, toToken, amount, fromChain, toChain);

    res.json({
      success: true,
      data: quote,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/stream", validateQuote, (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    res.status(400).json({ success: false, error: errors.array()[0].msg });
    return;
  }

  const { fromToken, toToken, amount, fromChain, toChain } = req.query as Record<string, string>;

  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": process.env.FRONTEND_URL || "http://localhost:3000",
  });

  let lastSent = 0;
  const THROTTLE_MS = 1_000;

  async function sendQuote() {
    const now = Date.now();
    if (now - lastSent < THROTTLE_MS) return;
    lastSent = now;

    try {
      const quote = await getQuote(fromToken, toToken, amount, fromChain, toChain);
      res.write(`data: ${JSON.stringify(quote)}\n\n`);
    } catch (err: any) {
      res.write(`event: error\ndata: ${JSON.stringify({ error: err.message || "Quote unavailable" })}\n\n`);
    }
  }

  sendQuote();

  const unsubscribe = onPriceUpdate(() => {
    sendQuote();
  });

  req.on("close", () => {
    unsubscribe();
  });
});

export default router;
