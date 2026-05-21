import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tripsRouter from "./trips";
import legsRouter from "./legs";
import budgetRouter from "./budget";
import journalRouter from "./journal";
import vehicleRouter from "./vehicle";
import gpsRouter from "./gps";
import analyticsRouter from "./analytics";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tripsRouter);
router.use(legsRouter);
router.use(budgetRouter);
router.use(journalRouter);
router.use(vehicleRouter);
router.use(gpsRouter);
router.use(analyticsRouter);

export default router;
