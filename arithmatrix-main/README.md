# 🧮 ArithMatrix
### Intelligent Calculator with Voice, Camera & Currency Conversion

ArithMatrix is a modern, multi-modal calculator application built for user who want more than basic arithmetic.  
It blends typed input, voice interaction, camera-based expression recognition, and currency conversion into a single, clean, professional Android app.

The project is designed with clarity, correctness, and extensibility in mind, using modern Android architecture and best practices.

---

## 📌 Project Overview

ArithMatrix helps users:

- Perform full expression-based calculations (not just button-by-button math)
- Calculate hands-free using voice input
- Capture and solve expressions using the camera
- Convert currencies with precision
- Maintain persistent calculation history across all modes
- Reuse and manage past calculations easily

The app is minimal on the surface, yet powerful under the hood.

---

## 🌐 Web Application (MERN)

A full web implementation is now available as:

- `frontend`: React (Vite) frontend
- `backend`: Express + MongoDB backend

Web app features include:

- Basic expression calculator
- Voice calculator (SpeechRecognition + optional TTS)
- Camera OCR calculator (image upload/capture)
- Currency conversion with live rates
- Weather info with current conditions and 5-day forecast
- AI assistant for math, weather, currency, and app guidance
- Shared persistent history in MongoDB

Run and setup instructions are in `web/README.md`.

---

## 📱 Android Application

### 🔧 Tech Stack

- **Language:** Kotlin
- **UI:** Jetpack Compose
- **Architecture:** MVVM
- **Dependency Injection:** Hilt
- **Database:** Room (SQLite)
- **State Management:** StateFlow / Flow
- **Async:** Kotlin Coroutines

---

## ✨ Features

### 🧮 Basic Calculator

- Full expression input (e.g. `50 + 20%`, `12 × (5 + 3)`)
- Proper operator precedence handling
- Intelligent percentage evaluation
- Clear separation between expression and result
- Fast and accurate evaluation engine

---

### 🎙 Voice Calculator

- Speech-to-text based expression input
- Live transcription before evaluation
- Optional text-to-speech (TTS) output
- Mute / unmute control for spoken results
- Dedicated voice calculation history

---

### 📷 Camera Calculator

- Camera-based expression capture
- Text recognition for printed / typed math
- Editable recognized expressions
- One-tap evaluation
- Separate history tracking for camera input

---

### 💱 Currency Converter

- Multi-currency conversion
- Clean numeric formatting
- Conversion history
- Designed for future live-rate integration

---

### 🗃 Smart History System

- Persistent local storage using Room
- Auto-updating history via Flow
- Delete individual entries or clear all
- Reuse expressions directly from history
- Mode-aware history:
    - Basic
    - Voice
    - Camera
    - Currency

---

## 📐 Architecture (MVVM)

ArithMatrix uses the **MVVM (Model–View–ViewModel)** architecture pattern:

**UI (Jetpack Compose)**  
Displays state and handles user interaction only.

**ViewModel**  
Holds UI state using StateFlow and contains all business logic.

**Repository**  
Acts as the single source of truth and mediates between UI and data sources.

**Room Database**  
Provides persistent local storage for calculation history.

### This architecture ensures:
- Clear separation of concerns
- Testability
- Scalability
- Maintainability

---

## 🎨 UI & Design Philosophy

- Minimalist, distraction-free interface
- Professional color palette (not flashy)
- Adaptive light / dark theme
- Designed for one-hand usage
- No unnecessary visual noise

---

## 🚀 Future Enhancements

- Live currency exchange rates
- Advanced OCR for handwritten expressions
- Expression parsing from natural language
- Cloud sync for calculation history
- Tablet-optimized layouts
- Accessibility improvements (voice-first mode)

---

## 🤝 Contributors

### 👨‍💻 Parth

- Android Development
- App Architecture & Core Logic
- Calculator engine & expression evaluator
- Room database & history system
- Overall system design

🔗 GitHub: https://github.com/ParthCh300x

---

### 👨‍💻 Shravan Bire

- Android Development
- UI & feature contributions
- UI refinement and interaction design
- Feature ideation and implementation support
- Architectural discussions and improvements

🔗 GitHub: https://github.com/shravanBire

---

## 🧠 Why This Project Matters

ArithMatrix demonstrates:

- Modern Android development with Jetpack Compose
- Practical use of Room, Flow, and MVVM
- Multi-modal user interaction (touch, voice, camera)
- Clean architecture suitable for production apps
- Thoughtful UX for everyday utility software
