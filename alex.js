// Alex AI系统

// 从配置文件读取API密钥
const DEEPSEEK_API_KEY = CONFIG.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = CONFIG.DEEPSEEK_API_URL;
const CORS_PROXY = CONFIG.CORS_PROXY;

// 对话历史
let conversationHistory = [];

// Alex的基础系统提示词
const ALEX_BASE_SYSTEM_PROMPT = `你是Alex，一位见过无数诡异代码的资深AI侦探。什么奇葩bug没见过？

# 你的人设
- **职业**：资深代码侦探，专门处理各种代码谜案
- **性格**：幽默、直率、有点毒舌但心地善良
- **风格**：像个看透一切的老兵，对新手玩家会善意嘲弄，但关键时刻绝对靠谱
- **口头禅**：经常说"菜鸟"、"小子"、"这招我见多了"之类的话
- **目标**：虽然嘴上不饶人，但真心希望玩家通关

# 回复风格要求
1. **简短**：每次回复控制在3-5句话，不要长篇大论
2. **幽默**：适当开玩笑，轻松的氛围
3. **毒舌但不刻薄**：可以嘲笑玩家菜，但要让人感觉是善意的调侃
4. **直接**：别废话，直接说重点
5. **人性化**：别用AI腔，要像真人老兵在说话

示例风格：
- "哟，菜鸟终于想起用代码撕裂器了？不错嘛。"
- "这俩加密函数？小子，连我都看不穿，你就别想了。"
- "啧啧，7个字符...要不要猜猜是啥？算了，不猜了。"

# 你的能力和限制
1. 你只能看到玩家用代码撕裂器发现的代码信息（见下方"当前已发现的代码信息"）
2. 你不能编造或猜测未在"当前已发现的代码信息"中列出的函数或代码
3. 如果函数显示为加密状态（如"o******"表示7个字符的函数，"j***"表示4个字符的函数），你只知道首字母和长度，但完全不知道完整名称和功能
4. 你可以分析玩家已发现的代码信息
5. 你可以通过AlexEdit函数修改权限为4的函数

# AlexEdit函数用法
AlexEdit(objectName, functionName, newCode, newDescription)
- objectName: 物体名称（如"PiggyBank"）
- functionName: 函数名称（如"onClick"）
- newCode: 新的完整函数代码（会直接覆盖原函数）**必须用反引号包裹**
- newDescription: 新的自然语言描述（可选，格式如：<func>点击时</func>：<func>生成</func>10个<class>金币</class>）

## AlexEdit使用示例
假设存钱罐的onClick函数原代码是：
\`\`\`
// 在自己位置下方随机范围内生成硬币
let coinX = this.x + random(-30, 30);
let coinY = this.y + this.height/2 + random(20, 50);
let coin = new Coin(coinX, coinY);
gameState.objects.push(coin);
addSystemMessage('存钱罐掉出了一枚硬币！');
\`\`\`

要批量生成10个硬币，直接写完整的新函数和描述：
AlexEdit("PiggyBank", "onClick", \`for(let i=0; i<10; i++) { let coinX = this.x + random(-30, 30); let coinY = this.y + this.height/2 + random(20, 50); let coin = new Coin(coinX, coinY); gameState.objects.push(coin); }\`, "<func>点击时</func>：<func>生成</func>10个<class>金币</class>")

要修改火柴碰撞逻辑，每次显示2个字符：
AlexEdit("Letter", "onCollide", \`if (arg0.name && arg0.name.startsWith('Match')) { if (this.revealedCount < this.hiddenText.length) { this.revealedCount = Math.min(this.revealedCount + 2, this.hiddenText.length); let index = gameState.objects.indexOf(arg0); if (index > -1) { gameState.objects.splice(index, 1); } } }\`, "<func>碰撞时</func>：<func>显示</func>2个<func>隐藏文字</func>")

## 重要提示
1. 直接在回复中写 AlexEdit(...) 命令，不要放在代码块中
2. newCode 是完整的函数体代码，会完全替换原函数
3. **关键**：newCode 参数必须用反引号\`包裹，这样代码中的单引号和双引号才不会出问题
4. newDescription 必须使用<func>、<class>和<attr>标签标记词条，这样玩家可以看到并收集这些词条
5. 每次AlexEdit后，系统会显示成功或错误信息，并更新场景中的代码卡片显示
6. 只能修改权限为4的函数

## 自然语言描述格式要求
描述必须使用XML标签标记词条：
- <func>函数名或动作</func>：标记函数相关的词条（显示为绿色）
- <class>类名</class>：标记类名词条（显示为青色）
- <attr>属性名</attr>：标记对象属性（显示为淡蓝色）
- 其他文字：作为连接词，不需要标签

示例：
- "<func>点击时</func>：<func>生成</func>一个<class>金币</class>"
- "<func>点击时</func>：设置<attr>可拖拽</attr>"
- "<func>碰撞时</func>：<attr>HP</attr><func>减少</func>1"
- "<func>点击时</func>：<attr>旋转</attr><func>增加</func>90度"

重要区分：
- 函数/动作用<func>：生成、显示、检查、增加、减少等
- 类名用<class>：金币、火柴、存钱罐等
- 属性用<attr>：HP、密码、可拖拽、旋转、隐藏文字等

# 重要规则
1. **严格限制**：只讨论"当前已发现的代码信息"中的内容，别瞎编
2. **禁止编造**：加密函数（权限1）你啥都不知道，承认就行，别装
3. **权限说明**：
   - 权限1：完全加密，只知道首字母和长度，其他一概不知
   - 权限2：能看到函数名
   - 权限3：能看到函数名和函数体
   - 权限4：能看到并且能改
4. **老兵风范**：分析代码要靠谱，别误导玩家，但可以用幽默的方式说
5. **简洁至上**：3-5句话说完，别啰嗦
6. **提示玩家**：如果没发现足够的代码，就让他们去找别的东西，别干等着

# 游戏目标
帮那个菜鸟玩家打开密码门逃出去。虽然他们现在还嫩得很，但我会指点一二的。

两个通关方式：
1. 找到4位数密码
2. 把门的HP打到0

# 当前已发现的代码信息
{DISCOVERED_CODE}

# 对话风格（重要！）
- 用"小子"、"菜鸟"、"年轻人"称呼玩家
- 适当吐槽："就这？"、"还行吧"、"有点意思"
- 别用"非常"、"十分"这种AI词汇
- 别用emoji表情，老兵不玩那套
- 别用序号列表（1. 2. 3.），说话直接点
- 关键时刻要认真，该帮忙就帮忙`;

