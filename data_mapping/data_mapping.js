const admin = require('firebase-admin');
const fs = require('fs'); // filesystem API to write files.
const ArrayList = require('arraylist');

const serviceAccount = require('./memory-intelligence-firebase-key');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
});

// to stop complaining
const settings = {timestampsInSnapshots: true};

// getting the database with the right settings
const db = admin.firestore();
db.settings(settings);

// the maximum number of moves a game should have under that and we use 0 padding
const GAME_LENGTH = 40;
const DIR = "./logs/";
const SIMILARITY_MATRIX_FILE = "./similarity_blur.json";

// creates the folder specified if it doesn't exist.
if (!fs.existsSync(DIR)) {
    fs.mkdirSync(DIR);
}

// gets the similarity matrix
const similarityMatrix = JSON.parse(fs.readFileSync(SIMILARITY_MATRIX_FILE, 'utf8'));

// First getting all the sessions, they are also filtered, so as only to receive the completed ones. This needs to be
// improved in the app so as to already save the number and the completion status as an int and a boolean respectively.
db.collection('sessions')
    .orderBy('startTime', 'asc')
    .get()
    .then((snapshot) => {
        let i = 0;
        const sessionList = new ArrayList();
        snapshot.forEach((session) => {
            const sessionObject = {
                startTime: session.get('startTime').toDate(),
                gameLogRefs: []
            };

            if (session.get('100ZfalseRfalse')) {
                sessionObject.gameLogRefs.push(session.get('100ZfalseRfalse'));
            }
            if (session.get('101ZfalseRfalse')) {
                sessionObject.gameLogRefs.push(session.get('101ZfalseRfalse'));
            }
            if (session.get('101ZtrueRfalse')) {
                sessionObject.gameLogRefs.push(session.get('101ZtrueRfalse'));
            }
            if (session.get('101ZfalseRtrue')) {
                sessionObject.gameLogRefs.push(session.get('101ZfalseRtrue'));
            }
            if (session.get('102ZfalseRfalse')) {
                sessionObject.gameLogRefs.push(session.get('102ZfalseRfalse'));
            }
            if (session.get('102ZtrueRfalse')) {
                sessionObject.gameLogRefs.push(session.get('102ZtrueRfalse'));
            }
            if (session.get('102ZfalseRtrue')) {
                sessionObject.gameLogRefs.push(session.get('102ZfalseRtrue'));
            }

            // we only care for completed sessions with exactly the games listed above.
            if (sessionObject.gameLogRefs.length === 7) {
                console.log(`Number ${i} => ${sessionObject.startTime}`);

                sessionList.add(sessionObject);

                i++;
            }
        });

        // now to get every single log referenced.
        for (let i = 0; i < sessionList.length; i++) {
            handleSession(sessionList.get(i), i);
        }
    });

// Function that gets all the logs from inside a reference. Reorders them and do the whole mapping stuff.
// You could say this is pretty important.
async function handleSession(session, sessionNumber) {
    // the references
    const gameLogRefs = session.gameLogRefs;

    // get every single log(synchronously)
    const gameLogs = new ArrayList();
    for (let i = 0; i < gameLogRefs.length; i++) {
        const logRef = gameLogRefs[i];
        const logSnapshot = await logRef.get();
        gameLogs.add(logSnapshot.data());
    }

    const sortedLogs = gameLogs.toArray().sort((logA, logB) => {
        return logA.startTime.toDate() - logB.startTime.toDate()
    });

    // this contains the whole session in text form.
    let sessionText = "";

    for (log of sortedLogs) {
        // we only want logs without the assistants so we skip the ones with assistants
        if (log.replayCheat || log.zoomCheat) {
            continue;
        }

        // this has the whole game data for this log
        const game = new ArrayList();

        // first the mapping for the game moves and the moves themselves
        const mappedMoves = new ArrayList(); // these are the saved moves in order after the mapping.
        const imageMappings = new Map(); // this is passed to compare with the similarity matrix
        const wholeMapping = new Map(); // this is the one really used to map.
        for (move of log.gameLog) {
            if (wholeMapping.get(move)) {
                mappedMoves.add(wholeMapping.get(move));
            } else {
                const splitMove = move.split('.'); // ImageId.PairNumber
                const imageId = splitMove[0];

                if (imageMappings.get(imageId)) {
                    const mapped = imageMappings.get(imageId) + ".2"; // must be the second of the pair to appear.
                    wholeMapping.set(move, mapped);
                    mappedMoves.add(mapped);
                } else {
                    // first to appear of this image.
                    const appearanceNumber = imageMappings.size + 1;
                    imageMappings.set(imageId, appearanceNumber.toString());
                    const mapped = appearanceNumber + ".1"; // if the image hasn't been mapped, then this is the first.
                    wholeMapping.set(move, mapped);
                    mappedMoves.add(mapped);
                }
            }
        }

        // Adding the similarity scores for the images used inside this game.
        // the images in number so we can get them from the matrix
        const images = Array.from(imageMappings.keys()).map((value) => {
            return parseInt(value) - 1; // matrix begins in 0, the images at 1, subtracting 1 yields the correct value.
        });
        for (let i = 1; i <= imageMappings.size; i++) {
            for (let k = 1; k <= imageMappings.size; k++) {
                // skip if we are comparing one to one as the result will always be one, once and for all.
                if (i >= k)
                    continue;

                const imageOne = images[i - 1]; // the cards also begin at 1 but the array at 0.
                const imageTwo = images[k - 1];

                const similarityScore = similarityMatrix[imageOne][imageTwo];

                game.add(`${i}.${k}=${similarityScore}`);
            }
        }
        // for (map of imageMappings.entries()) {
//
        //     game.add(`${map[1]}=${map[0]}`);
        // }

        // adding {gameLength} moves to the game (if 0 padding if necessary)
        for (let i = 0; i < GAME_LENGTH; i++) {
            const move = mappedMoves.get(i);
            if (move) {
                game.add(move);
            } else {
                game.add('0');
            }
        }

        // adding timestamps (and 0 padding if necessary)
        for (let i = 0; i < GAME_LENGTH; i++) {
            const time = log.timeLog[i];
            if (time) {
                game.add(time.toDate().getTime().toString());
            } else {
                game.add('0');
            }
        }

        // and the "metadata" of this game

        // duration in seconds
        const durationMillis = log.timeLog[log.timeLog.length - 1].toDate() - log.timeLog[0].toDate();
        game.add(Math.floor(durationMillis / 1000).toString());

        // Number Sum
        game.add(log.sum.toString());

        // user answer for sum
        game.add(log.sumUserAnswer.toString());

        // the story points (useless)
        game.add("-1");

        // game type
        game.add(log.gameType.toString());

        sessionText += game.join(',');

        sessionText += "\r\n"; // line break and carriage(brings the cursor back to 0 at next line)
    }

    const date = session.startTime;
    const fileNumber = ("0" + (sessionNumber + 1)).slice(-2); // 01, 02, ..., 12, 13. And so on.
    const fileName = `${date.getFullYear()}_${date.getMonth() + 1}_${date.getDate()}_${fileNumber}`
    fs.writeFile(DIR + fileName + ".txt", sessionText, function (err) {
        if (err) {
            return console.log(err);
        }

        console.log("The file ", fileName, " was saved!");
    });
}