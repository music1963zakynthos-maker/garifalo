const firebaseConfig = {
  apiKey: "AIzaSyCcKzw7KbEcayXoxsAKqpTumd2kazBsgEQ",
  authDomain: "radiochatlive-43be4.firebaseapp.com",
  databaseURL: "https://radiochatlive-43be4-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "radiochatlive-43be4",
  storageBucket: "radiochatlive-43be4.firebasestorage.app",
  messagingSenderId: "883430401617",
  appId: "1:883430401617:web:7963ac1ff4481bfb3c3a70"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

var currentUser = '';
var currentUid = '';
var currentSessionId = '';
var onlineUsers = {};
var userAvatars = {};
var isAdmin = false;
var currentPrivateChat = null;
var currentPrivateChatName = null;
var pendingPrivateNotif = null;
var bannedUsersList = [];
var pendingBanUsername = null;
var isPlayerOpen = false;
var isPlayerLoaded = false;
var isAvatarUploading = false;
var connectTime = 0;
var unreadPrivateMessages = {}; 

// Video Call Variables
var localPeer = null;
var currentCall = null;
var localStream = null;
var peerReady = false;
var isUserBusy = false;
var activeCallPartnerUid = null;
window.pendingIncomingCall = null;
window.callWasRejected = false;

if (!localStorage.getItem('chat_device_unique_id')) { 
  var fixedId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now(); 
  localStorage.setItem('chat_device_unique_id', fixedId); 
}
currentSessionId = localStorage.getItem('chat_device_unique_id');

function showLoginError(message) {
  var err = document.getElementById('err');
  var loginBox = document.getElementById('loginBox');
  err.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg> <span>${message}</span>`;
  err.style.display = 'flex';
  loginBox.classList.remove('shake');
  void loginBox.offsetWidth;
  loginBox.classList.add('shake');
  setTimeout(() => { loginBox.classList.remove('shake'); }, 500);
}

function ensureAdminOnline() {
  if (currentUser && isAdmin) {
    var avatarData = userAvatars[currentUid] || localStorage.getItem('user_avatar_' + currentUid) || null;
    db.ref('users/' + currentUid).update({ avatar: avatarData });
  }
}

function togglePlayer() { if (isPlayerOpen) closePlayer(); else openPlayer(); }
function openPlayer() { 
  if (!isPlayerLoaded) { document.getElementById('playerIframe').src = '../diplo-player.html'; isPlayerLoaded = true; } 
  document.getElementById('playerPanel').classList.add('show'); isPlayerOpen = true; 
  document.getElementById('radioBtn').classList.add('playing'); 
}
function closePlayer() { 
  document.getElementById('playerPanel').classList.remove('show'); isPlayerOpen = false; 
  if (isPlayerLoaded) document.getElementById('radioBtn').classList.remove('playing'); 
}
function disconnectPlayer() { 
  document.getElementById('playerPanel').classList.remove('show'); document.getElementById('playerIframe').src = ''; 
  isPlayerOpen = false; isPlayerLoaded = false; document.getElementById('radioBtn').classList.remove('playing'); 
}
function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); document.getElementById('sidebarOverlay').classList.toggle('show'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('sidebarOverlay').classList.remove('show'); }

var notificationSound = new Audio('https://cdn.pixabay.com/audio/2024/02/08/audio_b7f03fb030.mp3');
var soundVolume = 1.0;
var soundStates = [{ volume: 1.0, icon: '🔊' }, { volume: 0.3, icon: '🔉' }, { volume: 0, icon: '🔇' }];
var currentSoundState = 0;

function loadSoundSettings() { 
  var saved = localStorage.getItem('chat_sound_volume'); 
  if (saved !== null) { currentSoundState = parseInt(saved); soundVolume = soundStates[currentSoundState].volume; notificationSound.volume = soundVolume; updateSoundButton(); } 
}
function updateSoundButton() { document.getElementById('soundBtn').textContent = soundStates[currentSoundState].icon; }
function toggleSound() { 
  currentSoundState = (currentSoundState + 1) % soundStates.length; soundVolume = soundStates[currentSoundState].volume; 
  notificationSound.volume = soundVolume; localStorage.setItem('chat_sound_volume', currentSoundState); updateSoundButton(); 
}
function playNotificationSound() { if (soundVolume > 0) { notificationSound.currentTime = 0; notificationSound.play().catch(e => {}); } }

var emojiCategories = {
    smileys: ['😀','😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🥸','🥳','😏','😒','😞','😔','😟','😕','🙁','😖','😫','😩','🥺','😭','😤','😠','😡','🤬','😳','🥶','😨','😰','😥','😓','🤗','🤔','🤫','😶','😐','😑','😬','🙄','😯','😧','😮','😲','😴','🤤','😵','🤐','🥴','🤮','🤧','😷','🤒','🤕','🤑','🤠','😈','👿','💩','💀','☠️','👽','🤖','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊'],
    animals: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🙈','🙉','🙊','🐔','🐧','🐦','🐤','🐣','🦆','🦅','🦉','🦇','🐺','🦄','🐝','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🐍','🦎','🦖','🦕','🐙','🦑','🦐','🦞','🦀','🐡','🐠','🐟','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐈','🐓','🦃','🦚','🦜','🦢','🦩','🕊️','🐇','🦝','🦨','🦡','🦦','🦥','🐁','🐀','🐿️','🦔','🐾','🐉','🐲'],
    food: ['🍏','🍎','🍐','🍊','🍋','🍌','🍉','🍇','🍓','🫐','🍈','🍒','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥬','🥒','🌶️','🫑','🌽','🥕','🫒','🧄','🧅','🥔','🍠','🥐','🥖','🍞','🥖','🥨','🧀','🥚','🍳','🧈','🥞','🧇','🥓','🌭','🍔','🍟','🍕','🫓','🥙','🌮','🌯','🫔','🥗','🥘','🫕','🥫','🍝','🍜','🍲','🍛','🍣','🍱','🥟','🦪','🍤','🍙','🍘','🍥','🥠','🥮','🍢','🍡','🍧','🍨','🍦','🥧','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰','🥜','🍯','🥛','🫗','🍼','🫖','☕','🍵','🧃','🥤','🧋','🍶','🍺','🍻','🥂','🍷','🥃','🍸','🍹','🧉','🍾','🧊','🥄','🍴','🍽️','🥣','🥡','🥢','🧂'],
    activities: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🥏','🎱','🪀','🏓','🏸','🏒','🏑','🥍','🏏','🪃','🥅','⛳','🪁','🏹','🎣','🤿','🥊','🥋','🎽','🛹','🛼','🛷','⛸️','🥌','🎿','⛷️','🏂','🪂','🏋️','🤼','🤸','⛹️','🤺','🤾','🏌️','🏇','🧘','🏄','🏊','🤽','🚣','🧗','🚵','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🏵️','🎗️','🎫','🎟️','🎪','🤹','🎭','🩰','🎨','🎬','🎤','🎧','🎼','🎹','🥁','🪘','🎷','🎺','🪗','🎸','🪕','🎻','🎲','♟️','🎯','🎳','🎮','🎰','🧩'],
    travel: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','🚐','🛻','🚚','🚛','🚜','🏍️','🛵','🚲','🛴','🛺','🚨','🚔','🚍','🚖','🚘','🚡','🚠','🚟','🚃','🚋','🚞','🚝','🚄','🚅','🚈','🚇','🚆','🚉','✈️','🛫','🛬','🛩️','💺','🛰️','🚀','🛸','🚁','🛶','⛵','🚤','🛥️','🛳️','⛴️','🚢','⚓','🪝','⛽','🚧','🚦','🚥','🗺️','🗿','🗽','🗼','🏰','🏯','🏟️','🎡','🎢','🎠','⛲','⛱️','🏖️','🏝️','🏜️','🌋','⛰️','🏔️','🗻','🏕️','⛺','🛖','🏠','🏡','🏘️','🏚️','🏗️','🏭','🏢','🏬','🏣','🏤','🏥','🏦','🏨','🏪','🏫','🏩','💒','🏛️','⛪','🕌','🕍','🛕','🕋','⛩️','🛤️','🛣️','🗾','🎑','🏞️','🌅','🌄','🌠','🎇','🎆','🌇','🌆','🏙️','🌃','🌌','🌉','🌁'],
    objects: ['⌚','📱','📲','💻','⌨️','🖥️','🖨️','🖱️','🖲️','🕹️','🗜️','💽','💾','💿','📀','📼','📷','📸','📹','🎥','📽️','🎞️','📞','☎️','📟','📠','📺','📻','🎙️','🎚️','🎛️','🧭','⏱️','⏲️','⏰','🕰️','⌛','⏳','📡','🔋','🔌','💡','🔦','🕯️','🪔','🧯','🛢️','💸','💵','💴','💶','💷','🪙','💰','💳','💎','⚖️','🪜','🧰','🪛','🔧','🔨','⚒️','🛠️','⛏️','🪚','🔩','⚙️','🪤','🧱','⛓️','🧲','🔫','💣','🧨','🪓','🔪','🗡️','⚔️','🛡️','🚬','⚰️','🪦','⚱️','🏺','🔮','📿','🧿','💈','⚗️','🔭','🔬','🕳️','🩹','🩺','💊','💉','🩸','🧬','🦠','🧫','🧪','🌡️','🧹','🪠','🧺','🧻','🚽','🚰','🚿','🛁','🛀','🧼','🪥','🪒','🧽','🪣','🧴','🛎️','🔑','🗝️','🚪','🪑','🛋️','🛏️','🛌','🧸','🪆','🖼️','🪞','🪟','🛍️','🛒','🎁','🎈','🎏','🎀','🪄','🪅','🎊','🎉','🎎','🏮','🎐','🧧','✉️','📩','📨','📧','💌','📥','📤','📦','🏷️','🪧','📪','📫','📬','📭','📮','📯','📜','📃','📄','📑','🧾','📊','📈','📉','🗒️','🗓️','📆','📅','🗑️','📇','🗃️','🗳️','🗄️','📋','📁','📂','🗂️','🗞️','📰','📓','📔','📒','📕','📗','📘','📙','📚','📖','🔖','🧷','🔗','📎','🖇️','📐','📏','🧮','📌','📍','✂️','🖊️','🖋️','✒️','🖌️','🖍️','📝','✏️','🔍','🔎','🔏','🔐','🔒','🔓'],
    symbols: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','☮️','✝️','☪️','🕉️','☸️','✡️','🔯','🕎','☯️','☦️','🛐','⛎','♈','♉','♊','♋','♌','♍','♎','♏','♐','♑','♒','♓','🆔','⚛️','🉑','☢️','☣️','📴','📳','🈶','🈚','🈸','🈺','🈷️','✴️','🆚','💮','🉐','㊙️','㊗️','🈴','🈵','🈹','🈲','🅰️','🅱️','🆎','🆑','🅾️','🆘','❌','⭕','🛑','⛔','📛','🚫','💯','💢','♨️','🚷','🚯','🚳','🚱','🔞','📵','🚭','❗','❕','❓','❔','‼️','⁉️','🔅','🔆','〽️','⚠️','🚸','🔱','⚜️','🔰','♻️','✅','🈯','💹','❇️','✳️','❎','🌐','💠','Ⓜ️','🌀','💤','🏧','🚾','♿','🅿️','🛗','🈳','🈂️','🛂','🛃','🛄','🛅','🚹','🚺','🚼','⚧️','🚻','🚮','🎦','📶','🈁','🔣','ℹ️','🔤','🔡','🔠','🆖','🆗','🆙','🆒','🆕','🆓','0️⃣','1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟','🔢','#️⃣','*️⃣','⏏️','▶️','⏸️','⏯️','⏹️','⏺️','⏭️','⏮️','⏩','⏪','⏫','⏬','◀️','🔼','🔽','➡️','⬅️','⬆️','⬇️','↗️','↘️','↙️','↖️','↕️','↔️','↪️','↩️','⤴️','⤵️','🔀','🔁','🔂','🔄','🔃','🎵','🎶','➕','➖','➗','✖️','♾️','💲','💱','™️','©️','®️','👁️‍🗨️','🔚','🔙','🔛','🔝','🔜','〰️','➰','➿','✔️','☑️','🔘','🔴','🟠','🟡','🟢','🔵','🟣','⚫','⚪','🟤','🔺','🔻','🔸','🔹','🔶','🔷','🔳','🔲','▪️','▫️','◾','◽','◼️','◻️','🟥','🟧','🟨','🟩','🟦','🟪','⬛','⬜','🟫','🔈','🔇','🔉','🔊','🔔','🔕','📣','📢','👁️‍🗨️','💬','💭','🗯️','♠️','♣️','♥️','♦️','🃏','🎴','🀄','🕐','🕑','🕒','🕓','🕔','🕕','🕖','🕗','🕘','🕙','🕚','🕛']
};

Object.keys(emojiCategories).forEach(category => { 
  var container = document.getElementById(category); 
  if(!container) return;
  emojiCategories[category].forEach(emoji => { 
    var span = document.createElement('span'); span.className = 'emoji'; span.textContent = emoji; 
    span.onclick = function() { document.getElementById('msgInput').value += emoji; document.getElementById('msgInput').focus(); }; 
    container.appendChild(span); 
  }); 
});
document.querySelectorAll('.emoji-tab').forEach(tab => { 
  tab.addEventListener('click', function() { 
    document.querySelectorAll('.emoji-tab').forEach(t => t.classList.remove('active')); 
    document.querySelectorAll('.emoji-category').forEach(c => c.classList.remove('active')); 
    this.classList.add('active'); document.getElementById(this.dataset.category).classList.add('active'); 
  }); 
});

function toggleBgControls() { 
  document.getElementById('bgControlsPanel').classList.toggle('show'); 
  document.getElementById('bannedPanel').classList.remove('show'); 
  document.getElementById('emojiPanel').classList.remove('show');
  document.getElementById('videoPermPanel').classList.remove('show');
}
function updateBackground() { 
  var posX = document.getElementById('bgPositionX').value; var brightness = document.getElementById('bgBrightness').value; 
  var blur = document.getElementById('bgBlur').value; var overlay = document.getElementById('bgOverlay').value; 
  document.getElementById('bgContainer').style.backgroundPosition = posX + '% center'; 
  document.getElementById('bgContainer').style.filter = 'brightness(' + brightness + '%) blur(' + blur + 'px)'; 
  document.querySelector('.bg-overlay').style.background = 'rgba(15, 15, 30, ' + (overlay / 100) + ')'; 
  document.getElementById('posValue').textContent = posX + '%'; document.getElementById('brightValue').textContent = brightness + '%'; 
  document.getElementById('blurValue').textContent = blur + 'px'; document.getElementById('overlayValue').textContent = overlay + '%'; 
  localStorage.setItem('bg_settings', JSON.stringify({ posX, brightness, blur, overlay })); 
}
function loadBgSettings() { 
  var saved = localStorage.getItem('bg_settings'); 
  if (saved) { 
    var s = JSON.parse(saved); document.getElementById('bgPositionX').value = s.posX || 50; 
    document.getElementById('bgBrightness').value = s.brightness || 100; document.getElementById('bgBlur').value = s.blur || 0; 
    document.getElementById('bgOverlay').value = s.overlay || 70; updateBackground(); 
  } 
}

async function uploadToImgur(file) {
  const formData = new FormData(); formData.append("image", file);
  const response = await fetch("https://api.imgur.com/3/image", { method: "POST", headers: { Authorization: "Client-ID 546c25a59c58ad7" }, body: formData });
  const result = await response.json();
  if (result.success) { return { link: result.data.link, deletehash: result.data.deletehash }; } 
  else { throw new Error("Αποτυχία ανεβάσματος"); }
}

async function checkIfBanned(username) { 
  return new Promise((resolve) => { db.ref('banned_users/' + username.toLowerCase()).once('value', (snap) => { resolve(snap.exists()); }); }); 
}
async function banUser(username) { 
  pendingBanUsername = username; document.getElementById('banTypeText').textContent = `Θέλεις να μπανάρεις τον "${username}";`; 
  document.getElementById('banTypeOverlay').classList.add('show'); 
}
async function confirmBan() { 
  if (!pendingBanUsername) return; document.getElementById('banTypeOverlay').classList.remove('show'); 
  var username = pendingBanUsername; pendingBanUsername = null; 
  try { 
    db.ref('banned_users/' + username.toLowerCase()).set({ banned_by: currentUser, ban_type: 'username', banned_at: Date.now() }); 
    alert('🚫 Banned!'); loadBannedUsers(); ensureAdminOnline();
  } catch(e) { alert('Σφάλμα: ' + e.message); } 
}
function cancelBan() { pendingBanUsername = null; document.getElementById('banTypeOverlay').classList.remove('show'); }
async function unbanUser(username) { 
  if (!confirm('Αφαίρεση ban;')) return; 
  try { db.ref('banned_users/' + username.toLowerCase()).remove(); alert('✅ Αφαιρέθηκε!'); loadBannedUsers(); renderBannedUsersPanel(); ensureAdminOnline(); } 
  catch(e) { alert('Σφάλμα: ' + e.message); } 
}
async function loadBannedUsers() { 
  return new Promise((resolve) => { db.ref('banned_users').once('value', (snap) => { bannedUsersList = []; snap.forEach(child => { bannedUsersList.push({ username: child.key, ...child.val() }); }); resolve(); }); }); 
}
function renderBannedUsersPanel() { 
  var list = document.getElementById('bannedUsersList'); list.innerHTML = ''; 
  if (bannedUsersList.length === 0) { list.innerHTML = '<div class="no-banned">Δεν υπάρχουν banned 🎉</div>'; return; } 
  bannedUsersList.forEach(ban => { 
    var div = document.createElement('div'); div.className = 'banned-user-item'; 
    var time = new Date(ban.banned_at).toLocaleString('el'); 
    div.innerHTML = `<div class="banned-user-info"><div class="banned-user-name"> ${escapeHtml(ban.username)}</div><div class="banned-user-time">${time}</div></div><button class="unban-btn" onclick="unbanUser(this.dataset.user)" data-user="${escapeHtml(ban.username)}">Unban</button>`; 
    list.appendChild(div); 
  }); 
}
function toggleBannedPanel() { 
  var panel = document.getElementById('bannedPanel'); panel.classList.toggle('show'); 
  document.getElementById('bgControlsPanel').classList.remove('show'); document.getElementById('emojiPanel').classList.remove('show'); document.getElementById('videoPermPanel').classList.remove('show');
  if (panel.classList.contains('show')) { loadBannedUsers().then(() => renderBannedUsersPanel()); } 
}

function toggleVideoPermPanel() {
  var panel = document.getElementById('videoPermPanel');
  panel.classList.toggle('show');
  document.getElementById('bgControlsPanel').classList.remove('show');
  document.getElementById('bannedPanel').classList.remove('show');
  document.getElementById('emojiPanel').classList.remove('show');
  if (panel.classList.contains('show')) { loadVideoPermissions(); }
}

async function loadVideoPermissions() {
  var list = document.getElementById('videoPermUsersList');
  list.innerHTML = '<div class="no-perm-users">Φόρτωση...</div>';
  try {
    var snap = await db.ref('registered_users').orderByChild('username').once('value');
    list.innerHTML = '';
    if (snap.exists()) {
      snap.forEach(child => {
        var user = child.val();
        var uid = child.key;
        var div = document.createElement('div');
        div.className = 'perm-user-item';
        var isChecked = (user.can_video_call === true || user.can_video_call === 'true' || user.can_video_call === 'True' || user.can_video_call === undefined);
        div.innerHTML = `<div class="perm-user-info"><div class="perm-user-name">${escapeHtml(user.username)}</div></div>` +
          `<label class="toggle-switch"><input type="checkbox" ${isChecked ? 'checked' : ''} onchange="updateVideoPermission('${escapeHtml(uid)}', this.checked)"><span class="slider"></span></label>`;
        list.appendChild(div);
      });
    } else {
      list.innerHTML = '<div class="no-perm-users">Δεν βρέθηκαν χρήστες</div>';
    }
  } catch(e) {
    list.innerHTML = '<div class="no-perm-users">Σφάλμα φόρτωσης</div>';
  }
}

async function updateVideoPermission(uid, isChecked) {
  try {
    await db.ref('registered_users/' + uid).update({ can_video_call: isChecked });
  } catch (err) {
    alert("❌ ΣΦΑΛΜΑ: " + err.message);
  }
}

function handleBannedWhileOnline() { 
  document.getElementById('banNotifOverlay').classList.add('show'); 
  setTimeout(async () => { 
    try { 
      db.ref('users/' + currentUid).remove(); localStorage.removeItem('chat_uid'); localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password');
      currentUser = ''; currentUid = ''; isAdmin = false; document.getElementById('chatApp').style.display = 'none'; 
      document.getElementById('banNotifOverlay').classList.remove('show'); document.getElementById('loginDiv').style.display = 'flex'; 
    } catch(e) {} 
  }, 3000); 
}
function subscribeToBans() { 
  db.ref('banned_users').on('child_added', (snap) => { if (snap.key.toLowerCase() === currentUser.toLowerCase()) { handleBannedWhileOnline(); } }); 
  db.ref('banned_users').on('child_removed', () => { if (isAdmin && document.getElementById('bannedPanel').classList.contains('show')) { loadBannedUsers().then(() => renderBannedUsersPanel()); } }); 
}

async function handleAvatarUpload(event) {
  var file = event.target.files[0]; if (!file) return;
  if (isAvatarUploading) { alert('⏳ Περιμένετε!'); event.target.value = ''; return; }
  if (file.size > 20 * 1024 * 1024) { alert('Max 20MB!'); event.target.value = ''; return; }
  isAvatarUploading = true;
  var userItems = document.querySelectorAll('.user-item'); var userAvatarEl = null;
  userItems.forEach(item => { var nameEl = item.querySelector('.user-name'); if (nameEl && nameEl.textContent === currentUser) { userAvatarEl = item.querySelector('.avatar'); } });
  var originalAvatarHTML = userAvatarEl ? userAvatarEl.innerHTML : '';
  if (userAvatarEl) { userAvatarEl.classList.add('loading'); userAvatarEl.innerHTML = '<div class="avatar-spinner"></div>'; }
  try {
    var uploadResult = await uploadToImgur(file);
    userAvatars[currentUid] = uploadResult.link;
    localStorage.setItem('user_avatar_' + currentUid, uploadResult.link);
    db.ref('registered_users/' + currentUid + '/avatar').set(uploadResult.link);
    db.ref('users/' + currentUid).update({ avatar: uploadResult.link });
    updateUserList(); alert('✅ Η φωτογραφία σου ενημερώθηκε!');
  } catch(err) { 
    alert('Σφάλμα: ' + err.message); if (userAvatarEl) { userAvatarEl.classList.remove('loading'); userAvatarEl.innerHTML = originalAvatarHTML; } 
  } finally { isAvatarUploading = false; event.target.value = ''; }
}

window.addEventListener('load', async function() { 
  loadBgSettings(); loadSoundSettings(); 
  var savedUser = localStorage.getItem('chat_username'); var savedPass = localStorage.getItem('chat_password');
  if (savedUser && savedPass) { document.getElementById('userIn').value = savedUser; document.getElementById('passIn').value = savedPass; setTimeout(() => goChat(true), 300); } 
});

function escapeHtml(text) { var div = document.createElement('div'); div.textContent = text; return div.innerHTML.replace(/'/g, '&#39;').replace(/"/g, '&quot;'); }
function linkify(text) { 
  var urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g; 
  return text.replace(urlRegex, function(url) { 
    var fullUrl = url.startsWith('http') ? url : 'https://' + url; 
    return '<a href="' + fullUrl + '" target="_blank" style="color: #60a5fa; text-decoration: underline; word-break: break-all;">' + url + '</a>'; 
  }); 
}
function getAvatarHtml(username, uid) { 
  var avatarUrl = userAvatars[uid] || localStorage.getItem('user_avatar_' + uid); 
  var isAdminUser = username.toLowerCase() === 'sakis';
  var avatarClass = isAdminUser ? 'msg-avatar admin-avatar' : 'msg-avatar';
  if (avatarUrl) { return `<div class="${avatarClass}"><img src="${avatarUrl}" alt="${escapeHtml(username)}"></div>`; } 
  return `<div class="${avatarClass}">${username.charAt(0).toUpperCase()}</div>`; 
}

async function loadMessages() { 
  var container = document.getElementById('msgContainer'); container.innerHTML = '';
  db.ref('messages').limitToLast(50).once('value', (snap) => {
    snap.forEach(child => { var msg = child.val(); msg._id = child.key; addMessageToUI(msg, false); });
    setTimeout(() => { container.scrollTop = container.scrollHeight; }, 100);
  });
}
async function loadPrivateMessages(otherUid, otherName) { 
  var container = document.getElementById('msgContainer'); container.innerHTML = ''; 
  var chatId = [currentUid, otherUid].sort().join('_');
  db.ref('private_messages/' + chatId).limitToLast(200).once('value', (snap) => {
    snap.forEach(child => { var msg = child.val(); msg._id = child.key; addMessageToUI(msg, true); });
    container.scrollTop = container.scrollHeight;
    db.ref('private_messages/' + chatId).orderByChild('receiverUid').equalTo(currentUid).once('value', (snap) => { 
      snap.forEach(child => { if (!child.val().is_read) { child.ref.update({ is_read: true }); } }); 
    });
  });
}

function addMessageToUI(msg, isPrivate) {
  var container = document.getElementById('msgContainer');
  if (msg._id) { var existingMsg = container.querySelector(`.msg[data-msg-id="${msg._id}"]`); if (existingMsg) return; }
  
  var msgText = msg.message || msg.text || "";
  if (msgText === '[📞 CALL_REJECTED]' || msgText === '[📞 CALL_CANCELLED]' || msgText === '[📞 CALL_BUSY]') {
    return;
  }

  var div = document.createElement('div');
  var senderName = msg.userName || msg.senderName || msg.user || msg.sender || "Άγνωστος";
  var senderUid = msg.userId || msg.senderUid || "unknown";
  var text = msg.text || msg.message || "";
  var img = msg.image || msg.image_data || null;
  var msgId = msg._id;
  var deletehash = msg.imageDeletehash || null;
  var isOwn = (senderUid === currentUid);
  div.className = 'msg' + (isOwn ? ' own' : '') + (isPrivate ? ' private' : '');
  if (msgId) { div.setAttribute('data-msg-id', msgId); }
  var avatarHtml = getAvatarHtml(senderName, senderUid);
  var time = new Date(msg.timestamp || Date.now()).toLocaleTimeString('el', { hour: '2-digit', minute: '2-digit' });
  var deleteButtonHtml = '';
  if (img && isAdmin && deletehash && msgId) {
    var firebasePath = isPrivate ? 'private_messages/' + [msg.senderUid, msg.receiverUid].sort().join('_') + '/' + msgId : 'messages/' + msgId;
    var safePath = firebasePath.replace(/'/g, "\\'");
    var safeDeletehash = deletehash.replace(/'/g, "\\'");
    deleteButtonHtml = `<button class="delete-image-btn" onclick="deleteImage('${safePath}', '${safeDeletehash}', this)">🗑️ Διαγραφή</button>`;
  }
  var contentHtml = '';
  if (img) {
    contentHtml = `<div class="text"><img src="${img}" style="max-width:150px; border-radius:12px; display:block; margin:6px 0; cursor: pointer;" onclick="openImagePreview(this.src)">${deleteButtonHtml}</div>`;
  } else if (msg.audioUrl) {
    contentHtml = `<div class="text"><div class="msg-audio-wrapper"><audio controls src="${msg.audioUrl}" preload="none"></audio></div></div>`;
  } else {
    contentHtml = `<div class="text">${linkify(escapeHtml(text))}</div>`;
  }
  div.innerHTML = `${avatarHtml}<div class="msg-content"><div class="user">${escapeHtml(senderName)}</div>${contentHtml}<div class="time">${time}</div></div>`;
  container.appendChild(div);
  requestAnimationFrame(() => { container.scrollTop = container.scrollHeight; });
}

async function deleteImage(firebasePath, deletehash, buttonElement) {
  if (!confirm('⚠️ Διαγραφή ΤΕΛΕΙΩΣ από παντού;')) return;
  buttonElement.disabled = true; buttonElement.textContent = '⏳ Διαγραφή...';
  try {
    await fetch(`https://api.imgur.com/3/image/${deletehash}`, { method: "DELETE", headers: { "Authorization": "Client-ID 546c25a59c58ad7" } });
    await db.ref(firebasePath).remove();
  } catch(e) { alert('Σφάλμα: ' + e.message); buttonElement.disabled = false; buttonElement.textContent = '🗑️ Διαγραφή'; }
}

