// ==================== 三级联动知识图谱 ====================
let nodes = [];
let nextId = 100;
let canvasScale = 1;
let dragTarget = null;
let dragOffsetX = 0, dragOffsetY = 0;
let isDragging = false;
let sidebarWidth = 280;

let uploadedFiles = [];

// 知识扩展库 - 自动生成子节点
const knowledgeExpansion = {
    // 一级 -> 二级
    level2: {
        '量子物理': ['波粒二象性', '海森堡不确定性', '薛定谔方程', '量子纠缠', '量子隧穿'],
        '经典力学': ['牛顿三定律', '万有引力定律', '动量守恒', '能量守恒', '刚体力学'],
        '人工智能': ['机器学习', '深度学习', '自然语言处理', '计算机视觉', '强化学习'],
        '机器学习': ['监督学习', '无监督学习', '强化学习', '决策树', '支持向量机'],
        '深度学习': ['深度神经网络', '卷积神经网络', '循环神经网络', '生成对抗网络', 'Transformer'],
        '神经网络': ['感知机', '反向传播', '激活函数', '损失函数', '优化器'],
        '哲学': ['形而上学', '认识论', '伦理学', '美学', '逻辑学'],
        '形而上学': ['本体论', '宇宙论', '自由意志', '决定论', '存在'],
        '认识论': ['知识定义', '真理理论', '怀疑论', '先验知识', '后验知识'],
        '伦理学': ['义务论', '功利主义', '美德伦理', '契约论', '元伦理学'],
        '物理学': ['经典物理', '量子物理', '相对论', '热力学', '电磁学'],
        '心理学': ['认知心理学', '发展心理学', '社会心理学', '临床心理学', '神经心理学']
    },
    // 二级 -> 三级
    level3: {
        '机器学习': ['线性回归', '逻辑回归', '决策树', '随机森林', 'KNN', 'K-Means'],
        '深度学习': ['DNN', 'CNN架构', 'RNN/LSTM', 'GAN原理', '注意力机制'],
        '神经网络': ['神经元模型', '前向传播', '反向传播算法', '梯度下降', '过拟合'],
        '薛定谔方程': ['定态薛定谔方程', '含时薛定谔方程', '势阱问题', '谐振子', '氢原子'],
        '量子纠缠': ['贝尔不等式', 'EPR佯谬', '量子隐形传态', '纠缠态制备', '量子通信'],
        '牛顿三定律': ['惯性定律', 'F=ma', '作用力反作用力', '惯性系', '非惯性系']
    }
};

// 分类映射
const categoryMap = {
    physics: ['物理', '量子', '力学', '相对论', '牛顿', '薛定谔', '电磁'],
    philosophy: ['哲学', '形而上学', '认识论', '伦理', '美学', '逻辑'],
    ai: ['AI', '人工智能', '机器学习', '神经网络', '深度', '算法', 'GPT'],
    history: ['历史', '战争', '朝代', '革命', '古代'],
    biology: ['生物', '基因', 'DNA', '进化', '细胞', '神经']
};

function getNodeCategory(label) {
    for (let [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => label.includes(kw))) return cat;
    }
    return 'other';
}

function calculateGoldValue(node) {
    let gold = 30;
    if (node.level === 1) gold = 100;
    else if (node.level === 2) gold = 50;
    else gold = 20;
    if (node.childrenIds && node.childrenIds.length > 0) gold += node.childrenIds.length * 10;
    return gold;
}

function updateAllGold() {
    let total = 0;
    for (let node of nodes) {
        node.goldValue = calculateGoldValue(node);
        total += node.goldValue;
    }
    document.getElementById('totalGold').innerHTML = `💰 ${total}`;
    return total;
}

// 添加节点
function addNode(label, x, y, parentId = null, level = 1) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    let existing = nodes.find(n => n.label === label);
    if (existing) return existing;
    
    const category = getNodeCategory(label);
    let type = 'gray';
    if (level === 1) type = 'red';
    else if (level === 2) type = 'blue';
    
    // 根据层级调整位置偏移
    let posX = x || (Math.random() * 400 + 100 + (level * 40));
    let posY = y || (Math.random() * 250 + 100 + (level * 50));
    
    if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent) {
            posX = parent.x + (Math.random() - 0.5) * 150;
            posY = parent.y + 80 + (level * 20);
        }
    }
    
    const newNode = {
        id: nextId++,
        label: label,
        x: posX,
        y: posY,
        type: type,
        level: level,
        parentId: parentId,
        childrenIds: [],
        goldValue: 0,
        visible: true,
        expanded: false
    };
    newNode.goldValue = calculateGoldValue(newNode);
    nodes.push(newNode);
    
    if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent && !parent.childrenIds.includes(newNode.id)) {
            parent.childrenIds.push(newNode.id);
        }
    }
    return newNode;
}

