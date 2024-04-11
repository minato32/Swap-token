import { Router, Request, Response, NextFunction } from "express";
import { query, validationResult } from "express-validator";
import { getQuote } from "../services/priceService";
import { getSupportedChains } from "../config/chains";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const supportedChains = getSupportedChains();

const validateQuote = [
  query("fromToken").isString().notEmpty().withMessage("fromToken is required"),
  query("toToken").isString().notEmpty().withMessage("toToken is required"),
  query("amount").isNumeric().withMessage("amount must be a number"),
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

    if (fromChain === toChain) {
      throw new AppError(400, "Source and destination chains must be different");
    }

    const quote = await getQuote(fromToken, toToken, amount, fromChain, toChain);

    res.json({
      success: true,
      data: quote,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
