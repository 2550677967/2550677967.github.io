// ==================== 深空智能知识图谱 - 旗舰版 ====================
let nodes = [];
let nextId = 100;
let currentZoom = 1;
let sideZoom = 1;
let dragTarget = null;
let dragOffsetX = 0, dragOffsetY = 0;

// 预设框架显示状态
let frameworkVisibility = {
    physics: true, philosophy: true, ai: true, history: true, biology: true
};

// 文件存储系统
let uploadedFiles = []; // { name, type, content, category, folder }

// 知识点分类映射
const categoryMap = {
    physics: ['力学', '量子', '相对论', '牛顿', '伽利略', '万有引力', '运动定律', '电磁', '热力学', '原子', '核', '物理'],
    philosophy: ['哲学', '笛卡尔', '康德', '柏拉图', '亚里士多德', '存在主义', '理性主义', '认识论', '形而上学', '伦理'],
    ai: ['AI', '人工智能', '机器学习', '神经网络', '深度学习', '算法', '数据', '大模型', 'GPT', '智能'],
    history: ['历史', '战争', '朝代', '革命', '古代', '中世纪', '文艺复兴', '帝国', '文明'],
    biology: ['生物', '基因', 'DNA', '进化', '细胞', '生态', '神经', '大脑', '生命']
};

function getNodeCategory(label) {
    for (let [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => label.includes(kw) || kw.includes(label))) return cat;
    }
    return 'other';
}

function calculateGoldValue(node, allNodes) {
    let gold = 50;
    if (node.childrenIds && node.childrenIds.length > 0) gold += node.childrenIds.length * 25;
    if (node.parentId) gold += 35;
    if (node.type === 'red') gold += 120;
    if (node.type === 'blue') gold += 30;
    gold += Math.floor(node.label.length / 2);
    return Math.min(gold, 999);
}

function updateAllGold() {
    let total = 0;
    for (let node of nodes) {
        node.goldValue = calculateGoldValue(node, nodes);
        total += node.goldValue;
    }
    document.getElementById('totalGold').innerHTML = `💰 总金币: ${total}`;
    return total;
}

// 添加节点
function addNode(label, x, y, parentId = null, typeOverride = null) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    let existing = nodes.find(n => n.label === label);
    if (existing) return existing;
    
    const category = getNodeCategory(label);
    let type = typeOverride || (category !== 'other' ? 'red' : 'gray');
    
    const newNode = {
        id: nextId++,
        label: label,
        x: x || (Math.random() * 500 + 100),
        y: y || (Math.random() * 300 + 100),
        type: type,
        parentId: parentId,
        childrenIds: [],
        goldValue: 0,
        sourceFile: null,
        visible: true
    };
    newNode.goldValue = calculateGoldValue(newNode, nodes);
    nodes.push(newNode);
    
    if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent && !parent.childrenIds.includes(newNode.id)) {
            parent.childrenIds.push(newNode.id);
        }
    } else {
        autoConnectNode(newNode);
    }
    return newNode;
}

// 自动连线
function autoConnectNode(newNode) {
    for (let node of nodes) {
        if (node.id === newNode.id) continue;
        if (node.label.includes(newNode.label) || newNode.label.includes(node.label)) {
            if (!newNode.parentId && !node.childrenIds.includes(newNode.id)) {
                if (!node.childrenIds) node.childrenIds = [];
                node.childrenIds.push(newNode.id);
                newNode.parentId = node.id;
                break;
            }
        }
    }
}

// 删除节点
function deleteNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    // 清除所有子节点引用
    for (let n of nodes) {
        if (n.childrenIds) {
            n.childrenIds = n.childrenIds.filter(id => id !== nodeId);
        }
    }
    nodes = nodes.filter(n => n.id !== nodeId);
    renderAll();
    updateFileManager();
}

// 文件解析
async function parseFile(file) {
    const fileType = file.type;
    const fileName = file.name;
    let extractedText = '';
    
    try {
        if (fileType.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file, 'chi_sim+eng');
            extractedText = text;
        } else if (fileType === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            extractedText = result.value;
        } else if (fileType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            workbook.SheetNames.forEach(sheet => {
                const worksheet = workbook.Sheets[sheet];
                const json = XLSX.utils.sheet_to_json(worksheet);
                extractedText += JSON.stringify(json) + '\n';
            });
        } else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            extractedText = await file.text();
        }
    } catch (err) {
        console.error('解析失败:', err);
        return null;
    }
    return { text: extractedText, fileName: fileName };
}

function extractKeywords(text) {
    const stopWords = ['的', '了', '是', '在', '和', '与', '有', '我', '你', '他', '她'];
    const words = text.split(/[ ,，。！？\n\t、；;：""''（）【】《》]+/);
    const keywordMap = new Map();
    for (let word of words) {
        if (word.length < 2 || word.length > 15) continue;
        if (stopWords.includes(word)) continue;
        if (/^[0-9]+$/.test(word)) continue;
        keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
    }
    const sorted = [...keywordMap.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 6).map(k => k[0]);
}

