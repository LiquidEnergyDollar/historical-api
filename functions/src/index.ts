const functions = require("firebase-functions");
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as logger from "firebase-functions/logger";
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import cors from "cors";
import nacl from "tweetnacl";
import { createTablesIfNotExist, insertDeviationFactor, insertLEDPrice, insertLastGoodPrice, insertMarketPrice, insertMintedAddress, insertRedemptionRate, queryAddress, queryAllMintedAddress, queryDeviationFactor, queryLEDPrice, queryLastGoodPrice, queryMarketPrice, queryMintedAddress, queryRedemptionRate } from './sql/queries';
import { erc20, ledToken, priceFeed, provider, stabilityPool, troveManager } from './contracts/contracts';

dotenv.config();
createTablesIfNotExist();

// ----------------------------
// Set up express app/endpoints
const app: Express = express();
app.use(cors());
app.use(express.json());

app.get('/deviationFactor', async (req: Request, res: Response) => {
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
    try {
        const { rows } = await queryDeviationFactor(process.env.NETWORK!,
            parseInt(req.query.begin.toString()),
            parseInt(req.query.end.toString()));
        
        res.json({
            "data": rows
        })
    } catch (err: any) {
        res.status(400).json({
            "error": err.message
        });
    }
});

app.get('/redemptionRate', async (req, res) => {
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
    try {
        const { rows } = await queryRedemptionRate(process.env.NETWORK!,
            parseInt(req.query.begin.toString()),
            parseInt(req.query.end.toString()));
        
        res.json({
            "data": rows
        })
    } catch (err: any) {
        res.status(400).json({
            "error": err.message
        });
    }
});

app.get('/LEDPrice', async (req, res) => {
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
    try {
        const { rows } = await queryLEDPrice(process.env.NETWORK!,
            parseInt(req.query.begin.toString()),
            parseInt(req.query.end.toString()));
        
        res.json({
            "data": rows
        })
    } catch (err: any) {
        res.status(400).json({
            "error": err.message
        });
    }
});

app.get('/lastGoodPrice', async (req, res) => {
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
    try {
        const { rows } = await queryLastGoodPrice(process.env.NETWORK!,
            parseInt(req.query.begin.toString()),
            parseInt(req.query.end.toString()));
        
        res.json({
            "data": rows
        })
    } catch (err: any) {
        res.status(400).json({
            "error": err.message
        });
    }
});

app.get('/marketPrice', async (req, res) => {
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
    try {
        const { rows } = await queryMarketPrice(process.env.NETWORK!,
            parseInt(req.query.begin.toString()),
            parseInt(req.query.end.toString()));
        
        res.json({
            "data": rows
        })
    } catch (err: any) {
        res.status(400).json({
            "error": err.message
        });
    }
});

