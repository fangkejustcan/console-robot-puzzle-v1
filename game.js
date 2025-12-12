// 游戏状态
let gameState = {
    objects: [],
    mode: 'normal', // 'normal' 或 'ripper'
    won: false,
    discoveredCode: {} // 存储已发现的代码信息
};

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
    background(22, 33, 62);

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
        obj.draw();

        // 在代码撕裂器模式下，绘制物体边框
        if (gameState.mode === 'ripper') {
            push();
            noFill();
            stroke(78, 205, 196);
            strokeWeight(2);
            rectMode(CENTER);
            rect(obj.x, obj.y, obj.width + 10, obj.height + 10);
            pop();
        }
    }

    // 检查碰撞
    checkCollisions();

    // 显示模式提示
    displayModeIndicator();
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

// 显示当前模式指示器
function displayModeIndicator() {
    push();
    fill(255);
    textAlign(RIGHT, TOP);
    textSize(16);
    let modeText = gameState.mode === 'normal' ? '普通模式' : '代码撕裂器模式';
    text(modeText, width - 20, 20);
    pop();
}

// 鼠标按下事件
function mousePressed() {
    if (gameState.won) return;

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
    let codeInfo = obj.getFunctionInfo();

    // 存储到已发现的代码中
    gameState.discoveredCode[obj.name] = codeInfo;

    // 通知Alex
    notifyAlexCodeDiscovered(codeInfo);

    addSystemMessage(`使用代码撕裂器分析了 ${obj.name}`);

    // 自动切换回普通模式
    gameState.mode = 'normal';
    document.getElementById('normalMode').classList.add('active');
    document.getElementById('ripperMode').classList.remove('active');
}

// 设置工具栏
function setupToolbar() {
    document.getElementById('normalMode').addEventListener('click', () => {
        gameState.mode = 'normal';
        document.getElementById('normalMode').classList.add('active');
        document.getElementById('ripperMode').classList.remove('active');
    });

    document.getElementById('ripperMode').addEventListener('click', () => {
        gameState.mode = 'ripper';
        document.getElementById('ripperMode').classList.add('active');
        document.getElementById('normalMode').classList.remove('active');
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
