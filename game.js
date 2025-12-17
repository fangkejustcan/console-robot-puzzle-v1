// 游戏状态
let gameState = {
    objects: [],
    mode: 'normal', // 'normal' 或 'ripper'
    won: false,
    discoveredCode: {}, // 存储已发现的代码信息
    analyzingObject: null, // 正在分析的物品
    analyzeStartTime: 0, // 分析开始时间
    tokenLibrary: [], // 词条库：存储玩家已拾取的词条 {type: 'func'/'class', value: '词条内容'}
    lastClickTime: 0, // 上次点击时间
    lastClickedObject: null, // 上次点击的物体
    codeCards: {} // 存储已创建的代码卡片DOM元素 {objectName: cardElement}
};

// 黑客帝国风格的流动字符
let matrixChars = [];
const MATRIX_CHAR_SET = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz!@#$%^&*()[]{}';

// 初始化矩阵字符
function initMatrixChars(objX, objY, objWidth, objHeight) {
    matrixChars = [];
    let charCount = 30; // 字符数量
    for (let i = 0; i < charCount; i++) {
        matrixChars.push({
            x: objX + random(-objWidth/2, objWidth/2),
            y: objY - objHeight/2 + random(-20, 0),
            char: random(MATRIX_CHAR_SET.split('')),
            speed: random(2, 6),
            opacity: random(150, 255)
        });
    }
}

// p5.js setup函数
function setup() {
    // 创建画布并放入游戏场景容器
    // 减去词条库的高度（120px）
    let canvas = createCanvas(windowWidth * 0.7, windowHeight - 120);
    canvas.parent('gameScene');

    // 初始化游戏物体
    initGameObjects();

    // 设置工具栏按钮事件
    setupToolbar();

    console.log('游戏初始化完成');
}

// 初始化游戏物体
function initGameObjects() {
    // 密码门 - 放在右侧
    let door = new PasswordDoor(width - 100, height / 2);
    gameState.objects.push(door);

    // 存钱罐 - 放在左上
    let piggyBank = new PiggyBank(100, 100);
    gameState.objects.push(piggyBank);

    // 信纸 - 放在中间偏左
    let letter = new Letter(200, height / 2);
    gameState.objects.push(letter);

    // 三个火柴 - 放在左下角
    for (let i = 0; i < 3; i++) {
        let match = new Match(80 + i * 50, height - 100, i + 1);
        gameState.objects.push(match);
    }

    // 陀螺 - 放在中间
    let gyro = new Gyro(width / 2, height / 2 + 150);
    gameState.objects.push(gyro);
}

// p5.js draw函数
function draw() {
    // 根据模式设置背景色
    if (gameState.mode === 'ripper') {
        background(0, 20, 0); // 深绿黑色终端风格
    } else {
        background(22, 33, 62); // 原来的深蓝色
    }

    // 检查胜利条件
    if (gameState.won) {
        displayVictory();
        return;
    }

    // 更新和绘制所有物体
    for (let obj of gameState.objects) {
        if (obj.update) {
            obj.update();
        }

        push();
        // 在代码撕裂器模式下，给物体添加强烈的绿色色调和遮罩
        if (gameState.mode === 'ripper') {
            tint(80, 255, 80, 180); // 强烈的绿色色调
        }
        obj.draw();
        pop();

        // 在代码撕裂器模式下，给每个物体添加绿色半透明遮罩
        if (gameState.mode === 'ripper') {
            push();
            fill(0, 255, 0, 80); // 绿色半透明遮罩
            rectMode(CENTER);
            rect(obj.x, obj.y, obj.width, obj.height);
            pop();

            // 绘制物体边框
            push();
            noFill();
            stroke(0, 255, 0);
            strokeWeight(2);
            rectMode(CENTER);
            rect(obj.x, obj.y, obj.width + 10, obj.height + 10);
            pop();
        }
    }

    // 绘制正在分析的物品特效
    if (gameState.analyzingObject) {
        drawAnalyzingEffect(gameState.analyzingObject);
    }

    // 更新代码信息卡片的位置
    if (gameState.mode === 'ripper') {
        updateCodeOverlay();
    }

    // 检查碰撞
    checkCollisions();

    // 更新鼠标指针样式
    updateCursorStyle();
}

// 检查所有物体之间的碰撞
function checkCollisions() {
    for (let i = 0; i < gameState.objects.length; i++) {
        for (let j = i + 1; j < gameState.objects.length; j++) {
            let obj1 = gameState.objects[i];
            let obj2 = gameState.objects[j];

            if (obj1.collidesWith(obj2)) {
                obj1.executeFunction('onCollide', obj2);
                obj2.executeFunction('onCollide', obj1);
            }
        }
    }
}

