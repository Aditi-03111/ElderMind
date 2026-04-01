# ElderMind — Voice-First AI Companion for Elderly Indians

**Never let your grandparent feel alone. ElderMind is their always-listening family member.**

---

## 🎯 What Is ElderMind?

ElderMind is a **voice-first AI companion** that talks to elderly Indians in their own language (Hindi, Kannada, Tamil, Telugu, Gujarati).

### What It Does
- ✅ **Medicine Reminders** - Auto-filled from prescriptions, no typing needed
- ✅ **Voice Companion** - Talks in your language, remembers conversations
- ✅ **Health Monitoring** - Detects mood, activity, falls, SpO2
- ✅ **Cultural Content** - Ramcharitmanas, Gita, prayers, stories
- ✅ **Caregiver Dashboard** - Real-time monitoring for family
- ✅ **Emergency Alerts** - SMS/WhatsApp to caregivers if urgent

**Zero typing. Zero complexity. Just talk.**

---

## 💰 Cost: 100% FREE

ElderMind is designed to run on free tiers where possible, with optional paid add-ons.

| Component | Tool | Cost |
|-----------|------|------|
| Frontend UI | React + Vite + Tailwind | FREE |
| Animations | GSAP | FREE |
| Page transitions | Barba.js | FREE |
| Offline persistence | IndexedDB (`idb`) | FREE |
| API Gateway | FastAPI | FREE |
| AI Brain (primary) | Groq (OpenAI-compatible endpoint) | Free tier (provider-dependent) |
| Web tool (optional) | Tavily Search API | Free tier (provider-dependent) |
| Voice Output | gTTS | FREE |
| Weather context (optional) | OpenWeather API | Free tier (provider-dependent) |
| Calendar context (tithi) | VedAstro API (AllPlanetData) | Free tier (rate-limited) |
| Database (optional) | Firebase Firestore (via `firebase-admin`) | Free tier |
| Alerts (optional) | Twilio | Trial credits / paid |
| Scheduling (service) | APScheduler | FREE

**Total Setup Cost: ₹0**

---

## 🚀 Quick Start (5 Minutes)

### Prerequisites
- Python 3.12 or 3.13 recommended (backend uses FastAPI + Pydantic v2)
- Node.js 18+
- Git

### Step 1: Backend Setup

```bash
# Clone repo
git clone https://github.com/AdvayaBGSCET/team-pixel-pioneers.git
cd eldermind

# Create Python environment (Windows PowerShell)
python -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install dependencies
python -m pip install -U pip
pip install -r requirements.txt

# Start all microservices + gateway
.\run_all.ps1
```

### Step 2: Frontend Setup

```bash
# New terminal
cd frontend
npm install
npm run dev
```

### Step 3: Open Browser
```
http://localhost:5173/index.html
```

### Pages (multi-page app)
- Elder UI: `http://localhost:5173/index.html`
- Medicines: `http://localhost:5173/medication.html`
- Activity: `http://localhost:5173/activity.html`
- Emergency: `http://localhost:5173/alert.html`
- Weekly: `http://localhost:5173/summary.html`
- Caregiver dashboard: `http://localhost:5173/caregiver.html`

---

## 🔑 Get Free API Keys (5 Minutes)

### 1. **Gemini API** (Main AI Brain)
- Go: https://aistudio.google.com
- Click "Get API Key"
- Copy → paste in `.env`
- **Free: 1 million tokens/day**

### 2. **Groq API** (Backup AI - Faster)
- Go: https://console.groq.com
- Sign up
- Copy key → `.env`
- **Free: 14,400 requests/day**

### 3. **Firebase** (Database)
- Go: https://console.firebase.google.com
- Create new project
- Download service account JSON
- Copy to `.env`
- **Free: 50k reads/20k writes daily**

### 4. **Twilio** (SMS/WhatsApp)
- Go: https://www.twilio.com/console
- Sign up (get $15 free credits)
- Copy Account SID + Token → `.env`
- Copy Twilio phone → `.env`

### 5. **OpenWeather** (Optional - Weather)
- Go: https://openweathermap.org/api
- Get free API key
- Paste in `.env`

### 6. **Tavily** (Optional - Web Search)
- Go: https://tavily.com
- Get free API key
- Paste in `.env`

---

## 📁 Project Structure

