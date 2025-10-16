const synth = window.speechSynthesis;
const startBtn = document.getElementById('start-btn');
const dialogueText = document.getElementById('dialogue-text');
let voices = [];
const txt = document.getElementById("txt");
const divshow = document.getElementById("dialogue-text");
/* Delay helper */
function wait(ms) { return new Promise(r => setTimeout(r, ms)); }
function crx_speakAll() {
    let texttospeak = txt.value.trim();
    let speakarray = texttospeak.split("\n\n\n");
    // alert(speakarray);
    const n = speakarray.length;
    for (let i = 0; i <= n - 1; i++) {
        crx_speak(speakarray[i], i % 2, 3000);

    }
}
async function crx_speak(texttobespoken, voiceno, timeforspeaking) {
    divshow.innerHTML = texttobespoken;
    const utterance = new SpeechSynthesisUtterance(texttobespoken);
    utterance.voice = voices[voiceno];
    synth.speak(utterance);
    await wait(timeforspeaking);
}

const conversation = [
    { speaker: 'Speaker A', text: 'Hello there, how are you today?' },
    { speaker: 'Speaker B', text: 'I am doing great, thank you for asking! And you?' },
    { speaker: 'Speaker A', text: 'I am also doing very well. It is a lovely day.' },
    { speaker: 'Speaker B', text: 'Yes, it is perfect for a nice long walk.' },
];

let currentLine = 0;

// This function must wait for the voices to be loaded.
// Some browsers load them asynchronously.
function populateVoiceList() {
    voices = synth.getVoices();
}

if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = populateVoiceList;
}

function speak(text, speakerVoice, callback) {
    if (!speakerVoice) {
        console.error('Speaker voice not found. Please reload or try a different speaker index.');
        return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = speakerVoice;

    // Use the `onend` event to start the next utterance
    utterance.onend = () => {
        if (callback) callback();
    };

    dialogueText.textContent = `${speakerVoice.name}: "${text}"`;
    synth.speak(utterance);
}

function startConversation() {
    if (currentLine >= conversation.length) {
        dialogueText.textContent = 'Conversation finished.';
        startBtn.disabled = false;
        return;
    }

    const line = conversation[currentLine];
    const voiceIndex = (currentLine % 2 === 0) ? 0 : 1; // Alternates between the first two voices
    const speakerVoice = voices[voiceIndex];

    speak(line.text, speakerVoice, () => {
        currentLine++;
        startConversation(); // Recursively call to continue the dialogue
    });
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
populateVoiceList();
