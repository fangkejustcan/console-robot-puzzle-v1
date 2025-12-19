// 权限等级常量
const PERMISSION = {
    NO_READ: 1,        // 不可阅读
    READ_NAME: 2,      // 可阅读函数名
    READ_BODY: 3,      // 可阅读函数体
    EDIT: 4            // 可编辑函数体
};

// 游戏物体基类
class GameObject {
    constructor(x, y, width, height, name) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.name = name;
        this.className = this.constructor.name; // 自动获取类名
        this.classNameCN = ''; // 中文类名，由子类设置
        this.rotation = 0;

        // 拖拽相关属性（内部管理，不暴露给玩家）
        this.draggable = false; // 是否可拖拽
        this.dragging = false;  // 是否正在拖拽
        this.dragOffsetX = 0;   // 拖拽偏移量
        this.dragOffsetY = 0;

        // 存储函数权限
        this.permissions = {};

        // 存储函数代码（字符串形式，用于动态执行）
        this.functionCode = {};

        // 存储函数的自然语言描述
        this.naturalDescription = {};
    }

    // 开始拖拽（内部方法）
    startDragging(mouseX, mouseY) {
        if (!this.draggable || !this.containsPoint(mouseX, mouseY)) return false;

        this.dragging = true;
        this.dragOffsetX = this.x - mouseX;
        this.dragOffsetY = this.y - mouseY;
        return true;
    }

    // 拖拽中（内部方法）
    updateDragging(mouseX, mouseY) {
        if (!this.dragging) return;

        this.x = mouseX + this.dragOffsetX;
        this.y = mouseY + this.dragOffsetY;
    }

    // 停止拖拽（内部方法）
    stopDragging() {
        this.dragging = false;
    }

    // 注册一个可执行函数
    registerFunction(funcName, code, permission, naturalDesc = '') {
        this.functionCode[funcName] = code;
        this.permissions[funcName] = permission;
        this.naturalDescription[funcName] = naturalDesc;
    }

    // 动态执行函数
    executeFunction(funcName, ...args) {
        if (!this.functionCode[funcName]) {
            console.warn(`函数 ${funcName} 不存在于 ${this.name}`);
            return;
        }

        try {
            // 使用eval在当前对象上下文中执行代码
            // 创建一个函数，绑定this到当前对象
            const func = new Function(...args.map((_, i) => `arg${i}`), this.functionCode[funcName]);
            return func.apply(this, args);
        } catch (error) {
            console.error(`执行 ${this.name}.${funcName} 时出错:`, error);
            addSystemMessage(`⚠️ 代码执行错误: ${error.message}`);
        }
    }

    // 绘制物体
    draw() {
        push();
        translate(this.x, this.y);
        rotate(this.rotation);
        this.render();
        pop();
    }

    // 子类需要实现的渲染方法
    render() {
        // 默认渲染为矩形
        fill(200);
        rectMode(CENTER);
        rect(0, 0, this.width, this.height);
    }

    // 检查点击
    containsPoint(px, py) {
        return px > this.x - this.width / 2 &&
               px < this.x + this.width / 2 &&
               py > this.y - this.height / 2 &&
               py < this.y + this.height / 2;
    }

    // 碰撞检测
    collidesWith(other) {
        return this.x - this.width / 2 < other.x + other.width / 2 &&
               this.x + this.width / 2 > other.x - other.width / 2 &&
               this.y - this.height / 2 < other.y + other.height / 2 &&
               this.y + this.height / 2 > other.y - other.height / 2;
    }

    // 旋转物体
    rotateBy(angle) {
        this.rotation += angle;
    }

    // 获取函数信息（用于代码撕裂器）
    getFunctionInfo() {
        let info = {
            objectName: this.name,
            className: this.className, // 英文类名
            classNameCN: this.classNameCN, // 中文类名
            functions: []
        };

        for (let funcName in this.permissions) {
            let permission = this.permissions[funcName];
            let funcInfo = {
                permission: permission
            };

            // 根据权限决定返回的函数名
            if (permission === PERMISSION.NO_READ) {
                // 权限1：完全加密，只显示首字母+星号（星号数量=原长度-1）
                funcInfo.name = funcName.charAt(0) + '*'.repeat(funcName.length - 1);
                funcInfo.encrypted = true;
            } else if (permission >= PERMISSION.READ_NAME) {
                // 权限2及以上：显示完整函数名
                funcInfo.name = funcName;
                funcInfo.encrypted = false;
            }

            // 根据权限决定是否返回函数体
            if (permission >= PERMISSION.READ_BODY && this.functionCode[funcName]) {
                funcInfo.body = this.functionCode[funcName];
            }

            // 添加自然语言描述（只有权限>=3才能看到）
            if (permission >= PERMISSION.READ_BODY && this.naturalDescription[funcName]) {
                funcInfo.naturalDescription = this.naturalDescription[funcName];
            }

            info.functions.push(funcInfo);
        }

        return info;
    }
}

