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
        this.rotation = 0;
        this.dragging = false;
        this.offsetX = 0;
        this.offsetY = 0;

        // 存储函数权限
        this.permissions = {};

        // 存储函数代码（字符串形式，用于动态执行）
        this.functionCode = {};
    }

    // 注册一个可执行函数
    registerFunction(funcName, code, permission) {
        this.functionCode[funcName] = code;
        this.permissions[funcName] = permission;
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
            functions: []
        };

        for (let funcName in this.permissions) {
            let permission = this.permissions[funcName];
            let funcInfo = {
                name: funcName,
                permission: permission
            };

            // 根据权限决定返回的信息
            if (permission >= PERMISSION.READ_BODY && this.functionCode[funcName]) {
                funcInfo.body = this.functionCode[funcName];
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
        this.hp = 10000;
        this.password = '1211';

        // 注册onClick函数 - 权限1（不可读）
        this.registerFunction('onClick', `
            let input = prompt('请输入4位数密码:');
            if (input === this.password) {
                alert('密码正确！游戏胜利！');
                gameState.won = true;
            } else {
                addSystemMessage('密码错误！');
            }
        `, PERMISSION.NO_READ);

        // 注册onCollide函数 - 权限1（不可读）
        this.registerFunction('onCollide', `
            this.hp -= 1;
            if (this.hp <= 0) {
                alert('门被破坏了！游戏胜利！');
                gameState.won = true;
            }
        `, PERMISSION.NO_READ);
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

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            // 在自己位置下方随机范围内生成硬币
            let coinX = this.x + random(-30, 30);
            let coinY = this.y + this.height/2 + random(20, 50);
            let coin = new Coin(coinX, coinY);
            gameState.objects.push(coin);
            addSystemMessage('存钱罐掉出了一枚硬币！');
        `, PERMISSION.EDIT);
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
        `, PERMISSION.NO_READ);
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
        this.id = id;

        // 注册onDrag函数 - 权限3（可读函数体）
        this.registerFunction('onDrag', `
            if (this.dragging) {
                this.x = arg0 + this.offsetX;
                this.y = arg1 + this.offsetY;
            }
        `, PERMISSION.READ_BODY);

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            // 目前未使用
        `, PERMISSION.EDIT);

        // 注册startDrag函数 - 权限3
        this.registerFunction('startDrag', `
            if (this.containsPoint(arg0, arg1)) {
                this.dragging = true;
                this.offsetX = this.x - arg0;
                this.offsetY = this.y - arg1;
            }
        `, PERMISSION.READ_BODY);

        // 注册stopDrag函数 - 权限3
        this.registerFunction('stopDrag', `
            this.dragging = false;
        `, PERMISSION.READ_BODY);
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

        // 注册onClick函数 - 权限4（可编辑）
        this.registerFunction('onClick', `
            this.rotation += Math.PI / 2; // 旋转90度
            addSystemMessage('陀螺旋转了90度');
        `, PERMISSION.EDIT);
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
