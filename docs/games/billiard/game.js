const GRAVITY = -9.80665;
const AIR_DENSITY = 1.2250;
const DELTA_TIME = 1/1000;
const WIND_VELOCITY = new THREE.Vector3(0,0,100);
const FRAME_PER_SECOND = 60;
const COEFFICIENT_RESTITUTION = 1;
let canvas_size = [Math.floor(window.innerWidth * 4 / 5), Math.floor(window.innerHeight * 4 / 5)]; //game screen size

//Rendering Instances (three.js)
//three.js renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("game_canvas"),
    alpha: true
});
let RADIUS = 0.1;
let AREA = 1;
let MOMENTUM = 4;
const sphereGeometry = new THREE.SphereGeometry(RADIUS);
const sphereMaterial =  new THREE.MeshStandardMaterial({
    color: 0x0000ff
});
const ghostMaterial =  new THREE.MeshStandardMaterial({
    color: 0x0000ff,
    transparent: true,
    depthTest: true,
    opacity: 0.3
});

function main() {
    renderer.setSize(canvas_size[0], canvas_size[1]);
    renderer.setPixelRatio(window.devicePixelRatio);
    const world = new World();
    world.enableTick();
    //world.objects[2].momentum.add(new THREE.Vector3(-0.5,0,0.5));
    world.addObject(new WorldObject(0,0,0,100000000000,0.34,1**3*Math.PI*4/3,new THREE.SphereGeometry(1),new THREE.MeshStandardMaterial({color: 0xff0000})));
    for (let i = 1; i < 30; i++) {
        world.addObject(new WorldObject(Math.random()*AREA+1,Math.random()*AREA+1,Math.random()*AREA+1,-1,0.34,RADIUS**3*Math.PI*4/3,sphereGeometry,sphereMaterial));
        world.objects[i].momentum.add(world.objects[i].location.clone().sub(world.objects[0].location).cross(new THREE.Vector3(1,1,1)).normalize().multiplyScalar(MOMENTUM));
    }
    world.addObject(new WorldObject(10,10,0,100000000000,0.34,1**3*Math.PI*4/3,new THREE.SphereGeometry(1),new THREE.MeshStandardMaterial({color: 0xff0000})));
    let flag = true;
    if (flag){
        for (const object of world.objects) {
            setInterval(()=>{
                let ghost = new THREE.Mesh(sphereGeometry, ghostMaterial);
                world.scene.add(ghost);
                ghost.position.copy(object.location);
                setTimeout(()=>{
                    world.scene.remove(ghost);
                },1000)
            },200)
        }
    }

}

class WorldObject {
    constructor(x, y, z, m, Cd, s, geometry,material) {
        this.location = new THREE.Vector3(x, y, z);
        this.momentum = new THREE.Vector3();
        this.mass = Number(m);
        this.drag = Number(Cd);
        this.surface = Number(s);
        this.mesh = new THREE.Mesh(geometry, material);
        this.force = new THREE.Vector3();
    }
    /*
    get force() {
        let gravity = new THREE.Vector3(0, 0, GRAVITY * this.mass);
        let drag = new THREE.Vector3();
        let r_velocity = this.momentum.clone().divideScalar(this.mass).sub(WIND_VELOCITY);
        drag.x =(r_velocity.x > 0 ? -1:1) * 0.5 * AIR_DENSITY * (r_velocity.x ** 2) * this.surface * this.drag;
        drag.y =(r_velocity.y > 0 ? -1:1) * 0.5 * AIR_DENSITY * (r_velocity.y ** 2) * this.surface * this.drag;
        drag.z =(r_velocity.z > 0 ? -1:1) * 0.5 * AIR_DENSITY * (r_velocity.z ** 2) * this.surface * this.drag;
        let force = new THREE.Vector3();
        force.addVectors(gravity, drag);
        return force;
    }*/
    appendForce(target){
        let l = target.location.clone().sub(this.location)
        let f = l.clone();
        let n1 = 0.0000000003*target.mass*this.mass/(f.lengthSq());
        if (n1)console.log(n1);
        f.normalize().multiplyScalar(n1);
        if(l.length()<RADIUS&&l.dot(target.momentum)<0&&false){
            target.momentum.multiplyScalar(-1*COEFFICIENT_RESTITUTION);
        }else{
            target.force.add(f);
        }
    }

    get velocity(){
        return this.momentum.length()/this.mass;
    }

    get kineticEnergy() {
        return 0.5 * this.momentum.lengthSq() / this.mass;
    }

    update() {
        this.location.add(this.momentum.clone().divideScalar(this.mass).multiplyScalar(DELTA_TIME));
        this.momentum.add(this.force.multiplyScalar(DELTA_TIME));
        /*
        if (this.location.x<-AREA/2||this.location.x>AREA/2)this.momentum.x=-this.momentum.x;
        if (this.location.y<-AREA/2||this.location.y>AREA/2)this.momentum.y=-this.momentum.y;
        if (this.location.z<-AREA/2||this.location.z>AREA/2)this.momentum.z=-this.momentum.z;
        */
        this.force = new THREE.Vector3();
    }

}

class World{
    constructor() {
        this.objects = [];
        this.camera = new THREE.PerspectiveCamera(
            60.0,
            canvas_size[0] / canvas_size[1],
            0.1,
            10000
        );
        this.directionalLight = new THREE.DirectionalLight(
            0xffffff
        );
        this.timerID = null;
        this.worldTime = 0;
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color( 0x000000 );
        this.camera.position.set(0,0,3);
        this.camera.lookAt(0,0,0);
        this.camera.up.set(0,1,0);
        this.directionalLight.position.set(1,1,1);
        this.scene.add(this.directionalLight);
        this.cameraTarget = null;
        this.cameraDistance = 0;
    }
    update(){
        for (let i = 0; i < this.objects.length; i++) {
            for (let j = 0; j < this.objects.length; j++) {
                if (i!==j){
                    this.objects[i].appendForce(this.objects[j]);
                }
            }
        }
        for (const object of this.objects) {
            object.update();
        }
    }
    updateMesh(){
        for (const object of this.objects) {
            object.mesh.position.copy(object.location);
        }
    }
    enableTick(){
        this.timerID = setInterval(()=>{
            for (let i = 0; i < 1/FRAME_PER_SECOND; i+=DELTA_TIME) {
                this.worldTime += DELTA_TIME;
                this.update();
            }
            if(this.cameraTarget !== null){
                let r_loc = this.cameraTarget.momentum.clone().normalize().multiplyScalar(-1*this.cameraDistance);
                if(r_loc.length()===0)r_loc = new THREE.Vector3(0,0,this.cameraDistance);
                this.camera.position.copy(this.cameraTarget.location.clone().add(r_loc));
                this.camera.lookAt(this.cameraTarget.location.clone());
            }
            let ins = new THREE.Vector3();
            let mass = 0;
            for (const object of this.objects) {
                ins.add(object.location.clone().multiplyScalar(object.mass));
                mass+=object.mass;
            }
            ins.divideScalar(mass);
            this.camera.lookAt(ins.x,ins.y,ins.z);
            this.camera.position.copy(ins);
            this.camera.position.z+=50;
            this.updateMesh();
            renderer.render(this.scene, this.camera);
        },1000/FRAME_PER_SECOND);
    }
    disableTick(){
        clearInterval(this.timerID);
        this.timerID = null;
    }
    addObject(object){
        this.objects.push(object);
        this.scene.add(object.mesh);
    }
    lockCameraToObject(obj, dist){
        this.cameraTarget = obj;
        this.cameraDistance = dist;
    }
}

main();