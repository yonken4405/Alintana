document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  const CollapsibleButton = document.getElementById("collapsible");
  const SendButton = document.getElementById("sendButton");
  const InputBox = document.getElementById("chat-input-box");

  CollapsibleButton.addEventListener("click", handleCollapsibleClick);
  SendButton.addEventListener("click", handleSend);
  InputBox.addEventListener("keydown", handleInputKeyDown);
}

function handleInputKeyDown(event) {
  console.log(event.key);
  if (event.key === 'Enter') {
    handleSend();
    event.preventDefault();
  }
}

function handleCollapsibleClick() {
  const chatBox = document.getElementById("chat-container");
  if (chatBox.classList.contains("show")) {
    chatBox.classList.remove("show");
  } else {
    chatBox.classList.add("show");
  }
}

function handleSend() {
    const chatInput = document.getElementById("chat-input-box");
    const text = chatInput.value;
    chatInput.value = '';
    chatInput.focus();
    if(!text) {
      chatInput.classList.add('error');
      return;
    }
    

    chatInput.classList.remove('error');
    addUserBubble(text)

    getLocationAndSend(text)
    
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
  fetch("http://localhost:5680/webhook/3357ea9c-d2b4-43c4-a123-35e9301d9a76", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, lat, lng, location })
  })
  .then(r => r.json())
  .then(data => {
    const advice = data.output || "Please stay safe and await help.";
    // speak(advice);
     addUserBubble(advice)
  })
  .catch(() => speak("Failed to send the alert. Please try again."));
}



function addUserBubble(text) {
  const userBubble = document.createElement("p");
  userBubble.innerHTML = text;
  userBubble.classList.add("chat-bubble-user")

  document.getElementById("chat-content").appendChild(userBubble);


  setTimeout(() => addBotBubble(text), 500); // simulate a delay
}

function addBotBubble(text) {
  const botBubble = document.createElement("p");
  // const botText = getResponse(text);
  if (!botText) return;
  botBubble.innerHTML = botText;
  botBubble.classList.add("chat-bubble-bot")

  document.getElementById("chat-content").appendChild(botBubble);
}


  