// 显示胜利画面
function displayVictory() {
    background(78, 205, 196);
    fill(255);
    textAlign(CENTER, CENTER);
    textSize(48);
    text('恭喜通关！', width / 2, height / 2 - 50);
    textSize(24);
    text('你成功逃出了代码迷宫', width / 2, height / 2 + 20);
}

// 更新鼠标指针样式
function updateCursorStyle() {
    let canvas = document.querySelector('canvas');
    if (!canvas) return;

    if (gameState.mode === 'ripper' && !gameState.analyzingObject) {
        // 检查鼠标是否在任何物体上
        let hoveringObject = false;
        for (let obj of gameState.objects) {
            if (obj.containsPoint(mouseX, mouseY)) {
                hoveringObject = true;
                break;
            }
        }

        if (hoveringObject) {
            canvas.classList.add('green-crosshair');
        } else {
            canvas.classList.remove('green-crosshair');
        }
    } else {
        canvas.classList.remove('green-crosshair');
    }
}

// 去除HTML标签（用于显示）
function removeHtmlTags(text) {
    return text.replace(/<[^>]*>/g, '');
}

// ========== 代码覆盖层系统 ==========

// 更新代码覆盖层（在每帧调用）- 只更新位置，不重建DOM
function updateCodeOverlay() {
    // 为每个已发现代码的物体更新卡片位置
    for (let obj of gameState.objects) {
        if (gameState.discoveredCode[obj.name] && gameState.codeCards[obj.name]) {
            updateCodeCardPosition(obj);
        }
    }
}

// 创建代码卡片（只在分析完成时调用一次）
function createCodeCardForObject(obj) {
    const codeInfo = gameState.discoveredCode[obj.name];
    if (!codeInfo || !codeInfo.functions) return;

    // 如果已经存在，先移除
    if (gameState.codeCards[obj.name]) {
        gameState.codeCards[obj.name].remove();
    }

    const overlay = document.getElementById('codeOverlay');

    // 创建卡片
    const card = document.createElement('div');
    card.className = 'code-card';
    card.dataset.objectName = obj.name;

    // 只显示前3个函数（权限>=3的）
    const visibleFunctions = codeInfo.functions
        .filter(f => f.permission >= 3 && f.naturalDescription)
        .slice(0, 3);

    for (let funcInfo of visibleFunctions) {
        const funcDiv = createFunctionElement(funcInfo);
        card.appendChild(funcDiv);
    }

    // 如果有更多函数，显示省略号
    const totalVisibleFunctions = codeInfo.functions.filter(f => f.permission >= 3).length;
    if (totalVisibleFunctions > 3) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'code-card-function';
        moreDiv.innerHTML = '<span class="code-card-text">...</span>';
        card.appendChild(moreDiv);
    }

    // 直接在卡片上绑定点击事件
    card.addEventListener('click', (e) => {
        console.log('卡片点击事件触发:', e.target);

        // 检查点击的是否是词条元素
        if (e.target.classList.contains('scene-token')) {
            const type = e.target.dataset.tokenType;
            const value = e.target.dataset.tokenValue;

            console.log('点击词条:', type, value);

            if (type && value) {
                collectSceneToken(type, value, e.target);
            }
        }
    });

    // 设置初始位置
    updateCodeCardPosition(obj, card);

    overlay.appendChild(card);
    gameState.codeCards[obj.name] = card;

    console.log('创建代码卡片:', obj.name);
}

// 更新代码卡片位置
function updateCodeCardPosition(obj, card) {
    if (!card) {
        card = gameState.codeCards[obj.name];
    }

    if (!card) return;

    // 计算卡片位置（物体右侧）
    const cardX = obj.x + obj.width / 2 + 20;
    const cardY = obj.y - obj.height / 2;

    card.style.left = cardX + 'px';
    card.style.top = cardY + 'px';
}

// 移除代码卡片
function removeCodeCard(objectName) {
    if (gameState.codeCards[objectName]) {
        gameState.codeCards[objectName].remove();
        delete gameState.codeCards[objectName];
    }
}

// 清空所有代码卡片
function clearAllCodeCards() {
    for (let objectName in gameState.codeCards) {
        gameState.codeCards[objectName].remove();
    }
    gameState.codeCards = {};
}

