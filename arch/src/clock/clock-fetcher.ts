import { Clock } from './clock';

export interface ClockFetcher {
    (): Clock;
}