const fs = require("fs");
const file = "C:\\Users\\孙闻辉\\Desktop\\valorant-wallbang\\server.js";
let c = fs.readFileSync(file, "utf-8");

const backupCode = `
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
`;

c = c.replace("const server = http.createServer", backupCode + "\nconst server = http.createServer");
c = c.replace("backupDataFile();\n        fs.writeFileSync", "        backupDataFile();\n        fs.writeFileSync");
c = c.replace(/fs\.writeFileSync\(DATA_FILE, JSON\.stringify\(clean, null, 2\), "utf-8"\);/, "        backupDataFile();\n        fs.writeFileSync(DATA_FILE, JSON.stringify(clean, null, 2), \"utf-8\");");
c = c.replace(/if \(fs\.existsSync\(DATA_FILE\)\) \{\n        const data = fs\.readFileSync\(DATA_FILE, "utf-8"\);\n        res\.writeHead\(200/, `if (fs.existsSync(DATA_FILE)) {
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
        res.writeHead(200`);
c = c.replace("server.listen(PORT,", "setInterval(backupDataFile, 60000);\nserver.listen(PORT,");

fs.writeFileSync(file, c, "utf-8");
console.log("✓ server.js updated");
