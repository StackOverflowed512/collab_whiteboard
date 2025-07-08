import mongoose from "mongoose";

const strokeSchema = new mongoose.Schema({
    type: { type: String, required: true, default: "brush" },
    points: [{ x: Number, y: Number }],
    color: String,
    lineWidth: Number,
    author: { type: String },
});

const sessionSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, unique: true, index: true },
        strokes: [strokeSchema],
        users: [{ id: String, name: String }],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
