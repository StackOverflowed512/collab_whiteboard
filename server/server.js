import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { nanoid } from "nanoid";
import Session from "./models/Session.js";

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure CORS
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

// --- Database Connection ---
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("MongoDB connected successfully."))
    .catch((err) => console.error("MongoDB connection error:", err));

// --- API Endpoint to create a new session ---
app.use(cors()); // Enable CORS for API routes
app.use(express.json());

app.post("/api/session", async (req, res) => {
    try {
        const sessionId = nanoid(8); // Generate a short, unique ID
        const newSession = new Session({ sessionId, strokes: [] });
        await newSession.save();
        res.status(201).json({ sessionId });
    } catch (error) {
        console.error("Error creating session:", error);
        res.status(500).json({ error: "Failed to create session" });
    }
});

// --- Socket.IO Connection Handling ---
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    // Event to join a specific whiteboard session
    socket.on("join_session", async ({ sessionId, userName }) => {
        try {
            socket.join(sessionId);
            console.log(
                `User ${socket.id} (${userName}) joined session: ${sessionId}`
            );

            // Fetch existing drawing data for the new user
            const session = await Session.findOne({ sessionId });
            if (session) {
                socket.emit("load_drawing", session.strokes);
            } else {
                // This case might happen if the session was created but something went wrong
                // Or if a user tries to join a non-existent session URL directly
                const newSession = new Session({ sessionId, strokes: [] });
                await newSession.save();
                console.log(`New session created on-the-fly: ${sessionId}`);
            }
        } catch (error) {
            console.error("Error joining session:", error);
            socket.emit("error", "Failed to join session.");
        }
    });

    // Event to handle drawing data
    socket.on("draw", async (data) => {
        // Broadcast the drawing data to all other clients in the same session
        socket.to(data.sessionId).emit("draw", data.stroke);

        // Save the stroke to the database
        try {
            await Session.updateOne(
                { sessionId: data.sessionId },
                { $push: { strokes: data.stroke } }
            );
        } catch (error) {
            console.error("Error saving stroke:", error);
        }
    });

    // Event to clear the whiteboard
    socket.on("clear_board", async ({ sessionId }) => {
        // Broadcast the clear event to all clients in the session
        io.to(sessionId).emit("clear_board");

        // Clear the strokes in the database
        try {
            await Session.updateOne(
                { sessionId: data.sessionId },
                { $set: { strokes: [] } }
            );
        } catch (error) {
            console.error("Error clearing board:", error);
        }
    });

    // Handle user disconnection
    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
        // Here you could add logic to remove the user from the session's user list
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