// 创建单个函数的DOM元素
function createFunctionElement(funcInfo) {
    const funcDiv = document.createElement('div');
    funcDiv.className = 'code-card-function';

    const parts = parseNaturalDescription(funcInfo.naturalDescription);

    for (let part of parts) {
        if (part.type === 'text') {
            // 普通文本
            const textSpan = document.createElement('span');
            textSpan.className = 'code-card-text';
            textSpan.textContent = part.value;
            funcDiv.appendChild(textSpan);
        } else {
            // 词条
            const tokenSpan = document.createElement('span');
            tokenSpan.className = `scene-token token-${part.type}`;
            tokenSpan.textContent = part.value;
            tokenSpan.dataset.tokenType = part.type;
            tokenSpan.dataset.tokenValue = part.value;

            // 不再检查是否已收集，始终显示为可点击状态

            funcDiv.appendChild(tokenSpan);
        }
    }

    // 如果是权限4，添加编辑按钮
    if (funcInfo.permission >= 4) {
        const editBtn = document.createElement('button');
        editBtn.className = 'inline-edit-btn';
        editBtn.textContent = '编辑';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            // 需要获取物体名称和函数名，通过DOM向上查找
            const card = e.target.closest('.code-card');
            const objectName = card.dataset.objectName;
            openFunctionEditor(objectName, funcInfo.name);
        };
        funcDiv.appendChild(editBtn);
    }

    return funcDiv;
}

// 收集场景中的词条
function collectSceneToken(type, value, element) {
    const added = addTokenToLibrary({ type, value });

    if (added) {
        // 显示反馈
        addSystemMessage(`收集词条: ${value}`);

        // 添加收集动画
        element.style.animation = 'collect-bounce 0.5s ease';

        // 调试日志
        console.log('收集词条:', type, value);
    } else {
        // 已经收集过了
        addSystemMessage(`词条已收集: ${value}`);
    }
}

// 显示已发现的函数信息（旧版，已废弃）
function displayDiscoveredFunctions(obj) {
    // 这个函数已经被updateCodeOverlay替代
    // 保留作为备份
}

// 绘制正在分析的物品特效
function drawAnalyzingEffect(obj) {
    // 绘制半透明遮罩（比其他物品更深）
    push();
    fill(0, 80, 0, 180);
    rectMode(CENTER);
    rect(obj.x, obj.y, obj.width + 20, obj.height + 20);
    pop();

    // 更新和绘制流动字符
    push();
    textSize(14);
    textAlign(CENTER, CENTER);
    for (let char of matrixChars) {
        // 更新位置
        char.y += char.speed;

        // 如果超出物体范围，重置到顶部
        if (char.y > obj.y + obj.height/2 + 30) {
            char.y = obj.y - obj.height/2 - 20;
            char.x = obj.x + random(-obj.width/2, obj.width/2);
            char.char = random(MATRIX_CHAR_SET.split(''));
        }

        // 绘制字符
        fill(0, 255, 0, char.opacity);
        text(char.char, char.x, char.y);
    }
    pop();

    // 不再自动完成，等待AI回复后手动调用finishAnalyzing
}

// 完成分析（AI回复后调用）
function finishAnalyzing() {
    if (!gameState.analyzingObject) return;

    const obj = gameState.analyzingObject;

    // 清除分析状态和特效
    gameState.analyzingObject = null;
    matrixChars = [];

    // 创建代码卡片
    createCodeCardForObject(obj);

    // 不再自动切换回普通模式，保持在代码撕裂器模式
}

// 鼠标按下事件
function mousePressed() {
    if (gameState.won) return;

    // 如果正在分析，禁止其他操作
    if (gameState.analyzingObject) return;

    // 检测双击
    const currentTime = millis();
    const isDoubleClick = (currentTime - gameState.lastClickTime) < 300;

    // 检查是否点击了物体
    for (let obj of gameState.objects) {
        if (obj.containsPoint(mouseX, mouseY)) {
            if (gameState.mode === 'normal') {
                // 普通模式：执行onClick
                obj.executeFunction('onClick');
            } else if (gameState.mode === 'ripper') {
                // 代码撕裂器模式
                if (isDoubleClick && gameState.lastClickedObject === obj.name && gameState.discoveredCode[obj.name]) {
                    // 双击已分析的物体：打开函数选择菜单
                    showFunctionSelectionMenu(obj);
                } else {
                    // 单击：获取代码信息
                    ripObject(obj);
                    gameState.lastClickedObject = obj.name;
                }
            }

            // 检查是否支持拖拽
            if (obj.functionCode['startDrag']) {
                obj.executeFunction('startDrag', mouseX, mouseY);
            }

            gameState.lastClickTime = currentTime;
            return;
        }
    }

    gameState.lastClickTime = currentTime;
}

