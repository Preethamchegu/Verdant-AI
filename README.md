# Verdant-AI 🌿

Verdant-AI is a centralized, hyper-localized plant care ecosystem designed to stop the cycle of preventable plant deaths. By bridging the gap between digital AI diagnostics and physical action, it provides a context-aware care engine that makes sustainable plant parenting practically foolproof.

## 🚀 Features

* **🔍 AI Vision Diagnostics & Safety:** 
  Leveraging the **Google Gemini Multimodal Vision API**, Verdant-AI accurately identifies plant species and runs rigorous disease diagnostic scans from user-uploaded photos. If a plant is sick, it prescribes natural, organic treatments. Built-in safety thresholds (70% confidence) ensure complex issues are flagged for human expert review rather than risking a misdiagnosis.
* **☁️ Context-Aware Reminders:** 
  The platform integrates with the **OpenWeather API** to adapt to your plant’s real-time environment. If it rains locally or humidity drops, the backend dynamically delays watering or increases misting schedules—no more generic reminders.
* **📍 Hyper-Local Logistics:** 
  When a treatment is recommended (e.g., neem oil), the system parses the required supplies and uses the user's pincode to generate direct **Google Maps** links. This pinpoints exact nearby nurseries, eliminating the guesswork of where to find help.
* **🌍 Environmental Impact Tracking:** 
  A real-time dashboard calculates tangible environmental metrics, showing users the exact kilograms of CO₂ absorbed and liters of water conserved by their garden.
* **⚡ Ultra-Fast Performance:** 
  Features client-side image compression using the **HTML5 Canvas API**, reducing heavy image uploads from 4MB to ~100KB for low-latency AI processing.

## 🛠️ Tech Stack

**Frontend:**
* Next.js (React)
* TypeScript
* TailwindCSS
* HTML5 Canvas API

**Backend & Database:**
* FastAPI (Python)
* SQLModel & PostgreSQL
* Pydantic
* Uvicorn
* Python-JOSE & Passlib (Security)

**AI & External APIs:**
* Google Gemini Multimodal Vision API (Gemini Flash)
* OpenWeather API
* Google Maps API
* Hugging Face Hub

## 💻 Getting Started

### Prerequisites
* Node.js (v18+)
* Python (3.10+)
* PostgreSQL

### Local Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/verdant-ai.git
   cd verdant-ai
   ```

2. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   uvicorn run_server:app --reload
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

4. **Environment Variables**
   Create a `.env` file in the root backend directory referencing `.env.example` to set up your API keys (Gemini, OpenWeather, Database URI).

## 🏆 Hackathon Project
This project was built to demonstrate the power of centralized AI logistics in everyday sustainability, ensuring every plant gets a fighting chance.