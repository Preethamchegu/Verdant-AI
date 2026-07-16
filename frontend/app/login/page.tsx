"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../context/auth-context";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const { user, login, signup, loading, error } = useAuth();
  const [isLoginTab, setIsLoginTab] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [localError, setLocalError] = useState<string | null>(null);
  const router = useRouter();

  // If user is already logged in, redirect them to dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Basic client validation
    if (!email || !password) {
      setLocalError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setLocalError("Password must be at least 6 characters long.");
      return;
    }

    try {
      if (isLoginTab) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      // Errors are caught and set in AuthContext as well
      console.error(err);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      padding: "2rem",
      backgroundColor: "var(--bg-color)"
    }}>
      <div style={{ marginBottom: "2rem", textAlign: "center" }}>
        <Link href="/" style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary-color)", display: "block", marginBottom: "0.5rem" }}>
          🌿 Verdant AI
        </Link>
        <span style={{ color: "var(--text-secondary)" }}>Your plant care companion</span>
      </div>

      <div className="card" style={{ width: "100%", maxWidth: "450px", padding: "2rem" }}>
        {/* Tab Toggle */}
        <div style={{ display: "flex", borderBottom: "2px solid var(--border-color)", marginBottom: "2rem" }}>
          <button
            onClick={() => { setIsLoginTab(true); setLocalError(null); }}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "none",
              border: "none",
              borderBottom: isLoginTab ? "3px solid var(--secondary-color)" : "none",
              color: isLoginTab ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: isLoginTab ? "bold" : "normal",
              cursor: "pointer"
            }}
          >
            Log In
          </button>
          <button
            onClick={() => { setIsLoginTab(false); setLocalError(null); }}
            style={{
              flex: 1,
              padding: "0.75rem",
              background: "none",
              border: "none",
              borderBottom: !isLoginTab ? "3px solid var(--secondary-color)" : "none",
              color: !isLoginTab ? "var(--text-primary)" : "var(--text-secondary)",
              fontWeight: !isLoginTab ? "bold" : "normal",
              cursor: "pointer"
            }}
          >
            Sign Up
          </button>
        </div>

        {/* Error Banners */}
        {(localError || error) && (
          <div style={{
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            border: "1px solid var(--danger-color)",
            color: "var(--danger-color)",
            padding: "0.75rem 1rem",
            borderRadius: "6px",
            fontSize: "0.9rem",
            marginBottom: "1.5rem"
          }}>
            ⚠️ {localError || error}
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="email" style={{ fontWeight: 500, fontSize: "0.9rem" }}>Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                fontSize: "1rem",
                backgroundColor: "var(--card-bg)",
                color: "var(--text-primary)"
              }}
              required
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="password" style={{ fontWeight: 500, fontSize: "0.9rem" }}>Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={{
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                fontSize: "1rem",
                backgroundColor: "var(--card-bg)",
                color: "var(--text-primary)"
              }}
              required
            />
          </div>

          <button
            type="submit"
            className="button"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
            disabled={loading}
          >
            {loading ? "Please wait..." : isLoginTab ? "Log In" : "Sign Up"}
          </button>
        </form>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <Link href="/" style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
          ← Back to homepage
        </Link>
      </div>
    </div>
  );
}
