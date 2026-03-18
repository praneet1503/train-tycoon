import * as THREE from 'three';

export function createTrainEngine(){
    const engine = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({color:0xff6b6b});
    const cabinMat = new THREE.MeshStandardMaterial({color: 0x4ecdc4});
    const darkMat = new THREE.MeshStandardMaterial({color: 0x2d3436});
    const accentMat = new THREE.MeshStandardMaterial({color:0xffd166});
    const body = new THREE.Mesh(
        new THREE.BoxGeometry(4,1.5,2),
        bodyMat
    );
    body.position.y = 0.5;
    engine.add(body);
    const boiler = new THREE.Mesh(
        new THREE.CylinderGeometry(0.9,0.9,3,24),
        accentMat
    );
    boiler.rotation.z = Math.PI/2;
    boiler.position.set(1.5,0.8,0);
    engine.add(boiler);
    const cabin=new THREE.Mesh(
        new THREE.BoxGeometry(1.8,1.4,1.8),
        cabinMat
    );
    cabin.position.set(-1.2,1.2,0);
    engine.add(cabin);

    const windowGeo =new THREE.BoxGeometry(0.5,0.5,0.1);
    const windowMat = new THREE.MeshStandardMaterial({color:0x74b9ff});
    const window1 = new THREE.Mesh(windowGeo,windowMat);
    window1.position.set(-1.2,1.3,0.95);
    
    const window2 = window1.clone();
    window2.position.z = -0.95;
    engine.add(window1,window2);


    const chimney = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3,0.4,1,16),
        darkMat
    );
    chimney.position.set(2.5,1.6,0);
    engine.add(chimney);


    const wheels = [];
    function createWheel(x,z){
        const wheel = new THREE.Mesh(
            new THREE.CylinderGeometry(0.5,0.5,0.6,20),
            darkMat
        );
        wheel.rotation.z = Math.PI /2;
        wheel.position.set(x,-0.2,z);
        wheels.push(wheel);
        return wheel;
    }

    [-1.8,0,1.8].forEach(x =>{
        engine.add(createWheel(x,1));
        engine.add(createWheel(x,-1));
    });

    const face = new THREE.Mesh(
        new THREE.CircleGeometry(0.6,20),
        new THREE.MeshStandardMaterial({color:0xffffff})
    );
    face.position.set(3,0.8,0);
    face.rotation.y = Math.PI/2;
    engine.add(face);


    const eyeGeo = new THREE.SphereGeometry(0.1,16,16);
    const eyeMat = new THREE.MeshStandardMaterial({color:0x000000});

    const eye1 = new THREE.AxesHelper(eyeGeo,eyeMat);
    eye1.position.set(3.2,0.9,0.2);

    const eye2 =eye1.clone();
    eye2.position.z = -0.2;
    engine.add(eye1,eye2);

    engine.userData.update = ()=>{
        wheels.forEach(w=> {
            wheels.forEach(w =>{
                w.rotation.x +=0.1;
            });
        })
        engine.position.y =Math.sin(Date.now()*0.005)*0.05;
    };

    engine.scale.set(2, 2, 2);

    return engine;

}
