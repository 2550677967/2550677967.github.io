// ==================== 三级联动知识图谱 ====================
let nodes = [];
let nextId = 100;
let canvasScale = 1;
let dragTarget = null;
let dragStartX = 0, dragStartY = 0;
let dragStartLeft = 0, dragStartTop = 0;
let isDragging = false;
let dragThreshold = 3; // 拖动阈值，小于此值视为点击

let uploadedFiles = [];

// ==================== 每日语录库 ====================
const quotes = [
    { text: "学而不思则罔，思而不学则殆。", author: "孔子", explanation: "只学习不思考就会迷惑，只思考不学习就会危险。强调学习与思考的结合。" },
    { text: "知之者不如好之者，好之者不如乐之者。", author: "孔子", explanation: "懂得学习的人不如喜爱学习的人，喜爱学习的人不如以学习为乐的人。" },
    { text: "天行健，君子以自强不息。", author: "《周易》", explanation: "宇宙不停运转，君子应效法天地，永远不断地前进。" },
    { text: "宝剑锋从磨砺出，梅花香自苦寒来。", author: "佚名", explanation: "宝剑的锋利来自反复磨砺，梅花的清香源于寒冬。喻指成功需经历艰苦磨练。" },
    { text: "路漫漫其修远兮，吾将上下而求索。", author: "屈原", explanation: "前方的道路漫长遥远，我将不遗余力地追求探索。" },
    { text: "不积跬步，无以至千里；不积小流，无以成江海。", author: "荀子", explanation: "没有一步半步的积累，无法到达千里；没有细流的汇聚，无法形成江海。" },
    { text: "The only limit is your mind.", author: "未知", explanation: "唯一的限制是你的思想。突破思维局限，才能无限可能。" },
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs", explanation: "求知若饥，虚心若愚。保持对知识的渴望和初学者的心态。" },
    { text: "Knowledge is power.", author: "Francis Bacon", explanation: "知识就是力量。知识能赋予我们改变世界的能力。" },
    { text: "The future belongs to those who learn more skills.", author: "未知", explanation: "未来属于那些学习更多技能的人。" },
    { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游", explanation: "从书本上得到的知识终归浅薄，要真正理解需亲身实践。" },
    { text: "问渠那得清如许？为有源头活水来。", author: "朱熹", explanation: "池塘为何如此清澈？因为有活水源头不断流入。比喻知识需要不断更新。" },
    { text: "博观而约取，厚积而薄发。", author: "苏轼", explanation: "广泛阅读而简约吸取，深厚积累而缓慢释放。" },
    { text: "业精于勤，荒于嬉；行成于思，毁于随。", author: "韩愈", explanation: "学业精进在于勤奋，荒废在于玩乐；做事成功在于思考，失败在于随性。" }
];

// 获取每日语录（基于日期）
function getDailyQuote() {
    const today = new Date().toDateString();
    let stored = localStorage.getItem('dailyQuote');
    let storedDate = localStorage.getItem('dailyQuoteDate');
    
    if (stored && storedDate === today) {
        return JSON.parse(stored);
    }
    
    // 根据日期选择不同语录
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const quoteIndex = dayOfYear % quotes.length;
    const quote = quotes[quoteIndex];
    
    localStorage.setItem('dailyQuote', JSON.stringify(quote));
    localStorage.setItem('dailyQuoteDate', today);
    return quote;
}

// 更新每日语录显示
function updateDailyQuote() {
    const quote = getDailyQuote();
    document.getElementById('quoteText').innerHTML = `“${quote.text}”`;
    document.getElementById('quoteAuthor').innerHTML = `—— ${quote.author}`;
    document.getElementById('quoteExplanation').innerHTML = `📖 ${quote.explanation}`;
}

// 语录窗口折叠功能
function initQuoteWindow() {
    const quoteWindow = document.getElementById('quoteWindow');
    const quoteHeader = document.getElementById('quoteHeader');
    
    quoteHeader.addEventListener('click', () => {
        quoteWindow.classList.toggle('collapsed');
    });
    
    // 鼠标悬停高光
    quoteHeader.addEventListener('mouseenter', () => {
        quoteHeader.style.background = 'rgba(59, 130, 246, 0.2)';
    });
    quoteHeader.addEventListener('mouseleave', () => {
        quoteHeader.style.background = 'transparent';
    });
}

// 知识扩展库
const knowledgeExpansion = {
    level2: {
        '量子物理': ['波粒二象性', '海森堡不确定性', '薛定谔方程', '量子纠缠', '量子隧穿'],
        '经典力学': ['牛顿三定律', '万有引力定律', '动量守恒', '能量守恒', '刚体力学'],
        '人工智能': ['机器学习', '深度学习', '自然语言处理', '计算机视觉', '强化学习'],
        '机器学习': ['监督学习', '无监督学习', '强化学习', '决策树', '支持向量机'],
        '深度学习': ['深度神经网络', '卷积神经网络', '循环神经网络', '生成对抗网络', 'Transformer'],
        '神经网络': ['感知机', '反向传播', '激活函数', '损失函数', '优化器'],
        '哲学': ['形而上学', '认识论', '伦理学', '美学', '逻辑学'],
        '物理学': ['经典物理', '量子物理', '相对论', '热力学', '电磁学'],
        '相对论': ['狭义相对论', '广义相对论', '时间膨胀', '长度收缩', '质能方程']
    },
    level3: {
        '机器学习': ['线性回归', '逻辑回归', '决策树', '随机森林', 'K-Means'],
        '深度学习': ['DNN', 'CNN架构', 'RNN/LSTM', 'GAN原理', '注意力机制'],
        '神经网络': ['神经元模型', '前向传播', '反向传播', '梯度下降', '激活函数'],
        '薛定谔方程': ['定态方程', '含时方程', '势阱问题', '谐振子', '氢原子'],
        '量子纠缠': ['贝尔不等式', 'EPR佯谬', '量子隐形传态', '纠缠态', '量子通信']
    }
};

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

function addNode(label, x, y, parentId = null, level = 1) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    let existing = nodes.find(n => n.label === label);
    if (existing) return existing;
    
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

function expandNode(nodeId, level) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    
    if (node.childrenIds && node.childrenIds.length > 0) {
        for (let childId of node.childrenIds) {
            const child = nodes.find(n => n.id === childId);
            if (child) child.visible = true;
        }
        node.expanded = true;
        renderAll();
        return;
    }
    
    let subs = [];
    if (level === 1) {
        subs = knowledgeExpansion.level2[node.label] || 
               [`${node.label}基础`, `${node.label}原理`, `${node.label}应用`];
    } else if (level === 2) {
        subs = knowledgeExpansion.level3[node.label] || 
               [`${node.label}核心概念`, `${node.label}方法论`, `${node.label}案例`];
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

function collapseNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || !node.childrenIds) return;
    for (let childId of node.childrenIds) {
        const child = nodes.find(n => n.id === childId);
        if (child) {
            child.visible = false;
            collapseNode(childId);
        }
    }
    node.expanded = false;
    renderAll();
}

