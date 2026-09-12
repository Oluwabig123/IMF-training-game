// DOM Elements Variables
let clickBox, boxText, timerDisplay, scoreDisplay, startBtn, resultMessage;
let submitScoreSection, playerNameInput, submitScoreBtn, leaderboardList;

// Game State Variables
let score = 0;
let timeLeft = 30;
let timerInterval = null;
let gameActive = false;

// Function to initialize DOM elements and event listeners safely
function init() {
    // Initialize Supabase client if configured
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_URL !== "") {
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) {
            console.warn('Supabase initialization warning:', e);
        }
    }

    clickBox = document.getElementById('click-box');
    boxText = document.getElementById('box-text');
    timerDisplay = document.getElementById('timer');
    scoreDisplay = document.getElementById('score');
    startBtn = document.getElementById('start-btn');
    resultMessage = document.getElementById('result-message');

    submitScoreSection = document.getElementById('submit-score-section');
    playerNameInput = document.getElementById('player-name');
    submitScoreBtn = document.getElementById('submit-score-btn');
    leaderboardList = document.getElementById('leaderboard-list');

    fetchTopPlayers();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Start / Reset Game
function startGame() {
    // Clear any existing active timer interval
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }

    // Reset variables
    score = 0;
    timeLeft = 30;
    gameActive = true;

    // UI Updates
    scoreDisplay.textContent = score;
    timerDisplay.textContent = `${timeLeft}s`;
    boxText.textContent = 'CLICK!';
    resultMessage.classList.add('hidden');
    submitScoreSection.classList.add('hidden');
    
    clickBox.disabled = false;
    startBtn.disabled = true;
    startBtn.style.opacity = '0.5';

    // Start Timer Interval (1 second step)
    timerInterval = setInterval(() => {
        timeLeft--;
        
        if (timeLeft <= 0) {
            timeLeft = 0;
            timerDisplay.textContent = '0s';
            endGame();
        } else {
            timerDisplay.textContent = `${timeLeft}s`;
        }
    }, 1000);
}

// Handle every valid click
function handleBoxClick() {
    if (!gameActive) return;

    score++;
    scoreDisplay.textContent = score;
}

// End Game Logic
function endGame() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    gameActive = false;

    // Disable click box, enable start button
    clickBox.disabled = true;
    startBtn.disabled = false;
    startBtn.style.opacity = '1';
    startBtn.textContent = 'Play Again';
    boxText.textContent = 'TIME UP!';

    // Calculate Clicks Per Second (CPS)
    const cps = (score / 30).toFixed(2);
    
    // Determine Speed Grade
    let rank = '';
    if (score >= 200) rank = '🔥 GOD SPEED! Lightning fingers!';
    else if (score >= 150) rank = '⚡ FAST FINGERS! Impressive speed!';
    else if (score >= 100) rank = '👍 GOOD SPEED! Above average!';
    else rank = '🐢 CASUAL CLICKER! Practice makes perfect.';

    // Display Results
    resultMessage.innerHTML = `
        Game Over!<br> 
        Final Score: <strong>${score}</strong> clicks (${cps} CPS)<br>
        ${rank}
    `;
    resultMessage.classList.remove('hidden');

    // Show name submission form
    if (score > 0) {
        submitScoreSection.classList.remove('hidden');
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = 'Submit Score';
    }
}

// LocalStorage fallback key
const LOCAL_STORAGE_KEY = 'fastest_finger_top_scores';

// Submit score (Supabase or LocalStorage fallback)
async function submitScore() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your name!');
        return;
    }

    const cps = parseFloat((score / 30).toFixed(2));

    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Submitting...';

    // If Supabase is configured, submit to Supabase
    if (supabase) {
        try {
            const { error } = await supabase
                .from('leaderboard')
                .insert([{ player_name: name, score: score, cps: cps }]);

            if (error) throw error;
        } catch (err) {
            console.error('Error submitting score to Supabase:', err);
            // Fall back to saving locally so score isn't lost
            saveLocalScore({ player_name: name, score: score, cps: cps });
            alert('Supabase error: Saved score locally instead! Make sure to create the leaderboard table in Supabase.');
        }
    } else {
        // Fallback: Save to LocalStorage
        saveLocalScore({ player_name: name, score: score, cps: cps });
    }

    submitScoreSection.classList.add('hidden');
    playerNameInput.value = '';
    fetchTopPlayers();
}

// Save score to browser LocalStorage
function saveLocalScore(newEntry) {
    let localScores = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    localScores.push(newEntry);
    // Sort descending by score
    localScores.sort((a, b) => b.score - a.score);
    // Keep top 10 locally
    localScores = localScores.slice(0, 10);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(localScores));
}

// Fetch Top 3 Players from Supabase or LocalStorage
async function fetchTopPlayers() {
    let topPlayers = [];

    if (supabase) {
        try {
            const { data, error } = await supabase
                .from('leaderboard')
                .select('player_name, score, cps')
                .order('score', { ascending: false })
                .limit(3);

            if (error) throw error;
            topPlayers = data || [];
        } catch (err) {
            console.error('Error fetching leaderboard from Supabase:', err);
            topPlayers = getLocalTopPlayers();
        }
    } else {
        // Load from LocalStorage fallback
        topPlayers = getLocalTopPlayers();
    }

    renderLeaderboard(topPlayers, !supabase);
}

// Get Top 3 from LocalStorage
function getLocalTopPlayers() {
    const localScores = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    return localScores.slice(0, 3);
}

// Render Leaderboard HTML
function renderLeaderboard(players, isOffline) {
    if (!players || players.length === 0) {
        leaderboardList.innerHTML = `<li class="empty">No scores submitted yet. Be the first! ${isOffline ? '(Local Mode)' : ''}</li>`;
        return;
    }

    const badges = ['🥇', '🥈', '🥉'];
    leaderboardList.innerHTML = players.map((item, index) => `
        <li class="leaderboard-item">
            <span class="player-info">${badges[index] || ''} ${escapeHtml(item.player_name)}</span>
            <span class="player-score">${item.score} pts (${item.cps} CPS)</span>
        </li>
    `).join('');
}

// Utility to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}