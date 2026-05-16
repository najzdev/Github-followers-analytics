const axios = require('axios');
const fs = require('fs');
const path = require('path');

// --- CONFIGURATION ---
const USERNAME = 'najzdev'; // change to your GitHub username
const TOKEN = 'paste you token key here it starts with ghp....'; // Generate a GitHub Personal Access Token with 'read:user' scope


// Generate date string (e.g., 2026-04-27)
const date = new Date().toISOString().split('T')[0];
const CURRENT_FILE = `followers_${date}.txt`;
const ANALYTICS_FILE = `analytics_${date}.txt`;

// Utility function to calculate days between two dates
function daysBetween(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1; // return 1 if same day
}

// Extract date from filename (followers_YYYY-MM-DD.txt)
function extractDateFromFilename(filename) {
    const match = filename.match(/followers_(\d{4}-\d{2}-\d{2})/);
    return match ? match[1] : null;
}

// Format numbers with commas
function formatNumber(num) {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function fetchFollowers() {
    let followers = [];
    let page = 1;

    console.log(`Fetching current followers for ${USERNAME}...`);
    while (true) {
        const response = await axios.get(`https://api.github.com/users/${USERNAME}/followers`, {
            headers: { 'Authorization': `token ${TOKEN}`, 'Accept': 'application/vnd.github.v3+json' },
            params: { page, per_page: 100 }
        });
        if (response.data.length === 0) break;
        response.data.forEach(user => followers.push(user.login));
        page++;
    }

    // 1. Save current list
    fs.writeFileSync(CURRENT_FILE, followers.join('\n'));
    console.log(`Saved current followers to ${CURRENT_FILE}`);
    console.log(`Total followers: ${formatNumber(followers.length)}\n`);

    // 2. Perform Analytics if a previous file exists
    const allFollowerFiles = fs.readdirSync('.').filter(f => f.startsWith('followers_') && f !== CURRENT_FILE && f.match(/followers_\d{4}-\d{2}-\d{2}\.txt/));
    
    if (allFollowerFiles.length > 0) {
        allFollowerFiles.sort().reverse();
        const latestPreviousFile = allFollowerFiles[0];
        const oldFollowers = fs.readFileSync(latestPreviousFile, 'utf8').split('\n').filter(Boolean);
        
        const newFollowers = followers.filter(f => !oldFollowers.includes(f));
        const unfollowed = oldFollowers.filter(f => !followers.includes(f));

        // Calculate metrics
        const oldCount = oldFollowers.length;
        const newCount = followers.length;
        const netChange = newCount - oldCount;
        const percentChange = oldCount > 0 ? ((netChange / oldCount) * 100).toFixed(2) : 0;
        
        const oldDate = extractDateFromFilename(latestPreviousFile);
        const daysElapsed = daysBetween(oldDate, date);
        const dailyGrowth = (netChange / daysElapsed).toFixed(2);
        const dailyNewFollowers = (newFollowers.length / daysElapsed).toFixed(2);
        const dailyUnfollows = (unfollowed.length / daysElapsed).toFixed(2);
        
        const newFollowerPercent = oldCount > 0 ? ((newFollowers.length / oldCount) * 100).toFixed(2) : 0;
        const unfollowedPercent = oldCount > 0 ? ((unfollowed.length / oldCount) * 100).toFixed(2) : 0;

        let report = `╔════════════════════════════════════════════════════════════════╗\n`;
        report += `║  GITHUB FOLLOWERS ANALYTICS REPORT - ${date}  ║\n`;
        report += `╚════════════════════════════════════════════════════════════════╝\n\n`;

        // Summary Statistics
        report += `📊 SUMMARY STATISTICS\n`;
        report += `${'─'.repeat(65)}\n`;
        report += `Previous Followers (${oldDate}):  ${formatNumber(oldCount)}\n`;
        report += `Current Followers (${date}):   ${formatNumber(newCount)}\n`;
        report += `Net Change:              ${netChange > 0 ? '+' : ''}${formatNumber(netChange)} (${percentChange}%)\n`;
        report += `Time Period:             ${daysElapsed} day(s)\n\n`;

        // Growth Metrics
        report += `📈 GROWTH METRICS\n`;
        report += `${'─'.repeat(65)}\n`;
        report += `Daily Average Growth:    ${dailyGrowth} followers/day\n`;
        report += `Daily New Followers:     ${dailyNewFollowers} followers/day\n`;
        report += `Daily Unfollows:         ${dailyUnfollows} followers/day\n\n`;

        // Followers Movement
        report += `🔄 FOLLOWERS MOVEMENT\n`;
        report += `${'─'.repeat(65)}\n`;
        report += `New Followers (${daysElapsed}d): ${newFollowers.length} (+${newFollowerPercent}%)\n`;
        report += `Unfollowed (${daysElapsed}d):      ${unfollowed.length} (-${unfollowedPercent}%)\n`;
        report += `Retained:                ${oldCount - unfollowed.length} followers\n\n`;

        // Historical Trend (if 3+ data points available)
        if (allFollowerFiles.length >= 3) {
            report += `📉 HISTORICAL TREND (Last 3 snapshots)\n`;
            report += `${'─'.repeat(65)}\n`;
            const last3Files = allFollowerFiles.slice(0, 3).reverse();
            last3Files.forEach((file, index) => {
                const fileData = fs.readFileSync(file, 'utf8').split('\n').filter(Boolean);
                const fileDate = extractDateFromFilename(file);
                const trend = index === 0 ? '📍' : index === 1 ? '📊' : '📈';
                report += `${trend} ${fileDate}: ${formatNumber(fileData.length)} followers\n`;
            });
            report += `\n`;
        }

        // New Followers List
        report += `✅ NEW FOLLOWERS (${newFollowers.length})\n`;
        report += `${'─'.repeat(65)}\n`;
        if (newFollowers.length > 0) {
            newFollowers.forEach(follower => report += `  • ${follower}\n`);
        } else {
            report += `  No new followers\n`;
        }
        report += `\n`;

        // Unfollowed List
        report += `❌ UNFOLLOWED (${unfollowed.length})\n`;
        report += `${'─'.repeat(65)}\n`;
        if (unfollowed.length > 0) {
            unfollowed.forEach(follower => report += `  • ${follower}\n`);
        } else {
            report += `  No unfollows\n`;
        }

        report += `\n${'═'.repeat(65)}\n`;
        report += `Generated: ${new Date().toLocaleString()}\n`;
        
        fs.writeFileSync(ANALYTICS_FILE, report);
        console.log(`✅ Analytics saved to ${ANALYTICS_FILE}`);
    }
}

fetchFollowers();