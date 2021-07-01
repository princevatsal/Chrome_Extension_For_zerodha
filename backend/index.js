const express = require('express')
var cors = require('cors');
var bodyParser = require('body-parser')
const http = require('https'); // or 'http' for http:// URLs
const fs = require('fs');
const fetch = require('node-fetch');
var AdmZip = require("adm-zip");

var admin = require("firebase-admin");
var serviceAccount = require("./chrome-extension-3ab23-firebase-adminsdk-7m5kn-e0eed693a4.json");
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

const save = (docs, collection) => {
    var batch = db.batch()
    docs.forEach((doc) => {
        var docRef = db.collection(collection).doc(); //automatically generate unique id
        batch.set(docRef, doc);
    });
    return batch.commit();
}

const app = express()
app.use(cors());
app.use(bodyParser.json())

app.get('/', (req, res) => {
    res.send('Hello World!')
})

function csvJSON(csv) {
    const lines = csv.split('\n')
    const result = []
    const headers = lines[0].split(',')

    for (let i = 1; i < lines.length; i++) {
        if (!lines[i])
            continue
        const obj = {}
        const currentline = lines[i].split(',')

        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = currentline[j]
        }
        result.push(obj)
    }
    return result
}



const formatDate2 = (date) => {
    let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(date);
    let mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(date);
    let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(date);
    let formattedDate = `${da}-${mo}-${ye}`;
    return formattedDate;
}

// app.get("/updatetickerdata", (req, res) => {
//     fs.readFile('./instruments', 'utf8', async (err, data) => {
//         if (err) {
//             console.error(err)
//             return
//         }
//         var dataToWrite = csvJSON(data).filter(item => item.name == '"BANKNIFTY"' || item.name == '"NIFTY"').map((item) => ({
//             ...item,
//             name: item.name.slice(1, item.name.length - 1)
//         }));
//         var totalobject = dataToWrite.length;
//         console.log(dataToWrite[3000], totalobject)
//         var noOfObjWritten = 0;
//         for (i = 0; i < 9; i++) {
//             console.log("here we are going to start the work of data uploading ")
//             var res = await save(dataToWrite.slice(noOfObjWritten, noOfObjWritten + 500), 'StockDataTicker')
//             noOfObjWritten = noOfObjWritten + 500;
//             console.log("docs written :- " + noOfObjWritten)
//         }
//     })
//     res.send("done")
// })
app.post('/', (req, res) => {
    if (req.body.identifier) {

        var ticker_number = req.body.identifier
        console.log(ticker_number)
        //
        var requiredDate = new Date()
        requiredDate.setDate(requiredDate.getDate() - 1)
        if (requiredDate.getDay() == 0) {
            requiredDate.setDate(requiredDate.getDate() - 2)
        } else if (requiredDate.getDay() == 6) {
            requiredDate.setDate(requiredDate.getDate() - 1)
        }
        let ye = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(requiredDate);
        let mo = new Intl.DateTimeFormat('en', { month: 'short' }).format(requiredDate);
        let da = new Intl.DateTimeFormat('en', { day: '2-digit' }).format(requiredDate);
        let formattedDate = `${da}${mo.toUpperCase()}${ye}`;
        let formattedDate2 = `${da}-${mo.toUpperCase()}-${ye}`
        //
        db.collection("StockDataTicker").where('instrument_token', "==", "" + ticker_number).get().then(data => {
            if (data.docs.length > 0) {
                var objData = data.docs[0].data();
                var expiry_date = formatDate2(new Date(objData.expiry))
                db.collection("OHLC").where("TIMESTAMP", "==", formattedDate2).where("SYMBOL", "==", objData.name).where("EXPIRY_DT", "==", expiry_date).where("OPTION_TYP", "==", objData.instrument_type).where("STRIKE_PR", "==", objData.strike)
                    .get().then((data) => {
                        if (data.docs.length > 0) {
                            res.status(200).json(data.docs[0].data())
                        } else {
                            fetch(`https://archives.nseindia.com/content/historical/DERIVATIVES/${ye}/${mo.toUpperCase()}/fo${formattedDate}bhav.csv.zip`)
                                .then(res => res.buffer())
                                .then(buffer => {
                                    var zip = new AdmZip(buffer);
                                    var zipEntries = zip.getEntries();
                                    var timeStamp = "" + Date.now();
                                    var symbolName = "none";
                                    var dataToPush = csvJSON(zipEntries[0].getData().toString('utf8'))
                                        .filter(item => item.EXPIRY_DT == expiry_date && item.OPTION_TYP == objData.instrument_type && item.STRIKE_PR == objData.strike && item.SYMBOL == objData.name)
                                        .map((item, index) => {
                                            if (index == 1) {
                                                timeStamp = item.TIMESTAMP
                                                symbolName = item.SYMBOL
                                            }
                                            return ({
                                                INSTRUMENT: item.INSTRUMENT,
                                                SYMBOL: item.SYMBOL,
                                                EXPIRY_DT: item.EXPIRY_DT,
                                                STRIKE_PR: item.STRIKE_PR,
                                                OPTION_TYP: item.OPTION_TYP,
                                                OPEN: item.OPEN,
                                                HIGH: item.HIGH,
                                                LOW: item.LOW,
                                                CLOSE: item.CLOSE,
                                                SETTLE_PR: item.SETTLE_PR,
                                                CONTRACTS: item.CONTRACTS,
                                                VAL_INLAKH: item.VAL_INLAKH,
                                                OPEN_INT: item.OPEN_INT,
                                                CHG_IN_OI: item.CHG_IN_OI,
                                                TIMESTAMP: item.TIMESTAMP,
                                            })
                                        })
                                    if (dataToPush.length > 0) {
                                        db.collection("OHLC").add(dataToPush[0]).then(() => {
                                            res.status(200).json(dataToPush[0])
                                        }).catch(() => {
                                            res.status(404).send("not found")
                                        })
                                    } else {
                                        res.status(404).send("OHLC not found")
                                    }
                                }).catch(err => {
                                    res.status(500).send("unable to fetch data from nse")
                                })
                        }
                    }).catch((err) => {
                        res.status(500).send("some error occured");
                    })
            } else {
                res.status(404).send("ticker not found")
            }
        }).catch(() => {
            res.status(500).send("server network error")
        })
    } else {
        res.status(404).send("please fill all paramerts")
    }

})

const port = process.env.PORT || 3000
app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})