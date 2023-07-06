import { getPoolClient } from './dbconfig';
import fs from 'fs';
import * as logger from "firebase-functions/logger";

const enum Tables {
    DeviationFactor = "DeviationFactor",
    RedemptionRate = "RedemptionRate",
    LEDPrice = "LEDPrice",
    LastGoodPrice = "LastGoodPrice",
    MarketPrice = "MarketPrice",
    MintedAddresses = "MintedAddresses",
    UserBalanceSnapshots = "UserBalanceSnapshots"
}

async function queryFrom (table:string, network: string, timestampStart: number, timestampEnd: number) {
    const client = await getPoolClient();
    return client.query(`SELECT * FROM ${table}
    WHERE network = '${network}' AND timestamp > '${timestampStart}' AND timestamp < '${timestampEnd}' 
    ORDER BY timestamp ASC`);
}

async function insertInto (table:string, network: string, timestamp: number, value: string) {
    const client = await getPoolClient();
    return client.query(`INSERT INTO ${table} VALUES ('${timestamp}', '${network}', '${value}')`);
}

export const createTablesIfNotExist = async () => {
    logger.info('Creating tables');
    const sql = fs.readFileSync('./src/sql/create-tables.sql').toString();
    const client = await getPoolClient();
    return client.query(sql);
}

export const insertDeviationFactor = async (network: string, timestamp: number, value: string)=> {
    return insertInto(Tables.DeviationFactor, network, timestamp, value);
}

export const insertRedemptionRate = async (network: string, timestamp: number, value: string)=> {
    return insertInto(Tables.RedemptionRate, network, timestamp, value);
}

export const insertLEDPrice = async (network: string, timestamp: number, value: string)=> {
    return insertInto(Tables.LEDPrice, network, timestamp, value);
}

export const insertLastGoodPrice = async (network: string, timestamp: number, value: string)=> {
    return insertInto(Tables.LastGoodPrice, network, timestamp, value);
}

export const insertMarketPrice = async (network: string, timestamp: number, value: string)=> {
    return insertInto(Tables.MarketPrice, network, timestamp, value);
}

export const insertMintedAddress = async (network: string, address: string, userId: string, txHash: string)=> {
    const client = await getPoolClient();
    return client.query(`INSERT INTO ${Tables.MintedAddresses} VALUES ('${address}', '${userId}', '${network}', '${txHash}')`);
}

export const insertUserBalanceSnapshots = async (timestamp:number, network: string, address: string, userId: string, usdAssets: string,  ledAssets: string,  ledDebt: string,  ledPrice: string,  netValue: string)=> {
    const client = await getPoolClient();
    return client.query(`INSERT INTO ${Tables.UserBalanceSnapshots} VALUES ('${timestamp}', '${network}', '${address}', '${userId}', '${usdAssets}', '${ledAssets}', '${ledDebt}', '${ledPrice}', '${netValue}')`);
}

export const queryDeviationFactor = async (network: string, timestampStart: number, timestampEnd: number)=> {
    return queryFrom(Tables.DeviationFactor, network, timestampStart, timestampEnd);
}

export const queryRedemptionRate = async (network: string, timestampStart: number, timestampEnd: number)=> {
    return queryFrom(Tables.RedemptionRate, network, timestampStart, timestampEnd);
}

export const queryLEDPrice = async (network: string, timestampStart: number, timestampEnd: number)=> {
    return queryFrom(Tables.LEDPrice, network, timestampStart, timestampEnd);
}

export const queryLastGoodPrice = async (network: string, timestampStart: number, timestampEnd: number)=> {
    return queryFrom(Tables.LastGoodPrice, network, timestampStart, timestampEnd);
}

export const queryMarketPrice = async (network: string, timestampStart: number, timestampEnd: number)=> {
    return queryFrom(Tables.MarketPrice, network, timestampStart, timestampEnd);
}

export const queryMintedAddress = async (network: string, address: string, userId: string)=> {
    const client = await getPoolClient();
    return client.query(`SELECT * FROM ${Tables.MintedAddresses}
        WHERE network = '${network}' AND (address = '${address}' OR userId = '${userId}')`);
}

export const getFaucetedAddresses = async (network: string)=> {
    const client = await getPoolClient();
    return client.query(`SELECT * FROM ${Tables.MintedAddresses}
        WHERE network = '${network}'`);
}

export const queryAddress = async (network: string, userId: string)=> {
    const client = await getPoolClient();
    return client.query(`SELECT address FROM ${Tables.MintedAddresses}
        WHERE network = '${network}' AND userId = '${userId}'`);
}

export const queryLeaderboard = async (network: string)=> {
    const client = await getPoolClient();
    return client.query(`SELECT * FROM ${Tables.UserBalanceSnapshots}
        WHERE network = '${network}'
        AND timestamp IN (SELECT MAX(timestamp) FROM ${Tables.UserBalanceSnapshots})`);
}