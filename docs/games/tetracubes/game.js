//VARIABLES
//Global Constants
//colors
const BLACK = [0, 0, 0];
const GRAY = [64, 64, 64];
const RED = [255, 0, 0];
const GREEN = [0, 255, 0];
const BLUE = [0, 0, 255];
const CYAN = [0, 255, 255];
const MAGENTA = [255, 0, 255];
const YELLOW = [255, 255, 0];
const PURPLE = [155, 48, 255];
const ORANGE = [255, 127, 0];
const COLOR_LIST = [RED, GRAY, BLUE, CYAN, MAGENTA, YELLOW, PURPLE, ORANGE];
//keys
const MOVE_VALUE = {w: 0, d: 1, s: 2, a: 3};
//game - tetris
const GAME_WIDTH = 5;
const GAME_HEIGHT = 20;
//game - framework
const TICK = 60;
const CAM_ALTITUDE_MAX = 500;
const CAM_ALTITUDE_MIN = 200;
const VIEW_HORIZONTAL_DISTANCE = 150;
const FPS = 30;
const KEYBOARD_FPS = 5;
//Global Variables
//game - tetris
let current_color = null; //current active block color
let active_block = []; //current active movable blocks
let active_block_mesh = []; // meshes of active blocks
let block_color = []; // the color attributes of every place
let block_pos = []; // matrix used to convert game position to 3d rendering position
let static_block_mesh = []; //categorized by z pos
//game - framework
let score = 0; //game score
let tick = TICK; //blocks fall down one time in this number of frame
let camera_angle = 0.0; // camera's absolute yaw from the origin
let cam_altitude = CAM_ALTITUDE_MAX; // camera's z position
let failed = false; // is the player failed the game
let keyboard_state = {}; // each key's state that it is pressed or not;
let canvas_size = [Math.floor(window.innerWidth * 4 / 5), Math.floor(window.innerHeight * 4 / 5)]; //game screen size
let count = 0; //game time count

//Web Page Elements
const score_indication = document.getElementById("score_indication");

//Rendering Instances (three.js)
//three.js renderer
const renderer = new THREE.WebGLRenderer({
    canvas: document.getElementById("game_canvas")
});
//scene
const scene = new THREE.Scene();
//camera
const camera = new THREE.PerspectiveCamera(
    60.0,
    canvas_size[0] / canvas_size[1],
    0.1,
    1000
);
//light
const directionalLight = new THREE.DirectionalLight(
    0xffffff
);
//tetris cube templates
const cubeGeometry = new THREE.BoxGeometry(18, 18, 18);
const cubeEdgeMaterial = new THREE.LineBasicMaterial(
    {
        color: getColor(GREEN),
        linewidth: 2.0
    });
const edgeGeometry = new THREE.EdgesGeometry(cubeGeometry);


//Program Execution
main();


//FUNDAMENTALS
//Main Function
function main() {
    //set events
    document.addEventListener("keydown", key_pressed);
    document.addEventListener("keyup", key_released);
    window.addEventListener("resize", onResize);

    //initialization
    render_init();
    game_init();

    //set game loop
    const intervalID = setInterval(() => {
        tick_event();
        count = (count + 1) % 3000;
        if (failed) {
            clearInterval(intervalID);
        }
    }, 1000 / FPS);

    //game finishing
    console.log("Game Finished");
}

//the function executed in every frame
function tick_event() {
    if (!failed) {
        tick = TICK;
        for (const key in keyboard_state) {
            if (keyboard_state[key]) {
                key_action(key);
            }
        }
        if (count % tick === 0) {
            if (active_block.length === 0) {
                let t = check();
                if (t !== 0) {
                    score += t * 100;
                    score_indication.textContent = (score + '');
                }

                let result = generate_tetracube();
                if (result === -1) {
                    failed = true;
                } else {
                    current_color = result;
                }
            }
            block_fall();
        }
        render_frame();
    }
}

//Key Event Bindings
function key_pressed(e) {
    keyboard_state[e.key] = true;
}

function key_released(e) {
    keyboard_state[e.key] = false;
}


//RENDERING
//Fix Canvas Size When Resized
function onResize() {
    //get new canvas size
    canvas_size = [Math.floor(window.innerWidth * 4 / 5), Math.floor(window.innerHeight * 4 / 5)];
    //fix renderer
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(canvas_size[0], canvas_size[1]);

    //fix camera aspect
    camera.aspect = canvas_size[0] / canvas_size[1];
    camera.updateProjectionMatrix();
}