// 鼠标拖动事件
function mouseDragged() {
    for (let obj of gameState.objects) {
        if (obj.functionCode['onDrag'] && obj.dragging) {
            obj.executeFunction('onDrag', mouseX, mouseY);
        }
    }
}

// 鼠标释放事件
function mouseReleased() {
    for (let obj of gameState.objects) {
        if (obj.functionCode['stopDrag']) {
            obj.executeFunction('stopDrag');
        }
    }
}

// 显示代码查看窗口（替代函数选择菜单）
function showFunctionSelectionMenu(obj) {
    openCodeViewer(obj.name);
}

// 打开代码查看窗口
function openCodeViewer(objectName) {
    const codeInfo = gameState.discoveredCode[objectName];
    if (!codeInfo || !codeInfo.functions) return;

    // 更新标题
    document.getElementById('viewerTitle').textContent = `查看代码 - ${objectName} (${codeInfo.className})`;

    // 渲染函数列表
    const viewerContent = document.getElementById('viewerContent');
    viewerContent.innerHTML = '';

    for (let funcInfo of codeInfo.functions) {
        const funcCard = createFunctionCard(objectName, funcInfo);
        viewerContent.appendChild(funcCard);
    }

    // 显示窗口
    document.getElementById('codeViewerOverlay').style.display = 'flex';
}

// 创建函数卡片
function createFunctionCard(objectName, funcInfo) {
    const card = document.createElement('div');
    card.className = 'function-card';

    // 创建header
    const header = document.createElement('div');
    header.className = 'function-card-header';

    const funcName = document.createElement('span');
    funcName.className = 'function-name';
    funcName.textContent = funcInfo.name;

    const permissionText = ['', '不可读', '可读函数名', '可读函数体', '可编辑'][funcInfo.permission];
    const permission = document.createElement('span');
    permission.className = 'function-permission';
    permission.textContent = `权限${funcInfo.permission} - ${permissionText}`;

    header.appendChild(funcName);
    header.appendChild(permission);
    card.appendChild(header);

    // 创建描述区域
    const description = document.createElement('div');
    description.className = 'function-description';

    // 根据权限显示内容
    if (funcInfo.permission < 3) {
        // 权限1或2：不可读取详细内容
        description.classList.add('encrypted');
        if (funcInfo.permission === 1) {
            description.textContent = '(完全加密，无法读取)';
        } else {
            description.textContent = '(只能看到函数名，内容加密)';
        }
    } else {
        // 权限3或4：可以看到自然语言描述
        if (funcInfo.naturalDescription) {
            renderDescriptionWithTokens(description, funcInfo.naturalDescription, funcInfo.permission);
        } else {
            description.textContent = '(无描述)';
        }

        // 如果权限是4，添加编辑按钮
        if (funcInfo.permission >= 4) {
            const editBtn = document.createElement('button');
            editBtn.className = 'action-btn';
            editBtn.textContent = '编辑函数';
            editBtn.style.marginTop = '10px';
            editBtn.onclick = () => {
                closeCodeViewer();
                openFunctionEditor(objectName, funcInfo.name);
            };
            card.appendChild(editBtn);
        }
    }

    card.appendChild(description);
    return card;
}

// 渲染自然语言描述，将词条渲染为可点击元素
function renderDescriptionWithTokens(container, description, permission) {
    const parts = parseNaturalDescription(description);

    for (let part of parts) {
        if (part.type === 'text') {
            // 普通文本
            const textSpan = document.createElement('span');
            textSpan.textContent = part.value;
            container.appendChild(textSpan);
        } else {
            // 词条（func或class）
            const tokenSpan = document.createElement('span');
            tokenSpan.className = `collectable-token token-${part.type}`;
            tokenSpan.textContent = part.value;
            tokenSpan.dataset.tokenType = part.type;
            tokenSpan.dataset.tokenValue = part.value;

            // 检查是否已收集
            const isCollected = gameState.tokenLibrary.some(t =>
                t.type === part.type && t.value === part.value
            );

            if (isCollected) {
                tokenSpan.classList.add('collected');
            }

            // 添加提示
            const hint = document.createElement('span');
            hint.className = 'collect-hint';
            hint.textContent = isCollected ? '已收集' : '点击收集';
            tokenSpan.appendChild(hint);

            // 添加点击事件
            if (!isCollected) {
                tokenSpan.onclick = () => {
                    collectToken(part.type, part.value, tokenSpan);
                };
            }

            container.appendChild(tokenSpan);
        }
    }
}

