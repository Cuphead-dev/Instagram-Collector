// ================================
// รอให้ DOM โหลดเสร็จก่อน
// ================================
document.addEventListener('DOMContentLoaded', () => {
  const extractBtn = document.getElementById('extract');
  const clearBtn = document.getElementById('clear');

  if (extractBtn) {
    extractBtn.addEventListener('click', extractData);
  }
  if (clearBtn) {
    clearBtn.addEventListener('click', clearData);
  }
});

// ================================
// ฟังก์ชันดึงข้อมูล
// ================================
async function extractData() {
  const status = document.getElementById('status');
  status.textContent = '⏳ กำลังโหลดข้อมูลเก่า...';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // โหลดข้อมูลเก่าจาก storage
    const oldData = await chrome.storage.local.get(['igCollection2']);
    const existingLinks = new Set((oldData.igCollection2 || []).map(item => item.link));
    
    status.textContent = `⏳ กำลัง scroll... (มีข้อมูลเก่า ${existingLinks.size} รายการ)`;

    // ส่งข้อมูลเก่าไปให้ content script
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: autoScrollAndExtract,
      args: [Array.from(existingLinks)]
    });

    const newMedia = results[0].result;

    if (!newMedia || newMedia.length === 0) {
      status.textContent = '✅ ไม่มีข้อมูลใหม่ (ทุกอย่างถูกดึงแล้ว)';
      return;
    }

    // รวมข้อมูลเก่า + ใหม่
    const allMedia = [...newMedia, ...(oldData.igCollection2 || [])];
    
    // บันทึกข้อมูลรวม
    await chrome.storage.local.set({ igCollection2: allMedia });

    // สร้างไฟล์ HTML ใหม่ (เขียนทับ)
    const htmlContent = generateHTML(allMedia);
    const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
    const htmlUrl = URL.createObjectURL(htmlBlob);
    
    await chrome.downloads.download({
      url: htmlUrl,
      filename: `Collection_video2/ig_collection_master.html`,
      saveAs: false,
      conflictAction: 'overwrite'
    });

    // สร้าง JSON backup
    const jsonBlob = new Blob([JSON.stringify(allMedia, null, 2)], { type: 'application/json' });
    const jsonUrl = URL.createObjectURL(jsonBlob);
    
    await chrome.downloads.download({
      url: jsonUrl,
      filename: `Collection_video2/ig_collection_backup.json`,
      saveAs: false,
      conflictAction: 'overwrite'
    });

    status.textContent = `✅ เพิ่มข้อมูลใหม่ ${newMedia.length} รายการ\n📊 รวมทั้งหมด ${allMedia.length} รายการ`;
  } catch (err) {
    status.textContent = '⚠️ มีข้อผิดพลาด: ' + err.message;
    console.error(err);
  }
}

// ================================
// ฟังก์ชันล้างข้อมูล
// ================================
async function clearData() {
  const status = document.getElementById('status');
  
  const confirmDelete = confirm('⚠️ คุณแน่ใจหรือไม่?\n\nการกระทำนี้จะลบ:\n✗ ข้อมูลทั้งหมดใน Storage\n✗ ไฟล์ HTML และ JSON (ต้องลบเองในโฟลเดอร์)\n\n❌ ไม่สามารถกู้คืนได้!');
  
  if (!confirmDelete) {
    status.textContent = '❎ ยกเลิกการลบข้อมูล';
    return;
  }

  try {
    await chrome.storage.local.remove(['igCollection2']);
    status.textContent = '✅ ล้างข้อมูลเรียบร้อย!\n\n💡 หมายเหตุ: Folder ที่สร้างไว้ยังคงอยู่ใน localStorage ของ HTML';
    setTimeout(() => { status.textContent = ''; }, 5000);
  } catch (err) {
    status.textContent = '⚠️ เกิดข้อผิดพลาด: ' + err.message;
    console.error(err);
  }
}

