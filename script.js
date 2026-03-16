//WORKING
// --- ОФИЦИАЛНИ ДАТИ ---
const START_DATE = new Date("Mar 16, 2026 00:00:00").getTime();
const TARGET_DATE = START_DATE + (7 * 24 * 60 * 60 * 1000);

//const START_DATE = new Date().getTime() - (0.1 * 24 * 60 * 60 * 1000);
//const TARGET_DATE = START_DATE + (7 * 24 * 60 * 60 * 1000);

//const START_DATE = new Date().getTime() - (8 * 24 * 60 * 60 * 1000);
//const TARGET_DATE = START_DATE + (7 * 24 * 60 * 60 * 1000);

let gameData = { questions: [], easterEggs: [], finalPassword: "" };
let questionsData = [];
let currentQIndex = -1;
let attempts = 0;
let lastSeenDay = parseInt(localStorage.getItem("doomsday_last_day")) || 0;
let isHintPlaying = false;
let hasInteracted = false;
let currentPhase = "INIT";

const bgMusic = document.getElementById('bg-music');
const tickAudio = document.getElementById('tick-audio');
const dataSound = document.getElementById('data-sound');
const hintAudio = document.getElementById('hint-audio');

// --- ФУНКЦИИ ЗА КОДИРАНЕ/ДЕКОДИРАНЕ ---
function toBase64(str) {
    try {
        return btoa(unescape(encodeURIComponent(str)));
    } catch (e) { return ""; }
}

function fromBase64(str) {
    try {
        return decodeURIComponent(escape(atob(str)));
    } catch (e) { return ""; }
}

// --- ЗАРЕЖДАНЕ НА ДАННИТЕ ---
fetch('data.json')
    .then(response => response.json())
    .then(data => {
        gameData = data;
        questionsData = data.questions;
        runTimerLogic();
        setInterval(runTimerLogic, 1000);
    })
    .catch(error => console.error("Error loading data:", error));

hintAudio.addEventListener('ended', () => {
    isHintPlaying = false;
    document.getElementById('hint-music').classList.remove('active-hint');
    if (hasInteracted) bgMusic.play().catch(() => { });
});

function playErrorSound() {
    const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(150, audioCtx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.5);
    gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + 0.5);
}

document.getElementById('start-overlay').addEventListener('click', function () {
    hasInteracted = true;
    this.style.opacity = '0';
    setTimeout(() => { this.style.display = 'none'; }, 500);

    bgMusic.volume = 0.5;
    bgMusic.play().catch(() => { });
});

function runTimerLogic() {
    if (currentPhase === "TERMINAL" || currentPhase === "ROADMAP" || questionsData.length === 0) return;

    const now = new Date().getTime();

    if (now < START_DATE) {
        currentPhase = "PRE_START";
        document.getElementById('header').style.display = 'none';
        document.getElementById('timer').style.display = 'none';
        document.getElementById('question-nav').style.display = 'none';
        document.getElementById('final-zone').style.display = 'none';
        document.getElementById('pre-start-text').style.display = 'block';
        return;
    }

    currentPhase = "ACTIVE";
    document.getElementById('header').style.display = 'block';
    document.getElementById('timer').style.display = 'flex';
    document.getElementById('question-nav').style.display = 'flex';
    document.getElementById('pre-start-text').style.display = 'none';

    const distance = TARGET_DATE - now;

    if (distance > 0) {
        document.getElementById('final-zone').style.display = 'none';

        const d = Math.floor(distance / (1000 * 60 * 60 * 24));
        const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const s = Math.floor((distance % (1000 * 60)) / 1000);

        document.getElementById('days').innerText = d < 10 ? "0" + d : d;
        document.getElementById('hours').innerText = h < 10 ? "0" + h : h;
        document.getElementById('minutes').innerText = m < 10 ? "0" + m : m;
        document.getElementById('seconds').innerText = s < 10 ? "0" + s : s;

        if (hasInteracted && !isHintPlaying) {
            tickAudio.currentTime = 0;
            tickAudio.play().catch(() => { });
        }
    } else {
        document.getElementById('days').innerText = "00";
        document.getElementById('hours').innerText = "00";
        document.getElementById('minutes').innerText = "00";
        document.getElementById('seconds').innerText = "00";
        document.getElementById('timer').style.opacity = "0.4";
        document.getElementById('final-zone').style.display = 'inline-block';
    }

    const daysSinceStart = Math.floor((now - START_DATE) / (1000 * 60 * 60 * 24));
    const activeCircles = Math.min(Math.max(daysSinceStart + 1, 0), 7);
    updateNavCircles(activeCircles);
}

