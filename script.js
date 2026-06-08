// ==================== 智能知识图谱 - 充电进度版 ====================
let nodes = [];
let nextId = 100;
let canvasScale = 1;
let dragTarget = null;
let dragStartX = 0, dragStartY = 0;
let dragStartLeft = 0, dragStartTop = 0;
let isDragging = false;
let dragThreshold = 3;
let uploadedFiles = [];
let extractedKeywords = new Set(); // 存储从文件中提取的关键词

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

// 分类映射
const categoryMap = {
    physics: ['物理', '量子', '力学', '相对论', '牛顿', '薛定谔', '电磁'],
    philosophy: ['哲学', '形而上学', '认识论', '伦理', '美学', '逻辑'],
    ai: ['AI', '人工智能', '机器学习', '神经网络', '深度', '算法', 'GPT'],
    history: ['历史', '战争', '朝代', '革命', '古代'],
    biology: ['生物', '基因', 'DNA', '进化', '细胞', '神经']
};

// ==================== 每日语录库 ====================
const quotes = [
    { text: "学而不思则罔，思而不学则殆。", author: "孔子", explanation: "只学习不思考就会迷惑，只思考不学习就会危险。" },
    { text: "知之者不如好之者，好之者不如乐之者。", author: "孔子", explanation: "懂得不如喜爱，喜爱不如以之为乐。" },
    { text: "天行健，君子以自强不息。", author: "《周易》", explanation: "宇宙不停运转，君子应效法天地，永远不断地前进。" },
    { text: "宝剑锋从磨砺出，梅花香自苦寒来。", author: "佚名", explanation: "成功需经历艰苦磨练。" },
    { text: "路漫漫其修远兮，吾将上下而求索。", author: "屈原", explanation: "道路漫长，我将不遗余力地追求探索。" },
    { text: "不积跬步，无以至千里；不积小流，无以成江海。", author: "荀子", explanation: "积累的重要性，从小做起。" },
    { text: "The only limit is your mind.", author: "未知", explanation: "唯一的限制是你的思想。" },
    { text: "Stay hungry, stay foolish.", author: "Steve Jobs", explanation: "求知若饥，虚心若愚。" },
    { text: "Knowledge is power.", author: "Francis Bacon", explanation: "知识就是力量。" },
    { text: "纸上得来终觉浅，绝知此事要躬行。", author: "陆游", explanation: "书本知识终觉浅薄，亲身实践才能真知。" },
    { text: "问渠那得清如许？为有源头活水来。", author: "朱熹", explanation: "知识需要不断更新。" },
    { text: "博观而约取，厚积而薄发。", author: "苏轼", explanation: "广泛阅读，深厚积累，缓慢释放。" },
    { text: "业精于勤，荒于嬉；行成于思，毁于随。", author: "韩愈", explanation: "勤奋精进，思考成功。" }
];

// 获取随机语录
function getRandomQuote() {
    const randomIndex = Math.floor(Math.random() * quotes.length);
    return quotes[randomIndex];
}

// 更新每日语录
let quoteUpdateTimer = null;
function updateDailyQuote() {
    const quote = getRandomQuote();
    const quoteText = document.getElementById('quoteText');
    const quoteAuthor = document.getElementById('quoteAuthor');
    const quoteExplanation = document.getElementById('quoteExplanation');
    const quoteWindow = document.getElementById('quoteWindow');
    
    if (quoteText) quoteText.innerHTML = `“${quote.text}”`;
    if (quoteAuthor) quoteAuthor.innerHTML = `—— ${quote.author}`;
    if (quoteExplanation) quoteExplanation.innerHTML = `📖 ${quote.explanation}`;
    
    // 根据内容长度调整窗口宽度
    const maxLen = Math.max(quote.text.length, quote.explanation.length);
    if (maxLen < 20) {
        quoteWindow.style.maxWidth = '240px';
        quoteWindow.style.minWidth = '200px';
    } else if (maxLen < 35) {
        quoteWindow.style.maxWidth = '300px';
        quoteWindow.style.minWidth = '260px';
    } else {
        quoteWindow.style.maxWidth = '360px';
        quoteWindow.style.minWidth = '300px';
    }
}

// 启动定时更新语录（每30分钟）
function startQuoteAutoUpdate() {
    updateDailyQuote();
    if (quoteUpdateTimer) clearInterval(quoteUpdateTimer);
    quoteUpdateTimer = setInterval(updateDailyQuote, 30 * 60 * 1000);
}

// 语录窗口折叠
function initQuoteWindow() {
    const quoteWindow = document.getElementById('quoteWindow');
    const quoteHeader = document.getElementById('quoteHeader');
    quoteHeader.addEventListener('click', () => quoteWindow.classList.toggle('collapsed'));
    quoteHeader.addEventListener('mouseenter', () => quoteHeader.style.background = 'rgba(59,130,246,0.2)');
    quoteHeader.addEventListener('mouseleave', () => quoteHeader.style.background = 'transparent');
}

