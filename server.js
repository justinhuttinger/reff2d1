const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Load clubs config
const clubsConfig = JSON.parse(fs.readFileSync(path.join(__dirname, 'clubs-config.json'), 'utf8'));

// Create a map for quick lookup by slug
const clubsBySlug = {};
clubsConfig.clubs.forEach(club => {
  if (club.enabled) {
    clubsBySlug[club.slug.toLowerCase()] = club;
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Home page - show list of locations
app.get('/', (req, res) => {
  const clubList = clubsConfig.clubs
    .filter(c => c.enabled)
    .map(c => `<li><a href="/${c.slug}">${c.clubName}</a></li>`)
    .join('\n');
  
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Member Referral Lookup - West Coast Strength</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 600px;
          margin: 0 auto;
          padding: 40px 20px;
          background: #ffffff;
          color: #000000;
        }
        h1 { 
          font-family: 'Bebas Neue', sans-serif;
          font-size: 36px;
          color: #000000;
          text-align: center;
          margin-bottom: 10px;
          letter-spacing: 2px;
        }
        p {
          text-align: center;
          color: #666;
          margin-bottom: 30px;
        }
        ul { list-style: none; padding: 0; }
        li { margin: 12px 0; }
        a {
          display: block;
          padding: 16px 24px;
          background: #000000;
          color: #ffffff;
          text-decoration: none;
          border-radius: 8px;
          font-size: 18px;
          font-weight: 600;
          text-align: center;
          transition: all 0.2s;
        }
        a:hover { 
          background: #333333;
        }
      </style>
    </head>
    <body>
      <h1>DAY ONE / REFERRAL MEMBER LOOKUP</h1>
      <p>Select your location:</p>
      <ul>${clubList}</ul>
    </body>
    </html>
  `);
});

// Search contacts for a specific location
app.get('/api/:slug/search', async (req, res) => {
  const { slug } = req.params;
  const { query } = req.query;
  
  const club = clubsBySlug[slug.toLowerCase()];
  if (!club) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  if (!query || query.length < 2) {
    return res.json({ contacts: [] });
  }

  try {
    const response = await fetch(
      `https://services.leadconnectorhq.com/contacts/?locationId=${club.ghlLocationId}&query=${encodeURIComponent(query)}&limit=10`,
      {
        headers: {
          'Authorization': `Bearer ${club.ghlApiKey}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GHL API Error:', response.status, errorText);
      return res.status(response.status).json({ error: 'Failed to search contacts' });
    }

    const data = await response.json();
    
    // Map to just the fields we need
    const contacts = (data.contacts || []).map(contact => ({
      id: contact.id,
      firstName: contact.firstName || '',
      lastName: contact.lastName || '',
      email: contact.email || '',
      phone: contact.phone || '',
      name: `${contact.firstName || ''} ${contact.lastName || ''}`.trim()
    }));

    res.json({ contacts });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// Get config for a specific location
app.get('/api/:slug/config', (req, res) => {
  const { slug } = req.params;
  
  const club = clubsBySlug[slug.toLowerCase()];
  if (!club) {
    return res.status(404).json({ error: 'Location not found' });
  }
  
  res.json({
    clubName: club.clubName,
    referralFormUrl: club.referralFormUrl || '',
    dayOneFormUrl: club.dayOneFormUrl || '',
    manualEntryUrl: club.manualEntryUrl || ''
  });
});

// Serve the location-specific page
app.get('/:slug', (req, res) => {
  const { slug } = req.params;
  
  const club = clubsBySlug[slug.toLowerCase()];
  if (!club) {
    return res.status(404).send('Location not found');
  }
  
  // Send the HTML with the slug embedded
  res.send(getLocationPage(club.slug, club.clubName));
});

function getLocationPage(slug, clubName) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Member Referral Lookup - ${clubName} | West Coast Strength</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 600px;
      margin: 0 auto;
      padding: 40px 20px;
      background: #ffffff;
      color: #000000;
    }
    
    h1 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 32px;
      color: #000000;
      margin-bottom: 8px;
      text-align: center;
      letter-spacing: 2px;
    }
    
    .subtitle {
      color: #666;
      margin-bottom: 30px;
      text-align: center;
    }
    
    .search-container {
      position: relative;
    }
    
    #searchInput {
      width: 100%;
      padding: 16px 20px;
      font-size: 18px;
      border: 2px solid #000000;
      border-radius: 8px;
      outline: none;
      transition: border-color 0.2s;
      background: #ffffff;
    }
    
    #searchInput:focus {
      border-color: #333333;
      box-shadow: 0 0 0 3px rgba(0,0,0,0.1);
    }
    
    #results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 2px solid #000000;
      border-top: none;
      border-radius: 0 0 8px 8px;
      max-height: 400px;
      overflow-y: auto;
      display: none;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 100;
    }
    
    #results.show {
      display: block;
    }
    
    .result-item {
      padding: 16px 20px;
      cursor: pointer;
      border-bottom: 1px solid #eee;
      transition: background 0.15s;
    }
    
    .result-item:hover {
      background: #f5f5f5;
    }
    
    .result-item:last-child {
      border-bottom: none;
    }
    
    .result-name {
      font-weight: 600;
      color: #000000;
      margin-bottom: 4px;
    }
    
    .result-details {
      font-size: 14px;
      color: #666;
    }
    
    .result-details span {
      margin-right: 16px;
    }
    
    .no-results {
      padding: 20px;
      text-align: center;
      color: #666;
    }
    
    .loading {
      padding: 20px;
      text-align: center;
      color: #666;
    }
    
    .instructions {
      margin-top: 30px;
      padding: 20px;
      background: #f8f8f8;
      border-radius: 8px;
      color: #666;
      font-size: 14px;
      border: 1px solid #eee;
    }
    
    .instructions h3 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px;
      color: #000000;
      margin-top: 0;
      letter-spacing: 1px;
    }
    
    .selected-member {
      margin-top: 30px;
      padding: 20px;
      background: #ffffff;
      border-radius: 8px;
      border: 2px solid #000000;
    }
    
    .selected-member h3 {
      font-family: 'Bebas Neue', sans-serif;
      font-size: 20px;
      color: #000000;
      margin-top: 0;
      margin-bottom: 15px;
      letter-spacing: 1px;
    }
    
    .member-info {
      padding: 15px;
      background: #f8f8f8;
      border-radius: 6px;
      margin-bottom: 20px;
    }
    
    .member-info p {
      margin: 5px 0;
      color: #000000;
    }
    
    .member-info .name {
      font-weight: 600;
      font-size: 18px;
    }
    
    .action-buttons {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }
    
    .btn {
      padding: 14px 24px;
      font-size: 16px;
      font-weight: 600;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }
    
    .btn-primary {
      background: #000000;
      color: #ffffff;
    }
    
    .btn-primary:hover {
      background: #333333;
    }
    
    .btn-secondary {
      background: #000000;
      color: #ffffff;
    }
    
    .btn-secondary:hover {
      background: #333333;
    }
    
    .btn-outline {
      background: #ffffff;
      color: #000000;
      border: 2px solid #000000;
    }
    
    .btn-outline:hover {
      background: #000000;
      color: #ffffff;
    }
    
    .manual-entry {
      margin-top: 20px;
      text-align: center;
    }
  </style>
</head>
<body>
  <h1>DAY ONE / REFERRAL MEMBER LOOKUP</h1>
  <p class="subtitle">${clubName} Location</p>
  
  <div class="search-container">
    <input 
      type="text" 
      id="searchInput" 
      placeholder="Search by name, email, or phone..."
      autocomplete="off"
    >
    <div id="results"></div>
  </div>

  <div id="selectedMember" class="selected-member" style="display: none;">
    <h3>SELECTED MEMBER</h3>
    <div id="memberInfo" class="member-info"></div>
    <div class="action-buttons">
      <button class="btn btn-primary" onclick="openReferralForm()">
        📋 Referral Form
      </button>
      <button class="btn btn-secondary" onclick="openDayOneForm()">
        📅 Book Day One
      </button>
    </div>
  </div>

  <div class="manual-entry">
    <button class="btn btn-outline" onclick="openManualEntry()">
      ✏️ Manual Entry (Member not in system)
    </button>
  </div>

  <div class="instructions">
    <h3>HOW TO USE</h3>
    <p>1. Start typing a member's name, email, or phone number</p>
    <p>2. Click on the member from the results</p>
    <p>3. Choose to open the Referral Form or Book Day One</p>
    <p>4. Use Manual Entry if the member isn't in the system yet</p>
  </div>

  <script>
    const SLUG = '${slug}';
    let referralFormUrl = '';
    let dayOneFormUrl = '';
    let manualEntryUrl = '';
    let selectedContact = null;
    let debounceTimer;
    
    // Get config on load
    fetch('/api/' + SLUG + '/config')
      .then(res => res.json())
      .then(config => {
        referralFormUrl = config.referralFormUrl || '';
        dayOneFormUrl = config.dayOneFormUrl || '';
        manualEntryUrl = config.manualEntryUrl || '';
      });
    
    const searchInput = document.getElementById('searchInput');
    const resultsDiv = document.getElementById('results');
    const selectedMemberDiv = document.getElementById('selectedMember');
    const memberInfoDiv = document.getElementById('memberInfo');
    
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();
      
      clearTimeout(debounceTimer);
      selectedMemberDiv.style.display = 'none';
      
      if (query.length < 2) {
        resultsDiv.classList.remove('show');
        return;
      }
      
      resultsDiv.innerHTML = '<div class="loading">Searching...</div>';
      resultsDiv.classList.add('show');
      
      debounceTimer = setTimeout(() => {
        searchContacts(query);
      }, 300);
    });
    
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.search-container')) {
        resultsDiv.classList.remove('show');
      }
    });
    
    searchInput.addEventListener('focus', () => {
      if (searchInput.value.trim().length >= 2 && resultsDiv.innerHTML) {
        resultsDiv.classList.add('show');
      }
    });
    
    async function searchContacts(query) {
      try {
        const response = await fetch('/api/' + SLUG + '/search?query=' + encodeURIComponent(query));
        const data = await response.json();
        
        if (data.contacts && data.contacts.length > 0) {
          resultsDiv.innerHTML = data.contacts.map(contact => 
            '<div class="result-item" onclick=\\'selectContact(' + JSON.stringify(contact).replace(/'/g, "\\\\'") + ')\\'>'+
              '<div class="result-name">' + escapeHtml(contact.name || 'No Name') + '</div>' +
              '<div class="result-details">' +
                (contact.email ? '<span>📧 ' + escapeHtml(contact.email) + '</span>' : '') +
                (contact.phone ? '<span>📱 ' + escapeHtml(contact.phone) + '</span>' : '') +
              '</div>' +
            '</div>'
          ).join('');
        } else {
          resultsDiv.innerHTML = '<div class="no-results">No members found</div>';
        }
        
        resultsDiv.classList.add('show');
      } catch (error) {
        console.error('Search error:', error);
        resultsDiv.innerHTML = '<div class="no-results">Search failed. Please try again.</div>';
      }
    }
    
    function selectContact(contact) {
      selectedContact = contact;
      
      memberInfoDiv.innerHTML = 
        '<p class="name">' + escapeHtml(contact.name || 'No Name') + '</p>' +
        (contact.email ? '<p>📧 ' + escapeHtml(contact.email) + '</p>' : '') +
        (contact.phone ? '<p>📱 ' + escapeHtml(contact.phone) + '</p>' : '');
      
      selectedMemberDiv.style.display = 'block';
      searchInput.value = '';
      resultsDiv.classList.remove('show');
    }
    
    function buildFormUrl(baseUrl, contact) {
      if (!baseUrl) {
        alert('Form URL not configured for this location');
        return null;
      }
      
      const params = new URLSearchParams();
      if (contact.firstName) params.set('first_name', contact.firstName);
      if (contact.lastName) params.set('last_name', contact.lastName);
      if (contact.email) params.set('email', contact.email);
      if (contact.phone) params.set('phone', contact.phone);
      
      return baseUrl + '?' + params.toString();
    }
    
    function openReferralForm() {
      if (!selectedContact) return;
      const url = buildFormUrl(referralFormUrl, selectedContact);
      if (url) window.open(url, '_blank');
    }
    
    function openDayOneForm() {
      if (!selectedContact) return;
      if (!dayOneFormUrl) {
        alert('Day One form URL not configured yet for this location');
        return;
      }
      const url = buildFormUrl(dayOneFormUrl, selectedContact);
      if (url) window.open(url, '_blank');
    }
    
    function openManualEntry() {
      if (!manualEntryUrl) {
        alert('Manual entry form URL not configured yet for this location');
        return;
      }
      window.open(manualEntryUrl, '_blank');
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
  </script>
</body>
</html>`;
}

app.listen(PORT, () => {
  console.log('🔍 Member Referral Lookup Server');
  console.log('📍 Running on http://localhost:' + PORT);
  console.log('');
  console.log('Available locations:');
  Object.values(clubsBySlug).forEach(club => {
    console.log('   /' + club.slug + ' - ' + club.clubName);
  });
});
