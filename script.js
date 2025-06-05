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

const infoModal = document.getElementById('info-modal');
const closeInfoModal = document.querySelector('.close-info');

const NO_PLAYLIST_SELECTED_VALUE = "no-playlist-selected";

// Player settings
const VOLUME_STEP = 5; // Ses artırma/azaltma adımı
const VOLUME_MAX = 100;
const VOLUME_MIN = 0;

// Oynatma listesi verilerini localStorage'dan yükleme
let playlists = JSON.parse(localStorage.getItem('m3u_playlists')) || {};
let currentPlaylistName = localStorage.getItem('current_playlist_name') || null;
let currentChannelIndex = parseInt(localStorage.getItem('current_channel_index') || '0', 10);

// ---------- Utility Functions ----------
function sanitizeFilename(name) {
    return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// ---------- Playlist Management ----------
function savePlaylists() {
    localStorage.setItem('m3u_playlists', JSON.stringify(playlists));
}

function loadPlaylistIntoSelector() {
    playlistSelector.innerHTML = '<option value="' + NO_PLAYLIST_SELECTED_VALUE + '">Oynatma Listesi Seç</option>';
    for (const name in playlists) {
        const option = document.createElement('option');
        option.value = name;
        option.textContent = name;
        playlistSelector.appendChild(option);
    }
    if (currentPlaylistName && playlists[currentPlaylistName]) {
        playlistSelector.value = currentPlaylistName;
    } else {
        playlistSelector.value = NO_PLAYLIST_SELECTED_VALUE;
        // Eğer seçili bir oynatma listesi yoksa veya geçersizse,
        // mevcut kanalı ve oynatma listesi adını temizle.
        currentPlaylistName = null;
        currentChannelIndex = 0;
        localStorage.removeItem('current_playlist_name');
        localStorage.removeItem('current_channel_index');
        playlistElement.innerHTML = ''; // Kanal listesini de temizle
    }
    updatePlaylistButtonsVisibility();
}

function updatePlaylistButtonsVisibility() {
    const isPlaylistSelected = playlistSelector.value !== NO_PLAYLIST_SELECTED_VALUE;
    renamePlaylistBtn.style.display = isPlaylistSelected ? 'inline-block' : 'none';
    deletePlaylistBtn.style.display = isPlaylistSelected ? 'inline-block' : 'none';
}


function parseM3u(data) {
    const lines = data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    const channels = [];
    let currentChannel = {};

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('#EXTM3U')) {
            continue;
        }

        if (line.startsWith('#EXTINF:')) {
            // New channel entry
            currentChannel = {};

            const tvgIdMatch = line.match(/tvg-id="([^"]*)"/);
            currentChannel.tvgId = tvgIdMatch ? tvgIdMatch[1] : '';

            const tvgNameMatch = line.match(/tvg-name="([^"]*)"/);
            currentChannel.tvgName = tvgNameMatch ? tvgNameMatch[1] : '';

            const tvgLogoMatch = line.match(/tvg-logo="([^"]*)"/);
            currentChannel.tvgLogo = tvgLogoMatch ? tvgLogoMatch[1] : '';

            const groupTitleMatch = line.match(/group-title="([^"]*)"/);
            currentChannel.groupTitle = groupTitleMatch ? groupTitleMatch[1] : '';

            const nameMatch = line.match(/,(.*)$/);
            currentChannel.name = nameMatch ? nameMatch[1].trim() : 'Unknown Channel';

            // Check for potential next line as URL if current line is just EXTINF and name
            if (i + 1 < lines.length && !lines[i + 1].startsWith('#')) {
                currentChannel.url = lines[i + 1];
                channels.push(currentChannel);
                i++; // Skip next line as it's the URL
            }
        } else if (!line.startsWith('#') && currentChannel.name && !currentChannel.url) {
            // This line is likely the URL for the previously parsed EXTINF
            currentChannel.url = line;
            channels.push(currentChannel);
            currentChannel = {}; // Reset for the next channel
        }
    }
    return channels;
}


