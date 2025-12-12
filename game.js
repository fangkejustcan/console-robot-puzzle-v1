// 游戏状态
let gameState = {
    objects: [],
    mode: 'normal', // 'normal' 或 'ripper'
    won: false,
    discoveredCode: {}, // 存储已发现的代码信息
    analyzingObject: null, // 正在分析的物品
    analyzeStartTime: 0 // 分析开始时间
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
    let canvas = createCanvas(windowWidth * 0.7, windowHeight);
    canvas.parent('gameScene');

    // 初始化游戏物体
    initGameObjects();

    // 设置工具栏按钮事件
    setupToolbar();
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

            // 显示已发现的函数信息
            if (gameState.discoveredCode[obj.name]) {
                displayDiscoveredFunctions(obj);
            }
        }
    }

    // 绘制正在分析的物品特效
    if (gameState.analyzingObject) {
        drawAnalyzingEffect(gameState.analyzingObject);
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

// 显示已发现的函数信息
function displayDiscoveredFunctions(obj) {
    let codeInfo = gameState.discoveredCode[obj.name];
    if (!codeInfo || !codeInfo.functions) return;

    push();
    fill(0, 255, 0);
    textSize(10);
    textAlign(LEFT, TOP);

    let offsetY = obj.y - obj.height/2 - 15;
    for (let i = 0; i < Math.min(codeInfo.functions.length, 3); i++) {
        let funcInfo = codeInfo.functions[i];
        let displayText = funcInfo.name;
        text(displayText, obj.x + obj.width/2 + 15, offsetY + i * 12);
    }

    if (codeInfo.functions.length > 3) {
        text('...', obj.x + obj.width/2 + 15, offsetY + 36);
    }
    pop();
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

    // 清除分析状态和特效
    gameState.analyzingObject = null;
    matrixChars = [];

    // 不再自动切换回普通模式，保持在代码撕裂器模式
}

// 鼠标按下事件
function mousePressed() {
    if (gameState.won) return;

    // 如果正在分析，禁止其他操作
    if (gameState.analyzingObject) return;

    // 检查是否点击了物体
    for (let obj of gameState.objects) {
        if (obj.containsPoint(mouseX, mouseY)) {
            if (gameState.mode === 'normal') {
                // 普通模式：执行onClick
                obj.executeFunction('onClick');
            } else if (gameState.mode === 'ripper') {
                // 代码撕裂器模式：获取代码信息
                ripObject(obj);
            }

            // 检查是否支持拖拽
            if (obj.functionCode['startDrag']) {
                obj.executeFunction('startDrag', mouseX, mouseY);
            }
        }
    }
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
        } else {
            gameState.mode = 'normal';
        }
    });
}

// 响应窗口大小变化
function windowResized() {
    resizeCanvas(windowWidth * 0.7, windowHeight);
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
