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

    // 2. Perform Analytics if a previous file exists
    const files = fs.readdirSync('.').filter(f => f.startsWith('followers_') && f !== CURRENT_FILE);
    if (files.length > 0) {
        const latestPreviousFile = files.sort().reverse()[0];
        const oldFollowers = fs.readFileSync(latestPreviousFile, 'utf8').split('\n').filter(Boolean);
        
        const newFollowers = followers.filter(f => !oldFollowers.includes(f));
        const unfollowed = oldFollowers.filter(f => !followers.includes(f));

        let report = `Comparison vs ${latestPreviousFile}:\n\n`;
        report += `--- NEW FOLLOWERS (${newFollowers.length}) ---\n${newFollowers.join('\n') || 'None'}\n\n`;
        report += `--- UNFOLLOWED (${unfollowed.length}) ---\n${unfollowed.join('\n') || 'None'}`;
        
        fs.writeFileSync(ANALYTICS_FILE, report);
        console.log(`Analytics saved to ${ANALYTICS_FILE}`);
    }
}

fetchFollowers();