// Independent Three.js space scene — runs on #space-bg canvas
// No connection to Keith's engine whatsoever
export function initSpaceRenderer() {
  const canvas = document.getElementById('space-bg');
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60,
    window.innerWidth / window.innerHeight, 0.1, 2000);
  camera.position.set(0, 0, 1);

  const loader = new THREE.TextureLoader();

  // Starfield sphere — wraps entire scene, texture on inside
  scene.add(new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 32),
    new THREE.MeshBasicMaterial({
      map: loader.load('lib/textures/starfield.jpg'),
      side: THREE.BackSide
    })
  ));

  // Earth — lower left, slow rotation
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(55, 32, 32),
    new THREE.MeshPhongMaterial({ map: loader.load('lib/textures/earth.jpg') })
  );
  earth.position.set(-350, -180, -600);
  scene.add(earth);

  // Moon — upper right, different depth
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(14, 32, 32),
    new THREE.MeshPhongMaterial({ map: loader.load('lib/textures/moon.jpg') })
  );
  moon.position.set(300, 160, -400);
  scene.add(moon);

  // Ambient light so spheres are visible
  scene.add(new THREE.AmbientLight(0x334466, 0.8));
  const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(500, 300, 500);
  scene.add(sun);

  // Slow camera drift for cinematic feel
  let t = 0;
  function animate() {
    requestAnimationFrame(animate);
    t += 0.0003;
    earth.rotation.y += 0.0002;
    moon.rotation.y += 0.0001;
    // Subtle camera drift
    camera.position.x = Math.sin(t) * 0.5;
    camera.position.y = Math.cos(t * 0.7) * 0.3;
    renderer.render(scene, camera);
  }
  animate();

  // Handle resize
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });
}