async function sendMsg() { 
  var input = document.getElementById('msgInput'); var text = input.value.trim(); if (!text) return; 
  try { 
    if (currentPrivateChat) { 
      var chatId = [currentUid, currentPrivateChat].sort().join('_'); 
      db.ref('private_messages/' + chatId).push({ senderUid: currentUid, senderName: currentUser, receiverUid: currentPrivateChat, receiverName: currentPrivateChatName, message: text, timestamp: Date.now() }); 
    } else { 
      db.ref('messages').push({ userId: currentUid, userName: currentUser, text: text, timestamp: Date.now() }); 
    } 
    input.value = ''; 
  } catch(e) { alert('Σφάλμα: ' + e.message); } 
}

function toggleEmoji() { 
  document.getElementById('emojiPanel').classList.toggle('show'); 
  document.getElementById('bannedPanel').classList.remove('show'); 
  document.getElementById('bgControlsPanel').classList.remove('show'); 
  document.getElementById('videoPermPanel').classList.remove('show');
}

function showToast(senderName, senderUid) {
  var container = document.getElementById('toastContainer');
  if (!container) return;
  var toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `<div class="toast-icon">💬</div><div class="toast-content"><div class="toast-title">Νέο Ιδιωτικό Μήνυμα</div><div class="toast-message">Από: ${escapeHtml(senderName)}</div></div>`;
  toast.onclick = function() {
    startPrivateChat(senderUid, senderName);
    if (toast.parentNode === container) { container.removeChild(toast); }
  };
  container.appendChild(toast);
  setTimeout(function() { if (toast.parentNode === container) { container.removeChild(toast); } }, 10000);
}