function updateNavCircles(activeCount) {
    const nav = document.getElementById('question-nav');
    if (nav.children.length !== activeCount) {
        nav.innerHTML = '';
        for (let i = 0; i < activeCount; i++) {
            const circle = document.createElement('div');
            circle.className = 'nav-circle';
            circle.innerText = questionsData[i].id;
            circle.onclick = () => openQuestionModal(i);
            nav.appendChild(circle);
        }

        if (activeCount < lastSeenDay) lastSeenDay = 0;

        if (activeCount > lastSeenDay && activeCount > 0) {
            showStylishNotification(questionsData[activeCount - 1].id);
            lastSeenDay = activeCount;
            localStorage.setItem("doomsday_last_day", lastSeenDay);
        }
    }
}

function showStylishNotification(romanNum) {
    const notif = document.getElementById('stylish-notification');
    document.getElementById('notif-q-num').innerText = romanNum;
    notif.classList.add('show');
    dataSound.play().catch(() => { });
}

document.getElementById('close-notif').onclick = () => {
    document.getElementById('stylish-notification').classList.remove('show');
};

function openQuestionModal(index) {
    currentQIndex = index;
    attempts = 0;
    const q = questionsData[index];

    document.getElementById('modal-title').innerText = `ВЪПРОС ${q.id}`;
    document.getElementById('question-text').innerText = q.q;

    const input = document.getElementById('answer-input');
    input.value = "";
    input.disabled = false;
    document.getElementById('error-msg').innerText = "";
    document.getElementById('success-msg').innerText = "";
    document.getElementById('submit-answer').style.display = 'inline-block';

    document.getElementById('hint-music').classList.remove('active-hint');
    document.getElementById('hint-friend').classList.remove('active-hint');
    document.getElementById('friend-sidebar').classList.remove('active');

    const expertsContainer = document.getElementById('experts-container');
    expertsContainer.innerHTML = '';
    q.experts.forEach(exp => {
        const card = document.createElement('div');
        card.className = 'friend-card';
        card.innerHTML = `
            <div class="friend-img" style="background-image: url('${exp.img}')"></div>
            <h4 style="margin: 5px 0 2px 0; font-size: 0.9rem;">${exp.name}</h4>
            <p style="font-size:0.7rem; opacity:0.6; margin: 0;">${exp.role}</p>
        `;
        expertsContainer.appendChild(card);
    });

    document.getElementById('question-modal').style.display = 'flex';
}

document.getElementById('submit-answer').onclick = () => {
    const rawVal = document.getElementById('answer-input').value.toLowerCase().trim();
    const encodedVal = toBase64(rawVal); // Кодираме въведеното и го сравняваме
    const q = questionsData[currentQIndex];

    if (encodedVal === q.a || encodedVal === q.alt_a) {
        document.getElementById('error-msg').innerText = "";
        document.getElementById('success-msg').innerText = `КОД: ${q.code}`;
        document.getElementById('answer-input').disabled = true;
        document.getElementById('submit-answer').style.display = 'none';

        hintAudio.pause();
        hintAudio.currentTime = 0;
        if (isHintPlaying) {
            isHintPlaying = false;
            bgMusic.play().catch(() => { });
        }
    } else {
        attempts++;
        playErrorSound();
        const input = document.getElementById('answer-input');
        input.classList.add('error-shake');
        document.getElementById('success-msg').innerText = "";
        setTimeout(() => input.classList.remove('error-shake'), 400);
        if (attempts >= 3) {
            document.getElementById('error-msg').innerText = q.err;
        }
    }
};

