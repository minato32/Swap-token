import { Router, Request, Response, NextFunction } from "express";
import { param, query, validationResult } from "express-validator";
import { getTransactionStatus } from "../services/statusService";
import { getSupportedChains } from "../config/chains";
import { AppError } from "../middleware/errorHandler";

const router = Router();

const supportedChains = getSupportedChains();

const validateStatus = [
  param("txHash")
    .isString()
    .matches(/^0x[a-fA-F0-9]{64}$/)
    .withMessage("Invalid transaction hash"),
  query("srcChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`srcChain must be one of: ${supportedChains.join(", ")}`),
  query("dstChain")
    .isString()
    .isIn(supportedChains)
    .withMessage(`dstChain must be one of: ${supportedChains.join(", ")}`),
];

router.get("/:txHash", validateStatus, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new AppError(400, errors.array()[0].msg);
    }

    const txHash = req.params.txHash as string;
    const srcChain = req.query.srcChain as string;
    const dstChain = req.query.dstChain as string;

    const status = await getTransactionStatus(txHash, srcChain, dstChain);

    res.json({
      success: true,
      data: status,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
