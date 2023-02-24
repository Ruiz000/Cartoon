import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { TransformControls } from 'three/examples/jsm/controls/TransformControls'
import * as dat from 'dat.gui'


const vertexShader = `
#include <common>
#include <shadowmap_pars_vertex>

varying vec3 vNormal;
varying vec3 vViewDir;
void main() {
    #include <beginnormal_vertex>
    #include <defaultnormal_vertex>

    #include <begin_vertex>
    
    #include <worldpos_vertex>
    #include <shadowmap_vertex>

    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 clipPosition = projectionMatrix * viewPosition;
    
    vNormal = normalize(normalMatrix * normal);
    vViewDir = normalize(-viewPosition.xyz);

    gl_Position = clipPosition;
}
`;

const fragmentShader = `
#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>

uniform vec3 uColor;
varying vec3 vNormal;
uniform float uGlossiness;
varying vec3 vViewDir;

void main() {
    // shadow map
    DirectionalLightShadow directionalShadow = directionalLightShadows[0];

    float shadow = getShadow(
        directionalShadowMap[0],
        directionalShadow.shadowMapSize,
        directionalShadow.shadowBias,
        directionalShadow.shadowRadius,
        vDirectionalShadowCoord[0]
    );

    // directional light
    float NdotL = dot(vNormal, directionalLights[0].direction);
    float lightIntensity = smoothstep(0.0, 0.01, NdotL * shadow);
    vec3 directionalLight = directionalLights[0].color * lightIntensity;

    // specular reflection
    vec3 halfVector = normalize(directionalLights[0].direction + vViewDir);
    float NdotH = dot(vNormal, halfVector);

    float specularIntensity = pow(NdotH * lightIntensity, 1000.0/ uGlossiness);
    float specularIntensitySmooth = smoothstep(0.05, 0.1, specularIntensity);

    vec3 specular = specularIntensitySmooth * directionalLights[0].color;

    // rim lighting
    float rimDot = 1.0 - dot(vViewDir, vNormal);
    float rimAmount = 0.6;

    float rimThreshold = 0.2;
    float rimIntensity = rimDot * pow(NdotL, rimThreshold);
    rimIntensity = smoothstep(rimAmount - 0.01, rimAmount + 0.01,rimIntensity);

    vec3 rim = rimIntensity * directionalLights[0].color;

    gl_FragColor = vec4(uColor * (ambientLightColor + directionalLight + specular + rim ), 1.0);
}
`;

window.addEventListener('load', init, false);

function init() {
    const gui = new dat.GUI();
    const canvas = document.querySelector('#canvas');

    const scene = new THREE.Scene();
    const params = {
        color: '#6495ED',
        directionalLight: '#f8f1e6',
        ambientLight:'#ffffff'
    };

    const sphereGeometry = new THREE.SphereGeometry(1,32,32);
    const uniforms = {
        ...THREE.UniformsLib.lights,
        uColor: { value: new THREE.Color(params.color)},
        uGlossiness: { value:6}
    };
    const shaderMaterial = new THREE.ShaderMaterial({
        lights:true,
        uniforms,
        vertexShader,
        fragmentShader
    });
    const sphere = new THREE.Mesh(sphereGeometry, shaderMaterial);
    sphere.castShadow = true;
    scene.add(sphere);

    const plane = new THREE.PlaneGeometry(1,1,1);
    const material = new THREE.MeshStandardMaterial({ color: '#7a7775'});
    const mesh = new THREE.Mesh(plane,material);
    mesh.receiveShadow=true;
    mesh.scale.setScalar(10);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -1;
    scene.add(mesh);

    // add TorusKnotGeometry
    const torusGeometry = new THREE.TorusGeometry(1, 0.4 , 10 ,32);
    const torus = new THREE.Mesh(torusGeometry, material);
    torus.castShadow = true;
    torus.position.set(1.5,0.5,2);
    torus.rotation.y = Math.PI / 4;
    scene.add(torus);

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

    const transformControls = new TransformControls(camera, canvas);

    transformControls.addEventListener("mouseDown",() => {
        controls.enabled = false;
    });

    transformControls.addEventListener("mouseUp", () => {
        controls.enabled = true;
    });
    scene.add(transformControls);
    transformControls.attach(torus);

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

    gui.addColor(params, "color").onChange((value) => {
        uniforms.uColor.value = new THREE.Color(value);
    });

    gui.addColor(params, "directionalLight").onChange((value) => {
      directionalLight.color = new THREE.Color(value);
  })
    .name("dir. color");

    gui.addColor(params, "ambientLight").onChange((value) => {
        ambientLight.color = new THREE.Color(value);
    })
    .name("amb. color")

    gui.add(directionalLight, "intensity").name("dir.intensity").min(0).max(1.5);

    gui.add(ambientLight, "intensity").name("amb.intensity").min(0).max(1.5);

    gui.add(uniforms.uGlossiness,"value").name("specular").min(1).max(20)

    const clock = new THREE.Clock();

    const tick = ()=> {
        const elapsedTime = clock.getElapsedTime();
        controls.update();
        renderer.render(scene, camera);
        window.requestAnimationFrame(tick);
    };

    tick();
}
