import React, { useState, useEffect, useContext } from "react";
import { useNavigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function Dashboard() {
    const [sessionIdToJoin, setSessionIdToJoin] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [savedSessions, setSavedSessions] = useState([]);
    const { token } = useContext(AuthContext);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSavedSessions = async () => {
            if (!token) return;
            try {
                const response = await fetch(
                    `${SERVER_URL}/api/user/saved-sessions`,
                    {
                        headers: { Authorization: `Bearer ${token}` },
                    }
                );
                if (!response.ok)
                    throw new Error("Failed to fetch saved sessions.");
                setSavedSessions(await response.json());
            } catch (error) {
                console.error(error);
            }
        };
        fetchSavedSessions();
    }, [token]);

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
            <div className="saved-sessions-section">
                <h2>My Saved Whiteboards</h2>
                {savedSessions.length > 0 ? (
                    <ul className="sessions-list">
                        {savedSessions.map((session) => (
                            <li key={session._id} className="session-item">
                                <Link to={`/session/${session.sessionId}`}>
                                    <span className="session-id-text">
                                        ID: {session.sessionId}
                                    </span>
                                    <span className="session-date">
                                        Created:{" "}
                                        {new Date(
                                            session.createdAt
                                        ).toLocaleDateString()}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>
                        You have no saved whiteboards. Click "Save Whiteboard"
                        in a session to add it here.
                    </p>
                )}
            </div>
        </div>
    );
}

export default Dashboard;
