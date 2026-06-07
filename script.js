// ----- 知识库图谱核心逻辑 -----
// 存储所有节点数据： { id, label, x, y, type, parentId, childrenIds, isLearningFocus }
let nodes = [];
let nextId = 100;
let dragEnabled = true;

const canvas = document.getElementById('graphCanvas');
const svgLine = document.getElementById('lineSvg');

// 初始化一些预设的参考节点
function initDemoNodes() {
    // 添加一些示范节点 (根据截图中的历史/科学/哲学风格)
    const demoPreset = [
        { label: "伽利略·伽利莱", x: 300, y: 200, type: "primary" },
        { label: "日心说", x: 550, y: 150, type: "primary" },
        { label: "力学", x: 450, y: 320, type: "primary" },
        { label: "笛卡尔", x: 180, y: 380, type: "child", parentLabel: "哲学认识论" },
        { label: "帕多瓦大学", x: 520, y: 450, type: "child", parentLabel: "伽利略·伽利莱" },
        { label: "比萨斜塔实验", x: 360, y: 100, type: "child", parentLabel: "力学" },
        { label: "认知方法论", x: 80, y: 280, type: "primary" }
    ];
    for (let p of demoPreset) {
        addNodeByLabel(p.label, p.x, p.y, p.type);
    }
    // 关联父子关系（例：日心说关联伽利略；力学关联比萨斜塔）
    const gNode = nodes.find(n => n.label === "伽利略·伽利莱");
    const helio = nodes.find(n => n.label === "日心说");
    if(gNode && helio) setParentChild(gNode.id, helio.id);
    
    const mech = nodes.find(n => n.label === "力学");
    const tower = nodes.find(n => n.label === "比萨斜塔实验");
    if(mech && tower) setParentChild(mech.id, tower.id);

    const descartes = nodes.find(n => n.label === "笛卡尔");
    const cog = nodes.find(n => n.label === "认知方法论");
    if(descartes && cog) setParentChild(cog.id, descartes.id);
    
    renderAllNodesAndLines();
    updateNodeListUI();
}

function setParentChild(parentId, childId) {
    const parent = nodes.find(n => n.id === parentId);
    const child = nodes.find(n => n.id === childId);
    if(parent && child) {
        if(!parent.childrenIds) parent.childrenIds = [];
        if(!child.parentId) child.parentId = parentId;
        if(!parent.childrenIds.includes(childId)) parent.childrenIds.push(childId);
    }
}

function addNodeByLabel(label, x, y, type = "primary") {
    if(!label.trim()) return;
    const exists = nodes.some(n => n.label === label);
    if(exists) return;
    const newId = nextId++;
    nodes.push({
        id: newId,
        label: label,
        x: x || (Math.random() * 500 + 100),
        y: y || (Math.random() * 300 + 100),
        type: type,
        parentId: null,
        childrenIds: [],
        isLearningFocus: false
    });
    return newId;
}

// 根据关键词添加节点（独立节点为主）
document.getElementById('addKeywordBtn').addEventListener('click', () => {
    const input = document.getElementById('keywordInput');
    let keywords = input.value.split(/[ ,，]+/).filter(k => k.trim().length > 0);
    if(keywords.length === 0) keywords = ["新概念"];
    for(let kw of keywords) {
        addNodeByLabel(kw.trim(), undefined, undefined, "primary");
    }
    renderAllNodesAndLines();
    updateNodeListUI();
});

// 预设学习路径
document.querySelectorAll('.preset-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const path = btn.getAttribute('data-path');
        if(path === "physics") {
            addNodeByLabel("牛顿力学", 200, 150);
            addNodeByLabel("经典物理", 400, 250);
            addNodeByLabel("万有引力", 550, 380);
            addNodeByLabel("运动定律", 320, 400);
        } else if(path === "philosophy") {
            addNodeByLabel("理性主义", 300, 180);
            addNodeByLabel("经验主义", 500, 280);
            addNodeByLabel("笛卡尔", 150, 320);
        } else if(path === "ai") {
            addNodeByLabel("机器学习", 400, 200);
            addNodeByLabel("神经网络", 600, 300);
            addNodeByLabel("AI Agent", 250, 420);
        }
        renderAllNodesAndLines();
        updateNodeListUI();
    });
});

// 渲染所有节点（可拖拽）
function renderAllNodesAndLines() {
    canvas.innerHTML = '';
    for(let node of nodes) {
        const div = document.createElement('div');
        div.className = `node-card ${node.isLearningFocus ? 'learning-focus' : ''}`;
        div.innerText = node.label;
        div.style.left = `${node.x}px`;
        div.style.top = `${node.y}px`;
        div.style.position = 'absolute';
        div.setAttribute('data-id', node.id);
        canvas.appendChild(div);
        // 增加点击展开层级的事件（显示子节点）
        div.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExpandChildren(node.id);
        });
    }
    // 初始化 drag (使用 interact.js 或者简单原生)
    initDraggable();
    drawLines();
    document.getElementById('nodeCount').innerText = `节点数: ${nodes.length}`;
}

