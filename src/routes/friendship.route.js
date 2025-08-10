import { Router } from "express";
import { protectRoute } from "../middleware/protectRoute.js";
import {
    acceptFriendRequest,
    blockUser,
    fetchMyFriends,
    fetchPendingRequests,
    rejectFriendRequest,
    sendFriendRequest,
    unblockUser,
} from "../controllers/friendship.controller.js";
const friendshipRouter = Router();

friendshipRouter.get("/", protectRoute, fetchMyFriends);
friendshipRouter.post("/request", protectRoute, sendFriendRequest);
friendshipRouter.post("/accept", protectRoute, acceptFriendRequest);
friendshipRouter.post("/reject", protectRoute, rejectFriendRequest);
friendshipRouter.post("/block", protectRoute, blockUser);
friendshipRouter.post("/unblock", protectRoute, unblockUser);
friendshipRouter.get("/pendingrequests", protectRoute, fetchPendingRequests);

export default friendshipRouter;
