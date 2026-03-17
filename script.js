import * as THREE from 'three';

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth/ window.innerHeight,0.1,1000)
camera.position.set(0,50,100);
camera.lookAt(0,0,0)

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);
//lighting
const directionalLight = new THREE.DirectionalLight(0xffffff,1);
directionalLight.position.set(50,100,50);
scene.add(directionalLight);
const ambientLight = new THREE.AmbientLight(0x404040,0.5);
scene.add(ambientLight);

//station
const stationGeometry = new THREE.CylinderGeometry(5,5,10,32);
const stationMaterial = new THREE.MeshStandardMaterial({color: 0x00ffff});
const station = new THREE.Mesh(stationGeometry,stationMaterial);
station.position.set(0,5,0);

const trackGeometry = new THREE.BoxGeometry(200,0.5,4);
const trackMaterial = new THREE.MeshStandardMaterial({color: 0x555555});

const track1 = new THREE.Mesh(trackGeometry,trackMaterial);
track1.position.set(0,0.25,-15);
scene.add(track1)

const track2 = new THREE.Mesh(trackGeometry, trackMaterial);
track2.position.set(0,0.25,15);
scene.add(track2);

let tracks = [
    {z:-15,occupied:false},
    {z:15,occupied:false}
];
let trains=[];

scene.add(station);

//train 
function createTrain(){
    const trainGeometry = new THREE.BoxGeometry(10,5,5);
    const trainMaterial = new THREE.MeshStandardMaterial({color: 0xff8800});
    const trainMesh = new THREE.Mesh(trainGeometry,trainMaterial);
    trainMesh.position.set(-50,2.5,0);
    scene.add(trainMesh);
    return {
        mesh: trainMesh,
        speed: 0.3 + Math.random()*0.3,
        destination:["City A","City B","City C"][Math.floor(Math.random()*0.3)],
        state: "arriving",
        timer: 300,
        loaded: 0,
        capacity: 5+Math.floor(Math.random()*10)
    };
}
let train = createTrain();

// things (to be added more in here btw)
let goods = [
    {name:"Food",qty:10,value:5},
    { name: "Coal", qty: 8, value: 8 },
    { name: "Tech", qty: 5, value: 15 }
];
let money = 0;


window.addEventListener('keydown',(e)=>{
    if(train.state !== "waiting") return;
    if(e.key === '1'&& goods[0].qty>0){goods[0].qty--; money +=goods[0].value; train.loaded++;}
    if(e.key === '2'&& goods[1].qty>0){goods[1].qty--; money +=goods[1].value; train.loaded++;}
    if(e.key === '3'&& goods[2].qty>0){goods[2].qty--; money +=goods[2].value; train.loaded++;}
});

const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.top='10px';
overlay.style.left = '10px';
overlay.style.color='white';
overlay.style.fontFamily='Arial';
overlay.style.fontSize='16px';
document.body.appendChild(overlay);

function updateUI(){
    let depotText = goods.map((g,i)=>`${i+1}. ${g.name}: ${g.qty}`).join('<br>');
    let trainText = train.state === "waiting" ? `Train to ${train.destination} | Capacity: ${train.capacity} | Time: ${Math.floor(train.timer/60)}s<br>Press 1/2/3 to load goods` : '';
    overlay.innerHTML = `Money: $${money}<br>Depot:<br>${depotText}<br>${trainText}`;
}
function showContractPopup(){
    const popup = document.createElement('div');
    popup.style.top = '50%';
    popup.style.position ='absolute';
    popup.style.left = '50%';
    popup.style.transform = 'translate(-50%,-50%)';
    popup.style.backgroundColor='#222';
    popup.style.padding='20px';
    popup.style.border='2px solid white';
    popup.style.textAlign='center';
    popup.style.color='white';
    popup.style.zIndex='100';
    popup.innerHTML=`
    <h2>contract</h2>
    <p>after signing this contract ,the train will act as your temporary carriage for other stations do you wish to accept it ?</p>
    <button id="refuseBtn" style="margin: 10px; padding: 5px 10px; cursor: pointer;">refuse $0</button>
    <button id="acceptBtn" style="margin: 10px; padding: 5px 10px; cursor: pointer;">accept$100</button>
`;
document.body.appendChild(popup);
document.getElementById('refuseBtn').onclick=()=>{
    popup.remove();
    train.state = "leaving";
};
     document.getElementById('acceptBtn').onclick=()=>{
        popup.remove();
        money -=100;
        train.state = "waiting";
     };
}


function trySpawnTrain() {

    const availableTracks = tracks.filter(t => !t.occupied);
    if (availableTracks.length === 0) return; 
    const track = availableTracks[Math.floor(Math.random() * availableTracks.length)];
    track.occupied = true; 

    const trainGeometry = new THREE.BoxGeometry(10, 5, 5);
    const trainMaterial = new THREE.MeshStandardMaterial({color: 0xff8800});
    const trainMesh = new THREE.Mesh(trainGeometry, trainMaterial);
    trainMesh.position.set(-60, 2.5, track.z);
    scene.add(trainMesh);
    
    trains.push({
        mesh: trainMesh,
        speed: 0.3 + Math.random() * 0.3,
        destination: ["City A", "City B", "City C"][Math.floor(Math.random() * 3)],
        state: "arriving",
        timer: 300,
        loaded: 0,
        capacity: 5 + Math.floor(Math.random() * 10),
        track: track 
    });
}

trySpawnTrain();

function animate(){
    requestAnimationFrame(animate);
    if(train.state === "arriving"){
        if(train.mesh.position.x < 0){
            train.mesh.position.x += train.speed;
        } else {
            train.state = "contract"; 
            showContractPopup();     
        }
    } else if (train.state === "waiting"){
        train.timer--;
        if(train.timer<=0){
            train.state = "leaving";
        }
    } else if (train.state === "leaving"){
        train.mesh.position.x +=train.speed;
        if(train.mesh.position.x>100){
            scene.remove(train.mesh);
            train = createTrain();
        }
    }
    updateUI();
    renderer.render(scene,camera);
}
animate();