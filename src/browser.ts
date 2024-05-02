import LegoBoost from './legoBoost';
import { BoostConnector } from './boostConnector';

const boost = new LegoBoost();

// @ts-ignore
window.boost = boost;

// @ts-ignore
boost.logDebug = console.log;

