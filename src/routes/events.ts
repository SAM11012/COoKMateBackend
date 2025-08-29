import { Router, Request, Response } from "express";
import { addClient, removeClient } from "../utils/sseManager.ts";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
    console.log(res,'the sender client')
  addClient(res);

  req.on("close", () => {
    removeClient(res);
  });
});

export default router;
