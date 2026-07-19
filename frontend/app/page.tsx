"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "./context/auth-context";

interface HealthStatus {
  status: string;
  database: string;
  message: string;
}

export default function Home() {
  const { user } = useAuth();
  const [backendHealth, setBackendHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  const applyTheme = (isDark: boolean) => {
    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);
  };

  // Fetch backend health endpoint on load
  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8001/health");
      if (!res.ok) {
        throw new Error(`HTTP error! Status: ${res.status}`);
      }
      const data: HealthStatus = await res.json();
      setBackendHealth(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to reach FastAPI backend");
      setBackendHealth(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();

    const savedTheme = window.localStorage.getItem("theme_mode");
    if (savedTheme === "dark" || savedTheme === "light") {
      const isDark = savedTheme === "dark";
      setDarkMode(isDark);
      applyTheme(isDark);
      return;
    }

    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    setDarkMode(systemPrefersDark);
    applyTheme(systemPrefersDark);
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    applyTheme(nextDark);
    window.localStorage.setItem("theme_mode", nextDark ? "dark" : "light");
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ 
        borderBottom: "1px solid var(--border-color)", 
        padding: "1rem 2rem", 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        backgroundColor: "var(--card-bg)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "1.5rem", fontWeight: "bold", color: "var(--primary-color)" }}>🌿 Verdant AI</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <button 
            onClick={toggleDarkMode}
            className="button"
            style={{ 
              backgroundColor: "transparent", 
              border: "1px solid var(--secondary-color)", 
              color: "var(--text-primary)",
              padding: "0.5rem 1rem",
              fontSize: "0.875rem"
            }}
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? "☀️ Light Mode" : "🌙 Dark Mode"}
          </button>
          
          {user ? (
            <Link href="/dashboard" className="button" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
              Dashboard
            </Link>
          ) : (
            <Link href="/login" className="button" style={{ padding: "0.5rem 1rem", fontSize: "0.875rem" }}>
              Log In / Sign Up
            </Link>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
        
        {/* Hero Section */}
        <section style={{ 
          backgroundColor: "var(--card-bg)", 
          borderBottom: "1px solid var(--border-color)", 
          padding: "5rem 2rem", 
          textAlign: "center"
        }}>
          <div className="container" style={{ maxWidth: "800px" }}>
            <h1 style={{ color: "var(--primary-color)", fontSize: "3rem", marginBottom: "1.5rem" }}>
              Every plant deserves a fighting chance.
            </h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "1.25rem", marginBottom: "2.5rem", lineHeight: "1.7" }}>
              Verdant AI is your plant care companion. Most plant apps stop at simple identification. We take it further: 
              upload photos to identify species, scan for active diseases with verified confidence scores, and get actionable, 
              calculated treatment and watering schedules to ensure your plants thrive.
            </p>
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "center" }}>
              {user ? (
                <Link href="/dashboard" className="button" style={{ fontSize: "1.125rem", padding: "0.875rem 2rem" }}>
                  Go to Dashboard →
                </Link>
              ) : (
                <>
                  <Link href="/login" className="button" style={{ fontSize: "1.125rem", padding: "0.875rem 2rem" }}>
                    Get Started (Free)
                  </Link>
                  <Link href="/login" className="button" style={{ 
                    fontSize: "1.125rem", 
                    padding: "0.875rem 2rem",
                    backgroundColor: "transparent",
                    border: "1px solid var(--secondary-color)",
                    color: "var(--text-primary)"
                  }}>
                    Sign In
                  </Link>
                </>
              )}
            </div>
          </div>
        </section>

        {/* Feature Grid */}
        <section className="container" style={{ padding: "4rem 1.5rem" }}>
          <h2 style={{ textAlign: "center", marginBottom: "3rem", color: "var(--primary-color)", fontSize: "2rem" }}>
            Features Built for Plant Survival
          </h2>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "2rem" }}>
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🔍</div>
              <h3 style={{ marginBottom: "0.5rem" }}>AI Identification</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Instantly identify species with high-speed pretrained classification. Store profiles for every plant.
              </p>
            </div>
            
            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🩺</div>
              <h3 style={{ marginBottom: "0.5rem" }}>Disease Scan & Scores</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Scan leaves for bacterial/fungal infections or deficiencies. Shows an honest confidence score and handles escalation flags.
              </p>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📅</div>
              <h3 style={{ marginBottom: "0.5rem" }}>Rule-Based Care Schedules</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Tailored care guidelines for water, sunlight, and pruning. No random intervals; based on real species parameters.
              </p>
            </div>

            <div className="card" style={{ marginBottom: 0 }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>📈</div>
              <h3 style={{ marginBottom: "0.5rem" }}>survival Impact Dashboard</h3>
              <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>
                Tracks plant health history, calculates plant survival rates, and estimates ecological carbon impact metrics.
              </p>
            </div>
          </div>
        </section>

        {/* System Health Check Section */}
        <section style={{ backgroundColor: "var(--card-bg)", borderTop: "1px solid var(--border-color)", padding: "3rem 1.5rem" }}>
          <div className="container" style={{ maxWidth: "900px" }}>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "1.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>System Integration Status</span>
              <button 
                onClick={checkHealth}
                className="button"
                style={{ padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}
              >
                🔄 Refresh
              </button>
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-color)", padding: "1rem", borderRadius: "8px" }}>
                <span>Frontend:</span>
                <span className="badge badge-success">ONLINE</span>
              </div>
              
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-color)", padding: "1rem", borderRadius: "8px" }}>
                <span>Backend API:</span>
                {loading ? (
                  <span className="badge badge-info">PINGING...</span>
                ) : error ? (
                  <span className="badge badge-danger">OFFLINE</span>
                ) : (
                  <span className="badge badge-success">ONLINE</span>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "var(--bg-color)", padding: "1rem", borderRadius: "8px" }}>
                <span>Local DB Schema:</span>
                {loading ? (
                  <span className="badge badge-info">CHECKING...</span>
                ) : error ? (
                  <span className="badge badge-danger">OFFLINE</span>
                ) : backendHealth?.database === "connected" ? (
                  <span className="badge badge-success">CONNECTED</span>
                ) : (
                  <span className="badge badge-danger">DISCONNECTED</span>
                )}
              </div>
            </div>

            {error && (
              <div style={{ 
                backgroundColor: "rgba(220, 38, 38, 0.1)", 
                border: "1px solid var(--danger-color)",
                color: "var(--danger-color)",
                padding: "0.75rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                textAlign: "center"
              }}>
                ⚠️ <strong>Connection details:</strong> {error}
              </div>
            )}
          </div>
        </section>

      </main>

      {/* Footer */}
      <footer style={{ 
        borderTop: "1px solid var(--border-color)", 
        padding: "1.5rem 2rem", 
        textAlign: "center",
        fontSize: "0.875rem",
        color: "var(--text-secondary)",
        backgroundColor: "var(--card-bg)"
      }}>
        Verdant AI • Day 1 MVP • Protect Plant Life
      </footer>
    </div>
  );
}