//Renderer Instances Initialization
function render_init() {
    //initialize renderer, scene, and camera
    renderer.setSize(canvas_size[0], canvas_size[1]);
    renderer.setPixelRatio(window.devicePixelRatio);
    directionalLight.position.set(1, 1, 1);
    scene.add(directionalLight);
    camera.up.x = 0;
    camera.up.y = 0;
    camera.up.z = 1;

    //draw grid lines
    const line_material = new THREE.LineBasicMaterial(
        {
            color: getColor(GRAY),
            linewidth: 1.0
        })
    let vertices = [];
    const glVertex3fv = function (pos) {
        vertices.push(new THREE.Vector3(pos[0], pos[1], pos[2]));
        if (vertices.length === 2) {
            const geo = new THREE.BufferGeometry().setFromPoints(vertices);
            const line = new THREE.Line(geo, line_material);
            scene.add(line);
            vertices = [];
        }
    }
    for (let i = 0; i <= GAME_HEIGHT; i++) {
        glVertex3fv([50, 50, 400 - i * 20]);
        glVertex3fv([-50, 50, 400 - i * 20]);
        glVertex3fv([-50, 50, 400 - i * 20]);
        glVertex3fv([-50, -50, 400 - i * 20]);
        glVertex3fv([-50, -50, 400 - i * 20]);
        glVertex3fv([50, -50, 400 - i * 20]);
        glVertex3fv([50, -50, 400 - i * 20]);
        glVertex3fv([50, 50, 400 - i * 20]);
    }
    for (let i = 0; i < GAME_WIDTH; i++) {
        glVertex3fv([-50 + i * 20, 50, 400]);
        glVertex3fv([-50 + i * 20, 50, 0]);
        glVertex3fv([-50 + i * 20, -50, 400]);
        glVertex3fv([-50 + i * 20, -50, 0]);
        glVertex3fv([50, -50 + i * 20, 400]);
        glVertex3fv([50, -50 + i * 20, 0]);
        glVertex3fv([-50, -50 + i * 20, 400]);
        glVertex3fv([-50, -50 + i * 20, 0]);
    }
    for (let i = 0; i <= GAME_WIDTH; i++) {
        glVertex3fv([-50 + i * 20, 50, 0]);
        glVertex3fv([-50 + i * 20, -50, 0]);
        glVertex3fv([50, -50 + i * 20, 0]);
        glVertex3fv([-50, -50 + i * 20, 0]);
    }
}

// rendering in each frame
function render_frame() {
    //set camera and light
    camera.position.set(VIEW_HORIZONTAL_DISTANCE * Math.sin(camera_angle / 180 * Math.PI), VIEW_HORIZONTAL_DISTANCE * Math.cos(camera_angle / 180 * Math.PI), cam_altitude);
    camera.lookAt(0.0, 0.0, cam_altitude - VIEW_HORIZONTAL_DISTANCE);
    directionalLight.position.set(camera.position.x, camera.position.y, camera.position.z);
    //render
    renderer.render(scene, camera);
}

// draw a new cube
function draw_cube(i, j, k) {
    if (array_equal(block_color[i][j][k], BLACK)) return;
    const boxMaterial = new THREE.MeshStandardMaterial({
        color: getColor(block_color[i][j][k])
    });
    let cube = new THREE.Mesh(cubeGeometry, boxMaterial);
    cube.position.set(block_pos[i][j][k][1], block_pos[i][j][k][2], block_pos[i][j][k][0]);
    let cube_line = new THREE.LineSegments(
        edgeGeometry,
        cubeEdgeMaterial
    );
    cube.add(cube_line);
    scene.add(cube);
    return cube;
}


//GAME ALGORITHM
//Game Initialization
function game_init() {
    //set block_pos and block_color
    for (let i = 0; i < GAME_HEIGHT; i++) {
        block_pos.push([]);
        block_color.push([]);
        for (let j = 0; j < GAME_WIDTH; j++) {
            block_pos[i].push([]);
            block_color[i].push([]);
            for (let k = 0; k < GAME_WIDTH; k++) {
                block_pos[i][j].push([390 - i * 20, -40 + j * 20, -40 + k * 20]);
                block_color[i][j].push(BLACK);
            }
        }
        static_block_mesh.push([]);
    }
}

