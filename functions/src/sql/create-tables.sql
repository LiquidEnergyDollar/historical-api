CREATE TABLE IF NOT EXISTS DeviationFactor (
       timestamp BIGINT NOT NULL,
       network VARCHAR(200) NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_DeviationFactorTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS RedemptionRate (
       timestamp BIGINT NOT NULL,
       network VARCHAR(200) NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_RedemptionRateTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS LEDPrice (
       timestamp BIGINT NOT NULL,
       network VARCHAR(200) NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_LEDPriceTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS LastGoodPrice (
       timestamp BIGINT NOT NULL,
       network VARCHAR(200) NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_LastGoodPriceTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS MarketPrice (
       timestamp BIGINT NOT NULL,
       network VARCHAR(200) NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_MarketPriceTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS MintedAddresses (
       address VARCHAR(200) NOT NULL,
       userId VARCHAR(200) NOT NULL,
       network VARCHAR(200) NOT NULL,
       txhash VARCHAR(200) NOT NULL,

       CONSTRAINT IX_MintedAddressesValue UNIQUE (address),
       CONSTRAINT IX_MintedUserIdValue UNIQUE (userId)
);
