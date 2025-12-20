// 游戏状态
let gameState = {
    objects: [],
    mode: 'normal', // 'normal' 或 'ripper'
    won: false,
    discoveredCode: {}, // 存储已发现的代码信息
    analyzingObject: null, // 正在分析的物品
    analyzeStartTime: 0, // 分析开始时间
    inventory: [], // 物品栏：存储玩家已拾取的物品 {type: 'token'/'key', category: 'func'/'class', value: '内容'}
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

    // ===== 第二关物体（初始隐藏）=====
    // 青蛙三圣 - 等边三角形排列
    let centerX = width / 2;
    let centerY = height / 2 - 50;
    let radius = 180; // 增加20%距离

    // 生青蛙 - 顶点（朝上）
    let frogLife = new FrogLife(
        centerX + radius * cos(-PI / 2),
        centerY + radius * sin(-PI / 2)
    );
    gameState.objects.push(frogLife);

    // 死青蛙 - 左下
    let frogDeath = new FrogDeath(
        centerX + radius * cos(-PI / 2 + TWO_PI / 3),
        centerY + radius * sin(-PI / 2 + TWO_PI / 3)
    );
    gameState.objects.push(frogDeath);

    // 梦青蛙 - 右下
    let frogDream = new FrogDream(
        centerX + radius * cos(-PI / 2 + TWO_PI * 2 / 3),
        centerY + radius * sin(-PI / 2 + TWO_PI * 2 / 3)
    );
    gameState.objects.push(frogDream);

    // 电脑 - 放在右下角
    let computer = new Computer(width - 150, height - 120);
    gameState.objects.push(computer);
}

