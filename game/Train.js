// Responsible for representing a train trip and its state.
// - Tracks loading from the station.
// - Tracks trip timer and delivery (income trigger).
// - Exposes an update(deltaTime) method to progress travel.

export class Train{
    constructor({name,cost,capacity,tripTimeSeconds,mesh = null, startX = -60,endX=100}){
         this.name=name;
         this.cost=cost;
         this.capacity = capacity;
         this,tripTimeSeconds =tripTimeSeconds;

         this.mesh = mesh;
         this.startX=startX;
         this.endX=endX;
         this.stationX = 0;
         this.boardingTimeSeconds = 1.5;
         this.speed = Math.abs(endX-startX)/tripTimeSeconds;

         this.passengersOnboard =0;
         this.state = "movingToStation";
         this.timer = 0;
         if (this.mesh){
            this.mesh.position.x = this.startX;
         }
    }
    update(deltaTimeSeconds,station){
        if (this.state === "movingToStation"){
            if (this.mesh){
                const direction = Math.sign(this.stationX - this.mesh.position.x);
                this.mesh.position.x += direction * this.speed *deltaTimeSeconds;

                if (
                    (direction > 0 && this.mesh.position.x>=this.stationX) ||
                    (direction < 0 && this.mesh.position.x<=this.stationX)
                ){
                    this.mesh.position.x = this.stationX;
                    this.state = "boarding";
                    this.timer = this.boardingTimeSeconds;
                    console.log(`${this.name} stopped at station (boarding)`);
                }
            }
            return 0;
        }
        if (this.state ==="boarding"){
            this.timer -=deltaTimeSeconds;
            if(this.timer<= 0 && station){
                this._finishBoarding(station);
            }
            return 0;
        }
        if (this.state !== "enroute") return 0;

        if(this.mesh){
            this.mesh.position.x+=this.speed*deltaTimeSeconds;
        }
        this.timer-=deltaTimeSeconds;
        if(this.timer<=0){
            return this.completeTrip();
        }
        return 0;
    }
    _finishBoarding(station){
        this.passengersOnboard = station.takePassengers(this.capacity);
        this.state = "enroute";
        this.timer = this.tripTimeSeconds;
        console.log(`${this.name} boarded ${this.passengersOnboard} pax and is departing.`);
    }
    completeTrip(){
        const earnings =this.passengersOnboard *25;
        const delivered = this.passengersOnboard;
        this.passengersOnboard=0;
        this.state = "movingToStation";
        this.timer = 0;
        if (this.mesh){
            this.mesh.position.x = this.startX;
        }
        console.log(`${this.name} completed trip delivering ${delivered} pax for ${earnings}.`);
        return earnings;
    }
}