const fs = require("fs");
const path = require("path");
const http = require("http");

const PORT = 8080;
const DATA_FILE = path.join(__dirname, "user-data", "points.json");

const MIME = {
  ".html": "text/html;charset=utf-8",
  ".css": "text/css;charset=utf-8",
  ".js": "text/javascript;charset=utf-8",
  ".json": "application/json;charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};


// ===== 自动备份 =====
function backupDataFile() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, "utf-8");
      const parsed = JSON.parse(content);
      const hasPoints = parsed.points && Object.values(parsed.points).some(arr => arr && arr.length > 0);
      if (hasPoints) {
        for (let i = 3; i >= 1; i--) {
          const old = DATA_FILE + ".bak." + i;
          const src = i === 1 ? DATA_FILE + ".bak" : DATA_FILE + ".bak." + (i-1);
          if (fs.existsSync(src)) {
            fs.renameSync(src, old);
          }
        }
        fs.copyFileSync(DATA_FILE, DATA_FILE + ".bak");
        console.log("✓ 自动备份已创建");
      }
    }
  } catch(e) {
    console.warn("备份失败:", e.message);
  }
}

function restoreFromBackup() {
  for (let i = 1; i <= 3; i++) {
    const bak = DATA_FILE + ".bak" + (i > 1 ? "." + i : "");
    try {
      if (fs.existsSync(bak)) {
        const content = fs.readFileSync(bak, "utf-8");
        const parsed = JSON.parse(content);
        const hasPoints = parsed.points && Object.values(parsed.points).some(arr => arr && arr.length > 0);
        if (hasPoints) {
          fs.writeFileSync(DATA_FILE, content, "utf-8");
          console.log("✓ 从备份 " + bak + " 恢复数据");
          return true;
        }
      }
    } catch(e) {}
  }
  return false;
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") { res.writeHead(204); res.end(); return; }

  // API: 上传图片到本地仓库
  if (req.method === "POST" && req.url === "/api/upload-image") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        // body format: field1=value1&field2=value2 (multipart alternative)
        // We receive: data=<base64>&name=<filename>&ext=<ext>
        const params = new URLSearchParams(body);
        const base64Data = params.get("data");
        const fileName = params.get("name") || "image";
        const fileExt = params.get("ext") || "png";

        if (!base64Data) {
          res.writeHead(400);
          res.end(JSON.stringify({ ok: false, error: "no image data" }));
          return;
        }

        // 生成唯一文件名：时间戳 + 随机数
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 10000);
        const safeName = fileName.replace(/[^a-zA-Z0-9\u4e00-\u9fff_-]/g, "_").substring(0, 40);
        const finalName = safeName + "_" + timestamp + "_" + random + "." + fileExt.replace(/[^a-zA-Z0-9]/g, "");
        const uploadDir = path.join(__dirname, "assets", "screenshots");
        
        // 确保目录存在
        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, finalName);
        
        // 解码 base64 数据
        // Remove data:image/xxx;base64, prefix if present
        let cleanData = base64Data;
        if (cleanData.indexOf("base64,") !== -1) {
          cleanData = cleanData.substring(cleanData.indexOf("base64,") + 7);
        }
        
        const buffer = Buffer.from(cleanData, "base64");
        fs.writeFileSync(filePath, buffer);
        
        // 返回可公开访问的 URL
        const publicUrl = "/assets/screenshots/" + finalName;
        console.log("✓ 图片已保存: " + publicUrl);

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, url: publicUrl }));
        
      } catch(e) {
        console.warn("图片上传失败:", e.message);
        res.writeHead(500);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API: 获取图片仓库所有图片列表
  if (req.method === "GET" && req.url === "/api/list-images") {
    try {
      const uploadDir = path.join(__dirname, "assets", "screenshots");
      if (!fs.existsSync(uploadDir)) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, images: [] }));
        return;
      }
      const files = fs.readdirSync(uploadDir).filter(f => {
        const ext = path.extname(f).toLowerCase();
        return [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg", ".bmp"].includes(ext);
      });
      const images = files.map(f => "/assets/screenshots/" + f);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, images }));
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ ok: false, error: e.message }));
    }
    return;
  }

  // API: 保存数据到文件
  if (req.method === "POST" && req.url === "/api/save-data") {
    let body = "";
    req.on("data", chunk => body += chunk);
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const clean = JSON.parse(JSON.stringify(data));
        
        // === 安全防护：禁止用空数据覆盖有数据的文件 ===
        try {
          if (fs.existsSync(DATA_FILE)) {
            const currentContent = fs.readFileSync(DATA_FILE, "utf-8");
            const current = JSON.parse(currentContent);
            var currentTotal = 0;
            if (current.points) {
              Object.keys(current.points).forEach(function(m) {
                currentTotal += (current.points[m] || []).length;
              });
            }
            var incomingTotal = 0;
            if (clean.points) {
              Object.keys(clean.points).forEach(function(m) {
                incomingTotal += (clean.points[m] || []).length;
              });
            }
            // 如果当前文件有数据但传入数据为空 → 拒绝保存并恢复备份
            if (currentTotal > 0 && incomingTotal === 0) {
              console.warn("⚠ 检测到空数据写入尝试！已阻止，尝试从备份恢复...");
              restoreFromBackup();
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(JSON.stringify({ ok: true, restored: true }));
              return;
            }
          }
        } catch(e) {
          console.warn("安全检测失败:", e.message);
        }
        
        // 保留 base64 图片（仅过滤完全空字符串）
        if (clean.points) {
          Object.keys(clean.points).forEach(mapId => {
            (clean.points[mapId] || []).forEach(p => {
              if (p.detail) {
                if (p.detail.images && Array.isArray(p.detail.images)) {
                  p.detail.images = p.detail.images.filter(function(s) {
                    return s && s.trim() !== "";
                  });
                }
              }
            });
          });
        }
        backupDataFile();
        fs.writeFileSync(DATA_FILE, JSON.stringify(clean, null, 2), "utf-8");
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
        console.log("✓ 点位数据已保存到文件");
      } catch(e) {
        res.writeHead(400);
        res.end(JSON.stringify({ ok: false, error: e.message }));
      }
    });
    return;
  }

  // API: 从文件读取数据
  if (req.method === "GET" && req.url === "/api/load-data") {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const data = fs.readFileSync(DATA_FILE, "utf-8");
        try {
          const parsed = JSON.parse(data);
          const hasPoints = parsed.points && Object.values(parsed.points).some(arr => arr && arr.length > 0);
          if (!hasPoints) {
            if (restoreFromBackup()) {
              const restored = fs.readFileSync(DATA_FILE, "utf-8");
              res.writeHead(200, { "Content-Type": "application/json" });
              res.end(restored);
              return;
            }
          }
        } catch(e) {}
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(data);
      } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: "not found" }));
      }
    } catch(e) {
      res.writeHead(500);
      res.end(JSON.stringify({ error: e.message }));
    }
    return;
  }

  // 静态文件服务
  const urlPath = req.url.split("?")[0];
  let filePath = path.join(__dirname, urlPath === "/" ? "index.html" : urlPath);
  const ext = path.extname(filePath);
  
  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (!ext) {
        const htmlPath = filePath + ".html";
        fs.readFile(htmlPath, (err2, data2) => {
          if (err2) {
            res.writeHead(404);
            res.end("Not found");
            return;
          }
          res.writeHead(200, { "Content-Type": "text/html;charset=utf-8" });
          res.end(data2);
        });
        return;
      }
      res.writeHead(404);
      res.end("Not found");
      return;
    }
    res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
    res.end(data);
  });
});

setInterval(backupDataFile, 60000);
server.listen(PORT, () => {
  console.log("✓ 服务器已启动: http://localhost:" + PORT);
  console.log("✓ 编辑器添加/删除点位将自动保存到 user-data/points.json");
});

