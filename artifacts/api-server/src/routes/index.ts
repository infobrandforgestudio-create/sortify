import { Router, type IRouter } from "express";
import healthRouter from "./health";
import categoriesRouter from "./categories";
import emailsRouter from "./emails";
import syncRouter from "./sync";
import statsRouter from "./stats";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/categories", categoriesRouter);
router.use("/emails", emailsRouter);
router.use("/sync", syncRouter);
router.use("/stats", statsRouter);

export default router;