```
team-pixel-pioneers/
│
├── frontend/                           # Vite + React (multi-page) PWA UI
│   ├── index.html                      # Home (voice assistant)
│   ├── medication.html                 # Medication screen
│   ├── activity.html                   # Activity/status screen
│   ├── alert.html                      # SOS / emergency screen
│   ├── summary.html                    # Weekly summary screen
│   ├── caregiver.html                  # Caregiver dashboard screen
│   ├── public/
│   │   ├── manifest.webmanifest        # PWA manifest
│   │   ├── sw.js                       # Service worker cache-first
│   │   └── pwa-icon.svg                # PWA icon
│   └── src/
│       ├── screens/                    # Page components for each screen
│       ├── ui/                         # AppShell, BottomNav, MicButton, Cards, Stickers
│       ├── transitions/                # Barba.js + GSAP page transitions
│       └── lib/                        # API client, IndexedDB, speech helpers, notifications
│
├── gateway/                            # FastAPI API Gateway (BFF)
│   ├── main.py                         # Public endpoints (/voice, /sos, /medicine, /dashboard, /report)
│   └── config.py                       # Env-based service URLs / CORS
│
├── services/
│   ├── ai_service/                     # AI pipeline + context injection + TTS
│   │   ├── main.py                     # /voice + /health
│   │   ├── groq_client.py              # Groq chat completion
│   │   ├── tavily_client.py            # Optional web search
│   │   ├── markers.py                  # [HEALTH_LOG]/[MOOD_LOG]/[ALERT] parser
│   │   ├── tts.py                      # gTTS MP3 generation
│   │   ├── weather_client.py           # OpenWeather (cached)
│   │   └── vedastro_client.py          # VedAstro tithi (cached)
│   ├── data_service/                   # Persistence (local JSON or Firestore)
│   │   ├── main.py
│   │   └── store.py
│   ├── alerts_service/                 # SOS handling (Twilio stub unless configured)
│   │   └── main.py
│   └── scheduler_service/              # APScheduler demo jobs
│       └── main.py
│
├── requirements.txt                    # Python deps for gateway + services
├── run_all.ps1                         # Start gateway + services
├── .env.example                        # Env template (never commit real keys)
└── prompt.md                           # ElderMind system prompt / behavior contract
```

---

## 🧩 What problem are we solving?

ElderMind targets real problems elderly users face daily:

- **Loneliness & anxiety**: a warm “always-there” voice companion designed to feel like family.
- **Medication adherence**: reminders + quick confirmation + caregiver visibility.
- **Caregiver stress**: a dashboard + alerts so family can monitor without constant calling.
- **Low digital literacy**: voice-first UX, big buttons, minimal reading, soft visuals.
- **Offline / low connectivity**: PWA install + offline caching + local IndexedDB logging.

---

## 🏗️ System Architecture (frontend + backend)

```mermaid
flowchart TD
  subgraph frontend [Frontend_PWA_(Vite_React_MPA)]
    Home[Home_Voice_Screen]
    Meds[Medication_Screen]
    Act[Activity_Screen]
    Sos[Emergency_Screen]
    Weekly[Weekly_Summary_Screen]
    Care[Caregiver_Screen]
    PWA[PWA_Manifest+ServiceWorker]
    IDB[IndexedDB_OfflineStore]
  end

  subgraph gateway [Gateway_(FastAPI_BFF)]
    GWVoice[POST_/voice]
    GWSos[POST_/sos]
    GWMed[POST_/medicine/*]
    GWDash[GET_/dashboard/*]
    GWReport[GET_/report/*]
  end

  subgraph services [Microservices_(FastAPI)]
    AI[ai_service]
    Data[data_service]
    Alerts[alerts_service]
    Sched[scheduler_service]
  end

  subgraph externals [External_APIs_(optional)]
    Groq[Groq_LLM]
    Tavily[Tavily_Search]
    OpenWeather[OpenWeather]
    VedAstro[VedAstro_AllPlanetData]
    Twilio[Twilio_SMS/WhatsApp]
    Firestore[Firebase_Firestore]
  end

  Home -->|voice_text+lat_lon| GWVoice
  Meds --> GWMed
  Sos --> GWSos
  Care --> GWDash
  Weekly --> GWReport

  GWVoice --> AI
  GWMed --> Data
  GWDash --> Data
  GWReport --> Data
  GWSos --> Alerts

  AI --> Groq
  AI --> Tavily
  AI --> OpenWeather
  AI --> VedAstro
  AI -->|logs| Data

  Alerts --> Twilio
  Alerts -->|persist| Data
  Sched -->|check-ins/reminders| GWVoice

  PWA --> IDB
  Home -->|save_conversations| IDB
```

