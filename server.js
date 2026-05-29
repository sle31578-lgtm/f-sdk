const express = require("express");
const fs = require("fs-extra");
const path = require("path");
const { exec } = require("child_process");
const crypto = require("crypto");

const app = express();

app.use(express.json({ limit: "100mb" }));

const ROOT = "/tmp/flutter-projects";

fs.ensureDirSync(ROOT);

app.get("/", (req, res) => {
  res.send("Flutter Preview Server Running");
});

app.post("/api/compile", async (req, res) => {
  try {

    const files = req.body.files;

    if (!files) {
      return res.status(400).json({
        success: false,
        error: "No files provided"
      });
    }

    const projectId = crypto.randomBytes(8).toString("hex");

    const projectPath = path.join(ROOT, projectId);

    await fs.ensureDir(projectPath);

    // إنشاء الملفات
    for (const filePath in files) {

      const fullPath = path.join(projectPath, filePath);

      await fs.ensureDir(path.dirname(fullPath));

      await fs.writeFile(fullPath, files[filePath]);
    }

    // بناء Flutter Web
    exec(
      `
      cd ${projectPath} &&
      flutter config --enable-web &&
      flutter create . --platforms web
      flutter pub get
      flutter build web --release
      `,
      {
        maxBuffer: 1024 * 1024 * 50
      },
      async (error, stdout, stderr) => {

        if (error) {
          return res.status(500).json({
            success: false,
            error: stderr || error.message
          });
        }

        const previewPath = path.join(projectPath, "build/web");

        app.use(
          `/preview/${projectId}`,
          express.static(previewPath)
        );

        return res.json({
          success: true,
          previewUrl: `/preview/${projectId}`,
          logs: stdout
        });

      }
    );

  } catch (e) {

    return res.status(500).json({
      success: false,
      error: e.toString()
    });

  }
});

app.listen(3000, () => {
  console.log("Server started on port 3000");
});