function updateUserList() {
    var list = document.getElementById('userList'); list.innerHTML = '';
    var usersArray = Object.keys(onlineUsers).map(uid => ({ uid: uid, ...onlineUsers[uid] }));
    usersArray.sort((a, b) => a.username.localeCompare(b.username));

    usersArray.forEach(u => {
        var username = u.username;
        var uid = u.uid;
        var div = document.createElement('div'); div.className = 'user-item';
        var initial = username.charAt(0).toUpperCase();
        var isAdminUser = username.toLowerCase() === 'sakis';
        var avatarClass = isAdminUser ? 'avatar admin-avatar' : 'avatar';
        var adminBadge = isAdminUser ? '<span class="admin-badge">👑 ADMIN</span>' : '';
        
        var unreadBadge = unreadPrivateMessages[uid] ? '<span class="unread-badge">' + unreadPrivateMessages[uid] + '</span>' : '';
        
        var avatarHtml = userAvatars[uid]
            ? `<div class="${avatarClass}" onclick="triggerAvatarUpload('${uid}')" data-uid="${uid}"><img src="${userAvatars[uid]}">${uid === currentUid ? '<div class="avatar-upload-hint">📷</div>' : ''}</div>`
            : `<div class="${avatarClass}" onclick="triggerAvatarUpload('${uid}')" data-uid="${uid}">${initial}${uid === currentUid ? '<div class="avatar-upload-hint">📷</div>' : ''}</div>`;
        var lockBtn = ''; var banBtn = '';
        if (uid !== currentUid) {
            lockBtn = `<button class="private-lock-btn" onclick="startPrivateChat('${uid}', '${escapeHtml(username)}')" title="Ιδιωτικό">🔒</button>`;
            if (isAdmin) { banBtn = `<button class="ban-user-btn show" onclick="banUser('${escapeHtml(username)}')" title="Ban">🚫</button>`; }
        }
        div.innerHTML = `${avatarHtml}<div class="user-info"><div class="user-name">${escapeHtml(username)}${adminBadge}${unreadBadge}</div><div class="user-status">Online</div></div>${lockBtn}${banBtn}`;
        list.appendChild(div);
    });
    document.getElementById('onlineNum').textContent = usersArray.length;
    document.getElementById('userNum').textContent = usersArray.length;
}

