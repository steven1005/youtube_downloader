const youtubedl = require('youtube-dl-exec');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 確保 download 資料夾存在
const downloadDir = path.join(process.cwd(), 'download');
if (!fs.existsSync(downloadDir)) {
    fs.mkdirSync(downloadDir);
}

async function downloadVideo(url, format) {
    try {
        console.log('開始下載...');
        
        // 根據選擇的格式設定下載選項
        const options = {
            output: path.join('download', '%(title)s.%(ext)s'),
            progress: true
        };

        if (format === 'mp3') {
            options.extractAudio = true;
            options.audioFormat = 'mp3';
            options.format = 'bestaudio';
        } else {
            options.format = 'best';
        }
        
        const download = youtubedl.exec(url, options);

        // 監聽標準輸出來獲取進度
        download.stdout.on('data', (data) => {
            const output = data.toString();
            if (output.includes('%')) {
                const match = output.match(/(\d+\.\d+)%/);
                if (match) {
                    const percentage = match[1];
                    process.stdout.write(`下載進度: ${percentage}%\r`);
                }
            }
        });

        await download;
        console.log('\n下載完成！');
    } catch (error) {
        console.error('發生錯誤：', error);
    } finally {
        rl.close();
    }
}

// 使用遞迴方式處理多個問題
function askFormat(url) {
    rl.question('請選擇下載格式 (1: MP4, 2: MP3): ', (answer) => {
        switch(answer) {
            case '1':
                downloadVideo(url, 'mp4');
                break;
            case '2':
                downloadVideo(url, 'mp3');
                break;
            default:
                console.log('無效的選擇，請重新輸入');
                askFormat(url);
                break;
        }
    });
}

rl.question('請輸入 YouTube 影片網址: ', (url) => {
    askFormat(url);
}); 