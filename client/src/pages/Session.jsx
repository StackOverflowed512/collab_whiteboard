import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import Whiteboard from "../components/Whiteboard";

function Session() {
    const { sessionId } = useParams();
    const navigate = useNavigate();
    const [userName, setUserName] = useState("");

    // On component mount, check if user name exists from the home page
    useEffect(() => {
        const storedUserName = sessionStorage.getItem("userName");
        if (!storedUserName) {
            // If no name is found, prompt the user or redirect
            const name = prompt("Please enter your name to join the session:");
            if (name) {
                setUserName(name);
                sessionStorage.setItem("userName", name);
            } else {
                // If they cancel, redirect back to home
                navigate("/");
            }
        } else {
            setUserName(storedUserName);
        }
    }, [navigate]);

    if (!userName) {
        // Render nothing or a loading indicator while waiting for user name
        return <div>Loading...</div>;
    }

    return (
        <div>
            <Whiteboard sessionId={sessionId} userName={userName} />
        </div>
    );
}

export default Session;