document.getElementById('close-modal').onclick = () => {
    document.getElementById('question-modal').style.display = 'none';

    hintAudio.pause();
    hintAudio.currentTime = 0;
    if (isHintPlaying) {
        isHintPlaying = false;
        bgMusic.play().catch(() => { });
    }

    document.getElementById('hint-music').classList.remove('active-hint');
    document.getElementById('hint-friend').classList.remove('active-hint');
};

document.getElementById('hint-music').onclick = function () {
    this.classList.add('active-hint');
    isHintPlaying = true;
    bgMusic.pause();
    hintAudio.src = questionsData[currentQIndex].music;
    hintAudio.play().catch(() => { });
};

document.getElementById('hint-friend').onclick = function () {
    this.classList.toggle('active-hint');
    document.getElementById('friend-sidebar').classList.toggle('active');
};

function checkEasterEgg(e) {
    const val = e.target.value.toLowerCase();

    // Декодираме Easter eggs в паметта само по време на проверката
    const isEasterEgg = gameData.easterEggs.some(egg => val.includes(fromBase64(egg)));

    if (isEasterEgg) {
        document.getElementById('wednesday-modal').style.display = 'flex';
        e.target.value = "";
    }
}
document.getElementById('answer-input').addEventListener('input', checkEasterEgg);
document.getElementById('final-password').addEventListener('input', checkEasterEgg);

document.getElementById('close-wednesday').onclick = () => {
    document.getElementById('wednesday-modal').style.display = 'none';
};

document.getElementById('final-btn').onclick = () => {
    const pass = document.getElementById('final-password').value.trim();
    // Сравняваме кодираната парола
    if (toBase64(pass) === gameData.finalPassword) {
        startTerminalSequence();
    } else {
        playErrorSound();
        const input = document.getElementById('final-password');
        input.classList.add('error-shake');
        setTimeout(() => input.classList.remove('error-shake'), 400);
    }
};

function startTerminalSequence() {
    currentPhase = "TERMINAL";

    document.getElementById('main-ui').style.display = 'none';
    document.getElementById('question-nav').style.display = 'none';
    const term = document.getElementById('terminal-screen');
    term.style.display = 'block';
    dataSound.loop = true; dataSound.play();

    const lines = [
        "> ИНИЦИАЛИЗИРАНЕ НА ПРОТОКОЛ ЗА СИГУРНОСТ...",
        "> ПРОВЕРКА НА КОДОВЕ ЗА ДОСТЪП... УСПЕШНА.",
        "> СВЪРЗВАНЕ С ЦЕНТРАЛЕН СЪРВЪР 'НОВОСИБИРСК'...",
        "> ....................................",
        "> ВРЪЗКАТА УСТАНОВЕНА.",
        "> ДЕКРИПТИРАНЕ НА ФАЙЛ 'CarniCraft_Roadmap'...",
        "> ДОСТЪП РАЗРЕШЕН."
    ];

    let i = 0;
    function printLine() {
        if (i < lines.length) {
            const p = document.createElement("div");
            p.classList.add("terminal-line");
            p.innerText = lines[i];
            term.appendChild(p);
            i++; setTimeout(printLine, 600);
        } else {
            dataSound.pause();
            const btn = document.createElement("button");
            btn.innerText = "[ ВЛЕЗ В СИСТЕМАТА ]";
            btn.style.marginTop = "30px";
            btn.onclick = () => {
                currentPhase = "ROADMAP";
                term.style.display = 'none';
                document.getElementById('final-page').style.display = 'flex';
            };
            term.appendChild(btn);
        }
    }
    printLine();
}

document.getElementById('open-roadmap-btn').onclick = () => {
    document.getElementById('roadmap-modal').style.display = 'flex';
};

document.getElementById('close-roadmap').onclick = () => {
    document.getElementById('roadmap-modal').style.display = 'none';
};