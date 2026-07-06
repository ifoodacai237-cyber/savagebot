import { Router, type IRouter } from "express";
import healthRouter from "./health";
import gamesRouter from "./games";
import guildsRouter from "./guilds";

const router: IRouter = Router();

router.use(healthRouter);
router.use(gamesRouter);
router.use(guildsRouter);

export default router;