function initDraggable() {
    const draggables = document.querySelectorAll('.node-card');
    draggables.forEach(el => {
        let isDragging = false;
        let startX, startY, originalLeft, originalTop;
        el.addEventListener('mousedown', (e) => {
            if(e.target !== el) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            originalLeft = parseFloat(el.style.left);
            originalTop = parseFloat(el.style.top);
            el.style.cursor = 'grabbing';
            e.preventDefault();
        });
        window.addEventListener('mousemove', (e) => {
            if(!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            let newLeft = originalLeft + dx;
            let newTop = originalTop + dy;
            el.style.left = `${newLeft}px`;
            el.style.top = `${newTop}px`;
            const nodeId = parseInt(el.getAttribute('data-id'));
            const node = nodes.find(n => n.id === nodeId);
            if(node) {
                node.x = newLeft;
                node.y = newTop;
            }
            drawLines();
        });
        window.addEventListener('mouseup', () => {
            if(isDragging) {
                isDragging = false;
                el.style.cursor = 'grab';
                drawLines();
            }
        });
    });
}

function drawLines() {
    svgLine.innerHTML = '';
    for(let node of nodes) {
        if(node.childrenIds && node.childrenIds.length) {
            const parentDiv = document.querySelector(`.node-card[data-id='${node.id}']`);
            if(!parentDiv) continue;
            const parentRect = parentDiv.getBoundingClientRect();
            const containerRect = canvas.getBoundingClientRect();
            const startX = parentRect.left + parentRect.width/2 - containerRect.left;
            const startY = parentRect.top + parentRect.height/2 - containerRect.top;
            for(let childId of node.childrenIds) {
                const childNode = nodes.find(n => n.id === childId);
                if(childNode) {
                    const childDiv = document.querySelector(`.node-card[data-id='${childId}']`);
                    if(childDiv) {
                        const childRect = childDiv.getBoundingClientRect();
                        const endX = childRect.left + childRect.width/2 - containerRect.left;
                        const endY = childRect.top + childRect.height/2 - containerRect.top;
                        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                        line.setAttribute('x1', startX);
                        line.setAttribute('y1', startY);
                        line.setAttribute('x2', endX);
                        line.setAttribute('y2', endY);
                        line.setAttribute('stroke', '#64748b');
                        line.setAttribute('stroke-width', '2.5');
                        svgLine.appendChild(line);
                    }
                }
            }
        }
    }
}

function toggleExpandChildren(nodeId) {
    const node = nodes.find(n => n.id === nodeId);
    if(!node) return;
    // 如果已经有子节点列表并且没有显示子节点的更多？模拟展开逻辑：如果childrenIds为空，尝试动态关联新词
    if(!node.childrenIds || node.childrenIds.length === 0) {
        // 根据节点label生成扩展子节点
        let newChildLabel = `${node.label}·延展`;
        if(node.label === "伽利略·伽利莱") newChildLabel = "自由落体定律";
        if(node.label === "力学") newChildLabel = "惯性原理";
        if(node.label === "日心说") newChildLabel = "第谷观测数据";
        addNodeByLabel(newChildLabel, node.x + 80, node.y + 70);
        const newChild = nodes.find(n => n.label === newChildLabel);
        if(newChild && !node.childrenIds) node.childrenIds = [];
        if(newChild && !node.childrenIds.includes(newChild.id)) {
            node.childrenIds.push(newChild.id);
            newChild.parentId = node.id;
        }
    } else {
        alert(`📖 展开层级: ${node.label} 关联子知识: ${node.childrenIds.map(id => nodes.find(n=>n.id===id)?.label).join(', ')}`);
    }
    renderAllNodesAndLines();
    updateNodeListUI();
}

function updateNodeListUI() {
    const listContainer = document.getElementById('nodeListUl');
    listContainer.innerHTML = '';
    nodes.forEach(node => {
        const li = document.createElement('li');
        li.innerHTML = `<span>📘 ${node.label}</span><span class="node-list-del" data-id="${node.id}">🗑️</span>`;
        li.querySelector('.node-list-del').addEventListener('click', (e) => {
            e.stopPropagation();
            deleteNodeById(node.id);
        });
        li.addEventListener('click', () => {
            // 在画布上定位并强调
            const el = document.querySelector(`.node-card[data-id='${node.id}']`);
            if(el) {
                el.style.transition = '0.2s';
                el.style.transform = 'scale(1.05)';
                setTimeout(() => el.style.transform = '', 400);
            }
        });
        listContainer.appendChild(li);
    });
}

function deleteNodeById(id) {
    const node = nodes.find(n => n.id === id);
    if(!node) return;
    // 删除所有指向此节点为子节点的parent关系
    for(let n of nodes) {
        if(n.childrenIds) n.childrenIds = n.childrenIds.filter(cid => cid !== id);
    }
    nodes = nodes.filter(n => n.id !== id);
    renderAllNodesAndLines();
    updateNodeListUI();
}

document.getElementById('resetViewBtn').addEventListener('click', () => {
    nodes = [];
    nextId = 100;
    initDemoNodes();
    renderAllNodesAndLines();
    updateNodeListUI();
});
document.getElementById('clearAllBtn').addEventListener('click', () => {
    nodes = [];
    renderAllNodesAndLines();
    updateNodeListUI();
});

// 监听窗口重新绘图线条
window.addEventListener('resize', () => drawLines());
setInterval(() => drawLines(), 200); 

// 初始化demo
initDemoNodes();
renderAllNodesAndLines();
updateNodeListUI();