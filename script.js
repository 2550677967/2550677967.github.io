// ==================== 智能知识图谱 - 层级联动版 ====================
let nodes = [];
let nextId = 100;
let canvasScale = 1;
let dragTarget = null;
let dragOffsetX = 0, dragOffsetY = 0;
let highlightedNodeId = null;
let expandedLevels = {}; // 记录每个节点展开的层级

// 预设框架显示状态
let frameworkVisibility = {
    physics: true, philosophy: true, ai: true, history: true, biology: true
};

let uploadedFiles = [];

// 分类映射
const categoryMap = {
    physics: ['力学', '量子', '相对论', '牛顿', '伽利略', '万有引力', '电磁', '热力学', '原子', '物理'],
    philosophy: ['哲学', '笛卡尔', '康德', '柏拉图', '亚里士多德', '存在主义', '认识论', '形而上学'],
    ai: ['AI', '人工智能', '机器学习', '神经网络', '深度学习', '算法', '大模型', 'GPT', '自然语言'],
    history: ['历史', '战争', '朝代', '革命', '古代', '中世纪', '文艺复兴', '帝国'],
    biology: ['生物', '基因', 'DNA', '进化', '细胞', '生态', '神经', '大脑']
};

function getNodeCategory(label) {
    for (let [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => label.includes(kw) || kw.includes(label))) return cat;
    }
    return 'other';
}

function calculateGoldValue(node, allNodes) {
    let gold = 50;
    if (node.childrenIds && node.childrenIds.length > 0) gold += node.childrenIds.length * 20;
    if (node.parentId) gold += 30;
    if (node.type === 'red') gold += 100;
    if (node.type === 'blue') gold += 20;
    return Math.min(gold, 999);
}

function updateAllGold() {
    let total = 0;
    for (let node of nodes) {
        node.goldValue = calculateGoldValue(node, nodes);
        total += node.goldValue;
    }
    document.getElementById('totalGold').innerHTML = `💰 ${total}`;
    return total;
}

// 添加节点
function addNode(label, x, y, parentId = null, typeOverride = null, level = 1) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    let existing = nodes.find(n => n.label === label);
    if (existing) return existing;
    
    const category = getNodeCategory(label);
    let type = typeOverride || (category !== 'other' ? 'red' : (level === 1 ? 'red' : 'gray'));
    
    const newNode = {
        id: nextId++,
        label: label,
        x: x || (Math.random() * 400 + 100 + (level * 50)),
        y: y || (Math.random() * 300 + 100 + (level * 30)),
        type: type,
        parentId: parentId,
        childrenIds: [],
        goldValue: 0,
        level: level,
        visible: true,
        expanded: false
    };
    newNode.goldValue = calculateGoldValue(newNode, nodes);
    nodes.push(newNode);
    
    if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent && !parent.childrenIds.includes(newNode.id)) {
            parent.childrenIds.push(newNode.id);
        }
    }
    return newNode;
}

// 删除节点
function deleteNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    // 递归删除子节点
    if (node.childrenIds && node.childrenIds.length > 0) {
        for (let childId of node.childrenIds) {
            deleteNode(childId);
        }
    }
    for (let n of nodes) {
        if (n.childrenIds) {
            n.childrenIds = n.childrenIds.filter(id => id !== nodeId);
        }
    }
    nodes = nodes.filter(n => n.id !== nodeId);
    renderAll();
    updateFileManager();
}

// 展开节点层级（点击大图标展示子节点）
function toggleExpandNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // 如果没有子节点，自动生成子节点
    if (!node.childrenIds || node.childrenIds.length === 0) {
        generateChildrenForNode(node);
    }
    
    node.expanded = !node.expanded;
    
    // 显示或隐藏子节点
    if (node.childrenIds) {
        for (let childId of node.childrenIds) {
            const child = nodes.find(n => n.id === childId);
            if (child) {
                child.visible = node.expanded;
            }
        }
    }
    renderAll();
}