function triggerAvatarUpload(uid) { if (isAvatarUploading) { alert('⏳ Περιμένετε!'); return; } if (uid === currentUid) document.getElementById('avatarInput').click(); }
function triggerImageUpload() { document.getElementById('imageUploadInput').click(); }

async function startPrivateChat(uid, username) { 
  if (uid === currentUid) return; 
  if (!onlineUsers[uid]) { alert('Ο χρήστης δεν είναι online!'); return; } 
  currentPrivateChat = uid; 
  currentPrivateChatName = username;
  
  if (unreadPrivateMessages[uid]) {
    delete unreadPrivateMessages[uid];
    updateUserList();
  }
  
  document.getElementById('chatMain').classList.add('private-mode'); 
  document.getElementById('privateHeader').classList.add('show'); document.getElementById('mainHeader').style.display = 'none'; 
  document.getElementById('privateWithUser').textContent = username; document.getElementById('msgInput').placeholder = 'Γράψε ιδιωτικό...'; 
  document.getElementById('emojiPanel').classList.remove('show'); 
  if (window.innerWidth <= 768) closeSidebar(); loadPrivateMessages(uid, username); 
}
function closePrivateChat() { 
  currentPrivateChat = null; currentPrivateChatName = null; document.getElementById('chatMain').classList.remove('private-mode'); 
  document.getElementById('privateHeader').classList.remove('show'); document.getElementById('mainHeader').style.display = 'flex'; 
  document.getElementById('msgInput').placeholder = 'Γράψε ένα μήνυμα...'; loadMessages(); 
}

