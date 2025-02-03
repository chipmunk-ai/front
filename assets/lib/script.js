const API_URL = "https://chipmunk-server-996773634150.us-central1.run.app"
let isProcessing = 0;

document.querySelector('.send-button').addEventListener('click', sendMessage);
document.querySelector('.chat-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        sendMessage();
    }
});

async function sendMessage() {
    if (isProcessing) return;
    
    const input = document.querySelector('.chat-input');
    const message = input.value.trim();
    const sendButton = document.querySelector('.send-button');
    
    if (message) {
        isProcessing = true;
        addMessage('user', message);
        input.value = '';
        
        sendButton.disabled = true;
        
        try {
            const response = await fetch(`${API_URL}/generate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ prompt: message })
            });
            
            const data = await response.json();

            if (data.response) {
                addMessage('bot', data.response);
            }
        } catch (error) {
            console.error('Error:', error);
            addMessage('bot', 'Something went wrong.');
        } finally {
            isProcessing = false;
            sendButton.disabled = false;
        }
    }
}

function addMessage(role, content) {
    const history = document.querySelector('.chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'msg';
    
    
    msgDiv.innerHTML = `
        <div class="message ${role}-message">${content}</div>
    `;
    
    history.appendChild(msgDiv);
    history.scrollTop = history.scrollHeight;
}

let zoom_allowed = 1;
const strikeHistory = [];
const homerunHistory = [];


window.addEventListener('load', async () => {
    try {
        const loadingContainer = document.getElementById('loadingContainer');
        loadingContainer.style.display = 'flex';

        const response = await fetch(`${API_URL}/init`);
        if (!response.ok) {
            if (response.status === 404) {
                alert('Today match not found!');
                return;
            }
            throw new Error('Init request failed');
        }
        
        setInterval(fetchGameData, 360000);
        await fetchGameData();
        await startLive();
    } catch (error) {
        console.error('Init error:', error);
    } finally {
        const loadingContainer = document.getElementById('loadingContainer');
        loadingContainer.style.display = 'none';
    }
});

async function fetchGameData() {
    try {
        const response = await fetch(`${API_URL}/init`);
        if (!response.ok) throw new Error('Game data request failed');
        
        const data = await response.json();
        if (data.players) {
            updatePlayersTable(data);
        }

        document.querySelector('#venuePopup h3').innerHTML = data.venue.name;
        document.querySelector('#venuePopup .map').innerHTML = `<iframe src="https://maps.google.com/maps?q=${data.venue.lat},${data.venue.long}&hl=es;z=14&amp;output=embed"></iframe>`;

    } catch (error) {
        console.error('Error fetching game data:', error);
    }
}

function updatePlayersTable(data) {
    const playersPopup = document.getElementById('playersPopup');
    const table = document.createElement('table');
    table.className = 'players-table';
    
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = `
        <th>Away: ${data.away_team}</th>
        <th>Home: ${data.home_team}</th>
    `;
    table.appendChild(headerRow);
    
    const maxPlayers = Math.max(data.players.away.length, data.players.home.length);
    
    for (let i = 0; i < maxPlayers; i++) {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data.players.away[i]?.name || ''}</td>
            <td>${data.players.home[i]?.name || ''}</td>
        `;
        table.appendChild(row);
    }
    
    const existingTable = playersPopup.querySelector('.players-table');
    if (existingTable) {
        existingTable.remove();
    }
    playersPopup.querySelector('.popup-content').appendChild(table);
}

const socket = io(API_URL);

socket.on("connect", () => {
    console.log("Connected to server");
});

socket.on("mlb_event", (data) => {
    const liveEvents = document.querySelector('.live-events');
    
    liveEvent = data.event.replace('_', '');
    liveEvents.querySelector('.event').innerHTML = data.des;
    liveEvents.querySelector('.status').innerHTML = liveEvent;
    liveEvents.querySelector('.guess').innerHTML = data.guess === 1 ? liveEvent : '<span style="color:red">not ' + liveEvent + '</span>';
    liveEvents.classList.add('visible');
    setTimeout(() => {
        liveEvents.classList.remove('visible');
    }, 5000);

    if (liveEvent === 'strikeout') {
        strikeHistory.push(data.des);
        updatePopupContent('strike', strikeHistory);
    } else if (liveEvent === 'homerun') {
        homerunHistory.push(data.des);
        updatePopupContent('homerun', homerunHistory);
    }
});

function updatePopupContent(type, events) {
    const listElement = document.querySelector(`#${type}Popup .list`);
    listElement.innerHTML = events.map(event => `
        <div class="event-item">
            <span class="event-time">${new Date().toLocaleTimeString()}</span>
            <span class="event-description">${event}</span>
        </div>
    `).join('');
}

function startLive() {
    fetch(`${API_URL}/live`)
        .then(response => response.json())
        .then(data => console.log(data.message))
        .catch(error => console.error("Error starting live stream:", error));
}


const scene = new THREE.Scene();
const canvas = document.createElement('canvas');
canvas.width = 1;
canvas.height = 512;
const context = canvas.getContext('2d');

const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
gradient.addColorStop(0, '#0C1445'); // Üstteki renk
gradient.addColorStop(1, '#004e92'); // Alttaki renk
context.fillStyle = gradient;
context.fillRect(0, 0, canvas.width, canvas.height);

// Texture'i oluştur ve sahneye uygula
const gradientTexture = new THREE.CanvasTexture(canvas);
scene.background = gradientTexture;

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Dünya için küre oluştur
const geometry = new THREE.SphereGeometry(5, 32, 32);

// Texture'ları yükle
const textureLoader = new THREE.TextureLoader();
const texture = textureLoader.load('./assets/img/baseball_stadium_texture.jpg');
const normalMap = textureLoader.load('./assets/img/baseball_stadium_normal.jpg')

//Texture keskinliği arttırıyoruz
texture.anisotropy = 16;
normalMap.anisotropy = 16;

const textureScale = 1; // Texture'ları küçültmek için bu değeri artırın
// Materyali oluştur
const material = new THREE.MeshStandardMaterial({
    map: texture, // Ana texture
    normalMap: normalMap,
    normalScale: new THREE.Vector2(0.1, 0.1)
});

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// Işık ekle (beyaz renk)
const light = new THREE.DirectionalLight(0xffffff, 1); // Beyaz renk (0xffffff)
light.position.set(10, 10, 10);
scene.add(light);

// Ambient light ekle (beyaz renk)
const ambientLight = new THREE.AmbientLight(0x404040, 0.5); // Beyaz renk (0x404040)
scene.add(ambientLight);

// Kamera pozisyonu
camera.position.z = 15;

// Daha akıcı dönüş için
const controls = {
    isDragging: false,
    previousMousePosition: { x: 0, y: 0 },
    rotationSpeed: 0.002, // Daha yavaş ve kontrollü
    inertia: 0.9 // Atalet efekti
};

let targetRotationX = 0;
let targetRotationY = 0;

// Fare olayları
document.addEventListener('mousedown', function(e) {
    if (e.button === 2) { // Sağ tık
        controls.isDragging = true;
    }
});

document.addEventListener('mouseup', function() {
    controls.isDragging = false;
});

document.addEventListener('mousemove', function(e) {
    if (controls.isDragging) {
        const deltaX = e.offsetX - controls.previousMousePosition.x;
        const deltaY = e.offsetY - controls.previousMousePosition.y;

        targetRotationY += deltaX * controls.rotationSpeed;
        targetRotationX += deltaY * controls.rotationSpeed;

        // Dönüş açılarını sınırla
        targetRotationX = Math.max(-Math.PI/2, Math.min(Math.PI/2, targetRotationX));
    }

    controls.previousMousePosition = {
        x: e.offsetX,
        y: e.offsetY
    };
});

// Sağ tık menüsünü engelle
document.addEventListener('contextmenu', function(e) {
    e.preventDefault();
});

document.addEventListener('wheel', function(e) {
    // Eğer herhangi bir popup açıksa zoom yapma
    const isAnyPopupOpen = Object.values(iconPopups).some(popup => popup.style.display === 'block') || 
            document.getElementById('mediaPlayer').style.display === 'block';

    
    if (!isAnyPopupOpen && zoom_allowed) {
        camera.position.z += e.deltaY * 0.01;
    }
});

// Yardımcı fonksiyon
function toRadians(angle) {
    return angle * (Math.PI / 180);
}

// İkonları yükle
const playersIcon = textureLoader.load('./assets/img/players_icon.png');
const strikeIcon = textureLoader.load('./assets/img/strike_icon.png');
const homerunIcon = textureLoader.load('./assets/img/homerun_icon.png');
const venueIcon = textureLoader.load('./assets/img/pin.png');
const videoIcon = textureLoader.load('./assets/img/video_icon.png');

// İkonları oluştur ve dünya yüzeyine yerleştir
const iconPositions = [];
const iconSize = 0.5;

// Iconların minimum mesafesini kontrol et
const MIN_DISTANCE = 3; // Iconlar arası minimum mesafeyi daha da artırdık

function createIcon(texture, position) {
    const iconGeometry = new THREE.PlaneGeometry(iconSize, iconSize);
    const iconMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide
    });
    const icon = new THREE.Mesh(iconGeometry, iconMaterial);
    icon.position.copy(position);
    icon.userData = { isIcon: true }; // Kamera takibi için işaretle
    return icon;
}

