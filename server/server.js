const fs = require('fs');
const path = require('path');
const express = require('express');
const axios = require('axios');
const WebSocket = require('ws');


const app = express();
const port =  3000;

const urlToKeywords = require('./keywords.json');

const server = require('http').createServer(app);
const wss = new WebSocket.Server({ server });

const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir, { recursive: true });
}

wss.on('connection', (ws) => {
    ws.on('message', (message) => {
        const { url, keyword } = JSON.parse(message);
        downloadContent(url, keyword, ws);
    });
});

function downloadContent(url, keyword, ws) {
    const outputPath = path.join(downloadsDir, `${keyword}.txt`);
    const writer = fs.createWriteStream(outputPath);

    axios({
        method: 'get',
        url,
        responseType: 'stream',
    }).then((response) => {
        const totalLength = response.headers['content-length'];
        let downloadedLength = 0;

        response.data.on('data', (chunk) => {
            downloadedLength += chunk.length;
            const progress = (downloadedLength / totalLength) * 100;

            ws.send(JSON.stringify({
                progress: progress.toFixed(2),
                total: totalLength
            }));
        });

        response.data.on('end', () => {
            ws.send(JSON.stringify({
                progress: '100.00',
                total: totalLength
            }));
        });

        response.data.pipe(writer);

        writer.on('finish', () => {
            console.log(`Контент загружен и сохранен в ${outputPath}`);
        });

        writer.on('error', (err) => {
            ws.send(JSON.stringify({ error: err.message }));
        });
    }).catch((error) => {
        ws.send(JSON.stringify({ error: error.message }));
    });
}

app.use(express.static(path.join(__dirname, '..', 'client')));

app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.get('/urls/:keyword', (req, res) => {
    const keyword = req.params.keyword;
    const urls = Object.keys(urlToKeywords).filter(url => 
        urlToKeywords[url].includes(keyword)
    );
    if (urls.length > 0) {
        res.json(urls);
    } else {
        res.status(404).json({ error: 'Контента нет, ошибка 404' });
    }
});

server.listen(port, () => {
    console.log(`Сервер запущен: http://localhost:${port}`);
});