//Let Blocks Fall One Layer
function block_fall() {
    for (let block of active_block) {
        if ((block[0] === GAME_HEIGHT - 1) || cubes_not_installable(block[0] + 1, block[1], block[2])) {
            freeze(block[0], block[1], block[2]);
        }
    }
    if (active_block.length !== 0) {
        let instant = [];
        for (let dd of active_block) {
            instant.push([dd[0] + 1, dd[1], dd[2]]);
        }
        for (const _ of active_block) {
            block_color[_[0]][_[1]][_[2]] = BLACK;
        }
        active_block = [];
        for (const _ of instant) {
            block_color[_[0]][_[1]][_[2]] = current_color;
            active_block.push([_[0], _[1], _[2]]);
        }
        for (const _ in instant) {
            let __ = block_pos[instant[_][0]][instant[_][1]][instant[_][2]]
            active_block_mesh[_].position.set(__[1], __[2], __[0])
        }
    }
}

//Generate A New Tetracube
function generate_tetracube() {
    let c = random_choose(COLOR_LIST);
    let candidates = [
        [[1, 2, 2], [0, 2, 2], [2, 2, 2], [3, 2, 2]],
        [[1, 2, 2], [0, 2, 2], [2, 2, 2], [2, 1, 2]],
        [[1, 2, 2], [0, 2, 2], [2, 2, 2], [1, 1, 2]],
        [[1, 2, 2], [0, 2, 2], [1, 1, 2], [0, 1, 2]],
        [[1, 2, 2], [0, 2, 2], [1, 1, 2], [2, 1, 2]],
        [[1, 2, 2], [0, 2, 2], [1, 1, 2], [1, 2, 1]],
        [[1, 2, 2], [0, 2, 2], [1, 1, 2], [0, 2, 1]],
        [[1, 2, 2], [0, 2, 2], [1, 1, 2], [1, 1, 1]]
    ];
    let tetracube = random_choose(candidates);
    for (const _ of tetracube) {
        if (!array_equal(block_color[_[0]][_[1]][_[2]], BLACK)) return -1;
        active_block.push(_);
        block_color[_[0]][_[1]][_[2]] = c;
        active_block_mesh.push(draw_cube(_[0], _[1], _[2]));
    }
    return c;
}

//Player's Tetris Action
function move(key_action) {
    let center = active_block[0];
    let move_direction_state = (key_action in MOVE_VALUE) ? MOVE_VALUE[key_action] : -1;
    let camera_rotation_state = Math.floor((Math.floor(camera_angle + 45) % 360) / 90) % 4;
    move_direction_state = (move_direction_state + camera_rotation_state + 8) % 4;
    let next_active_block = [];
    for (const block of active_block) {
        if (key_action === "q") {
            switch (camera_rotation_state) {
                case 0:
                    next_active_block.push([(block[1] - center[1]) + center[0], -(block[0] - center[0]) + center[1], block[2]]);
                    break;
                case 1:
                    next_active_block.push([-(block[2] - center[2]) + center[0], block[1], (block[0] - center[0]) + center[2]]);
                    break;
                case 2:
                    next_active_block.push([-(block[1] - center[1]) + center[0], (block[0] - center[0]) + center[1], block[2]]);
                    break
                case 3:
                    next_active_block.push([(block[2] - center[2]) + center[0], block[1], -(block[0] - center[0]) + center[2]]);
            }
        } else if (key_action === "e") {
            next_active_block.push([block[0], -(block[2] - center[2]) + center[1], (block[1] - center[1]) + center[2]]);
        } else if (move_direction_state === 1) {
            next_active_block.push([block[0], block[1] - 1, block[2]]);
        } else if (move_direction_state === 3) {
            next_active_block.push([block[0], block[1] + 1, block[2]]);
        } else if (move_direction_state === 0) {
            next_active_block.push([block[0], block[1], block[2] - 1]);
        } else if (move_direction_state === 2) {
            next_active_block.push([block[0], block[1], block[2] + 1]);
        } else {
            return -1;
        }
    }
    for (const _ of next_active_block) {
        if (!(0 <= _[0] && _[0] < GAME_HEIGHT && 0 <= _[1] && _[1] < GAME_WIDTH && 0 <= _[2] && _[2] < GAME_WIDTH)) return -1;
        else if (cubes_not_installable(_[0], _[1], _[2])) return -1;
    }
    for (const _ of active_block) block_color[_[0]][_[1]][_[2]] = BLACK;
    active_block = [];
    for (const _ of next_active_block) {
        block_color[_[0]][_[1]][_[2]] = current_color;
        active_block.push([_[0], _[1], _[2]]);
    }
    for (const _ in next_active_block) {
        let i = block_pos[next_active_block[_][0]][next_active_block[_][1]][next_active_block[_][2]]
        active_block_mesh[_].position.set(i[1], i[2], i[0])
    }
    return 0;
}

