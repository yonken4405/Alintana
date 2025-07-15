// app.js

let availableVoices = [];
let recognition;
let isListening = false;
const webhookUrl = "https://n8n-yrm3.onrender.com/webhook/c1bbc699-15e0-4e30-816b-4ca72f4e577d";
// Don't get elements at top-level, wait for DOMContentLoaded
let chime;

// Load voices
window.speechSynthesis.onvoiceschanged = () => {
  availableVoices = window.speechSynthesis.getVoices();
};

// Initialize speech recognition
if ('webkitSpeechRecognition' in window) {
  recognition = new webkitSpeechRecognition();
  recognition.continuous = false;
  recognition.lang = 'en-US';
} else {
  alert("Speech recognition not supported. Use Chrome.");
}

recognition.onerror = () => {
  speak("Sorry, I didn't catch that. Please try again.");
  isListening = false;
};

recognition.onend = () => {
  isListening = false;
};

document.addEventListener('DOMContentLoaded', function() {
  const recordBtn = document.getElementById('recordBtn');
  chime = document.getElementById('chime');
  if (recordBtn) {
    recordBtn.addEventListener('click', function() {
      // For now, trigger on every click for testing
      if (chime) chime.play();
      if (recognition && !isListening) {
        isListening = true;
        recognition.start();
      } else if (!recognition) {
        alert('Speech recognition not supported.');
      }
    });
  }
});

// recordBtn.addEventListener('click', () => {
//   const now = Date.now();
//   if (now - lastTap < 400 && !isListening) {
//     chime.play();
//     isListening = true;
//     recognition.start();
//   }
//   lastTap = now;
// });

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  respondToUser(transcript);
};

function respondToUser(input) {
  if (!input) {
    speak("Sorry, I didn’t hear anything. Try again?");
    return;
  }
  const emergencyType = detectEmergencyType(input);
  const summary = emergencyType ? `${emergencyType} emergency reported.` : "Emergency reported.";
  speak(summary);
  getLocationAndSend(input);
}

function detectEmergencyType(text) {
  const lowered = text.toLowerCase();
  if (lowered.includes("fire")) return "Fire";
  if (lowered.includes("medical") || lowered.includes("injured")) return "Medical";
  if (lowered.includes("crime") || lowered.includes("robbed") || lowered.includes("stabbed")) return "Crime";
  return null;
}

function speak(message) {
  const synth = window.speechSynthesis;
  const utter = new SpeechSynthesisUtterance(message);
  const voice = availableVoices.find(v => v.lang === "en-US" && v.name.toLowerCase().includes("english"));
  if (voice) utter.voice = voice;
  synth.speak(utter);
}

function getLocationAndSend(text) {
  if (!navigator.geolocation) {
    sendToN8N(text, 0, 0, "Unknown");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=ab1bf1ce39ae49dbb45ffa8b884b97fb`)
      .then(res => res.json())
      .then(data => {
        const c = data.results[0].components;
        const barangay = c.suburb || c.neighbourhood || c.village || c.town || "Unknown";
        const city = c.city || c.municipality || c.state || "Unknown";
        sendToN8N(text, lat, lng, `${barangay}, ${city}`);
      })
      .catch(() => sendToN8N(text, lat, lng, "Unknown"));
  }, 
  () => sendToN8N(text, 0, 0, "Unknown"),
  { enableHighAccuracy: true, timeout: 10000 });
}

function sendToN8N(text, lat, lng, location) {
  fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lat, lng, location })
  })
  .then(r => r.json())
  .then(data => {
    const advice = data.advice || "Please stay safe and await help.";
    speak(advice);
  })
  .catch(() => speak("Failed to send the alert. Please try again."));
}

let lastTap = 0;
document.querySelectorAll('.panicBtn').forEach(btn => {
  btn.addEventListener('click', () => {
    const now = Date.now();
    if (now - lastTap < 400) {
      triggerPanic(btn.getAttribute('data-type'));
    }
    lastTap = now;
  });
});

function triggerPanic(type) {
  speak(`${type} emergency reported.`);
  if (!navigator.geolocation) {
    sendToN8N(type, 0, 0, "Unknown");
    return;
  }
  navigator.geolocation.getCurrentPosition(pos => {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    fetch(`https://api.opencagedata.com/geocode/v1/json?q=${lat}+${lng}&key=ab1bf1ce39ae49dbb45ffa8b884b97fb`)
      .then(r => r.json())
      .then(data => {
        const c = data.results[0].components;
        const area = c.city || c.town || c.village || c.state || "Unknown";
        sendToN8N(type, lat, lng, area);
      })
      .catch(() => sendToN8N(type, lat, lng, "Unknown"));
  }, 
  () => sendToN8N(type, 0, 0, "Unknown"),
  { enableHighAccuracy: true, timeout: 10000 });
}