// 收集词条
function collectToken(type, value, element) {
    // 添加到词条库
    const added = addTokenToLibrary({ type, value });

    if (added) {
        // 标记为已收集
        element.classList.add('collected');
        element.onclick = null;

        // 更新提示文字
        const hint = element.querySelector('.collect-hint');
        if (hint) {
            hint.textContent = '已收集';
        }

        // 显示反馈
        addSystemMessage(`收集词条: ${value}`);

        // 添加收集动画
        element.style.animation = 'collect-bounce 0.5s ease';
    }
}

// 关闭代码查看窗口
function closeCodeViewer() {
    document.getElementById('codeViewerOverlay').style.display = 'none';
}

// 显示函数选择菜单（旧版，保留作为备用）

// 代码撕裂器：获取物体代码信息
function ripObject(obj) {
    // 如果已经在分析中，忽略
    if (gameState.analyzingObject) return;

    // 设置正在分析的物品
    gameState.analyzingObject = obj;
    gameState.analyzeStartTime = millis();

    // 初始化流动字符效果
    initMatrixChars(obj.x, obj.y, obj.width, obj.height);

    addSystemMessage(`正在分析 ${obj.name}...`);

    // 获取代码信息并通知Alex
    let codeInfo = obj.getFunctionInfo();

    // 存储到已发现的代码中（立即存储，这样Alex可以看到）
    gameState.discoveredCode[obj.name] = codeInfo;

    // 通知Alex进行分析
    notifyAlexCodeDiscovered(codeInfo);
}

// 设置工具栏
function setupToolbar() {
    const ripperToggle = document.getElementById('ripperToggle');

    ripperToggle.addEventListener('change', () => {
        // 如果正在分析，不允许切换，恢复checkbox状态
        if (gameState.analyzingObject) {
            ripperToggle.checked = (gameState.mode === 'ripper');
            return;
        }

        // 根据checkbox状态切换模式
        if (ripperToggle.checked) {
            gameState.mode = 'ripper';
            // 显示所有代码卡片
            showAllCodeCards();
        } else {
            gameState.mode = 'normal';
            // 隐藏所有代码卡片（但不删除）
            hideAllCodeCards();
        }
    });
}

// 显示所有代码卡片
function showAllCodeCards() {
    for (let objectName in gameState.codeCards) {
        gameState.codeCards[objectName].style.display = 'block';
    }
}

// 隐藏所有代码卡片
function hideAllCodeCards() {
    for (let objectName in gameState.codeCards) {
        gameState.codeCards[objectName].style.display = 'none';
    }
}

// 响应窗口大小变化
function windowResized() {
    resizeCanvas(windowWidth * 0.7, windowHeight - 120);
}

// 添加系统消息到聊天框
function addSystemMessage(text) {
    let chatMessages = document.getElementById('chatMessages');
    let messageDiv = document.createElement('div');
    messageDiv.className = 'message system-message';
    messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// ========== 词条系统 ==========

// 从自然语言描述中提取词条
function extractTokens(naturalDescription) {
    if (!naturalDescription) return [];

    let tokens = [];

    // 提取<func>标签中的内容
    const funcRegex = /<func>(.*?)<\/func>/g;
    let match;
    while ((match = funcRegex.exec(naturalDescription)) !== null) {
        tokens.push({
            type: 'func',
            value: match[1]
        });
    }

    // 提取<class>标签中的内容
    const classRegex = /<class>(.*?)<\/class>/g;
    while ((match = classRegex.exec(naturalDescription)) !== null) {
        tokens.push({
            type: 'class',
            value: match[1]
        });
    }

    return tokens;
}

// 添加词条到词条库（去重）
function addTokenToLibrary(token) {
    // 检查是否已存在
    const exists = gameState.tokenLibrary.some(t =>
        t.type === token.type && t.value === token.value
    );

    if (!exists) {
        gameState.tokenLibrary.push(token);
        updateTokenLibraryUI();
        return true;
    }
    return false;
}

// 从自然语言描述中提取并添加所有词条
function extractAndAddTokens(naturalDescription) {
    const tokens = extractTokens(naturalDescription);
    let addedCount = 0;

    for (let token of tokens) {
        if (addTokenToLibrary(token)) {
            addedCount++;
        }
    }

    return addedCount;
}

// 更新词条库UI
function updateTokenLibraryUI() {
    const tokenList = document.getElementById('tokenList');
    const tokenCount = document.getElementById('tokenCount');

    // 更新计数
    tokenCount.textContent = gameState.tokenLibrary.length;

    // 清空现有词条
    tokenList.innerHTML = '';

    // 渲染所有词条
    for (let token of gameState.tokenLibrary) {
        const tokenElement = document.createElement('div');
        tokenElement.className = `token-item token-${token.type}`;
        tokenElement.textContent = token.value;
        tokenElement.draggable = true;

        // 存储词条数据
        tokenElement.dataset.tokenType = token.type;
        tokenElement.dataset.tokenValue = token.value;

        // 添加拖拽事件
        tokenElement.addEventListener('dragstart', handleTokenDragStart);

        // 添加点击事件 - 如果编辑器打开，点击可添加到编辑器
        tokenElement.addEventListener('click', () => {
            handleTokenLibraryClick(token.type, token.value);
        });

        tokenList.appendChild(tokenElement);
    }
}

// 词条拖拽开始事件
function handleTokenDragStart(e) {
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: e.target.dataset.tokenType,
        value: e.target.dataset.tokenValue
    }));
}

