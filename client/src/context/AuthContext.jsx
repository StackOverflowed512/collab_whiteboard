import React, { createContext, useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem("token"));
    const [isLoading, setIsLoading] = useState(true);
    const navigate = useNavigate();

    const login = (userData, userToken) => {
        localStorage.setItem("token", userToken);
        localStorage.setItem("user", JSON.stringify(userData));
        setToken(userToken);
        setUser(userData);
        navigate("/dashboard");
    };

    const logout = useCallback(() => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        navigate("/login");
    }, [navigate]);

    useEffect(() => {
        if (token) {
            try {
                setUser(JSON.parse(localStorage.getItem("user")));
            } catch (error) {
                logout();
            }
        }
        setIsLoading(false);
    }, [token, logout]);

    return (
        <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
            {!isLoading && children}
        </AuthContext.Provider>
    );
};
