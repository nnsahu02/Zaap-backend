import Friendship from "../models/friendship.model.js";

export const fetchMyFriends = async (req, res) => {
    try {
        const { skip = 0, limit = 100 } = req.query;
        const { _id } = req.user;
        const friendships = await Friendship.aggregate([
            {
                $match: {
                    status: "accepted",
                    $or: [
                        { requesterId: _id },
                        { receiverId: _id },
                    ]
                }
            },
            {
                $addFields: {
                    friendId: {
                        $cond: {
                            if: { $eq: ["$requesterId", _id] },
                            then: "$receiverId",
                            else: "$requesterId"
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "friendId",
                    foreignField: "_id",
                    as: "friend"
                }
            },
            {
                $unwind: "$friend"
            },
            {
                $project: {
                    _id: 0,
                    friendId: 1,
                    "friend.username": 1,
                    "friend.fullName": 1,
                    "friend.gender": 1,
                    "friend.profilePic": 1
                }
            },
            {
                $sort: { "friend.username": 1 }
            },
            {
                $skip: parseInt(skip)
            },
            {
                $limit: parseInt(limit)
            }
        ]);

        return res.status(200).json({
            data: friendships
        })

    } catch (error) {
        console.error('Error in fetchMyFriends:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const sendFriendRequest = async (req, res) => {
    try {
        const { userId: receiverId } = req.body;
        if (!receiverId) {
            return res.status(400).json({ message: "Receiver Id is required." })
        }
        const { _id: requesterId } = req.user;

        const existingRequest = await Friendship.findOne({
            $or: [
                { requesterId, receiverId },
                { requesterId: receiverId, receiverId: requesterId }
            ]
        })

        if (!existingRequest) {
            const friendObj = {
                requesterId,
                receiverId,
                status: "pending"
            }

            await Friendship.create(friendObj);

            return res.status(201).json({ message: "Friend request sent successfully." })
        }

        if (existingRequest.status === "accepted") {
            return res.status(400).json({ message: "You are already friends." });
        } else if (existingRequest.status === "pending") {
            return res.status(400).json({ message: "Friend request already sent." });
        } else if (existingRequest.status === "rejected") {
            existingRequest.status = "pending";
            await existingRequest.save();
            return res.status(200).json({ message: "Friend request sent successfully." })
        } else if (existingRequest.status === "blocked") {
            return res.status(400).json({ message: "Can not send friend request to blocked user." });
        } else {
            return res.status(400).json({ message: "Invalid friendship status." })
        }

    } catch (error) {
        console.error('Error in sendFriendRequest:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const acceptFriendRequest = async (req, res) => {
    try {
        const { friendshipId } = req.body;
        if (!friendshipId) {
            return res.status(400).json({ message: "Friendship Id is required." });
        }

        const friendship = await Friendship.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ message: "Friendship not found." });
        }

        if (friendship.requesterId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You can not accept your own friend request." })
        }

        if (friendship.receiverId.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: "You are not autherized to accept this friend request." })
        }

        if (friendship.status !== "pending") {
            return res.status(400).json({ message: "Friend request is not pending." });
        }

        friendship.status = "accepted";
        await friendship.save();

        return res.status(200).json({ message: "Friend request accepted successfully." });

    } catch (error) {
        console.error('Error in acceptFriendRequest:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const rejectFriendRequest = async (req, res) => {
    try {
        const { friendshipId } = req.body;
        if (!friendshipId) {
            return res.status(400).json({ message: "Friendship Id is required." });
        }

        const friendship = await Friendship.findById(friendshipId);
        if (!friendship) {
            return res.status(404).json({ message: "Friendship not found." });
        }

        if (friendship.requesterId.toString() === req.user._id.toString()) {
            return res.status(400).json({ message: "You can not reject your own friend request." })
        }

        if (friendship.receiverId.toString() !== req.user._id.toString()) {
            return res.status(400).json({ message: "You are not authorized to reject this friend request." })
        }

        if (friendship.status !== "pending") {
            return res.status(400).json({ message: "Friend request is not pending." });
        }

        friendship.status = "rejected";
        await friendship.save();

        return res.status(200).json({ message: "Friend request rejected successfully." });

    } catch (error) {
        console.error('Error in rejectFriendRequest:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const blockUser = async (req, res) => {
    try {
        const { userId: blockedUserId } = req.body;
        if (!blockedUserId) {
            return res.status(400).json({ message: "Blocked User Id is required." });
        }

        const { _id: blockerId } = req.user;

        const existingFriendship = await Friendship.findOne({
            $or: [
                { requesterId: blockerId, receiverId: blockedUserId },
                { requesterId: blockedUserId, receiverId: blockerId }
            ]
        });

        if (existingFriendship) {
            existingFriendship.status = "blocked";
            if (!existingFriendship.blockedBy.includes(blockerId)) {
                existingFriendship.blockedBy.push(blockerId);
            }
            await existingFriendship.save();
            return res.status(200).json({ message: "User blocked successfully." });
        }

        const newBlock = new Friendship({
            requesterId: blockerId,
            receiverId: blockedUserId,
            status: "blocked",
            blockedBy: [blockerId]
        });

        await newBlock.save();
        return res.status(201).json({ message: "User blocked successfully." });

    } catch (error) {
        console.error('Error in blockUser:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const unblockUser = async (req, res) => {
    try {
        const { userId: blockedUserId } = req.body;
        if (!blockedUserId) {
            return res.status(400).json({ message: "Blocked User Id is required." });
        }

        const { _id: blockerId } = req.user;

        const existingFriendship = await Friendship.findOne({
            $or: [
                { requesterId: blockerId, receiverId: blockedUserId },
                { requesterId: blockedUserId, receiverId: blockerId }
            ]
        });

        if (!existingFriendship || existingFriendship.status !== "blocked") {
            return res.status(404).json({ message: "No blocked friendship found." });
        }

        if (!existingFriendship.blockedBy.includes(blockerId)) {
            return res.status(400).json({ message: "You have not blocked this user." });
        }

        const isOnlyBlocker = existingFriendship.blockedBy.length === 1 && existingFriendship.blockedBy.includes(blockerId);

        existingFriendship.status = isOnlyBlocker ? "rejected" : "blocked";
        existingFriendship.blockedBy = existingFriendship.blockedBy.filter(id => id.toString() !== blockerId.toString());
        await existingFriendship.save();

        return res.status(200).json({ message: "User unblocked successfully." });

    } catch (error) {
        console.error('Error in unblockUser:', error);
        return res.status(500).json({ error: error.message });
    }
};

export const fetchPendingRequests = async (req, res) => {
    try {
        const { _id } = req.user;
        const pendingRequests = await Friendship.find({
            receiverId: _id,
            status: "pending"
        }).populate("requesterId", "fullName username profilePic gender");
        return res.status(200).json({
            data: pendingRequests
        });
    } catch (error) {
        console.error('Error in fetchPendingRequests:', error);
        return res.status(500).json({ error: error.message });
    }
}
