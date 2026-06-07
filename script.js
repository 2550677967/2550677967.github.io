// ==================== 智能知识图谱 ====================
let nodes = [];
let nextId = 100;

// 知识点分类映射（用于自动识别类别）
const categoryMap = {
    physics: ['力学', '量子', '相对论', '牛顿', '伽利略', '万有引力', '运动定律', '电磁', '热力学'],
    philosophy: ['哲学', '笛卡尔', '康德', '柏拉图', '亚里士多德', '存在主义', '理性主义', '认识论'],
    ai: ['AI', '人工智能', '机器学习', '神经网络', '深度学习', '算法', '数据'],
    history: ['历史', '战争', '朝代', '革命', '古代', '中世纪', '文艺复兴']
};

// 获取知识点类型（红色大类）
function getNodeCategory(label) {
    for (let [cat, keywords] of Object.entries(categoryMap)) {
        if (keywords.some(kw => label.includes(kw))) return cat;
    }
    return 'other';
}

// 计算知识点金币价值（基于深度、关联数、是否核心）
function calculateGoldValue(node, allNodes) {
    let gold = 50; // 基础值
    // 子节点数量加成
    if (node.childrenIds && node.childrenIds.length > 0) {
        gold += node.childrenIds.length * 20;
    }
    // 父节点加成（层级深）
    if (node.parentId) gold += 30;
    // 如果是红色核心大类，加成
    if (node.type === 'red') gold += 100;
    if (node.type === 'blue') gold += 20;
    return gold;
}

// 更新所有节点的金币并刷新显示
function updateAllGold() {
    let totalGold = 0;
    for (let node of nodes) {
        node.goldValue = calculateGoldValue(node, nodes);
        totalGold += node.goldValue;
    }
    document.getElementById('totalGold').innerText = `💰 总金币: ${totalGold}`;
    return totalGold;
}

// 添加节点（带颜色分类）
function addNode(label, x, y, parentId = null) {
    if (!label || label.trim() === '') return null;
    label = label.trim();
    // 去重
    if (nodes.some(n => n.label === label)) return null;
    
    const category = getNodeCategory(label);
    // 判断颜色：有预设大类规则 或 作为根节点时红色
    let type = 'gray'; // 默认灰色（待学习）
    if (category !== 'other') type = 'red'; // 核心大类红色
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
        isLearned: false
    };
    newNode.goldValue = calculateGoldValue(newNode, nodes);
    nodes.push(newNode);
    
    // 如果有父节点，建立关联
    if (parentId) {
        const parent = nodes.find(n => n.id === parentId);
        if (parent && !parent.childrenIds) parent.childrenIds = [];
        if (parent && !parent.childrenIds.includes(newNode.id)) {
            parent.childrenIds.push(newNode.id);
        }
    }
    return newNode;
}

// OCR 图片识别 + 自动添加知识点
async function processImage(file) {
    const progressDiv = document.getElementById('ocrProgress');
    const resultDiv = document.getElementById('ocrResult');
    progressDiv.style.display = 'block';
    resultDiv.innerHTML = '识别中...';
    
    try {
        const { data: { text } } = await Tesseract.recognize(file, 'chi_sim+eng', {
            logger: m => {
                if (m.status === 'recognizing text') {
                    const percent = Math.round(m.progress * 100);
                    document.querySelector('.progress-bar').style.width = `${percent}%`;
                }
            }
        });
        
        progressDiv.style.display = 'none';
        resultDiv.innerHTML = `✅ 识别结果: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`;
        
        // 智能提取关键词（简单分词）
        const keywords = extractKeywords(text);
        if (keywords.length > 0) {
            resultDiv.innerHTML += `<br>📌 自动提取知识点: ${keywords.join(', ')}`;
            // 自动添加为蓝色节点（已掌握）
            for (let kw of keywords) {
                const existing = nodes.find(n => n.label === kw);
                if (!existing) {
                    const newNode = addNode(kw, undefined, undefined);
                    if (newNode) newNode.type = 'blue';
                }
            }
            renderAll();
            updateRecommendations();
        }
    } catch (err) {
        progressDiv.style.display = 'none';
        resultDiv.innerHTML = `❌ 识别失败: ${err.message}`;
    }
}

// 文本关键词提取
function extractKeywords(text) {
    const stopWords = ['的', '了', '是', '在', '和', '与', '有', '我', '你', '他', '她', 'it', 'the', 'a', 'an'];
    const words = text.split(/[ ,，。！？\n\t]+/).filter(w => w.length > 1 && !stopWords.includes(w));
    // 去重取前5个
    return [...new Set(words)].slice(0, 6);
}

