"use client";

import React, { useEffect, useState, use } from "react";
import { useAuth } from "../../context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";

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

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function PlantDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const plantId = resolvedParams.id;
  
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  // Core data states
  const [plant, setPlant] = useState<Plant | null>(null);
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Scan & diagnosis states
  const [scanning, setScanning] = useState<boolean>(false);
  const [scanResult, setScanResult] = useState<DiagnosisResult | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const fetchPlantData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch plant details
      const plantRes = await fetch(`http://127.0.0.1:8001/plants/${plantId}`, {
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
      const timelineRes = await fetch(`http://127.0.0.1:8001/plants/${plantId}/history`, {
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

  useEffect(() => {
    if (user && token) {
      fetchPlantData();
    }
  }, [user, token, plantId]);

  const handleRunDiagnosis = async () => {
    if (!token) return;
    setScanning(true);
    setScanError(null);
    setScanResult(null);
    try {
      const res = await fetch(`http://127.0.0.1:8001/plants/${plantId}/diagnose`, {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Scan timed out or server error." }));
        throw new Error(errData.detail || "Failed to run leaf diagnosis.");
      }

      const resultData = await res.json();
      setScanResult(resultData);
      
      // Refresh plant health score and history timeline
      fetchPlantData();
    } catch (err: any) {
      console.error(err);
      setScanError(err.message || "Diagnostic check failed.");
    } finally {
      setScanning(false);
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
    <div style={{ minHeight: "100vh", padding: "2rem 1.5rem", backgroundColor: "var(--bg-color)" }}>
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
              <img src={plant.image_data} alt={plant.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  </div>
                )}

                {/* Treatment planner list */}
                {scanResult?.treatments && (
                  <div>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-secondary)", textTransform: "uppercase", display: "block", marginBottom: "0.4rem" }}>
                      Treatment Guidelines
                    </span>
                    <ul style={{ paddingLeft: "1.25rem", margin: 0, fontSize: "0.9rem", color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                      {scanResult.treatments.map((step, idx) => (
                        <li key={idx} style={{ lineHeight: "1.4" }}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
              </div>
            </div>
          )}

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
    </div>
  );
}
