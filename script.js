// --- 1. UTILITIES ---
const formatRupiah = (num) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(num);

function parseRupiah(str) {
    return parseInt(str.replace(/[^0-9]/g, '')) || 0;
}

// --- 2. NAVIGATION LOGIC ---
function switchTab(tabId) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
    // Show target tab
    const target = document.getElementById(tabId);
    if(target) target.classList.add('active');
    
    // Update Nav Button Styles
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-blue-600', 'text-white', 'shadow-md');
        btn.classList.add('bg-slate-100', 'text-slate-600');
        if(btn.onclick.toString().includes(tabId)) {
            btn.classList.remove('bg-slate-100', 'text-slate-600');
            btn.classList.add('bg-blue-600', 'text-white', 'shadow-md');
        }
    });

    // Refresh canvas if denah is opened (fix render issues on tab switch)
    if(tabId === 'denah') {
        drawDenah();
    }
    if(tabId === 'pondasi') {
        drawPondasi();
    }
}

// --- 3. DASHBOARD & CHECKLIST ---
const defaultTasks = [
    "Survei Lokasi", "Pembersihan Lahan", "Galian Pondasi", "Pasang Pondasi", 
    "Pasang Sloof/Kolom", "Pasang Dinding", "Rangka Atap", "Plat Lantai", 
    "Kusen & Pintu", "Instalasi Listrik", "Instalasi Air", "Plester & Aci", "Cat & Finishing"
];

let tasks = JSON.parse(localStorage.getItem('civilPro_tasks')) || defaultTasks.map(t => ({name: t, done: false}));

function renderChecklist() {
    const container = document.getElementById('checklist-container');
    if(!container) return;
    
    container.innerHTML = tasks.map((t, i) => `
        <div class="flex items-center p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition" onclick="toggleTask(${i})">
            <div class="w-5 h-5 rounded border ${t.done ? 'bg-green-500 border-green-500' : 'border-slate-300'} flex items-center justify-center mr-3 text-white text-xs">
                ${t.done ? '✓' : ''}
            </div>
            <span class="${t.done ? 'line-through text-slate-400' : 'text-slate-700'}">${t.name}</span>
        </div>
    `).join('');
    updateProgress();
    localStorage.setItem('civilPro_tasks', JSON.stringify(tasks));
}

function toggleTask(idx) {
    tasks[idx].done = !tasks[idx].done;
    renderChecklist();
    updateDashboard();
}

function resetChecklist() {
    if(confirm('Reset checklist proyek?')) {
        tasks = defaultTasks.map(t => ({name: t, done: false}));
        renderChecklist();
        updateDashboard();
    }
}

function updateProgress() {
    const done = tasks.filter(t => t.done).length;
    const pct = Math.round((done / tasks.length) * 100);
    const elProgress = document.getElementById('dash-progress');
    const elBar = document.getElementById('dash-progress-bar');
    
    if(elProgress) elProgress.innerText = pct + '%';
    if(elBar) elBar.style.width = pct + '%';
}

// --- 4. DENAH RUMAH ---
let rooms = JSON.parse(localStorage.getItem('civilPro_rooms')) || [];
const canvas = document.getElementById('blueprintCanvas');
const ctx = canvas ? canvas.getContext('2d') : null;
const SCALE = 20; // 1m = 20px

