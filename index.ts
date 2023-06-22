import express, { Express, Request, Response } from 'express';
import { Database } from 'sqlite3';
import * as fs from 'fs';
import dotenv from 'dotenv';
import * as ethers from 'ethers';
import pricefeedABI from './abi/PriceFeed.json';
import erc20ABI from './abi/ERC20.json';
import { CronJob } from 'cron';
import { logger } from './utils/logger';
import { pinoHttp } from 'express-pino-logger';

dotenv.config();

// ----------------------------
// Prepare database
const db = new Database('db.sqlite');

const createSql = fs.readFileSync('./sql/create-tables.sql', 'utf-8');
db.exec(createSql);

const insertDeviationFactor = db.prepare(
    `INSERT INTO DeviationFactor VALUES (?, ?, ?)`
);

const insertRedemptionRate = db.prepare(
    `INSERT INTO RedemptionRate VALUES (?, ?, ?)`
);

const insertLEDPrice = db.prepare(
    `INSERT INTO LEDPrice VALUES (?, ?, ?)`
);

const insertLastGoodPrice = db.prepare(
    `INSERT INTO LastGoodPrice VALUES (?, ?, ?)`
);

const insertMintedAddress = db.prepare(
    `INSERT INTO MintedAddresses VALUES (?, ?, ?)`
);

const queryDeviationFactor = db.prepare(
    `SELECT * FROM DeviationFactor
     WHERE network = ? AND timestamp > ? AND timestamp < ?`
);

const queryRedemptionRate = db.prepare(
    `SELECT * FROM RedemptionRate
     WHERE network = ? AND timestamp > ? AND timestamp < ?`
);

const queryLEDPrice = db.prepare(
    `SELECT * FROM LEDPrice
     WHERE network = ? AND timestamp > ? AND timestamp < ?`
);

const queryLastGoodPrice = db.prepare(
    `SELECT * FROM LastGoodPrice
     WHERE network = ? AND timestamp > ? AND timestamp < ?`
);

const queryMintedAddress = db.prepare(
    `SELECT * FROM MintedAddresses
     WHERE network = ? AND address = ?`
);

// ----------------------------
// Set up ethers
const provider = new ethers.InfuraProvider(
    process.env.NETWORK,
    process.env.INFURA_API_KEY,
);

const signer = new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY!,
    provider
)

const priceFeed = new ethers.Contract(
    process.env.PRICE_FEED_ADDRESS!,
    pricefeedABI,
    signer
);

const erc20 = new ethers.Contract(
    process.env.ERC_20_ADDRESS!,
    erc20ABI,
    signer
)

// ----------------------------
// Set up express app/endpoints
const app: Express = express();
app.use(pinoHttp({ logger: logger }));

app.get('/deviationFactor', (req: Request, res: Response) => {
    if (req.query.begin == undefined || isNaN(Number(req.query.begin))) {
        res.status(400).json({
            "error": "Must define 'begin' param"
        });
        return;
    }
    if (req.query.end == undefined || isNaN(Number(req.query.begin))) {
        res.status(400).json({
            "error": "Must define 'end' param"
        });
        return;
    }
    queryDeviationFactor.all([
        process.env.NETWORK,
        req.query.begin,
        req.query.end
    ], (err, rows) => {
        if (err != undefined) {
            res.status(400).json({
                "error": err.message
            });
            return;
        }
        res.json({
            "data": rows
        })
    })
});

app.get('/redemptionRate', (req, res) => {
    if (req.query.begin == undefined) {
        res.status(400).json({
            "error": "Must define 'begin' param"
        });
        return;
    }
    if (req.query.end == undefined) {
        res.status(400).json({
            "error": "Must define 'end' param"
        });
        return;
    }
    queryRedemptionRate.all([
        process.env.NETWORK,
        req.query.begin,
        req.query.end
], (err, rows) => {
        if (err != undefined) {
            res.status(400).json({
                "error": err.message
            });
            return;
        }
        res.json({
            "data": rows
        })
    })
});

app.get('/LEDPrice', (req, res) => {
    if (req.query.begin == undefined) {
        res.status(400).json({
            "error": "Must define 'begin' param"
        });
        return;
    }
    if (req.query.end == undefined) {
        res.status(400).json({
            "error": "Must define 'end' param"
        });
        return;
    }
    queryLEDPrice.all([
        process.env.NETWORK,
        req.query.begin,
        req.query.end
], (err, rows) => {
        if (err != undefined) {
            res.status(400).json({
                "error": err.message
            });
            return;
        }
        res.json({
            "data": rows
        })
    })
});

app.get('/lastGoodPrice', (req, res) => {
    if (req.query.begin == undefined) {
        res.status(400).json({
            "error": "Must define 'begin' param"
        });
        return;
    }
    if (req.query.end == undefined) {
        res.status(400).json({
            "error": "Must define 'end' param"
        });
        return;
    }

    queryLastGoodPrice.all([
        process.env.NETWORK,
        req.query.begin,
        req.query.end
], (err, rows) => {
        if (err != undefined) {
            res.status(400).json({
                "error": err.message
            });
            return;
        }
        res.json({
            "data": rows
        })
    })
});

app.post('/mint', async (req, res) => {
    if (req.query.address == undefined) {
        res.status(400).json({
            "error": "Must define 'address' param"
        });
        return;
    }

    // Check to see if we've minted to address before
    // Want to only mint once to a single address for trading tournament
    queryMintedAddress.get([
        process.env.NETWORK,
        req.query.address
    ], async (err, row) => {
        if (err != undefined) {
            res.status(400).json({
                "error": err.message
            });
            return;
        }
        if (row != undefined) {
            res.status(400).json({
                "error": "Address has already been minted to"
            });
            return;
        }
        const amount = `100000000000000000000000`; // 100k
        const tx = await erc20.mint(req.query.address, amount);

        insertMintedAddress.run([req.query.address, process.env.NETWORK, tx.hash]);
        res.json({
            "txHash": tx.hash
        });
    })
})

app.listen(process.env.PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${process.env.PORT}`);
});

// ----------------------------
// Set up cron job for data insertion
async function insertData() {
    const block = await provider.getBlock('latest');
    const timestamp = block!.timestamp;
    const network = process.env.NETWORK;

    const deviationFactor = await priceFeed.deviationFactor();
    insertDeviationFactor.run([timestamp, network, deviationFactor!.toString()]);

    const redemptionRate = await priceFeed.redemptionRate();
    insertRedemptionRate.run([timestamp, network, redemptionRate!.toString()]);

    const LEDPrice = await priceFeed.LEDPrice();
    insertLEDPrice.run([timestamp, network, LEDPrice!.toString()]);

    const lastGoodPrice = await priceFeed.lastGoodPrice();
    insertLastGoodPrice.run([timestamp, network, lastGoodPrice!.toString()]);
}

const insertionCronJob = new CronJob(
    '0 * * * *', // every hour
    async () => {
        try {
            await insertData();
            logger.info("Inserted data from cron job");
        } catch (e) {
            console.error(e);
        }
    }
)

if (!insertionCronJob.running) {
    insertionCronJob.start();
}
