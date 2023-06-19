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
    `INSERT INTO DeviationFactor VALUES (?, ?)`
);

const insertRedemptionRate = db.prepare(
    `INSERT INTO RedemptionRate VALUES (?, ?)`
);

const insertLEDPrice = db.prepare(
    `INSERT INTO LEDPrice VALUES (?, ?)`
);

const insertLastGoodPrice = db.prepare(
    `INSERT INTO LastGoodPrice VALUES (?, ?)`
);

const queryDeviationFactor = db.prepare(
    `SELECT * FROM DeviationFactor
     WHERE timestamp > ? AND timestamp < ?`
);

const queryRedemptionRate = db.prepare(
    `SELECT * FROM RedemptionRate
     WHERE timestamp > ? AND timestamp < ?`
);

const queryLEDPrice = db.prepare(
    `SELECT * FROM LEDPrice
     WHERE timestamp > ? AND timestamp < ?`
);

const queryLastGoodPrice = db.prepare(
    `SELECT * FROM LastGoodPrice
     WHERE timestamp > ? AND timestamp < ?`
);

// ----------------------------
// Set up ethers
const provider = new ethers.InfuraProvider(
    'sepolia',
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
app.use(pinoHttp({logger: logger}));

app.get('/deviationFactor', (req: Request, res: Response) => {
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
    queryDeviationFactor.all([req.query.begin, req.query.end], (err, rows) => {
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
    queryRedemptionRate.all([req.query.begin, req.query.end], (err, rows) => {
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
    queryLEDPrice.all([req.query.begin, req.query.end], (err, rows) => {
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

    queryLastGoodPrice.all([req.query.begin, req.query.end], (err, rows) => {
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
    if (req.query.amount == undefined) {
        res.status(400).json({
            "error": "Must define 'amount' param"
        });
        return;
    }
    const tx = await erc20.mint(req.query.address, req.query.amount);
    res.json({
        "txHash": tx.hash
    });
})

app.listen(process.env.PORT, () => {
    console.log(`⚡️[server]: Server is running at http://localhost:${process.env.PORT}`);
});

// ----------------------------
// Set up cron job for data insertion
async function insertData() {
    const block = await provider.getBlock('latest');
    const timestamp = block!.timestamp;

    const deviationFactor = await priceFeed.deviationFactor();
    insertDeviationFactor.run([timestamp, deviationFactor!.toString()]);

    const redemptionRate = await priceFeed.redemptionRate();
    insertRedemptionRate.run([timestamp, redemptionRate!.toString()]);

    const LEDPrice = await priceFeed.LEDPrice();
    insertLEDPrice.run([timestamp, LEDPrice!.toString()]);

    const lastGoodPrice = await priceFeed.lastGoodPrice();
    insertLastGoodPrice.run([timestamp, lastGoodPrice!.toString()]);
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