// 显示第二关物体
function showStage2Objects() {
    // 删除信纸和火柴
    const toRemove = [];
    for (let i = 0; i < gameState.objects.length; i++) {
        let obj = gameState.objects[i];
        if (obj instanceof Letter || obj instanceof Match) {
            toRemove.push(i);
            // 清理代码卡片
            if (gameState.codeCards[obj.name]) {
                removeCodeCard(obj.name);
            }
        }
    }

    // 从后往前删除，避免索引错乱
    for (let i = toRemove.length - 1; i >= 0; i--) {
        gameState.objects.splice(toRemove[i], 1);
    }

    // 显示第二关物体并移动电脑位置
    for (let obj of gameState.objects) {
        if (obj instanceof Frog) {
            obj.visible = true;
        } else if (obj instanceof Computer) {
            obj.visible = true;
            // 移动电脑到原信纸下方的位置
            obj.x = 200;
            obj.y = height / 2 + 150;
        }
    }

    addSystemMessage('第二关物体已显示！信纸和火柴已消失。');
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
        // 在代码撕裂器模式下，给可见物体添加强烈的绿色色调和遮罩
        if (gameState.mode === 'ripper' && obj.visible !== false) {
            tint(80, 255, 80, 180); // 强烈的绿色色调
        }
        obj.draw();
        pop();

        // 在代码撕裂器模式下，给每个可见物体添加绿色半透明遮罩
        if (gameState.mode === 'ripper' && obj.visible !== false) {
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

    // 检查电脑进度
    checkComputerProgress();

    // 清理超出屏幕的物体
    cleanupOffscreenObjects();

    // 更新鼠标指针样式
    updateCursorStyle();
}

// 检查所有物体之间的碰撞
function checkCollisions() {
    for (let i = 0; i < gameState.objects.length; i++) {
        for (let j = i + 1; j < gameState.objects.length; j++) {
            let obj1 = gameState.objects[i];
            let obj2 = gameState.objects[j];

            // 跳过不可见的物体
            if (obj1.visible === false || obj2.visible === false) {
                continue;
            }

            if (obj1.collidesWith(obj2)) {
                obj1.executeFunction('onCollide', obj2);
                obj2.executeFunction('onCollide', obj1);
            }
        }
    }
}

// 检查电脑进度（每帧调用）
function checkComputerProgress() {
    // 找到电脑对象
    let computer = gameState.objects.find(obj => obj.name === 'Computer');
    if (computer && computer.visible) {
        // 每帧调用电脑的onProgress函数
        computer.executeFunction('onProgress');
    }

    // 找到生青蛙对象
    let frogLife = gameState.objects.find(obj => obj.name === 'FrogLife');
    if (frogLife && frogLife.visible) {
        // 每帧调用生青蛙的EatCoin函数
        frogLife.executeFunction('EatCoin');
    }
}

// 清理超出屏幕的物体
function cleanupOffscreenObjects() {
    const margin = 100; // 超出屏幕的容差值
    const toRemove = [];

    for (let i = 0; i < gameState.objects.length; i++) {
        let obj = gameState.objects[i];

        // 检查物体是否完全超出屏幕（上下左右任意方向超出margin距离）
        if (obj.x < -margin ||
            obj.x > width + margin ||
            obj.y < -margin ||
            obj.y > height + margin) {

            // 标记要删除的物体索引
            toRemove.push(i);

            // 清理相关的代码卡片
            if (gameState.codeCards[obj.name]) {
                removeCodeCard(obj.name);
            }

            // 清理发现的代码信息
            if (gameState.discoveredCode[obj.name]) {
                delete gameState.discoveredCode[obj.name];
            }
        }
    }

    // 从后往前删除，避免索引错乱
    for (let i = toRemove.length - 1; i >= 0; i--) {
        gameState.objects.splice(toRemove[i], 1);
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
    // 为每个已发现代码的物体更新卡片位置（跳过不可见的物体）
    for (let obj of gameState.objects) {
        if (obj.visible !== false && gameState.discoveredCode[obj.name] && gameState.codeCards[obj.name]) {
            updateCodeCardPosition(obj);
        }
    }
}

// 创建代码卡片（只在分析完成时调用一次）
function createCodeCardForObject(obj) {
    // 实时获取最新的函数信息（权限可能已改变）
    const codeInfo = obj.getFunctionInfo();
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

    // 添加类名标题（使用类名词条样式，可点击收集）
    const classHeader = document.createElement('div');
    classHeader.className = 'code-card-header';
    const classNameToken = document.createElement('span');
    classNameToken.className = 'scene-token token-class';
    classNameToken.textContent = codeInfo.classNameCN;
    classNameToken.dataset.tokenType = 'class';
    classNameToken.dataset.tokenValue = codeInfo.classNameCN;
    classHeader.appendChild(classNameToken);

    // 添加最小化/展开按钮
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'card-toggle-btn';
    toggleBtn.textContent = '−';
    toggleBtn.title = '最小化';
    toggleBtn.onclick = (e) => {
        e.stopPropagation();
        toggleCardMinimize(card, toggleBtn);
    };
    classHeader.appendChild(toggleBtn);

    card.appendChild(classHeader);

    // 创建内容容器（用于最小化/展开）
    const contentContainer = document.createElement('div');
    contentContainer.className = 'code-card-content';

    // 显示前3个函数（所有权限）
    const visibleFunctions = codeInfo.functions.slice(0, 3);

    for (let funcInfo of visibleFunctions) {
        const funcDiv = createFunctionElement(funcInfo, obj.name);
        contentContainer.appendChild(funcDiv);
    }

    // 如果有更多函数，显示省略号
    if (codeInfo.functions.length > 3) {
        const moreDiv = document.createElement('div');
        moreDiv.className = 'code-card-function';
        moreDiv.innerHTML = '<span class="code-card-text">...</span>';
        contentContainer.appendChild(moreDiv);
    }

    card.appendChild(contentContainer);

    // 直接在卡片上绑定点击事件
    card.addEventListener('click', (e) => {
        console.log('卡片点击事件触发:', e.target);

        // 检查点击的是否是词条元素（但不是加密的???）
        if (e.target.classList.contains('scene-token') &&
            !e.target.classList.contains('encrypted-func')) {
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

// 切换代码卡片的最小化/展开状态
function toggleCardMinimize(card, toggleBtn) {
    const header = card.querySelector('.code-card-header');
    const content = card.querySelector('.code-card-content');
    const classNameToken = card.querySelector('.scene-token');
    const isMinimized = card.classList.toggle('minimized');

    if (isMinimized) {
        // 最小化：隐藏所有内容，只显示展开按钮
        content.style.display = 'none';
        classNameToken.style.display = 'none';
        toggleBtn.textContent = '+';
        toggleBtn.title = '展开';
    } else {
        // 展开：显示所有内容
        content.style.display = 'block';
        classNameToken.style.display = 'inline-flex';
        toggleBtn.textContent = '−';
        toggleBtn.title = '最小化';
    }
}

// 更新代码卡片位置
function updateCodeCardPosition(obj, card) {
    if (!card) {
        card = gameState.codeCards[obj.name];
    }

    if (!card) return;

    // 获取画布宽度
    const canvasWidth = width;

    // 判断物体是否靠右（超过画布宽度的60%）
    const isOnRightSide = obj.x > canvasWidth * 0.6;

    let cardX, cardY;

    if (isOnRightSide) {
        // 物体靠右，卡片显示在左侧
        cardX = obj.x - obj.width / 2 - card.offsetWidth - 20;
    } else {
        // 物体靠左，卡片显示在右侧
        cardX = obj.x + obj.width / 2 + 20;
    }

    cardY = obj.y - obj.height / 2;

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

// 刷新代码卡片（权限改变后调用）
function refreshCodeCard(objectName) {
    // 找到对应的物体
    const obj = gameState.objects.find(o => o.name === objectName);
    if (!obj) return;

    // 删除旧卡片
    removeCodeCard(objectName);

    // 重新创建卡片
    createCodeCardForObject(obj);
}

// 清空所有代码卡片
function clearAllCodeCards() {
    for (let objectName in gameState.codeCards) {
        gameState.codeCards[objectName].remove();
    }
    gameState.codeCards = {};
}

// 创建单个函数的DOM元素
function createFunctionElement(funcInfo, objectName) {
    const funcDiv = document.createElement('div');
    funcDiv.className = 'code-card-function';

    // 根据权限决定显示内容
    if (funcInfo.permission === 1) {
        // 权限1：完全不可读，显示 ???
        const tokenSpan = document.createElement('span');
        tokenSpan.className = 'scene-token token-func encrypted-func';
        tokenSpan.textContent = '???';
        funcDiv.appendChild(tokenSpan);
    } else if (funcInfo.permission === 2) {
        // 权限2：可读函数名，内容不可读
        // 显示函数名
        const funcNameSpan = document.createElement('span');
        funcNameSpan.className = 'scene-token token-func';
        funcNameSpan.textContent = funcInfo.name;
        funcDiv.appendChild(funcNameSpan);

        // 显示冒号
        const colonSpan = document.createElement('span');
        colonSpan.className = 'code-card-text';
        colonSpan.textContent = ':';
        funcDiv.appendChild(colonSpan);

        // 显示 ???
        const encryptedSpan = document.createElement('span');
        encryptedSpan.className = 'scene-token token-func encrypted-func';
        encryptedSpan.textContent = '???';
        funcDiv.appendChild(encryptedSpan);
    } else if (funcInfo.permission >= 3) {
        // 权限3和4：显示完整的自然语言描述
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
                funcDiv.appendChild(tokenSpan);
            }
        }
    }

    // 添加按钮区域
    const buttonArea = document.createElement('span');
    buttonArea.className = 'function-buttons';

    // 如果是权限4，添加编辑按钮
    if (funcInfo.permission >= 4) {
        const editBtn = document.createElement('button');
        editBtn.className = 'inline-edit-btn';
        editBtn.textContent = '编辑';
        editBtn.onclick = (e) => {
            e.stopPropagation();
            const card = e.target.closest('.code-card');
            const objName = card.dataset.objectName;
            openFunctionEditor(objName, funcInfo.name);
        };
        buttonArea.appendChild(editBtn);
    }

    // 如果是权限1、2、3，添加密钥破解按钮
    if (funcInfo.permission < 4) {
        const unlockBtn = document.createElement('button');
        unlockBtn.className = 'inline-unlock-btn';
        unlockBtn.textContent = '🔓破解';
        unlockBtn.onclick = (e) => {
            e.stopPropagation();
            const card = e.target.closest('.code-card');
            const objName = card.dataset.objectName;
            openUnlockDialog(objName, funcInfo.name);
        };
        buttonArea.appendChild(unlockBtn);
    }

    funcDiv.appendChild(buttonArea);

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

    // 在代码撕裂器模式下，检查点击是否在代码卡片上
    if (gameState.mode === 'ripper' && isClickOnCodeCard(mouseX, mouseY)) {
        // 点击在代码卡片上，不处理物体点击，让DOM事件处理
        return;
    }

    // 检测双击
    const currentTime = millis();
    const isDoubleClick = (currentTime - gameState.lastClickTime) < 300;

    // 检查是否点击了物体
    for (let obj of gameState.objects) {
        if (obj.containsPoint(mouseX, mouseY)) {
            if (gameState.mode === 'normal') {
                // 普通模式：执行onClick
                obj.executeFunction('onClick');

                // 尝试开始拖拽（如果物体设置了draggable=true）
                obj.startDragging(mouseX, mouseY);
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

            gameState.lastClickTime = currentTime;
            return;
        }
    }

    gameState.lastClickTime = currentTime;
}

// 检查点击是否在代码卡片上
function isClickOnCodeCard(canvasX, canvasY) {
    // 获取canvas元素的位置
    const canvas = document.querySelector('canvas');
    if (!canvas) return false;

    const canvasRect = canvas.getBoundingClientRect();

    // 将canvas坐标转换为页面坐标
    const pageX = canvasRect.left + canvasX;
    const pageY = canvasRect.top + canvasY;

    // 检查是否在任何代码卡片上
    for (let objectName in gameState.codeCards) {
        const card = gameState.codeCards[objectName];
        const rect = card.getBoundingClientRect();

        // 检查页面坐标是否在卡片范围内
        if (pageX >= rect.left && pageX <= rect.right &&
            pageY >= rect.top && pageY <= rect.bottom) {
            return true;
        }
    }
    return false;
}

// 鼠标拖动事件
function mouseDragged() {
    for (let obj of gameState.objects) {
        // 调用内部拖拽方法
        obj.updateDragging(mouseX, mouseY);
    }
}

// 鼠标释放事件
function mouseReleased() {
    for (let obj of gameState.objects) {
        // 调用内部停止拖拽方法
        obj.stopDragging();
    }
}

// 显示代码查看窗口（替代函数选择菜单）
function showFunctionSelectionMenu(obj) {
    openCodeViewer(obj.name);
}

// 打开代码查看窗口
function openCodeViewer(objectName) {
    // 找到对应的物体，实时获取最新权限信息
    const obj = gameState.objects.find(o => o.name === objectName);
    if (!obj) return;

    const codeInfo = obj.getFunctionInfo();
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

// 创建飞行词条动画
function createFlyingToken(fromElement, item) {
    // 获取起点位置
    const fromRect = fromElement.getBoundingClientRect();

    // 获取终点位置（物品栏）
    const inventory = document.getElementById('tokenLibrary');
    const inventoryRect = inventory.getBoundingClientRect();

    // 创建飞行副本
    const flyingToken = fromElement.cloneNode(true);
    flyingToken.style.position = 'fixed';
    flyingToken.style.left = fromRect.left + 'px';
    flyingToken.style.top = fromRect.top + 'px';
    flyingToken.style.zIndex = '10000';
    flyingToken.style.pointerEvents = 'none';
    flyingToken.style.transition = 'all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94)';

    document.body.appendChild(flyingToken);

    // 返回一个Promise，在动画结束后resolve
    return new Promise(resolve => {
        // 稍微延迟，确保DOM已渲染
        setTimeout(() => {
            // 开始飞行动画
            flyingToken.style.left = inventoryRect.left + inventoryRect.width / 2 - fromRect.width / 2 + 'px';
            flyingToken.style.top = inventoryRect.top + inventoryRect.height / 2 - fromRect.height / 2 + 'px';
            flyingToken.style.transform = 'scale(0.5)';
            flyingToken.style.opacity = '0.8';

            // 动画结束后清理
            setTimeout(() => {
                flyingToken.remove();
                resolve();
            }, 800);
        }, 50);
    });
}

// 自动收集物体的所有可收集词条（带动画效果）
function autoCollectTokensFromObject(obj) {
    // 找到该物体的代码卡片
    const card = gameState.codeCards[obj.name];
    if (!card) {
        console.log('未找到代码卡片:', obj.name);
        return;
    }

    // 找到所有可收集的词条元素（不是加密的???）
    const tokenElements = card.querySelectorAll('.scene-token:not(.encrypted-func)');

    if (tokenElements.length === 0) {
        console.log('没有可收集的词条');
        return;
    }

    let collectedTokens = [];

    // 收集所有词条信息
    tokenElements.forEach(element => {
        const type = element.dataset.tokenType;
        const value = element.dataset.tokenValue;

        if (type && value) {
            // 检查是否已存在
            const exists = gameState.inventory.some(i =>
                i.type === 'token' && i.category === type && i.value === value
            );

            if (!exists) {
                // 添加到inventory（不更新UI）
                gameState.inventory.push({
                    type: 'token',
                    category: type,
                    value: value
                });

                collectedTokens.push({ element, type, value });
            }
        }
    });

    // 如果有新收集的词条，依次播放飞行动画
    if (collectedTokens.length > 0) {
        let animationPromises = [];

        collectedTokens.forEach((token, index) => {
            setTimeout(() => {
                // 添加发光效果
                token.element.classList.add('auto-collecting');

                // 延迟一点开始飞行，让发光效果先显示
                setTimeout(() => {
                    const promise = createFlyingToken(token.element, {
                        type: 'token',
                        category: token.type,
                        value: token.value
                    });

                    // 飞行动画结束后，移除发光效果
                    promise.then(() => {
                        token.element.classList.remove('auto-collecting');
                    });

                    animationPromises.push(promise);
                }, 300);
            }, index * 200); // 每个词条延迟200ms
        });

        // 等待所有飞行动画完成后更新物品栏UI
        setTimeout(() => {
            updateInventoryUI();

            // 给新添加的词条添加出现动画
            setTimeout(() => {
                const itemList = document.getElementById('tokenList');
                const newItems = itemList.querySelectorAll('.token-item');
                const startIndex = Math.max(0, newItems.length - collectedTokens.length);

                for (let i = startIndex; i < newItems.length; i++) {
                    newItems[i].style.animation = 'token-appear 0.5s ease-out';
                }
            }, 50);

            addSystemMessage(`✨ 自动收集了 ${collectedTokens.length} 个新词条`);
        }, collectedTokens.length * 200 + 1100);

        console.log('自动收集词条:', collectedTokens.map(t => t.value).join(', '));
    } else {
        console.log('所有词条已收集');
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

    // 检查是否已经分析过
    const alreadyDiscovered = gameState.discoveredCode[obj.name] !== undefined;

    if (alreadyDiscovered) {
        // 已经分析过，直接展开此卡片并最小化其他卡片
        expandCardAndMinimizeOthers(obj.name);
        addSystemMessage(`查看 ${obj.name} 的代码`);
        return;
    }

    // 第一次分析，执行完整流程
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

    // 立即创建代码卡片
    createCodeCardForObject(obj);

    // 展开当前卡片，最小化其他卡片
    setTimeout(() => {
        expandCardAndMinimizeOthers(obj.name);
    }, 50);

    // 等待DOM渲染完成后再自动收集词条
    setTimeout(() => {
        autoCollectTokensFromObject(obj);
    }, 100);

    // 通知Alex进行分析
    notifyAlexCodeDiscovered(codeInfo);
}

// 展开指定卡片，最小化其他卡片
function expandCardAndMinimizeOthers(targetObjectName) {
    for (let objectName in gameState.codeCards) {
        const card = gameState.codeCards[objectName];
        const toggleBtn = card.querySelector('.card-toggle-btn');

        if (objectName === targetObjectName) {
            // 展开目标卡片
            if (card.classList.contains('minimized')) {
                toggleCardMinimize(card, toggleBtn);
            }
        } else {
            // 最小化其他卡片
            if (!card.classList.contains('minimized')) {
                toggleCardMinimize(card, toggleBtn);
            }
        }
    }
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
        // 找到对应的物体，检查是否可见
        const obj = gameState.objects.find(o => o.name === objectName);
        if (obj && obj.visible !== false) {
            gameState.codeCards[objectName].style.display = 'block';
        }
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

    // 提取<attr>标签中的内容
    const attrRegex = /<attr>(.*?)<\/attr>/g;
    while ((match = attrRegex.exec(naturalDescription)) !== null) {
        tokens.push({
            type: 'attr',
            value: match[1]
        });
    }

    return tokens;
}

// 添加物品到物品栏
function addItemToInventory(item) {
    // item格式: {type: 'token'/'key', category: 'func'/'class' (仅token), value: '内容'}

    if (item.type === 'token') {
        // 词条需要去重
        const exists = gameState.inventory.some(i =>
            i.type === 'token' && i.category === item.category && i.value === item.value
        );
        if (!exists) {
            gameState.inventory.push({
                type: 'token',
                category: item.category,
                value: item.value
            });
            updateInventoryUI();
            return true;
        }
        return false;
    } else if (item.type === 'key') {
        // 密钥可以堆叠，检查是否已有同名密钥
        const existingKey = gameState.inventory.find(i =>
            i.type === 'key' && i.value === item.value
        );
        if (existingKey) {
            // 已有同名密钥，数量+1
            existingKey.count = (existingKey.count || 1) + 1;
        } else {
            // 新密钥，添加到物品栏
            gameState.inventory.push({
                type: 'key',
                value: item.value,
                count: 1
            });
        }
        updateInventoryUI();
        return true;
    }

    return false;
}

// 兼容旧版本的addTokenToLibrary
function addTokenToLibrary(token) {
    // 转换为新的物品格式
    return addItemToInventory({
        type: 'token',
        category: token.type,  // 'func' or 'class'
        value: token.value
    });
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

// 更新物品栏UI
function updateInventoryUI() {
    const itemList = document.getElementById('tokenList');
    const itemCount = document.getElementById('tokenCount');

    // 更新计数
    itemCount.textContent = gameState.inventory.length;

    // 清空现有物品
    itemList.innerHTML = '';

    // 渲染所有物品
    for (let item of gameState.inventory) {
        const itemElement = document.createElement('div');

        if (item.type === 'token') {
            // 词条物品
            itemElement.className = `token-item token-${item.category}`;
            itemElement.textContent = item.value;
            itemElement.draggable = true;

            // 存储词条数据
            itemElement.dataset.tokenType = item.category;
            itemElement.dataset.tokenValue = item.value;

            // 添加拖拽事件
            itemElement.addEventListener('dragstart', handleTokenDragStart);

            // 添加点击事件 - 如果编辑器打开，点击可添加到编辑器
            itemElement.addEventListener('click', () => {
                handleTokenLibraryClick(item.category, item.value);
            });
        } else if (item.type === 'key') {
            // 密钥物品
            // 根据密钥颜色选择CSS类
            let keyClass = 'token-item token-key';
            if (item.value === '红色密钥') {
                keyClass = 'token-item token-key token-key-red';
            }
            itemElement.className = keyClass;

            // 创建密钥内容容器
            const keyContent = document.createElement('span');
            keyContent.textContent = `🔑 ${item.value}`;
            itemElement.appendChild(keyContent);

            // 如果数量大于1，添加数量角标
            if (item.count && item.count > 1) {
                const countBadge = document.createElement('span');
                countBadge.className = 'item-count-badge';
                countBadge.textContent = item.count;
                itemElement.appendChild(countBadge);
            }

            // 存储密钥数据
            itemElement.dataset.itemType = 'key';
            itemElement.dataset.itemValue = item.value;

            // 密钥点击事件：如果破解窗口打开，则尝试破解；否则显示信息
            itemElement.addEventListener('click', () => {
                if (currentUnlockingFunction) {
                    // 破解窗口打开，尝试使用此密钥破解
                    attemptUnlockWithKey(item.value);
                } else {
                    // 正常情况，显示密钥信息
                    const countText = item.count > 1 ? ` x${item.count}` : '';
                    addSystemMessage(`密钥: ${item.value}${countText}`);
                }
            });
        }

        itemList.appendChild(itemElement);
    }
}

// 兼容旧版本的updateTokenLibraryUI
function updateTokenLibraryUI() {
    updateInventoryUI();
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
    // 找到对应的物体，实时获取最新权限信息
    const obj = gameState.objects.find(o => o.name === objectName);
    if (!obj) return;

    const codeInfo = obj.getFunctionInfo();
    if (!codeInfo) return;

    const funcInfo = codeInfo.functions.find(
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
    const regex = /<(func|class|attr)>(.*?)<\/\1>/g;
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
            type: match[1],  // 'func', 'class', or 'attr'
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

// ========== 密钥破解系统 ==========

let currentUnlockingFunction = null; // 当前正在破解的函数信息

// 打开密钥破解窗口
function openUnlockDialog(objectName, functionName) {
    // 找到对应的物体，实时获取最新权限信息
    const obj = gameState.objects.find(o => o.name === objectName);
    if (!obj) return;

    const codeInfo = obj.getFunctionInfo();
    if (!codeInfo) return;

    const funcInfo = codeInfo.functions.find(
        f => f.name === functionName
    );

    if (!funcInfo) return;

    // 存储当前破解信息
    currentUnlockingFunction = {
        objectName: objectName,
        functionName: functionName,
        permission: funcInfo.permission
    };

    // 判断需要哪种密钥
    let requiredKey = '黄色密钥';
    if (obj instanceof Frog || obj instanceof Computer) {
        requiredKey = '红色密钥';
    }

    // 更新UI
    document.getElementById('unlockTitle').textContent = `破解 ${objectName}.${functionName}`;

    // 更新密钥提示
    const keyNameSpan = document.querySelector('.unlock-message .key-name');
    if (keyNameSpan) {
        keyNameSpan.textContent = `🔑 ${requiredKey}`;
    }

    // 显示窗口
    document.getElementById('unlockDialogOverlay').style.display = 'flex';

    // 提升物品栏的z-index，使其在破解窗口上方
    document.getElementById('tokenLibrary').classList.add('unlock-active');
}

// 关闭密钥破解窗口
function closeUnlockDialog() {
    document.getElementById('unlockDialogOverlay').style.display = 'none';
    currentUnlockingFunction = null;

    // 恢复物品栏的z-index
    document.getElementById('tokenLibrary').classList.remove('unlock-active');
}

// 尝试使用密钥破解（从物品栏点击密钥时调用）
function attemptUnlockWithKey(keyValue) {
    if (!currentUnlockingFunction) return;

    // 破解成功，升级权限
    const obj = gameState.objects.find(o => o.name === currentUnlockingFunction.objectName);
    if (!obj) return;

    // 判断需要哪种密钥（第二关物体需要红色密钥，第一关物体需要黄色密钥）
    let requiredKey = '黄色密钥';
    if (obj instanceof Frog || obj instanceof Computer) {
        requiredKey = '红色密钥';
    }

    // 检查密钥是否正确
    if (keyValue !== requiredKey) {
        addSystemMessage(`❌ 此函数需要${requiredKey}破解`);
        return;
    }

    // 找到真实的函数名（因为权限1的函数名可能是加密的）
    let realFunctionName = null;
    const displayedName = currentUnlockingFunction.functionName;

    // 遍历所有函数，找到匹配的真实函数名
    for (let funcName in obj.permissions) {
        // 如果权限是1，函数名会被加密为 首字母+星号
        if (obj.permissions[funcName] === PERMISSION.NO_READ) {
            const encryptedName = funcName.charAt(0) + '*'.repeat(funcName.length - 1);
            if (encryptedName === displayedName) {
                realFunctionName = funcName;
                break;
            }
        } else if (funcName === displayedName) {
            // 权限>=2，函数名没有加密
            realFunctionName = funcName;
            break;
        }
    }

    if (!realFunctionName) {
        addSystemMessage('❌ 找不到对应的函数');
        console.error('找不到函数:', displayedName);
        return;
    }

    // 升级权限为4
    obj.permissions[realFunctionName] = PERMISSION.EDIT;

    // 消耗一个密钥
    const keyItem = gameState.inventory.find(item =>
        item.type === 'key' && item.value === keyValue
    );
    if (keyItem) {
        if (keyItem.count > 1) {
            // 数量大于1，减少数量
            keyItem.count--;
        } else {
            // 数量为1，删除密钥
            const keyIndex = gameState.inventory.indexOf(keyItem);
            gameState.inventory.splice(keyIndex, 1);
        }
        updateInventoryUI();
    }

    // 刷新代码卡片（会实时获取最新权限信息）
    refreshCodeCard(currentUnlockingFunction.objectName);

    // 等待DOM渲染完成后，自动收集破解出来的新词条
    setTimeout(() => {
        // 如果卡片是最小化的，先展开它
        const card = gameState.codeCards[currentUnlockingFunction.objectName];
        if (card && card.classList.contains('minimized')) {
            const toggleBtn = card.querySelector('.card-toggle-btn');
            if (toggleBtn) {
                toggleCardMinimize(card, toggleBtn);
            }
        }

        // 自动收集新词条
        autoCollectTokensFromObject(obj);
    }, 150);

    addSystemMessage(`✅ 破解成功！${realFunctionName} 权限已升级`);

    // 通知Alex破解成功
    const unlockMessage = `我用密钥破解了 ${currentUnlockingFunction.objectName} 的 ${realFunctionName} 函数，现在权限是4了，可以编辑了。`;
    if (typeof sendMessage === 'function') {
        sendMessage(unlockMessage, false); // false表示不在UI中重复显示
    }

    // 关闭窗口
    closeUnlockDialog();
}

// 尝试破解（旧版本，已废弃）
function attemptUnlock() {
    // 这个函数已经不再使用，保留以防万一
}

// 生成并发送给Alex
function generateAndSendToAlex() {
    if (!currentEditingFunction) return;

    const newDesc = reconstructNaturalDescription(false);

    if (!newDesc) {
        addSystemMessage('错误：描述不能为空');
        return;
    }

    // 提取词条并获取映射信息
    const tokenMappings = extractTokenMappings(newDesc);

    // 构造消息发送给Alex
    let message = `请帮我修改 ${currentEditingFunction.objectName} 的 ${currentEditingFunction.functionName} 函数。新的功能描述是：${newDesc}`;

    // 如果有词条映射，附加到消息中
    if (tokenMappings.length > 0) {
        message += '\n\n[词条对应的实际代码名称]：\n';
        for (let mapping of tokenMappings) {
            message += `- ${mapping.token} → ${mapping.code}\n`;
        }
    }

    // 关闭编辑器
    closeFunctionEditor();

    // 在聊天框显示
    sendPlayerMessage(message);

    addSystemMessage('已将修改请求发送给Alex');
}

// 词条到代码的映射表
const TOKEN_MAPPING = {
    // 类名映射
    'class': {
        '金币': 'Coin',
        '存钱罐': 'PiggyBank',
        '密码门': 'PasswordDoor',
        '信纸': 'Letter',
        '火柴': 'Match',
        '陀螺': 'Gyro',
        '青蛙': 'Frog (FrogLife/FrogDeath/FrogDream)',
        '电脑': 'Computer'
    },
    // 函数/动作映射
    'func': {
        '生成': 'new ClassName(x, y); gameState.objects.push(obj)',
        '删除': 'gameState.objects.splice(index, 1)',
        '移动': 'this.x += dx; this.y += dy',
        '旋转': 'this.rotation += angle',
        '显示': 'this.revealedCount++',
        '检查': 'if (condition)',
        '增加': 'value += amount',
        '减少': 'value -= amount',
        '点击时': 'onClick 函数',
        '碰撞时': 'onCollide 函数',
        '每帧检测': '每帧自动调用',
        '每秒杀死': '每秒自动调用',
        '物体': 'gameState.objects 中的对象'
    },
    // 属性映射
    'attr': {
        '密码': 'this.password',
        'HP': 'this.hp',
        '可拖拽': 'this.draggable',
        '旋转': 'this.rotation',
        '隐藏文字': 'this.hiddenText'
    }
};

// 提取词条并返回映射信息
function extractTokenMappings(description) {
    const mappings = [];
    const foundTokens = new Set(); // 用于去重

    // 匹配所有词条
    const regex = /<(func|class|attr)>(.*?)<\/\1>/g;
    let match;

    while ((match = regex.exec(description)) !== null) {
        const type = match[1]; // func, class, attr
        const value = match[2]; // 词条内容

        // 生成唯一标识，避免重复
        const key = `${type}:${value}`;
        if (foundTokens.has(key)) continue;
        foundTokens.add(key);

        // 查找映射
        if (TOKEN_MAPPING[type] && TOKEN_MAPPING[type][value]) {
            mappings.push({
                token: `<${type}>${value}</${type}>`,
                code: TOKEN_MAPPING[type][value]
            });
        }
    }

    return mappings;
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



