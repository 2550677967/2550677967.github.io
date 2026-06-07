// ==================== 深空智能知识图谱 ====================
let nodes = [];
let nextId = 100;
let currentZoom = 1;
let panX = 0, panY = 0;
let isDragging = false;
let dragStart = { x: 0, y: 0 };
let dragTarget = null;

// 知识点分类映射
const categoryMap = {
    physics: ['力学', '量子', '相对论', '牛顿', '伽利略', '万有引力', '运动定律', '电磁', '热力学', '原子', '核'],
    philosophy: ['哲学', '笛卡尔', '康德', '柏拉图', '亚里士多德', '存在主义', '理性主义', '认识论', '形而上学'],
    ai: ['AI', '人工智能', '机器学习', '神经网络', '深度学习', '算法', '数据', '大模型', 'GPT'],
    history: ['历史', '战争', '朝代', '革命', '古代', '中世纪', '文艺复兴', '帝国'],
    biology: ['生物', '基因', 'DNA', '进化', '细胞', '生态', '神经', '大脑']
};

// 获取知识类别
function getNodeCategory(label) {
    for (let [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => label.includes(kw) || kw.includes(label))) return cat;
    }
    return 'other';
}

// 计算知识金币
function calculateGoldValue(node, allNodes) {
    let gold = 50;
    if (node.childrenIds && node.childrenIds.length > 0) gold += node.childrenIds.length * 25;
    if (node.parentId) gold += 35;
    if (node.type === 'red') gold += 120;
    if (node.type === 'blue') gold += 30;
    // 根据标签长度和关联度加成
    gold += Math.floor(node.label.length / 2);
    return Math.min(gold, 999);
}

// 更新总金币
function updateAllGold() {
    let total = 0;
    for (let node of nodes) {
        node.goldValue = calculateGoldValue(node, nodes);
        total += node.goldValue;
    }
    document.getElementById('totalGold').innerHTML = `💰 总金币: ${total}`;
    return total;
}

// 添加节点并自动连线到相关节点
function addNode(label, x, y, parentId = null) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    if (nodes.some(n => n.label === label)) return nodes.find(n => n.label === label);
    
    const category = getNodeCategory(label);
    let type = 'gray';
    if (category !== 'other') type = 'red';
    else if (nodes.some(n => n.label.includes(label) || label.includes(n.label))) type = 'blue';
    
    const newNode = {
        id: nextId++,
        label: label,
        x: x || (Math.random() * 500 + 100),
        y: y || (Math.random() * 300 + 100),
        type: type,
        parentId: parentId,
        childrenIds: [],
        goldValue: 0,
        sourceFile: null
    };
    newNode.goldValue = calculateGoldValue(newNode, nodes);
    nodes.push(newNode);
    
    // 自动连线：查找相似知识点建立关联
    setTimeout(() => autoConnectNode(newNode), 10);
    return newNode;
}

// 自动连线到已有知识图谱
function autoConnectNode(newNode) {
    for (let node of nodes) {
        if (node.id === newNode.id) continue;
        // 如果标签有共同词汇，建立关联
        if (node.label.includes(newNode.label) || newNode.label.includes(node.label) ||
            (node.label.length > 2 && newNode.label.length > 2 && 
             (node.label.substring(0, 3) === newNode.label.substring(0, 3)))) {
            if (!newNode.parentId && !node.childrenIds.includes(newNode.id)) {
                if (!node.childrenIds) node.childrenIds = [];
                node.childrenIds.push(newNode.id);
                newNode.parentId = node.id;
                break;
            }
        }
    }
    renderAll();
}

// 多格式文件解析
async function parseFile(file) {
    const fileType = file.type;
    const fileName = file.name;
    let extractedText = '';
    
    try {
        // 图片OCR
        if (fileType.startsWith('image/')) {
            const { data: { text } } = await Tesseract.recognize(file, 'chi_sim+eng');
            extractedText = text;
        }
        // PDF
        else if (fileType === 'application/pdf') {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            for (let i = 1; i <= Math.min(pdf.numPages, 5); i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                extractedText += textContent.items.map(item => item.str).join(' ') + '\n';
            }
        }
        // Word
        else if (fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
            const arrayBuffer = await file.arrayBuffer();
            const result = await mammoth.extractRawText({ arrayBuffer: arrayBuffer });
            extractedText = result.value;
        }
        // Excel
        else if (fileType.includes('sheet') || fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
            const arrayBuffer = await file.arrayBuffer();
            const workbook = XLSX.read(arrayBuffer);
            workbook.SheetNames.forEach(sheet => {
                const worksheet = workbook.Sheets[sheet];
                const json = XLSX.utils.sheet_to_json(worksheet);
                extractedText += JSON.stringify(json) + '\n';
            });
        }
        // TXT
        else if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
            extractedText = await file.text();
        }
    } catch (err) {
        console.error('解析失败:', err);
        return null;
    }
    return extractedText;
}

