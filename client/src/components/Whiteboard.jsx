import React, { useRef, useEffect, useState } from "react";
import { io } from "socket.io-client";
import { useParams } from "react-router-dom";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

const Whiteboard = ({ sessionId, userName }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const socketRef = useRef(null);
    const currentStroke = useRef([]);

    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState("#000000");
    const [lineWidth, setLineWidth] = useState(5);

    // --- Utility function to draw a stroke on the canvas ---
    const drawStroke = (stroke, ctx) => {
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        stroke.points.forEach((point, index) => {
            if (index === 0) {
                ctx.moveTo(point.x, point.y);
            } else {
                ctx.lineTo(point.x, point.y);
            }
        });
        ctx.stroke();
    };

    // --- Clear canvas function ---
    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        context.clearRect(0, 0, canvas.width, canvas.height);
    };

    // --- Socket.IO setup and event listeners ---
    useEffect(() => {
        // Initialize socket connection
        socketRef.current = io(SERVER_URL);
        const socket = socketRef.current;

        // Emit event to join the session
        socket.emit("join_session", { sessionId, userName });

        // Listen for initial drawing data
        socket.on("load_drawing", (strokes) => {
            const context = contextRef.current;
            if (context) {
                strokes.forEach((stroke) => drawStroke(stroke, context));
            }
        });

        // Listen for real-time drawing from other users
        socket.on("draw", (stroke) => {
            if (contextRef.current) {
                drawStroke(stroke, contextRef.current);
            }
        });

        // Listen for clear board event
        socket.on("clear_board", () => {
            clearCanvas();
        });

        // Clean up on component unmount
        return () => {
            socket.disconnect();
        };
    }, [sessionId, userName]); // Re-run effect if sessionId or userName changes

    // --- Canvas setup and resizing ---
    useEffect(() => {
        const canvas = canvasRef.current;
        // Set canvas dimensions to fill the window
        const setCanvasDimensions = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;

            // Redraw content if needed (after resizing, the canvas is cleared)
            const socket = socketRef.current;
            if (socket) {
                // A better approach would be to request the full state again
                // For simplicity, we just clear it, but you could add a 'request_state' event
                console.log(
                    "Canvas resized. Consider re-fetching board state."
                );
            }
        };

        setCanvasDimensions();
        window.addEventListener("resize", setCanvasDimensions);

        const context = canvas.getContext("2d");
        context.lineCap = "round";
        context.lineJoin = "round";
        contextRef.current = context;

        return () => {
            window.removeEventListener("resize", setCanvasDimensions);
        };
    }, []);

    // --- Drawing event handlers ---
    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setIsDrawing(true);
        currentStroke.current = [{ x: offsetX, y: offsetY }];
    };

    const finishDrawing = () => {
        if (!isDrawing) return;
        setIsDrawing(false);

        // Create the full stroke object
        const stroke = {
            points: currentStroke.current,
            color,
            lineWidth,
        };

        // Draw it locally
        drawStroke(stroke, contextRef.current);

        // Emit to the server
        socketRef.current.emit("draw", { sessionId, stroke });

        // Clear the current stroke points
        currentStroke.current = [];
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;

        // Add point to the current stroke
        currentStroke.current.push({ x: offsetX, y: offsetY });

        // For a smoother "live" drawing experience, we draw segments as we move
        const context = contextRef.current;
        context.strokeStyle = color;
        context.lineWidth = lineWidth;
        context.beginPath();
        const points = currentStroke.current;
        context.moveTo(
            points[points.length - 2].x,
            points[points.length - 2].y
        );
        context.lineTo(offsetX, offsetY);
        context.stroke();
    };

    // --- UI Event Handlers ---
    const handleClearBoard = () => {
        if (
            window.confirm(
                "Are you sure you want to clear the board for everyone?"
            )
        ) {
            socketRef.current.emit("clear_board", { sessionId });
        }
    };

    return (
        <div className="whiteboard-container">
            <div className="toolbar">
                <label>Color:</label>
                <input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                />
                <label>Width:</label>
                <input
                    type="range"
                    min="1"
                    max="50"
                    value={lineWidth}
                    onChange={(e) => setLineWidth(e.target.value)}
                />
                <span>{lineWidth}</span>
                <button onClick={handleClearBoard}>Clear Board</button>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing} // Stop drawing if mouse leaves canvas
                onMouseMove={draw}
            />
        </div>
    );
};

export default Whiteboard;
