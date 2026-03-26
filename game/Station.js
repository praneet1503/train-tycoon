// Responsible for tracking passenger supply and station upgrades.
// - Generates passengers over time (deltaTime driven)
// - Enforces max capacity
// - Applies bonuses from upgrades (toilets + canteen)

export class Station {
  constructor() {
    // 10 passengers per minute = 6000 passengers per hour
    this.baseGenerationPerHour = 10 * 600;
    this.maxCapacity = 200;
    this.passengers = 0;

    // Upgrade levels: 0 = none, 1 = level1, 2 = level2
    this.toiletLevel = 0;
    this.canteenLevel = 0;
  }

  update(deltaTimeSeconds) {
    const basePaxPerHour = this.baseGenerationPerHour;
    const toiletBonus = this.toiletLevel === 1 ? 15 :this.toiletLevel === 2 ? 30: 0;
    const canteenBnous = this.canteenLevel === 1 ? 30 : this.canteenLevel === 2 ? 60:0;
    const totalPaxPerHour = basePaxPerHour + toiletBonus+canteenBnous;
    const paxPerSecond =totalPaxPerHour/3600;
    this.passengers+=paxPerSecond*deltaTimeSeconds;
    if (this.passengers>this.maxCapacity){
        this.passengers = this.maxCapacity;
    }
    console.log(`station pax ${Math.floor(this.passengers)}/${this.maxCapacity}`);

  }
  upgradeToilets(){
    if(this.toiletLevel<2){
        this.toiletLevel +=1;
    }
  }

  upgradeCanteen() {
    if (this.canteenLevel<2){
        this.canteenLevel+=1;

    }
  }

  takePassengers(amount) {
    const taken = Math.min(amount,Math.floor(this.passengers));
    this.passengers -= taken;
    return taken;
  }
}