// ================================
// สร้าง HTML Template (ใช้ card-number)
// ================================
function generateHTML(data) {
  const date = new Date().toLocaleString('th-TH');
  const totalCount = data.length;
  const escapeHtml = (str) => {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '\\"');
  };
  
  return `<!DOCTYPE html>
<html lang="th">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Instagram Collection - ${totalCount} รายการ</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
            min-height: 100vh;
            padding: 20px;
            color: #e0e0e0;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            background: #0f3460;
            border-radius: 20px;
            padding: 30px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }

        h1 {
            text-align: center;
            color: #00d4ff;
            margin-bottom: 10px;
            font-size: 2.2em;
            text-shadow: 0 0 20px rgba(0,212,255,0.5);
        }

        .subtitle {
            text-align: center;
            color: #a0a0a0;
            margin-bottom: 20px;
            font-size: 1em;
        }

        .controls {
            display: flex;
            gap: 15px;
            margin-bottom: 20px;
            flex-wrap: wrap;
            align-items: center;
            justify-content: center;
        }

        .search-box {
            background: #1a1a2e;
            padding: 15px;
            border-radius: 15px;
            display: flex;
            gap: 10px;
            align-items: center;
            flex-wrap: wrap;
            border: 2px solid #00d4ff;
        }

        .search-box input {
            background: #16213e;
            border: 1px solid #00d4ff;
            color: #e0e0e0;
            padding: 10px 15px;
            border-radius: 8px;
            font-size: 0.95em;
            width: 100px;
        }

        .search-box input:focus {
            outline: none;
            border-color: #00ff88;
            box-shadow: 0 0 10px rgba(0,255,136,0.3);
        }

        .search-box button {
            background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%);
            color: #1a1a2e;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
        }

        .search-box button:hover {
            transform: scale(1.05);
        }

        .search-box label {
            color: #00d4ff;
            font-size: 0.9em;
        }

        .folder-section {
            background: #1a1a2e;
            padding: 20px;
            border-radius: 15px;
            margin-bottom: 20px;
            border: 2px solid #00d4ff;
        }

        .folder-controls {
            display: flex;
            gap: 10px;
            margin-bottom: 15px;
            flex-wrap: wrap;
        }

        .folder-controls input {
            background: #16213e;
            border: 1px solid #00d4ff;
            color: #e0e0e0;
            padding: 10px 15px;
            border-radius: 8px;
            flex: 1;
            min-width: 200px;
        }

        .folder-controls input:focus {
            outline: none;
            border-color: #00ff88;
        }

        .folder-controls button {
            background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%);
            color: #1a1a2e;
            border: none;
            padding: 10px 20px;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
        }

        .folder-list {
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }

        .folder-tag {
            background: #16213e;
            color: #00d4ff;
            padding: 8px 15px;
            border-radius: 8px;
            cursor: pointer;
            border: 1px solid #00d4ff;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .folder-tag:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }

        .folder-tag.active {
            background: #00ff88;
            color: #1a1a2e;
            border-color: #00ff88;
        }

        .folder-delete {
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            font-size: 12px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 0;
            line-height: 1;
        }

        .folder-delete:hover {
            background: #c82333;
        }

        .stats {
            text-align: center;
            font-size: 1.1em;
            color: #00ff88;
            margin-bottom: 30px;
            padding: 15px;
            background: #1a1a2e;
            border-radius: 15px;
            font-weight: 600;
            border: 2px solid #00ff88;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 25px;
            margin-top: 20px;
        }

        .card {
            background: #1a1a2e;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 15px rgba(0,0,0,0.3);
            transition: all 0.3s ease;
            cursor: pointer;
            position: relative;
            border: 2px solid #16213e;
        }

        .card:hover {
            transform: translateY(-8px);
            box-shadow: 0 15px 35px rgba(0,212,255,0.3);
            border-color: #00d4ff;
        }

        .card.selected {
            border: 3px solid #00ff88;
            background: #16213e;
            box-shadow: 0 0 20px rgba(0,255,136,0.5);
        }

        .card.selected .card-number {
            background: linear-gradient(135deg, #00ff88 0%, #00d4ff 100%);
        }

        .selection-mode-bar {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: #0f3460;
            padding: 15px 20px;
            display: none;
            align-items: center;
            justify-content: space-between;
            border-top: 3px solid #00ff88;
            box-shadow: 0 -5px 20px rgba(0,0,0,0.5);
            z-index: 999;
        }

        .selection-mode-bar.show {
            display: flex;
        }

        .selection-info {
            color: #00ff88;
            font-weight: bold;
            font-size: 1.1em;
        }

        .selection-actions {
            display: flex;
            gap: 10px;
        }

        .selection-actions button {
            padding: 10px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-weight: bold;
            transition: transform 0.2s;
        }

        .selection-actions button:hover {
            transform: scale(1.05);
        }

        .btn-manage-selected {
            background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%);
            color: #1a1a2e;
        }

        .btn-cancel-selection {
            background: #dc3545;
            color: white;
        }

        .selection-checkbox {
            position: absolute;
            top: 10px;
            left: 10px;
            width: 30px;
            height: 30px;
            cursor: pointer;
            z-index: 20;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .card:hover .selection-checkbox {
            opacity: 1;
        }

        .card.selected .selection-checkbox {
            opacity: 1;
        }

        .card.hidden {
            display: none;
        }

        .card-image {
            width: 100%;
            height: 280px;
            object-fit: cover;
            background: #16213e;
        }

        .card-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: transparent;
            display: flex;
            align-items: center;
            justify-content: center;
            opacity: 0;
            transition: opacity 0.3s;
            pointer-events: none;
        }

        .card:hover .card-overlay {
            opacity: 0;
        }

        .overlay-text {
            color: #1a1a2e;
            font-size: 1.2em;
            font-weight: bold;
        }

        .card-content {
            padding: 15px;
            background: #16213e;
        }

        .card-link {
            display: block;
            color: #00d4ff;
            text-decoration: none;
            font-size: 0.85em;
            word-break: break-all;
            margin-bottom: 8px;
            line-height: 1.4;
        }

        .card-link:hover {
            color: #00ff88;
            text-decoration: underline;
        }

        .card-number {
            font-size: 0.9em;
            color: #1a1a2e;
            text-align: center;
            background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%);
            padding: 8px;
            border-radius: 8px;
            font-weight: bold;
            margin-bottom: 10px;
        }

        .card-actions {
            display: flex;
            gap: 5px;
            margin-top: 10px;
        }

        .card-actions button {
            flex: 1;
            background: #0f3460;
            color: #00d4ff;
            border: 1px solid #00d4ff;
            padding: 8px 10px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 0.8em;
            transition: all 0.2s;
            z-index: 10;
            position: relative;
        }

        .card-actions button:hover {
            background: #00d4ff;
            color: #1a1a2e;
        }

        .card-actions button.in-folder {
            background: #00ff88;
            color: #1a1a2e;
            border-color: #00ff88;
        }

        .folder-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .folder-modal.show {
            display: flex;
        }

        .modal-content {
            background: #0f3460;
            border-radius: 20px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
            border: 2px solid #00d4ff;
        }

        .modal-header {
            color: #00d4ff;
            font-size: 1.5em;
            margin-bottom: 20px;
            text-align: center;
        }

        .modal-folder-item {
            background: #1a1a2e;
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 10px;
            border: 2px solid #16213e;
            display: flex;
            align-items: center;
            gap: 10px;
            cursor: pointer;
            transition: all 0.3s;
        }

        .modal-folder-item:hover {
            border-color: #00d4ff;
        }

        .modal-folder-item.selected {
            border-color: #00ff88;
            background: #16213e;
        }

        .modal-folder-item input[type="checkbox"] {
            width: 20px;
            height: 20px;
            cursor: pointer;
        }

        .modal-folder-info {
            flex: 1;
            color: #e0e0e0;
        }

        .modal-folder-status {
            font-size: 1.5em;
        }

        .modal-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .modal-actions button {
            flex: 1;
            padding: 12px;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
            font-size: 1em;
        }

        .btn-confirm {
            background: linear-gradient(135deg, #00d4ff 0%, #00ff88 100%);
            color: #1a1a2e;
        }

        .btn-cancel {
            background: #dc3545;
            color: white;
        }

        /* Video Modal */
        .video-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.95);
            z-index: 2000;
            justify-content: center;
            align-items: center;
        }

        .video-modal.show {
            display: flex;
        }

        .video-container {
            position: relative;
            width: 95%;
            max-width: 1000px;
            height: 90vh;
            background: #000;
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 10px 50px rgba(0,212,255,0.3);
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .video-frame {
            width: 100%;
            height: 100%;
            border: none;
            background: #000;
        }

        .video-close {
            position: absolute;
            top: 10px;
            right: 10px;
            background: rgba(220, 53, 69, 0.9);
            color: white;
            border: none;
            width: 36px;
            height: 36px;
            border-radius: 50%;
            font-size: 20px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.3s;
            z-index: 10;
        }

        .video-close:hover {
            background: #c82333;
            transform: scale(1.1);
        }

        @media (max-width: 768px) {
            .video-container {
                width: 98%;
                max-width: none;
                height: 85vh;
            }
            
            .video-close {
                top: 8px;
                right: 8px;
                width: 32px;
                height: 32px;
                font-size: 18px;
            }
        }

        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 2px solid #16213e;
            color: #a0a0a0;
            font-size: 0.9em;
        }

        @media (max-width: 768px) {
            .grid {
                grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
                gap: 15px;
            }
            
            .card-image {
                height: 200px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>📸 Instagram Collection 2</h1>
        <div class="subtitle">อัพเดทล่าสุด: ${date}</div>
        
        <div class="folder-section">
            <h3 style="color: #00d4ff; margin-bottom: 15px;">📁 จัดการโฟลเดอร์</h3>
            <div class="folder-controls">
                <input type="text" id="folderName" placeholder="ชื่อโฟลเดอร์ใหม่ (เช่น ท่องเที่ยว, อาหาร)">
                <button onclick="createFolder()">➕ สร้างโฟลเดอร์</button>
            </div>
            <div class="folder-list" id="folderList">
                <div class="folder-tag active" onclick="filterFolder('all', event)">📂 ทั้งหมด</div>
            </div>
        </div>

        <div class="controls">
            <div class="search-box">
                <label>ค้นหาอันดับ:</label>
                <input type="number" id="rangeFrom" placeholder="จาก" min="1" max="${totalCount}">
                <label>ถึง</label>
                <input type="number" id="rangeTo" placeholder="ถึง" min="1" max="${totalCount}">
                <button onclick="filterByRange()">🔍 ค้นหา</button>
                <button onclick="resetFilter()">🔄 รีเซ็ต</button>
            </div>
        </div>

        <div class="stats" id="statsDisplay">✨ แสดงทั้งหมด ${totalCount} รายการ</div>
        
        <div class="grid" id="grid">
            ${data.map((item, index) => {
                const displayNumber = totalCount - index;
                const safeLink = escapeHtml(item.link);
                const safeThumb = escapeHtml(item.thumb || 'https://via.placeholder.com/280x280/1a1a2e/00d4ff?text=No+Image');
                return `
                <div class="card" data-number="${displayNumber}" data-folder="all" data-link="${safeLink}">
                    <input type="checkbox" class="selection-checkbox" onclick="event.stopPropagation(); toggleCardSelection(this)">
                    <img 
                        src="${safeThumb}" 
                        class="card-image"
                        onerror="this.src='https://via.placeholder.com/280x280/1a1a2e/00d4ff?text=No+Image'"
                        alt="Instagram Post ${displayNumber}"
                        loading="lazy"
                        onclick="openInModal('${safeLink}')"
                    >
                    <div class="card-overlay">
                        <div class="overlay-text">👁️ เปิดดู</div>
                    </div>
                    <div class="card-content" onclick="window.open('${safeLink}', '_blank')">
                        <div class="card-number">#${displayNumber}</div>
                        <a href="${safeLink}" target="_blank" class="card-link" onclick="event.stopPropagation()">
                            ${item.link.length > 60 ? item.link.substring(0, 60) + '...' : item.link}
                        </a>
                        <div class="card-actions">
                            <button onclick="event.stopPropagation(); openFolderModal(this)" title="เพิ่ม/ลบจากโฟลเดอร์">
                                📁 จัดการโฟลเดอร์
                            </button>
                        </div>
                    </div>
                </div>
            `}).join('')}
        </div>
        
        <div class="footer">
            🎨 สร้างโดย IG Collection Collector<br>
            💾 ไฟล์: ig_collection_master.html<br>
            📊 ข้อมูลทั้งหมด: ${totalCount} รายการ
        </div>
    </div>

    <!-- Selection Mode Bar -->
    <div class="selection-mode-bar" id="selectionBar">
        <div class="selection-info">
            <span id="selectedCount">0</span> รายการที่เลือก
        </div>
        <div class="selection-actions">
            <button class="btn-manage-selected" onclick="openFolderModalMultiple()">📁 จัดการโฟลเดอร์</button>
            <button class="btn-cancel-selection" onclick="clearAllSelections()">✕ ยกเลิก</button>
        </div>
    </div>

    <!-- Folder Modal -->
    <div class="folder-modal" id="folderModal" onclick="closeFolderModal(event)">
        <div class="modal-content" onclick="event.stopPropagation()">
            <div class="modal-header">📁 เลือกโฟลเดอร์</div>
            <div id="modalFolderList"></div>
            <div class="modal-actions">
                <button class="btn-confirm" onclick="confirmFolders()">✔️ ยืนยัน</button>
                <button class="btn-cancel" onclick="closeFolderModal()">✕ ยกเลิก</button>
            </div>
        </div>
    </div>

    <!-- Video Modal -->
    <div class="video-modal" id="videoModal" onclick="closeModal()">
        <div class="video-container" onclick="event.stopPropagation()">
            <button class="video-close" onclick="closeModal()">✕</button>
            <iframe id="videoFrame" class="video-frame" allowfullscreen></iframe>
        </div>
    </div>

    <script>
        const totalCount = ${totalCount};
        let folders = JSON.parse(localStorage.getItem('ig_folders') || '{}');
        let currentFolder = 'all';
        let selectedFolders = new Set();
        let selectedCards = new Set();

        // ⭐ เปลี่ยนจากเก็บ URL เป็นเก็บ card-number
        function toggleCardSelection(checkbox) {
            const card = checkbox.closest('.card');
            if (!card) return;
            
            const cardNumber = parseInt(card.dataset.number); // ⭐ ใช้ card-number
            
            if (checkbox.checked) {
                selectedCards.add(cardNumber);
                card.classList.add('selected');
            } else {
                selectedCards.delete(cardNumber);
                card.classList.remove('selected');
            }
            
            updateSelectionBar();
        }

        function updateSelectionBar() {
            const bar = document.getElementById('selectionBar');
            const countDisplay = document.getElementById('selectedCount');
            
            if (!bar || !countDisplay) return;
            
            const count = selectedCards.size;
            countDisplay.textContent = count;
            
            if (count > 0) {
                bar.classList.add('show');
            } else {
                bar.classList.remove('show');
            }
        }

        function clearAllSelections() {
            selectedCards.clear();
            
            document.querySelectorAll('.card').forEach(function(card) {
                card.classList.remove('selected');
                const checkbox = card.querySelector('.selection-checkbox');
                if (checkbox) checkbox.checked = false;
            });
            
            updateSelectionBar();
        }

        function openFolderModalMultiple() {
            if (selectedCards.size === 0) {
                alert('⚠️ กรุณาเลือกคลิปอย่างน้อย 1 รายการ');
                return;
            }
            
            const folderNames = Object.keys(folders);
            if (folderNames.length === 0) {
                alert('⚠️ กรุณาสร้างโฟลเดอร์ก่อน');
                return;
            }

            selectedFolders.clear();

            const modalList = document.getElementById('modalFolderList');
            if (!modalList) return;
            
            modalList.innerHTML = '';

            folderNames.forEach(function(name) {
                const folderData = folders[name];
                const count = Array.isArray(folderData) ? folderData.length : 0;
                const escapedName = name.replace(/'/g, "\\\\'");
                
                let allInFolder = true;
                let someInFolder = false;
                
                // ⭐ เช็คด้วย card-number
                selectedCards.forEach(function(cardNumber) {
                    if (folderData && folderData.includes(cardNumber)) {
                        someInFolder = true;
                    } else {
                        allInFolder = false;
                    }
                });
                
                const status = allInFolder ? '✔️' : (someInFolder ? '◐' : '➕');
                
                modalList.innerHTML += '<div class="modal-folder-item" onclick="toggleModalFolder(\\'' + escapedName + '\\', this)">' +
                    '<input type="checkbox" onclick="event.stopPropagation(); toggleModalFolder(\\'' + escapedName + '\\', this.parentElement)">' +
                    '<div class="modal-folder-info">' +
                    '<strong>📁 ' + name + '</strong> (' + count + ' รายการ)' +
                    '</div>' +
                    '<div class="modal-folder-status">' + status + '</div>' +
                    '</div>';
            });

            const modal = document.getElementById('folderModal');
            if (modal) {
                modal.classList.add('show');
            }
        }

        function loadFolders() {
            const folderList = document.getElementById('folderList');
            if (!folderList) return;
            
            folderList.innerHTML = '<div class="folder-tag active" onclick="filterFolder(\\'all\\', event)">📂 ทั้งหมด</div>';
            
            Object.keys(folders).forEach(function(name) {
                const folderData = folders[name];
                const count = Array.isArray(folderData) ? folderData.length : 0;
                const escapedName = name.replace(/'/g, "\\\\'");
                
                folderList.innerHTML += '<div class="folder-tag" onclick="filterFolder(\\'' + escapedName + '\\', event)">' +
                    '<span>📁 ' + name + ' (' + count + ')</span>' +
                    '<button class="folder-delete" onclick="event.stopPropagation(); deleteFolder(\\'' + escapedName + '\\')" title="ลบโฟลเดอร์">✕</button>' +
                    '</div>';
            });
        }

        function createFolder() {
            const input = document.getElementById('folderName');
            if (!input) return;
            
            const name = input.value.trim();
            
            if (!name) {
                alert('⚠️ กรุณาใส่ชื่อโฟลเดอร์');
                return;
            }
            if (folders[name]) {
                alert('⚠️ โฟลเดอร์นี้มีอยู่แล้ว');
                return;
            }
            
            folders[name] = [];
            localStorage.setItem('ig_folders', JSON.stringify(folders));
            input.value = '';
            loadFolders();
            alert('✅ สร้างโฟลเดอร์ "' + name + '" สำเร็จ');
        }

        function deleteFolder(name) {
            if (!confirm('ต้องการลบโฟลเดอร์ "' + name + '" ใช่หรือไม่?')) return;
            
            delete folders[name];
            localStorage.setItem('ig_folders', JSON.stringify(folders));
            loadFolders();
            
            if (currentFolder === name) {
                const allTag = document.querySelector('.folder-tag.active');
                if (allTag) {
                    filterFolder('all', { target: allTag });
                }
            }
            
            alert('✅ ลบโฟลเดอร์ "' + name + '" สำเร็จ');
        }

        // ⭐ ใช้ card-number ในการกรอง
        function filterFolder(name, event) {
            currentFolder = name;
            const cards = document.querySelectorAll('.card');
            const tags = document.querySelectorAll('.folder-tag');
            let visibleCount = 0;
            
            tags.forEach(function(tag) {
                tag.classList.remove('active');
            });
            
            if (event && event.target) {
                event.target.classList.add('active');
            }
            
            cards.forEach(function(card) {
                const cardNumber = parseInt(card.dataset.number); // ⭐ ใช้ card-number
                const match = (name === 'all' || (folders[name] && folders[name].includes(cardNumber)));
                if (match) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });

            updateStats(visibleCount || 0);
        }

        function openFolderModal(btn) {
            const card = btn.closest('.card');
            if (!card) return;
            
            selectedCards.clear();
            selectedCards.add(parseInt(card.dataset.number)); // ⭐ ใช้ card-number
            
            document.querySelectorAll('.card').forEach(function(c) {
                c.classList.remove('selected');
                const checkbox = c.querySelector('.selection-checkbox');
                if (checkbox) checkbox.checked = false;
            });
            
            card.classList.add('selected');
            const checkbox = card.querySelector('.selection-checkbox');
            if (checkbox) checkbox.checked = true;
            
            updateSelectionBar();
            
            openFolderModalMultiple();
        }

        function closeFolderModal(event) {
            if (event && event.target && event.currentTarget && event.target !== event.currentTarget) return;
            
            const modal = document.getElementById('folderModal');
            if (modal) {
                modal.classList.remove('show');
            }
            selectedFolders.clear();
        }

        function toggleModalFolder(name, element) {
            if (!element) return;
            
            const checkbox = element.querySelector('input[type="checkbox"]');
            const status = element.querySelector('.modal-folder-status');
            
            if (selectedFolders.has(name)) {
                selectedFolders.delete(name);
                element.classList.remove('selected');
                if (checkbox) checkbox.checked = false;
                if (status) {
                    let allInFolder = true;
                    selectedCards.forEach(function(cardNumber) {
                        if (!folders[name] || !folders[name].includes(cardNumber)) {
                            allInFolder = false;
                        }
                    });
                    status.textContent = allInFolder ? '✔️' : '➕';
                }
            } else {
                selectedFolders.add(name);
                element.classList.add('selected');
                if (checkbox) checkbox.checked = true;
                if (status) status.textContent = '🔄';
            }
        }

        // ⭐ ใช้ card-number ในการบันทึก
        function confirmFolders() {
            if (selectedFolders.size === 0) {
                alert('⚠️ กรุณาเลือกโฟลเดอร์อย่างน้อย 1 โฟลเดอร์');
                return;
            }

            if (selectedCards.size === 0) {
                alert('⚠️ ไม่มีคลิปที่เลือก');
                return;
            }

            let totalAdded = 0;
            let totalRemoved = 0;

            selectedFolders.forEach(function(name) {
                if (!folders[name]) {
                    folders[name] = [];
                }
                
                selectedCards.forEach(function(cardNumber) { // ⭐ ใช้ card-number
                    const index = folders[name].indexOf(cardNumber);
                    if (index > -1) {
                        folders[name].splice(index, 1);
                        totalRemoved++;
                    } else {
                        folders[name].push(cardNumber); // ⭐ เก็บเป็นตัวเลข
                        totalAdded++;
                    }
                });
            });

            localStorage.setItem('ig_folders', JSON.stringify(folders));
            loadFolders();
            closeFolderModal();
            clearAllSelections();
            
            alert('✅ เพิ่ม ' + totalAdded + ' รายการ | ลบ ' + totalRemoved + ' รายการ');
        }

        function filterByRange() {
            const fromInput = document.getElementById('rangeFrom');
            const toInput = document.getElementById('rangeTo');
            
            if (!fromInput || !toInput) return;
            
            const from = parseInt(fromInput.value);
            const to = parseInt(toInput.value);
            
            if (!from || !to || from > to) {
                alert('⚠️ กรอกค่าช่วงที่ถูกต้อง');
                return;
            }
            
            const cards = document.querySelectorAll('.card');
            let visibleCount = 0;
            
            cards.forEach(function(card) {
                const num = parseInt(card.dataset.number);
                const match = (num >= from && num <= to);
                if (match) {
                    card.classList.remove('hidden');
                    visibleCount++;
                } else {
                    card.classList.add('hidden');
                }
            });
            
            updateStats(visibleCount, 'อันดับ ' + from + '-' + to);
        }

        function resetFilter() {
            const fromInput = document.getElementById('rangeFrom');
            const toInput = document.getElementById('rangeTo');
            
            if (fromInput) fromInput.value = '';
            if (toInput) toInput.value = '';
            
            document.querySelectorAll('.card').forEach(function(card) {
                card.classList.remove('hidden');
            });
            
            updateStats(totalCount);
        }

        function updateStats(count, extra) {
            const stats = document.getElementById('statsDisplay');
            if (!stats) return;
            
            const extraText = extra ? ' (' + extra + ')' : '';
            stats.textContent = '✨ แสดง ' + (count || 0) + ' รายการ' + extraText;
        }

        loadFolders();
        updateStats(totalCount);
        console.log('✅ โหลดข้อมูล ' + totalCount + ' รายการสำเร็จ');
        console.log('📁 Folder ใช้ระบบเลขลำดับ (card-number)');

        // Video Modal Functions
        function openInModal(link) {
            const frame = document.getElementById('videoFrame');
            const modal = document.getElementById('videoModal');
            if (!frame || !modal) return;
            
            var embedUrl = link;
            
            // แปลง URL เป็น embed format (แบบไม่มี description)
            if (link.indexOf('/reel/') > -1) {
                var parts = link.split('/reel/')[1];
                if (parts) {
                    var code = parts.split('/')[0].split('?')[0];
                    embedUrl = 'https://www.instagram.com/reel/' + code + '/embed/captioned/?utm_source=ig_embed';
                }
            } else if (link.indexOf('/p/') > -1) {
                var parts = link.split('/p/')[1];
                if (parts) {
                    var code = parts.split('/')[0].split('?')[0];
                    embedUrl = 'https://www.instagram.com/p/' + code + '/embed/captioned/?utm_source=ig_embed';
                }
            } else if (link.indexOf('/tv/') > -1) {
                var parts = link.split('/tv/')[1];
                if (parts) {
                    var code = parts.split('/')[0].split('?')[0];
                    embedUrl = 'https://www.instagram.com/tv/' + code + '/embed/captioned/?utm_source=ig_embed';
                }
            }
            
            frame.src = embedUrl;
            modal.classList.add('show');
        }

        function closeModal() {
            const modal = document.getElementById('videoModal');
            const frame = document.getElementById('videoFrame');
            if (modal) modal.classList.remove('show');
            if (frame) frame.src = '';
        }

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                closeModal();
                closeFolderModal();
            }
        });
    </script>
</body>
</html>`;
}