### Request flow (today)

1. **Frontend** captures speech (browser STT today) + geolocation and calls `POST /voice` on the gateway.
2. **Gateway** forwards to `ai_service`.
3. **AI service** builds system prompt from `prompt.md`, injects context (weather + tithi), calls LLM, parses markers, generates MP3 via gTTS, returns `audio_url`.
4. **Frontend** plays audio and stores a local copy in IndexedDB (offline history).

---

## 🧰 Tools & libraries used (current repo)

### Frontend
- **React + Vite (TypeScript)**: UI + fast dev server, multi-page build
- **Tailwind CSS**: consistent “elder-friendly” styling
- **GSAP**: micro-interactions (press, float, pulse, charts)
- **Barba.js**: smooth page transitions across the MPA pages
- **PWA**: `manifest.webmanifest` + `sw.js` for offline caching and install
- **IndexedDB (`idb`)**: offline storage for conversations / medication logs

### Backend (Python)
- **FastAPI**: gateway + services
- **httpx**: service-to-service HTTP calls
- **APScheduler**: scheduled check-ins / reminders (demo)
- **gTTS**: MP3 synthesis for voice replies
- **firebase-admin**: optional Firestore persistence (enabled when configured)
- **twilio**: optional alerts (stubbed unless configured)

### External APIs (optional)
- **Groq**: LLM chat completions
- **Tavily**: web search tool for “webby” questions
- **OpenWeather**: weather context injection
- **VedAstro**: calendar context (tithi computed from AllPlanetData)

---

## 👴 Features For Elderly (Ramesh's Screen)

### 1. **Voice Chat**
- Say anything in Hindi/Kannada/Tamil/Telugu/Gujarati
- AI responds naturally in same language
- No buttons, no menus, just talk
- AI remembers past conversations

### 2. **Medicine Reminders**
- **Pre-populated** from prescription database
- No manual typing needed
- Alerts at scheduled times
- "Confirm you took it" → logged automatically
- Caregiver notified if missed 3+ times

### 3. **Health Check-ins**
- Every 2 hours: "Kaise ho?"
- Detects mood from voice tone
- Monitors activity via phone sensors
- Flags unusual patterns to caregiver

### 4. **Spiritual Content**
- Ramcharitmanas recitation (all 7 Kands)
- Bhagavad Gita with meanings
- Hanuman Chalisa, Gayatri Mantra
- Hindu calendar (tithi, festivals)
- Day-specific prayers (Monday=Shiva, etc.)

### 5. **Companion Features**
- Stories (Panchatantra, Akbar-Birbal, Thirukkural)
- Memory games
- Jokes and light conversation
- Family updates

---

## 👨‍💼 Features For Caregiver (Kiran's Dashboard)

### 1. **Real-Time Monitoring**
```
Dashboard shows:
• Current mood (happy/okay/sad/anxious)
• Last activity timestamp
• Medicine adherence (taken/missed)
• Health complaints
• Emergency SOS status
```

### 2. **Medicine Tracker**
```
✅ 8:00 AM   - Aspirin taken at 8:05 AM
🕐 2:00 PM   - BP Med due in 2 hours
⏭️  8:00 PM   - Diabetes Med
❌ Yesterday - Missed 2:00 PM dose
  → [Set reminder again]
```

### 3. **Health Alerts**
```
⚠️  MEDIUM - Inactivity for 3 hours
🔴 HIGH - Missed 2 medicines this week
🟡 WATCH - Mood dropped 20% (3 days sad)
❌ CRITICAL - Fall detected
  → [Call Now] [Send SMS] [View Details]
```

### 4. **Weekly Health Report**
```
Week of April 1-7, 2026

Mood: 80% positive, 20% low
Activity: 4,200 steps/day average
Medicines: 95% adherence
Sleep: 7.5 hours/night
Health: No major complaints

Recommendations:
• Continue current routine
• Encourage social interaction
• Schedule check-up with doctor

→ [Download PDF] [Share with Doctor]
```

