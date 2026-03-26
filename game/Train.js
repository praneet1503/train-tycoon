export class Train{
    constructor({name,cost,capacity,tripTimeSeconds,mesh = null, startX = -60,endX=100}){
         this.name=name;
         this.cost=cost;
         this.capacity = capacity;
         this.tripTimeSeconds =tripTimeSeconds;

         this.mesh = mesh;
         this.startX=startX;
         this.endX=endX;
         this.stationX = 0;
         this.boardingTimeSeconds = 1.5;
         this.returnWaitSeconds = 1.5;
         this.speed = Math.abs(endX-startX)/tripTimeSeconds;

         this.passengersOnboard =0;
         this.state = "movingToStation";
         this.timer = 0;
         if (this.mesh){
            this.mesh.position.x = this.startX;
         }
    }
    update(deltaTimeSeconds, station) {
        if (this.state === "movingToStation") {
            if (this.mesh) {
                const direction = Math.sign(this.stationX - this.mesh.position.x) || 1;
                this.mesh.position.x += direction * this.speed * deltaTimeSeconds;

                if ((direction > 0 && this.mesh.position.x >= this.stationX) ||
                    (direction < 0 && this.mesh.position.x <= this.stationX)) {
                    this.mesh.position.x = this.stationX;
                    this.state = "boarding";
                    this.timer = this.boardingTimeSeconds;
                    console.log(`${this.name} stopped at station (boarding)`);
                }
            }
            return 0;
        }

        if (this.state === "boarding") {
            this.timer -= deltaTimeSeconds;
            if (this.timer <= 0 && station) {
                this._finishBoarding(station);
            }
            return 0;
        }

        if (this.state === "enroute") {
            if (this.mesh) {
                const dir = Math.sign(this.endX - this.mesh.position.x) || 1;
                this.mesh.position.x += dir * this.speed * deltaTimeSeconds;

                if ((dir > 0 && this.mesh.position.x >= this.endX) ||
                    (dir < 0 && this.mesh.position.x <= this.endX)) {
                    this.mesh.position.x = this.endX;
                    const earnings = this.completeTrip();
                    if (this.mesh) {
                        this.mesh.position.x = this.startX;
                    }
                    this.state = "movingToStation";
                    return earnings;
                }
            }
            return 0;
        }

        return 0;
    }

    _finishBoarding(station){
        this.passengersOnboard = station.takePassengers(this.capacity);
        if (this.passengersOnboard === 0) {
            this.timer = 1; 
            console.log(`${this.name} waiting for passengers...`);
            return;
        }

        this.state = "enroute";
        this.timer = this.tripTimeSeconds;
        console.log(`${this.name} boarded ${this.passengersOnboard} pax and is departing.`);
    }
    completeTrip(){
        const earnings =this.passengersOnboard *25;
        const delivered = this.passengersOnboard;
        this.passengersOnboard=0;
        this.state = "movingToStation";

        console.log(`${this.name} completed trip delivering ${delivered} pax for ${earnings}.`);
        return earnings;
    }
}