// Shared light fixtures, so no flame ever floats in mid-air.
import * as THREE from 'three';

// Every visible flame sits in a real fixture. `kind`: 'candle' (a small flame only, on a
// candle someone placed), a wall direction ('+x','-x','+z','-z': the way the bracket points
// out of the wall) for a gas bracket, or {pendant: ceilingY} for a gasolier drop.
let fixBrass, fixGlass, flameMat;
function init() {
  if (fixBrass) return;
  fixBrass = new THREE.MeshStandardMaterial({ color: 0x8a6a34, metalness: 0.85, roughness: 0.4 });
fixGlass = new THREE.MeshStandardMaterial({ color: 0xfff0d8, emissive: 0xffb060, emissiveIntensity: 0.55, transparent: true, opacity: 0.55, roughness: 0.3, side: THREE.DoubleSide, depthWrite: false });
flameMat = new THREE.MeshBasicMaterial({ color: 0xffc070 });
}
export function gasLampFixture(group, x, y, z, kind) {
  init();
  const g = new THREE.Group(); g.position.set(x, y, z); group.add(g);
  const fl = new THREE.Mesh(new THREE.SphereGeometry(kind === 'candle' ? 0.012 : 0.018, 8, 6), flameMat); fl.scale.y = 2; g.add(fl);
  if (kind === 'candle') { fl.position.y = 0.02; return; }
  // tulip shade around the flame, with a brass gallery under it
  const shade = new THREE.Mesh(new THREE.LatheGeometry([[0.035, -0.06], [0.07, -0.02], [0.095, 0.05], [0.1, 0.1]].map(([r, h]) => new THREE.Vector2(r, h)), 18), fixGlass); g.add(shade);
  const gal = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.04, 14), fixBrass); gal.position.y = -0.08; g.add(gal);
  if (typeof kind === 'object' && kind.pendant) {
    const len = kind.pendant - y - 0.1;
    const rod = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, len, 8), fixBrass); rod.position.y = 0.1 + len / 2; g.add(rod);
    const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.06, 0.04, 16), fixBrass); rose.position.y = kind.pendant - y - 0.02; g.add(rose);
    return;
  }
  // wall bracket: backplate on the wall, an arm curving out and up to the gallery
  const dir = { '+x': [1, 0], '-x': [-1, 0], '+z': [0, 1], '-z': [0, -1] }[kind] || [1, 0];
  const out = 0.26, wx = -dir[0] * out, wz = -dir[1] * out;
  const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 16), fixBrass);
  plate.rotation.set(dir[1] ? Math.PI / 2 : 0, 0, dir[0] ? Math.PI / 2 : 0); plate.position.set(wx, -0.2, wz); g.add(plate);
  const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, out, 8), fixBrass);
  arm.rotation.set(dir[1] ? Math.PI / 2 : 0, 0, dir[0] ? Math.PI / 2 : 0); arm.position.set(wx / 2, -0.2, wz / 2); g.add(arm);
  const up = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.1, 8), fixBrass); up.position.y = -0.15; g.add(up);
}