// 为节点生成子节点
function generateChildrenForNode(parent) {
    const subTopics = {
        '量子物理': ['波粒二象性', '海森堡不确定性', '薛定谔方程', '量子纠缠', '量子隧穿'],
        '经典力学': ['牛顿三定律', '万有引力定律', '动量守恒', '能量守恒', '刚体力学'],
        '人工智能': ['机器学习', '深度学习', '自然语言处理', '计算机视觉', '强化学习'],
        '机器学习': ['监督学习', '无监督学习', '强化学习', '决策树', '神经网络'],
        '神经网络': ['感知机', '反向传播', 'CNN', 'RNN', 'Transformer'],
        '深度学习': ['深度神经网络', '卷积神经网络', '循环神经网络', '生成对抗网络', '自编码器'],
        '哲学': ['形而上学', '认识论', '伦理学', '美学', '逻辑学'],
        '物理学': ['经典物理', '量子物理', '相对论', '热力学', '电磁学']
    };
    
    let subs = subTopics[parent.label];
    if (!subs) {
        subs = [`${parent.label}原理`, `${parent.label}应用`, `${parent.label}发展史`, `${parent.label}核心概念`];
    }
    
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        if (!nodes.some(n => n.label === sub)) {
            const offsetX = (i - 2) * 100;
            const offsetY = 80;
            addNode(sub, parent.x + offsetX, parent.y + offsetY, parent.id, 'sub', parent.level + 1);
        }
    }
}

// 鼠标悬停高亮路径
function highlightPath(nodeId) {
    // 清除之前的高亮
    document.querySelectorAll('.node-card').forEach(el => {
        el.classList.remove('path-highlight', 'highlight');
    });
    document.querySelectorAll('.line-layer line').forEach(line => {
        line.classList.remove('path-highlight');
    });
    
    if (!nodeId) return;
    
    // 高亮节点本身
    const nodeEl = document.querySelector(`.node-card[data-id='${nodeId}']`);
    if (nodeEl) nodeEl.classList.add('path-highlight');
    
    // 收集路径上的所有节点ID
    const pathIds = new Set();
    let current = nodes.find(n => n.id === nodeId);
    while (current) {
        pathIds.add(current.id);
        if (current.parentId) {
            current = nodes.find(n => n.id === current.parentId);
        } else {
            break;
        }
    }
    
    // 添加所有子节点
    function addChildren(id) {
        const node = nodes.find(n => n.id === id);
        if (node && node.childrenIds) {
            for (let childId of node.childrenIds) {
                pathIds.add(childId);
                addChildren(childId);
            }
        }
    }
    addChildren(nodeId);
    
    // 高亮路径上的节点
    for (let id of pathIds) {
        const el = document.querySelector(`.node-card[data-id='${id}']`);
        if (el) el.classList.add('path-highlight');
    }
    
    // 高亮路径上的连线
    for (let node of nodes) {
        if (node.childrenIds) {
            for (let childId of node.childrenIds) {
                if (pathIds.has(node.id) && pathIds.has(childId)) {
                    const line = document.querySelector(`.line-layer line[data-from='${node.id}'][data-to='${childId}']`);
                    if (line) line.classList.add('path-highlight');
                }
            }
        }
    }
}

// 文件解析
async function parseFile(file) {
    const fileType = file.type;
    let extractedText = '';
    try {
        if (fileType.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file, 'chi_sim+eng');
            extractedText = text;
        } else if (fileType === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
        } else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            extractedText = result.value;
        } else if (fileType.includes('sheet') || file.name.endsWith('.xlsx')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            workbook.SheetNames.forEach(sheet => {
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
                extractedText += JSON.stringify(json) + '\n';
            });
        } else if (file.name.endsWith('.txt')) {
            extractedText = await file.text();
        }
    } catch (err) {
        return null;
    }
    return { text: extractedText, fileName: file.name };
}

