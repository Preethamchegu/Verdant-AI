"use client";

import React, { useEffect, useState, use } from "react";
import { useAuth } from "../../context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/app/config";

interface Plant {
  id: number;
  name: string;
  species: string;
  age: number; // in days
  location: string;
  created_at: string;
  health_score: number;
  image_data: string; // base64
}

interface DiagnosisResult {
  condition: string;
  is_healthy: boolean;
  confidence: number;
  needs_expert: boolean;
  treatments: string[];
  health_score: number;
}

interface TimelineEvent {
  event_type: "diagnosis" | "health_update";
  date: string;
  title: string;
  subtitle: string;
  meta: string;
}

interface Reminder {
  id: number;
  plant_id: number;
  type: string;
  interval_days: number;
  next_due: string;
  last_completed?: string;
  reasoning: string;
}

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlantDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const plantId = resolvedParams.id;
  
  const { user, token, logout, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core data states
  const [plant, setPlant] = useState<Plant | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [remindersLoading, setRemindersLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scan & diagnosis states
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<DiagnosisResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

interface PlantImpact {
  plant_id: number;
  carbon_co2_kg: number;
  water_saved_liters: number;
  c_rate: number;
  water_saved_per_day: number;
  formula_details: string;
}

// Location & Dark Mode states
  const [activeLocation, setActiveLocation] = useState<string>("");
  const [showLocationModal, setShowLocationModal] = useState<boolean>(false);
  const [locationInput, setLocationInput] = useState<string>("");
  const [locLoading, setLocLoading] = useState<boolean>(false);
  const [weatherInfo, setWeatherInfo] = useState<{ temp: number; humidity: number } | null>(null);
  const [impact, setImpact] = useState<PlantImpact | null>(null);
  const [impactLoading, setImpactLoading] = useState<boolean>(true);
  const [darkMode, setDarkMode] = useState<boolean>(false);
  const [fontScale, setFontScale] = useState<"normal" | "large" | "xlarge">("normal");

  const applyFontScale = (scale: "normal" | "large" | "xlarge") => {
    document.body.classList.remove("font-scale-large", "font-scale-xlarge");
    if (scale === "large") {
      document.body.classList.add("font-scale-large");
    } else if (scale === "xlarge") {
      document.body.classList.add("font-scale-xlarge");
    }
  };

  const cycleFontScale = () => {
    let nextScale: "normal" | "large" | "xlarge" = "normal";
    if (fontScale === "normal") nextScale = "large";
    else if (fontScale === "large") nextScale = "xlarge";
    else nextScale = "normal";
    
    setFontScale(nextScale);
    localStorage.setItem("font_scale", nextScale);
    applyFontScale(nextScale);
  };

  const getSearchTerm = (treatment: string) => {
    const t = treatment.toLowerCase();
    if (t.includes("neem oil")) return "neem oil spray";
    if (t.includes("copper")) return "copper fungicide";
    if (t.includes("sulfur")) return "sulfur fungicide";
    if (t.includes("insecticidal")) return "insecticidal soap";
    if (t.includes("fertilizer") || t.includes("fertiliz")) return "plant fertilizer";
    if (t.includes("prun") || t.includes("shear")) return "pruning shears";
    if (t.includes("soap")) return "castile soap";
    return "garden center plant nursery";
  };

  const fetchWeatherInfo = async (locationStr: string) => {
    if (!token || !locationStr) return;
    try {
      const res = await fetch(`${API_BASE_URL}/plants/weather/current?location=${encodeURIComponent(locationStr)}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setWeatherInfo({ temp: data.temp, humidity: data.humidity });
      }
    } catch (err) {
      console.error("Failed to fetch weather info", err);
    }
  };

  useEffect(() => {
    if (activeLocation && token) {
      fetchWeatherInfo(activeLocation);
    }
  }, [activeLocation, token]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const applyTheme = (isDark: boolean) => {
    document.body.classList.toggle("dark-mode", isDark);
    document.body.classList.toggle("light-mode", !isDark);
  };

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("theme_mode");
    if (savedTheme === "dark" || savedTheme === "light") {
      const isDark = savedTheme === "dark";
      setDarkMode(isDark);
      applyTheme(isDark);
    } else {
      setDarkMode(document.body.classList.contains("dark-mode"));
      applyTheme(document.body.classList.contains("dark-mode"));
    }

    const saved = localStorage.getItem("user_location");
    if (saved) {
      setActiveLocation(saved);
    } else {
      detectIPLocation();
    }
    
    const savedScale = localStorage.getItem("font_scale") as "normal" | "large" | "xlarge";
    if (savedScale) {
      setFontScale(savedScale);
      applyFontScale(savedScale);
    }
  }, []);

  const toggleDarkMode = () => {
    const nextDark = !darkMode;
    setDarkMode(nextDark);
    applyTheme(nextDark);
    window.localStorage.setItem("theme_mode", nextDark ? "dark" : "light");
  };

  const resolvePincode = async (pincode: string): Promise<string> => {
    const trimmed = pincode.trim();
    if (/^\d{5}$/.test(trimmed)) {
      try {
        const res = await fetch(`https://api.zippopotam.us/us/${trimmed}`);
        if (res.ok) {
          const data = await res.json();
          const place = data.places[0];
          return `${place["place name"]}, ${place["state abbreviation"]}`;
        }
      } catch (err) { console.error(err); }
    } else if (/^\d{6}$/.test(trimmed)) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${trimmed}`);
        if (res.ok) {
          const data = await res.json();
          if (data[0] && data[0].PostOffice) {
            const po = data[0].PostOffice[0];
            return `${po.District}, ${po.State}`;
          }
        }
      } catch (err) { console.error(err); }
    }
    return trimmed;
  };

  const detectIPLocation = async () => {
    try {
      const res = await fetch("https://ipapi.co/json/");
      if (res.ok) {
        const data = await res.json();
        if (data.city) {
          const locStr = `${data.city}, ${data.country_code || data.country_name}`;
          localStorage.setItem("user_location", locStr);
          setActiveLocation(locStr);
          if (data.postal) {
            localStorage.setItem("user_pincode", data.postal);
          } else {
            localStorage.removeItem("user_pincode");
          }
        }
      }
    } catch (err) {
      console.error("Auto-IP Geolocation failed:", err);
    }
  };

  const handleSaveLocation = async () => {
    const trimmedInput = locationInput.trim();
    if (!trimmedInput) return;
    setLocLoading(true);
    try {
      const resolved = await resolvePincode(trimmedInput);
      localStorage.setItem("user_location", resolved);
      setActiveLocation(resolved);
      
      const isNumericPincode = /^\d{5}$/.test(trimmedInput) || /^\d{6}$/.test(trimmedInput);
      if (isNumericPincode) {
        localStorage.setItem("user_pincode", trimmedInput);
      } else {
        localStorage.removeItem("user_pincode");
      }
      
      setShowLocationModal(false);
      // Refresh reminders
      fetchReminders();
    } catch (err) {
      console.error(err);
    } finally {
      setLocLoading(false);
    }
  };

  const fetchPlantData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch plant details
      const plantRes = await fetch(`${API_BASE_URL}/plants/${plantId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!plantRes.ok) {
        if (plantRes.status === 404) {
          throw new Error("Plant not found or access denied.");
        }
        throw new Error("Failed to fetch plant profile.");
      }
      const plantData = await plantRes.json();
      setPlant(plantData);

      // 2. Fetch history timeline
      const timelineRes = await fetch(`${API_BASE_URL}/plants/${plantId}/history`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (timelineRes.ok) {
        const timelineData = await timelineRes.json();
        setTimeline(timelineData);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to load plant details.");
    } finally {
      setLoading(false);
    }
  };

  const fetchReminders = async () => {
    if (!token) return;
    setRemindersLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/plants/${plantId}/reminders`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setReminders(data);
      }
    } catch (err) {
      console.error("Failed to fetch reminders:", err);
    } finally {
      setRemindersLoading(false);
    }
  };

  const fetchPlantImpact = async () => {
    if (!token) return;
    setImpactLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/plants/${plantId}/impact`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setImpact(data);
      }
    } catch (err) {
      console.error("Failed to fetch plant impact:", err);
    } finally {
      setImpactLoading(false);
    }
  };

  const handleCompleteReminder = async (reminderId: number, type: string) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/plants/${plantId}/reminders/${reminderId}/complete`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        // Refresh everything
        fetchPlantData();
        fetchReminders();
        fetchPlantImpact();
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
      fetchPlantData();
      fetchReminders();
      fetchPlantImpact();
    }
  }, [user, token, plantId]);

  const handleRunDiagnosis = async () => {
    if (!token) return;
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await fetch(`${API_BASE_URL}/plants/${plantId}/diagnose`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Scan timed out or server error." }));
        throw new Error(errData.detail || "Failed to run leaf diagnosis.");
      }

      const resultData = await res.json();
      setScanResult(resultData);
      
      // Refresh plant health score, history timeline, and reminders
      fetchPlantData();
      fetchReminders();
      fetchPlantImpact();
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "Diagnostic check failed.");
    } finally {
      setScanning(false);
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
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--bg-color)" }}>
        <p>Loading authorization state...</p>
      </div>
    );
  }

  if (loading && !plant) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--bg-color)" }}>
        <div style={{ textAlign: "center" }}>
          <span>🌿</span>
          <p style={{ marginTop: "1rem", color: "var(--text-secondary)" }}>Fetching plant profile details...</p>
        </div>
      </div>
    );
  }

  if (error || !plant) {
    return (
      <div style={{ minHeight: "100vh", padding: "3rem 1.5rem", backgroundColor: "var(--bg-color)" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto", textAlign: "center" }}>
          <span style={{ fontSize: "3rem" }}>⚠️</span>
          <h1 style={{ color: "var(--primary-color)", marginTop: "1rem" }}>Access Failed</h1>
          <p style={{ color: "var(--text-secondary)", marginTop: "0.5rem" }}>{error || "Plant profile not found."}</p>
          <Link href="/dashboard" className="button" style={{ display: "inline-block", marginTop: "1.5rem" }}>
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

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
          
          <button 
            onClick={() => {
              setLocationInput(activeLocation);
              setShowLocationModal(true);
            }}
            style={{
              background: "none",
              border: "1px solid var(--border-color)",
              borderRadius: "20px",
              padding: "0.25rem 0.75rem",
              fontSize: "0.85rem",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              marginLeft: "1rem",
              color: "var(--text-primary)",
              backgroundColor: "var(--bg-color)",
              transition: "border-color 0.2s"
            }}
            onMouseOver={(e) => (e.currentTarget.style.borderColor = "var(--secondary-color)")}
            onMouseOut={(e) => (e.currentTarget.style.borderColor = "var(--border-color)")}
          >
            📍 {activeLocation || "Detect Location..."}
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {weatherInfo && (
            <span style={{ 
              fontSize: "0.85rem", 
              backgroundColor: "var(--border-color)", 
              padding: "0.3rem 0.65rem", 
              borderRadius: "15px",
              color: "var(--text-primary)",
              fontWeight: "bold",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              marginRight: "0.5rem"
            }}>
              <span>🌡️ {Math.round(weatherInfo.temp)}°C</span>
              <span style={{ color: "var(--text-secondary)", fontWeight: "normal" }}>|</span>
              <span>💧 {Math.round(weatherInfo.humidity)}%</span>
            </span>
          )}
          
          <button
            onClick={cycleFontScale}
            className="button"
            style={{
              backgroundColor: "transparent",
              border: "1px solid var(--secondary-color)",
              color: "var(--text-primary)",
              padding: "0.4rem 0.8rem",
              fontSize: "0.85rem",
              marginRight: "0.25rem"
            }}
            aria-label="Adjust text size"
          >
            {fontScale === "normal" ? "A Standard" : fontScale === "large" ? "A+ Large" : "A++ Extra Large"}
          </button>

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

      <div style={{ flex: 1, padding: "2rem 1.5rem", backgroundColor: "var(--bg-color)" }}>
        <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        
        {/* Navigation Breadcrumb */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            ← Back to Dashboard
          </Link>
        </div>

        {/* Profile Card Header */}
        <div className="card" style={{ display: "flex", flexDirection: "row", flexWrap: "wrap", gap: "2rem", alignItems: "center" }}>
          {plant.image_data && (
            <div style={{ width: "150px", height: "150px", borderRadius: "10px", overflow: "hidden", border: "1px solid var(--border-color)", backgroundColor: "var(--bg-color)" }}>
              <img src={plant.image_data} alt={plant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} loading="lazy" />
            </div>
          )}
          
          <div style={{ flex: 1, minWidth: "250px" }}>
            <h1 style={{ color: "var(--primary-color)", fontSize: "1.8rem", margin: 0 }}>{plant.name}</h1>
            <span style={{ fontSize: "1.05rem", color: "var(--text-secondary)", fontStyle: "italic", display: "block", marginTop: "0.25rem" }}>
              Species: {plant.species}
            </span>
            
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginTop: "1rem" }}>
              <span className={`badge ${statusClass}`} style={{ display: "inline-flex", gap: "0.25rem", alignItems: "center" }}>
                <span>{statusIcon}</span>
                <span>{statusLabel}</span>
              </span>
              
              <span className="badge" style={{ backgroundColor: "var(--border-color)", color: "var(--text-primary)" }}>
                📍 {plant.location}
              </span>

              <span className="badge" style={{ backgroundColor: "var(--border-color)", color: "var(--text-primary)" }}>
                📅 {Math.round(plant.age / 30) || 1} months old
              </span>
              
              {impact && (
                <>
                  <span className="badge" style={{ backgroundColor: "rgba(45, 106, 79, 0.12)", color: "var(--primary-color)", fontWeight: "bold" }}>
                    🌱 CO₂: {impact.carbon_co2_kg.toFixed(3)} kg
                  </span>
                  <span className="badge" style={{ backgroundColor: "rgba(58, 134, 200, 0.12)", color: "#3a86c8", fontWeight: "bold" }}>
                    💧 Water Saved: {impact.water_saved_liters.toFixed(2)} L
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Large Health Score Circle */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.25rem" }}>
            <div style={{
              width: "75px",
              height: "75px",
              borderRadius: "50%",
              border: `5px solid ${
                plant.health_score >= 80 ? "var(--success-color)" : 
                plant.health_score >= 50 ? "var(--warning-color)" : "var(--danger-color)"
              }`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              fontWeight: "bold",
              backgroundColor: "var(--card-bg)"
            }} aria-label={`Plant health score: ${plant.health_score} out of 100`}>
              {plant.health_score}
            </div>
            <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Health Score</span>
          </div>
        </div>

        {/* Environmental Impact Details */}
        {impact && (
          <div className="card" style={{ marginTop: "1.5rem", borderLeft: "5px solid var(--secondary-color)", marginBottom: 0 }}>
            <h2 style={{ fontSize: "1.1rem", color: "var(--primary-color)", marginBottom: "0.5rem", display: "flex", alignItems: "center", gap: "0.4rem" }}>
              🌍 Environmental Footprint & Efficiency
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--text-primary)", lineHeight: "1.4" }}>
              By nurturing this <strong>{plant.species}</strong>, you have helped absorb CO₂ and conserve clean water through optimized seasonal weather watering.
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem", fontStyle: "italic" }}>
              <strong>Calculation Details:</strong> {impact.formula_details}
            </p>
          </div>
        )}

        {/* Diagnosis & Care Module */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "1.5rem", marginTop: "1.5rem" }}>
          
          {/* Action and scan section */}
          <div className="card" style={{ height: "fit-content" }}>
            <h2 style={{ fontSize: "1.2rem", color: "var(--primary-color)", marginBottom: "1rem" }}>AI Diagnostic Diagnostics</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", marginBottom: "1.5rem", lineHeight: "1.5" }}>
              Scan the leaves for visual anomalies. The AI will look for discoloration, necrotic patches, rust spots, and mildew growth.
            </p>

            {scanError && (
              <div style={{
                backgroundColor: "rgba(220, 38, 38, 0.08)",
                border: "1px solid var(--danger-color)",
                color: "var(--danger-color)",
                padding: "1rem",
                borderRadius: "6px",
                fontSize: "0.9rem",
                marginBottom: "1rem"
              }}>
                ⚠️ {scanError}
              </div>
            )}

            <button
              onClick={handleRunDiagnosis}
              disabled={scanning}
              className="button"
              style={{ width: "100%", justifyContent: "center", padding: "0.85rem" }}
            >
              {scanning ? "🔬 Running Leaf Diagnosis..." : "🔍 Scan Leaf for Disease"}
            </button>
            
            {scanning && (
              <div style={{ marginTop: "1rem", textAlign: "center", color: "var(--text-secondary)", fontSize: "0.85rem" }}>
                Contacting Hugging Face Serverless Inference API...
              </div>
            )}
          </div>

          {/* Diagnosis & Treatment Plan Card */}
          {(scanResult || plant.health_score < 100) && (
            <div className="card" style={{ borderLeft: "5px solid var(--warning-color)" }}>
              <h2 style={{ fontSize: "1.2rem", color: "var(--primary-color)", marginBottom: "1rem" }}>
                {scanResult ? "Latest Scan Result" : "Current Diagnostics Status"}
              </h2>
              
              <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                
                {/* Result Title */}
                <div>
                  <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase" }}>Condition Detected</span>
                  <h3 style={{ margin: "0.15rem 0", color: "var(--text-primary)", fontSize: "1.3rem" }}>
                    {scanResult ? scanResult.condition : "Active Foliage Issue"}
                  </h3>
                  
                  {scanResult && (
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.25rem" }}>
                      <span style={{ fontSize: "0.9rem" }}>Accuracy:</span>
                      <span className={`badge ${scanResult.needs_expert ? "badge-danger" : "badge-success"}`}>
                        {Math.round(scanResult.confidence * 100)}%
                      </span>
                    </div>
                  )}
                </div>

                {/* Expert Warning Banner */}
                {scanResult?.needs_expert && (
                  <div style={{
                    backgroundColor: "rgba(220, 38, 38, 0.08)",
                    border: "1px solid var(--danger-color)",
                    color: "var(--danger-color)",
                    padding: "0.75rem",
                    borderRadius: "6px",
                    fontSize: "0.85rem"
                  }}>
                    <strong>🚨 Expert review recommended</strong>
                    <p style={{ margin: "0.15rem 0 0", color: "var(--text-primary)" }}>
                      AI confidence is below 70%. The model might be misinterpreting a nutrient deficiency.
                    </p>
                    
                    <a 
                      href={`https://www.google.com/maps/search/?api=1&query=${
                        encodeURIComponent(
                          "botanical nursery garden expert " + 
                          (typeof window !== "undefined" ? localStorage.getItem("user_pincode") || activeLocation || "near me" : "near me")
                        )
                      }`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="button"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.3rem",
                        marginTop: "0.75rem",
                        padding: "0.4rem 0.8rem",
                        fontSize: "0.8rem",
                        textDecoration: "none",
                        backgroundColor: "var(--danger-color)",
                        color: "white",
                        borderRadius: "4px",
                        fontWeight: "bold"
                      }}
                    >
                      🗺️ Find Nearest Plant Experts
                    </a>
                  </div>
                )}

                {/* Treatment planner list */}
                {scanResult?.treatments && (
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                      Treatment Guidelines & Supplies Locator
                    </span>
                    <ul style={{ paddingLeft: "1.25rem", margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                      {scanResult.treatments.map((step, idx) => {
                        const searchTerm = getSearchTerm(step);
                        const savedPincode = typeof window !== "undefined" ? localStorage.getItem("user_pincode") : null;
                        const locationQuery = savedPincode ? savedPincode : (activeLocation || "me");
                        const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(searchTerm + " " + locationQuery)}`;
                        return (
                          <li key={idx} style={{ lineHeight: "1.45" }}>
                            <span>{step}</span>
                            <a 
                              href={mapsUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "0.25rem",
                                marginLeft: "0.5rem",
                                fontSize: "0.78rem",
                                color: "var(--secondary-color)",
                                textDecoration: "underline",
                                fontWeight: "600",
                                cursor: "pointer"
                              }}
                              onMouseOver={(e) => (e.currentTarget.style.color = "var(--primary-color)")}
                              onMouseOut={(e) => (e.currentTarget.style.color = "var(--secondary-color)")}
                            >
                              🛒 Find store
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
                
              </div>
            </div>
          )}

          {/* Care Schedule & Reminders */}
          <div className="card">
            <h2 style={{ fontSize: "1.2rem", color: "var(--primary-color)", marginBottom: "1rem" }}>📅 Active Care Plan</h2>
            
            {remindersLoading ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>Loading care schedule...</p>
            ) : reminders.length === 0 ? (
              <p style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>No care reminders set. Scan plant or verify connection.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem" }}>
                {reminders.map((rem) => {
                  const dueInfo = getDueText(rem.next_due);
                  let icon = "💧";
                  if (rem.type === "fertilizer") icon = "🧪";
                  if (rem.type === "misting") icon = "💨";
                  
                  return (
                    <div 
                      key={rem.id} 
                      style={{ 
                        padding: "0.75rem", 
                        border: "1px solid var(--border-color)", 
                        borderRadius: "8px", 
                        backgroundColor: "var(--bg-color)" 
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: "0.5rem" }}>
                        <span style={{ fontSize: "0.85rem", fontWeight: "bold", textTransform: "capitalize", color: "var(--text-primary)" }}>
                          {icon} {rem.type}
                        </span>
                        <span 
                          style={{ 
                            fontSize: "0.75rem", 
                            fontWeight: "bold",
                            color: dueInfo.class === "text-danger" ? "var(--danger-color)" :
                                   dueInfo.class === "text-warning" ? "var(--warning-color)" : 
                                   dueInfo.class === "text-primary" ? "var(--secondary-color)" : "var(--text-secondary)"
                          }}
                        >
                          {dueInfo.text}
                        </span>
                      </div>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", marginTop: "0.25rem", fontStyle: "italic", lineHeight: "1.35" }}>
                        {rem.reasoning}
                      </p>
                      
                      {(() => {
                        const isDue = dueInfo.text.toLowerCase().includes("today") || dueInfo.text.toLowerCase().includes("overdue");
                        return (
                          <button
                            disabled={!isDue}
                            onClick={() => handleCompleteReminder(rem.id, rem.type)}
                            style={{
                              marginTop: "0.5rem",
                              backgroundColor: isDue ? "var(--secondary-color)" : "var(--border-color)",
                              border: "none",
                              color: isDue ? "white" : "var(--text-secondary)",
                              padding: "0.25rem 0.5rem",
                              fontSize: "0.7rem",
                              fontWeight: "bold",
                              borderRadius: "4px",
                              cursor: isDue ? "pointer" : "default",
                              transition: "background-color 0.2s"
                            }}
                            onMouseOver={(e) => {
                              if (isDue) e.currentTarget.style.backgroundColor = "var(--primary-color)";
                            }}
                            onMouseOut={(e) => {
                              if (isDue) e.currentTarget.style.backgroundColor = "var(--secondary-color)";
                            }}
                          >
                            {isDue ? "✓ Complete Task" : "✓ Safe & Up to Date"}
                          </button>
                        );
                      })()}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* History Timeline Logs */}
        <div className="card" style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", color: "var(--primary-color)", marginBottom: "1.25rem" }}>Timeline & Logs</h2>
          
          {timeline.length === 0 ? (
            <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem" }}>No records registered yet. Run your first leaf scan above.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {timeline.map((event, idx) => {
                const eventDate = new Date(event.date).toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit"
                });

                return (
                  <div key={idx} style={{
                    display: "flex",
                    gap: "1rem",
                    paddingBottom: "1rem",
                    borderBottom: idx === timeline.length - 1 ? "none" : "1px solid var(--border-color)"
                  }}>
                    {/* Event Type Icon */}
                    <div style={{ fontSize: "1.25rem" }}>
                      {event.event_type === "diagnosis" ? "🔬" : "📈"}
                    </div>
                    
                    {/* Event Details */}
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem" }}>
                        <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>{event.title}</strong>
                        <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)" }}>{eventDate}</span>
                      </div>
                      <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", margin: "0.2rem 0 0" }}>{event.subtitle}</p>
                      
                      {event.meta === "expert_review" && (
                        <span style={{ display: "inline-block", fontSize: "0.75rem", color: "var(--danger-color)", fontWeight: "bold", marginTop: "0.25rem" }}>
                          ⚠️ Under Expert Escalation
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Location Selection Modal Overlay */}
      {showLocationModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 1000
        }}>
          <div className="card" style={{ width: "90%", maxWidth: "400px", marginBottom: 0, padding: "2rem", borderLeft: "5px solid var(--primary-color)" }}>
            <h2 style={{ color: "var(--primary-color)", fontSize: "1.3rem", marginBottom: "0.5rem" }}>📍 Set Your Location</h2>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "1.5rem", lineHeight: "1.4" }}>
              Enter your City name or Pincode/Zip Code. We use this to fetch local outdoor weather and calibrate watering/misting schedules.
            </p>
            
            <input
              type="text"
              placeholder="e.g. Bengaluru, 560001, Chicago"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              style={{
                width: "100%",
                padding: "0.75rem",
                borderRadius: "6px",
                border: "1px solid var(--border-color)",
                backgroundColor: "var(--bg-color)",
                color: "var(--text-primary)",
                marginBottom: "1.5rem",
                fontSize: "1rem"
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveLocation();
              }}
            />
            
            <div style={{ display: "flex", gap: "1rem", justifyContent: "flex-end" }}>
              <button
                onClick={() => setShowLocationModal(false)}
                className="button"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-color)",
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem"
                }}
              >
                Cancel
              </button>
              
              <button
                onClick={handleSaveLocation}
                disabled={locLoading}
                className="button"
                style={{
                  padding: "0.5rem 1rem",
                  fontSize: "0.9rem"
                }}
              >
                {locLoading ? "Saving..." : "Save Location"}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
