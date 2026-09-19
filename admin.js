// Admin Dashboard & Live Screen Projection Script
let supabaseAdmin = null;
let pollInterval = null;
let isFrozen = false;
let freezeWriteFailed = false;

// 5-minute Seminar Timer State
let seminarTimerInterval = null;
let seminarTimeRemaining = 300; // 5 minutes (300s)

// Initialize Supabase Client
function initAdmin() {
    if (typeof window.supabase !== 'undefined' && typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL !== "YOUR_SUPABASE_URL" && SUPABASE_URL !== "") {
        try {
            supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) {
            console.warn('Supabase Admin Init Warning:', e);
        }
    }

    fetchAdminData();
    fetchFreezeStatus();

    // Auto refresh live screen every 3 seconds
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(() => {
        fetchAdminData();
        fetchFreezeStatus();
    }, 3000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

// Fetch Freeze Status from Supabase or LocalStorage
async function fetchFreezeStatus() {
    if (supabaseAdmin) {
        try {
            const { data, error } = await supabaseAdmin
                .from('game_settings')
                .select('is_frozen')
                .eq('id', 1)
                .maybeSingle();

            if (!error && data !== null && !freezeWriteFailed) {
                isFrozen = !!data.is_frozen;
                localStorage.setItem('fastest_finger_game_frozen', isFrozen ? 'true' : 'false');
            } else {
                isFrozen = localStorage.getItem('fastest_finger_game_frozen') === 'true';
            }
        } catch (e) {
            isFrozen = localStorage.getItem('fastest_finger_game_frozen') === 'true';
        }
    } else {
        isFrozen = localStorage.getItem('fastest_finger_game_frozen') === 'true';
    }

    updateFreezeUI();
}

// Update Freeze UI elements on Admin Dashboard
function updateFreezeUI() {
    const statusPill = document.getElementById('game-status-pill');
    const freezeBtn = document.getElementById('freeze-btn');

    if (statusPill) {
        if (isFrozen) {
            statusPill.textContent = '🔒 GAME FROZEN';
            statusPill.className = 'status-pill frozen';
        } else {
            statusPill.textContent = '🟢 GAME OPEN';
            statusPill.className = 'status-pill active';
        }
    }

    if (freezeBtn) {
        if (isFrozen) {
            freezeBtn.innerHTML = '🔓 Unlock Game';
            freezeBtn.className = 'btn-mod btn-success';
        } else {
            freezeBtn.innerHTML = '🔒 Freeze Leaderboard';
            freezeBtn.className = 'btn-mod btn-warning';
        }
    }
}

// Toggle Game Freeze State in Supabase & LocalStorage
async function toggleGameFreeze(forceState = null) {
    const newState = (forceState !== null) ? forceState : !isFrozen;
    isFrozen = newState;

    // Save to LocalStorage immediately
    localStorage.setItem('fastest_finger_game_frozen', newState ? 'true' : 'false');
    updateFreezeUI();

    if (supabaseAdmin) {
        try {
            // Attempt update or insert into game_settings table (id=1)
            const { error: updateErr } = await supabaseAdmin
                .from('game_settings')
                .upsert({ id: 1, is_frozen: newState, updated_at: new Date().toISOString() });

            if (updateErr) {
                console.warn('game_settings upsert error, trying update fallback:', updateErr);
                const { error: updateOnlyErr } = await supabaseAdmin
                    .from('game_settings')
                    .update({ is_frozen: newState, updated_at: new Date().toISOString() })
                    .eq('id', 1);

                if (updateOnlyErr) {
                    console.warn('game_settings update error:', updateOnlyErr);
                    freezeWriteFailed = true;
                } else {
                    freezeWriteFailed = false;
                }
            } else {
                freezeWriteFailed = false;
            }
        } catch (err) {
            console.error('Error updating freeze state in Supabase:', err);
            freezeWriteFailed = true;
        }
    }
}

// 5-Minute Seminar Competition Timer Control
function toggleSeminarTimer() {
    const timerBtn = document.getElementById('timer-btn');
    const timerDisplay = document.getElementById('admin-timer-display');

    if (seminarTimerInterval) {
        // Pause timer
        clearInterval(seminarTimerInterval);
        seminarTimerInterval = null;
        if (timerBtn) timerBtn.innerHTML = '⏱️ Resume Timer';
        return;
    }

    // Reset timer to 5 mins if ended
    if (seminarTimeRemaining <= 0) {
        seminarTimeRemaining = 300;
    }

    if (timerBtn) timerBtn.innerHTML = '⏸️ Pause 5-Min Timer';

    // If game was frozen, auto-unfreeze when round starts
    if (isFrozen) {
        toggleGameFreeze(false);
    }

    seminarTimerInterval = setInterval(() => {
        seminarTimeRemaining--;

        const mins = Math.floor(seminarTimeRemaining / 60);
        const secs = seminarTimeRemaining % 60;
        const formatted = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        if (timerDisplay) timerDisplay.textContent = formatted;

        if (seminarTimeRemaining <= 0) {
            clearInterval(seminarTimerInterval);
            seminarTimerInterval = null;
            if (timerDisplay) timerDisplay.textContent = '00:00';
            if (timerBtn) timerBtn.innerHTML = '⏱️ Start 5-Min Round';

            // AUTO FREEZE LEADERBOARD WHEN 5 MINUTES EXPIRE!
            toggleGameFreeze(true);
        }
    }, 1000);
}

// Fetch Top Scores & Overview Stats
async function fetchAdminData() {
    const statusDot = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const lastUpdated = document.getElementById('last-updated-time');

    let playersData = [];

    if (supabaseAdmin) {
        try {
            // Fetch Top 3 High Scores & Total Player Count
            const { data, count, error } = await supabaseAdmin
                .from('leaderboard')
                .select('player_name, score, cps, created_at', { count: 'exact' })
                .order('score', { ascending: false })
                .limit(3);

            if (error) throw error;
            playersData = data || [];
            if (typeof count === 'number') {
                playersData.totalCount = count;
            }

            if (statusDot) statusDot.className = 'status-dot online';
            if (statusText) statusText.textContent = 'Connected to Supabase (Live)';
        } catch (err) {
            console.error('Error fetching admin leaderboard from Supabase:', err);
            playersData = getLocalScores();
            if (statusDot) statusDot.className = 'status-dot offline';
            if (statusText) statusText.textContent = 'Offline Mode (Local Storage)';
        }
    } else {
        playersData = getLocalScores();
        if (statusDot) statusDot.className = 'status-dot offline';
        if (statusText) statusText.textContent = 'Offline Mode (Local Storage)';
    }

    renderAdminDashboard(playersData);

    if (lastUpdated) {
        const now = new Date();
        lastUpdated.textContent = `Last update: ${now.toLocaleTimeString()}`;
    }
}

// Render Champion Highlight + Top 3 List + Stats Header
function renderAdminDashboard(players) {
    const totalPlayersEl = document.getElementById('stat-total-players');
    const topScoreEl = document.getElementById('stat-top-score');
    const avgCpsEl = document.getElementById('stat-avg-cps');

    const champCard = document.getElementById('champion-card');
    const champName = document.getElementById('champ-name');
    const champScore = document.getElementById('champ-score');
    const champCps = document.getElementById('champ-cps');

    const adminList = document.getElementById('admin-leaderboard-list');

    // Total stats
    const totalPlayers = typeof players.totalCount === 'number' ? players.totalCount : players.length;
    const topScore = players.length > 0 ? players[0].score : 0;
    const sumCps = players.reduce((acc, p) => acc + (parseFloat(p.cps) || 0), 0);
    const avgCps = players.length > 0 ? (sumCps / players.length).toFixed(1) : '0.0';

    if (totalPlayersEl) totalPlayersEl.textContent = totalPlayers;
    if (topScoreEl) topScoreEl.textContent = topScore;
    if (avgCpsEl) avgCpsEl.textContent = `${avgCps} CPS`;

    // Render Champion Spotlight
    if (players.length > 0 && champCard) {
        champCard.classList.remove('hidden');
        if (champName) champName.textContent = players[0].player_name;
        if (champScore) champScore.textContent = players[0].score;
        if (champCps) champCps.textContent = `${players[0].cps || 0} CPS`;
    } else if (champCard) {
        champCard.classList.add('hidden');
    }

    // Render Leaderboard Items (Top 3 Only)
    if (!adminList) return;

    if (players.length === 0) {
        adminList.innerHTML = `<li class="empty-state">No scores recorded yet. Waiting for participants to play!</li>`;
        return;
    }

    const rankBadges = ['🥇 1st', '🥈 2nd', '🥉 3rd'];

    // Display only top 3
    adminList.innerHTML = players.slice(0, 3).map((item, index) => {
        const rankLabel = rankBadges[index] || `#${index + 1}`;
        const isTop3 = `top-rank rank-${index + 1}`;

        return `
            <li class="admin-item ${isTop3}">
                <div class="rank-col">
                    <span class="badge-rank">${rankLabel}</span>
                </div>
                <div class="name-col">
                    <span class="player-name-text">${escapeAdminHtml(item.player_name)}</span>
                </div>
                <div class="cps-col">
                    <span class="cps-text">${item.cps || 0} CPS</span>
                </div>
                <div class="score-col">
                    <span class="score-pill">${item.score} pts</span>
                </div>
            </li>
        `;
    }).join('');
}

// LocalStorage fallback score reader
function getLocalScores() {
    const LOCAL_STORAGE_KEY = 'fastest_finger_top_scores';
    try {
        const local = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY) || '[]');
        return local.slice(0, 3);
    } catch (e) {
        return [];
    }
}

