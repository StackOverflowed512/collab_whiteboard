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
                const storedUser = JSON.parse(localStorage.getItem("user"));
                setUser(storedUser);
            } catch (error) {
                console.error("Failed to parse user from localStorage", error);
                logout(); // If user data is corrupted, log out
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
