import * as ethers from 'ethers';
import pricefeedABI from './abi/PriceFeed.json';
import erc20ABI from './abi/ERC20.json';
import stabilityPoolABI from './abi/StabilityPool.json';
import troveManagerABI from './abi/TroveManager.json';
import ledTokenABI from './abi/LEDToken.json';
import contracts from './sepolia.json';

const contractAddresses = contracts.addresses;

// ----------------------------
// Set up ethers
export const provider = new ethers.InfuraProvider(
    process.env.NETWORK,
    process.env.INFURA_API_KEY,
);

const signer = new ethers.Wallet(
    process.env.DEPLOYER_PRIVATE_KEY!,
    provider
)

export const priceFeed = new ethers.Contract(
    contractAddresses.priceFeed,
    pricefeedABI,
    signer
);

export const erc20 = new ethers.Contract(
    contractAddresses.erc20,
    erc20ABI,
    signer
);

export const stabilityPool = new ethers.Contract(
    contractAddresses.stabilityPool,
    stabilityPoolABI,
    signer
);

export const troveManager = new ethers.Contract(
    contractAddresses.troveManager,
    troveManagerABI,
    signer
);

export const ledToken = new ethers.Contract(
    contractAddresses.thusdToken,
    ledTokenABI,
    signer
);