//Actions Definition
function key_action(key) {
    switch (key) {
        case "w":
        case "s":
        case "a":
        case "d":
        case "q":
        case "e":
            if (count % Math.max(Math.floor(FPS / KEYBOARD_FPS), 1) === 0) move(key);
            break;
        case "ArrowLeft":
            camera_angle = (camera_angle + 4) % 360;
            break;
        case "ArrowRight":
            camera_angle = (camera_angle - 4) % 360;
            break;
        case "ArrowUp":
            cam_altitude = Math.min(cam_altitude + 5, CAM_ALTITUDE_MAX);
            break;
        case "ArrowDown":
            cam_altitude = Math.max(cam_altitude - 5, CAM_ALTITUDE_MIN);
            break;
        case " ":
            tick = Math.floor(TICK / 20);
            break;
        default:
            break;
    }
}

//Check Scoring
function check() {
    let accepted_layers = 0;
    for (let i = 0; i < GAME_HEIGHT; i++) {
        let flag = true;
        for (let j = 0; j < GAME_WIDTH; j++) {
            for (let k = 0; k < GAME_WIDTH; k++) {
                flag &= cubes_not_installable(i, j, k);
            }
        }
        if (flag) {
            for (let j = 0; j < GAME_WIDTH; j++) {
                for (let k = 0; k < GAME_WIDTH; k++) {
                    block_color[i][j][k] = BLACK;
                }
            }
            for (const mesh of static_block_mesh[i]) {
                scene.remove(mesh);
            }
            static_block_mesh[i] = [];
            for (let i1 = i; i1 > 0; i1--) {
                for (let j = 0; j < GAME_WIDTH; j++) {
                    for (let k = 0; k < GAME_WIDTH; k++) {
                        block_color[i1][j][k] = block_color[i1 - 1][j][k];
                    }
                }
                for (const mesh of static_block_mesh[i1-1]) {
                    mesh.position.set(mesh.position.x,mesh.position.y,mesh.position.z-20);
                }
                static_block_mesh[i1]=static_block_mesh[i1-1];
            }
            for (let j = 0; j < GAME_WIDTH; j++) {
                for (let k = 0; k < GAME_WIDTH; k++) {
                    block_color[0][j][k] = BLACK;
                }
            }
            static_block_mesh[0]=[]
            accepted_layers += 1;
        }
    }
    return accepted_layers;
}

//Freeze active blocks by give one of them, and they will no longer be movable
function freeze(i, j, k) {
    if (array_includes([i, j, k], active_block)) {
        let pos = delete_array_from_array([i, j, k], active_block);
        static_block_mesh[i].push(active_block_mesh[pos]);
        active_block_mesh.splice(pos, 1);
        freeze(Math.min(i + 1, GAME_HEIGHT - 1), j, k);
        freeze(Math.max(i - 1, 0), j, k);
        freeze(i, Math.min(j + 1, GAME_WIDTH - 1), k);
        freeze(i, Math.max(j - 1, 0), k);
        freeze(i, j, Math.min(k + 1, GAME_WIDTH - 1));
        freeze(i, j, Math.max(k - 1, 0));
    }
}

//Low Layer Function Library
function getColor(C) {
    return C[0] * 256 * 256 + C[1] * 256 + C[2];
}

function random_choose(array) {
    return array[Math.floor(Math.random() * array.length)];
}

function delete_array_from_array(element, array) {
    for (let i = 0; i < array.length; i++) {
        if (array_equal(element, array[i])) {
            array.splice(i, 1);
            return i;
        }
    }
}

function array_equal(array1, array2) {
    let flag = true;
    for (let i = 0; i < array1.length; i++) {
        flag &= array1[i] === array2[i];
    }
    return flag;
}

function array_includes(element_array, array) {
    let flag = false;
    for (const _ of array) {
        let ins = true;
        for (let i = 0; i < _.length; i++) {
            ins &= _[i] === element_array[i];
        }
        flag |= ins;
    }
    return flag;
}

function cubes_not_installable(i, j, k) {
    let flag1 = false;
    for (const _ of active_block) {
        flag1 |= array_equal([i, j, k], _);
    }
    let flag2 = array_equal(block_color[i][j][k], BLACK);
    return !(flag1 || flag2);
}