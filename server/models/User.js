import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            minlength: 3,
        },
        password: {
            type: String,
            required: true,
        },
        savedSessions: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Session",
            },
        ],
    },
    { timestamps: true }
);

const User = mongoose.model("User", userSchema);
export default User;