async function handleImageUpload(event) {
  var file = event.target.files[0]; if (!file) return;
  if (!['image/jpeg', 'image/png', 'image/gif'].includes(file.type)) { alert('Μόνο JPG, PNG, GIF!'); event.target.value = ''; return; }
  if (file.size > 20 * 1024 * 1024) { alert('Max 20MB!'); event.target.value = ''; return; }
  var imageBtn = document.getElementById('imageBtn'); var originalHTML = imageBtn.innerHTML;
  imageBtn.innerHTML = '<div class="spinner"></div>'; imageBtn.classList.add('loading');
  try {
    var uploadResult = await uploadToImgur(file); var imageUrl = uploadResult.link; var deletehash = uploadResult.deletehash; var timestamp = Date.now();
    if (currentPrivateChat) {
      var chatId = [currentUid, currentPrivateChat].sort().join('_');
      db.ref('private_messages/' + chatId).push({ senderUid: currentUid, senderName: currentUser, receiverUid: currentPrivateChat, receiverName: currentPrivateChatName, message: '[📸 Εικόνα]', image: imageUrl, imageDeletehash: deletehash, timestamp: timestamp });
    } else {
      db.ref('messages').push({ userId: currentUid, userName: currentUser, text: '[📸 Εικόνα]', image: imageUrl, imageDeletehash: deletehash, timestamp: timestamp });
    }
  } catch(e) { alert('Σφάλμα: ' + e.message); } 
  finally { imageBtn.innerHTML = originalHTML; imageBtn.classList.remove('loading'); event.target.value = ''; }
}

function subscribeToMessages() {
  db.ref('messages').on('value', (snap) => { if (!snap.exists() && !currentPrivateChat) { document.getElementById('msgContainer').innerHTML = ''; } });
  db.ref('messages').on('child_added', (snap) => {
    var msg = snap.val(); msg._id = snap.key;
    if (msg.timestamp && msg.timestamp < connectTime) return;
    if (!currentPrivateChat) { addMessageToUI(msg, false); if (msg.userId !== currentUid) { playNotificationSound(); } }
  });
  db.ref('messages').on('child_removed', (snap) => {
    var removedId = snap.key; if (!currentPrivateChat) { var msgDiv = document.querySelector(`.msg[data-msg-id="${removedId}"]`); if (msgDiv) msgDiv.remove(); }
  });
  
  db.ref('private_messages').on('child_added', (chatSnap) => {
    var chatId = chatSnap.key; if (!chatId.includes(currentUid)) return;
    
    db.ref('private_messages/' + chatId).on('value', (snap) => {
      if (!snap.exists() && currentPrivateChat) {
        var currentChatId = [currentUid, currentPrivateChat].sort().join('_');
        if (chatId === currentChatId) { document.getElementById('msgContainer').innerHTML = ''; }
      }
    });
    
    db.ref('private_messages/' + chatId).on('child_added', (msgSnap) => {
      var msg = msgSnap.val(); msg._id = msgSnap.key;
      if (msg.timestamp && msg.timestamp < connectTime) return;
      
      var msgText = msg.message || msg.text || '';
      
      if (msgText === '[📞 CALL_REJECTED]' || msgText === '[📞 CALL_CANCELLED]' || msgText === '[📞 CALL_BUSY]') {
        var isForMe = (msg.receiverUid === currentUid) || String(msg.receiverUid).startsWith(currentUid + '_') || currentUid.startsWith(String(msg.receiverUid) + '_');
        if (isForMe) {
          var isFromTarget = activeCallPartnerUid && (msg.senderUid === activeCallPartnerUid || String(msg.senderUid).startsWith(activeCallPartnerUid + '_') || activeCallPartnerUid.startsWith(String(msg.senderUid) + '_'));
          var isFromPendingCaller = window.pendingIncomingCall && (msg.senderUid === window.pendingIncomingCall.callerUid || String(msg.senderUid).startsWith(window.pendingIncomingCall.callerUid + '_') || window.pendingIncomingCall.callerUid.startsWith(String(msg.senderUid) + '_'));

          if (msgText === '[📞 CALL_REJECTED]' && isFromTarget) {
            window.callWasRejected = true;
            if (currentCall) { try { currentCall.close(); } catch(e){} }
            document.getElementById('videoCallStatus').textContent = '❌ Η κήση απορρίφθηκε';
            setTimeout(function() { endVideoCall(); }, 1800);
          }
          if (msgText === '[📞 CALL_CANCELLED]' && isFromPendingCaller) {
            var incomingOverlay = document.getElementById('incomingCallOverlay');
            if (incomingOverlay) incomingOverlay.remove();
            window.pendingIncomingCall = null;
            isUserBusy = false;
            activeCallPartnerUid = null;
          }
          if (msgText === '[📞 CALL_BUSY]' && isFromTarget) {
            window.callWasRejected = true;
            if (currentCall) { try { currentCall.close(); } catch(e){} }
            var statusEl = document.getElementById('videoCallStatus');
            if (statusEl) { statusEl.textContent = '🚫 Ο χρήστης είναι απασχολημένος'; }
            setTimeout(function() { endVideoCall(); }, 900);
          }
        }
        return;
      }

      var isForMe = msg.receiverUid === currentUid;
      var isFromMe = msg.senderUid === currentUid;
      
      if (isForMe && !(currentPrivateChat && currentPrivateChat === msg.senderUid)) {
        if (!unreadPrivateMessages[msg.senderUid]) unreadPrivateMessages[msg.senderUid] = 0;
        unreadPrivateMessages[msg.senderUid]++;
        showToast(msg.senderName, msg.senderUid);
        playNotificationSound();
        updateUserList();
      }
      
      if (currentPrivateChat && (isForMe || isFromMe)) { 
        var currentChatId = [currentUid, currentPrivateChat].sort().join('_'); 
        if (chatId === currentChatId) { addMessageToUI(msg, true); if (isForMe) msgSnap.ref.update({ is_read: true }); } 
      }
    });
    
    db.ref('private_messages/' + chatId).on('child_removed', (snap) => {
      var removedId = snap.key; var msgDiv = document.querySelector(`.msg[data-msg-id="${removedId}"]`); if (msgDiv) msgDiv.remove();
    });
  });
}

