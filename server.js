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
