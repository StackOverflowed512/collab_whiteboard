import React, { useRef, useEffect, useState, useContext } from "react";
import { io } from "socket.io-client";
import { AuthContext } from "../context/AuthContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";
const COLORS = ["#000000", "#FF0000", "#0000FF", "#00FF00"];

const Whiteboard = ({ sessionId }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const socketRef = useRef(null);
    const messagesEndRef = useRef(null);
    const { token } = useContext(AuthContext);

    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState("brush");
    const [color, setColor] = useState(COLORS[0]);
    const [lineWidth, setLineWidth] = useState(5);
    const [messages, setMessages] = useState([]);
    const [chatInput, setChatInput] = useState("");
    const [isCopied, setIsCopied] = useState(false);
    const [isSaved, setIsSaved] = useState(false);

    const currentPoints = useRef([]);
    const startPoint = useRef(null);
    const snapshot = useRef(null);

    const drawElement = (ctx, element) => {
        ctx.strokeStyle = element.color;
        ctx.lineWidth = element.lineWidth;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        switch (element.type) {
            case "brush":
                ctx.beginPath();
                element.points.forEach((p, i) =>
                    i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
                );
                ctx.stroke();
                break;
            case "rectangle":
                ctx.strokeRect(
                    element.points[0].x,
                    element.points[0].y,
                    element.points[1].x - element.points[0].x,
                    element.points[1].y - element.points[0].y
                );
                break;
            case "circle":
                const radius = Math.hypot(
                    element.points[1].x - element.points[0].x,
                    element.points[1].y - element.points[0].y
                );
                ctx.beginPath();
                ctx.arc(
                    element.points[0].x,
                    element.points[0].y,
                    radius,
                    0,
                    2 * Math.PI
                );
                ctx.stroke();
                break;
            case "triangle":
                ctx.beginPath();
                ctx.moveTo(element.points[0].x, element.points[0].y);
                ctx.lineTo(element.points[1].x, element.points[1].y);
                ctx.lineTo(
                    element.points[0].x -
                        (element.points[1].x - element.points[0].x),
                    element.points[1].y
                );
                ctx.closePath();
                ctx.stroke();
                break;
            default:
                break;
        }
    };

    const clearCanvas = () =>
        contextRef.current.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
        );
    const scrollToBottom = () =>
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    useEffect(scrollToBottom, [messages]);

    useEffect(() => {
        if (!token) return;
        const socket = io(SERVER_URL, { auth: { token } });
        socketRef.current = socket;

        const canvas = canvasRef.current;
        canvas.width = canvas.parentElement.offsetWidth;
        canvas.height = canvas.parentElement.offsetHeight;
        contextRef.current = canvas.getContext("2d");

        socket.emit("join_session", { sessionId });
        socket.on("load_session_data", ({ strokes, messages }) => {
            strokes.forEach((element) =>
                drawElement(contextRef.current, element)
            );
            setMessages(messages || []);
        });
        socket.on("draw", (element) =>
            drawElement(contextRef.current, element)
        );
        socket.on("receive_message", (message) =>
            setMessages((prev) => [...prev, message])
        );
        socket.on("clear_board", clearCanvas);

        return () => socket.disconnect();
    }, [sessionId, token]);

    const startDrawing = ({ nativeEvent: { offsetX, offsetY } }) => {
        setIsDrawing(true);
        if (tool === "brush") {
            currentPoints.current = [{ x: offsetX, y: offsetY }];
        } else {
            startPoint.current = { x: offsetX, y: offsetY };
            snapshot.current = contextRef.current.getImageData(
                0,
                0,
                canvasRef.current.width,
                canvasRef.current.height
            );
        }
    };

    const draw = ({ nativeEvent: { offsetX, offsetY } }) => {
        if (!isDrawing) return;
        const ctx = contextRef.current;
        if (tool === "brush") {
            currentPoints.current.push({ x: offsetX, y: offsetY });
            drawElement(ctx, {
                type: "brush",
                points: currentPoints.current,
                color,
                lineWidth,
            });
        } else {
            ctx.putImageData(snapshot.current, 0, 0);
            drawElement(ctx, {
                type: tool,
                points: [startPoint.current, { x: offsetX, y: offsetY }],
                color,
                lineWidth,
            });
        }
    };

    const finishDrawing = ({ nativeEvent: { offsetX, offsetY } }) => {
        if (!isDrawing) return;
        setIsDrawing(false);
        let element = null;
        if (tool === "brush") {
            if (currentPoints.current.length > 1)
                element = {
                    type: "brush",
                    points: currentPoints.current,
                    color,
                    lineWidth,
                };
        } else {
            element = {
                type: tool,
                points: [startPoint.current, { x: offsetX, y: offsetY }],
                color,
                lineWidth,
            };
            drawElement(contextRef.current, element);
        }
        if (element) socketRef.current.emit("draw", { sessionId, element });
        currentPoints.current = [];
        startPoint.current = null;
        snapshot.current = null;
    };

    const handleSendMessage = (e) => {
        e.preventDefault();
        if (chatInput.trim()) {
            socketRef.current.emit("send_message", {
                sessionId,
                message: chatInput,
            });
            setChatInput("");
        }
    };

    const handleCopySessionId = () => {
        navigator.clipboard.writeText(sessionId).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        });
    };

    const handleSaveSession = async () => {
        try {
            const response = await fetch(
                `${SERVER_URL}/api/user/save-session`,
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ sessionId }),
                }
            );
            if (!response.ok) throw new Error("Failed to save.");
            setIsSaved(true);
            setTimeout(() => setIsSaved(false), 2500);
        } catch (error) {
            alert("Could not save the session.");
        }
    };

    return (
        <div className="whiteboard-page-container">
            <div className="canvas-area">
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
                            onChange={(e) =>
                                setLineWidth(Number(e.target.value))
                            }
                        />
                    </div>
                    <button
                        className="tool-button save-button"
                        onClick={handleSaveSession}
                        disabled={isSaved}
                    >
                        {isSaved ? "Saved!" : "Save Whiteboard"}
                    </button>
                    <button
                        className="tool-button copy-button"
                        onClick={handleCopySessionId}
                    >
                        {isCopied ? "Copied!" : "Copy ID"}
                    </button>
                    <button
                        className="clear-button"
                        onClick={() =>
                            socketRef.current.emit("clear_board", { sessionId })
                        }
                    >
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
            <div className="chat-panel">
                <div className="chat-header">Session Chat</div>
                <ul className="message-list">
                    {messages.map((msg, index) => (
                        <li key={index} className="message-item">
                            <span className="message-sender">
                                {msg.sender}:
                            </span>
                            <p className="message-text">{msg.text}</p>
                            <span className="message-timestamp">
                                {new Date(msg.timestamp).toLocaleTimeString(
                                    [],
                                    { hour: "2-digit", minute: "2-digit" }
                                )}
                            </span>
                        </li>
                    ))}
                    <div ref={messagesEndRef} />
                </ul>
                <form className="chat-form" onSubmit={handleSendMessage}>
                    <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a message..."
                    />
                    <button type="submit">Send</button>
                </form>
            </div>
        </div>
    );
};

export default Whiteboard;