// app.post('/mint', async (req, res) => {
//     if (req.query.address == undefined || typeof req.query.address != 'string') {
//         res.status(400).json({
//             "error": "Must define 'address' param"
//         });
//         return;
//     }
//     await mint(req.query.address,
//         (txHash:string) => { 
//             res.json({
//                 "txHash": txHash
//             })
//         },
//         (errorMsg:string) => { 
//             res.status(400).json({
//                 "error": errorMsg
//             })
//         }
//     );
// })

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 */
app.post('/interactions', async function (req, res) {
    const signature = req.get('X-Signature-Ed25519');
    const timestamp = req.get('X-Signature-Timestamp');
    const body = req.rawBody; // rawBody is expected to be a string, not raw bytes
    
    const isVerified = nacl.sign.detached.verify(
    Buffer.from(timestamp + body),
    Buffer.from(signature!, 'hex'),
    Buffer.from(process.env.DISCORD_PUBLIC_KEY!, 'hex')
    );
    
    if (!isVerified) {
    return res.status(401).end('invalid request signature');
    }

    // Interaction type and data
    const { type, member, data } = req.body;

    /**
     * Handle verification requests
     */
    if (type === InteractionType.PING) {
        return res.send({ type: InteractionResponseType.PONG });
    }

    /**
     * Handle slash command requests
     * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
     */
    if (type === InteractionType.APPLICATION_COMMAND) {
        const { name, options } = data;
        const userId = member.user.id;
    
        // "faucet" command
        if (name === 'faucet') {

            if (!options || options.length != 1) {
                return res.status(400).json({
                    "error": "Missing address"
                });
            }
            const address = options[0].value;
            try {
                const { rows } = await queryMintedAddress(process.env.NETWORK!, address, userId);
                
                if (rows != undefined && rows.length > 0) {
                    res.send({
                        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                        data: {
                            content: "❌ Address or User has already received funds",
                        },
                    });
                    return;
                }
                const amount = `100000000000000000000000`; // 100k
                const tx = await erc20.mint(address, amount);

                await insertMintedAddress(process.env.NETWORK!, address, userId, tx.hash);

                // Send a message into the channel where command was triggered from
                res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: '💧 +$100k - Now head to https://app.led.money to trade.',
                    },
                });
                return;
            } catch(error) {
                // Send a message into the channel where command was triggered from
                res.send({
                    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                    data: {
                        content: "❌ " + error,
                    },
                });
            }
        } else if (name === 'score') {
            // Send a message into the channel where command was triggered from
            res.send({
                type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
                data: {
                    content: await getUserScore(userId),
                },
            });
        }
    }
    return res.status(404).json({
        "error": "Unexpected command"
    });
});

async function getUserScore(userId: string): Promise<string> {
    const { rows } = await queryAddress(process.env.NETWORK!, userId);
    if (rows == undefined || rows.length != 1) {
        return "❌ Could not locate user's address";
    }
    const address = rows[0].address;
    
    const marketPrice = await priceFeed.getMarketPrice();
    const ledBalance = await ledToken.balanceOf(address);
    const usdBalance = await erc20.balanceOf(address);
    const stabilityBalance = await stabilityPool.getCompoundedTHUSDDeposit(address);
    const stabilityUSD = await stabilityPool.getDepositorCollateralGain(address);
    const { debt, coll, pendingTHUSDDebtReward, pendingCollateralReward } = await troveManager.getEntireDebtAndColl(address);
    const ledAssets = (ledBalance + stabilityBalance);
    const ledDebt = debt;
    const usdAssets = (usdBalance + stabilityUSD + coll);
    const totalLEDInUSD = BigInt((ledAssets - ledDebt) * marketPrice) / BigInt(1e18);
    const totalAssets = usdAssets + totalLEDInUSD;
    return `USD Assets: ${usdAssets} \n LED Assets: ${ledAssets} \n LED Debt: ${ledDebt} \n 🧮 Total assets: $${totalAssets}`;
}

app.get('/test', async (req, res) => {

    const rows = await queryAllMintedAddress(process.env.NETWORK!);
    res.send(JSON.stringify(rows));

});

exports.app = functions.runWith({ maxInstances: 1}).https.onRequest(app);

// ----------------------------
// Set up cron job for data insertion
async function insertData() {
    const block = await provider.getBlock('latest');
    const timestamp = block!.timestamp;
    const network = process.env.NETWORK;

    const deviationFactor = await priceFeed.deviationFactor();
    insertDeviationFactor(network!, timestamp, deviationFactor!.toString());

    const redemptionRate = await priceFeed.redemptionRate();
    insertRedemptionRate(network!, timestamp, redemptionRate!.toString());

    const LEDPrice = await priceFeed.LEDPrice();
    insertLEDPrice(network!, timestamp, LEDPrice!.toString());

    const lastGoodPrice = await priceFeed.lastGoodPrice();
    insertLastGoodPrice(network!, timestamp, lastGoodPrice!.toString());

    const marketPrice = await priceFeed.getMarketPrice();
    insertMarketPrice(network!, timestamp, marketPrice!.toString());
}

const insertionCronJob = new CronJob(
    '*/30 * * * *', // every 30 min
    async () => {
        try {
            await insertData();
            logger.info("Inserted data from cron job");
        } catch (e) {
            logger.error(e);
        }
    }
)

if (!insertionCronJob.running) {
    insertionCronJob.start();
}