function extractKeywords(text) {
    const stopWords = ['的', '了', '是', '在', '和', '与', '有', '我', '你'];
    const words = text.split(/[ ,，。！？\n\t、；;：""''（）【】《》]+/);
    const keywordMap = new Map();
    for (let word of words) {
        if (word.length < 2 || word.length > 12) continue;
        if (stopWords.includes(word)) continue;
        if (/^[0-9]+$/.test(word)) continue;
        keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
    }
    const sorted = [...keywordMap.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 5).map(k => k[0]);
}

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
    let category = 'other';
    for (let [cat, kwList] of Object.entries(categoryMap)) {
        if (keywords.some(kw => kwList.includes(kw))) {
            category = cat;
            break;
        }
    }
    
    uploadedFiles.push({
        id: Date.now() + Math.random(),
        name: parsed.fileName,
        content: parsed.text.substring(0, 300),
        category: category,
        keywords: keywords,
        timestamp: Date.now()
    });
    
    if (keywords.length > 0) {
        for (let kw of keywords) {
            if (!nodes.some(n => n.label === kw)) {
                addNode(kw, undefined, undefined);
            }
        }
        resultDiv.innerHTML = `✅ ${file.name}<br>📌 提取: ${keywords.join(', ')}`;
        renderAll();
        updateRecommendations();
        updateFileManager();
    }
}

// 删除文件
function deleteFile(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    updateFileManager();
}

// 更新文件管理器
function updateFileManager() {
    const container = document.getElementById('fileManagerContent');
    if (!container) return;
    
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
                <span>${folderIcon}</span> <strong>${cat}</strong> <span>(${files.length})</span>
                <span style="margin-left:auto;">▼</span>
            </div>
            <div class="folder-content" style="display:block; margin-left:12px;">`;
        for (let file of files) {
            html += `<div class="file-item">
                <span class="file-name" onclick="viewFileContent('${file.id}')">📄 ${file.name.substring(0, 25)}</span>
                <div style="display:flex; gap:4px;">
                    <span style="font-size:0.55rem;">💰${file.keywords.length * 10}</span>
                    <span class="delete-file-btn" onclick="event.stopPropagation(); deleteFile(${file.id})">🗑️</span>
                </div>
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

function viewFileContent(fileId) {
    const file = uploadedFiles.find(f => f.id == fileId);
    if (file) {
        alert(`文件: ${file.name}\n提取关键词: ${file.keywords.join(', ')}\n内容预览:\n${file.content}`);
    }
}

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

// 渲染图谱
function renderAll() {
    const canvas = document.getElementById('graphCanvas');
    const svgLine = document.getElementById('lineSvg');
    canvas.innerHTML = '';
    
    const visibleNodes = nodes.filter(n => n.visible !== false);
    
    for (let node of visibleNodes) {
        const div = document.createElement('div');
        const levelClass = node.level > 1 ? 'sub' : '';
        div.className = `node-card ${node.type} ${levelClass}`;
        div.innerText = `${node.label} 💰${node.goldValue}`;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.setAttribute('data-id', node.id);
        div.setAttribute('data-level', node.level);
        canvas.appendChild(div);
        
        // 点击事件 - 展开/收起层级
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (node.type === 'red' || node.childrenIds.length > 0) {
                toggleExpandNode(node.id);
            }
        });
        
        // 右键删除
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`删除 "${node.label}"？`)) {
                deleteNode(node.id);
            }
        });
        
        // 鼠标悬停高亮路径
        div.addEventListener('mouseenter', () => highlightPath(node.id));
        div.addEventListener('mouseleave', () => highlightPath(null));
    }
    
    // 绘制连线
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
                        line.setAttribute('data-from', node.id);
                        line.setAttribute('data-to', childId);
                        svgLine.appendChild(line);
                    }
                }
            }
        }
    }
    
    updateAllGold();
    updateNodeListUI();
}

function updateNodeListUI() {
    const listContainer = document.getElementById('nodeListUl');
    listContainer.innerHTML = '';
    nodes.slice(0, 20).forEach(node => {
        const li = document.createElement('li');
        li.style.borderLeftColor = node.type === 'red' ? '#ef4444' : (node.type === 'blue' ? '#3b82f6' : '#6b7280');
        li.innerHTML = `<span>${node.label}</span><span>💰${node.goldValue}</span>`;
        li.addEventListener('click', () => {
            document.getElementById('searchKeyword').value = node.label;
            searchNodeAndShowGold(node.label);
            highlightPath(node.id);
            setTimeout(() => highlightPath(null), 2000);
        });
        listContainer.appendChild(li);
    });
}

