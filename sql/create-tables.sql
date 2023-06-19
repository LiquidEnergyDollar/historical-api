CREATE TABLE IF NOT EXISTS DeviationFactor (
       timestamp INTEGER NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_DeviationFactorTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS RedemptionRate (
       timestamp INTEGER NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_RedemptionRateTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS LEDPrice (
       timestamp INTEGER NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_LEDPriceTimestamp UNIQUE (timestamp)
);

CREATE TABLE IF NOT EXISTS LastGoodPrice (
       timestamp INTEGER NOT NULL,
       value VARCHAR(200) NOT NULL,

       CONSTRAINT IX_LastGoodPriceTimestamp UNIQUE (timestamp)
);
