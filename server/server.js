import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Session from "./models/Session.js";
import User from "./models/User.js";

// --- CONFIGURATION ---
dotenv.config();
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: process.env.CLIENT_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());

// --- DATABASE CONNECTION ---
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => console.log("✅✅MongoDB connected successfully."))
    .catch((err) => console.error("❌❌MongoDB connection error:", err));

// --- MIDDLEWARE ---
const verifyToken = (req, res, next) => {
    const token = req.headers["authorization"]?.split(" ")[1]; // Bearer <token>
    if (!token) return res.status(403).json({ message: "No token provided." });

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err)
            return res
                .status(401)
                .json({ message: "Failed to authenticate token." });
        req.userId = decoded.id;
        next();
    });
};

// --- AUTH API ROUTES (THIS IS THE CORRECTED SECTION) ---
app.post("/api/auth/signup", async (req, res) => {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            return res
                .status(400)
                .json({ message: "Username and password are required." });
        }
        if (password.length < 6) {
            return res
                .status(400)
                .json({ message: "Password must be at least 6 characters." });
        }
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ message: "Username already taken." });
        }
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, password: hashedPassword });
        await newUser.save();
        res.status(201).json({ message: "User created successfully." });
    } catch (error) {
        res.status(500).json({
            message: "Error signing up.",
            error: error.message,
        });
    }
});

app.post("/api/auth/login", async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        if (!isPasswordCorrect) {
            return res.status(400).json({ message: "Invalid credentials." });
        }
        const token = jwt.sign(
            { username: user.username, id: user._id },
            process.env.JWT_SECRET,
            { expiresIn: "24h" }
        );
        res.status(200).json({ token, username: user.username });
    } catch (error) {
        res.status(500).json({
            message: "Error logging in.",
            error: error.message,
        });
    }
});

// --- SESSION API ROUTES ---
app.post("/api/session", verifyToken, async (req, res) => {
    try {
        const sessionId = nanoid(8);
        const newSession = new Session({
            sessionId,
            strokes: [],
            createdBy: req.userId,
        });
        await newSession.save();
        res.status(201).json({ sessionId });
    } catch (error) {
        res.status(500).json({ error: "Failed to create session" });
    }
});

// --- SOCKET.IO AUTH MIDDLEWARE & CONNECTION HANDLING ---
io.use((socket, next) => {
    // ... socket logic is unchanged ...
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error("Authentication error: No token"));
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) return next(new Error("Authentication error: Invalid token"));
        socket.user = decoded;
        next();
    });
});

io.on("connection", (socket) => {
    // ... socket logic is unchanged ...
    console.log(
        `User connected: ${socket.id}, username: ${socket.user.username}`
    );

    socket.on("join_session", async ({ sessionId }) => {
        try {
            socket.join(sessionId);
            console.log(
                `User ${socket.user.username} joined session: ${sessionId}`
            );
            const session = await Session.findOne({ sessionId });
            if (session) {
                socket.emit("load_drawing", session.strokes);
            } else {
                const newSession = new Session({
                    sessionId,
                    strokes: [],
                    createdBy: socket.user.id,
                });
                await newSession.save();
                console.log(`New session created on-the-fly: ${sessionId}`);
            }
        } catch (error) {
            console.error("Error joining session:", error);
            socket.emit("error", "Failed to join session.");
        }
    });

    socket.on("draw", async (data) => {
        const { sessionId, element } = data;
        const elementWithAuthor = { ...element, author: socket.user.username };
        socket.to(sessionId).emit("draw", elementWithAuthor);
        try {
            await Session.updateOne(
                { sessionId },
                { $push: { strokes: elementWithAuthor } }
            );
        } catch (error) {
            console.error("Error saving stroke:", error);
        }
    });

    socket.on("clear_board", async ({ sessionId }) => {
        io.to(sessionId).emit("clear_board");
        try {
            await Session.updateOne({ sessionId }, { $set: { strokes: [] } });
        } catch (error) {
            console.error("Error clearing board:", error);
        }
    });

    socket.on("disconnect", () => {
        console.log(`User disconnected: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