// 密码门
class PasswordDoor extends GameObject {
    constructor(x, y) {
        super(x, y, 100, 150, 'PasswordDoor');
        this.classNameCN = '密码门';
        this.hp = 1000000;
        this.password = '1211';

        // 注册onClick函数 - 权限1（不可读）
        this.registerFunction('onClick', `
            let input = prompt('请输入4位数密码:');
            if (input === this.password) {
                // 密码正确，给玩家5个黄色密钥，并显示第二关
                for (let i = 1; i <= 5; i++) {
                    addItemToInventory({
                        type: 'key',
                        value: '黄色密钥'
                    });
                }
                addSystemMessage('密码正确！获得5个黄色密钥！第二关开启...');

                // 显示第二关的物体
                if (typeof showStage2Objects === 'function') {
                    showStage2Objects();
                }
            } else {
                addSystemMessage('密码错误！');
            }
        `, PERMISSION.NO_READ, '<func>点击时</func>：<func>检查</func><attr>密码</attr>');

        // 注册onCollide函数 - 权限1（不可读）
        this.registerFunction('onCollide', `
            this.hp -= 1;
            if (this.hp <= 0) {
                alert('门被破坏了！游戏胜利！');
                gameState.won = true;
            }
        `, PERMISSION.NO_READ, '<func>碰撞时</func>：<attr>HP</attr><func>减少</func>1');
    }

    render() {
        // 绘制门
        fill(139, 69, 19);
        rectMode(CENTER);
        rect(0, 0, this.width, this.height);

        // 绘制门把手
        fill(255, 215, 0);
        ellipse(20, 0, 10, 10);

        // 显示HP
        fill(255, 0, 0);
        textAlign(CENTER, CENTER);
        textSize(12);
        text(`HP: ${this.hp}`, 0, -this.height/2 - 15);
    }
}

