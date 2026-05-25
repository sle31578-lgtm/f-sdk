const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const unzipper = require('unzipper');

const app = express();
const port = process.env.PORT || 8090;
const upload = multer({ dest: '/tmp/uploads/' });

app.use('/previews', express.static('/tmp/previews'));

// الواجهة الرئيسية لرفع الملفات من الجوال مباشرة
app.get('/', (req, res) => {
    res.send(`
        <html lang="ar" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>معاين تطبيقات فلاتر</title>
            <style>
                body { font-family: sans-serif; background: #121212; color: white; text-align: center; padding: 40px 20px; }
                .card { background: #1e1e1e; padding: 30px; border-radius: 12px; max-width: 400px; margin: auto; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
                input[type="file"] { margin: 20px 0; block-size: auto; display: block; inline-size: 100%; color: #ccc; }
                button { background: #007bff; color: white; border: none; padding: 12px 24px; border-radius: 6px; font-size: 16px; cursor: pointer; inline-size: 100%; }
                button:hover { background: #0056b3; }
                #status { margin-top: 20px; color: #ffc107; font-weight: bold; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="card">
                <h2>اضغط هنا لرفع ملف الـ ZIP 🚀</h2>
                <form id="uploadForm">
                    <input type="file" name="project_zip" accept=".zip" required>
                    <button type="submit">ابدأ البناء والمعاينة</button>
                </form>
                <div id="status"></div>
            </div>

            <script>
                document.getElementById('uploadForm').onsubmit = async (e) => {
                    e.preventDefault();
                    const statusDiv = document.getElementById('status');
                    statusDiv.innerText = "جاري رفع الملف وبناء التطبيق... قد يستغرق الأمر دقيقة ⏳";
                    
                    const formData = new FormData(e.target);
                    try {
                        const response = await fetch('/api/preview-build', { method: 'POST', body: formData });
                        const result = await response.json();
                        if(result.success) {
                            statusDiv.innerHTML = \`<span style="color:#28a745">تم البناء بنجاح! 🎉</span><br><br><a href="\${result.preview_url}" target="_blank" style="color:#007bff; font-size:18px;">اضغط هنا لفتح المعاينة</a>\`;
                        } else {
                            statusDiv.innerText = "فشل البناء: " + (result.error || "خطأ مجهول");
                        }
                    } catch(err) {
                        statusDiv.innerText = "حدث خطأ أثناء الاتصال بالسيرفر";
                    }
                };
            </script>
        </body>
        </html>
    `);
});

app.post('/api/preview-build', upload.single('project_zip'), async (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'الرجاء إرفاق ملف الـ ZIP' });
    const buildId = `preview_${Date.now()}`;
    const zipPath = req.file.path;
    const extractPath = path.join('/tmp/extracted', buildId);
    const buildOutputPath = path.join('/tmp/previews', buildId);

    try {
        fs.mkdirSync(extractPath, { recursive: true });
        await fs.createReadStream(zipPath).pipe(unzipper.Extract({ path: extractPath })).promise();
        fs.unlinkSync(zipPath);

        const runBuildCommand = `cd ${extractPath} && flutter pub get && flutter build web --release`;
        exec(runBuildCommand, (error, stdout, stderr) => {
            if (error) return res.status(500).json({ error: 'فشل بناء تطبيق الفلاتر', details: stderr });
            const flutterWebBuildPath = path.join(extractPath, 'build', 'web');
            fs.mkdirSync('/tmp/previews', { recursive: true });
            
            fs.rename(flutterWebBuildPath, buildOutputPath, (err) => {
                if (err) return res.status(500).json({ error: 'فشل نقل ملفات الويب الجاهزة' });
                fs.rmSync(extractPath, { recursive: true, force: true });
                const hostUrl = req.get('host');
                const protocol = req.protocol;
                res.json({ success: true, preview_url: `${protocol}://${hostUrl}/previews/${buildId}/index.html` });
            });
        });
    } catch (err) {
        res.status(500).json({ error: 'حدث خطأ في الـ SDK', details: err.message });
    }
});

app.listen(port, () => console.log(`SDK Server running on port ${port}`));
