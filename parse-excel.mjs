import fs from 'fs';
import xlsx from 'xlsx';

const EXCEL_PATH = '../Course Offering List Spring 2025 (Autosaved).xlsx';
const OUTPUT_PATH = './src/data/timetable.json';

try {
  console.log(`Reading Excel file from ${EXCEL_PATH}...`);
  const workbook = xlsx.readFile(EXCEL_PATH);
  
  // Get the first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  
  // Convert sheet to JSON array, skipping the first two rows which are metadata
  const data = xlsx.utils.sheet_to_json(worksheet, { defval: "", range: 2 });
  
  // Create data directory if it doesn't exist
  if (!fs.existsSync('./src/data')) {
    fs.mkdirSync('./src/data', { recursive: true });
  }

  // Write to JSON
  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Successfully parsed Excel data into ${OUTPUT_PATH}!`);
  console.log(`Total records: ${data.length}`);
} catch (error) {
  console.error("Error parsing Excel file:", error);
}