function displayPlaylist(channels) {
    playlistElement.innerHTML = '';
    channels.forEach((channel, index) => {
        const listItem = document.createElement('li');
        listItem.dataset.url = channel.url;
        listItem.dataset.name = channel.name;
        listItem.dataset.index = index; // Store original index
        listItem.dataset.group = channel.groupTitle || 'Diğer'; // Gruplandırma için
       listItem.innerHTML = ` <img src="${channel.name}" class="channel-logo"> <span class="channel-name">${channel.name}</span>         `;
        listItem.addEventListener('click', () => {
            playChannel(channel.url, index);
            hidePlaylist();
        });
        playlistElement.appendChild(listItem);
    });

    // Kanal listesini oluşturduktan sonra seçili kanalı işaretle
    if (currentPlaylistName === playlistSelector.value) { // Sadece aynı oynatma listesindeyken
        const selectedChannel = playlistElement.querySelector(`li[data-index="${currentChannelIndex}"]`);
        if (selectedChannel) {
            selectedChannel.classList.add('selected');
            selectedChannel.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

function playChannel(url, index) {
    player.src({
        src: url,
        type: 'application/x-mpegURL' // HLS için
    });
    player.load();
    player.play()
        .then(() => {
            console.log("Video started playing.");
            // Hide the 'No video source loaded' message if it exists
            const noSourceMessage = document.querySelector('.no-source-message');
            if (noSourceMessage) {
                noSourceMessage.style.display = 'none';
            }
        })
        .catch(error => {
            console.error("Video play failed:", error);
            // Show a custom message if video fails to play
            showNoSourceMessage("Video oynatılamadı. Kaynak mevcut değil veya format desteklenmiyor.");
        });

    // Remove 'selected' class from all items
    document.querySelectorAll('#playlist ul li').forEach(item => {
        item.classList.remove('selected');
    });

    // Add 'selected' class to the clicked item
    const selectedItem = playlistElement.querySelector(`li[data-url="${url}"]`);
    if (selectedItem) {
        selectedItem.classList.add('selected');
    }

    currentChannelIndex = index;
    localStorage.setItem('current_channel_index', index);
    localStorage.setItem('current_playlist_name', currentPlaylistName);
}

function showNoSourceMessage(message = "Video kaynağı yüklenmedi.") {
    let noSourceMessage = document.querySelector('.no-source-message');
    if (!noSourceMessage) {
        noSourceMessage = document.createElement('div');
        noSourceMessage.className = 'no-source-message';
        document.querySelector('.video-container').appendChild(noSourceMessage);
    }
    noSourceMessage.textContent = message;
    noSourceMessage.style.display = 'block';
}

function loadM3uContent(content, playlistName, selectAfterLoad = true) {
    if (!playlistName) {
        playlistName = `Playlist-${Date.now()}`;
    }
    const channels = parseM3u(content);
    playlists[playlistName] = channels;
    savePlaylists();
    loadPlaylistIntoSelector();

    if (selectAfterLoad) {
        playlistSelector.value = playlistName;
        currentPlaylistName = playlistName;
        displayPlaylist(channels);
        currentChannelIndex = 0; // Yeni liste yüklendiğinde ilk kanala sıfırla
        localStorage.setItem('current_playlist_name', currentPlaylistName);
        localStorage.setItem('current_channel_index', currentChannelIndex);
        if (channels.length > 0) {
            playChannel(channels[0].url, 0);
        } else {
            player.pause();
            player.src('');
            showNoSourceMessage("Bu oynatma listesinde kanal bulunamadı.");
        }
        showToast(`'${playlistName}' oynatma listesi yüklendi.`);
    }
}

// Initial load of channels.txt content
fetch('channels.txt')
    .then(response => {
        if (!response.ok) {
            throw new Error('channels.txt not found or could not be loaded.');
        }
        return response.text();
    })
    .then(data => {
        // Load the content of channels.txt as the default playlist
        // We'll give it a default name like 'Default Channels'
        loadM3uContent(data, 'Default Channels', true);
    })
    .catch(error => {
        console.error("Error loading default channels.txt:", error);
        showToast("Default channels.txt dosyası yüklenemedi. Lütfen bir oynatma listesi yükleyin.");
        showNoSourceMessage("Varsayılan kanal listesi yüklenemedi. Lütfen bir oynatma listesi yükleyin.");
    });


// ---------- Event Listeners ----------

// Handle playlist selection change
playlistSelector.addEventListener('change', (event) => {
    const selectedName = event.target.value;
    if (selectedName === NO_PLAYLIST_SELECTED_VALUE) {
        currentPlaylistName = null;
        currentChannelIndex = 0;
        localStorage.removeItem('current_playlist_name');
        localStorage.removeItem('current_channel_index');
        playlistElement.innerHTML = '';
        player.pause();
        player.src('');
        showNoSourceMessage("Lütfen bir oynatma listesi seçin veya yükleyin.");
        updatePlaylistButtonsVisibility();
        return;
    }

    currentPlaylistName = selectedName;
    const channelsToDisplay = playlists[selectedName];
    if (channelsToDisplay) {
        displayPlaylist(channelsToDisplay);
        // Eğer önceden seçili bir kanal varsa onu yükle, yoksa ilk kanalı
        if (localStorage.getItem('current_playlist_name') === selectedName && playlists[currentPlaylistName][currentChannelIndex]) {
            playChannel(playlists[currentPlaylistName][currentChannelIndex].url, currentChannelIndex);
        } else if (channelsToDisplay.length > 0) {
            playChannel(channelsToDisplay[0].url, 0);
        } else {
            player.pause();
            player.src('');
            showNoSourceMessage("Bu oynatma listesinde kanal bulunamadı.");
        }
        localStorage.setItem('current_playlist_name', currentPlaylistName);
        localStorage.setItem('current_channel_index', currentChannelIndex);
    }
    updatePlaylistButtonsVisibility();
});

// Upload button functionality
uploadButton.addEventListener('click', () => {
    uploadModal.style.display = 'block';
});

closeModal.addEventListener('click', () => {
    uploadModal.style.display = 'none';
    playlistNameInput.value = '';
    fileUpload.value = '';
    urlInput.value = '';
    textInput.value = '';
});

window.addEventListener('click', (event) => {
    if (event.target === uploadModal) {
        uploadModal.style.display = 'none';
        playlistNameInput.value = '';
        fileUpload.value = '';
        urlInput.value = '';
        textInput.value = '';
    }
    if (event.target === renameModal) {
        renameModal.style.display = 'none';
        newPlaylistNameInput.value = '';
    }
    if (event.target === infoModal) {
        infoModal.style.display = 'none';
    }
});

fileUpload.addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            let pName = playlistNameInput.value.trim();
            if (!pName) {
                pName = file.name.replace(/\.[^/.]+$/, ""); // Dosya adını uzantısız kullan
            }
            loadM3uContent(content, pName);
            uploadModal.style.display = 'none';
        };
        reader.readAsText(file);
    }
});

