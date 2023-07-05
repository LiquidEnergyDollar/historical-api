import 'dotenv/config';
import { InstallGlobalCommands } from './discord';

// faucet command
const FAUCET_COMMAND = {
  name: 'faucet',
  description: 'Faucet the provided address with test collateral',
  type: 1,
  options: [
    {
      type: 3,
      name: 'address',
      description: 'Address to faucet',
      min_length: 42,
      max_lenght: 42,
      required: true,
    },
  ] 
};

const ALL_COMMANDS = [FAUCET_COMMAND];

InstallGlobalCommands(process.env.APP_ID!, ALL_COMMANDS);