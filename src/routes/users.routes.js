import express from "express";
const router = express.Router();
import { protectRoute } from "../middleware/protectRoute.js";
import { getAllUsers, getUserById } from "../controllers/users.controller.js";

router.get("/", protectRoute, getAllUsers);

router.get("/:id", protectRoute, getUserById);

export default router;