loadUrlButton.addEventListener('click', () => {
    const url = urlInput.value.trim();
    let pName = playlistNameInput.value.trim();
    if (url) {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.text();
            })
            .then(data => {
                if (!pName) {
                    // Try to derive a name from the URL
                    try {
                        const urlObj = new URL(url);
                        const pathSegments = urlObj.pathname.split('/');
                        pName = pathSegments[pathSegments.length - 1].replace(/\.[^/.]+$/, '') || 'Remote Playlist';
                    } catch (e) {
                        pName = 'Remote Playlist';
                    }
                }
                loadM3uContent(data, pName);
                uploadModal.style.display = 'none';
            })
            .catch(error => {
                console.error("Error loading M3U from URL:", error);
                showToast("URL'den M3U yüklenirken bir hata oluştu.");
            });
    } else {
        showToast("Lütfen bir URL girin.");
    }
});

loadTextButton.addEventListener('click', () => {
    const text = textInput.value.trim();
    let pName = playlistNameInput.value.trim();
    if (text) {
        if (!pName) {
            pName = 'Yapıştırılan Liste';
        }
        loadM3uContent(text, pName);
        uploadModal.style.display = 'none';
    } else {
        showToast("Lütfen M3U içeriğini yapıştırın.");
    }
});


// Rename playlist functionality
renamePlaylistBtn.addEventListener('click', () => {
    if (currentPlaylistName) {
        newPlaylistNameInput.value = currentPlaylistName;
        renameModal.style.display = 'block';
    } else {
        showToast("Yeniden adlandırmak için önce bir oynatma listesi seçin.");
    }
});

closeRenameModal.addEventListener('click', () => {
    renameModal.style.display = 'none';
});

saveRenameBtn.addEventListener('click', () => {
    const newName = newPlaylistNameInput.value.trim();
    if (newName && newName !== currentPlaylistName) {
        if (playlists[newName]) {
            showToast("Bu isimde bir oynatma listesi zaten var. Lütfen farklı bir isim girin.");
            return;
        }
        playlists[newName] = playlists[currentPlaylistName];
        delete playlists[currentPlaylistName];
        currentPlaylistName = newName;
        savePlaylists();
        loadPlaylistIntoSelector();
        showToast(`Oynatma listesi '${newName}' olarak yeniden adlandırıldı.`);
        renameModal.style.display = 'none';
    } else {
        showToast("Geçerli bir yeni isim girin.");
    }
});

cancelRenameBtn.addEventListener('click', () => {
    renameModal.style.display = 'none';
});


