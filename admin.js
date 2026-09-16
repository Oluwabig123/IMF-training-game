// Admin Dashboard & Live Screen Projection Script
let supabaseAdmin = null;
let pollInterval = null;

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

    // Auto refresh live screen every 3 seconds
    if (pollInterval) clearInterval(pollInterval);
    pollInterval = setInterval(fetchAdminData, 3000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAdmin);
} else {
    initAdmin();
}

// Fetch Top Scores & Overview Stats
async function fetchAdminData() {
    const statusDot = document.getElementById('status-indicator');
    const statusText = document.getElementById('status-text');
    const lastUpdated = document.getElementById('last-updated-time');

    let playersData = [];

    if (supabaseAdmin) {
        try {
            // Fetch Top High Scores
            const { data, error } = await supabaseAdmin
                .from('leaderboard')
                .select('player_name, score, cps, created_at')
                .order('score', { ascending: false })
                .limit(10);

            if (error) throw error;
            playersData = data || [];

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

// Render Champion Highlight + Top 10 List + Stats Header
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
    const totalPlayers = players.length;
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

    // Render Leaderboard Items
    if (!adminList) return;

    if (players.length === 0) {
        adminList.innerHTML = `<li class="empty-state">No scores recorded yet. Waiting for participants to play!</li>`;
        return;
    }

    const rankBadges = ['🥇 1st', '🥈 2nd', '🥉 3rd'];

    adminList.innerHTML = players.map((item, index) => {
        const rankLabel = rankBadges[index] || `#${index + 1}`;
        const isTop3 = index < 3 ? `top-rank rank-${index + 1}` : '';

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
        return local.slice(0, 10);
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

    const expectedPin = typeof ADMIN_PIN !== 'undefined' ? ADMIN_PIN : "IMF2026game";

    if (pinEntered !== expectedPin) {
        if (err) {
            err.textContent = '❌ Incorrect PIN!';
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
