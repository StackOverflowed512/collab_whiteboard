import React, { useContext } from "react";
import { useParams } from "react-router-dom";
import Whiteboard from "../components/Whiteboard";
import { AuthContext } from "../context/AuthContext";

function Session() {
    const { sessionId } = useParams();
    const { user } = useContext(AuthContext);

    if (!user) {
        return <div>Loading user data...</div>;
    }

    return <Whiteboard sessionId={sessionId} />;
}

export default Session;