// 从文本中提取知识点
function extractKnowledgeFromText(text) {
    const stopWords = ['的', '了', '是', '在', '和', '与', '有', '我', '你', '他', '她', 'it', 'the', 'a', 'an', 'this', 'that'];
    const words = text.split(/[ ,，。！？\n\t、；;：""''（）【】《》]+/);
    const keywordMap = new Map();
    
    for (let word of words) {
        if (word.length < 2 || word.length > 20) continue;
        if (stopWords.includes(word.toLowerCase())) continue;
        if (/^[0-9]+$/.test(word)) continue;
        keywordMap.set(word, (keywordMap.get(word) || 0) + 1);
    }
    
    const sorted = [...keywordMap.entries()].sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, 8).map(k => k[0]);
}

// 处理文件上传
async function processFile(file) {
    const progressDiv = document.getElementById('uploadProgress');
    const resultDiv = document.getElementById('uploadResult');
    progressDiv.style.display = 'block';
    resultDiv.innerHTML = `📄 正在解析: ${file.name}...`;
    
    const text = await parseFile(file);
    progressDiv.style.display = 'none';
    
    if (!text || text.length < 10) {
        resultDiv.innerHTML = `❌ ${file.name} 识别失败或内容为空`;
        return;
    }
    
    const keywords = extractKnowledgeFromText(text);
    if (keywords.length > 0) {
        const added = [];
        for (let kw of keywords) {
            const existing = nodes.find(n => n.label === kw);
            if (!existing) {
                const newNode = addNode(kw, undefined, undefined);
                if (newNode) {
                    newNode.type = 'blue';
                    newNode.sourceFile = file.name;
                    added.push(kw);
                }
            } else {
                existing.type = 'blue';
            }
        }
        resultDiv.innerHTML = `✅ ${file.name}<br>📌 提取知识点: ${keywords.join(', ')}<br>🔗 已自动连接到知识图谱`;
        renderAll();
        updateRecommendations();
    } else {
        resultDiv.innerHTML = `⚠️ ${file.name} 未能提取到有效知识点`;
    }
}

// 推荐学习 + 网页检索
async function updateRecommendations() {
    const grayNodes = nodes.filter(n => n.type === 'gray');
    const recDiv = document.getElementById('recommendList');
    
    if (grayNodes.length === 0) {
        recDiv.innerHTML = '🎉 宇宙探索完毕！暂无未探索节点';
        return;
    }
    
    const top3 = grayNodes.slice(0, 3);
    recDiv.innerHTML = '';
    
    for (let node of top3) {
        const item = document.createElement('div');
        item.className = 'recommend-item';
        item.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <span>📖 ${node.label} (💰${node.goldValue})</span>
                <span style="font-size:0.6rem; color:#60a5fa;">🔍 搜索网页</span>
            </div>
            <div class="web-links" style="margin-top:4px;"></div>
        `;
        item.addEventListener('click', async (e) => {
            if (e.target.tagName === 'A') return;
            const linksDiv = item.querySelector('.web-links');
            if (linksDiv.innerHTML) {
                linksDiv.innerHTML = '';
                return;
            }
            linksDiv.innerHTML = '<span style="color:#eab308;">🔍 检索中...</span>';
            const urls = await searchWebLinks(node.label);
            if (urls.length > 0) {
                linksDiv.innerHTML = urls.map(url => `<a href="${url}" target="_blank" style="display:block; font-size:0.65rem;">🔗 ${new URL(url).hostname}</a>`).join('');
            } else {
                linksDiv.innerHTML = '<span style="color:#6b7280;">暂无相关链接</span>';
            }
        });
        recDiv.appendChild(item);
    }
}

// 模拟网页检索（可接入真实搜索API）
async function searchWebLinks(keyword) {
    // 模拟搜索结果 - 实际可接入百度/Google API
    const mockLinks = [
        `https://baike.baidu.com/item/${encodeURIComponent(keyword)}`,
        `https://zh.wikipedia.org/wiki/${encodeURIComponent(keyword)}`,
        `https://www.zhihu.com/search?q=${encodeURIComponent(keyword)}`
    ];
    return mockLinks;
}