// 词条库点击事件 - 添加词条到编辑器
function handleTokenLibraryClick(type, value) {
    // 检查编辑器是否打开
    const editorOverlay = document.getElementById('functionEditorOverlay');
    if (!editorOverlay || editorOverlay.style.display === 'none') {
        // 编辑器未打开，给出提示
        addSystemMessage('请先打开编辑器后再点击词条添加');
        return;
    }

    // 检查是否有正在编辑的函数
    if (!currentEditingFunction) {
        addSystemMessage('没有正在编辑的函数');
        return;
    }

    const workspace = document.getElementById('editorWorkspace');

    // 创建新的词条元素
    const tokenSpan = document.createElement('span');
    tokenSpan.className = `editor-token token-${type}`;
    tokenSpan.contentEditable = 'false';
    tokenSpan.textContent = value;
    tokenSpan.dataset.tokenType = type;
    tokenSpan.dataset.tokenValue = value;
    tokenSpan.draggable = true;

    // 添加拖拽事件
    tokenSpan.addEventListener('dragstart', handleTokenDragStartInEditor);
    tokenSpan.addEventListener('dragend', handleTokenDragEndInEditor);

    // 添加删除按钮
    const deleteBtn = document.createElement('span');
    deleteBtn.className = 'delete-token';
    deleteBtn.contentEditable = 'false';
    deleteBtn.textContent = '×';
    deleteBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        tokenSpan.remove();
    };
    tokenSpan.appendChild(deleteBtn);

    // 添加到末尾
    workspace.appendChild(tokenSpan);

    // 清理占位符
    workspace.removeAttribute('data-placeholder');

    // 聚焦到编辑器末尾
    workspace.focus();
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(workspace);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);

    // 给出反馈
    addSystemMessage(`已添加词条: ${value}`);
}

// ========== 函数编辑器 ==========

let currentEditingFunction = null; // 当前正在编辑的函数信息

// 打开函数编辑器
function openFunctionEditor(objectName, functionName) {
    // 获取物体和函数信息
    const obj = gameState.objects.find(o => o.name === objectName);
    if (!obj) return;

    const funcInfo = gameState.discoveredCode[objectName]?.functions.find(
        f => f.name === functionName || f.name === functionName.charAt(0) + '*'.repeat(functionName.length - 1)
    );

    if (!funcInfo) return;

    // 存储当前编辑信息
    currentEditingFunction = {
        objectName: objectName,
        functionName: functionName,
        permission: funcInfo.permission,
        naturalDescription: funcInfo.naturalDescription || ''
    };

    // 更新UI
    document.getElementById('editorTitle').textContent = `编辑 ${objectName}.${functionName}`;

    const permissionText = ['', '不可读', '可读函数名', '可读函数体', '可编辑'][funcInfo.permission];
    document.getElementById('editorPermission').textContent = `权限${funcInfo.permission} - ${permissionText}`;

    // 根据权限决定是否可编辑
    const canEdit = funcInfo.permission >= 4;
    document.getElementById('generateBtn').disabled = !canEdit;

    // 渲染编辑区域
    renderEditorWorkspace(currentEditingFunction.naturalDescription, canEdit);

    // 显示编辑器
    document.getElementById('functionEditorOverlay').style.display = 'flex';

    // 提升词条库的z-index，使其在编辑器上方可用
    document.getElementById('tokenLibrary').classList.add('editor-active');
}

