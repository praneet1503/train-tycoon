// Orchestrates overall game state and update loop integration.
// - Owns Station, Economy, and Train instances
// - Exposes an update(deltaTimeSeconds) used from the main render loop
// - Provides methods to purchase trains and spawn them into the game

import { Station } from './Station.js';
import { Economy } from './Economy.js';
import { Train } from './Train.js';

const TRAIN_STATS={
    Fazac :{cost:5000,capacity:40,tripTimeSeconds:6},
    Rorea:{cost:10000,capacity:120,tripTimeSeconds:12},
};


export class GameManager {
  constructor() {
    this.station = new Station();
    this.economy = new Economy({ startingMoney: 10000 });

    this.trains = [];
  }

  update(deltaTimeSeconds, station) {
    this.station.update(deltaTimeSeconds);
    for (const train of this.trains){
        const earned =train.update(deltaTimeSeconds,this.station);
        if (earned>0){
            this.economy.earn(earned);
        }
    }
  }

  purchaseTrain(trainType, mesh = null) {
    const stats = TRAIN_STATS[trainType];
    if (!stats) return null;
    if (!this.economy.spend(stats.cost)){
        console.warn('Not enough money to buy',trainType);
        return null;
    }
    const newTrain = new Train({
        name: trainType,
        cost: stats.cost,
        capacity: stats.capacity,
        tripTimeSeconds: stats.tripTimeSeconds,
        mesh,
    });
    this.trains.push(newTrain);
    return newTrain;
  }
}
