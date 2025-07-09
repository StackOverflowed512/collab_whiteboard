import React from "react";
import { useParams } from "react-router-dom";
import Whiteboard from "../components/Whiteboard";

function Session() {
    const { sessionId } = useParams();

    return <Whiteboard sessionId={sessionId} />;
}

export default Session;
