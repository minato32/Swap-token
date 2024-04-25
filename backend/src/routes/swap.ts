import { Router, Request, Response, NextFunction } from "express";
import { body, validationResult } from "express-validator";
import { buildSwapTransaction } from "../services/txBuilder";
import { getSupportedChains } from "../config/chains";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const supportedChains = getSupportedChains();

const validateSwap = [
  body("fromToken")
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("fromToken must be a valid Ethereum address"),
  body("toToken")
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("toToken must be a valid Ethereum address"),
  body("amount")
    .isFloat({ min: 0.000001, max: 1e18 })
    .withMessage("amount must be a positive number"),
  body("fromChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`fromChain must be one of: ${supportedChains.join(", ")}`),
  body("toChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`toChain must be one of: ${supportedChains.join(", ")}`),
  body("recipient")
    .isString()
    .matches(/^0x[a-fA-F0-9]{40}$/)
    .withMessage("recipient must be a valid Ethereum address"),
  body("minAmountOut")
    .isFloat({ min: 0 })
    .withMessage("minAmountOut must be a positive number"),
];

router.post("/", validateSwap, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, errors.array()[0].msg);
    }

    const { fromToken, toToken, amount, fromChain, toChain, recipient, minAmountOut } = req.body;

    const transaction = await buildSwapTransaction(
      fromToken,
      toToken,
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
