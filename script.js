import * as THREE from 'three';
import { createTrainEngine } from './engine.js';
import { GameManager } from './game/GameManager.js';

const gameManager = new GameManager();

function spawnTrain(type) {
  const trackZ = gameManager.trains.length % 2 === 0 ? -15 : 15;
  const mesh = createTrainEngine();
  mesh.position.set(-60, 2.5, trackZ);
  scene.add(mesh);

  gameManager.purchaseTrain(type, mesh);
}

window.addEventListener('keydown', (e) => {
  if (e.key === 't') {
    spawnTrain('Fazac');
  }
  if (e.key === 'y') {
    spawnTrain('Rorea');
  }
});

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

scene.add(station);

const overlay = document.createElement('div');
overlay.style.position = 'absolute';
overlay.style.top = '10px';
overlay.style.left = '10px';
overlay.style.color = 'white';
overlay.style.fontFamily = 'Arial';
overlay.style.fontSize = '16px';
overlay.style.backgroundColor = 'rgba(0,0,0,0.35)';
overlay.style.padding = '8px';
overlay.style.borderRadius = '6px';
document.body.appendChild(overlay);

function updateUI() {
  const money = Math.floor(gameManager.economy.balance);
  const waiting = Math.floor(gameManager.station.passengers);
  const trains = gameManager.trains.length;

  overlay.innerHTML = `Money: $${money}<br>` +
    `Waiting pax: ${waiting}<br>` +
    `Owned trains: ${trains}<br><br>` +
    `Press T to buy Fazac ($5000) or Y to buy Rorea ($10000)`;
}



let lastTime=performance.now();

function animate(){
    requestAnimationFrame(animate);
    const now = performance.now();
    const deltaTime = (now - lastTime)/1000;
    lastTime = now;
    gameManager.update(deltaTime);
    updateUI();
    renderer.render(scene,camera);
}
animate();