### 5. **Easy Medicine Management**
```
Current Medicines:
1. Aspirin 100mg → 8 AM, 8 PM
   [Edit] [Delete] [Notes: Take with food]

2. BP Medicine 10mg → 8 AM
   [Edit] [Delete]

[+ Add New Medicine]
(Auto-suggestions from database)
```

---

## 🧠 AI Brain: Complete System Prompt

The AI brain is injected with a detailed system prompt that includes:

- **User personality & constraints**
- **Conversation rules** (max 2 sentences)
- **Health logging triggers**
- **Mood detection patterns**
- **Conversation memory system**
- **Cultural knowledge** (Ramcharitmanas, Gita, etc.)
- **Proactive behaviors** (morning greeting, reminders, etc.)

See `SYSTEM_PROMPT.md` for full details.

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────┐
│         RAMESH'S PHONE (PWA Browser)            │
│  • Voice input/output                           │
│  • Camera access (SpO2)                         │
│  • Phone sensors (accelerometer/gyro)           │
└────────────────────┬────────────────────────────┘
                     │
                     │ HTTP/WebSocket
                     ▼
┌─────────────────────────────────────────────────┐
│     FASTAPI BACKEND (Your Laptop/AWS)           │
│                                                 │
│  Whisper → Gemini/Groq → gTTS                   │
│       ↓        ↓         ↓                       │
│  Speech   Main AI   Voice                       │
│  to Text  Brain     Output                      │
│       ↓        ↓         ↓                       │
│  SpeechBrain emotion detection                  │
│  pyVHR camera SpO2                              │
│  APScheduler reminders                          │
│       ↓                                          │
│  Firebase + Twilio                              │
└────────────────────┬────────────────────────────┘
                     │
        ┌────────────┴────────────┐
        │                         │
        ▼                         ▼
    Firebase DB            Twilio SMS/WhatsApp
  (logs & memory)           (caregiver alerts)
        │
        ▼
    ┌─────────────────────────────┐
    │ KIRAN'S DASHBOARD (Browser) │
    │ • Real-time monitoring      │
    │ • Medicine tracker          │
    │ • Health alerts             │
    │ • Weekly reports            │
    └─────────────────────────────┘
```

See `ARCHITECTURE.md` for detailed diagrams.

---

## 📊 Data Flow: What Happens When Ramesh Speaks

```
1. USER SPEAKS
   "Chakra ache hain" (my head hurts)

2. SPEECH TO TEXT (Whisper)
   Audio → "Chakra ache hain"

3. EMOTION DETECTION (SpeechBrain - parallel)
   Voice tone → sad emotion score

4. MAIN AI BRAIN (Gemini Flash)
   Input with context:
   • User: Ramesh, 72, Hindi speaker
   • Mood: sad
   • Past complaints: 2-3 headaches/month
   • Medicines taken: Aspirin at 8 AM
   • Time: 3:30 PM
   • Conversation history: last 10 exchanges
   
   Output: "Ramesh, sar dard hain na? Mushkil.
            Thoda rest karo aur paani piyo."

5. BACKEND PARSING
   Extract: [HEALTH_LOG: headache]
            [MOOD_LOG: low]
            [ALERT_TRIGGER: maybe]

6. TEXT TO SPEECH (gTTS)
   Response text → Natural Hindi voice

7. FIREBASE LOGGING
   • Conversation logged
   • Health symptom recorded
   • Mood trend updated

8. TWILIO ALERT (Conditional)
   IF (headache + elevated BP + low mood 3+ days)
   → SMS to caregiver: "Dad has headache again.
                        Recommend phone call."

9. DASHBOARD UPDATE (Real-time)
   Kiran sees alert on dashboard
   Can view details, call now, or set reminder