// 渲染编辑工作区
function renderEditorWorkspace(naturalDescription, canEdit) {
    const workspace = document.getElementById('editorWorkspace');
    workspace.innerHTML = '';

    // 设置工作区为可编辑状态
    workspace.contentEditable = canEdit;
    workspace.className = 'editor-workspace' + (canEdit ? '' : ' readonly');

    if (!naturalDescription && !canEdit) {
        workspace.textContent = '(无描述)';
        return;
    }

    // 解析自然语言描述
    const parts = naturalDescription ? parseNaturalDescription(naturalDescription) : [];

    // 如果没有内容，添加占位文字
    if (parts.length === 0) {
        workspace.setAttribute('data-placeholder', '在此输入描述，或拖入词条...');
    } else {
        workspace.removeAttribute('data-placeholder');
    }

    // 渲染内容
    for (let i = 0; i < parts.length; i++) {
        const part = parts[i];

        if (part.type === 'text') {
            // 文本部分 - 直接作为文本节点
            const textNode = document.createTextNode(part.value);
            workspace.appendChild(textNode);
        } else {
            // 词条部分 - 作为不可编辑的内联元素
            const tokenSpan = document.createElement('span');
            tokenSpan.className = `editor-token token-${part.type}`;
            tokenSpan.contentEditable = 'false'; // 词条本身不可编辑
            tokenSpan.textContent = part.value;
            tokenSpan.dataset.tokenType = part.type;
            tokenSpan.dataset.tokenValue = part.value;

            if (canEdit) {
                // 词条可拖拽
                tokenSpan.draggable = true;

                // 拖拽事件
                tokenSpan.addEventListener('dragstart', handleTokenDragStartInEditor);
                tokenSpan.addEventListener('dragend', handleTokenDragEndInEditor);

                // 添加删除按钮
                const deleteBtn = document.createElement('span');
                deleteBtn.className = 'delete-token';
                deleteBtn.contentEditable = 'false';
                deleteBtn.textContent = '×';
                deleteBtn.onclick = (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    tokenSpan.remove();
                    updateWorkspaceFromDOM();
                };
                tokenSpan.appendChild(deleteBtn);
            }

            workspace.appendChild(tokenSpan);
        }
    }

    // 添加输入事件监听
    if (canEdit) {
        // 阻止Enter键换行
        workspace.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
            }
        });

        // 监听内容变化（用于调试）
        workspace.addEventListener('input', () => {
            // 可以在这里添加实时保存等功能
        });

        // 支持从词条库拖入
        workspace.addEventListener('dragover', handleEditorDragOver);
        workspace.addEventListener('drop', handleEditorDropToWorkspace);
        workspace.addEventListener('dragleave', handleEditorDragLeave);
    }
}

// 从DOM更新工作区（删除词条后调用）
function updateWorkspaceFromDOM() {
    const workspace = document.getElementById('editorWorkspace');
    const desc = reconstructFromWorkspaceDOM();

    // 触发一次重新渲染以更新状态
    // 但保留光标位置比较复杂，这里简单处理
    console.log('Updated description:', desc);
}

// 解析自然语言描述
function parseNaturalDescription(desc) {
    const parts = [];
    let lastIndex = 0;
    const regex = /<(func|class)>(.*?)<\/\1>/g;
    let match;

    while ((match = regex.exec(desc)) !== null) {
        // 添加之前的文本
        if (match.index > lastIndex) {
            const textBefore = desc.substring(lastIndex, match.index);
            if (textBefore) {
                parts.push({ type: 'text', value: textBefore });
            }
        }

        // 添加词条
        parts.push({
            type: match[1],  // 'func' or 'class'
            value: match[2]
        });

        lastIndex = match.index + match[0].length;
    }

    // 添加最后的文本
    if (lastIndex < desc.length) {
        const textAfter = desc.substring(lastIndex);
        if (textAfter) {
            parts.push({ type: 'text', value: textAfter });
        }
    }

    return parts;
}

// 删除编辑器中的词条（已废弃，改用直接删除DOM）
function deleteEditorToken(index) {
    // 不再使用
}

// 从工作区DOM重构自然语言描述
function reconstructFromWorkspaceDOM() {
    const workspace = document.getElementById('editorWorkspace');
    let desc = '';

    // 遍历所有子节点
    const processNode = (node) => {
        if (node.nodeType === Node.TEXT_NODE) {
            // 文本节点
            desc += node.textContent;
        } else if (node.nodeType === Node.ELEMENT_NODE && node.classList.contains('editor-token')) {
            // 词条节点
            const type = node.dataset.tokenType;
            const value = node.dataset.tokenValue;
            desc += `<${type}>${value}</${type}>`;
        }
    };

    for (let node of workspace.childNodes) {
        processNode(node);
    }

    return desc;
}

