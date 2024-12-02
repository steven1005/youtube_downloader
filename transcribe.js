const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// 讀取 download 資料夾中的檔案
function getDownloadedFiles() {
    const downloadDir = path.join(process.cwd(), 'download');
    try {
        const files = fs.readdirSync(downloadDir);
        return files.filter(file => {
            const ext = path.extname(file).toLowerCase();
            return ['.mp4', '.mp3'].includes(ext);
        });
    } catch (error) {
        console.error('讀取資料夾錯誤：', error);
        return [];
    }
}

// 使用 Whisper 轉換音訊為字幕
async function transcribeFile(filename) {
    const inputPath = path.join(process.cwd(), 'download', filename);
    const outputPath = path.join(process.cwd(), 'download', 
        `${path.parse(filename).name}.srt`);

    console.log('開始轉換字幕...');
    
    // 設定環境變數
    const env = {
        ...process.env,
        PYTHONPATH: '/Library/Frameworks/Python.framework/Versions/3.11/lib/python3.11/site-packages',
        PYTHONHTTPSVERIFY: '0',
        SSL_CERT_FILE: '/Library/Frameworks/Python.framework/Versions/3.11/etc/openssl/cert.pem'
    };

    return new Promise((resolve, reject) => {
        const whisper = spawn('whisper', [
            inputPath,
            '--model', 'base',
            '--output_dir', path.join(process.cwd(), 'download'),
            '--task', 'transcribe',
            '--output_format', 'srt'
        ], { env });

        // 監聽標準輸出
        whisper.stdout.on('data', (data) => {
            const output = data.toString();
            console.log('stdout:', output);
        });

        // 監聽標準錯誤輸出
        whisper.stderr.on('data', (data) => {
            const output = data.toString();
            
            // 解析進度資訊
            if (output.includes('Detecting language')) {
                console.log('正在檢測語言...');
            } else if (output.includes('Transcribing')) {
                console.log('開始轉錄...');
            }
            
            // 尋找時間戳記來估算進度
            const timeMatch = output.match(/\[(\d{2}):(\d{2})\]/);
            if (timeMatch) {
                const minutes = parseInt(timeMatch[1]);
                const seconds = parseInt(timeMatch[2]);
                const totalSeconds = minutes * 60 + seconds;
                console.log(`轉換進度: ${totalSeconds} 秒`);
            }

            // 顯示所有輸出以便偵錯
            console.log('stderr:', output);
        });

        whisper.on('close', (code) => {
            if (code === 0) {
                console.log('\n字幕轉換完成！');
                console.log(`字幕檔案已儲存為: ${outputPath}`);
                resolve();
            } else {
                const error = new Error(`轉換過程發生錯誤，退出碼: ${code}`);
                console.error(error);
                reject(error);
            }
        });

        whisper.on('error', (error) => {
            console.error('轉換過程發生錯誤：', error);
            reject(error);
        });
    });
}

// 顯示檔案列表並讓使用者選擇
function showFileList() {
    const files = getDownloadedFiles();
    
    if (files.length === 0) {
        console.log('沒有找到可轉換的檔案');
        rl.close();
        return;
    }

    console.log('\n可轉換的檔案：');
    files.forEach((file, index) => {
        console.log(`${index + 1}. ${file}`);
    });

    rl.question('\n請選擇要轉換的檔案編號: ', async (answer) => {
        const index = parseInt(answer) - 1;
        if (index >= 0 && index < files.length) {
            try {
                await transcribeFile(files[index]);
            } catch (error) {
                console.error('轉換失敗：', error);
            }
        } else {
            console.log('無效的選擇');
        }
        rl.close();
    });
}

// 開始執行
showFileList(); 