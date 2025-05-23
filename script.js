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
        autoplay: false, // İlk açılışta otomatik oynatma pasif
        preload: 'auto',
        fluid: false, // İlk başta fluid olmasın, tam ekran olunca CSS ile yönetilecek
        fill: true, // Kontrol çubuğu vs. olmadan video elementini doldurur
        playbackRates: [0.5, 1, 1.5, 2]
    });

    // Player hazır olduğunda
    player.on('ready', () => {
        // Player'ın boyutu, menü açıkken de doğru olması için
        // `fluid: true` yerine CSS ile width/height 100% verildi.
        // Fullscreen'e geçişte bu ayar otomatik olarak işler.
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
                // Kanal adını ve varsa diğer bilgileri al
                const nameMatch = line.match(/tvg-name="([^"]+)"|tvg-name='([^']+)'|([^,]+)$/);
                let channelName = "Bilinmeyen Kanal";
                if (nameMatch) {
                    channelName = (nameMatch[1] || nameMatch[2] || nameMatch[3]).split(',').pop().trim();
                }
                currentChannel = { name: channelName, url: '' };
            } else if (line.startsWith('http')) {
                // Kanal URL'si
                currentChannel.url = line;
                tempChannels.push(currentChannel);
            }
        }
        channels = tempChannels; // Kanalları global değişkene ata
        displayChannels(channels);

        // Sayfa yüklendiğinde ilk kanalı otomatik oynat (isteğe bağlı)
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
            link.dataset.index = index; // Kanalın indeksini sakla

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
            type: 'application/x-mpegURL' // HLS (m3u8) için doğru type
        });
        player.play();
        player.requestFullscreen(); // Kanal açıldığında tam ekrana geç
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
                // Aktif kanala kaydır (varsa)
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
            playerOverlay.classList.add('active'); // Overlay'i aktif et
            resetOverlayTimer();
        } else {
            channelMenu.classList.remove('visible');
            clearTimeout(overlayTimer);
            // Menü kapanırken overlay'i hemen gizle
            playerOverlay.classList.remove('active');
        }
    }

    // Overlay'i otomatik gizleme zamanlayıcısı
    function resetOverlayTimer() {
        clearTimeout(overlayTimer);
        // Menü kapanmıyorsa (yani player controls active değilse) ve player tam ekrandaysa
        if (player.isFullscreen()) {
            overlayTimer = setTimeout(() => {
                playerOverlay.classList.remove('active');
            }, 5000); // 5 saniye sonra gizle
        }
    }


    // Player'ın tam ekran durumunu dinle
    player.on('fullscreenchange', () => {
        if (player.isFullscreen()) {
            // Tam ekrana geçildiğinde menüyü gizle
            toggleMenu(false);
            playerOverlay.classList.remove('active'); // Player üzerindeki etkileşim bölgelerini gizle
        } else {
            // Tam ekrandan çıkıldığında menüyü göster (isteğe bağlı, önceki durumuna göre değişebilir)
            // Varsayılan olarak menü gizli kalsın, tekrar tıklayınca açılır
            toggleMenu(false);
            playerOverlay.classList.remove('active');
        }
    });

    // Player üzerindeki tıklama bölgeleri
    playerLeftZone.addEventListener('click', () => {
        if (player.isFullscreen()) {
            clearTimeout(overlayTimer); // Zamanlayıcıyı sıfırla
            playerOverlay.classList.add('active'); // Aktif yap (yeni tıklama olduğu için)
            resetOverlayTimer(); // Yeni zamanlayıcı başlat

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
            clearTimeout(overlayTimer); // Zamanlayıcıyı sıfırla
            playerOverlay.classList.add('active'); // Aktif yap
            resetOverlayTimer(); // Yeni zamanlayıcı başlat

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
            clearTimeout(overlayTimer); // Zamanlayıcıyı sıfırla
            playerOverlay.classList.add('active'); // Aktif yap
            resetOverlayTimer(); // Yeni zamanlayıcı başlat

            toggleMenu(); // Menü görünürlüğünü aç/kapat
        }
    });

    // İlk yüklemede kanalları çek
    // channels.txt dosyasının aynı dizinde olduğundan emin olun
    fetchM3UChannels('channels.txt');
});