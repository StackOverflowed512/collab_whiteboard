import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

function Home() {
    const [userName, setUserName] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleCreateSession = async (e) => {
        e.preventDefault();
        if (!userName.trim()) {
            alert("Please enter your name.");
            return;
        }
        setIsLoading(true);
        try {
            const response = await fetch(`${SERVER_URL}/api/session`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
            });
            if (!response.ok) throw new Error("Failed to create session");

            const { sessionId } = await response.json();

            // Store user name in session storage to be accessible on the next page
            sessionStorage.setItem("userName", userName);

            navigate(`/session/${sessionId}`);
        } catch (error) {
            console.error(error);
            alert("Could not create a new session. Please try again.");
            setIsLoading(false);
        }
    };

    return (
        <div className="home-container">
            <h1>Collaborative Whiteboard</h1>
            <form onSubmit={handleCreateSession} className="home-form">
                <input
                    type="text"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    required
                    className="name-input"
                />
                <button
                    type="submit"
                    disabled={isLoading}
                    className="create-button"
                >
                    {isLoading ? "Creating..." : "Create New Whiteboard"}
                </button>
            </form>
        </div>
    );
}

export default Home;
