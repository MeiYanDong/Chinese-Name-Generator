const http = require('http');
const https = require('https');

const server = http.createServer((req, res) => {
    // 设置CORS头
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 处理OPTIONS请求
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // 只处理/generate-names的POST请求
    if (req.method === 'POST' && req.url === '/generate-names') {
        let body = '';

        req.on('data', chunk => {
            body += chunk.toString();
        });

        req.on('end', () => {
            try {
                const { englishName } = JSON.parse(body);
                const prompt = `作为一个专业的中文取名专家，请为外国人"${englishName}"创造3个有趣且富有文化内涵的中文名字。每个名字都应该：
1. 体现中国传统文化特色
2. 包含一些巧妙的谐音或双关语
3. 考虑英文名的含义和特点
4. 名字要朗朗上口

请按以下格式返回结果（不要包含序号）：
{
    "names": [
        {
            "chinese": "中文名",
            "chineseMeaning": "中文含义解释",
            "englishMeaning": "English meaning and cultural significance"
        }
    ]
}`;

                const postData = JSON.stringify({
                    model: 'deepseek-r1-250120',
                    messages: [
                        { role: 'system', content: '你是一个专业的中文取名专家，精通中英文化和起名技巧。' },
                        { role: 'user', content: prompt }
                    ]
                });

                const options = {
                    hostname: 'ark.cn-beijing.volces.com',
                    path: '/api/v3/chat/completions',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': 'Bearer 1777c488-46ba-469c-b336-bacba7b0b961'
                    },
                    timeout: 60000 // 60秒超时
                };

                const apiReq = https.request(options, (apiRes) => {
                    let data = '';

                    apiRes.on('data', (chunk) => {
                        data += chunk;
                    });

                    apiRes.on('end', () => {
                        try {
                            const response = JSON.parse(data);
                            const namesJson = JSON.parse(response.choices[0].message.content);
                            res.writeHead(200, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify(namesJson));
                        } catch (error) {
                            console.error('Error parsing API response:', error);
                            res.writeHead(500, { 'Content-Type': 'application/json' });
                            res.end(JSON.stringify({ error: 'Failed to generate names' }));
                        }
                    });
                });

                apiReq.on('error', (error) => {
                    console.error('API request error:', error);
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Failed to connect to name generation service' }));
                });

                apiReq.on('timeout', () => {
                    apiReq.destroy();
                    res.writeHead(504, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Request timeout' }));
                });

                apiReq.write(postData);
                apiReq.end();

            } catch (error) {
                console.error('Request processing error:', error);
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid request' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Not found' }));
    }
});

const PORT = 3001;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});