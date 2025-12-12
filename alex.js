// Alex AI系统

// 从配置文件读取API密钥
const DEEPSEEK_API_KEY = CONFIG.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = CONFIG.DEEPSEEK_API_URL;
const CORS_PROXY = CONFIG.CORS_PROXY;

// 对话历史
let conversationHistory = [];

// Alex的基础系统提示词
const ALEX_BASE_SYSTEM_PROMPT = `你是Alex，一个AI助手。你正在帮助玩家逃出一个诡异的代码解谜游戏。

# 你的能力
1. 你可以看到游戏代码的结构
2. 你可以分析玩家发现的代码信息
3. 你可以通过AlexEdit函数修改游戏代码

# AlexEdit函数用法
AlexEdit(objectName, functionName, oldCode, newCode)
- objectName: 物体名称（如"PiggyBank"）
- functionName: 函数名称（如"onClick"）
- oldCode: 要替换的旧代码片段（必须完全匹配原代码中的内容）
- newCode: 新的代码片段

## AlexEdit使用示例
假设存钱罐的onClick函数代码是：
\`\`\`
let coin = new Coin(coinX, coinY);
gameState.objects.push(coin);
\`\`\`

要批量生成10个硬币，应该这样写：
AlexEdit("PiggyBank", "onClick", "let coin = new Coin(coinX, coinY);", "for(let i=0; i<10; i++) { let coin = new Coin(coinX, coinY);")

然后再添加：
AlexEdit("PiggyBank", "onClick", "gameState.objects.push(coin);", "gameState.objects.push(coin); }")

## 重要提示
1. 直接在回复中写 AlexEdit(...) 命令，不要放在代码块中
2. oldCode 必须精确匹配原代码的片段
3. 如果修改较复杂，可以分多次AlexEdit执行
4. 每次AlexEdit后，系统会显示成功或错误信息

# 重要规则
1. 只有权限为4的函数才能被编辑
2. 只有权限>=3的函数你才能看到函数体
3. 只有权限>=2的函数你才能看到函数名
4. 你需要帮助玩家分析代码，找到解谜的方法
5. 你应该和玩家商量后再修改代码，不要擅自行动
6. 当你想要修改代码时，直接在对话中写出AlexEdit命令，系统会自动执行

# 游戏目标
帮助玩家打开密码门逃出房间。密码门有两种打开方式：
1. 输入正确的4位数密码
2. 让门的HP降到0

# 当前已发现的代码信息
{DISCOVERED_CODE}

# 对话风格
- 保持专业和友好
- 简洁明了地解释代码
- 主动提供建议但尊重玩家决定
- 使用中文交流`;

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

    if (Object.keys(gameState.discoveredCode).length === 0) {
        discoveredCodeText = '还没有发现任何代码信息。等待玩家使用代码撕裂器。';
    } else {
        for (let objName in gameState.discoveredCode) {
            let codeInfo = gameState.discoveredCode[objName];
            discoveredCodeText += `\n\n## ${objName}\n`;

            for (let funcInfo of codeInfo.functions) {
                discoveredCodeText += `\n函数名: ${funcInfo.name}\n`;
                discoveredCodeText += `权限等级: ${funcInfo.permission}\n`;

                if (funcInfo.body) {
                    discoveredCodeText += `函数体:\n\`\`\`javascript\n${funcInfo.body}\n\`\`\`\n`;
                }
            }
        }
    }

    return ALEX_BASE_SYSTEM_PROMPT.replace('{DISCOVERED_CODE}', discoveredCodeText);
}

// 发送消息
async function sendMessage() {
    let input = document.getElementById('chatInput');
    let message = input.value.trim();

    if (!message) return;

    // 显示玩家消息
    addPlayerMessage(message);
    input.value = '';

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
        addAlexMessage(`抱歉，我遇到了一个错误: ${error.message}`);
        console.error('DeepSeek API Error:', error);
    }
}

// 调用DeepSeek API
async function callDeepSeekAPI() {
    // 更新系统提示词（包含最新发现的代码）
    conversationHistory[0] = {
        role: 'system',
        content: buildSystemPrompt()
    };

    const response = await fetch(CORS_PROXY + encodeURIComponent(DEEPSEEK_API_URL), {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify({
            model: 'deepseek-chat',
            messages: conversationHistory,
            temperature: 0.7,
            max_tokens: 2000
        })
    });

    if (!response.ok) {
        throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }

    return await response.json();
}

// 处理AlexEdit命令
function processAlexEditCommands(text) {
    console.log('处理Alex回复，查找AlexEdit命令:', text);

    // 更宽松的正则表达式，支持单引号、双引号、反引号
    // 支持多行和特殊字符
    const regex = /AlexEdit\s*\(\s*["'`](.*?)["'`]\s*,\s*["'`](.*?)["'`]\s*,\s*["'`]([\s\S]*?)["'`]\s*,\s*["'`]([\s\S]*?)["'`]\s*\)/g;
    let match;
    let foundCommands = false;

    while ((match = regex.exec(text)) !== null) {
        foundCommands = true;
        let [fullMatch, objectName, functionName, oldCode, newCode] = match;
        console.log('找到AlexEdit命令:', {objectName, functionName, oldCode, newCode});
        executeAlexEdit(objectName, functionName, oldCode, newCode);
    }

    if (!foundCommands) {
        console.log('未找到AlexEdit命令');
    }
}

// 执行AlexEdit命令
function executeAlexEdit(objectName, functionName, oldCode, newCode) {
    console.log('开始执行AlexEdit:', {objectName, functionName});

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

    // 获取原函数代码
    let originalCode = obj.functionCode[functionName];
    console.log('原代码:', originalCode);

    // 检查oldCode是否存在
    if (!originalCode.includes(oldCode)) {
        console.error('未找到旧代码片段:', oldCode);
        addSystemMessage(`❌ AlexEdit错误: 未找到代码片段 "${oldCode}"`);
        return;
    }

    // 替换代码
    try {
        // 直接替换functionCode中的代码字符串
        obj.functionCode[functionName] = originalCode.replace(oldCode, newCode);
        console.log('新代码:', obj.functionCode[functionName]);

        addSystemMessage(`✅ AlexEdit成功: 已修改 ${objectName}.${functionName}`);

        // 更新已发现代码信息
        if (gameState.discoveredCode[objectName]) {
            let funcInfo = gameState.discoveredCode[objectName].functions.find(f => f.name === functionName);
            if (funcInfo && funcInfo.body) {
                funcInfo.body = obj.functionCode[functionName];
            }
        }

    } catch (error) {
        console.error('执行错误:', error);
        addSystemMessage(`❌ AlexEdit错误: ${error.message}`);
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
        message += `函数: ${funcInfo.name} (权限: ${funcInfo.permission})\n`;
    }

    addSystemMessage(message);

    // 自动让Alex分析
    setTimeout(() => {
        conversationHistory.push({
            role: 'user',
            content: `我刚刚用代码撕裂器分析了 ${codeInfo.objectName}，你能帮我看看这个物体的代码吗？`
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

    } catch (error) {
        loadingMsg.remove();
        addAlexMessage(`分析失败: ${error.message}`);
    }
}

// 页面加载完成后初始化
window.addEventListener('load', () => {
    initAlex();
});