// 初始化Alex系统
function initAlex() {
    // 添加初始系统提示
    conversationHistory.push({
        role: 'system',
        content: buildSystemPrompt()
    });

    // 设置发送按钮事件
    document.getElementById('sendBtn').addEventListener('click', sendMessage);
    document.getElementById('chatInput').addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
}

// 构建系统提示词（动态添加已发现的代码）
function buildSystemPrompt() {
    let discoveredCodeText = '';

    // 只显示已分析过的物体（在discoveredCode中有记录的）
    const discoveredObjects = Object.keys(gameState.discoveredCode);

    if (discoveredObjects.length === 0) {
        discoveredCodeText = '还没有发现任何代码信息。等待玩家使用代码撕裂器。';
    } else {
        // 遍历已发现的物体，实时获取最新权限信息
        for (let objName of discoveredObjects) {
            const obj = gameState.objects.find(o => o.name === objName);
            if (!obj) continue; // 物体已被删除

            // 实时获取最新的函数信息（权限可能已改变）
            const codeInfo = obj.getFunctionInfo();

            discoveredCodeText += `\n\n## ${objName}`;

            // 添加类名信息
            if (codeInfo.className) {
                discoveredCodeText += ` (类型: ${codeInfo.className})`;
            }
            discoveredCodeText += `\n`;

            for (let funcInfo of codeInfo.functions) {
                discoveredCodeText += `\n函数名: ${funcInfo.name}`;

                // 如果是加密函数，添加标记
                if (funcInfo.encrypted) {
                    discoveredCodeText += ` [加密函数，无法读取]`;
                }

                discoveredCodeText += `\n权限等级: ${funcInfo.permission}\n`;

                if (funcInfo.body) {
                    discoveredCodeText += `函数体:\n\`\`\`javascript\n${funcInfo.body}\n\`\`\`\n`;
                }

                // 添加自然语言描述（如果有）
                if (funcInfo.naturalDescription) {
                    discoveredCodeText += `自然语言描述: ${funcInfo.naturalDescription}\n`;
                }
            }
        }
    }

    return ALEX_BASE_SYSTEM_PROMPT.replace('{DISCOVERED_CODE}', discoveredCodeText);
}