// 处理文件上传
async function processFile(file) {
    const progressDiv = document.getElementById('uploadProgress');
    const resultDiv = document.getElementById('uploadResult');
    progressDiv.style.display = 'block';
    resultDiv.innerHTML = `📄 解析: ${file.name}...`;
    
    const parsed = await parseFile(file);
    progressDiv.style.display = 'none';
    
    if (!parsed || !parsed.text || parsed.text.length < 10) {
        resultDiv.innerHTML = `❌ ${file.name} 识别失败`;
        return;
    }
    
    const keywords = extractKeywords(parsed.text);
    // 确定分类
    let category = 'other';
    for (let [cat, keywords_list] of Object.entries(categoryMap)) {
        if (keywords.some(kw => keywords_list.includes(kw))) {
            category = cat;
            break;
        }
    }
    
    // 存储文件
    uploadedFiles.push({
        name: parsed.fileName,
        content: parsed.text.substring(0, 500),
        category: category,
        keywords: keywords,
        timestamp: Date.now()
    });
    
    if (keywords.length > 0) {
        for (let kw of keywords) {
            if (!nodes.some(n => n.label === kw)) {
                const newNode = addNode(kw, undefined, undefined);
                if (newNode) newNode.type = 'blue';
            }
        }
        resultDiv.innerHTML = `✅ ${file.name}<br>📌 提取: ${keywords.join(', ')}<br>📁 归类: ${category || '通用'}`;
        renderAll();
        updateRecommendations();
        updateFileManager();
    }
}

// 更新文件管理器
function updateFileManager() {
    const container = document.getElementById('fileManagerContent');
    if (!container) return;
    
    // 按分类分组
    const groups = {};
    for (let file of uploadedFiles) {
        const cat = file.category || '未分类';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(file);
    }
    
    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<div style="padding:12px;text-align:center;color:#6b7280;">暂无上传文件</div>';
        return;
    }
    
    let html = '';
    for (let [cat, files] of Object.entries(groups)) {
        const folderIcon = cat === 'physics' ? '⚛️' : (cat === 'philosophy' ? '📜' : (cat === 'ai' ? '🤖' : (cat === 'history' ? '🏛️' : '📁')));
        html += `<div class="folder-item">
            <div class="folder-header" onclick="toggleFolder(this)">
                <span>${folderIcon}</span> <strong>${cat}</strong> <span style="font-size:0.6rem;">(${files.length})</span>
                <span style="margin-left:auto;">▼</span>
            </div>
            <div class="folder-content" style="display:block; margin-left:16px;">`;
        for (let file of files) {
            html += `<div class="file-item">
                <span class="file-name" onclick="viewFileContent('${file.name.replace(/'/g, "\\'")}')">📄 ${file.name}</span>
                <span style="font-size:0.6rem;">💰${file.keywords.length * 10}</span>
            </div>`;
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

function toggleFolder(header) {
    const content = header.nextElementSibling;
    if (content) {
        const isVisible = content.style.display !== 'none';
        content.style.display = isVisible ? 'none' : 'block';
        header.querySelector('span:last-child').innerHTML = isVisible ? '▶' : '▼';
    }
}

function viewFileContent(fileName) {
    const file = uploadedFiles.find(f => f.name === fileName);
    if (file) {
        alert(`文件: ${file.name}\n提取关键词: ${file.keywords.join(', ')}\n内容预览:\n${file.content}`);
    }
}

// 下载所有文件
function downloadAllFiles() {
    const zip = new JSZip();
    for (let file of uploadedFiles) {
        const folder = zip.folder(file.category || '未分类');
        folder.file(`${file.name}.txt`, file.content);
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `知识库_${new Date().toISOString().slice(0,19)}.zip`;
        link.click();
    });
}

// 渲染图谱（只显示可见节点）
function renderAll() {
    const canvas = document.getElementById('graphCanvas');
    const svgLine = document.getElementById('lineSvg');
    canvas.innerHTML = '';
    
    const visibleNodes = nodes.filter(n => n.visible !== false);
    
    for (let node of visibleNodes) {
        const div = document.createElement('div');
        div.className = `node-card ${node.type}`;
        div.innerText = `${node.label} 💰${node.goldValue}`;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.setAttribute('data-id', node.id);
        canvas.appendChild(div);
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            document.getElementById('searchKeyword').value = node.label;
            searchNodeAndShowGold(node.label);
        });
        
        // 右键删除
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (confirm(`删除知识点 "${node.label}"？`)) {
                deleteNode(node.id);
            }
        });
    }
    
    // 绘制虚线
    svgLine.innerHTML = '';
    for (let node of visibleNodes) {
        if (node.childrenIds && node.childrenIds.length) {
            const parentDiv = document.querySelector(`.node-card[data-id='${node.id}']`);
            if (!parentDiv) continue;
            const parentRect = parentDiv.getBoundingClientRect();
            const containerRect = canvas.getBoundingClientRect();
            const startX = parentRect.left + parentRect.width/2 - containerRect.left;
            const startY = parentRect.top + parentRect.height/2 - containerRect.top;
            for (let childId of node.childrenIds) {
                const childNode = nodes.find(n => n.id === childId);
                if (childNode && childNode.visible !== false) {
                    const childDiv = document.querySelector(`.node-card[data-id='${childId}']`);
                    if (childDiv) {
                        const childRect = childDiv.getBoundingClientRect();
                        const endX = childRect.left + childRect.width/2 - containerRect.left;
                        const endY = childRect.top + childRect.height/2 - containerRect.top;
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', startX);
                        line.setAttribute('y1', startY);
                        line.setAttribute('x2', endX);
                        line.setAttribute('y2', endY);
                        svgLine.appendChild(line);
                    }
                }
            }
        }
    }
    
    updateAllGold();
    updateNodeListUI();
}