function setupPresenceInitial() { 
  db.ref('users').on('value', (snap) => { 
    onlineUsers = {}; snap.forEach(child => { 
      var user = child.val(); 
      if (user.uid && user.username) { 
        onlineUsers[user.uid] = { username: user.username, avatar: user.avatar || null }; 
        if (user.avatar) { userAvatars[user.uid] = user.avatar; localStorage.setItem('user_avatar_' + user.uid, user.avatar); } 
      } 
    }); updateUserList(); 
  }); 
}

async function registerUser() {
  var username = document.getElementById('userIn').value.trim(); 
  var password = document.getElementById('passIn').value.trim();
  if (!username || !password) { showLoginError('⚠️ Συμπλήρωσε όνομα και κωδικό!'); return; }
  if (username.includes(":")) { showLoginError('⚠️ Το όνομα δεν μπορεί να περιέχει ":"'); return; }
  if (password.length < 3) { showLoginError('⚠️ Ο κωδικός πρέπει να είναι τουλάχιστον 3 χαρακτήρες!'); return; }
  var isBanned = await checkIfBanned(username);
  if (isBanned) { showLoginError('🚫 Αυτό το όνομα είναι banned!'); return; }
  var lowerUsername = username.toLowerCase();
  var usersSnap = await db.ref('registered_users').orderByChild('username').equalTo(lowerUsername).once('value');
  if (usersSnap.exists()) { showLoginError('❌ Αυτό το όνομα είναι ήδη κατοχυρωμένο!'); return; }
  var newUid = 'uid_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  await db.ref('registered_users/' + newUid).set({ username: username, password: password, avatar: null, created_at: Date.now(), can_video_call: true });
  localStorage.setItem('chat_uid', newUid);
  localStorage.setItem('chat_username', username); 
  localStorage.setItem('chat_password', password);
  alert('✅ Ο λογαριασμός δημιουργήθηκε.');
  window.location.reload();
}

async function goChat(isAutoLogin = false) { 
  var username = document.getElementById('userIn').value.trim(); 
  var password = document.getElementById('passIn').value.trim();
  if (!username || !password) { showLoginError('⚠️ Συμπλήρωσε όνομα και κωδικό!'); return; }
  var isBanned = await checkIfBanned(username);
  if (isBanned) { 
    showLoginError('🚫 Αυτό το όνομα είναι banned!'); 
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); } 
    return; 
  } 
  if (username.toLowerCase() === "sakis" && password !== "019630") { 
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); } 
    else { showLoginError('❌ Λάθος κωδικός!'); } 
    return; 
  }
  var lowerUsername = username.toLowerCase();
  var regSnap = await db.ref('registered_users').orderByChild('username').equalTo(lowerUsername).once('value');
  if (!regSnap.exists() && username.toLowerCase() !== "sakis") {
    showLoginError('❌ Δεν υπάρχει λογαριασμός. Κάνε εγγραφή!'); 
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); } 
    return;
  }
  var targetUid = null;
  var regData = null;
  regSnap.forEach(child => { targetUid = child.key; regData = child.val(); });
  if (username.toLowerCase() !== "sakis" && regData.password !== password) { 
    showLoginError('❌ Λάθος κωδικός!'); 
    if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); } 
    return; 
  }
  try { 
    var sessionSnap = await db.ref('active_sessions/' + targetUid).once('value');
    if (sessionSnap.exists()) {
      var existingSession = sessionSnap.val();
      if (existingSession.session_id !== currentSessionId) {
        showLoginError('⚠️ Ο λογαριασμός είναι ήδη συνδεδεμένος σε άλλη συσκευή!');
        if (isAutoLogin) { localStorage.removeItem('chat_username'); localStorage.removeItem('chat_password'); localStorage.removeItem('chat_uid'); }
        return;
      }
    }
    await db.ref('active_sessions/' + targetUid).remove();
    await db.ref('active_sessions/' + targetUid).set({ session_id: currentSessionId, timestamp: Date.now() }); 
    localStorage.setItem('chat_uid', targetUid);
    localStorage.setItem('chat_username', username); 
    localStorage.setItem('chat_password', password);
    await enterChat(username, targetUid);
  } catch(e) { showLoginError('Σφάλμα: ' + e.message); } 
}

function initPeerJS() {
  return new Promise((resolve, reject) => {
    if (localPeer && peerReady) { resolve(); return; }
    if (localPeer) { try { localPeer.destroy(); } catch(e){} localPeer = null; peerReady = false; }
    
    var peerId = currentUid;
    localPeer = new Peer(peerId, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' }
        ]
      }
    });
    
    localPeer.on('open', (id) => { peerReady = true; resolve(); });
    
    localPeer.on('error', (err) => {
      if (err.type === 'unavailable-id') {
        var newId = currentUid + '_' + Math.random().toString(36).substr(2, 5);
        localPeer.destroy();
        localPeer = new Peer(newId, { 
          debug: 0, 
          config: { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] } 
        });
        localPeer.on('open', (id) => { peerReady = true; resolve(); });
        localPeer.on('error', (err2) => { peerReady = false; reject(err2); });
        localPeer.on('call', handleIncomingCall);
      } else if (err.type !== 'peer-unavailable' && err.type !== 'network') {
        peerReady = false; reject(err);
      }
    });
    
    localPeer.on('call', handleIncomingCall);
  });
}

function handleIncomingCall(call) {
  var callerName = 'Άγνωστος';
  var callerUid = call.peer;

  for (var uidKey in onlineUsers) {
    if (callerUid === uidKey || callerUid.startsWith(uidKey + '_') || uidKey.startsWith(String(callerUid) + '_')) {
      callerName = onlineUsers[uidKey].username;
      callerUid = uidKey;
      break;
    }
  }

  if (isUserBusy) {
    try { call.close(); } catch(e) {}
    var chatId = [currentUid, callerUid].sort().join('_');
    db.ref('private_messages/' + chatId).push({
      senderUid: currentUid, senderName: currentUser, receiverUid: callerUid, receiverName: callerName || '',
      message: '[📞 CALL_BUSY]', timestamp: Date.now()
    }).catch(() => {});
    return;
  }

  showIncomingCall(callerName, callerUid, call);
}

function showIncomingCall(callerName, callerUid, call) {
  isUserBusy = true;
  activeCallPartnerUid = callerUid;
  
  var overlay = document.createElement('div');
  overlay.id = 'incomingCallOverlay';
  overlay.className = 'video-call-overlay show';
  overlay.innerHTML = `<div class="video-call-container" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;">
    <div style="font-size:5em;margin-bottom:20px;animation:radioPulse 1.5s infinite;">📞</div>
    <h2 style="color:#fff;font-size:1.8em;margin-bottom:10px;">Εισερχόμενη Κλήση</h2>
    <p style="color:#10b981;font-size:1.3em;margin-bottom:30px;">${escapeHtml(callerName)}</p>
    <div style="display:flex;gap:20px;">
      <button class="video-call-btn" style="background:linear-gradient(135deg,#10b981,#059669);color:#fff;padding:16px 32px;font-size:1.1em;border-radius:30px;" onclick="answerIncomingCall()">✅ Απάντηση</button>
      <button class="video-call-btn hangup" onclick="rejectIncomingCall()">❌ Απόρριψη</button>
    </div>
  </div>`;
  document.body.appendChild(overlay);
  window.pendingIncomingCall = { call: call, callerUid: callerUid, callerName: callerName };
}

function answerIncomingCall() {
  var pending = window.pendingIncomingCall;
  if (!pending) return;
  var call = pending.call;
  var callerName = pending.callerName;
  
  var incomingOverlay = document.getElementById('incomingCallOverlay');
  if (incomingOverlay) incomingOverlay.remove();
  window.pendingIncomingCall = null;
  
  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
    lowerRadioForCall();
    document.getElementById('videoCallStatus').textContent = 'Σε σύνδεση με ' + callerName + '...';
    document.getElementById('videoCallOverlay').classList.add('show');
    call.answer(stream);
    currentCall = call;
    call.on('stream', function(remoteStream) {
      document.getElementById('remoteVideo').srcObject = remoteStream;
      document.getElementById('videoCallStatus').textContent = 'Σε σύνδεση με ' + callerName;
    });
    call.on('close', function() { endVideoCall(); });
    call.on('error', function() { endVideoCall(); });
  }).catch(function(err) {
    alert('Δεν ήταν δυνατή η πρόσβαση στην κάμερα/μικρόφωνο: ' + err.message);
    call.close();
    isUserBusy = false;
    activeCallPartnerUid = null;
  });
}

