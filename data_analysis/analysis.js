const fs = require('fs'); // read directory
const csv = require('csvtojson'); // reading csv files.
const ArrayList = require('arraylist'); // saving array lists.

// The directory storing all the logs
const DIR = "./logs/";

readAndAnalyseFiles().then(() => {
    console.log("Everything completed.");
}).catch((error) => {
    console.log("Something went wrong: ", error);
});

async function readAndAnalyseFiles() {
    // saving all the objects
    const logFiles = fs.readdirSync(DIR);
    const logObjects = new ArrayList();


    // converting them to json.
    for(logFile of logFiles) {
        const jsonArray = await csv.fromFile(logFile);
        logObjects.add(jsonArray);
    }

    // The logs have always the same muster, first 7 data points for the images(ignored), then 40 moves, then 40
    // timestamps, then game information.
}