// 更新节点列表
function updateNodeListUI() {
    const listContainer = document.getElementById('nodeListUl');
    listContainer.innerHTML = '';
    nodes.forEach(node => {
        const li = document.createElement('li');
        li.style.borderLeftColor = node.type === 'red' ? '#ef4444' : (node.type === 'blue' ? '#3b82f6' : '#6b7280');
        li.innerHTML = `<span>${node.label}</span><span style="color:#eab308;">💰${node.goldValue}</span>`;
        li.addEventListener('click', () => {
            document.getElementById('searchKeyword').value = node.label;
            searchNodeAndShowGold(node.label);
        });
        listContainer.appendChild(li);
    });
}

// 推荐学习
async function updateRecommendations() {
    const grayNodes = nodes.filter(n => n.type === 'gray');
    const recDiv = document.getElementById('recommendList');
    if (grayNodes.length === 0) {
        recDiv.innerHTML = '🎉 宇宙探索完毕！';
        return;
    }
    const top3 = grayNodes.slice(0, 3);
    recDiv.innerHTML = '';
    for (let node of top3) {
        const item = document.createElement('div');
        item.className = 'recommend-item';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between;">
                <span>📖 ${node.label} (💰${node.goldValue})</span>
                <span style="font-size:0.6rem;">🔍 搜网页</span>
            </div>
            <div class="web-links" style="margin-top:4px;"></div>
        `;
        item.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A') return;
            const linksDiv = item.querySelector('.web-links');
            if (linksDiv.innerHTML) { linksDiv.innerHTML = ''; return; }
            linksDiv.innerHTML = '<span style="color:#eab308;">🔍 检索中...</span>';
            const urls = [
                `https://baike.baidu.com/item/${encodeURIComponent(node.label)}`,
                `https://zh.wikipedia.org/wiki/${encodeURIComponent(node.label)}`
            ];
            linksDiv.innerHTML = urls.map(url => `<a href="${url}" target="_blank" style="display:block; font-size:0.6rem;">🔗 ${url.split('/')[2]}</a>`).join('');
        });
        recDiv.appendChild(item);
    }
}

function searchNodeAndShowGold(keyword) {
    if (!keyword) { document.getElementById('goldValue').innerText = '0'; return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(keyword.toLowerCase()));
    if (found) {
        document.getElementById('goldValue').innerText = found.goldValue;
        const el = document.querySelector(`.node-card[data-id='${found.id}']`);
        if (el) { el.style.transform = 'scale(1.05)'; setTimeout(() => el.style.transform = '', 300); }
    } else {
        document.getElementById('goldValue').innerText = '0';
    }
}

// 缩放功能
let canvasScale = 1;
function zoomCanvas(delta) {
    canvasScale = Math.min(2.5, Math.max(0.4, canvasScale + delta));
    document.getElementById('graphCanvas').style.transform = `scale(${canvasScale})`;
}
function zoomSidebar(delta) {
    sideZoom = Math.min(1.5, Math.max(0.6, sideZoom + delta));
    document.getElementById('sidebar').style.transform = `scale(${sideZoom})`;
    document.getElementById('sidebar').style.transformOrigin = 'top left';
}
function resetView() { canvasScale = 1; document.getElementById('graphCanvas').style.transform = 'scale(1)'; }

// 预设框架切换显示
function toggleFramework(path, btn) {
    frameworkVisibility[path] = !frameworkVisibility[path];
    if (btn) btn.classList.toggle('hidden-framework');
    // 显示/隐藏对应类别的节点
    for (let node of nodes) {
        const nodeCat = getNodeCategory(node.label);
        if (nodeCat === path) {
            node.visible = frameworkVisibility[path];
        }
    }
    renderAll();
}