async function rejectIncomingCall() {
  var pending = window.pendingIncomingCall;
  if (!pending) return;
  pending.call.close();
  try {
    var chatId = [currentUid, pending.callerUid].sort().join('_');
    await db.ref('private_messages/' + chatId).push({
      senderUid: currentUid, senderName: currentUser, receiverUid: pending.callerUid, receiverName: pending.callerName || '',
      message: '[📞 CALL_REJECTED]', timestamp: Date.now()
    });
  } catch(e) {}
  window.pendingIncomingCall = null;
  isUserBusy = false;
  activeCallPartnerUid = null;
  var incomingOverlay = document.getElementById('incomingCallOverlay');
  if (incomingOverlay) incomingOverlay.remove();
}

async function enterChat(username, uid) {
  currentUser = username; currentUid = uid; connectTime = Date.now();

  try { await initPeerJS(); } catch(e) {}

  if (currentUser.toLowerCase() === "sakis") { 
    isAdmin = true; document.getElementById('adminClearBtn').classList.add('show'); 
    document.getElementById('bannedBtn').classList.add('show'); document.getElementById('clearBtn').classList.add('show');
    document.getElementById('videoPermBtn').classList.add('show');
  } else { 
    isAdmin = false; document.getElementById('clearBtn').classList.remove('show'); document.getElementById('bannedBtn').classList.remove('show');
    document.getElementById('videoPermBtn').classList.remove('show');
  } 
  
  var regSnap = await db.ref('registered_users/' + currentUid).once('value');
  var regData = regSnap.val();
  var avatarUrl = null;
  if (regData && regData.avatar) {
    avatarUrl = regData.avatar;
    userAvatars[currentUid] = avatarUrl;
    localStorage.setItem('user_avatar_' + currentUid, avatarUrl);
  } else {
    avatarUrl = localStorage.getItem('user_avatar_' + currentUid);
    if (avatarUrl) { userAvatars[currentUid] = avatarUrl; }
  }
   var trackData = { uid: currentUid, username: currentUser }; 
  if (avatarUrl) { trackData.avatar = avatarUrl; } 
  
  var userRef = db.ref('users/' + currentUid);
  var connectedRef = db.ref('.info/connected');
  
  connectedRef.on('value', (snap) => {
    if (snap.val() === true) {
      userRef.set(trackData);
      userRef.onDisconnect().remove();
    }
  });
  
  document.getElementById('loginDiv').style.display = 'none'; document.getElementById('chatApp').style.display = 'flex'; 
  document.getElementById('msgInput').focus(); 
  await loadMessages(); subscribeToMessages(); subscribeToBans(); setupPresenceInitial();
}

async function adminClearAll() { 
  if (!isAdmin) return; 
  if (!confirm("⚠️ Διαγραφή ΟΛΩΝ των λογαριασμών ΕΚΤΟΣ από εσένα (sakis);\n\nΘα χαθούν ονόματα, κωδικοί, φωτογραφίες.\n\nΕσύ θα παραμείνεις!")) return; 
  try { 
    var regSnap = await db.ref('registered_users').once('value'); var updates = {};
    regSnap.forEach(child => { var uid = child.key; if (child.val().username.toLowerCase() !== 'sakis') { updates['registered_users/' + uid] = null; } });
    var sessionsSnap = await db.ref('active_sessions').once('value');
    sessionsSnap.forEach(child => { updates['active_sessions/' + child.key] = null; });
    var usersSnap = await db.ref('users').once('value');
    usersSnap.forEach(child => { if (child.val().username.toLowerCase() !== 'sakis') { updates['users/' + child.key] = null; } });
    await db.ref().update(updates); alert("✅ Καθαρισμός ολοκληρώθηκε!"); ensureAdminOnline();
  } catch(e) { alert("Σφάλμα: " + e.message); } 
}

async function logoutChat() { 
  if (!confirm("⚠️ Χρειάζεται πραγματικά να αποσυνδεθείτε;\n\nΗ αποσύνδεση είναι απαραίτητη μόνο αν θέλετε να συνδεθείτε από άλλον browser ή συσκευή.\n\nΑν αποσυνδεθείτε, η αυτόματη είσοδος θα απενεργοποιηθεί και θα χρειαστεί να βάλετε ξανά το όνομα χρήστη και τον κωδικό σας.\n\nΘέλετε να συνεχίσετε;")) return; 
  
  endVideoCall();
  if (localPeer) { try { localPeer.destroy(); } catch(e){} localPeer = null; peerReady = false; }
  
  document.getElementById('playerIframe').src = ''; 
  document.getElementById('playerPanel').classList.remove('show'); 
  isPlayerOpen = false; 
  try { 
    await db.ref('active_sessions/' + currentUid).remove(); 
    await db.ref('users/' + currentUid).remove();
    localStorage.removeItem('chat_uid'); 
    localStorage.removeItem('chat_username'); 
    localStorage.removeItem('chat_password');
    currentUser = ''; currentUid = ''; 
    document.getElementById('chatApp').style.display = 'none'; 
    document.getElementById('loginDiv').style.display = 'flex'; 
    document.getElementById('userIn').value = ''; 
    document.getElementById('passIn').value = '';
  } catch(e) { console.error('Logout error:', e); alert('Σφάλμα: ' + e.message); } 
}

function showClearConfirmation() { if (!isAdmin) return; document.getElementById('clearConfirmationOverlay').classList.add('show'); }
function hideClearConfirmation() { document.getElementById('clearConfirmationOverlay').classList.remove('show'); }
async function confirmClearMessages() { 
  if (!isAdmin) return; hideClearConfirmation(); 
  try { await db.ref('messages').remove(); alert('✅ Διαγράφηκαν!'); ensureAdminOnline(); } 
  catch(e) { alert('Σφάλμα: ' + e.message); } 
}

function openImagePreview(imgSrc) { var overlay = document.getElementById('imagePreviewOverlay'); var img = document.getElementById('imagePreviewImg'); img.src = imgSrc; overlay.classList.add('show'); }
function closeImagePreview(event) { if (event.target.id === 'imagePreviewOverlay' || event.target.classList.contains('image-preview-close')) { document.getElementById('imagePreviewOverlay').classList.remove('show'); } }
document.addEventListener('keydown', function(e) { if (e.key === 'Escape') { document.getElementById('imagePreviewOverlay').classList.remove('show'); } });
document.getElementById('userIn').addEventListener('keypress', e => { if (e.key === 'Enter') document.getElementById('passIn').focus(); });
document.getElementById('passIn').addEventListener('keypress', e => { if (e.key === 'Enter') goChat(); });
document.getElementById('msgInput').addEventListener('keypress', e => { if (e.key === 'Enter') sendMsg(); });

window.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'RADIO_TITLE_UPDATE') {
    var titleText = event.data.title || 'Radio Synnefa Live';
    var titleEl = document.getElementById('radioNowPlayingText');
    if (titleEl) {
      var textarea = document.createElement('textarea'); textarea.innerHTML = titleText; var decodedText = textarea.value;
      titleEl.innerHTML = '<span class="radio-text-scroll">' + decodedText + '</span>';
    }
  }
});

