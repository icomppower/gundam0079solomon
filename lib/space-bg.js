// 宇宙背景層 — 星野 + 地球 + 月球
// 呢個係 scene 裝飾層，唔係引擎單位
// 必須喺引擎 scene 初始化之後呼叫
export function initSpaceBg(scene) {
  const loader = new THREE.TextureLoader();

  // 1. 星野球（包住整個 scene，內側貼圖）
  const starSphere = new THREE.Mesh(
    new THREE.SphereGeometry(900, 32, 32),
    new THREE.MeshBasicMaterial({
      map: loader.load('lib/textures/starfield.jpg'),
      side: THREE.BackSide
    })
  );
  scene.add(starSphere);

  // 2. 地球（遠景左下，慢速自轉）
  const earth = new THREE.Mesh(
    new THREE.SphereGeometry(60, 32, 32),
    new THREE.MeshPhongMaterial({
      map: loader.load('lib/textures/earth.jpg'),
    })
  );
  earth.position.set(-600, -80, -150);  // side not behind — exists in scene volume
  scene.add(earth);

  // 3. 月球（遠景右上）
  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(16, 32, 32),
    new THREE.MeshPhongMaterial({
      map: loader.load('lib/textures/moon.jpg'),
    })
  );
  moon.position.set(500, 180, -80);   // closer and to the side, not flat backdrop
  scene.add(moon);

  // 自轉 render loop（喺引擎 render loop 之外附加）
  function rotateBg() {
    earth.rotation.y += 0.0003;
    moon.rotation.y += 0.0001;
    requestAnimationFrame(rotateBg);
  }
  rotateBg();
}
