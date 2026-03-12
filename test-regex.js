const fs = require('fs');
const text = fs.readFileSync('C:/Users/Usuario/.gemini/antigravity/brain/1f9fa948-3d4c-4d37-b22d-034f313e2b8d/.system_generated/steps/1420/output.txt', 'utf8');
const json = JSON.parse(text).result;
const matchStr = json.match(/<untrusted-data-[^>]+>([\s\S]*?)<\/untrusted-data/);
const sqlArrayStr = matchStr[1].trim();
const sqlArray = JSON.parse(sqlArrayStr);
const content = sqlArray[0].content;

console.log("Original content ends with:", JSON.stringify(content.slice(-50)));

const match = content.match(/```artifact:(?:documento|presentacion|codigo|imagen)\s*\n([\s\S]*?)```/);
if (!match) {
    console.log("PASS 1 FAILED");
    return;
}
const jsonStr = match[1].trim();

console.log("jsonStr ends with:", JSON.stringify(jsonStr.slice(-50)));

const htmlMatch = jsonStr.match(/"html":\s*"([\s\S]*?)"\s*[,}]?\s*$/);
if (!htmlMatch) {
    console.log("RECOVERY FAILED");
} else {
    console.log("RECOVERY SUCCEEDED");
    console.log("First chars:", JSON.stringify(htmlMatch[1].slice(0, 50)));
    console.log("Last chars:", JSON.stringify(htmlMatch[1].slice(-50)));
}
