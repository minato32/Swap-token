import { Router, Request, Response } from "express";
import { getSupportedChains } from "../config/chains";
import { checkRpcConnectivity } from "../utils/providers";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  const chains = getSupportedChains();

  const checks = await Promise.all(
    chains.map(async (chain) => ({
      chain,
      connected: await checkRpcConnectivity(chain),
    }))
  );

  const allHealthy = checks.every((c) => c.connected);

  res.status(allHealthy ? 200 : 503).json({
    success: allHealthy,
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    chains: checks,
  });
});

export default router;
