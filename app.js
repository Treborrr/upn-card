// ===== Constants =====
const MONTHS_ES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
];
const PROGRAM_OPTIONS = ['Pregrado', 'EPE'];
const STORAGE_KEYS = {
    name: 'upn_student_name',
    career: 'upn_student_career',
    program: 'upn_program_type',
    photo: 'upn_student_photo'
};

// Default values (match the original image exactly)
const DEFAULTS = {
    name: 'VALERIE NARVA OLAYA',
    career: 'Educación y Gest. del Aprend.',
    program: 'Pregrado'
};

// ===== DOM Elements =====
const clockEl = document.getElementById('realClock');
const dateEl = document.getElementById('currentDate');
const nameEl = document.getElementById('studentName');
const careerEl = document.getElementById('studentCareer');
const programTypeEl = document.getElementById('programType');
const programToggleEl = document.getElementById('programToggle');
const barcodeCanvas = document.getElementById('barcode');
const avatarContainer = document.getElementById('avatarContainer');
const avatarCircle = document.getElementById('avatarCircle');
const photoInput = document.getElementById('photoInput');
const avatarSvg = document.getElementById('avatarSvg');
const avatarPhoto = document.getElementById('avatarPhoto');

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', () => {
    loadSavedData();
    startClock();
    updateDate();
    drawBarcode();
    setupEditableFields();
    setupProgramToggle();
    setupPhotoUpload();
    registerServiceWorker();
    showEditHint();
});

// ===== Real-time Clock =====
function startClock() {
    function tick() {
        const now = new Date();
        const h = String(now.getHours()).padStart(2, '0');
        const m = String(now.getMinutes()).padStart(2, '0');
        const s = String(now.getSeconds()).padStart(2, '0');
        clockEl.textContent = h + ':' + m + ':' + s;
    }
    tick();
    setInterval(tick, 1000);
}

// ===== Date =====
function updateDate() {
    const now = new Date();
    const day = now.getDate();
    const month = MONTHS_ES[now.getMonth()];
    const year = now.getFullYear();
    dateEl.textContent = day + ' ' + month + ' ' + year;
}

// ===== Barcode Generator =====
function drawBarcode() {
    const canvas = barcodeCanvas;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || 220;
    const displayHeight = rect.height || 65;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, displayWidth, displayHeight);

    // Realistic barcode pattern (alternating bar/space widths in units)
    var pattern = [
        2,1,1,2,3,2, 1,1,2,1,1,3, 2,1,1,1,1,2,
        3,1,1,1,2,2, 1,1,3,1,2,1, 1,2,1,1,2,3,
        1,1,2,1,1,1, 3,2,1,1,2,1, 2,3,1,1,2,1,
        1,2,1,3,2,1, 1,1,2,1,1,3, 1,2,1,1,2,1
    ];

    var totalUnits = 0;
    for (var i = 0; i < pattern.length; i++) totalUnits += pattern[i];

    var padX = 12;
    var barAreaWidth = displayWidth - padX * 2;
    var unitWidth = barAreaWidth / totalUnits;
    var barHeight = displayHeight - 8;
    var x = padX;

    for (var j = 0; j < pattern.length; j++) {
        var w = pattern[j] * unitWidth;
        if (j % 2 === 0) {
            ctx.fillStyle = '#000000';
            ctx.fillRect(x, 4, w + 0.5, barHeight);
        }
        x += w;
    }
}

// ===== Photo Upload =====
function setupPhotoUpload() {
    // Click avatar to open file picker
    avatarCircle.addEventListener('click', function() {
        photoInput.click();
    });

    // Handle file selection
    photoInput.addEventListener('change', function(e) {
        var file = e.target.files[0];
        if (!file) return;

        // Validate it's an image
        if (!file.type.startsWith('image/')) return;

        var reader = new FileReader();
        reader.onload = function(event) {
            var dataUrl = event.target.result;

            // Resize to save localStorage space (max 300px)
            resizeImage(dataUrl, 300, function(resized) {
                setAvatarPhoto(resized);
                try {
                    localStorage.setItem(STORAGE_KEYS.photo, resized);
                } catch (err) {
                    // localStorage might be full, try without resizing won't help
                    console.warn('Could not save photo to localStorage');
                }
            });
        };
        reader.readAsDataURL(file);
    });
}

