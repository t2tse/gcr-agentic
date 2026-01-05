"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect } from "react";

export default function LoginPage() {
    const { user, signInWithGoogle } = useAuth();

    // If already logged in, redirect? Handled by Context or user choice

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
            <div className="p-8 bg-white rounded-lg shadow-md w-96 text-center">
                <h1 className="text-2xl font-bold mb-6 text-gray-800">My Personal Assistant</h1>
                <p className="text-gray-600 mb-8">Sign in to organize your life</p>
                <button
                    onClick={signInWithGoogle}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition"
                >
                    Sign in with Google
                </button>
            </div>
        </div>
    );
}
