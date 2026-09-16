// DOM Elements Variables
let clickBox, boxText, timerDisplay, scoreDisplay, startBtn;
let submitScoreSection, playerNameInput, submitScoreBtn, leaderboardList;
let resultModal, modalScore, modalCps, modalRankBadge;

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

    submitScoreSection = document.getElementById('submit-score-section');
    playerNameInput = document.getElementById('player-name');
    submitScoreBtn = document.getElementById('submit-score-btn');
    leaderboardList = document.getElementById('leaderboard-list');

    resultModal = document.getElementById('result-modal');
    modalScore = document.getElementById('modal-score');
    modalCps = document.getElementById('modal-cps');
    modalRankBadge = document.getElementById('modal-rank-badge');

    // Pre-fill saved player name if available
    const savedName = localStorage.getItem('fastest_finger_player_name');
    if (savedName && playerNameInput) {
        playerNameInput.value = savedName;
    }

    fetchTopPlayers();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Start / Reset Game
function startGame() {
    closeModal();

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
    boxText.innerHTML = 'CLICK! <span class="inline-coin">IMF</span>';
    
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

// Handle every valid click with high responsiveness and tactile visual feedback
function handleBoxClick(event) {
    if (!gameActive) return;

    // Base increment
    score++;

    // Rare Jackpot Chance (1.5% probability per tap)
    const isJackpot = Math.random() < 0.015;
    if (isJackpot && score > 5) {
        // Multiply player's total current score by 2x!
        score = score * 2;
        triggerJackpotEffect(event);
    }

    scoreDisplay.textContent = score;

    // Trigger visual pop pulse animation
    clickBox.classList.remove('active-pulse');
    void clickBox.offsetWidth; // Trigger reflow
    clickBox.classList.add('active-pulse');

    // Spawn 3D IMF gold coin popup
    spawnIMFCoin(event);
}

// Special Jackpot Visual Burst Notification
function triggerJackpotEffect(event) {
    const rippleContainer = document.getElementById('click-ripple-container');
    if (!rippleContainer) return;

    const jackpotBanner = document.createElement('div');
    jackpotBanner.className = 'jackpot-popup';
    jackpotBanner.innerHTML = '🎰 2X JACKPOT! 🎰';

    const rect = clickBox.getBoundingClientRect();
    jackpotBanner.style.left = `${rect.width / 2}px`;
    jackpotBanner.style.top = `${rect.height / 2}px`;

    rippleContainer.appendChild(jackpotBanner);

    setTimeout(() => {
        jackpotBanner.remove();
    }, 1200);
}

// Spawns a floating 3D IMF Gold Coin at touch/click coordinates
function spawnIMFCoin(event) {
    const globalCoinLayer = document.getElementById('global-coin-layer');
    if (!globalCoinLayer) return;

    const rect = clickBox.getBoundingClientRect();
    const coin = document.createElement('div');
    coin.className = 'imf-coin';
    coin.innerText = 'IMF';

    let clientX = rect.left + rect.width / 2;
    let clientY = rect.top + rect.height / 2;

    if (event) {
        if (event.touches && event.touches.length > 0) {
            clientX = event.touches[0].clientX;
            clientY = event.touches[0].clientY;
        } else if (event.clientX && event.clientY) {
            clientX = event.clientX;
            clientY = event.clientY;
        }
    }

    // Add slight random horizontal drift (-30px to +30px)
    const randomOffset = (Math.random() - 0.5) * 60;

    coin.style.left = `${clientX + randomOffset}px`;
    coin.style.top = `${clientY}px`;

    globalCoinLayer.appendChild(coin);

    setTimeout(() => {
        coin.remove();
    }, 750);
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
    startBtn.textContent = 'Start Challenge 🚀';
    boxText.textContent = 'TIME UP! ⏰';

    // Calculate Clicks Per Second (CPS)
    const cps = (score / 30).toFixed(2);
    
    // Determine Speed Grade
    let rank = '';
    if (score >= 200) rank = '🔥 GOD SPEED! Lightning fingers!';
    else if (score >= 150) rank = '⚡ FAST FINGERS! Impressive speed!';
    else if (score >= 100) rank = '👍 GOOD SPEED! Above average!';
    else rank = '🐢 CASUAL CLICKER! Practice makes perfect.';

    // Populate Modal Summary
    if (modalScore) modalScore.textContent = score;
    if (modalCps) modalCps.textContent = `${cps} CPS`;
    if (modalRankBadge) modalRankBadge.textContent = rank;

    // Reset submit button state
    if (submitScoreBtn) {
        submitScoreBtn.disabled = false;
        submitScoreBtn.textContent = 'Save Score 🏆';
    }

    // Show congratulatory popup modal
    if (resultModal) {
        resultModal.classList.remove('hidden');
    }
}

function closeModal() {
    if (resultModal) {
        resultModal.classList.add('hidden');
    }
}

function closeModalAndPlayAgain() {
    closeModal();
    startGame();
}

// LocalStorage fallback key
const LOCAL_STORAGE_KEY = 'fastest_finger_top_scores';

// Get or generate a unique Device ID per phone/browser
function getDeviceId() {
    let deviceId = localStorage.getItem('fastest_finger_device_id');
    if (!deviceId) {
        deviceId = 'dev_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
        localStorage.setItem('fastest_finger_device_id', deviceId);
    }
    return deviceId;
}

// Submit score (Supabase or LocalStorage fallback)
async function submitScore() {
    const name = playerNameInput.value.trim();
    if (!name) {
        alert('Please enter your full name!');
        return;
    }

    const deviceId = getDeviceId();

    // Save name to localStorage for fast repeat play
    localStorage.setItem('fastest_finger_player_name', name);

    const cps = parseFloat((score / 30).toFixed(2));

    submitScoreBtn.disabled = true;
    submitScoreBtn.textContent = 'Saving...';

    // If Supabase is configured, submit to Supabase
    if (supabase) {
        try {
            const numericScore = parseInt(score, 10);

            // Attempt query with device_id, fallback to player_name if device_id column missing
            let existing = null;

            try {
                if (deviceId) {
                    const { data: existingDevice } = await supabase
                        .from('leaderboard')
                        .select('id, score, player_name')
                        .eq('device_id', deviceId)
                        .order('id', { ascending: false })
                        .limit(1);

                    if (existingDevice && existingDevice.length > 0) {
                        existing = existingDevice[0];
                    }
                }
            } catch (e) {
                console.warn('device_id check skipped:', e);
            }

            if (!existing) {
                const { data: existingName, error: nameErr } = await supabase
                    .from('leaderboard')
                    .select('id, score, player_name')
                    .ilike('player_name', name)
                    .order('id', { ascending: false })
                    .limit(1);

                if (!nameErr && existingName && existingName.length > 0) {
                    existing = existingName[0];
                }
            }

            if (existing) {
                const existingScore = parseInt(existing.score, 10) || 0;
                
                // Only execute update if new score is strictly higher than existing score
                if (numericScore > existingScore) {
                    // Try updating with device_id first
                    let updateSuccess = false;
                    try {
                        const { error: err1 } = await supabase
                            .from('leaderboard')
                            .update({ player_name: name, score: numericScore, cps: cps, device_id: deviceId })
                            .eq('id', existing.id);
                        if (!err1) updateSuccess = true;
                    } catch (e) {}

                    // Fallback update without device_id if column missing
                    if (!updateSuccess) {
                        const { error: err2 } = await supabase
                            .from('leaderboard')
                            .update({ player_name: name, score: numericScore, cps: cps })
                            .eq('id', existing.id);
                        if (err2) throw err2;
                    }
                }
            } else {
                // New player entry
                let insertSuccess = false;
                try {
                    const { error: err1 } = await supabase
                        .from('leaderboard')
                        .insert([{ device_id: deviceId, player_name: name, score: numericScore, cps: cps }]);
                    if (!err1) insertSuccess = true;
                } catch (e) {}

                if (!insertSuccess) {
                    const { error: err2 } = await supabase
                        .from('leaderboard')
                        .insert([{ player_name: name, score: numericScore, cps: cps }]);
                    if (err2) throw err2;
                }
            }
        } catch (err) {
            console.error('Error submitting score to Supabase:', err);
            saveLocalScore({ device_id: deviceId, player_name: name, score: numericScore, cps: cps });
        }
    } else {
        // Fallback: Save to LocalStorage
        saveLocalScore({ device_id: deviceId, player_name: name, score: score, cps: cps });
    }

    closeModal();
    fetchTopPlayers();
}

// Save score to browser LocalStorage (Personal Best per player device/name)
function saveLocalScore(newEntry) {
    let localScores = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
    
    // Find index by device_id OR player_name
    const existingIndex = localScores.findIndex(item => 
        (item.device_id && item.device_id === newEntry.device_id) || 
        (item.player_name && item.player_name.toLowerCase() === newEntry.player_name.toLowerCase())
    );
    
    if (existingIndex !== -1) {
        localScores[existingIndex].player_name = newEntry.player_name;
        localScores[existingIndex].device_id = newEntry.device_id;
        // Only update score if higher
        if (newEntry.score > localScores[existingIndex].score) {
            localScores[existingIndex].score = newEntry.score;
            localScores[existingIndex].cps = newEntry.cps;
        }
    } else {
        localScores.push(newEntry);
    }

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

// Render Leaderboard HTML with Conference Rank Styling
function renderLeaderboard(players, isOffline) {
    if (!players || players.length === 0) {
        leaderboardList.innerHTML = `<li class="empty">No scores recorded yet. Be the first player! ${isOffline ? '(Offline Mode)' : ''}</li>`;
        return;
    }

    const badges = ['🥇', '🥈', '🥉'];
    leaderboardList.innerHTML = players.map((item, index) => `
        <li class="leaderboard-item rank-${index + 1}">
            <span class="player-info">
                <span class="rank-badge">${badges[index] || ''}</span> 
                ${escapeHtml(item.player_name)}
            </span>
            <span class="player-score">${item.score} pts</span>
        </li>
    `).join('');
}

// Utility to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.innerText = text;
    return div.innerHTML;
}