// İkonlar için rastgele konumlar oluştur
const iconTextures = [playersIcon, strikeIcon, homerunIcon, venueIcon]; // videoIcon'u buradan kaldırdık
iconTextures.forEach(texture => {
    const position = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
    ).normalize().multiplyScalar(5.3);
    
    const adjustedPosition = adjustPosition(position, iconPositions);
    const icon = createIcon(texture, adjustedPosition);
    sphere.add(icon);
});

// Video iconunu oluştur
const videoIconMesh = createIcon(videoIcon, new THREE.Vector3(0, 0, 5.3));
videoIconMesh.userData = { isIcon: true, type: 'video' }; // Tıklanabilir olduğunu işaretle
sphere.add(videoIconMesh);

// Media player elementlerini seç
const mediaPlayer = document.getElementById('mediaPlayer');
const closeMediaPlayer = document.getElementById('closeMediaPlayer');

// Raycaster oluştur
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

// Iconlar için pop-up işlevselliği
const iconPopups = {
    players: document.getElementById('playersPopup'),
    strike: document.getElementById('strikePopup'),
    homerun: document.getElementById('homerunPopup'),
    venue: document.getElementById('venuePopup')
};

// Tüm pop-up'ları kapat
function closeAllPopups() {
    Object.values(iconPopups).forEach(popup => {
        popup.style.display = 'none';
    });
}

