const player = videojs('my-video');

const playlistElement = document.querySelector('#playlist ul');
const playlistContainer = document.getElementById('playlist');
const body = document.body;

const playlistToggleHandle = document.getElementById('playlist-toggle-handle');

const searchInput = document.getElementById('playlist-search');
const uploadButton = document.getElementById('upload-button');
const uploadModal = document.getElementById('upload-modal');
const closeModal = document.querySelector('.close');
const playlistNameInput = document.getElementById('playlist-name');
const fileUpload = document.getElementById('file-upload');
const urlInput = document.getElementById('url-input');
const loadUrlButton = document.getElementById('load-url');
const textInput = document.getElementById('text-input');
const loadTextButton = document.getElementById('load-text');
const playlistSelector = document.getElementById('playlist-selector');

const renamePlaylistBtn = document.getElementById('rename-playlist-btn');
const deletePlaylistBtn = document.getElementById('delete-playlist-btn');
const infoButton = document.getElementById('info-button');

const renameModal = document.getElementById('rename-modal');
const closeRenameModal = document.querySelector('.close-rename');
const newPlaylistNameInput = document.getElementById('new-playlist-name');
const saveRenameBtn = document.getElementById('save-rename-btn');
const cancelRenameBtn = document.getElementById('cancel-rename-btn');

const initialMessageOverlay = document.getElementById('initial-message-overlay');
const noSourceMessageElement = document.getElementById('no-source-message');

let currentChannelIndex = parseInt(localStorage.getItem('currentChannelIndex')) || 0;
let currentPlaylistName = localStorage.getItem('currentPlaylistName') || '';
let playlists = JSON.parse(localStorage.getItem('playlists')) || {};
let currentGroup = localStorage.getItem('currentGroup') || ''; // Son seçili grubu kaydet

// Varsayılan M3U URL'sini ve Adını tanımla
const defaultM3uUrl = 'https://raw.githubusercontent.com/yusufadeler/M3U-Player/main/channels.m3u';
const defaultM3uName = 'channels.m3u'; // Display name for the default playlist

// M3U dosyasını ayrıştırma fonksiyonu
async function parseM3U(data) {
    const lines = data.split('\n');
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        if (line.startsWith('#EXTINF:')) {
            const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
            const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
            const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
            const groupTitleMatch = line.match(/group-title="([^"]*)"/);
            const nameMatch = line.match(/,(.*)/);

            currentChannel = {
                tvgId: tvgIdMatch ? tvgIdMatch[1] : '',
                tvgName: tvgNameMatch ? tvgNameMatch[1] : '',
                tvgLogo: tvgLogoMatch ? tvgLogoMatch[1] : '',
                groupTitle: groupTitleMatch ? groupTitleMatch[1] : '',
                name: nameMatch ? nameMatch[1].trim() : 'Bilinmeyen Kanal'
            };
        } else if (line.startsWith('http')) {
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {}; // Reset for the next channel
        }
    }
    return channels;
}

// Kanalı oynatma fonksiyonu
function playChannel(url, index) {
    player.src({
        src: url,
        type: 'application/x-mpegURL' // HLS için
    });
    player.load();
    player.play().catch(error => {
        console.error("Video oynatılamadı:", error);
        showNoSourceMessage("Bu kanal oynatılamıyor. Lütfen başka bir kanal deneyin.");
    });

    currentChannelIndex = index;
    localStorage.setItem('currentChannelIndex', currentChannelIndex);
    localStorage.setItem('currentPlaylistName', playlistSelector.value); // Seçili oynatma listesini kaydet

    // Seçili kanalı vurgula ve scrollIntoView
    const channelItems = playlistElement.querySelectorAll('li');
    channelItems.forEach((item, idx) => {
        if (parseInt(item.dataset.index) === index) {
            item.classList.add('selected');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        } else {
            item.classList.remove('selected');
        }
    });

    // Başlığı güncelle
    const currentChannel = playlists[currentPlaylistName][currentChannelIndex];
    if (currentChannel) {
        document.title = `${currentChannel.name} - M3U Player`;
    } else {
        document.title = 'M3U Player';
    }
}

// Kanal listesini görüntüleme fonksiyonu
function displayPlaylist(channels) {
    playlistElement.innerHTML = '';
    const groups = {};

    // Kanalları gruplara ayır
    channels.forEach(channel => {
        const groupName = channel.groupTitle || 'Diğer';
        if (!groups[groupName]) {
            groups[groupName] = [];
        }
        groups[groupName].push(channel);
    });

    // Grupları sırala (isteğe bağlı)
    const sortedGroupNames = Object.keys(groups).sort((a, b) => {
        // "Diğer" grubunu en sona at
        if (a === 'Diğer') return 1;
        if (b === 'Diğer') return -1;
        return a.localeCompare(b);
    });

    sortedGroupNames.forEach(groupName => {
        const groupHeader = document.createElement('li');
        groupHeader.className = 'group-header';
        groupHeader.textContent = groupName;
        groupHeader.dataset.groupName = groupName; // Grubu işaretle
        playlistElement.appendChild(groupHeader);

        // Eğer bu grup seçili değilse, kanalları gizle
        if (groupName !== currentGroup) {
            groupHeader.classList.add('collapsed');
        }

        groups[groupName].forEach((channel, index) => {
            const listItem = document.createElement('li');
            listItem.dataset.url = channel.url;
            listItem.dataset.name = channel.name;
            listItem.dataset.index = index; // Store original index
            listItem.dataset.group = channel.groupTitle || 'Diğer'; // Gruplandırma için
            listItem.innerHTML = `
                <span class="channel-name">${channel.name}</span>
            `;
            listItem.addEventListener('click', () => {
                playChannel(channel.url, index);
                hidePlaylist();
            });
            // Grubu gizlemek için class ekle
            if (groupName !== currentGroup) {
                listItem.classList.add('hidden-by-group');
            }
            playlistElement.appendChild(listItem);
        });
    });

    // Grupları tıklanabilir hale getir
    playlistElement.querySelectorAll('.group-header').forEach(header => {
        header.addEventListener('click', () => {
            const groupName = header.dataset.groupName;
            const isCollapsed = header.classList.contains('collapsed');

            // Eğer tıklanan grup zaten açıksa ve tekrar tıklanırsa kapat
            if (!isCollapsed && currentGroup === groupName) {
                header.classList.add('collapsed');
                playlistElement.querySelectorAll(`li[data-group="${groupName}"]`).forEach(item => {
                    item.classList.add('hidden-by-group');
                });
                currentGroup = ''; // Grubu temizle
            } else {
                // Diğer tüm grupları kapat
                playlistElement.querySelectorAll('.group-header').forEach(h => {
                    h.classList.add('collapsed');
                });
                playlistElement.querySelectorAll('li[data-group]').forEach(item => {
                    item.classList.add('hidden-by-group');
                });

                // Tıklanan grubu aç
                header.classList.remove('collapsed');
                playlistElement.querySelectorAll(`li[data-group="${groupName}"]`).forEach(item => {
                    item.classList.remove('hidden-by-group');
                });
                currentGroup = groupName; // Yeni seçili grubu kaydet
            }
            localStorage.setItem('currentGroup', currentGroup); // Grubu kaydet
        });
    });
