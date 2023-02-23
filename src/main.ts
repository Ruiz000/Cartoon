import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import * as dat from 'dat.gui'


const vertexShader = `
void main() {
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;

    gl_Position = clipPosition;
}
`;

const fragmentShader = `
uniform vec3 uColor;

void main() {
    gl_FragColor = vec4(uColor, 1.0);
}
`;

window.addEventListener('load', init, false);

function init() {
    const gui = new dat.GUI();
    const canvas = document.querySelector('#canvas');

    const scene = new THREE.Scene();
    const params = {
        color: '#6495ED'
    };

    const sphereGeometry = new THREE.SphereGeometry(1,32,32);
    const uniforms = {
        uColor: { value: new THREE.Color(params.color)}
    };
    const shaderMaterial = new THREE.ShaderMaterial({
        uniforms,
        vertexShader,
        fragmentShader
    });
    const sphere = new THREE.Mesh(sphereGeometry, shaderMaterial);
    sphere.castShadow = true;
    scene.add(sphere);

    gui.addColor(params, "color").onChange((value) => {
        uniforms.uColor.value = new THREE.Color(value);
    });

    const plane = new THREE.PlaneGeometry(1,1,1);
    const material = new THREE.MeshStandardMaterial({ color: '#7a7775'});
    const mesh = new THREE.Mesh(plane,material);
    mesh.receiveShadow=true;
    mesh.scale.setScalar(10);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -1;
    scene.add(mesh);

    const sizes = {
        width:window.innerWidth,
        height: window.innerHeight
    }

    window.addEventListener("resize", () => {
        sizes.width = window.innerWidth;
        sizes.height = window.innerHeight;

        camera.aspect = sizes.width /sizes.height;
        camera.updateProjectionMatrix();

        renderer.setSize(sizes.width,sizes.height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    })

    const camera = new THREE.PerspectiveCamera(
        75,
        sizes.width / sizes.height,
        0.1,
        1000
    );
    camera.position.set(0,1,5);
    scene.add(camera);

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;

    const directionalLight = new THREE.DirectionalLight('#f8f1e6', 0.5);
    directionalLight.position.set(4,4,4);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 4096;
    directionalLight.shadow.mapSize.height = 4096;
    directionalLight.shadow.camera.near = 2;
    directionalLight.shadow.camera.far = 15;

    const ambientLight = new THREE.AmbientLight('#ffffff', 1);

    scene.add(directionalLight,ambientLight);

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true
    });
    renderer.setSize(sizes.width, sizes.height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.CineonToneMapping;
    renderer.toneMappingExposure = 1.75;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.physicallyCorrectLights = true;

    const clock = new THREE.Clock();

    const tick = ()=> {
        const elapsedTime = clock.getElapsedTime();
        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
    };

    tick();
}