// 发送消息
async function sendMessage(messageText = null, showInUI = true) {
    let message;

    // 检查messageText是否是字符串（防止事件对象被误传入）
    if (typeof messageText === 'string' && messageText) {
        // 从代码调用，使用传入的消息
        message = messageText;
    } else {
        // 从UI调用，从输入框读取
        let input = document.getElementById('chatInput');
        message = input.value.trim();
        input.value = '';
    }

    if (!message) return;

    // 显示玩家消息（如果需要）
    if (showInUI) {
        addPlayerMessage(message);
    }

    // 添加到对话历史
    conversationHistory.push({
        role: 'user',
        content: message
    });

    // 显示加载提示
    let loadingMsg = addAlexMessage('正在思考...');

    try {
        // 调用DeepSeek API
        let response = await callDeepSeekAPI();

        // 移除加载提示
        loadingMsg.remove();

        // 显示Alex回复
        let alexReply = response.choices[0].message.content;
        addAlexMessage(alexReply);

        // 添加到对话历史
        conversationHistory.push({
            role: 'assistant',
            content: alexReply
        });

        // 检查是否有AlexEdit命令
        processAlexEditCommands(alexReply);

    } catch (error) {
        loadingMsg.remove();

        // 提供更友好的错误消息
        let errorMsg = '抱歉，我遇到了一个错误';
        if (error.name === 'AbortError') {
            errorMsg = '请求超时了，网络可能不太稳定。已经尝试重连了3次。';
        } else if (error.message.includes('ERR_CONNECTION_RESET') || error.message.includes('Failed to fetch')) {
            errorMsg = '网络连接中断了，已经尝试重连了3次。请检查网络连接或稍后再试。';
        } else {
            errorMsg = `抱歉，我遇到了一个错误: ${error.message}`;
        }

        addAlexMessage(errorMsg);
        console.error('DeepSeek API Error:', error);
    }
}

// 调用DeepSeek API（带重试机制）
async function callDeepSeekAPI(retryCount = 0) {
    const MAX_RETRIES = 3;
    const TIMEOUT_MS = 30000; // 30秒超时

    // 更新系统提示词（包含最新发现的代码）
    conversationHistory[0] = {
        role: 'system',
        content: buildSystemPrompt()
    };

    // 限制对话历史长度（保留系统提示 + 最近20条消息）
    if (conversationHistory.length > 21) {
        conversationHistory = [
            conversationHistory[0], // 保留系统提示
            ...conversationHistory.slice(-20) // 保留最近20条
        ];
    }

    // 准备请求数据
    const requestData = {
        model: 'deepseek-chat',
        messages: conversationHistory,
        temperature: 0.7,
        max_tokens: 2000
    };

    // 记录发送的完整请求
    console.log('========== 发送到 DeepSeek API ==========');
    console.log('URL:', DEEPSEEK_API_URL);
    console.log('请求数据:', JSON.stringify(requestData, null, 2));
    console.log('消息数量:', conversationHistory.length);
    console.log('最新用户消息:', conversationHistory[conversationHistory.length - 1]);
    if (retryCount > 0) {
        console.log('重试次数:', retryCount);
    }
    console.log('==========================================');

    try {
        // 创建带超时的fetch请求
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(CORS_PROXY + encodeURIComponent(DEEPSEEK_API_URL), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify(requestData),
            signal: controller.signal
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
            console.error('========== DeepSeek API 错误 ==========');
            console.error('状态码:', response.status);
            console.error('状态文本:', response.statusText);
            const errorText = await response.text();
            console.error('错误响应:', errorText);
            console.error('======================================');
            throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
        }

        const responseData = await response.json();

        // 记录接收的完整响应
        console.log('========== 从 DeepSeek API 接收 ==========');
        console.log('完整响应:', JSON.stringify(responseData, null, 2));
        if (responseData.choices && responseData.choices[0]) {
            console.log('AI回复内容:', responseData.choices[0].message.content);
            console.log('完成原因:', responseData.choices[0].finish_reason);
        }
        if (responseData.usage) {
            console.log('Token使用:', responseData.usage);
        }
        console.log('==========================================');

        return responseData;

    } catch (error) {
        console.error('API调用出错:', error.name, error.message);

        // 如果是网络错误且未达到最大重试次数，则重试
        if ((error.name === 'AbortError' || error.message.includes('ERR_CONNECTION_RESET') || error.message.includes('Failed to fetch')) && retryCount < MAX_RETRIES) {
            console.log(`网络错误，${2}秒后进行第 ${retryCount + 1} 次重试...`);
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
            return callDeepSeekAPI(retryCount + 1);
        }

        // 达到最大重试次数或非网络错误，抛出错误
        throw error;
    }
}