// 计算节点充电进度
function calculateNodeProgress(node) {
    if (!node) return 0;
    // 如果节点标签在提取的关键词中，进度100%
    if (extractedKeywords.has(node.label)) return 100;
    // 检查部分匹配
    for (let kw of extractedKeywords) {
        if (node.label.includes(kw) || kw.includes(node.label)) {
            return 70;
        }
    }
    // 自动扩展的节点（没有在笔记中提取到）进度为0
    if (node.isAutoExpanded) return 0;
    return 0;
}

// 计算金币（基于充电进度）
function calculateGoldValue(node) {
    const progress = node.progress || 0;
    let baseGold = 0;
    if (node.level === 1) baseGold = 100;
    else if (node.level === 2) baseGold = 50;
    else baseGold = 20;
    // 根据进度计算金币：只有有进度的节点才计算金币
    if (progress >= 100) return baseGold;
    if (progress >= 70) return Math.floor(baseGold * 0.7);
    if (progress >= 30) return Math.floor(baseGold * 0.3);
    return 0;
}

// 更新所有节点进度和金币
function updateAllNodesProgress() {
    for (let node of nodes) {
        node.progress = calculateNodeProgress(node);
        node.goldValue = calculateGoldValue(node);
    }
}

function updateAllGold() {
    let total = 0;
    for (let node of nodes) {
        total += node.goldValue || 0;
    }
    document.getElementById('totalGold').innerHTML = `💰 ${total}`;
    return total;
}

function getNodeCategory(label) {
    for (let [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => label.includes(kw))) return cat;
    }
    return 'other';
}

function addNode(label, x, y, parentId = null, level = 1, isAutoExpanded = false) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    let existing = nodes.find(n => n.label === label);
    if (existing) return existing;
    
    let posX = x || (Math.random() * 400 + 100 + (level * 40));
    let posY = y || (Math.random() * 250 + 100 + (level * 50));
    
    if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent) {
            // 避免子节点重叠：根据子节点数量计算偏移
            const childCount = parent.childrenIds ? parent.childrenIds.length : 0;
            posX = parent.x + (childCount - 2) * 90;
            posY = parent.y + 80;
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
        progress: 0,
        goldValue: 0,
        visible: true,
        expanded: false,
        isAutoExpanded: isAutoExpanded
    };
    newNode.progress = calculateNodeProgress(newNode);
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
               [`${node.label}核心`, `${node.label}方法`, `${node.label}案例`];
    }
    
    for (let i = 0; i < subs.length; i++) {
        const sub = subs[i];
        if (!nodes.some(n => n.label === sub)) {
            addNode(sub, node.x + (i - 2) * 80, node.y + 70, node.id, level + 1, true);
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
    if (node.expanded) collapseNode(nodeId);
    else expandNode(nodeId, level);
}

function deleteNode(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if (!node) return;
    if (node.childrenIds) {
        for (let childId of [...node.childrenIds]) deleteNode(childId);
    }
    for (let n of nodes) {
        if (n.childrenIds) n.childrenIds = n.childrenIds.filter(id => id !== nodeId);
    }
    nodes = nodes.filter(n => n.id !== nodeId);
    renderAll();
    updateFileManager();
    updateRecommendations();
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
        if (w.length < 2 || w.length > 12) continue;
        if (stopWords.includes(w)) continue;
        freq.set(w, (freq.get(w) || 0) + 1);
    }
    return [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, 8).map(k=>k[0]);
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
    
    // 添加到提取的关键词集合
    for (let kw of keywords) {
        extractedKeywords.add(kw);
    }
    
    uploadedFiles.push({
        id: Date.now() + Math.random(),
        name: parsed.fileName,
        content: parsed.text.substring(0, 200),
        category: category,
        keywords: keywords
    });
    
    // 更新所有节点进度
    updateAllNodesProgress();
    
    if (keywords.length > 0) {
        for (let kw of keywords) {
            if (!nodes.some(n => n.label === kw)) {
                addNode(kw, undefined, undefined, null, 1, false);
            }
        }
        resultDiv.innerHTML = `✅ 提取: ${keywords.join(', ')}`;
        renderAll();
        updateRecommendations();
        updateFileManager();
    }
    renderAll();
}