function toggleExpandNode(nodeId, level) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.expanded) {
        collapseNode(nodeId);
    } else {
        expandNode(nodeId, level);
    }
}

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

function highlightPath(nodeId) {
    document.querySelectorAll('.node-card').forEach(el => el.classList.remove('path-highlight'));
    document.querySelectorAll('.line-layer line').forEach(line => line.classList.remove('path-highlight'));
    if (!nodeId) return;
    
    const nodeEl = document.querySelector(`.node-card[data-id='${nodeId}']`);
    if (nodeEl) nodeEl.classList.add('path-highlight');
    
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
    const words = text.split(/[ ,，。！？\n\t、；;:：]+/);
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
            <div class="folder-header" onclick="window.toggleFolder(this)">
                <span>📁</span> ${cat} (${files.length}) <span style="margin-left:auto;">▼</span>
            </div>
            <div class="folder-content" style="display:block; margin-left:12px;">`;
        for (let f of files) {
            html += `<div class="file-item">
                <span class="file-name" onclick="window.viewFile('${f.id}')">📄 ${f.name.substring(0, 20)}</span>
                <span class="delete-file-btn" onclick="event.stopPropagation(); window.deleteFile(${f.id})">🗑️</span>
            </div>`;
        }
        html += `</div></div>`;
    }
    container.innerHTML = html;
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
        div.className = `node-card level${node.level}`;
        div.innerText = `${node.label} 💰${node.goldValue}`;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.setAttribute('data-id', node.id);
        div.setAttribute('data-level', node.level);
        canvas.appendChild(div);
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            // 只有非拖拽状态才触发点击展开
            if (!isDragging) {
                toggleExpandNode(node.id, node.level);
            }
        });
        
        div.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            if (confirm(`删除 "${node.label}"？`)) deleteNode(node.id);
        });
        
        div.addEventListener('mouseenter', () => highlightPath(node.id));
        div.addEventListener('mouseleave', () => highlightPath(null));
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
    const grayNodes = nodes.filter(n => n.level === 2 && !n.childrenIds?.length);
    const recDiv = document.getElementById('recommendList');
    if (grayNodes.length === 0) {
        recDiv.innerHTML = '🎉 完成探索！';
        return;
    }
    recDiv.innerHTML = grayNodes.slice(0, 3).map(n => `<div class="recommend-item" onclick="window.toggleExpandNode(${n.id},2)">📖 ${n.label}</div>`).join('');
}

function searchNode(keyword) {
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

function zoomCanvas(delta) {
    canvasScale = Math.min(2, Math.max(0.4, canvasScale + delta));
    document.getElementById('graphCanvas').style.transform = `scale(${canvasScale})`;
}
function resetView() { canvasScale = 1; document.getElementById('graphCanvas').style.transform = 'scale(1)'; }

// 拖拽逻辑 - 只有拖动才移动，点击不移动
function initDrag() {
    let dragStartClientX = 0, dragStartClientY = 0;
    let hasMoved = false;
    
    document.addEventListener('mousedown', (e) => {
        const node = e.target.closest('.node-card');
        if (!node || e.ctrlKey) return;
        
        dragTarget = node;
        dragStartClientX = e.clientX;
        dragStartClientY = e.clientY;
        dragStartLeft = parseInt(node.style.left);
        dragStartTop = parseInt(node.style.top);
        hasMoved = false;
        isDragging = false;
        
        node.style.cursor = 'grabbing';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!dragTarget) return;
        
        const dx = e.clientX - dragStartClientX;
        const dy = e.clientY - dragStartClientY;
        
        if (!hasMoved && (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold)) {
            hasMoved = true;
            isDragging = true;
            dragTarget.classList.add('dragging');
        }
        
        if (hasMoved) {
            const newLeft = dragStartLeft + dx;
            const newTop = dragStartTop + dy;
            dragTarget.style.left = `${newLeft}px`;
            dragTarget.style.top = `${newTop}px`;
            
            const nodeId = parseInt(dragTarget.getAttribute('data-id'));
            const node = nodes.find(n => n.id === nodeId);
            if (node) {
                node.x = newLeft;
                node.y = newTop;
                renderAll();
            }
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (dragTarget) {
            dragTarget.classList.remove('dragging');
            dragTarget.style.cursor = '';
            dragTarget = null;
        }
        isDragging = false;
        hasMoved = false;
    });
}

// 侧边栏伸缩
function initResize() {
    const handle = document.getElementById('resizeHandle');
    const sidebar = document.getElementById('sidebar');
    let startX, startWidth, isResizing = false;
    
    handle.addEventListener('mousedown', (e) => {
        startX = e.clientX;
        startWidth = sidebar.offsetWidth;
        isResizing = true;
        document.body.style.cursor = 'ew-resize';
        e.preventDefault();
    });
    
    document.addEventListener('mousemove', (e) => {
        if (!isResizing) return;
        const delta = e.clientX - startX;
        let newWidth = startWidth + delta;
        newWidth = Math.min(450, Math.max(180, newWidth));
        sidebar.style.width = newWidth + 'px';
    });
    
    document.addEventListener('mouseup', () => {
        isResizing = false;
        document.body.style.cursor = '';
    });
    
    // 触摸屏支持
    handle.addEventListener('touchstart', (e) => {
        startX = e.touches[0].clientX;
        startWidth = sidebar.offsetWidth;
        isResizing = true;
        e.preventDefault();
    });
    document.addEventListener('touchmove', (e) => {
        if (!isResizing) return;
        const delta = e.touches[0].clientX - startX;
        let newWidth = startWidth + delta;
        newWidth = Math.min(450, Math.max(180, newWidth));
        sidebar.style.width = newWidth + 'px';
    });
    document.addEventListener('touchend', () => {
        isResizing = false;
    });
}

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
initQuoteWindow();
updateDailyQuote();

// 暴露全局函数
window.toggleFolder = function(header) {
    const content = header.nextElementSibling;
    if (content) {
        const visible = content.style.display !== 'none';
        content.style.display = visible ? 'none' : 'block';
        const arrow = header.querySelector('span:last-child');
        if (arrow) arrow.innerHTML = visible ? '▶' : '▼';
    }
};
window.viewFile = function(fileId) {
    const f = uploadedFiles.find(f => f.id == fileId);
    if (f) alert(`文件: ${f.name}\n关键词: ${f.keywords.join(', ')}`);
};
window.deleteFile = deleteFile;
window.toggleExpandNode = toggleExpandNode;