"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "../context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Plant {
  id: number;
  name: string;
  species: string;
  age: number;
  location: string;
  created_at: string;
  health_score: number;
}

export default function DashboardPage() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsLoading, setPlantsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  // Fetch registered plants from backend
  const fetchPlants = async () => {
    if (!token) return;
    setPlantsLoading(true);
    setError(null);
    try {
      const res = await fetch("http://127.0.0.1:8001/plants/", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (!res.ok) {
        throw new Error("Failed to fetch plants data.");
      }
      const data = await res.json();
      setPlants(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load plants.");
    } finally {
      setPlantsLoading(false);
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchPlants();
    }
  }, [user, token]);

  useEffect(() => {
    // Set initial dark mode state from class
    setDarkMode(document.body.classList.contains("dark-mode"));
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    if (nextDark) {
      document.body.classList.add("dark-mode");
      document.body.classList.remove("light-mode");
    } else {
      document.body.classList.add("light-mode");
      document.body.classList.remove("dark-mode");
    }
  };

  if (authLoading || !user) {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "var(--bg-color)"
      }}>
        <div style={{ textAlign: "center" }}>
          <span style={{ fontSize: "2rem" }}>🌿</span>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Verifying session status...</p>
        </div>
      </div>
    );
  }

  // Calculate stats based on real plant list (honest, non-fabricated metrics!)
  const totalPlants = plants.length;
  const healthyCount = plants.filter(p => p.health_score >= 80).length;
  const atRiskCount = plants.filter(p => p.health_score >= 50 && p.health_score < 80).length;
  const needsExpertCount = plants.filter(p => p.health_score < 50).length;
  
  const survivalRate = totalPlants > 0 
    ? Math.round(((totalPlants - needsExpertCount) / totalPlants) * 100) 
    : 100;
    
  // Est Carbon impact: ~0.15kg CO2 per month (5g/day) per plant age (rough formula-based estimate)
  const totalCarbonCO2 = plants.reduce((acc, p) => {
    // age is stored in days. 5g = 0.005kg CO2 absorbed per day
    return acc + (p.age * 0.005);
  }, 0);

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
          <Link href="/" style={{ fontSize: "1.25rem", fontWeight: "bold", color: "var(--primary-color)", textDecoration: "none" }}>
            🌿 Verdant AI
          </Link>
          <span style={{ 
            fontSize: "0.75rem", 
            backgroundColor: "var(--border-color)", 
            padding: "0.15rem 0.5rem", 
            borderRadius: "4px",
            color: "var(--text-secondary)",
            marginLeft: "0.5rem"
          }}>Dashboard</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)", display: "none", md: "inline" }}>
            Logged in as: <strong>{user.email}</strong>
          </span>
          
          <button
            onClick={toggleDarkMode}
            className="button"
            style={{
              backgroundColor: "transparent",
              border: "1px solid var(--secondary-color)",
              color: "var(--text-primary)",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem"
            }}
            aria-label="Toggle Dark Mode"
          >
            {darkMode ? "☀️ Light" : "🌙 Dark"}
          </button>

          <button
            onClick={logout}
            className="button"
            style={{
              backgroundColor: "var(--danger-color)",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem"
            }}
          >
            Log Out
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem"
      }} className="container">
        
        {/* Welcome Banner */}
        <div className="card" style={{ borderLeft: "5px solid var(--primary-color)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem", marginBottom: 0 }}>
          <div style={{ flex: 1, minWidth: "280px" }}>
            <h1 style={{ fontSize: "1.5rem", color: "var(--primary-color)" }}>Your Plant Garden</h1>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginTop: "0.25rem" }}>
              Monitor and diagnose your household greenery. Click the button to add a new plant via leaf scan.
            </p>
          </div>
          <Link href="/plants/new" className="button" style={{ fontSize: "0.95rem" }}>
            ➕ Register New Plant
          </Link>
        </div>

        {/* Stats Metrics Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1.5rem" }}>
          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "normal" }}>Registered Plants</h3>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--primary-color)" }}>{totalPlants}</div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {healthyCount} healthy • {atRiskCount} at risk
            </span>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "normal" }}>Survival Rate</h3>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--success-color)" }}>{survivalRate}%</div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              {needsExpertCount} plants need attention
            </span>
          </div>

          <div className="card" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: "0.9rem", color: "var(--text-secondary)", marginBottom: "0.5rem", fontWeight: "normal" }}>CO₂ Absorbed Estimate</h3>
            <div style={{ fontSize: "2rem", fontWeight: "bold", color: "var(--secondary-color)" }}>{totalCarbonCO2.toFixed(3)} kg</div>
            <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>
              Formula-based on plant age
            </span>
          </div>
        </div>

        {/* Main Content Area */}
        {error && (
          <div style={{
            backgroundColor: "rgba(220, 38, 38, 0.1)",
            border: "1px solid var(--danger-color)",
            color: "var(--danger-color)",
            padding: "1rem",
            borderRadius: "8px",
            fontSize: "0.95rem"
          }}>
            ⚠️ {error}
          </div>
        )}

        {plantsLoading ? (
          <div style={{ textAlign: "center", padding: "3rem" }}>
            <p style={{ color: "var(--text-secondary)" }}>Loading your plants list...</p>
          </div>
        ) : plants.length === 0 ? (
          /* Empty State */
          <div className="card" style={{ minHeight: "300px", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", textAlign: "center", marginBottom: 0 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🌱</div>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>No Plants Registered Yet</h2>
            <p style={{ color: "var(--text-secondary)", maxWidth: "450px", marginBottom: "1.5rem", fontSize: "0.95rem" }}>
              To start getting continuous care guidance, add your first plant by uploading a leaf photo. We will identify its species and run an immediate diagnostic scan.
            </p>
            <Link href="/plants/new" className="button" style={{ fontSize: "0.95rem" }}>
              ➕ Register Your First Plant
            </Link>
          </div>
        ) : (
          /* Plants Grid */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2rem"
          }}>
            {plants.map((plant) => {
              // Health status logic
              let statusLabel = "Healthy";
              let statusClass = "badge-success";
              let statusIcon = "💚";
              
              if (plant.health_score < 50) {
                statusLabel = "Needs Expert";
                statusClass = "badge-danger";
                statusIcon = "🚨";
              } else if (plant.health_score < 80) {
                statusLabel = "At Risk";
                statusClass = "badge-warning";
                statusIcon = "⚠️";
              }

              return (
                <div key={plant.id} className="card" style={{ marginBottom: 0, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    {/* Card Header */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                      <div>
                        <h2 style={{ fontSize: "1.15rem", color: "var(--primary-color)" }}>{plant.name}</h2>
                        <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                          {plant.species}
                        </span>
                      </div>
                      
                      {/* Health score ring indicator */}
                      <div style={{
                        width: "42px",
                        height: "42px",
                        borderRadius: "50%",
                        border: `3px solid ${
                          plant.health_score >= 80 ? "var(--success-color)" : 
                          plant.health_score >= 50 ? "var(--warning-color)" : "var(--danger-color)"
                        }`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "0.8rem",
                        fontWeight: "bold",
                        backgroundColor: "var(--bg-color)"
                      }} aria-label={`Health score: ${plant.health_score} percent`}>
                        {plant.health_score}
                      </div>
                    </div>

                    {/* Plant Meta Details */}
                    <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1.5rem" }}>
                      <div>📍 Location: <strong>{plant.location}</strong></div>
                      <div>📅 Age: <strong>{Math.round(plant.age)} days</strong></div>
                    </div>
                  </div>

                  {/* Card Footer: Status Badge and Action */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-color)", paddingTop: "0.75rem", marginTop: "0.5rem" }}>
                    <span className={`badge ${statusClass}`} style={{ display: "inline-flex", gap: "0.25rem" }}>
                      <span>{statusIcon}</span>
                      <span>{statusLabel}</span>
                    </span>
                    
                    <Link href={`/plants/${plant.id}`} style={{ fontSize: "0.85rem", fontWeight: "bold" }}>
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* Footer */}
      <footer style={{
        borderTop: "1px solid var(--border-color)",
        padding: "1rem 2rem",
        textAlign: "center",
        fontSize: "0.85rem",
        color: "var(--text-secondary)",
        backgroundColor: "var(--card-bg)"
      }}>
        Verdant AI • Day 1 Hackathon Garden • Protect Plant Life
      </footer>
    </div>
  );
}