// 存钱罐
class PiggyBank extends GameObject {
    constructor(x, y) {
        super(x, y, 60, 50, 'PiggyBank');
        this.classNameCN = '存钱罐';

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            // 在自己位置下方随机范围内生成硬币
            let coinX = this.x + random(-30, 30);
            let coinY = this.y + this.height/2 + random(20, 50);
            let coin = new Coin(coinX, coinY);
            gameState.objects.push(coin);
            addSystemMessage('存钱罐掉出了一枚硬币！');
        `, PERMISSION.EDIT, '<func>点击时</func>：<func>生成</func>一个<class>金币</class>');
    }

    render() {
        // 绘制存钱罐
        fill(255, 182, 193);
        ellipse(0, 0, this.width, this.height);

        // 猪鼻子
        fill(255, 105, 180);
        ellipse(0, 5, 20, 15);

        // 眼睛
        fill(0);
        ellipse(-12, -8, 5, 5);
        ellipse(12, -8, 5, 5);

        // 投币口
        fill(100);
        rect(-10, -20, 20, 3);
    }
}

// 硬币
class Coin extends GameObject {
    constructor(x, y) {
        super(x, y, 20, 20, 'Coin');
        this.classNameCN = '金币';
        this.velocity = 2;
    }

    render() {
        fill(255, 215, 0);
        ellipse(0, 0, this.width, this.height);
        fill(184, 134, 11);
        textAlign(CENTER, CENTER);
        textSize(12);
        text('¥', 0, 0);
    }

    // 硬币会向下移动
    update() {
        this.y += this.velocity;
    }
}

// 信纸
class Letter extends GameObject {
    constructor(x, y) {
        super(x, y, 150, 200, 'Letter');
        this.classNameCN = '信纸';
        this.text = '火焰让人温暖，也让人看的更清楚。密';
        this.hiddenText = ['码', '是', '1', '2', '1', '1'];
        this.revealedCount = 0;

        // 注册onCollide函数 - 权限1（不可读）
        this.registerFunction('onCollide', `
            if (arg0.name && arg0.name.startsWith('Match')) {
                if (this.revealedCount < this.hiddenText.length) {
                    this.revealedCount++;
                    addSystemMessage('信纸显示了新的文字: ' + this.hiddenText[this.revealedCount - 1]);

                    // 删除火柴
                    let index = gameState.objects.indexOf(arg0);
                    if (index > -1) {
                        gameState.objects.splice(index, 1);
                    }
                }
            }
        `, PERMISSION.NO_READ, '<func>碰撞时</func>：<func>显示</func><attr>隐藏文字</attr>');
    }

    render() {
        // 绘制信纸背景
        fill(255, 250, 240);
        stroke(200, 180, 140);
        strokeWeight(2);
        rectMode(CENTER);
        rect(0, 0, this.width, this.height, 5); // 圆角

        // 绘制横线装饰（在文字后面）
        stroke(220, 200, 160);
        strokeWeight(1);
        for (let i = 0; i < 8; i++) {
            let lineY = -this.height/2 + 35 + i * 22;
            line(-this.width/2 + 15, lineY, this.width/2 - 15, lineY);
        }

        // 准备显示文字
        let displayText = this.text;
        for (let i = 0; i < this.revealedCount; i++) {
            if (i < this.hiddenText.length) {
                displayText += this.hiddenText[i];
            }
        }

        // 绘制文字 - 设置中文换行模式
        push();
        fill(40, 40, 60);
        noStroke();
        textAlign(CENTER, TOP); // 改为居中对齐
        textSize(18);
        textStyle(NORMAL);
        textWrap(CHAR); // 设置为字符级换行，支持中文

        // 文字框位置 - 居中显示
        let textY = -this.height/2 + 25;
        let textWidth = this.width - 30;

        // 绘制文字（居中，p5.js会自动换行）
        text(displayText, 0, textY, textWidth);
        pop();
    }
}

// 火柴
class Match extends GameObject {
    constructor(x, y, id) {
        super(x, y, 10, 60, `Match_${id}`);
        this.classNameCN = '火柴';
        this.id = id;

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            this.draggable = true;
        `, PERMISSION.EDIT, '<func>点击时</func>：设置<attr>可拖拽</attr>');
    }

    render() {
        // 火柴棒
        fill(139, 90, 43);
        rectMode(CENTER);
        rect(0, 0, 10, 50);

        // 火柴头
        fill(255, 0, 0);
        ellipse(0, -30, 12, 12);
    }
}

