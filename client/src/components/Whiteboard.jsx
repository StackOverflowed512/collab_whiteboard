import React, { useRef, useEffect, useState, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const COLORS = ["#000000", "#FF0000", "#0000FF", "#00FF00"]; // Black, Red, Blue, Green

const Whiteboard = ({ sessionId }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const socketRef = useRef(null);
    const { token } = useContext(AuthContext);

    // --- State Management ---
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState("brush"); // 'brush', 'rectangle', 'circle', 'triangle'
    const [color, setColor] = useState(COLORS[0]);
    const [lineWidth, setLineWidth] = useState(5);

    // Refs for drawing logic
    const currentPoints = useRef([]); // For storing points of the current brush stroke
    const startPoint = useRef(null); // For shapes
    const snapshot = useRef(null); // To store canvas state for shape previews

    // --- Drawing Utility Function ---
    // This function can draw any element (brush stroke or shape) from a data object.
    const drawElement = (ctx, element) => {
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";

        switch (element.type) {
            case "brush":
                ctx.beginPath();
                element.points.forEach((point, i) => {
                    if (i === 0) ctx.moveTo(point.x, point.y);
                    else ctx.lineTo(point.x, point.y);
                });
                ctx.stroke();
                break;
            case "rectangle":
                {
                    const start = element.points[0];
                    const end = element.points[1];
                    ctx.strokeRect(
                        start.x,
                        start.y,
                        end.x - start.x,
                        end.y - start.y
                    );
                }
                break;
            case "circle":
                {
                    const start = element.points[0];
                    const end = element.points[1];
                    const radius = Math.sqrt(
                        Math.pow(end.x - start.x, 2) +
                            Math.pow(end.y - start.y, 2)
                    );
                    ctx.beginPath();
                    ctx.arc(start.x, start.y, radius, 0, 2 * Math.PI);
                    ctx.stroke();
                }
                break;
            case "triangle":
                {
                    const start = element.points[0];
                    const end = element.points[1];
                    ctx.beginPath();
                    ctx.moveTo(start.x, start.y);
                    ctx.lineTo(end.x, end.y);
                    ctx.lineTo(start.x - (end.x - start.x), end.y);
                    ctx.closePath();
                    ctx.stroke();
                }
                break;
            default:
                console.error("Unknown element type:", element.type);
        }
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        if (canvas) {
            const context = canvas.getContext("2d");
            context.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // --- Setup Effect for Socket.IO and Canvas ---
    useEffect(() => {
        if (!token) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        contextRef.current = context;

        socketRef.current = io(SERVER_URL, { auth: { token } });
        const socket = socketRef.current;

        socket.emit("join_session", { sessionId });

        // Listen for the initial drawing state when joining
        socket.on("load_drawing", (elements) => {
            clearCanvas(); // Clear before loading to prevent duplicates on reconnect
            elements.forEach((element) => drawElement(context, element));
        });

        // Listen for new drawings from other users
        socket.on("draw", (element) => {
            drawElement(context, element);
        });

        socket.on("clear_board", clearCanvas);

        // ... other listeners

        return () => {
            socket.disconnect();
        };
    }, [sessionId, token]);

    // --- Drawing Event Handlers ---
    const startDrawing = ({ nativeEvent }) => {
        const { offsetX, offsetY } = nativeEvent;
        setIsDrawing(true);

        if (tool === "brush") {
            currentPoints.current = [{ x: offsetX, y: offsetY }];
        } else {
            startPoint.current = { x: offsetX, y: offsetY };
            // Save the current canvas state to draw previews over it
            snapshot.current = contextRef.current.getImageData(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );
        }
    };

    const draw = ({ nativeEvent }) => {
        if (!isDrawing) return;
        const { offsetX, offsetY } = nativeEvent;
        const context = contextRef.current;

        if (tool === "brush") {
            currentPoints.current.push({ x: offsetX, y: offsetY });
            // For brush, draw the path locally for a smooth experience
            drawElement(context, {
                type: "brush",
                points: currentPoints.current,
                color,
                lineWidth,
            });
        } else {
            // For shapes, restore the original canvas and draw the preview on top
            if (snapshot.current) {
                context.putImageData(snapshot.current, 0, 0);
            }
            drawElement(context, {
                type: tool,
                points: [startPoint.current, { x: offsetX, y: offsetY }],
                color,
                lineWidth,
            });
        }
    };

    const finishDrawing = ({ nativeEvent }) => {
        if (!isDrawing) return;
        setIsDrawing(false);

        let element = null;

        if (tool === "brush") {
            if (currentPoints.current.length > 1) {
                element = {
                    type: "brush",
                    points: currentPoints.current,
                    color,
                    lineWidth,
                };
            }
        } else {
            const { offsetX, offsetY } = nativeEvent;
            element = {
                type: tool,
                points: [startPoint.current, { x: offsetX, y: offsetY }],
                color,
                lineWidth,
            };
            // Draw the final shape locally
            drawElement(contextRef.current, element);
        }

        // If a valid element was created, emit it to the server
        if (element) {
            socketRef.current.emit("draw", { sessionId, element });
        }

        // Reset refs
        currentPoints.current = [];
        startPoint.current = null;
        snapshot.current = null;
    };

    const handleClearBoard = () => {
        if (
            window.confirm(
                "Are you sure? This will clear the board for everyone."
            )
        ) {
            socketRef.current.emit("clear_board", { sessionId });
        }
    };

    return (
        <div className="whiteboard-container">
            <div className="toolbar">
                <div className="tool-section">
                    <button
                        className={`tool-button ${
                            tool === "brush" ? "active" : ""
                        }`}
                        onClick={() => setTool("brush")}
                    >
                        Brush
                    </button>
                    <button
                        className={`tool-button ${
                            tool === "rectangle" ? "active" : ""
                        }`}
                        onClick={() => setTool("rectangle")}
                    >
                        Rect
                    </button>
                    <button
                        className={`tool-button ${
                            tool === "circle" ? "active" : ""
                        }`}
                        onClick={() => setTool("circle")}
                    >
                        Circle
                    </button>
                    <button
                        className={`tool-button ${
                            tool === "triangle" ? "active" : ""
                        }`}
                        onClick={() => setTool("triangle")}
                    >
                        Triangle
                    </button>
                </div>
                <div className="tool-section">
                    {COLORS.map((c) => (
                        <button
                            key={c}
                            className={`color-button ${
                                color === c ? "active" : ""
                            }`}
                            style={{ backgroundColor: c }}
                            onClick={() => setColor(c)}
                        />
                    ))}
                </div>
                <div className="tool-section">
                    <label>Width:</label>
                    <input
                        type="range"
                        min="1"
                        max="50"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(Number(e.target.value))}
                    />
                </div>
                <button className="clear-button" onClick={handleClearBoard}>
                    Clear
                </button>
            </div>
            <canvas
                ref={canvasRef}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={finishDrawing}
                onMouseOut={finishDrawing}
            />
        </div>
    );
};

export default Whiteboard;