function deleteFile(fileId) {
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
    // 重新构建提取的关键词集合
    extractedKeywords.clear();
    for (let f of uploadedFiles) {
        for (let kw of f.keywords) {
            extractedKeywords.add(kw);
        }
    }
    updateAllNodesProgress();
    updateFileManager();
    renderAll();
    updateRecommendations();
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
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.setAttribute('data-id', node.id);
        div.setAttribute('data-level', node.level);
        
        const progress = node.progress || 0;
        const gold = node.goldValue || 0;
        const progressColor = node.level === 1 ? '#ef4444' : (node.level === 2 ? '#3b82f6' : '#eab308');
        
        div.innerHTML = `
            <div class="node-label">${node.label}</div>
            <div class="node-gold">💰 ${gold}</div>
            <div class="progress-container">
                <div class="progress-fill" style="width: ${progress}%; background: ${progressColor};"></div>
            </div>
        `;
        canvas.appendChild(div);
        
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!isDragging) toggleExpandNode(node.id, node.level);
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

// 推荐学习 - 自动更新待学习类目
function updateRecommendations() {
    const unlearnedNodes = nodes.filter(n => {
        const progress = n.progress || 0;
        return progress < 30 && n.level === 2 && !n.isAutoExpanded;
    });
    const recDiv = document.getElementById('recommendList');
    if (unlearnedNodes.length === 0) {
        recDiv.innerHTML = '🎉 完成探索！继续上传新文件吧~';
        return;
    }
    const top5 = unlearnedNodes.slice(0, 5);
    recDiv.innerHTML = top5.map(n => `<div class="recommend-item" onclick="window.toggleExpandNode(${n.id},2)">📖 ${n.label} (${100 - (n.progress||0)}%未掌握)</div>`).join('');
    document.getElementById('recommendRefreshTime').innerHTML = `(更新于${new Date().toLocaleTimeString()})`;
}

// 定时更新推荐（每2分钟）
let recommendUpdateTimer = null;
function startRecommendAutoUpdate() {
    if (recommendUpdateTimer) clearInterval(recommendUpdateTimer);
    recommendUpdateTimer = setInterval(() => {
        updateRecommendations();
    }, 120000);
}

function updateNodeListUI() {
    const container = document.getElementById('nodeListUl');
    container.innerHTML = '';
    const topNodes = nodes.filter(n => n.level === 1).slice(0, 15);
    for (let node of topNodes) {
        const li = document.createElement('li');
        li.style.borderLeftColor = node.level === 1 ? '#ef4444' : (node.level === 2 ? '#3b82f6' : '#eab308');
        li.innerHTML = `<span>${node.label}</span><span>💰${node.goldValue || 0}</span>`;
        li.addEventListener('click', () => toggleExpandNode(node.id, node.level));
        container.appendChild(li);
    }
}

function searchNode(keyword) {
    if (!keyword) { document.getElementById('goldValue').innerText = '0'; return; }
    const found = nodes.find(n => n.label.toLowerCase().includes(keyword.toLowerCase()));
    if (found) {
        document.getElementById('goldValue').innerText = found.goldValue || 0;
        highlightPath(found.id);
        setTimeout(() => highlightPath(null), 2000);
    } else {
        document.getElementById('goldValue').innerText = '0';
    }
}

// 缩放和滚轮线条跟随
let canvasScale = 1;
function zoomCanvas(delta) {
    canvasScale = Math.min(2, Math.max(0.4, canvasScale + delta));
    document.getElementById('graphCanvas').style.transform = `scale(${canvasScale})`;
    // 延迟重新绘制线条以跟随缩放
    setTimeout(() => renderAll(), 50);
}
function resetView() { canvasScale = 1; document.getElementById('graphCanvas').style.transform = 'scale(1)'; setTimeout(() => renderAll(), 50); }

// 滚轮事件 - 线条跟随
function initWheelFollow() {
    const scrollWrapper = document.getElementById('scrollWrapper');
    scrollWrapper.addEventListener('scroll', () => { renderAll(); });
    scrollWrapper.addEventListener('wheel', () => { setTimeout(() => renderAll(), 30); });
}

// 拖拽逻辑
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
            if (node) { node.x = newLeft; node.y = newTop; }
            renderAll();
        }
    });
    
    document.addEventListener('mouseup', () => {
        if (dragTarget) {
            dragTarget.classList.remove('dragging');
            dragTarget.style.cursor = '';
            dragTarget = null;
        }
        isDragging = false;
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
    document.addEventListener('mouseup', () => { isResizing = false; document.body.style.cursor = ''; });
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
    document.addEventListener('touchend', () => { isResizing = false; });
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
document.getElementById('clearAllBtn').addEventListener('click', () => { nodes = []; nextId = 100; extractedKeywords.clear(); uploadedFiles = []; renderAll(); updateFileManager(); updateRecommendations(); });
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
initWheelFollow();
initQuoteWindow();
startQuoteAutoUpdate();
startRecommendAutoUpdate();
initDemo();

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