// Tıklama olayı güncellemesi
document.addEventListener('click', function(event) {
    // Mouse pozisyonunu normalleştir
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    
    // Raycaster'ı güncelle
    raycaster.setFromCamera(mouse, camera);
    
    // Kesişimleri kontrol et
    const intersects = raycaster.intersectObjects(sphere.children);
    
    if (intersects.length > 0) {
        const clickedObject = intersects[0].object;
        console.log('Clicked Object:', clickedObject); // Debug için log ekleyelim
        if (clickedObject.userData && clickedObject.userData.isIcon) {
            closeAllPopups();
            if (clickedObject.material.map === playersIcon) {
                iconPopups.players.style.display = 'block';
            } else if (clickedObject.material.map === strikeIcon) {
                iconPopups.strike.style.display = 'block';
            } else if (clickedObject.material.map === homerunIcon) {
                iconPopups.homerun.style.display = 'block';
            } else if (clickedObject.material.map === venueIcon) {
                iconPopups.venue.style.display = 'block';
            } else if (clickedObject.material.map === videoIcon) {
                // Video iconuna tıklandığında medya player'ı aç
                const mediaPlayer = document.getElementById('mediaPlayer');
                mediaPlayer.style.display = 'block';
                console.log('Media Player Opened'); // Debug için log ekleyelim
            }
        }
    }
});

// Pop-up'ları kapatma işlevselliği
document.querySelectorAll('.close-popup').forEach(button => {
    button.addEventListener('click', closeAllPopups);
});

// Animasyon döngüsü
function animate() {
    requestAnimationFrame(animate);
    
    // Dünya döndükçe ikonlar da dönecek
    sphere.rotation.x += (targetRotationX - sphere.rotation.x) * (1 - controls.inertia);
    sphere.rotation.y += (targetRotationY - sphere.rotation.y) * (1 - controls.inertia);
    
    // İkonların sürekli kameraya bakmasını sağla
    sphere.children.forEach(child => {
        if (child.userData) {
            child.lookAt(camera.position);
        }
    });
    
    renderer.render(scene, camera);
}
animate();


// Iconların konumlarını kontrol et ve çakışmaları önle
function adjustPosition(position, existingPositions) {
    let adjustedPosition = position.clone();
    let attempts = 0;
    
    while (attempts < 100) {
        let tooClose = false;
        
        for (const existingPos of existingPositions) {
            if (adjustedPosition.distanceTo(existingPos) < MIN_DISTANCE) {
                tooClose = true;
                // Daha büyük ve daha kontrollü bir kaydırma miktarı
                const offset = new THREE.Vector3(
                    (Math.random() - 0.5) * 0.3, // X ekseninde daha büyük kaydırma
                    (Math.random() - 0.5) * 0.3, // Y ekseninde daha büyük kaydırma
                    (Math.random() - 0.5) * 0.3  // Z ekseninde daha büyük kaydırma
                );
                adjustedPosition.add(offset);
                // Küre yüzeyinde kalmasını sağla
                adjustedPosition.normalize().multiplyScalar(5.1);
                break;
            }
        }
        
        if (!tooClose) {
            existingPositions.push(adjustedPosition); // Yeni konumu kaydet
            break;
        }
        
        attempts++;
    }
    
    return adjustedPosition;
}

// Chatbot açma/kapatma işlevselliği
const chatbotContainer = document.querySelector('.chatbot-container');
const logoContainer = document.querySelector('.logo-container');

// Chatbot'u kapat
document.querySelector('.close-chatbot').addEventListener('click', () => {
    chatbotContainer.style.display = 'none';
});

// Logoya tıklayarak chatbot'u aç
logoContainer.addEventListener('click', () => {
    chatbotContainer.style.display = 'flex';
});

// Medya player'ı kapat
document.getElementById('closeMediaPlayer').addEventListener('click', () => {
    const mediaPlayer = document.getElementById('mediaPlayer');
    mediaPlayer.style.display = 'none';
});

chatbotContainer.addEventListener('mouseover', () => {
    zoom_allowed = 0;
});

chatbotContainer.addEventListener('mouseout', () => {
    zoom_allowed = 1;
});

function preventZoom(event) {
  event.preventDefault();
}