// ================================
// Scroll และเก็บข้อมูล
// ================================
async function autoScrollAndExtract(existingLinks) {
  const delay = (ms) => new Promise((res) => setTimeout(res, ms));
  
  const existingSet = new Set(existingLinks);
  const newMediaMap = new Map();
  
  let prevHeight = 0;
  let sameCount = 0;
  let scrollRound = 0;
  let foundDuplicate = false;

  console.log("▶️ เริ่ม scroll และเก็บข้อมูลใหม่...");
  console.log(`📋 มีข้อมูลเก่า ${existingSet.size} รายการ`);

  function collectCurrentLinks() {
    const anchors = document.querySelectorAll('a[href*="/p/"], a[href*="/reel/"], a[href*="/tv/"]');
    let newCount = 0;
    let duplicateCount = 0;
    
    anchors.forEach(a => {
      const url = a.href;
      
      if (existingSet.has(url)) {
        duplicateCount++;
        foundDuplicate = true;
        return;
      }
      
      if (!newMediaMap.has(url)) {
        const img = a.querySelector('img');
        const thumb = img ? img.src : '';
        newMediaMap.set(url, { link: url, thumb });
        newCount++;
      }
    });
    
    return { newCount, duplicateCount };
  }

  collectCurrentLinks();

  while (sameCount < 5 && !foundDuplicate) {
    window.scrollTo(0, document.body.scrollHeight);
    await delay(2500);
    
    scrollRound++;
    const newHeight = document.body.scrollHeight;
    
    const { newCount, duplicateCount } = collectCurrentLinks();
    
    console.log(`🌀 รอบ ${scrollRound}: เจอใหม่ ${newCount} | ซ้ำ ${duplicateCount} | รวมใหม่ ${newMediaMap.size}`);

    if (foundDuplicate) {
      console.log(`🛑 พบข้อมูลซ้ำ! หยุด scroll`);
      break;
    }

    if (newHeight === prevHeight) {
      sameCount++;
      console.log(`⚠️ ไม่มีการเปลี่ยนแปลง (${sameCount}/5)`);
    } else {
      sameCount = 0;
      prevHeight = newHeight;
    }
  }

  console.log("✅ เสร็จสิ้น");
  
  await delay(2000);
  collectCurrentLinks();

  const newMedia = Array.from(newMediaMap.values());
  console.log(`📸 ดึงข้อมูลใหม่ ${newMedia.length} รายการ`);
  
  return newMedia;
}