async function updateRecommendations() {
    const grayNodes = nodes.filter(n => n.type === 'gray');
    const recDiv = document.getElementById('recommendList');
    if (grayNodes.length === 0) {
        recDiv.innerHTML = '🎉 探索完毕！';
        return;
    }
    const top3 = grayNodes.slice(0, 3);
    recDiv.innerHTML = '';
    for (let node of top3) {
        const item = document.createElement('div');
        item.className = 'recommend-item';
        item.innerHTML = `<span>📖 ${node.label} (💰${node.goldValue})</span>`;
        item.addEventListener('click', () => {
            document.getElementById('searchKeyword').value = node.label;
            searchNodeAndShowGold(node.label);
            highlightPath(node.id);
        });
        recDiv.appendChild(item);
    }
}

function searchNodeAndShowGold(keyword) {
    if (!keyword) { document.getElementById('goldValue').innerText = '0'; return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(keyword.toLowerCase()));
    if (found) {
        document.getElementById('goldValue').innerText = found.goldValue;
        highlightPath(found.id);
        setTimeout(() => highlightPath(null), 2000);
    } else {
        document.getElementById('goldValue').innerText = '0';
    }
}

// 缩放
function zoomCanvas(delta) {
    canvasScale = Math.min(2, Math.max(0.5, canvasScale + delta));
    document.getElementById('graphCanvas').style.transform = `scale(${canvasScale})`;
}
function resetView() { canvasScale = 1; document.getElementById('graphCanvas').style.transform = 'scale(1)'; }

// 拖拽逻辑
function initDrag() {
    let isDragging = false;
    document.addEventListener('mousemove', (e) => {
        if (dragTarget && isDragging) {
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
    document.addEventListener('mouseup', () => { dragTarget = null; isDragging = false; });
    document.addEventListener('mousedown', (e) => {
        const node = e.target.closest('.node-card');
        if (node && !e.ctrlKey) {
            dragTarget = node;
            isDragging = true;
            const rect = node.getBoundingClientRect();
            dragOffsetX = e.clientX - rect.left;
            dragOffsetY = e.clientY - rect.top;
            node.style.cursor = 'grabbing';
            e.preventDefault();
        }
    });
}

// 添加预设
function addPresetFramework(type) {
    const presets = {
        physics: ['量子物理', '经典力学', '相对论', '热力学'],
        philosophy: ['形而上学', '认识论', '伦理学', '美学'],
        ai: ['人工智能', '机器学习', '神经网络', '深度学习'],
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

function toggleFramework(path, btn) {
    frameworkVisibility[path] = !frameworkVisibility[path];
    if (btn) btn.classList.toggle('hidden-framework');
    for (let node of nodes) {
        if (getNodeCategory(node.label) === path) {
            node.visible = frameworkVisibility[path];
        }
    }
    renderAll();
}

// 初始化
function initDemo() {
    addNode('量子物理', 300, 200, null, 'red', 1);
    addNode('经典力学', 550, 200, null, 'red', 1);
    addNode('人工智能', 420, 400, null, 'red', 1);
    addNode('哲学', 180, 350, null, 'red', 1);
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
document.getElementById('clearAllBtn').addEventListener('click', () => { nodes = []; nextId = 100; renderAll(); });
document.getElementById('searchKeyword').addEventListener('input', (e) => searchNodeAndShowGold(e.target.value));
document.getElementById('downloadAllFilesBtn').addEventListener('click', downloadAllFiles);

// 文件管理器展开
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
    for (let file of e.dataTransfer.files) processFile(file);
});
fileInput.addEventListener('change', (e) => { for (let file of e.target.files) processFile(file); });

initDrag();
initDemo();

// 暴露全局函数
window.toggleFolder = toggleFolder;
window.viewFileContent = viewFileContent;
window.deleteFile = deleteFile;