// --- Video Call Functions ---
async function startVideoCall() {
  try {
    var regSnap = await db.ref('registered_users/' + currentUid).once('value');
    var regData = regSnap.val();
    var hasPermission = regData && (regData.can_video_call === true || regData.can_video_call === 'true' || regData.can_video_call === 'True' || regData.can_video_call === undefined);
    if (!hasPermission) {
      alert('⛔ Δεν έχεις δικαίωμα βιντεοκλήσης!\nΠαρακαλώ επικοινώνησε με τον διαχειριστή.');
      return;
    }
  } catch(e) {}

  if (!currentPrivateChat) { alert('Πρέπει να είσαι σε ιδιωτική συνομιλία!'); return; }
  if (!localPeer || !peerReady) { alert('Η σύνδεση δεν είναι έτοιμη.'); return; }
  if (isUserBusy) { alert('Είσαι ήδη σε κλήση!'); return; }
  
  document.getElementById('videoCallStatus').textContent = 'Καλώ ' + (currentPrivateChatName || '') + '...';
  document.getElementById('videoCallOverlay').classList.add('show');
  
  isUserBusy = true;
  activeCallPartnerUid = currentPrivateChat;
  window.callWasRejected = false;

  navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then(function(stream) {
    localStream = stream;
    document.getElementById('localVideo').srcObject = stream;
    lowerRadioForCall();
    var call = localPeer.call(currentPrivateChat, stream);
    if (!call) { alert('Αποτυχία κλήσης.'); endVideoCall(); return; }
    currentCall = call;

    var callTimeout = setTimeout(function() {
      if (isUserBusy && currentCall && !document.getElementById('remoteVideo').srcObject) {
        document.getElementById('videoCallStatus').textContent = '⏳ Δεν απάντησε / Απασχολημένος';
        try { currentCall.close(); } catch(e) {}
        setTimeout(function() { endVideoCall(); }, 1200);
      }
    }, 12000);
    
    call.on('stream', function(remoteStream) {
      clearTimeout(callTimeout);
      document.getElementById('remoteVideo').srcObject = remoteStream;
      document.getElementById('videoCallStatus').textContent = 'Σε σύνδεση';
    });
    call.on('close', function() {
      clearTimeout(callTimeout);
      if (window.callWasRejected) { setTimeout(function() { endVideoCall(); }, 100); }
      else { endVideoCall(); }
    });
    call.on('error', function() {
      clearTimeout(callTimeout);
      document.getElementById('videoCallStatus').textContent = 'Σφάλμα σύνδεσης';
      setTimeout(function() { endVideoCall(); }, 1200);
    });
  }).catch(function(err) {
    alert('Δεν ήταν δυνατή η πρόσβαση στην κάμερα/μικρόφωνο.');
    endVideoCall();
  });
}

async function endVideoCall() {
  restoreRadioAfterCall();
  var remoteVideo = document.getElementById('remoteVideo');
  if (remoteVideo && !remoteVideo.srcObject && activeCallPartnerUid && !window.callWasRejected) {
    try {
      var chatId = [currentUid, activeCallPartnerUid].sort().join('_');
      await db.ref('private_messages/' + chatId).push({
        senderUid: currentUid, senderName: currentUser, receiverUid: activeCallPartnerUid,
        receiverName: currentPrivateChatName || '', message: '[📞 CALL_CANCELLED]', timestamp: Date.now()
      });
    } catch(e) {}
  }
  if (currentCall) { try { currentCall.close(); } catch(e){} currentCall = null; }
  if (localStream) { localStream.getTracks().forEach(function(track) { track.stop(); }); localStream = null; }
  document.getElementById('localVideo').srcObject = null;
  document.getElementById('remoteVideo').srcObject = null;
  document.getElementById('videoCallOverlay').classList.remove('show');
  document.getElementById('videoCallStatus').textContent = 'Σύνδεση...';
  window.callWasRejected = false;
  isUserBusy = false;
  activeCallPartnerUid = null;
  var incomingOverlay = document.getElementById('incomingCallOverlay');
  if (incomingOverlay) incomingOverlay.remove();
  window.pendingIncomingCall = null;
}

function lowerRadioForCall() {
  var iframe = document.getElementById('playerIframe');
  if (iframe && iframe.contentWindow) { iframe.contentWindow.postMessage({ type: 'SET_RADIO_VOLUME', volume: 0 }, '*'); }
}

function restoreRadioAfterCall() {
  var iframe = document.getElementById('playerIframe');
  if (iframe && iframe.contentWindow) { iframe.contentWindow.postMessage({ type: 'SET_RADIO_VOLUME', volume: 1.0 }, '*'); }
}

// --- Audio Recording ---
let mediaRecorder = null;
let audioChunks = [];
let recordingInterval = null;
let recordingSeconds = 0;
let currentAudioBlob = null;
let currentAudioUrl = null;
const CLOUDINARY_CLOUD_NAME = 'ceu1jpxy';
const CLOUDINARY_UPLOAD_PRESET = 'radiochat_audio';

async function toggleRecording() { if (!mediaRecorder || mediaRecorder.state === 'inactive') { await startRecording(); } else { stopRecording(); } }

async function startRecording() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream); audioChunks = []; recordingSeconds = 0;
    mediaRecorder.ondataavailable = (event) => { if (event.data.size > 0) { audioChunks.push(event.data); } };
    mediaRecorder.onstop = () => {
      currentAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      currentAudioUrl = URL.createObjectURL(currentAudioBlob);
      document.getElementById('previewAudioPlayer').src = currentAudioUrl;
      document.getElementById('audioPreviewOverlay').classList.add('show');
      stream.getTracks().forEach(track => track.stop());
    };
    mediaRecorder.start();
    document.getElementById('micBtn').classList.add('recording');
    document.getElementById('recordingTimer').style.display = 'flex';
    recordingInterval = setInterval(() => {
      recordingSeconds++;
      const mins = Math.floor(recordingSeconds / 60);
      const secs = recordingSeconds % 60;
      document.getElementById('recTimeText').textContent = `${mins}:${secs.toString().padStart(2, '0')} / 0:30`;
      if (recordingSeconds >= 30) { stopRecording(); }
    }, 1000);
  } catch (err) {
    alert('️ Δεν ήταν δυνατή η πρόσβαση στο μικρόφωνο.\nΠαρακαλώ επέτρεψε την πρόσβαση στις ρυθμίσεις του browser.');
    console.error('Mic error:', err);
  }
}

function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    clearInterval(recordingInterval);
    if (mediaRecorder.stream) {
      mediaRecorder.stream.getTracks().forEach(track => { track.stop(); track.enabled = false; });
    }
    mediaRecorder = null;
    document.getElementById('micBtn').classList.remove('recording');
    document.getElementById('recordingTimer').style.display = 'none';
  }
}

function cancelRecording() {
  document.getElementById('audioPreviewOverlay').classList.remove('show');
  if (currentAudioUrl) { URL.revokeObjectURL(currentAudioUrl); currentAudioUrl = null; }
  currentAudioBlob = null;
}

async function sendAudioMessage() {
  if (!currentAudioBlob) return;
  const sendBtn = document.querySelector('.preview-btn.send');
  const originalText = sendBtn.textContent;
  sendBtn.textContent = '⏳ Αποστολή...'; sendBtn.disabled = true;
  try {
    const formData = new FormData();
    formData.append('file', currentAudioBlob, 'recording.webm');
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, { method: 'POST', body: formData });
    const data = await response.json();
    if (data.secure_url) {
      const audioUrl = data.secure_url; const timestamp = Date.now();
      if (currentPrivateChat) {
        const chatId = [currentUid, currentPrivateChat].sort().join('_');
        await db.ref('private_messages/' + chatId).push({ senderUid: currentUid, senderName: currentUser, receiverUid: currentPrivateChat, receiverName: currentPrivateChatName, message: '[🎙️ Ηχητικό Μήνυμα]', audioUrl: audioUrl, timestamp: timestamp });
      } else {
        await db.ref('messages').push({ userId: currentUid, userName: currentUser, text: '[🎙️ Ηχητικό Μήνυμα]', audioUrl: audioUrl, timestamp: timestamp });
      }
      cancelRecording();
    } else { throw new Error('Αποτυχία μεταφόρτωσης στο Cloudinary'); }
  } catch (err) { alert('Σφάλμα κατά την αποστολή: ' + err.message); } 
  finally { sendBtn.textContent = originalText; sendBtn.disabled = false; }
}

document.addEventListener('DOMContentLoaded', function() {
    var passIn = document.getElementById('passIn');
    var passHint = document.getElementById('passHint');
    if (passIn && passHint) {
        passIn.addEventListener('focus', function() { passHint.style.display = 'block'; });
        passIn.addEventListener('blur', function() { setTimeout(function() { passHint.style.display = 'none'; }, 250); });
    }
});