// 自动扩展子节点（三级联动核心）
function expandNode(nodeId, level) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    // 如果已有子节点且未展开，则展开
    if (node.childrenIds && node.childrenIds.length > 0) {
        for (let childId of node.childrenIds) {
            const child = nodes.find(n => n.id === childId);
            if (child) child.visible = true;
        }
        node.expanded = true;
        renderAll();
        return;
    }
    
    // 生成子节点
    let subs = [];
    if (level === 1) {
        subs = knowledgeExpansion.level2[node.label] || 
               [`${node.label}基础`, `${node.label}原理`, `${node.label}应用`, `${node.label}发展史`];
    } else if (level === 2) {
        subs = knowledgeExpansion.level3[node.label] || 
               [`${node.label}核心概念`, `${node.label}方法论`, `${node.label}实践案例`];
    }
    
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        if (!nodes.some(n => n.label === sub)) {
            addNode(sub, node.x + (i - 2) * 80, node.y + 70, node.id, level + 1);
        }
    }
    
    node.expanded = true;
    renderAll();
}

// 收起子节点
function collapseNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.childrenIds) return;
    for (let childId of node.childrenIds) {
        const child = nodes.find(n => n.id === childId);
        if (child) {
            child.visible = false;
            collapseNode(childId); // 递归收起
        }
    }
    node.expanded = false;
    renderAll();
}

// 切换展开/收起
function toggleExpandNode(nodeId, level) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    if (node.expanded) {
        collapseNode(nodeId);
    } else {
        expandNode(nodeId, level);
    }
}

// 删除节点
function deleteNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.childrenIds) {
        for (let childId of node.childrenIds) {
            deleteNode(childId);
        }
    }
    for (let n of nodes) {
        if (n.childrenIds) n.childrenIds = n.childrenIds.filter(id => id !== nodeId);
    }
    nodes = nodes.filter(n => n.id !== nodeId);
    renderAll();
    updateFileManager();
}

// 鼠标悬停高亮路径
function highlightPath(nodeId) {
    document.querySelectorAll('.node-card').forEach(el => el.classList.remove('path-highlight'));
    document.querySelectorAll('.line-layer line').forEach(line => line.classList.remove('path-highlight'));
    if (!nodeId) return;
    
    const nodeEl = document.querySelector(`.node-card[data-id='${nodeId}']`);
    if (nodeEl) nodeEl.classList.add('path-highlight');
    
    // 收集路径上的节点
    const pathIds = new Set();
    let current = nodes.find(n => n.id === nodeId);
    while (current) {
        pathIds.add(current.id);
        if (current.parentId) current = nodes.find(n => n.id === current.parentId);
        else break;
    }
    
    function addChildren(id) {
        const n = nodes.find(n => n.id === id);
        if (n && n.childrenIds) {
            for (let childId of n.childrenIds) {
                pathIds.add(childId);
                addChildren(childId);
            }
        }
    }
    addChildren(nodeId);
    
    for (let id of pathIds) {
        const el = document.querySelector(`.node-card[data-id='${id}']`);
        if (el) el.classList.add('path-highlight');
    }
    
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

// 文件处理
async function parseFile(file) {
    let extractedText = '';
    try {
        if (file.type.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file, 'chi_sim+eng');
            extractedText = text;
        } else if (file.type === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 3); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                extractedText += textContent.items.map(item => item.str).join(' ');
            }
        } else if (file.type.includes('sheet') || file.name.endsWith('.xlsx')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            workbook.SheetNames.forEach(sheet => {
                const json = XLSX.utils.sheet_to_json(workbook.Sheets[sheet]);
                extractedText += JSON.stringify(json);
            });
        } else if (file.name.endsWith('.docx')) {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer });
            extractedText = result.value;
        } else if (file.name.endsWith('.txt')) {
            extractedText = await file.text();
        }
    } catch (err) { return null; }
    return { text: extractedText, fileName: file.name };
}

