const fs = require('fs'); // filesystem API to write files.
const XLSX = require('xlsx'); // allowing to create tables and wonderful things.

// This script takes the ssim file saved in another script and transforms it into a "beautiful"(okay, not so beautiful)
// table.

const STARTS_AT = 1;
const NUMBER_OF_IMAGES = 28;
// where the similarity matrix is located
const SIMILARITY_MATRIX_FILE = "./output/similarity_blur.json";
const DIR = "./output/";

// gets the similarity matrix
const similarityMatrix = JSON.parse(fs.readFileSync(SIMILARITY_MATRIX_FILE, 'utf8'));

const workBook = XLSX.utils.book_new();

const rows = [["image1", "image2", "similarity"]];

for(let i = 0; i < NUMBER_OF_IMAGES; i++){
    for(let k = i; k < NUMBER_OF_IMAGES; k++) {
        const row = [i + STARTS_AT, k + STARTS_AT, similarityMatrix[i][k]];
        rows.push(row)
    }
}

const workSheet = XLSX.utils.aoa_to_sheet(rows);
/* Add the worksheet to the workbook */
XLSX.utils.book_append_sheet(workBook, workSheet, "SSIM Table");

// saving workbook file
XLSX.writeFile(workBook, `${DIR}ssim_table.xlsb`);

console.log("READY :)");