// 渲染所有节点
function renderAll() {
    const canvas = document.getElementById('graphCanvas');
    const svgLine = document.getElementById('lineSvg');
    canvas.innerHTML = '';
    
    for (let node of nodes) {
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
    }
    
    // 绘制连线
    svgLine.innerHTML = '';
    for (let node of nodes) {
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
                    svgLine.appendChild(line);
                }
            }
        }
    }
    
    updateAllGold();
    updateNodeListUI();
    updateRecommendations();
}

// 搜索并显示金币
function searchNodeAndShowGold(keyword) {
    if (!keyword) {
        document.getElementById('goldValue').innerText = '0';
        return;
    }
    const found = nodes.find(n => n.label.toLowerCase().includes(keyword.toLowerCase()));
    if (found) {
        document.getElementById('goldValue').innerText = found.goldValue;
        const el = document.querySelector(`.node-card[data-id='${found.id}']`);
        if (el) {
            el.style.transform = 'scale(1.08)';
            setTimeout(() => el.style.transform = '', 500);
        }
    } else {
        document.getElementById('goldValue').innerText = '0';
    }
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

// 缩放功能
function zoom(delta) {
    currentZoom = Math.min(3, Math.max(0.5, currentZoom + delta));
    const canvas = document.getElementById('graphCanvas');
    canvas.style.transform = `scale(${currentZoom})`;
}
function resetView() {
    currentZoom = 1;
    document.getElementById('graphCanvas').style.transform = `scale(1)`;
}

// 添加预设框架
function addPresetFramework(type) {
    const presets = {
        physics: ['力学', '热力学', '电磁学', '量子力学', '相对论', '弦理论'],
        philosophy: ['形而上学', '认识论', '伦理学', '美学', '逻辑学', '辩证法'],
        ai: ['机器学习', '神经网络', '自然语言处理', '计算机视觉', '强化学习', '大语言模型'],
        history: ['古代史', '中世纪史', '近代史', '现代史', '文明史'],
        biology: ['细胞生物学', '遗传学', '进化论', '神经科学', '生态学']
    };
    const topics = presets[type] || presets.physics;
    for (let topic of topics) {
        if (!nodes.some(n => n.label === topic)) {
            addNode(topic, undefined, undefined);
        }
    }
    renderAll();
}

// 拖拽逻辑
function initDrag() {
    document.addEventListener('mousemove', (e) => {
        if (dragTarget) {
            const left = e.clientX - dragTarget.offsetWidth/2;
            const top = e.clientY - dragTarget.offsetHeight/2;
            dragTarget.style.left = `${left}px`;
            dragTarget.style.top = `${top}px`;
            const nodeId = parseInt(dragTarget.getAttribute('data-id'));
            const node = nodes.find(n => n.id === nodeId);
            if (node) { node.x = left; node.y = top; }
            renderAll();
        }
    });
    document.addEventListener('mouseup', () => { dragTarget = null; });
    document.addEventListener('mousedown', (e) => {
        const node = e.target.closest('.node-card');
        if (node) { dragTarget = node; node.style.cursor = 'grabbing'; e.preventDefault(); }
    });
}

// 初始化示例
function initDemo() {
    const demoNodes = [
        { label: '量子物理', x: 200, y: 150, type: 'red' },
        { label: '经典力学', x: 400, y: 200, type: 'red' },
        { label: '人工智能', x: 350, y: 350, type: 'red' },
        { label: '薛定谔方程', x: 150, y: 280, type: 'gray' },
        { label: '神经网络', x: 500, y: 400, type: 'gray' }
    ];
    for (let nd of demoNodes) {
        addNode(nd.label, nd.x, nd.y);
    }
    renderAll();
}

// 事件绑定
document.getElementById('addKeywordBtn').addEventListener('click', () => {
    const input = document.getElementById('keywordInput');
    if (input.value.trim()) addNode(input.value.trim(), undefined, undefined);
    renderAll();
    input.value = '';
});
document.getElementById('zoomInBtn').addEventListener('click', () => zoom(0.2));
document.getElementById('zoomOutBtn').addEventListener('click', () => zoom(-0.2));
document.getElementById('resetViewBtn').addEventListener('click', resetView);
document.getElementById('clearAllBtn').addEventListener('click', () => { nodes = []; nextId = 100; renderAll(); });
document.getElementById('searchKeyword').addEventListener('input', (e) => searchNodeAndShowGold(e.target.value));
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => addPresetFramework(btn.getAttribute('data-path')));
});

// 文件上传
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
fileInput.addEventListener('change', (e) => {
    for (let file of e.target.files) processFile(file);
});

initDrag();
initDemo();