function drawDenah() {
    if(!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Grid lines
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    for(let i=0; i<canvas.width; i+=SCALE) { ctx.beginPath(); ctx.moveTo(i,0); ctx.lineTo(i,canvas.height); ctx.stroke(); }
    for(let i=0; i<canvas.height; i+=SCALE) { ctx.beginPath(); ctx.moveTo(0,i); ctx.lineTo(canvas.width,i); ctx.stroke(); }

    let totalLuas = 0;
    let totalBiaya = 0;
    const list = document.getElementById('room-list');
    if(list) list.innerHTML = '';
    
    let curX = 20, curY = 20, maxY = 0;

    rooms.forEach((r, i) => {
        const w = r.p * SCALE;
        const h = r.l * SCALE;
        const luas = r.p * r.l;
        const biaya = luas * r.cost;

        totalLuas += luas;
        totalBiaya += biaya;

        // Draw Room
        ctx.fillStyle = i % 2 === 0 ? '#bfdbfe' : '#ddd6fe';
        ctx.fillRect(curX, curY, w, h);
        ctx.strokeStyle = '#334155';
        ctx.strokeRect(curX, curY, w, h);
        
        // Text
        ctx.fillStyle = '#0f172a';
        ctx.font = '10px sans-serif';
        ctx.fillText(r.name, curX + 5, curY + 15);
        ctx.fillText(`${r.p}x${r.l}`, curX + 5, curY + 28);

        // Add to list
        if(list) {
            const li = document.createElement('li');
            li.className = "flex justify-between border-b border-slate-100 py-1";
            li.innerHTML = `<span>${r.name} (${r.p}x${r.l})</span> <button onclick="delRoom(${i})" class="text-red-500 text-xs">Hapus</button>`;
            list.appendChild(li);
        }

        curX += w + 10;
        if(curX > canvas.width - 100) { 
            curX = 20; curY += maxY + 10; maxY = 0; 
        } else {
            maxY = Math.max(maxY, h);
        }
    });

    const elLuas = document.getElementById('denah-luas');
    const elBiaya = document.getElementById('denah-biaya');
    if(elLuas) elLuas.innerText = totalLuas.toFixed(2) + ' m²';
    if(elBiaya) elBiaya.innerText = formatRupiah(totalBiaya);
    
    updateDashboard();
}

function addRoom() {
    const elName = document.getElementById('room-name');
    const elP = document.getElementById('room-p');
    const elL = document.getElementById('room-l');
    const elCost = document.getElementById('room-cost');

    if(elP && elL && elCost && elName) {
        const name = elName.value || "Ruang";
        const p = parseFloat(elP.value) || 0;
        const l = parseFloat(elL.value) || 0;
        const cost = parseFloat(elCost.value) || 0;
        
        if(p && l) {
            rooms.push({name, p, l, cost});
            localStorage.setItem('civilPro_rooms', JSON.stringify(rooms));
            drawDenah();
        }
    }
}

function clearRooms() {
    if(confirm("Hapus semua denah?")) {
        rooms = [];
        localStorage.setItem('civilPro_rooms', JSON.stringify(rooms));
        drawDenah();
    }
}

function delRoom(idx) {
    rooms.splice(idx,1);
    localStorage.setItem('civilPro_rooms', JSON.stringify(rooms));
    drawDenah();
}

// --- 5. INSTALASI LISTRIK ---
let elecRows = JSON.parse(localStorage.getItem('civilPro_elec')) || [
    {name: "Kabel NYM 3x2.5mm", qty: 50, price: 12000},
    {name: "Stop Kontak", qty: 10, price: 25000},
    {name: "Saklar 1 Gang", qty: 8, price: 15000},
    {name: "Lampu LED", qty: 8, price: 35000}
];

function renderElecTable() {
    const tbody = document.getElementById('elec-table-body');
    if(!tbody) return;
    
    tbody.innerHTML = elecRows.map((r, i) => `
        <tr class="border-b">
            <td class="p-2"><input type="text" value="${r.name}" onchange="updateElec(${i}, 'name', this.value)" class="w-full border p-1 rounded"></td>
            <td class="p-2"><input type="number" value="${r.qty}" onchange="updateElec(${i}, 'qty', this.value)" class="w-full border p-1 rounded"></td>
            <td class="p-2"><input type="number" value="${r.price}" onchange="updateElec(${i}, 'price', this.value)" class="w-full border p-1 rounded"></td>
            <td class="p-2 font-bold">${formatRupiah(r.qty * r.price)}</td>
            <td class="p-2 text-center"><button onclick="delElecRow(${i})" class="text-red-500">X</button></td>
        </tr>
    `).join('');
    calcElecTotal();
}

function addElecRow() {
    elecRows.push({name: "Item Baru", qty: 1, price: 0});
    localStorage.setItem('civilPro_elec', JSON.stringify(elecRows));
    renderElecTable();
}

function updateElec(idx, field, val) {
    elecRows[idx][field] = field === 'name' ? val : parseFloat(val);
    localStorage.setItem('civilPro_elec', JSON.stringify(elecRows));
    renderElecTable();
}

function delElecRow(idx) {
    elecRows.splice(idx,1);
    localStorage.setItem('civilPro_elec', JSON.stringify(elecRows));
    renderElecTable();
}

function calcElecTotal() {
    const total = elecRows.reduce((acc, r) => acc + (r.qty * r.price), 0);
    const elTotal = document.getElementById('elec-total');
    if(elTotal) elTotal.innerText = formatRupiah(total);
    updateDashboard();
}

// --- 6. RAB BANGUNAN ---
function hitungBangunan() {
    const elPanjang = document.getElementById('b-panjang');
    const elLebar = document.getElementById('b-lebar');
    const elTinggi = document.getElementById('b-tinggi');
    const elLuasPlat = document.getElementById('b-luas-plat');

    const hBeton = parseFloat(document.getElementById('h-beton').value) || 0;
    const hBesi = parseFloat(document.getElementById('h-besi').value) || 0;
    const hSemen = parseFloat(document.getElementById('h-semen').value) || 0;
    const hPasir = parseFloat(document.getElementById('h-pasir').value) || 0;
    const hKeramik = parseFloat(document.getElementById('h-keramik').value) || 0;
    const hCat = parseFloat(document.getElementById('h-cat').value) || 0;

    const p = elPanjang ? parseFloat(elPanjang.value) : 0;
    const l = elLebar ? parseFloat(elLebar.value) : 0;
    const t = elTinggi ? parseFloat(elTinggi.value) : 0;
    const luasPlat = elLuasPlat ? parseFloat(elLuasPlat.value) : 0;

    // Estimasi Sederhana
    const luasLantai = p * l;
    const keliling = 2 * (p + l);
    const luasDinding = keliling * t;
    
    // 1. Struktur
    const volBeton = luasPlat * 0.12; // asumsi tebal 12cm
    const besi = volBeton * 100; // asumsi 100kg/m3
    const biayaBeton = volBeton * hBeton;
    const biayaBesi = besi * hBesi;
    const totalStruktur = biayaBeton + biayaBesi;

    // 2. Dinding (Rough Est)
    const volDinding = luasDinding * 0.15; // tebal 15cm
    const semenD = volDinding * 6; // 6 sak/m3
    const pasirD = volDinding * 0.8; // 0.8 m3/m3
    const totalDinding = (semenD * hSemen) + (pasirD * hPasir);

    // 3. Finishing
    const biayaKeramik = luasLantai * hKeramik;
    const biayaCat = (luasDinding * 2 + luasLantai) * hCat; // 2 sisi dinding + plafon
    const totalFinishing = biayaKeramik + biayaCat;

    const grandTotal = totalStruktur + totalDinding + totalFinishing;

    const elResStruktur = document.getElementById('res-struktur');
    const elResDinding = document.getElementById('res-dinding');
    const elResFinishing = document.getElementById('res-finishing');
    const elResTotal = document.getElementById('res-total-bangunan');

    if(elResStruktur) elResStruktur.innerText = formatRupiah(totalStruktur);
    if(elResDinding) elResDinding.innerText = formatRupiah(totalDinding);
    if(elResFinishing) elResFinishing.innerText = formatRupiah(totalFinishing);
    if(elResTotal) elResTotal.innerText = formatRupiah(grandTotal);

    updateDashboard();
}

// --- 7. PONDASI VISUAL ---
function drawPondasi() {
    const elLA = document.getElementById('p-la');
    const elLB = document.getElementById('p-lb');
    const elT = document.getElementById('p-t');
    const elAan = document.getElementById('p-aan');

    if(!elLA || !elLB || !elT) return;

    const la = parseFloat(elLA.value) || 30;
    const lb = parseFloat(elLB.value) || 60;
    const t = parseFloat(elT.value) || 70;
    const aan = elAan ? elAan.checked : false;
    
    const s = 1.5; // scale
    const cx = 150; const by = 180;
    
    let svg = `<svg width="300" height="220">`;
    
    // Tanah
    svg += `<rect x="0" y="${by}" width="300" height="20" fill="#8B4513" opacity="0.2"/>`;
    
    // Pondasi
    const py = by;
    const topW = la * s; const botW = lb * s; const ponH = t * s;
    svg += `<polygon points="${cx-botW/2},${py} ${cx+botW/2},${py} ${cx+topW/2},${py-ponH} ${cx-topW/2},${py-ponH}" fill="#64748b" stroke="#334155"/>`;
    svg += `<text x="${cx}" y="${py-ponH-10}" text-anchor="middle" font-size="10" fill="#2563eb">${la}cm</text>`;
    svg += `<text x="${cx}" y="${by+15}" text-anchor="middle" font-size="10" fill="#2563eb">${lb}cm</text>`;
    svg += `</svg>`;
    
    const container = document.getElementById('pondasi-svg-container');
    if(container) container.innerHTML = svg;
}

function hitungPondasi() {
    const la = parseFloat(document.getElementById('p-la').value) / 100;
    const lb = parseFloat(document.getElementById('p-lb').value) / 100;
    const t = parseFloat(document.getElementById('p-t').value) / 100;
    const p = parseFloat(document.getElementById('p-p').value);
    
    const hBatu = parseFloat(document.getElementById('hp-batu').value);
    const hSemen = parseFloat(document.getElementById('hp-semen').value);

    const vol = ((la + lb) / 2) * t * p;
    const volBatu = vol * 0.7; // 70% batu
    const volSpesi = vol * 0.3; // 30% spesi
    
    // Asumsi 1 sak semen = 0.024 m3 mortar
    const sakSemen = Math.ceil(volSpesi / 0.024);

    const biaya = (volBatu * hBatu) + (sakSemen * hSemen);

    const elVol = document.getElementById('res-vol');
    const elBatu = document.getElementById('res-batu');
    const elSemen = document.getElementById('res-semen');
    const elTotal = document.getElementById('res-total-pondasi');

    if(elVol) elVol.innerText = vol.toFixed(2) + " m³";
    if(elBatu) elBatu.innerText = volBatu.toFixed(2) + " m³";
    if(elSemen) elSemen.innerText = sakSemen + " Sak";
    if(elTotal) elTotal.innerText = formatRupiah(biaya);

    updateDashboard();
}

// --- 8. AGGREGATOR & PWA INIT ---
function updateDashboard() {
    // Get Elec Total
    const elecTotal = elecRows.reduce((acc, r) => acc + (r.qty * r.price), 0);
    
    // Get Denah Total
    const denahTotal = rooms.reduce((acc, r) => acc + (r.p * r.l * r.cost), 0);

    // Get Building Total (Grab from DOM text)
    const bText = document.getElementById('res-total-bangunan') ? document.getElementById('res-total-bangunan').innerText : "Rp 0";
    const bTotal = parseRupiah(bText);

    // Get Pondasi Total
    const pText = document.getElementById('res-total-pondasi') ? document.getElementById('res-total-pondasi').innerText : "Rp 0";
    const pTotal = parseRupiah(pText);

    const grandTotal = elecTotal + denahTotal + bTotal + pTotal;
    
    const elDashTotal = document.getElementById('dash-total');
    const elDashItems = document.getElementById('dash-items');

    if(elDashTotal) elDashTotal.innerText = formatRupiah(grandTotal);
    if(elDashItems) elDashItems.innerText = rooms.length + elecRows.length;
}

// PWA SERVICE WORKER REGISTRATION & INSTALL PROMPT
window.addEventListener('load', () => {
    // 1. Register Service Worker
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then((registration) => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            }, (err) => {
                console.log('ServiceWorker registration failed: ', err);
            });
    }

    // 2. Handle Install Prompt (Add to Home Screen)
    let deferredPrompt;
    const installBtn = document.getElementById('btn-install-pwa'); // Pastikan Anda punya tombol ini di HTML jika ingin custom prompt, atau biarkan browser handle default.
    
    window.addEventListener('beforeinstallprompt', (e) => {
        console.log('beforeinstallprompt fired');
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;

        // Update UI notify the user they can add to home screen
        // if(installBtn) installBtn.style.display = 'block';
    });

    // if(installBtn) {
    //     installBtn.addEventListener('click', (e) => {
    //         // Show the prompt
    //         deferredPrompt.prompt();
    //         // Wait for the user to respond to the prompt
    //         deferredPrompt.userChoice.then((choiceResult) => {
    //             if (choiceResult.outcome === 'accepted') {
    //                 console.log('User accepted the A2HS prompt');
    //             } else {
    //                 console.log('User dismissed the A2HS prompt');
    //             }
    //             deferredPrompt = null;
    //         });
    //     });
    // }

    // --- INIT APP LOGIC ---
    switchTab('dashboard');
    renderChecklist();
    drawDenah();
    renderElecTable();
    drawPondasi();
    hitungPondasi();
});
