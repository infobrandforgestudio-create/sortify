import { Router } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import emailsRouter from "./emails";
import syncRouter from "./sync";
import imapRouter from "./imap";
import statsRouter from "./stats";

const router = Router();

router.use("/healthz", healthRouter);
router.use("/categories", categoriesRouter);
router.use("/emails", emailsRouter);
router.use("/sync", syncRouter);
router.use("/imap", imapRouter);
router.use("/stats", statsRouter);

export default router;
