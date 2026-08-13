const fs = require('fs');
const log = fs.readFileSync('/Users/yug/.gemini/antigravity-ide/brain/52e17050-67db-4f46-af1d-5303a2d626d1/.system_generated/tasks/task-5223.log', 'utf8');
const startMatch = '--- EXACT BEDROCK INPUT START ---';
const endMatch = '--- EXACT BEDROCK INPUT END ---';
const start = log.indexOf(startMatch);
const end = log.indexOf(endMatch, start);
if (start !== -1 && end !== -1) {
  const jsonStr = log.substring(start + startMatch.length, end).trim();
  fs.writeFileSync('/Users/yug/.gemini/antigravity-ide/brain/52e17050-67db-4f46-af1d-5303a2d626d1/exact_bedrock_input.md', '# Exact Bedrock Input\n\n```json\n' + jsonStr + '\n```\n');
  console.log('Successfully wrote artifact.');
} else {
  console.log('Could not find input blocks.');
}
