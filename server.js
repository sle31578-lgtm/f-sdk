const express = require("express");
const path = require("path");
const fs = require("fs-extra");
const { exec } = require("child_process");

const app = express();

const PROJECT_PATH = "/app/preview";

app.use(express.json({ limit: "50mb" }));

app.get("/", (req, res) => {
  res.send("Flutter Preview Server Running");
});

app.get("/preview", async (req, res) => {
  try {
    const buildPath = path.join(PROJECT_PATH, "build/web");

    if (!fs.existsSync(buildPath)) {
      return res.status(404).send("No build found");
    }

    app.use(
      "/app-preview",
      express.static(buildPath)
    );

    res.send(`
      Preview Ready:
      <a href="/app-preview" target="_blank">
        Open App
      </a>
    `);

  } catch (e) {
    res.status(500).send(e.toString());
  }
});

app.post("/build", async (req, res) => {
  try {

    exec(
      `
      cd ${PROJECT_PATH} &&
      flutter clean &&
      flutter pub get &&
      flutter build web --release
      `,
      { maxBuffer: 1024 * 1024 * 20 },
      (error, stdout, stderr) => {

        if (error) {
          return res.status(500).json({
            success: false,
            error: stderr || error.message
          });
        }

        res.json({
          success: true,
          output: stdout
        });

      }
    );

  } catch (e) {
    res.status(500).send(e.toString());
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