function extractKeywords(text) {
    const stopWords = ['的', '了', '是', '在', '和', '与', '有', '我', '你'];
    const words = text.split(/[ ,，。！？\n\t、；；:：]+/);
    const freq = new Map();
    for (let w of words) {
        if (w.length < 2 || w.length > 10) continue;
        if (stopWords.includes(w)) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
    }
    return [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0,5).map(k=>k[0]);
}

async function processFile(file) {
    const progressDiv = document.getElementById('uploadProgress');
    const resultDiv = document.getElementById('uploadResult');
    progressDiv.style.display = 'block';
    resultDiv.innerHTML = `解析中...`;
    
    const parsed = await parseFile(file);
    progressDiv.style.display = 'none';
    if (!parsed || !parsed.text) {
        resultDiv.innerHTML = `❌ 识别失败`;
        return;
    }
    
    const keywords = extractKeywords(parsed.text);
    let category = 'other';
    for (let [cat, kwList] of Object.entries(categoryMap)) {
        if (keywords.some(kw => kwList.includes(kw))) { category = cat; break; }
    }
    
    uploadedFiles.push({
        id: Date.now() + Math.random(),
        name: parsed.fileName,
        content: parsed.text.substring(0, 200),
        category: category,
        keywords: keywords
    });
    
    if (keywords.length > 0) {
        for (let kw of keywords) {
            if (!nodes.some(n => n.label === kw)) {
                addNode(kw, undefined, undefined, null, 1);
            }
        }
        resultDiv.innerHTML = `✅ 提取: ${keywords.join(', ')}`;
        renderAll();
        updateRecommendations();
        updateFileManager();
    }
}

function deleteFile(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    updateFileManager();
}

function updateFileManager() {
    const container = document.getElementById('fileManagerContent');
    const groups = {};
    for (let f of uploadedFiles) {
        let cat = f.category || '其他';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(f);
    }
    if (Object.keys(groups).length === 0) {
        container.innerHTML = '<div style="padding:8px;text-align:center;color:#6b7280;">暂无文件</div>';
        return;
    }
    let html = '';
    for (let [cat, files] of Object.entries(groups)) {
        html += `<div class="folder-item">
            <div class="folder-header" onclick="toggleFolder(this)">
                <span>📁</span> ${cat} (${files.length}) <span style="margin-left:auto;">▼</span>
            </div>
            <div class="folder-content" style="display:block; margin-left:12px;">`;
        for (let f of files) {
            html += `<div class="file-item">
                <span class="file-name" onclick="viewFile('${f.id}')">📄 ${f.name.substring(0, 20)}</span>
                <span class="delete-file-btn" onclick="event.stopPropagation(); deleteFile(${f.id})">🗑️</span>
            </div>`;
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;
}

function toggleFolder(header) {
    const content = header.nextElementSibling;
    if (content) {
        const visible = content.style.display !== 'none';
        content.style.display = visible ? 'none' : 'block';
        header.querySelector('span:last-child').innerHTML = visible ? '▶' : '▼';
    }
}

function viewFile(fileId) {
    const f = uploadedFiles.find(f => f.id == fileId);
    if (f) alert(`文件: ${f.name}\n关键词: ${f.keywords.join(', ')}`);
}

function downloadAllFiles() {
    const zip = new JSZip();
    for (let f of uploadedFiles) {
        zip.file(`${f.name}.txt`, f.content);
    }
    zip.generateAsync({ type: 'blob' }).then(content => {
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `知识库_${Date.now()}.zip`;
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
        div.className = `node-card ${node.type} level${node.level}`;
        div.innerText = `${node.label} 💰${node.goldValue}`;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.setAttribute('data-id', node.id);
        div.setAttribute('data-level', node.level);
        canvas.appendChild(div);
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExpandNode(node.id, node.level);
        });
        
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`删除 "${node.label}"？`)) deleteNode(node.id);
        });
        
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
    
    updateAllGold();
    updateNodeListUI();
}

function updateNodeListUI() {
    const container = document.getElementById('nodeListUl');
    container.innerHTML = '';
    nodes.slice(0, 25).forEach(node => {
        const li = document.createElement('li');
        li.style.borderLeftColor = node.level === 1 ? '#ef4444' : (node.level === 2 ? '#3b82f6' : '#6b7280');
        li.innerHTML = `<span>${node.label}</span><span>💰${node.goldValue}</span>`;
        li.addEventListener('click', () => toggleExpandNode(node.id, node.level));
        container.appendChild(li);
    });
}

