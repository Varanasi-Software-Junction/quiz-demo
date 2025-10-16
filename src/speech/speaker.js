const synth = window.speechSynthesis;
const startBtn = document.getElementById('start-btn');
const dialogueText = document.getElementById('dialogue-text');
let voices = [];
const txt = document.getElementById("txt");
const divshow = document.getElementById("dialogue-text");
const pic1 = document.getElementById("img1");
const pic2 = document.getElementById("img2");
/* Delay helper */
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
async function crx_speakAll() {
    loadVoices();
    let texttospeak = txt.value.trim();
    let speakarray = texttospeak.split("\n\n\n");
    // alert(speakarray);
    const n = speakarray.length;
    for (let i = 0; i <= n - 1; i++) {
        await crx_speak(speakarray[i], i % 2, 3000);

    }
}



function crx_speak(texttobespoken, voiceno, timeforspeaking) {
    divshow.innerHTML = texttobespoken;
    if (voiceno == 0) {
        pic1.style.visibility = "visible";
        pic2.style.visibility = "hidden";

    }
    else {
        pic1.style.visibility = "hidden";
        pic2.style.visibility = "visible";
    }
    return new Promise(resolve => {
        const utterance = new SpeechSynthesisUtterance(texttobespoken);
        utterance.voice = voices[voiceno];
        utterance.onend = resolve; // Resolves the promise when speech ends
        window.speechSynthesis.speak(utterance);
    });
}




function loadVoices() {
    voices = synth.getVoices();
}


startBtn.addEventListener('click', () => {
    startBtn.disabled = true;
    currentLine = 0;
    // For browsers that load voices asynchronously, we must call getVoices() again.
    voices = synth.getVoices();
    if (voices.length < 2) {
        dialogueText.textContent = 'Could not find at least two different voices. Please check your browser settings.';
        startBtn.disabled = false;
        return;
    }
    startConversation();
});

// Initial voice population in case they are already loaded