// 添加预设框架
function addPresetFramework(type) {
    const presets = {
        physics: ['力学', '热力学', '电磁学', '量子力学', '相对论'],
        philosophy: ['形而上学', '认识论', '伦理学', '美学', '逻辑学'],
        ai: ['机器学习', '神经网络', '自然语言处理', '计算机视觉', '强化学习'],
        history: ['古代史', '中世纪史', '近代史', '现代史'],
        biology: ['细胞生物学', '遗传学', '进化论', '神经科学']
    };
    const topics = presets[type];
    if (topics) {
        for (let topic of topics) {
            if (!nodes.some(n => n.label === topic)) {
                addNode(topic, undefined, undefined);
            }
        }
        renderAll();
    }
}

// 拖拽逻辑
function initDrag() {
    let isDraggingNode = false;
    document.addEventListener('mousemove', (e) => {
        if (dragTarget && isDraggingNode) {
            const left = e.clientX - dragOffsetX;
            const top = e.clientY - dragOffsetY;
            dragTarget.style.left = `${left}px`;
            dragTarget.style.top = `${top}px`;
            const nodeId = parseInt(dragTarget.getAttribute('data-id'));
            const node = nodes.find(n => n.id === nodeId);
            if (node) { node.x = left; node.y = top; }
            renderAll();
        }
    });
    document.addEventListener('mouseup', () => { dragTarget = null; isDraggingNode = false; });
    document.addEventListener('mousedown', (e) => {
        const node = e.target.closest('.node-card');
        if (node) {
            dragTarget = node;
            isDraggingNode = true;
            const rect = node.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            node.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
}

// 滚轮缩放支持
function initWheelZoom() {
    const canvasContainer = document.getElementById('canvasContainer');
    const sidebar = document.getElementById('sidebar');
    
    canvasContainer.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomCanvas(e.deltaY > 0 ? -0.05 : 0.05);
        }
    }, { passive: false });
    
    sidebar.addEventListener('wheel', (e) => {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            zoomSidebar(e.deltaY > 0 ? -0.05 : 0.05);
        }
    }, { passive: false });
}

// 初始化
function initDemo() {
    addNode('量子物理', 200, 150, null, 'red');
    addNode('经典力学', 400, 200, null, 'red');
    addNode('人工智能', 350, 350, null, 'red');
    addNode('薛定谔方程', 150, 280, null, 'gray');
    addNode('神经网络', 500, 400, null, 'gray');
    renderAll();
}

// 事件绑定
document.getElementById('addKeywordBtn').addEventListener('click', () => {
    const input = document.getElementById('keywordInput');
    if (input.value.trim()) addNode(input.value.trim(), undefined, undefined);
    renderAll();
    input.value = '';
});
document.getElementById('zoomInBtn').addEventListener('click', () => zoomCanvas(0.1));
document.getElementById('zoomOutBtn').addEventListener('click', () => zoomCanvas(-0.1));
document.getElementById('resetViewBtn').addEventListener('click', resetView);
document.getElementById('clearAllBtn').addEventListener('click', () => { nodes = []; nextId = 100; renderAll(); updateFileManager(); });
document.getElementById('searchKeyword').addEventListener('input', (e) => searchNodeAndShowGold(e.target.value));
document.getElementById('downloadAllFilesBtn').addEventListener('click', downloadAllFiles);

// 文件管理器展开/收起
const fileManagerHeader = document.getElementById('fileManagerHeader');
const fileManagerContent = document.getElementById('fileManagerContent');
if (fileManagerHeader) {
    fileManagerHeader.style.cursor = 'pointer';
    fileManagerHeader.addEventListener('click', (e) => {
        if (e.target.tagName === 'BUTTON') return;
        const isVisible = fileManagerContent.style.display !== 'none';
        fileManagerContent.style.display = isVisible ? 'none' : 'block';
    });
}

// 预设框架按钮
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const path = btn.getAttribute('data-path');
        if (e.ctrlKey || e.metaKey) {
            toggleFramework(path, btn);
        } else {
            addPresetFramework(path);
        }
    });
});

// 上传
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileUpload');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#60a5fa'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = 'rgba(59,130,246,0.5)');
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    for (let file of files) processFile(file);
});
fileInput.addEventListener('change', (e) => { for (let file of e.target.files) processFile(file); });

initDrag();
initWheelZoom();
initDemo();

// 触摸屏支持
let touchStartZoom = 0;
document.getElementById('canvasContainer').addEventListener('touchstart', (e) => {
    if (e.touches.length === 2) {
        touchStartZoom = canvasScale;
    }
});
document.getElementById('canvasContainer').addEventListener('touchmove', (e) => {
    if (e.touches.length === 2) {
        e.preventDefault();
    }
});