// Delete playlist functionality
deletePlaylistBtn.addEventListener('click', () => {
    if (currentPlaylistName && confirm(`'${currentPlaylistName}' oynatma listesini silmek istediğinizden emin misiniz?`)) {
        delete playlists[currentPlaylistName];
        currentPlaylistName = null;
        currentChannelIndex = 0;
        localStorage.removeItem('current_playlist_name');
        localStorage.removeItem('current_channel_index');
        savePlaylists();
        loadPlaylistIntoSelector();
        playlistElement.innerHTML = ''; // Kanal listesini temizle
        player.pause();
        player.src('');
        showNoSourceMessage("Oynatma listesi silindi. Lütfen yeni bir liste yükleyin.");
        showToast("Oynatma listesi silindi.");
    }
});


// Info button and modal
infoButton.addEventListener('click', () => {
    infoModal.style.display = 'block';
});

closeInfoModal.addEventListener('click', () => {
    infoModal.style.display = 'none';
});

// Playlist visibility toggle handle
playlistToggleHandle.addEventListener('click', () => {
    const playlist = document.getElementById('playlist');
    if (body.classList.contains('playlist-visible')) {
        hidePlaylist();
    } else {
        showPlaylist();
    }
});


// Search functionality
searchInput.addEventListener('input', (event) => {
    const searchTerm = event.target.value.toLowerCase();
    const allItems = playlistElement.querySelectorAll('li');
    let firstVisibleChannel = null;

    allItems.forEach(item => {
        const channelName = item.dataset.name.toLowerCase();
        if (channelName.includes(searchTerm)) {
            item.style.display = ''; // Show item
            if (!firstVisibleChannel) {
                firstVisibleChannel = item;
            }
        } else {
            item.style.display = 'none'; // Hide item
        }
    });

    // Otomatik olarak ilk bulunan kanalı seç ve scroll et
    if (firstVisibleChannel) {
        // Önceki seçimi kaldır
        allItems.forEach(item => item.classList.remove('selected'));
        // Yeni seçimi ekle
        firstVisibleChannel.classList.add('selected');
        firstVisibleChannel.scrollIntoView({ behavior: 'auto', block: 'center' }); // Smooth yerine auto daha iyi olabilir aramalarda
    }
});


// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return; // Ignore key presses if an input field is focused
    }

    // Check if info modal is open
    if (infoModal.style.display === 'block') {
        if (e.key === 'Escape') {
            infoModal.style.display = 'none';
            e.preventDefault();
        }
        return;
    }


    const videoPlayer = document.getElementById('my-video');
    const isFullScreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    switch (e.key) {
        case 'ArrowLeft':
            if (isFullScreen) {
                adjustVolume('down');
            } else {
                togglePlaylistVisibility();
            }
            e.preventDefault();
            break;
        case 'ArrowRight':
            if (isFullScreen) {
                adjustVolume('up');
            } else {
                togglePlaylistVisibility();
            }
            e.preventDefault();
            break;
        case 'ArrowUp':
            changeChannel('up');
            e.preventDefault();
            break;
        case 'ArrowDown':
            changeChannel('down');
            e.preventDefault();
            break;
        case ' ': // Spacebar
            if (player.paused()) {
                player.play();
            } else {
                player.pause();
            }
            e.preventDefault();
            break;
        case 'f':
        case 'F':
            toggleFullScreen();
            e.preventDefault();
            break;
        case 'm':
        case 'M':
            player.muted(!player.muted());
            showVolumeIndicator(player.volume() * 100); // Mute durumunda bile ses seviyesini göster
            e.preventDefault();
            break;
        case 'Escape':
            if (isFullScreen) {
                exitFullScreen();
            } else if (body.classList.contains('playlist-visible')) {
                hidePlaylist();
            }
            e.preventDefault();
            break;
        case 'Enter':
            // If playlist is visible and a channel is selected (e.g., via keyboard navigation)
            const selectedItem = playlistElement.querySelector('li.selected');
            if (body.classList.contains('playlist-visible') && selectedItem) {
                selectedItem.click(); // Simulate click to play
                e.preventDefault();
            }
            break;
    }
});

function togglePlaylistVisibility() {
    if (body.classList.contains('playlist-visible')) {
        hidePlaylist();
    } else {
        showPlaylist();
    }
}

