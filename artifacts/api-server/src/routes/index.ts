import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import emailsRouter from "./emails";
import syncRouter from "./sync";
import statsRouter from "./stats";
import imapRouter from "./imap";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/emails", emailsRouter);
router.use("/sync", syncRouter);
router.use("/stats", statsRouter);
router.use("/imap", imapRouter);

export default router;
