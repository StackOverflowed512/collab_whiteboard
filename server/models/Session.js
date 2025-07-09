import mongoose from "mongoose";

const strokeSchema = new mongoose.Schema({
    type: { type: String, required: true, default: "brush" },
    points: [{ x: Number, y: Number }],
    color: String,
    lineWidth: Number,
    author: { type: String },
});

const messageSchema = new mongoose.Schema({
    text: { type: String, required: true },
    sender: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
});

const sessionSchema = new mongoose.Schema(
    {
        sessionId: { type: String, required: true, unique: true, index: true },
        strokes: [strokeSchema],
        messages: [messageSchema],
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);
export default Session;
