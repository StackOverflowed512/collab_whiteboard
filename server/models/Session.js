import mongoose from "mongoose";

const strokeSchema = new mongoose.Schema({
    points: [{ x: Number, y: Number }],
    color: String,
    lineWidth: Number,
});

const sessionSchema = new mongoose.Schema(
    {
        sessionId: {
            type: String,
            required: true,
            unique: true,
            index: true,
        },
        strokes: [strokeSchema],
        users: [
            {
                id: String,
                name: String,
            },
        ],
    },
    { timestamps: true }
);

const Session = mongoose.model("Session", sessionSchema);

export default Session;