function toggleFullScreen() {
    const videoElement = player.el(); // video.js player'ın DOM elementini al
    if (!document.fullscreenElement) {
        if (videoElement.requestFullscreen) {
            videoElement.requestFullscreen();
        } else if (videoElement.mozRequestFullScreen) { /* Firefox */
            videoElement.mozRequestFullScreen();
        } else if (videoElement.webkitRequestFullscreen) { /* Chrome, Safari and Opera */
            videoElement.webkitRequestFullscreen();
        } else if (videoElement.msRequestFullscreen) { /* IE/Edge */
            videoElement.msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        } else if (document.mozCancelFullScreen) { /* Firefox */
            document.mozCancelFullScreen();
        } else if (document.webkitExitFullscreen) { /* Chrome, Safari and Opera */
            document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) { /* IE/Edge */
            document.msExitFullscreen();
        }
    }
}

function exitFullScreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) { // Firefox
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) { // Chrome, Safari and Opera
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) { // IE/Edge
        document.msExitFullscreen();
    }
}

function findNextPlayableChannel(currentIndex, allItems, direction) {
    const visibleItems = Array.from(allItems).filter(item => item.style.display !== 'none');
    if (visibleItems.length === 0) return -1; // No visible channels

    const currentSelected = playlistElement.querySelector('li.selected');
    let currentVisibleIndex = -1;
    if (currentSelected) {
        currentVisibleIndex = visibleItems.findIndex(item => item === currentSelected);
    }

    let newVisibleIndex;
    if (direction === 'up') {
        newVisibleIndex = (currentVisibleIndex - 1 + visibleItems.length) % visibleItems.length;
    } else {
        newVisibleIndex = (currentVisibleIndex + 1) % visibleItems.length;
    }

    return parseInt(visibleItems[newVisibleIndex].dataset.index, 10);
}


function changeChannel(direction) {
    const allItems = Array.from(playlistElement.querySelectorAll('li'));
    if (allItems.length === 0) return;

    let currentIndex = currentChannelIndex; // Use the globally tracked current channel index

    // Ensure the playlist is visible when changing channels with arrow keys
    if (!body.classList.contains('playlist-visible')) {
        showPlaylist();
    }

    const newIndex = findNextPlayableChannel(currentIndex, allItems, direction);

    if (newIndex !== -1) {
        allItems.forEach(item => item.classList.remove('selected'));
        const newSelectedElement = playlistElement.querySelector(`li[data-index="${newIndex}"]`);
        if (newSelectedElement) {
            newSelectedElement.classList.add('selected');
            newSelectedElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            newSelectedElement.click(); // Play the channel
        }
    }
}


function adjustVolume(direction) {
    let currentVolume = player.volume() * 100;

    if (direction === 'up') {
        currentVolume = Math.min(currentVolume + VOLUME_STEP, VOLUME_MAX);
    } else {
        currentVolume = Math.max(currentVolume - VOLUME_STEP, VOLUME_MIN);
    }

    player.volume(currentVolume / 100);

    showVolumeIndicator(currentVolume);
}

function showPlaylist() {
    const playlist = document.getElementById('playlist');
    playlist.style.transform = 'translateX(0)';
    playlist.style.opacity = '1';
    document.body.classList.add('playlist-visible');
}

function hidePlaylist() {
    const playlist = document.getElementById('playlist');
    playlist.style.transform = 'translateX(-100%)';
    playlist.style.opacity = '0';
    document.body.classList.remove('playlist-visible');
}

function showVolumeIndicator(volume) {
    const existingIndicator = document.querySelector('.volume-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    const indicator = document.createElement('div');
    indicator.className = 'volume-indicator';
    indicator.textContent = `Ses: ${Math.round(volume)}%`;
    document.body.appendChild(indicator);

    setTimeout(() => {
        indicator.remove();
    }, 1500); // Gösterim süresi (ms)
}

// Initial loads
loadPlaylistIntoSelector();

// If there's a current playlist selected and it exists, load it
if (currentPlaylistName && playlists[currentPlaylistName]) {
    displayPlaylist(playlists[currentPlaylistName]);
    if (playlists[currentPlaylistName].length > 0 && playlists[currentPlaylistName][currentChannelIndex]) {
        playChannel(playlists[currentPlaylistName][currentChannelIndex].url, currentChannelIndex);
    } else if (playlists[currentPlaylistName].length > 0) {
        // If currentChannelIndex is out of bounds, play the first channel
        playChannel(playlists[currentPlaylistName][0].url, 0);
    } else {
        showNoSourceMessage("Seçili oynatma listesinde kanal bulunamadı.");
    }
} else {
    // If no stored playlist or default channels.txt wasn't loaded, show initial message
    showNoSourceMessage("Lütfen bir oynatma listesi seçin veya yükleyin.");
}