// 推荐学习：查找灰色未学节点，推荐关联度高的
function updateRecommendations() {
    const grayNodes = nodes.filter(n => n.type === 'gray');
    const recDiv = document.getElementById('recommendList');
    if (grayNodes.length === 0) {
        recDiv.innerHTML = '🎉 太棒了！暂无待学知识点';
        return;
    }
    const top3 = grayNodes.slice(0, 3);
    recDiv.innerHTML = top3.map(n => `📖 ${n.label} (价值💰${n.goldValue})`).join('<br>');
}

// 搜索知识点并显示金币
function searchNodeAndShowGold(keyword) {
    if (!keyword) {
        document.getElementById('goldValue').innerText = '0';
        return;
    }
    const found = nodes.find(n => n.label.toLowerCase().includes(keyword.toLowerCase()));
    if (found) {
        document.getElementById('goldValue').innerText = found.goldValue;
        // 高亮对应节点
        const el = document.querySelector(`.node-card[data-id='${found.id}']`);
        if (el) {
            el.style.transform = 'scale(1.05)';
            setTimeout(() => el.style.transform = '', 500);
        }
    } else {
        document.getElementById('goldValue').innerText = '0';
    }
}

// 渲染节点 + 连线
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
            // 点击节点弹出详细信息，同时展示金币
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

// 更新左侧列表
function updateNodeListUI() {
    const listContainer = document.getElementById('nodeListUl');
    listContainer.innerHTML = '';
    nodes.forEach(node => {
        const li = document.createElement('li');
        li.style.borderLeftColor = node.type === 'red' ? '#ef4444' : (node.type === 'blue' ? '#3b82f6' : '#94a3b8');
        li.innerHTML = `<span>${node.label}</span><span class="gold-small">💰${node.goldValue}</span>`;
        li.addEventListener('click', () => {
            document.getElementById('searchKeyword').value = node.label;
            searchNodeAndShowGold(node.label);
        });
        listContainer.appendChild(li);
    });
}

// 添加预设框架
function addPresetFramework(type) {
    const presets = {
        physics: ['力学', '热力学', '电磁学', '量子力学', '相对论'],
        philosophy: ['形而上学', '认识论', '伦理学', '美学', '逻辑学'],
        ai: ['机器学习', '神经网络', '自然语言处理', '计算机视觉', '强化学习'],
        history: ['古代史', '中世纪史', '近代史', '现代史', '当代史']
    };
    const topics = presets[type];
    for (let topic of topics) {
        if (!nodes.some(n => n.label === topic)) {
            addNode(topic, undefined, undefined);
        }
    }
    renderAll();
}

// 初始化示例
function initDemo() {
    addNode('物理学', 200, 150);
    addNode('哲学', 500, 180);
    addNode('人工智能', 350, 350);
    addNode('力学', 150, 280, nodes.find(n => n.label === '物理学')?.id);
    addNode('认识论', 600, 280, nodes.find(n => n.label === '哲学')?.id);
    renderAll();
}

// 拖拽逻辑（简化）
let dragTarget = null;
document.addEventListener('mousedown', (e) => {
    const node = e.target.closest('.node-card');
    if (!node) return;
    dragTarget = node;
    node.style.cursor = 'grabbing';
    e.preventDefault();
});
document.addEventListener('mousemove', (e) => {
    if (!dragTarget) return;
    const left = e.clientX - dragTarget.offsetWidth/2;
    const top = e.clientY - dragTarget.offsetHeight/2;
    dragTarget.style.left = `${left}px`;
    dragTarget.style.top = `${top}px`;
    const nodeId = parseInt(dragTarget.getAttribute('data-id'));
    const node = nodes.find(n => n.id === nodeId);
    if (node) { node.x = left; node.y = top; }
    renderAll();
});
document.addEventListener('mouseup', () => {
    dragTarget = null;
});

// 事件绑定
document.getElementById('addKeywordBtn').addEventListener('click', () => {
    const input = document.getElementById('keywordInput');
    if (input.value.trim()) addNode(input.value.trim(), undefined, undefined);
    renderAll();
    input.value = '';
});
document.getElementById('resetViewBtn').addEventListener('click', () => { nodes = []; nextId = 100; initDemo(); });
document.getElementById('clearAllBtn').addEventListener('click', () => { nodes = []; renderAll(); });
document.getElementById('searchKeyword').addEventListener('input', (e) => searchNodeAndShowGold(e.target.value));
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', () => addPresetFramework(btn.getAttribute('data-path')));
});
// 上传区域
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('imageUpload');
uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => { e.preventDefault(); uploadArea.style.borderColor = '#3b82f6'; });
uploadArea.addEventListener('dragleave', () => uploadArea.style.borderColor = '#cbd5e1');
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) processImage(file);
});
fileInput.addEventListener('change', (e) => { if (e.target.files[0]) processImage(e.target.files[0]); });

initDemo();