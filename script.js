document.addEventListener('DOMContentLoaded', () => {
    const channelListElement = document.getElementById('channel-list');
    const playerElement = document.getElementById('my-video');
    const channelMenu = document.getElementById('channel-menu');
    const playerOverlay = document.querySelector('.player-overlay');
    const playerLeftZone = document.getElementById('player-left-zone');
    const playerRightZone = document.getElementById('player-right-zone');
    const playerCenterZone = document.getElementById('player-center-zone');

    let player;
    let channels = [];
    let currentChannelIndex = -1;
    let menuVisible = false; // Menü görünür mü?
    let overlayTimer; // Overlay'i gizlemek için zamanlayıcı

    // Video.js player'ı başlat
    player = videojs(playerElement, {
        controls: true,
        autoplay: false,
        preload: 'auto',
        fluid: false,
        fill: true,
        playbackRates: [0.5, 1, 1.5, 2]
    });

    // M3U dosyasını çekme ve kanalları listeleme
    async function fetchM3UChannels(m3uUrl) {
        try {
            const response = await fetch(m3uUrl);
            if (!response.ok) {
                throw new Error(`M3U dosyası yüklenemedi: ${response.statusText}`);
            }
            const m3uText = await response.text();
            parseM3U(m3uText);
        } catch (error) {
            console.error('M3U dosyası yüklenirken hata oluştu:', error);
            channelListElement.innerHTML = `<li><a href="#">Kanallar yüklenirken hata oluştu.</a></li>`;
        }
    }

    // M3U metnini ayrıştırma
    function parseM3U(m3uText) {
        const lines = m3uText.split('\n');
        let tempChannels = [];
        let currentChannel = {};

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();

            if (line.startsWith('#EXTINF:')) {
                const nameMatch = line.match(/tvg-name="([^"]+)"|tvg-name='([^']+)'|([^,]+)$/);
                let channelName = "Bilinmeyen Kanal";
                if (nameMatch) {
                    channelName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).split(',').pop().trim();
                }
                currentChannel = { name: channelName, url: '' };
            } else if (line.startsWith('http')) {
                currentChannel.url = line;
                tempChannels.push(currentChannel);
            }
        }
        channels = tempChannels;
        displayChannels(channels);

        if (channels.length > 0) {
            currentChannelIndex = 0;
            playChannel(channels[currentChannelIndex].url, channels[currentChannelIndex].name);
            updateActiveChannelInMenu();
        }
    }

    // Kanalları menüye ekleme
    function displayChannels(channelsToDisplay) {
        channelListElement.innerHTML = '';
        channelsToDisplay.forEach((channel, index) => {
            const listItem = document.createElement('li');
            const link = document.createElement('a');
            link.href = '#';
            link.textContent = channel.name;
            link.dataset.index = index;

            link.addEventListener('click', (e) => {
                e.preventDefault();
                currentChannelIndex = parseInt(e.target.dataset.index);
                playChannel(channels[currentChannelIndex].url, channels[currentChannelIndex].name);
                updateActiveChannelInMenu();
                toggleMenu(false); // Kanal seçildiğinde menüyü gizle
            });
            listItem.appendChild(link);
            channelListElement.appendChild(listItem);
        });
    }

    // Kanalı oynatma fonksiyonu
    function playChannel(url, name) {
        console.log(`Oynatılıyor: ${name} (${url})`);
        player.src({
            src: url,
            type: 'application/x-mpegURL'
        });
        player.play();
        player.requestFullscreen(); // Kanal açıldığında tam ekrana geç
        // Player tam ekrana geçtiğinde overlay ve menü otomatik gizlenecek (fullscreenchange listener tarafından)
    }

    // Menüdeki aktif kanalı işaretle
    function updateActiveChannelInMenu() {
        channelListElement.querySelectorAll('li a').forEach(link => {
            link.classList.remove('active');
        });
        if (currentChannelIndex !== -1) {
            const activeLink = channelListElement.querySelector(`li a[data-index="${currentChannelIndex}"]`);
            if (activeLink) {
                activeLink.classList.add('active');
                activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // Menü görünürlüğünü kontrol et
    function toggleMenu(show) {
        if (show === undefined) {
            menuVisible = !menuVisible;
        } else {
            menuVisible = show;
        }

        if (menuVisible) {
            channelMenu.classList.add('visible');
        } else {
            channelMenu.classList.remove('visible');
        }
    }

    // Player overlay'i (tıklama bölgeleri) görünür yapan ve otomatik gizleme zamanlayıcısını başlatan fonksiyon
    function showOverlayAndResetTimer() {
        if (player.isFullscreen()) { // Sadece tam ekrandayken overlay'i göster
            playerOverlay.classList.add('active');
            clearTimeout(overlayTimer);
            overlayTimer = setTimeout(() => {
                playerOverlay.classList.remove('active');
            }, 5000); // 5 saniye sonra gizle
        }
    }


    // Player'ın tam ekran durumunu dinle
    player.on('fullscreenchange', () => {
        if (player.isFullscreen()) {
            // Tam ekrana geçildiğinde menüyü gizle ve overlay'i başlangıçta gizli tut
            toggleMenu(false);
            playerOverlay.classList.remove('active'); // Player üzerindeki etkileşim bölgelerini gizle
            clearTimeout(overlayTimer); // Olası timer'ları temizle
        } else {
            // Tam ekrandan çıkıldığında menüyü ve overlay'i gizli tut
            toggleMenu(false);
            playerOverlay.classList.remove('active');
            clearTimeout(overlayTimer);
        }
    });

    // Player üzerindeki tıklama bölgeleri
    playerLeftZone.addEventListener('click', () => {
        if (player.isFullscreen()) {
            showOverlayAndResetTimer(); // Overlay'i göster ve zamanlayıcıyı sıfırla

            // Önceki kanal
            if (channels.length > 0) {
                currentChannelIndex = (currentChannelIndex - 1 + channels.length) % channels.length;
                playChannel(channels[currentChannelIndex].url, channels[currentChannelIndex].name);
                updateActiveChannelInMenu();
            }
        }
    });

    playerRightZone.addEventListener('click', () => {
        if (player.isFullscreen()) {
            showOverlayAndResetTimer(); // Overlay'i göster ve zamanlayıcıyı sıfırla

            // Sonraki kanal
            if (channels.length > 0) {
                currentChannelIndex = (currentChannelIndex + 1) % channels.length;
                playChannel(channels[currentChannelIndex].url, channels[currentChannelIndex].name);
                updateActiveChannelInMenu();
            }
        }
    });

    playerCenterZone.addEventListener('click', () => {
        if (player.isFullscreen()) {
            showOverlayAndResetTimer(); // Overlay'i göster ve zamanlayıcıyı sıfırla
            toggleMenu(); // Menü görünürlüğünü aç/kapat
        }
    });


    // İlk yüklemede kanalları çek
    fetchM3UChannels('channels.txt');
});
