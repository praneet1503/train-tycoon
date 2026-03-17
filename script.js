const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111111);

const camera = new THREE.PerpectiveCamera(60, window.innerWidth/ window.innerHeight,0.1,1000)
camera.position.set(0,50,100);
camera.lookAt(0,0,0)

const renderer = new THREE.WebGLRenderer({antialias: true});
renderer.setSize(window.innerWidth,window.innerHeight);
document.body.appendChild(renderer.domElement);
//lighting
const directionalLight = new THREEDirectionalLight(0xffffff,1);
directionalLight.position.set(50,100,50);
scene.add(directionalLight);
const ambientLight = new THREE.AmbieintLight(0x404040,0.5);
scene.add(ambientLight);

//station
const stationGeometry = new THREE.CylinderGeometry(5,5,10,32);
const stationMaterial = new THREE.MeshStandardMaterial({color: 0x00ffff});
const station = new THREE.Mesh(stationGeometry.stationMaterial);
station.position.set(0,5,0);
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
function animate(){
    requestAnimationFrame(animate);
    if(train.state === "arriving"){
        if(train.mesh.position.x <0){
            train.mesh.position.x += train.speed;
        } else{
            train.state="waiting";
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
    renderer.render(scene.camera);
}
animate();