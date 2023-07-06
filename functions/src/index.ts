const functions = require("firebase-functions");
import express, { Express, Request, Response } from 'express';
import dotenv from 'dotenv';
import { CronJob } from 'cron';
import * as logger from "firebase-functions/logger";
import { InteractionType, InteractionResponseType } from 'discord-interactions';
import cors from "cors";
import nacl from "tweetnacl";
import { createTablesIfNotExist, getFaucetedAddresses, insertDeviationFactor, insertLEDPrice, insertLastGoodPrice, insertMarketPrice, insertMintedAddress, insertRedemptionRate, insertBalanceSnapshots, queryAddress, queryDeviationFactor, queryLEDPrice, queryLastGoodPrice, queryLeaderboard, queryMarketPrice, queryMintedAddress, queryRedemptionRate } from './sql/queries';
import { erc20, ledToken, priceFeed, provider, stabilityPool, troveManager } from './contracts/contracts';
const { Client, GatewayIntentBits } = require('discord.js');


dotenv.config();
createTablesIfNotExist();
const discordClient = new Client({ intents: [GatewayIntentBits.GuildMembers] });
discordClient.login(process.env.DISCORD_TOKEN!);


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
    const snapshot = await getUserBalanceSnapshot(address);
    
    return `USD Assets: $${snapshot.usdBalance! / BigInt(1e18)}\nLED Assets: ${snapshot.ledBalance! / BigInt(1e18)} LED\nLED Debt: ${snapshot.ledDebt! / BigInt(1e18)} LED\nLED Price: $${(Number(snapshot.marketPrice) / 1e18).toFixed(2) }\n🧮 Total assets: $${snapshot.totalAccountValue() / BigInt(1e18)}`;
}

class UserBalanceSnapshot {
    timestamp: number | undefined;
    usdBalance: bigint | undefined;
    ledBalance: bigint | undefined;
    ledDebt: bigint | undefined;
    marketPrice: bigint | undefined;
    getTotalLED(): bigint {
        if (this.ledBalance == undefined || this.ledDebt == undefined) {
            throw new Error(`Uninitialized values ${this.ledBalance} ${this.ledDebt}`);
        }
        return this.ledBalance - this.ledDebt;
    }
    totalAccountValue(): bigint {
        if (this.ledBalance == undefined || 
            this.ledDebt == undefined || 
            this.marketPrice == undefined || 
            this.usdBalance == undefined) {
            throw new Error(`Uninitialized values ${this.ledBalance} ${this.ledDebt} ${this.marketPrice} ${this.usdBalance}`);
        }
        const totalLEDInUSD = (this.getTotalLED() * this.marketPrice) / BigInt(1e18);
        return this.usdBalance + totalLEDInUSD;
    }
}

async function getUserBalanceSnapshot(address: string): Promise<UserBalanceSnapshot> {
    if (!address || address.length != 42) {
        throw new Error("Invalid address " + address);
    }
    const snapshot = new UserBalanceSnapshot();
    
    snapshot.marketPrice = await priceFeed.getMarketPrice();
    const ledBalance = await ledToken.balanceOf(address);
    const usdBalance = await erc20.balanceOf(address);
    const stabilityBalance = await stabilityPool.getCompoundedTHUSDDeposit(address);
    const stabilityUSD = await stabilityPool.getDepositorCollateralGain(address);
    const { debt, coll, pendingTHUSDDebtReward, pendingCollateralReward } = await troveManager.getEntireDebtAndColl(address);
    snapshot.ledBalance = (ledBalance + stabilityBalance);
    snapshot.ledDebt = debt;
    snapshot.usdBalance = (usdBalance + stabilityUSD + coll);
    return snapshot;
}

app.get('/leaderboard', async (req, res) => {
    const { rows } = await queryLeaderboard(process.env.NETWORK!);
    res.send(JSON.stringify(rows));
});

app.get('/takeSnapshot', async (req, res) => {
    const snapshotPrice = req.query.price;
    if (!snapshotPrice) {
        res.send("Missing \"price\" query string parameter");
    }
    const { rows }  = await getFaucetedAddresses(process.env.NETWORK!);
    const userSnapshots = [];
    for (let i = 0; i < rows.length; i++) {
        const user = rows[i];
        userSnapshots.push(new Promise(async (resolve, reject) => {
            
                const discordUser = await discordClient.users.fetch(user.userid);
                const snapshot = await getUserBalanceSnapshot(user.address);
                // Overwrite marketPrice with the provided price
                snapshot.marketPrice = BigInt(snapshotPrice!.toString());
                resolve(user.address + "," +
                    user.userid + "," +
                    discordUser.username + "," +
                    discordUser.displayAvatarURL() + "," +
                    snapshot.usdBalance!.toString() + "," +
                    snapshot.ledBalance!.toString() + "," +
                    snapshot.ledDebt!.toString() + "," +
                    snapshot.marketPrice!.toString() + "," +
                    snapshot.totalAccountValue().toString())
            })
        );
    }
    const snapshots = await Promise.all(userSnapshots);
    var result = "";
    snapshots.forEach((snapshot) => {
        result += snapshot + "<br>";
    });
    res.send(result);
});

app.get('/testScore', async (req, res) => {
    const snapshot = await getUserScore("652677723197800467");
    res.send(JSON.stringify(snapshot));
});

app.get('/test', async (req, res) => {
    const rows = await getFaucetedAddresses(process.env.NETWORK!);
    res.send(JSON.stringify(rows));
});

exports.app = functions.runWith({ maxInstances: 1}).https.onRequest(app);

// ----------------------------
// Set up cron job for data insertion
async function insertData() {
    const block = await provider.getBlock('latest');
    const timestamp = block!.timestamp;
    const network = process.env.NETWORK!;

    const deviationFactor = await priceFeed.deviationFactor();
    insertDeviationFactor(network, timestamp, deviationFactor!.toString());

    const redemptionRate = await priceFeed.redemptionRate();
    insertRedemptionRate(network, timestamp, redemptionRate!.toString());

    const LEDPrice = await priceFeed.LEDPrice();
    insertLEDPrice(network, timestamp, LEDPrice!.toString());

    const lastGoodPrice = await priceFeed.lastGoodPrice();
    insertLastGoodPrice(network, timestamp, lastGoodPrice!.toString());

    const marketPrice = await priceFeed.getMarketPrice();
    insertMarketPrice(network, timestamp, marketPrice!.toString());

    const { rows }  = await getFaucetedAddresses(network);
    const insertions = [];
    for (let i = 0; i < rows.length; i++) {
        const user = rows[i];
        insertions.push(new Promise(async (res, rej) => {
            try {
                const snapshot = await getUserBalanceSnapshot(user.address);
                const discordUser = await discordClient.users.fetch(user.userid);
                    
                    await insertBalanceSnapshots(
                        timestamp,
                        network,
                        user.address,
                        user.userid,
                        discordUser.username,
                        discordUser.displayAvatarURL(),
                        snapshot.usdBalance!.toString(),
                        snapshot.ledBalance!.toString(),
                        snapshot.ledDebt!.toString(),
                        snapshot.marketPrice!.toString(),
                        snapshot.totalAccountValue().toString()
                    
                    );
            } catch (err) {
                logger.error("Could not calculate user balance snapshot " + err);
            }
        }));
    }
    await Promise.all(insertions);
}

const insertionCronJob = new CronJob(
    '*/1 * * * *', // every 30 min
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