```

---

## 🔧 Tech Stack

### Backend
```
Framework:      FastAPI (async, fast)
Speech:         Whisper (OpenAI) - runs locally
AI Brain:       Gemini 1.5 Flash or Groq + Llama 3.1
Text-to-Speech: gTTS (Google)
Emotion:        SpeechBrain (PyTorch)
Camera SpO2:    pyVHR (rPPG algorithm)
Database:       Firebase Firestore
Alerts:         Twilio (SMS/WhatsApp/Calls)
Scheduling:     APScheduler
Calendar:       Drik Panchang API (optional)
Weather:        OpenWeatherMap API (optional)
Search:         Tavily API (optional, web search)
```

### Frontend
```
Framework:      Next.js 14 (React)
Styling:        Tailwind CSS
PWA:            Next.js PWA plugin
Real-time:      Firebase SDK
State:          React Hooks
Deployment:     Vercel (1-click)
```

---

## 📱 Supported Languages

- ✅ Hindi (Devanagari)
- ✅ Kannada (Kannada script)
- ✅ Tamil (Tamil script)
- ✅ Telugu (Telugu script)
- ✅ Gujarati (Gujarati script)
- ✅ Marathi (Devanagari)
- ✅ English (for caregivers)

All via Whisper (supports 99 languages) and Gemini/Groq.

---

## ⚠️ Important Notes

1. **NOT a medical device**
   - SpO2 from camera is ±4-6% accurate only
   - Never replace doctor consultation
   - For reference only

2. **Caregiver notification only**
   - Never replaces human oversight
   - Alerts are suggestions, not diagnoses
   - Family must verify and act

3. **Privacy first**
   - Raw audio deleted immediately
   - Only features/logs stored
   - Firebase encryption enabled
   - Comply with DPDP Act (India)

4. **Works offline**
   - Whisper runs locally (no internet needed)
   - Gemini calls cached when possible
   - Fallback to local Ollama if needed

5. **Hindi/Kannada priority**
   - Best support for these languages
   - English also supported
   - Other Indian languages work but less optimized

---

## 🚀 Deployment

### Deploy Backend

**Option 1: Heroku (Easy)**
```bash
heroku create eldermind-backend
git push heroku main
```

**Option 2: AWS Lambda + API Gateway**
```bash
serverless deploy
```

**Option 3: Docker + AWS EC2**
```bash
docker build -t eldermind .
docker run -p 8000:8000 eldermind
```

### Deploy Frontend

**Vercel (1-Click)**
```bash
cd frontend
vercel --prod
```

Automatically deploys to `your-project.vercel.app`

---

## 📞 Troubleshooting

| Issue | Solution |
|-------|----------|
| "API key invalid" | Check `.env` file, ensure no quotes around keys |
| "Whisper not found" | Run `python -c "import whisper; whisper.load_model('small')"` |
| "Firebase connection error" | Download service account JSON, check credentials path |
| "No speech input" | Check browser microphone permissions |
| "Backend not starting" | Ensure port 8000 is free, check Python 3.9+ |
| "Frontend not loading" | Delete `.next` folder, run `npm run build` again |

---

## 📄 File References

- **README.md** (this file) - Overview & quick start
- **ARCHITECTURE.md** - Detailed system design
- **SYSTEM_PROMPT.md** - AI personality & behavior
- **requirements.txt** - Python dependencies
- **.env.example** - Environment template

---

## 📜 License

MIT License - Free to use, modify, and distribute

---

## 🙏 Purpose

**45% of elderly experience loneliness, which has health impact comparable to smoking 15 cigarettes/day.**

ElderMind exists to ensure your grandparent never feels alone.

```
"Technology should serve humanity,
not the other way around.

ElderMind serves our grandparents."
```

---

## 🎯 Next Steps

1. **Read ARCHITECTURE.md** - Understand full system design
2. **Read SYSTEM_PROMPT.md** - Learn AI behavior details
3. **Get API keys** - Takes 5 minutes
4. **Run quick start** - Takes 5 minutes
5. **Deploy to production** - Takes 2 minutes with Vercel

**Total time to production: 15 minutes ⚡**

---

## 💡 Key Features At A Glance

| Feature | Elderly | Caregiver | Status |
|---------|---------|-----------|--------|
| Voice Chat | ✅ | ✅ | Ready |
| Medicine Reminders | ✅ | ✅ | Ready |
| Health Monitoring | ✅ | ✅ | Ready |
| Mood Detection | ✅ | ✅ | Ready |
| Activity Tracking | ✅ | ✅ | Ready |
| SpO2 from Camera | ✅ | ✅ | Ready |
| Fall Detection | ✅ | ✅ | Ready |
| Emergency SOS | ✅ | ✅ | Ready |
| Weekly Reports | ✅ | ✅ | Ready |
| Cultural Content | ✅ | - | Ready |
| Ramcharitmanas | ✅ | - | Ready |
| Doctor Features | - | - | Future |

---

## 📧 Contact & Support

- Issues: Create GitHub issue
- Questions: Email: support@eldermind.ai
- Contributions: Pull requests welcome!

---

**Built with ❤️ for elderly Indians**