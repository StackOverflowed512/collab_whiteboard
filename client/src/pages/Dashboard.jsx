import React, { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function Dashboard() {
    const [sessionIdToJoin, setSessionIdToJoin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    const handleCreateSession = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${SERVER_URL}/api/session`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });
            if (!response.ok) throw new Error("Failed to create session");
            const { sessionId } = await response.json();
            navigate(`/session/${sessionId}`);
        } catch (error) {
            console.error(error);
            alert("Could not create a new session.");
            setIsLoading(false);
        }
    };

    const handleJoinSession = (e) => {
        e.preventDefault();
        if (sessionIdToJoin.trim()) {
            navigate(`/session/${sessionIdToJoin.trim()}`);
        }
    };

    return (
        <div className="dashboard-container">
            <h1>Dashboard</h1>
            <div className="dashboard-actions">
                <div className="action-card">
                    <h2>Create New Whiteboard</h2>
                    <p>Start a fresh collaborative session.</p>
                    <button onClick={handleCreateSession} disabled={isLoading}>
                        {isLoading ? "Creating..." : "Create Session"}
                    </button>
                </div>
                <div className="action-card">
                    <h2>Join a Session</h2>
                    <p>Enter a session ID to join an existing whiteboard.</p>
                    <form onSubmit={handleJoinSession}>
                        <input
                            type="text"
                            placeholder="Enter Session ID"
                            value={sessionIdToJoin}
                            onChange={(e) => setSessionIdToJoin(e.target.value)}
                            className="session-id-input"
                        />
                        <button type="submit">Join</button>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default Dashboard;
