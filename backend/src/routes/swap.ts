import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { buildSwapTransaction } from "../services/txBuilder";
import { getSupportedChains } from "../config/chains";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const supportedChains = getSupportedChains();

const validateSwap = [
  body("fromToken").isString().notEmpty().withMessage("fromToken is required"),
  body("toToken").isString().notEmpty().withMessage("toToken is required"),
  body("amount").isNumeric().withMessage("amount must be a number"),
  body("fromChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`fromChain must be one of: ${supportedChains.join(", ")}`),
  body("toChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`toChain must be one of: ${supportedChains.join(", ")}`),
  body("recipient").isString().notEmpty().withMessage("recipient address is required"),
  body("minAmountOut").isNumeric().withMessage("minAmountOut must be a number"),
];

router.post("/", validateSwap, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, errors.array()[0].msg);
    }

    const { fromToken, amount, fromChain, toChain, recipient, minAmountOut } = req.body;

    if (fromChain === toChain) {
      throw new AppError(400, "Source and destination chains must be different");
    }

    const transaction = await buildSwapTransaction(
      fromToken,
      amount,
      fromChain,
      toChain,
      recipient,
      minAmountOut
    );

    res.json({
      success: true,
      data: transaction,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
