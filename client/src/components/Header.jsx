import React, { useContext } from "react";
import { Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

function Header() {
    const { user, logout } = useContext(AuthContext);

    return (
        <header className="app-header">
            <Link to={user ? "/dashboard" : "/login"} className="logo">
                Collaborative Whiteboard
            </Link>
            <nav>
                {user && (
                    <>
                        <span className="user-greeting">
                            Welcome, {user.username}
                        </span>
                        <button onClick={logout} className="logout-button">
                            Logout
                        </button>
                    </>
                )}
            </nav>
        </header>
    );
}

export default Header;