// Open Reset PIN Modal
function promptResetLeaderboard() {
    const modal = document.getElementById('pin-modal');
    const input = document.getElementById('mod-pin-input');
    const err = document.getElementById('pin-error');
    if (modal) modal.classList.remove('hidden');
    if (input) {
        input.value = '';
        input.focus();
    }
    if (err) err.classList.add('hidden');
}

// Close Reset PIN Modal
function closePinModal() {
    const modal = document.getElementById('pin-modal');
    if (modal) modal.classList.add('hidden');
}

// Confirm Leaderboard Reset
async function confirmResetLeaderboard() {
    const input = document.getElementById('mod-pin-input');
    const err = document.getElementById('pin-error');
    const pinEntered = input ? input.value.trim() : '';

    // Decode obfuscated security token at runtime
    let expectedPin = "";
    try {
        if (typeof _MOD_SEC_TOKEN !== 'undefined') {
            expectedPin = atob(_MOD_SEC_TOKEN);
        } else if (typeof ADMIN_PIN !== 'undefined') {
            expectedPin = ADMIN_PIN;
        } else {
            expectedPin = atob("SU1GMjAyNmdhbWU=");
        }
    } catch (e) {
        expectedPin = "";
    }

    if (pinEntered !== expectedPin) {
        if (err) {
            err.textContent = '❌ Incorrect PIN! Try again.';
            err.classList.remove('hidden');
        }
        return;
    }

    // PIN is correct, execute wipe!
    closePinModal();

    if (supabaseAdmin) {
        try {
            // Delete all rows from Supabase leaderboard table
            const { error } = await supabaseAdmin
                .from('leaderboard')
                .delete()
                .neq('score', -999999); // Deletes all records

            if (error) throw error;

            console.log('Supabase Leaderboard successfully reset!');
        } catch (err) {
            console.error('Error resetting Supabase leaderboard:', err);
            alert('Failed to clear Supabase leaderboard. Check database Row Level Security (RLS) permissions.');
        }
    }

    // Also clear LocalStorage
    localStorage.removeItem('fastest_finger_top_scores');

    fetchAdminData();
    alert('✅ Leaderboard has been reset successfully!');
}

// Utility to escape HTML
function escapeAdminHtml(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}