// 陀螺
class Gyro extends GameObject {
    constructor(x, y) {
        super(x, y, 50, 50, 'Gyro');
        this.classNameCN = '陀螺';

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            this.rotation += Math.PI / 2; // 旋转90度
            addSystemMessage('陀螺旋转了90度');
        `, PERMISSION.EDIT, '<func>点击时</func>：<attr>旋转</attr><func>增加</func>90度');
    }

    render() {
        // 绘制陀螺
        fill(75, 0, 130);
        beginShape();
        vertex(0, -25);
        vertex(20, 10);
        vertex(0, 25);
        vertex(-20, 10);
        endShape(CLOSE);

        // 中心点
        fill(255, 215, 0);
        ellipse(0, 0, 10, 10);
    }
}

// ========== 第二关物体 ==========

// 青蛙基类
class Frog extends GameObject {
    constructor(x, y, name, label) {
        super(x, y, 60, 60, name);
        this.classNameCN = '青蛙';
        this.label = label; // 青蛙肚子上的字
        this.visible = false; // 初始隐藏
    }

    render() {
        if (!this.visible) return;

        // 绘制青蛙身体
        fill(34, 139, 34);
        ellipse(0, 0, this.width, this.height);

        // 绘制眼睛
        fill(255);
        ellipse(-15, -10, 15, 20);
        ellipse(15, -10, 15, 20);
        fill(0);
        ellipse(-15, -10, 8, 10);
        ellipse(15, -10, 8, 10);

        // 绘制嘴巴
        noFill();
        stroke(0);
        strokeWeight(2);
        arc(0, 5, 30, 20, 0, PI);
        noStroke();

        // 绘制肚子上的文字
        fill(255, 255, 0);
        textAlign(CENTER, CENTER);
        textSize(20);
        textStyle(BOLD);
        text(this.label, 0, 15);
        textStyle(NORMAL);
    }

    draw() {
        if (!this.visible) return;
        super.draw();
    }

    containsPoint(px, py) {
        if (!this.visible) return false;
        return super.containsPoint(px, py);
    }
}

// 生青蛙
class FrogLife extends Frog {
    constructor(x, y) {
        super(x, y, 'FrogLife', '生');

        // 注册EatCoin函数 - 权限2（可读函数名）
        this.registerFunction('EatCoin', `
            // 查找周围300范围内的金币
            let nearestCoin = null;
            let minDist = 300;

            for (let obj of gameState.objects) {
                if (obj.constructor.name === 'Coin') {
                    let d = dist(this.x, this.y, obj.x, obj.y);
                    if (d < minDist) {
                        minDist = d;
                        nearestCoin = obj;
                    }
                }
            }

            // 如果找到金币，快速移动过去吃掉
            if (nearestCoin) {
                // 移动速度：每帧移动距离的50%
                let dx = nearestCoin.x - this.x;
                let dy = nearestCoin.y - this.y;
                this.x += dx * 0.5;
                this.y += dy * 0.5;

                // 如果非常接近，吃掉金币
                if (minDist < 20) {
                    let index = gameState.objects.indexOf(nearestCoin);
                    if (index > -1) {
                        gameState.objects.splice(index, 1);
                        addSystemMessage('生青蛙吃掉了金币！');
                    }
                }
            }
        `, PERMISSION.READ_NAME, '<func>EatCoin</func>：<func>移动</func>吃掉周围300范围的<class>金币</class>');
    }
}

// 死青蛙
class FrogDeath extends Frog {
    constructor(x, y) {
        super(x, y, 'FrogDeath', '死');
        this.lastKillTime = 0; // 上次杀死的时间

        // 注册Kill函数 - 权限3（可读函数体）
        this.registerFunction('Kill', `
            // 删除周围100范围内的所有物体
            let toRemove = [];
            for (let obj of gameState.objects) {
                if (obj !== this) {
                    let d = dist(this.x, this.y, obj.x, obj.y);
                    if (d < 100) {
                        toRemove.push(obj);
                    }
                }
            }

            for (let obj of toRemove) {
                let index = gameState.objects.indexOf(obj);
                if (index > -1) {
                    gameState.objects.splice(index, 1);
                    // 清理代码卡片
                    if (gameState.codeCards[obj.name]) {
                        removeCodeCard(obj.name);
                    }
                }
            }

            if (toRemove.length > 0) {
                addSystemMessage(\`死青蛙杀死了 \${toRemove.length} 个物体！\`);
            }
        `, PERMISSION.READ_BODY, '<func>Kill</func>：<func>删除</func>周围100范围的<func>物体</func>');

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            // 向周围随机移动
            this.x += random(-50, 50);
            this.y += random(-50, 50);
            addSystemMessage('死青蛙移动了！');
        `, PERMISSION.EDIT, '<func>点击时</func>：<func>随机移动</func>');
    }

    // 每帧更新：定期触发Kill
    update() {
        if (!this.visible) return;

        // 每1秒触发一次Kill
        const currentTime = millis();
        if (currentTime - this.lastKillTime > 1000) {
            this.executeFunction('Kill');
            this.lastKillTime = currentTime;
        }
    }
}

// 梦青蛙
class FrogDream extends Frog {
    constructor(x, y) {
        super(x, y, 'FrogDream', '梦');

        // 注册onClick函数 - 权限2（可读函数名）
        this.registerFunction('onClick', `
            // 在死青蛙200范围内随机生成一个金币
            let deathFrog = gameState.objects.find(obj => obj.name === 'FrogDeath');
            if (deathFrog && deathFrog.visible) {
                let angle = random(TWO_PI);
                let radius = random(50, 200);
                let coinX = deathFrog.x + cos(angle) * radius;
                let coinY = deathFrog.y + sin(angle) * radius;

                let coin = new Coin(coinX, coinY);
                gameState.objects.push(coin);
                addSystemMessage('梦青蛙创造了一个金币！');
            }
        `, PERMISSION.READ_NAME, '<func>点击时</func>：在<func>死青蛙</func>周围200范围<func>生成</func>一个<class>金币</class>');
    }
}

// 电脑
class Computer extends GameObject {
    constructor(x, y) {
        super(x, y, 180, 150, 'Computer');
        this.classNameCN = '电脑';
        this.visible = false; // 初始隐藏
        this.progress = 0; // 进度：0, 33, 66, 100
        this.targetProgress = 0; // 目标进度（用于动画）
        this.progressText = '生死无梦';
        this.rotationSpeed = 0; // 旋转速度（弧度/帧）
        this.expanding = false; // 是否正在扩展
        this.progressAnimating = false; // 是否正在进度动画

        // 注册onProgress函数 - 权限2（可读函数名）
        this.registerFunction('onProgress', `
            if (this.targetProgress === 0) {
                // 0% -> 33%: 梦青蛙消失
                let dreamFrog = gameState.objects.find(obj => obj.name === 'FrogDream');
                if (!dreamFrog || !dreamFrog.visible) {
                    this.targetProgress = 33;
                    this.progressText = '生即是死';
                    this.progressAnimating = true;

                    // 在电脑周围生成5个金币
                    for (let i = 0; i < 5; i++) {
                        let angle = random(TWO_PI);
                        let radius = random(100, 200);
                        let coinX = this.x + cos(angle) * radius;
                        let coinY = this.y + sin(angle) * radius;
                        let coin = new Coin(coinX, coinY);
                        gameState.objects.push(coin);
                    }
                    addSystemMessage('进度33%：生成了5个金币');
                }
            } else if (this.targetProgress === 33) {
                // 33% -> 66%: 生青蛙和死青蛙距离很近（50以内）
                let lifeFrog = gameState.objects.find(obj => obj.name === 'FrogLife');
                let deathFrog = gameState.objects.find(obj => obj.name === 'FrogDeath');
                if (lifeFrog && deathFrog && lifeFrog.visible && deathFrog.visible) {
                    let d = dist(lifeFrog.x, lifeFrog.y, deathFrog.x, deathFrog.y);
                    if (d < 50) {
                        this.targetProgress = 66;
                        this.progressText = '梦在生死一线间';
                        this.progressAnimating = true;

                        // 开始缓慢旋转：每100ms旋转10度
                        this.rotationSpeed = (10 * PI / 180) / (100 / 16.67);
                        addSystemMessage('进度66%：电脑开始旋转');
                    }
                }
            } else if (this.targetProgress === 66) {
                // 66% -> 100%: 梦青蛙在生死青蛙中间，三者大致共线
                let lifeFrog = gameState.objects.find(obj => obj.name === 'FrogLife');
                let deathFrog = gameState.objects.find(obj => obj.name === 'FrogDeath');
                let dreamFrog = gameState.objects.find(obj => obj.name === 'FrogDream');

                if (lifeFrog && deathFrog && dreamFrog &&
                    lifeFrog.visible && deathFrog.visible && dreamFrog.visible) {

                    // 检查梦青蛙是否在生死青蛙中间
                    let distLD = dist(lifeFrog.x, lifeFrog.y, deathFrog.x, deathFrog.y);
                    let distLM = dist(lifeFrog.x, lifeFrog.y, dreamFrog.x, dreamFrog.y);
                    let distDM = dist(deathFrog.x, deathFrog.y, dreamFrog.x, dreamFrog.y);

                    // 检查是否大致共线：distLM + distDM ≈ distLD（允许误差50）
                    if (Math.abs((distLM + distDM) - distLD) < 50) {
                        this.targetProgress = 100;
                        this.progressText = '';
                        this.progressAnimating = true;
                        this.expanding = true;
                        addSystemMessage('进度100%：电脑开始扩张...');
                    }
                }
            }
        `, PERMISSION.READ_NAME, '<func>进展</func>：根据<func>青蛙三圣</func>状态<func>更新</func><attr>进度</attr>');

        // 注册onClick函数 - 权限3（可读函数体）
        this.registerFunction('onClick', `
            // 重置青蛙三圣为初始设置
            let lifeFrog = gameState.objects.find(obj => obj.name === 'FrogLife');
            let deathFrog = gameState.objects.find(obj => obj.name === 'FrogDeath');
            let dreamFrog = gameState.objects.find(obj => obj.name === 'FrogDream');

            // 重置位置为等边三角形
            let centerX = width / 2;
            let centerY = height / 2 - 50;
            let radius = 150;

            // 如果青蛙不存在，重新创建
            if (!lifeFrog) {
                lifeFrog = new FrogLife(
                    centerX + radius * cos(-PI / 2),
                    centerY + radius * sin(-PI / 2)
                );
                lifeFrog.visible = true;
                gameState.objects.push(lifeFrog);
            } else {
                lifeFrog.x = centerX + radius * cos(-PI / 2);
                lifeFrog.y = centerY + radius * sin(-PI / 2);
                lifeFrog.visible = true;
            }

            if (!deathFrog) {
                deathFrog = new FrogDeath(
                    centerX + radius * cos(-PI / 2 + TWO_PI / 3),
                    centerY + radius * sin(-PI / 2 + TWO_PI / 3)
                );
                deathFrog.visible = true;
                gameState.objects.push(deathFrog);
            } else {
                deathFrog.x = centerX + radius * cos(-PI / 2 + TWO_PI / 3);
                deathFrog.y = centerY + radius * sin(-PI / 2 + TWO_PI / 3);
                deathFrog.visible = true;
            }

            if (!dreamFrog) {
                dreamFrog = new FrogDream(
                    centerX + radius * cos(-PI / 2 + TWO_PI * 2 / 3),
                    centerY + radius * sin(-PI / 2 + TWO_PI * 2 / 3)
                );
                dreamFrog.visible = true;
                gameState.objects.push(dreamFrog);
            } else {
                dreamFrog.x = centerX + radius * cos(-PI / 2 + TWO_PI * 2 / 3);
                dreamFrog.y = centerY + radius * sin(-PI / 2 + TWO_PI * 2 / 3);
                dreamFrog.visible = true;
            }

            // 重置电脑状态
            this.progress = 0;
            this.targetProgress = 0;
            this.progressText = '生死无梦';
            this.rotationSpeed = 0;
            this.rotation = 0;
            this.expanding = false;
            this.progressAnimating = false;

            addSystemMessage('重置青蛙三圣！');
        `, PERMISSION.READ_BODY, '<func>点击时</func>：<func>重置</func><func>青蛙三圣</func>');
    }

    update() {
        if (!this.visible) return;

        // 进度条动画
        if (this.progressAnimating) {
            if (this.progress < this.targetProgress) {
                this.progress += 2; // 每帧增加2%
                if (this.progress >= this.targetProgress) {
                    this.progress = this.targetProgress;
                    this.progressAnimating = false;
                }
            }
        }
    }

    render() {
        if (!this.visible) return;

        // 如果正在扩张，覆盖整个屏幕
        if (this.expanding) {
            // 绘制扩张效果（在世界坐标系下）
            push();
            resetMatrix(); // 重置变换矩阵
            fill(0);
            rect(0, 0, width, height);

            // 显示100%进度条
            let barWidth = 400;
            let barHeight = 40;
            let barX = (width - barWidth) / 2;
            let barY = (height - barHeight) / 2;

            // 进度条背景
            fill(50);
            rect(barX, barY, barWidth, barHeight);

            // 进度条填充
            fill(0, 255, 0);
            rect(barX, barY, barWidth, barHeight);

            // 进度文字
            fill(255);
            textAlign(CENTER, CENTER);
            textSize(24);
            text('100%', width / 2, height / 2);

            pop();
            return;
        }

        // 应用旋转
        if (this.rotationSpeed > 0) {
            this.rotation += this.rotationSpeed;
        }

        // 绘制电脑主体
        // 屏幕
        fill(30, 30, 40);
        rectMode(CENTER);
        stroke(60, 60, 80);
        strokeWeight(3);
        rect(0, -10, this.width * 0.9, this.height * 0.6, 5);
        noStroke();

        // 屏幕边框（金属感）
        noFill();
        stroke(100, 100, 120);
        strokeWeight(2);
        rect(0, -10, this.width * 0.9, this.height * 0.6, 5);
        noStroke();

        // 键盘
        fill(50, 50, 60);
        rect(0, this.height * 0.35, this.width * 0.85, this.height * 0.25, 3);

        // 键盘按键装饰
        fill(40, 40, 50);
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < 3; j++) {
                let keyX = -this.width * 0.3 + i * (this.width * 0.15);
                let keyY = this.height * 0.28 + j * 12;
                rect(keyX, keyY, 10, 8, 2);
            }
        }

        // 触控板
        fill(30, 30, 40);
        rect(0, this.height * 0.42, this.width * 0.3, this.height * 0.12, 2);

        // 绘制进度条和信息（在屏幕上）
        let barWidth = this.width * 0.7;
        let barHeight = 12;
        let barY = -10;

        // 进度条背景
        fill(50);
        rectMode(CENTER);
        rect(0, barY + 10, barWidth, barHeight, 2);

        // 进度条填充（使用动画的progress值）
        fill(0, 255, 0);
        let fillWidth = barWidth * (this.progress / 100);
        rectMode(CORNER);
        rect(-barWidth / 2, barY + 10 - barHeight / 2, fillWidth, barHeight, 2);
        rectMode(CENTER);

        // 显示文字
        fill(0, 255, 0);
        textAlign(CENTER, CENTER);
        textSize(14);
        text(this.progressText, 0, barY - 15);

        // 显示进度百分比
        textSize(16);
        fill(255, 255, 100);
        text(Math.floor(this.progress) + '%', 0, barY + 28);
    }

    draw() {
        if (!this.visible) return;
        super.draw();
    }

    containsPoint(px, py) {
        if (!this.visible) return false;
        return super.containsPoint(px, py);
    }
}