function resizeImage(dataUrl, maxSize, callback) {
    var img = new Image();
    img.onload = function() {
        var w = img.width;
        var h = img.height;
        var size = Math.min(w, h);
        // Crop to square from center
        var sx = (w - size) / 2;
        var sy = (h - size) / 2;

        var canvas = document.createElement('canvas');
        canvas.width = maxSize;
        canvas.height = maxSize;
        var ctx = canvas.getContext('2d');
        ctx.drawImage(img, sx, sy, size, size, 0, 0, maxSize, maxSize);
        callback(canvas.toDataURL('image/jpeg', 0.8));
    };
    img.src = dataUrl;
}

function setAvatarPhoto(dataUrl) {
    avatarPhoto.src = dataUrl;
    avatarPhoto.classList.add('visible');
    avatarSvg.style.display = 'none';
}

function clearAvatarPhoto() {
    avatarPhoto.src = '';
    avatarPhoto.classList.remove('visible');
    avatarSvg.style.display = '';
}

// ===== Editable Fields =====
function setupEditableFields() {
    [nameEl, careerEl].forEach(function(el) {
        el.addEventListener('blur', function() {
            saveData();
        });

        el.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                el.blur();
            }
        });

        // Prevent paste with formatting
        el.addEventListener('paste', function(e) {
            e.preventDefault();
            var text = (e.clipboardData || window.clipboardData).getData('text/plain');
            document.execCommand('insertText', false, text);
        });
    });
}

// ===== Program Type Toggle =====
function setupProgramToggle() {
    programToggleEl.addEventListener('click', function() {
        var current = programTypeEl.textContent.trim();
        var idx = PROGRAM_OPTIONS.indexOf(current);
        var next = PROGRAM_OPTIONS[(idx + 1) % PROGRAM_OPTIONS.length];
        programTypeEl.textContent = next;
        saveData();
    });
}

// ===== LocalStorage =====
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEYS.name, nameEl.textContent.trim());
        localStorage.setItem(STORAGE_KEYS.career, careerEl.textContent.trim());
        localStorage.setItem(STORAGE_KEYS.program, programTypeEl.textContent.trim());
    } catch (e) { /* silent */ }
}

function loadSavedData() {
    try {
        var name = localStorage.getItem(STORAGE_KEYS.name);
        var career = localStorage.getItem(STORAGE_KEYS.career);
        var program = localStorage.getItem(STORAGE_KEYS.program);
        var photo = localStorage.getItem(STORAGE_KEYS.photo);

        if (name) nameEl.textContent = name;
        if (career) careerEl.textContent = career;
        if (program && PROGRAM_OPTIONS.indexOf(program) !== -1) {
            programTypeEl.textContent = program;
        }
        if (photo) {
            setAvatarPhoto(photo);
        }
    } catch (e) { /* silent */ }
}

// ===== Edit Hint Toast =====
function showEditHint() {
    var shown = localStorage.getItem('upn_hint_shown');
    if (shown) return;

    var toast = document.getElementById('editToast');
    setTimeout(function() {
        toast.classList.add('show');
        setTimeout(function() {
            toast.classList.remove('show');
            localStorage.setItem('upn_hint_shown', 'true');
        }, 3000);
    }, 1500);
}

// ===== Service Worker Registration =====
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./sw.js')
            .then(function(reg) {
                console.log('SW registered:', reg.scope);
            })
            .catch(function(err) {
                console.warn('SW registration failed:', err);
            });
    }
}