// ========== 编辑器内部词条拖拽 ==========
let draggedTokenElement = null; // 正在拖拽的词条元素

// 编辑器内词条拖拽开始
function handleTokenDragStartInEditor(e) {
    draggedTokenElement = e.target;
    draggedTokenElement.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', JSON.stringify({
        type: draggedTokenElement.dataset.tokenType,
        value: draggedTokenElement.dataset.tokenValue,
        fromEditor: true
    }));
}

// 编辑器内词条拖拽结束
function handleTokenDragEndInEditor(e) {
    if (draggedTokenElement) {
        draggedTokenElement.classList.remove('dragging');
        draggedTokenElement = null;
    }
}

// ========== 从词条库拖放到编辑器 ==========

// 编辑器拖放事件
function handleEditorDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('drop-active');
}

function handleEditorDragLeave(e) {
    if (e.currentTarget === e.target) {
        e.currentTarget.classList.remove('drop-active');
    }
}

// 拖放到工作区（统一处理词条库和编辑器内拖拽）
function handleEditorDropToWorkspace(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('drop-active');

    try {
        const data = JSON.parse(e.dataTransfer.getData('text/plain'));

        // 创建新的词条元素
        const tokenSpan = document.createElement('span');
        tokenSpan.className = `editor-token token-${data.type}`;
        tokenSpan.contentEditable = 'false';
        tokenSpan.textContent = data.value;
        tokenSpan.dataset.tokenType = data.type;
        tokenSpan.dataset.tokenValue = data.value;
        tokenSpan.draggable = true;

        // 添加拖拽事件
        tokenSpan.addEventListener('dragstart', handleTokenDragStartInEditor);
        tokenSpan.addEventListener('dragend', handleTokenDragEndInEditor);

        // 添加删除按钮
        const deleteBtn = document.createElement('span');
        deleteBtn.className = 'delete-token';
        deleteBtn.contentEditable = 'false';
        deleteBtn.textContent = '×';
        deleteBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            tokenSpan.remove();
        };
        tokenSpan.appendChild(deleteBtn);

        const workspace = e.currentTarget;

        // 如果是从编辑器内拖拽的，先删除原元素
        if (data.fromEditor && draggedTokenElement) {
            draggedTokenElement.remove();
        }

        // 获取光标位置并插入
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            range.deleteContents();
            range.insertNode(tokenSpan);

            // 将光标移到词条后面
            range.setStartAfter(tokenSpan);
            range.setEndAfter(tokenSpan);
            selection.removeAllRanges();
            selection.addRange(range);
        } else {
            // 如果没有选区，添加到末尾
            workspace.appendChild(tokenSpan);
        }

        // 清理占位符
        workspace.removeAttribute('data-placeholder');

        addSystemMessage(`已添加词条: ${data.value}`);
    } catch (error) {
        console.error('拖放处理错误:', error);
    }
}

// 重构自然语言描述（从编辑器当前状态）
function reconstructNaturalDescription(skipIndex = false, indexToSkip = -1) {
    // 新版本直接使用DOM重构
    return reconstructFromWorkspaceDOM();
}

// 关闭编辑器
function closeFunctionEditor() {
    document.getElementById('functionEditorOverlay').style.display = 'none';
    currentEditingFunction = null;

    // 恢复词条库的z-index
    document.getElementById('tokenLibrary').classList.remove('editor-active');
}

// 生成并发送给Alex
function generateAndSendToAlex() {
    if (!currentEditingFunction) return;

    const newDesc = reconstructNaturalDescription(false);

    if (!newDesc) {
        addSystemMessage('错误：描述不能为空');
        return;
    }

    // 构造消息发送给Alex
    const message = `请帮我修改 ${currentEditingFunction.objectName} 的 ${currentEditingFunction.functionName} 函数。新的功能描述是：${newDesc}`;

    // 关闭编辑器
    closeFunctionEditor();

    // 在聊天框显示
    sendPlayerMessage(message);

    addSystemMessage('已将修改请求发送给Alex');
}

// 发送玩家消息（从alex.js中移出来，或者调用alex.js的函数）
function sendPlayerMessage(message) {
    // 添加到聊天框
    let chatMessages = document.getElementById('chatMessages');
    let messageDiv = document.createElement('div');
    messageDiv.className = 'message player-message';
    messageDiv.innerHTML = `<div class="message-content">${message}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // 调用Alex的sendMessage函数
    if (typeof sendMessage === 'function') {
        sendMessage(message, false); // false表示不在UI中重复显示
    }
}



