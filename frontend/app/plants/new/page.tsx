"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/auth-context";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { API_BASE_URL } from "@/app/config";

interface SpeciesDetails {
  species: string;
  raw_confidence: number;
  calibrated_confidence: number;
  confidence_gap: number;
  was_calibrated: boolean;
  alternative_guess: string;
  reasoning: string;
  images_used: number;
}

interface PlantResponse {
  id: number;
  name: string;
  species: string;
  age: number;
  location: string;
  health_score: number;
}

export default function NewPlantPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  // Form Fields State
  const [name, setName] = useState<string>("");
  const [ageMonths, setAgeMonths] = useState<string>("1");
  const [location, setLocation] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("user_location");
      return saved ? `${saved}, Indoor` : "Indoor";
    }
    return "Indoor";
  });

  // Multi-image state
  const [leafPreview, setLeafPreview] = useState<string | null>(null);
  const [leafBase64, setLeafBase64] = useState<string | null>(null);

  const [wholePreview, setWholePreview] = useState<string | null>(null);
  const [wholeBase64, setWholeBase64] = useState<string | null>(null);

  const [backPreview, setBackPreview] = useState<string | null>(null);
  const [backBase64, setBackBase64] = useState<string | null>(null);

  const [flowerPreview, setFlowerPreview] = useState<string | null>(null);
  const [flowerBase64, setFlowerBase64] = useState<string | null>(null);

  // Status State
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ plant: PlantResponse; aiDetails: SpeciesDetails } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
  }, [user, authLoading, router]);

  const processImage = (file: File, callback: (preview: string, b64: string) => void) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        
        // Max dimension bounds: 800px
        const MAX_SIZE = 800;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          // Compress quality to 75%
          const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
          callback(compressedBase64, compressedBase64);
          setError(null);
        } else {
          // Fallback if canvas context is unavailable
          const base64String = reader.result as string;
          callback(base64String, base64String);
        }
      };
      img.onerror = () => {
        setError(`Failed to process image "${file.name}".`);
      };
      img.src = reader.result as string;
    };
    reader.onerror = () => {
      setError(`Failed to read "${file.name}".`);
    };
    reader.readAsDataURL(file);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>, slot: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (slot === "leaf") {
      processImage(file, (p, b) => { setLeafPreview(p); setLeafBase64(b); });
    } else if (slot === "whole") {
      processImage(file, (p, b) => { setWholePreview(p); setWholeBase64(b); });
    } else if (slot === "back") {
      processImage(file, (p, b) => { setBackPreview(p); setBackBase64(b); });
    } else if (slot === "flower") {
      processImage(file, (p, b) => { setFlowerPreview(p); setFlowerBase64(b); });
    }
  };

  const clearSlot = (slot: string) => {
    if (slot === "leaf") { setLeafPreview(null); setLeafBase64(null); }
    else if (slot === "whole") { setWholePreview(null); setWholeBase64(null); }
    else if (slot === "back") { setBackPreview(null); setBackBase64(null); }
    else if (slot === "flower") { setFlowerPreview(null); setFlowerBase64(null); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please give your plant a nickname.");
      return;
    }
    if (!leafBase64) {
      setError("A primary Leaf Close-up photo is required.");
      return;
    }

    setSubmitting(true);

    try {
      // Direct API fetch to the backend plants registration endpoint
      const res = await fetch(`${API_BASE_URL}/plants/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          name: name.trim(),
          age_months: parseInt(ageMonths) || 1,
          location,
          image_data: leafBase64,
          whole_plant_image: wholeBase64,
          leaf_back_image: backBase64,
          flower_fruit_image: flowerBase64
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Route not found or server offline." }));
        throw new Error(errData.detail || "Failed to register plant.");
      }

      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during classification.");
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center", backgroundColor: "var(--bg-color)" }}>
        <p>Loading authorization state...</p>
      </div>
    );
  }

  if (result) {
    const ai = result.aiDetails || (result as any).ai_details;
    const confidencePercent = Math.round(ai.calibrated_confidence * 100);
    const rawPercent = Math.round(ai.raw_confidence * 100);
    const needsExpert = confidencePercent < 70;

    return (
      <div style={{ minHeight: "100vh", padding: "2rem 1.5rem", backgroundColor: "var(--bg-color)" }}>
        <div style={{ maxWidth: "600px", margin: "0 auto" }}>
          
          <div className="card" style={{ borderLeft: `6px solid ${needsExpert ? "var(--danger-color)" : "var(--success-color)"}` }}>
            <div style={{ textAlign: "center", marginBottom: "2rem" }}>
              <span style={{ fontSize: "3rem" }}>🎉</span>
              <h1 style={{ color: "var(--primary-color)", marginTop: "0.5rem" }}>Plant Registered!</h1>
              <p style={{ color: "var(--text-secondary)" }}>AI Species Identification Complete</p>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              
              <div style={{ padding: "1rem", backgroundColor: "var(--bg-color)", borderRadius: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)", textTransform: "uppercase", fontWeight: "bold" }}>Identified Species</span>
                <h2 style={{ color: "var(--primary-color)", fontSize: "1.5rem", marginTop: "0.25rem" }}>{ai.species}</h2>
                
                <div style={{ marginTop: "0.5rem", display: "flex", flexWrap: "wrap", alignItems: "center", gap: "0.5rem" }}>
                  <span>Confidence:</span>
                  <span className={`badge ${needsExpert ? "badge-danger" : "badge-success"}`}>
                    {confidencePercent}%
                  </span>
                  
                  {ai.was_calibrated && (
                    <span style={{ fontSize: "0.75rem", color: "var(--warning-color)", fontStyle: "italic" }}>
                      (Calibrated down from {rawPercent}% due to narrow gap with guess 2)
                    </span>
                  )}
                </div>
                
                <div style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "0.5rem" }}>
                  Images analyzed: <strong>{ai.images_used || 1}</strong>
                </div>
              </div>

              {ai.alternative_guess && ai.alternative_guess !== "Unknown" && (
                <div style={{ fontSize: "0.9rem", color: "var(--text-secondary)" }}>
                  <strong>Alternative guess:</strong> {ai.alternative_guess}
                </div>
              )}

              {needsExpert && (
                <div style={{
                  backgroundColor: "rgba(220, 38, 38, 0.08)",
                  border: "1px solid var(--danger-color)",
                  color: "var(--danger-color)",
                  padding: "1rem",
                  borderRadius: "8px",
                  fontSize: "0.95rem"
                }}>
                  <strong>⚠️ Expert Escalation Flag Triggered</strong>
                  <p style={{ marginTop: "0.25rem", color: "var(--text-primary)", fontSize: "0.9rem" }}>
                    The AI confidence is {confidencePercent}% (below the 70% threshold). We suggest asking a local nursery specialist for verification.
                  </p>
                </div>
              )}

              <div>
                <h3 style={{ fontSize: "1rem", color: "var(--text-primary)", marginBottom: "0.5rem" }}>Botanical Reasoning</h3>
                <p style={{ color: "var(--text-secondary)", fontSize: "0.95rem", lineHeight: "1.6" }}>
                  {ai.reasoning}
                </p>
              </div>

              <div style={{ borderTop: "1px solid var(--border-color)", paddingTop: "1rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Nickname:</span>
                <strong style={{ marginLeft: "0.5rem" }}>{result.plant.name}</strong>
                <span style={{ margin: "0 0.75rem", color: "var(--border-color)" }}>|</span>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>Location:</span>
                <strong style={{ marginLeft: "0.5rem" }}>{result.plant.location}</strong>
              </div>

              <button
                onClick={() => router.push("/dashboard")}
                className="button"
                style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
              >
                Go to Dashboard
              </button>
            </div>
          </div>
          
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: "3rem 1.5rem", backgroundColor: "var(--bg-color)" }}>
      <div style={{ maxWidth: "700px", margin: "0 auto" }}>
        
        <div style={{ marginBottom: "2rem" }}>
          <Link href="/dashboard" style={{ color: "var(--text-secondary)", fontSize: "0.9rem" }}>
            ← Back to Dashboard
          </Link>
          <h1 style={{ color: "var(--primary-color)", marginTop: "0.5rem" }}>Register New Plant</h1>
          <p style={{ color: "var(--text-secondary)" }}>Upload leaf and plant photos to trigger multi-image botanical species ID</p>
        </div>

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

        <form onSubmit={handleSubmit} className="card" style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          
          {/* Plant Nickname */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            <label htmlFor="nickname" style={{ fontWeight: 600 }}>Plant Nickname (Required)</label>
            <input
              id="nickname"
              type="text"
              placeholder="e.g. Living Room Monstera"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
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

          {/* Plant Details Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <label htmlFor="age" style={{ fontWeight: 600 }}>Age (in months)</label>
              <input
                id="age"
                type="number"
                min="0"
                value={ageMonths}
                onChange={(e) => setAgeMonths(e.target.value)}
                disabled={submitting}
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
              <label htmlFor="location" style={{ fontWeight: 600 }}>Location</label>
              <select
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submitting}
                style={{
                  padding: "0.75rem",
                  borderRadius: "6px",
                  border: "1px solid var(--border-color)",
                  fontSize: "1rem",
                  backgroundColor: "var(--card-bg)",
                  color: "var(--text-primary)",
                  cursor: "pointer"
                }}
              >
                <option value="Indoor">Indoor (Living Room / Bedroom)</option>
                <option value="Outdoor">Outdoor Garden</option>
                <option value="Balcony">Balcony / Patio</option>
                <option value="Greenhouse">Greenhouse</option>
              </select>
            </div>
          </div>

          {/* Multi-Image Botanical Upload Panel */}
          <div>
            <label style={{ fontWeight: 600, display: "block", marginBottom: "0.75rem" }}>
              Botanical Photos Scan (Upload up to 4 images for multi-organ analysis)
            </label>
            
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "1.25rem"
            }}>
              
              {/* Slot 1: Leaf Close-up (Required) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>1. Leaf Close-up (Required)</span>
                <div style={{
                  border: "2px dashed var(--primary-color)",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative",
                  backgroundColor: "rgba(64, 145, 108, 0.03)",
                  height: "140px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}>
                  {leafPreview ? (
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <img src={leafPreview} alt="Leaf preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} loading="lazy" />
                      <button type="button" onClick={() => clearSlot("leaf")} style={{ position: "absolute", top: "4px", right: "4px", padding: "0.2rem 0.4rem", fontSize: "0.7rem", backgroundColor: "var(--danger-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: "1.5rem" }}>🍃</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "leaf")} disabled={submitting} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                    </>
                  )}
                </div>
              </div>

              {/* Slot 2: Whole Plant / Habit (Optional) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>2. Whole Plant (Optional)</span>
                <div style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative",
                  height: "140px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}>
                  {wholePreview ? (
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <img src={wholePreview} alt="Whole preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} loading="lazy" />
                      <button type="button" onClick={() => clearSlot("whole")} style={{ position: "absolute", top: "4px", right: "4px", padding: "0.2rem 0.4rem", fontSize: "0.7rem", backgroundColor: "var(--danger-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: "1.5rem" }}>🪴</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "whole")} disabled={submitting} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                    </>
                  )}
                </div>
              </div>

              {/* Slot 3: Leaf Underside (Optional) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>3. Leaf Underside (Optional)</span>
                <div style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative",
                  height: "140px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}>
                  {backPreview ? (
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <img src={backPreview} alt="Back preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} loading="lazy" />
                      <button type="button" onClick={() => clearSlot("back")} style={{ position: "absolute", top: "4px", right: "4px", padding: "0.2rem 0.4rem", fontSize: "0.7rem", backgroundColor: "var(--danger-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: "1.5rem" }}>🔍</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "back")} disabled={submitting} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                    </>
                  )}
                </div>
              </div>

              {/* Slot 4: Flower or Fruit (Optional) */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                <span style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>4. Flower / Fruit (Optional)</span>
                <div style={{
                  border: "2px dashed var(--border-color)",
                  borderRadius: "8px",
                  padding: "1rem",
                  textAlign: "center",
                  cursor: "pointer",
                  position: "relative",
                  height: "140px",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden"
                }}>
                  {flowerPreview ? (
                    <div style={{ position: "relative", width: "100%", height: "100%" }}>
                      <img src={flowerPreview} alt="Flower preview" style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "6px" }} loading="lazy" />
                      <button type="button" onClick={() => clearSlot("flower")} style={{ position: "absolute", top: "4px", right: "4px", padding: "0.2rem 0.4rem", fontSize: "0.7rem", backgroundColor: "var(--danger-color)", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>✕</button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: "1.5rem" }}>🌸</span>
                      <span style={{ fontSize: "0.75rem", color: "var(--text-secondary)" }}>Click to Upload</span>
                      <input type="file" accept="image/*" onChange={(e) => handleImageChange(e, "flower")} disabled={submitting} style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", opacity: 0, cursor: "pointer" }} />
                    </>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* Form Submit Button */}
          <button
            type="submit"
            className="button"
            style={{ width: "100%", justifyContent: "center", marginTop: "1rem" }}
            disabled={submitting}
          >
            {submitting ? "Analyzing Photos with AI..." : "🔍 Run AI Species Identification"}
          </button>

        </form>

      </div>
    </div>
  );
}