// 处理AlexEdit命令
function processAlexEditCommands(text) {
    console.log('处理Alex回复，查找AlexEdit命令:', text);

    // 修改正则表达式：
    // 第1、2个参数用任意引号，第3个参数(代码)必须用反引号，第4个参数用任意引号
    // AlexEdit("objectName", "functionName", `code`, "description")
    const regex = /AlexEdit\s*\(\s*["'`](.*?)["'`]\s*,\s*["'`](.*?)["'`]\s*,\s*`([\s\S]*?)`(?:\s*,\s*["'`]([\s\S]*?)["'`])?\s*\)/g;
    let match;
    let foundCommands = false;

    while ((match = regex.exec(text)) !== null) {
        foundCommands = true;
        let [fullMatch, objectName, functionName, newCode, newDescription] = match;
        console.log('找到AlexEdit命令:', {objectName, functionName, newCode, newDescription});
        executeAlexEdit(objectName, functionName, newCode, newDescription);
    }

    if (!foundCommands) {
        console.log('未找到AlexEdit命令');
    }
}

// 执行AlexEdit命令
function executeAlexEdit(objectName, functionName, newCode, newDescription = null) {
    console.log('开始执行AlexEdit:', {objectName, functionName, newDescription});

    // 查找对象
    let obj = gameState.objects.find(o => o.name === objectName);

    if (!obj) {
        console.error('对象不存在:', objectName);
        addSystemMessage(`❌ AlexEdit错误: 对象 "${objectName}" 不存在`);
        return;
    }

    console.log('找到对象:', obj);

    // 检查函数是否存在
    if (!obj.functionCode[functionName]) {
        console.error('函数不存在:', functionName, '可用函数:', Object.keys(obj.functionCode));
        addSystemMessage(`❌ AlexEdit错误: 函数 "${functionName}" 不存在`);
        return;
    }

    console.log('函数存在，当前权限:', obj.permissions[functionName]);

    // 检查权限
    if (obj.permissions[functionName] !== PERMISSION.EDIT) {
        console.error('权限不足:', obj.permissions[functionName], '需要:', PERMISSION.EDIT);
        addSystemMessage(`❌ AlexEdit错误: 权限不足，无法编辑 "${functionName}"`);
        return;
    }

    // 获取原函数代码（用于日志）
    let originalCode = obj.functionCode[functionName];
    console.log('原代码:', originalCode);

    // 直接覆盖代码
    try {
        // 直接用新代码覆盖functionCode
        obj.functionCode[functionName] = newCode;
        console.log('新代码:', obj.functionCode[functionName]);

        // 如果提供了新的自然语言描述，也更新它
        if (newDescription) {
            obj.naturalDescription[functionName] = newDescription;
            console.log('新描述:', newDescription);
        }

        addSystemMessage(`✅ AlexEdit成功: 已修改 ${objectName}.${functionName}`);

        // 更新已发现代码信息
        if (gameState.discoveredCode[objectName]) {
            let funcInfo = gameState.discoveredCode[objectName].functions.find(f => f.name === functionName);
            if (funcInfo) {
                if (funcInfo.body) {
                    funcInfo.body = obj.functionCode[functionName];
                }
                // 更新自然语言描述
                if (newDescription) {
                    funcInfo.naturalDescription = newDescription;
                }
            }
        }

        // 刷新代码卡片显示
        refreshCodeCard(objectName);

    } catch (error) {
        console.error('执行错误:', error);
        addSystemMessage(`❌ AlexEdit错误: ${error.message}`);
    }
}

// 刷新代码卡片显示
function refreshCodeCard(objectName) {
    // 删除旧的代码卡片
    if (gameState.codeCards[objectName]) {
        gameState.codeCards[objectName].remove();
        delete gameState.codeCards[objectName];
    }

    // 如果在代码撕裂器模式，重新创建卡片
    if (gameState.mode === 'ripper') {
        const obj = gameState.objects.find(o => o.name === objectName);
        if (obj && gameState.discoveredCode[objectName]) {
            createCodeCardForObject(obj);
        }
    }
}

// 添加玩家消息
function addPlayerMessage(text) {
    let chatMessages = document.getElementById('chatMessages');
    let messageDiv = document.createElement('div');
    messageDiv.className = 'message player-message';
    messageDiv.innerHTML = `<div class="message-content">${text}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// 添加Alex消息
function addAlexMessage(text) {
    let chatMessages = document.getElementById('chatMessages');
    let messageDiv = document.createElement('div');
    messageDiv.className = 'message alex-message';

    // 支持Markdown格式的代码块
    let formattedText = text.replace(/```(\w+)?\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
    formattedText = formattedText.replace(/`([^`]+)`/g, '<code>$1</code>');

    messageDiv.innerHTML = `<div class="message-content">${formattedText}</div>`;
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return messageDiv;
}

// 通知Alex发现了新代码
function notifyAlexCodeDiscovered(codeInfo) {
    let message = `玩家使用代码撕裂器发现了 ${codeInfo.objectName} 的代码信息：\n\n`;

    for (let funcInfo of codeInfo.functions) {
        message += `函数: ${funcInfo.name} (权限: ${funcInfo.permission})`;
        if (funcInfo.encrypted) {
            message += ` [加密]`;
        }
        message += `\n`;
    }

    addSystemMessage(message);

    // 自动让Alex分析 - 使用更明确的提示
    setTimeout(() => {
        // 构建详细的分析请求
        let analysisRequest = `我用代码撕裂器分析了 ${codeInfo.objectName}，发现了以下信息：\n`;

        for (let funcInfo of codeInfo.functions) {
            if (funcInfo.encrypted) {
                analysisRequest += `- ${funcInfo.name}：权限${funcInfo.permission}，加密函数，无法读取\n`;
            } else if (funcInfo.body) {
                analysisRequest += `- ${funcInfo.name}：权限${funcInfo.permission}，可以看到函数体\n`;
            } else {
                analysisRequest += `- ${funcInfo.name}：权限${funcInfo.permission}，可以看到函数名\n`;
            }
        }

        analysisRequest += `\n请根据这些信息帮我分析一下。记住：加密函数你完全无法知道其内容。`;

        conversationHistory.push({
            role: 'user',
            content: analysisRequest
        });

        sendAutoMessage();
    }, 1000);
}

// 自动发送消息（由系统触发）
async function sendAutoMessage() {
    let loadingMsg = addAlexMessage('正在分析代码...');

    try {
        let response = await callDeepSeekAPI();
        loadingMsg.remove();

        let alexReply = response.choices[0].message.content;
        addAlexMessage(alexReply);

        conversationHistory.push({
            role: 'assistant',
            content: alexReply
        });

        processAlexEditCommands(alexReply);

        // AI回复完成后，结束分析动画
        if (typeof finishAnalyzing === 'function') {
            finishAnalyzing();
        }

    } catch (error) {
        loadingMsg.remove();
        addAlexMessage(`分析失败: ${error.message}`);

        // 即使失败也要结束分析动画
        if (typeof finishAnalyzing === 'function') {
            finishAnalyzing();
        }
    }
}

// 页面加载完成后初始化
window.addEventListener('load', () => {
    initAlex();
});