function updateRecommendations() {
    const grayNodes = nodes.filter(n => n.level === 2 && n.type === 'gray');
    const recDiv = document.getElementById('recommendList');
    if (grayNodes.length === 0) {
        recDiv.innerHTML = '🎉 完成探索！';
        return;
    }
    recDiv.innerHTML = grayNodes.slice(0, 3).map(n => `<div class="recommend-item" onclick="toggleExpandNode(${n.id},2)">📖 ${n.label}</div>`).join('');
}

function searchNode(keyword) {
    if (!keyword) { document.getElementById('goldValue').innerText = '0'; return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(keyword.toLowerCase()));
    if (found) {
        document.getElementById('goldValue').innerText = found.goldValue;
        highlightPath(found.id);
        setTimeout(() => highlightPath(null), 2000);
    }
}

// 缩放
function zoomCanvas(delta) {
    canvasScale = Math.min(2, Math.max(0.4, canvasScale + delta));
    document.getElementById('graphCanvas').style.transform = `scale(${canvasScale})`;
}
function resetView() { canvasScale = 1; document.getElementById('graphCanvas').style.transform = 'scale(1)'; }

// 拖拽
function initDrag() {
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

// 侧边栏伸缩
function initResize() {
    const handle = document.getElementById('resizeHandle');
    const sidebar = document.getElementById('sidebar');
    let startX, startWidth;
    
    handle.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (startX) {
            const delta = e.clientX - startX;
            let newWidth = startWidth + delta;
            newWidth = Math.min(450, Math.max(180, newWidth));
            sidebar.style.width = newWidth + 'px';
        }
    });
    
    document.addEventListener('mouseup', () => {
        startX = null;
        document.body.style.cursor = '';
    });
}

// 添加预设
function addPreset(type) {
    const presets = {
        physics: ['量子物理', '经典力学', '相对论', '热力学'],
        philosophy: ['哲学', '形而上学', '认识论', '伦理学'],
        ai: ['人工智能', '机器学习', '深度学习', '神经网络'],
        history: ['古代史', '中世纪史', '近代史'],
        biology: ['细胞生物学', '遗传学', '进化论']
    };
    for (let topic of (presets[type] || [])) {
        if (!nodes.some(n => n.label === topic)) addNode(topic);
    }
    renderAll();
}

// 初始化
function initDemo() {
    addNode('量子物理', 300, 180, null, 1);
    addNode('经典力学', 550, 180, null, 1);
    addNode('人工智能', 420, 350, null, 1);
    addNode('哲学', 150, 320, null, 1);
    renderAll();
}

// 事件绑定
document.getElementById('addKeywordBtn').addEventListener('click', () => {
    const inp = document.getElementById('keywordInput');
    if (inp.value.trim()) addNode(inp.value.trim(), undefined, undefined, null, 1);
    renderAll();
    inp.value = '';
});
document.getElementById('zoomInBtn').addEventListener('click', () => zoomCanvas(0.1));
document.getElementById('zoomOutBtn').addEventListener('click', () => zoomCanvas(-0.1));
document.getElementById('resetViewBtn').addEventListener('click', resetView);
document.getElementById('clearAllBtn').addEventListener('click', () => { nodes = []; nextId = 100; renderAll(); });
document.getElementById('searchKeyword').addEventListener('input', (e) => searchNode(e.target.value));
document.getElementById('downloadAllFilesBtn').addEventListener('click', downloadAllFiles);

document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => addPreset(btn.getAttribute('data-path')));
});

const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileUpload');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#60a5fa'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = 'rgba(59,130,246,0.5)');
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    for (let f of e.dataTransfer.files) processFile(f);
});
fileInput.addEventListener('change', (e) => { for (let f of e.target.files) processFile(f); });

const fileManagerHeader = document.getElementById('fileManagerHeader');
const fileManagerContent = document.getElementById('fileManagerContent');
fileManagerHeader.addEventListener('click', (e) => {
    if (e.target.tagName === 'BUTTON') return;
    const visible = fileManagerContent.style.display !== 'none';
    fileManagerContent.style.display = visible ? 'none' : 'block';
});

initDrag();
initResize();
initDemo();

window.toggleFolder = toggleFolder;
window.viewFile = viewFile;
window.deleteFile = deleteFile;
window.toggleExpandNode = toggleExpandNode;