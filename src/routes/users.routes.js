import express from "express";
const router = express.Router();
import { protectRoute } from "../middleware/protectRoute.js";
import { fetchAllUsersWithStatus, getUserById } from "../controllers/users.controller.js";

router.get("/", protectRoute, fetchAllUsersWithStatus);

router.get("/:id", protectRoute, getUserById);

export default router;