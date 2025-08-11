import mongoose from "mongoose";
import User from "../models/user.model.js";

// export const getAllUsers = async (req, res) => {
//     try {
//         const loggedInUserId = req.user._id;
//         const users = await User.find({ _id: { $ne: loggedInUserId } }).select('-password');
//         return res.status(200).json(users);
//     } catch (error) {
//         console.error('Error in getAllUsers: ', error.message);
//         return res.status(500).json({ error: error.message });
//     }
// }

export const getUserById = async (req, res) => {
    try {
        console.log('getUserById');
        const { id } = req.params;
        const user = await User.findById(id).select('-password');
        return res.status(200).json(user);
    } catch (error) {
        console.error('Error in getUserById: ', error.message);
        return res.status(500).json({ error: error.message });
    }
}

export const fetchAllUsersWithStatus = async (req, res) => {
    try {
        const { _id: userId } = req.user;

        const allUsers = await User.aggregate([
            // 1️⃣ Exclude current user
            {
                $match: {
                    _id: { $ne: new mongoose.Types.ObjectId(userId) }
                }
            },
            // 2️⃣ Lookup any friendship between logged-in user and this user
            {
                $lookup: {
                    from: "friendships",
                    let: { targetUserId: "$_id" },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $or: [
                                        {
                                            $and: [
                                                { $eq: ["$requesterId", new mongoose.Types.ObjectId(userId)] },
                                                { $eq: ["$receiverId", "$$targetUserId"] }
                                            ]
                                        },
                                        {
                                            $and: [
                                                { $eq: ["$receiverId", new mongoose.Types.ObjectId(userId)] },
                                                { $eq: ["$requesterId", "$$targetUserId"] }
                                            ]
                                        }
                                    ]
                                }
                            }
                        }
                    ],
                    as: "friendship"
                }
            },
            // 3️⃣ Determine relationship status
            {
                $addFields: {
                    relationshipStatus: {
                        $cond: [
                            { $eq: [{ $size: "$friendship" }, 0] },
                            "none", // no relationship
                            {
                                $let: {
                                    vars: { f: { $arrayElemAt: ["$friendship", 0] } },
                                    in: {
                                        $switch: {
                                            branches: [
                                                { case: { $eq: ["$$f.status", "accepted"] }, then: "accepted" },
                                                {
                                                    case: {
                                                        $and: [
                                                            { $eq: ["$$f.status", "pending"] },
                                                            { $eq: ["$$f.requesterId", new mongoose.Types.ObjectId(userId)] }
                                                        ]
                                                    }, then: "pending_sent"
                                                },
                                                {
                                                    case: {
                                                        $and: [
                                                            { $eq: ["$$f.status", "pending"] },
                                                            { $eq: ["$$f.receiverId", new mongoose.Types.ObjectId(userId)] }
                                                        ]
                                                    }, then: "pending_received"
                                                },
                                                { case: { $eq: ["$$f.status", "blocked"] }, then: "blocked" }
                                            ],
                                            default: "none"
                                        }
                                    }
                                }
                            }
                        ]
                    }
                }
            },
            // 4️⃣ Select only the fields you need
            {
                $project: {
                    fullName: 1,
                    username: 1,
                    profilePic: 1,
                    relationshipStatus: 1
                }
            }
        ]);

        return res.status(200).json({
            data: allUsers
        });

    } catch (error) {
        console.error("Error in fetchAllUsersWithStatus:", error);
        return res.status(500).json({ error: error.message });
    }
};
