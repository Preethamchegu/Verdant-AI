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

interface Reminder {
  id: number;
  plant_id: number;
  type: string;
  interval_days: number;
  next_due: string;
  last_completed?: string;
  reasoning: string;
  plant_name?: string;
  plant_species?: string;
}

export default function DashboardPage() {
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [plants, setPlants] = useState<Plant[]>([]);
  const [plantsLoading, setPlantsLoading] = useState<boolean>(true);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [remindersLoading, setRemindersLoading] = useState<boolean>(true);
  const [completeSuccess, setCompleteSuccess] = useState<string | null>(null);
  
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

  // Fetch reminders from backend
  const fetchReminders = async () => {
    if (!token) return;
    setRemindersLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8001/plants/reminders/all", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error("Failed to load reminders", err);
    } finally {
      setRemindersLoading(false);
    }
  };

  const handleCompleteReminder = async (plantId: number, reminderId: number, type: string) => {
    if (!token) return;
    try {
      const res = await fetch(`http://127.0.0.1:8001/plants/${plantId}/reminders/${reminderId}/complete`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      if (res.ok) {
        setCompleteSuccess(`Completed ${type} task! Health score updated.`);
        setTimeout(() => setCompleteSuccess(null), 4000);
        // Refresh data
        fetchPlants();
        fetchReminders();
      } else {
        alert("Failed to complete task.");
      }
    } catch (err) {
      console.error(err);
      alert("Error completing task.");
    }
  };

  useEffect(() => {
    if (user && token) {
      fetchPlants();
      fetchReminders();
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

  // Date formatting utility for relative due dates
  const getDueText = (nextDueStr: string) => {
    const nextDue = new Date(nextDueStr);
    const now = new Date();
    
    const d1 = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
    const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const diffTime = d1.getTime() - d2.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) {
      return { text: `Overdue by ${Math.abs(diffDays)} day(s)`, class: "text-danger" };
    } else if (diffDays === 0) {
      return { text: "Due Today", class: "text-warning" };
    } else if (diffDays === 1) {
      return { text: "Due Tomorrow", class: "text-primary" };
    } else {
      return { text: `Due in ${diffDays} days`, class: "text-secondary" };
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
          <span style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
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

        {/* Main Content Two-Column Grid */}
        <div style={{
          display: "flex",
          flexDirection: "row",
          flexWrap: "wrap",
          gap: "1.5rem",
          alignItems: "flex-start"
        }}>
          {/* Left Column: Plants List Grid */}
          <div style={{ flex: "2 1 600px" }}>
            {error && (
              <div style={{
                backgroundColor: "rgba(220, 38, 38, 0.1)",
                border: "1px solid var(--danger-color)",
                color: "var(--danger-color)",
                padding: "1rem",
                borderRadius: "8px",
                fontSize: "0.95rem",
                marginBottom: "1.5rem"
              }}>
                ⚠️ {error}
              </div>
            )}

            {plantsLoading ? (
              <div style={{ textAlign: "center", padding: "3rem" }}>
                <p style={{ color: "var(--text-secondary)" }}>Loading your plants list...</p>
              </div>
            ) : plants.length === 0 ? (
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
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
                gap: "1.5rem",
                marginBottom: "2rem"
              }}>
                {plants.map((plant) => {
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
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: "1rem" }}>
                          <div>
                            <h2 style={{ fontSize: "1.15rem", color: "var(--primary-color)" }}>{plant.name}</h2>
                            <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", fontStyle: "italic" }}>
                              {plant.species}
                            </span>
                          </div>
                          
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

                        <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "1.5rem" }}>
                          <div>📍 Location: <strong>{plant.location}</strong></div>
                          <div>📅 Age: <strong>{Math.round(plant.age)} days</strong></div>
                        </div>
                      </div>

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

          {/* Right Column: Upcoming Care Actions Panel */}
          <div style={{ flex: "1 1 320px", minWidth: "280px" }} className="card">
            <h2 style={{ fontSize: "1.2rem", color: "var(--primary-color)", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              📅 Care Action List
            </h2>
            
            {completeSuccess && (
              <div style={{
                backgroundColor: "rgba(45, 106, 79, 0.1)",
                border: "1px solid var(--success-color)",
                color: "var(--success-color)",
                padding: "0.55rem 0.75rem",
                borderRadius: "6px",
                fontSize: "0.85rem",
                marginBottom: "1rem",
                fontWeight: "500"
              }}>
                {completeSuccess}
              </div>
            )}

            {remindersLoading ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading care schedule...</p>
            ) : reminders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "1.5rem 0" }}>
                <span style={{ fontSize: "2rem" }}>☀️</span>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem", marginTop: "0.5rem" }}>All plants are fully cared for! No pending tasks.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                {reminders.map((rem) => {
                  const dueInfo = getDueText(rem.next_due);
                  let icon = "💧";
                  if (rem.type === "fertilizer") icon = "🧪";
                  if (rem.type === "misting") icon = "💨";
                  
                  return (
                    <div 
                      key={rem.id} 
                      style={{ 
                        display: "flex", 
                        gap: "0.75rem", 
                        padding: "0.75rem", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        backgroundColor: "var(--bg-color)" 
                      }}
                    >
                      <div style={{ fontSize: "1.25rem", marginTop: "0.1rem" }}>{icon}</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.5rem" }}>
                          <strong style={{ fontSize: "0.9rem", color: "var(--text-primary)" }}>{rem.plant_name}</strong>
                          <span 
                            style={{ 
                              fontSize: "0.75rem", 
                              fontWeight: "bold",
                              whiteSpace: "nowrap",
                              color: dueInfo.class === "text-danger" ? "var(--danger-color)" :
                                     dueInfo.class === "text-warning" ? "var(--warning-color)" : 
                                     dueInfo.class === "text-primary" ? "var(--secondary-color)" : "var(--text-secondary)"
                            }}
                          >
                            {dueInfo.text}
                          </span>
                        </div>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", display: "block", textTransform: "capitalize", fontWeight: "500", marginTop: "0.15rem" }}>
                          Task: {rem.type}
                        </span>
                        <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.35rem", fontStyle: "italic", lineHeight: "1.35" }}>
                          {rem.reasoning}
                        </p>
                        
                        <button
                          onClick={() => handleCompleteReminder(rem.plant_id, rem.id, rem.type)}
                          style={{
                            marginTop: "0.6rem",
                            backgroundColor: "var(--secondary-color)",
                            border: "none",
                            color: "white",
                            padding: "0.3rem 0.6rem",
                            fontSize: "0.75rem",
                            fontWeight: "bold",
                            borderRadius: "4px",
                            cursor: "pointer",
                            transition: "background-color 0.2s"
                          }}
                          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "var(--primary-color)")}
                          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "var(--secondary-color)")}
                        >
                          ✓ Mark Done
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

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
