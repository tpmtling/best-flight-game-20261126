// A small seeded generator (mulberry32). The same seed always grows the same
// valley, the same rings and the same weather, so a screenshot can be staged
// and a flight can be replayed exactly.
export function createRandom(seed) {
  let a = seed >>> 0;
  function next() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  return {
    next,
    range(min, max) {
      return min + next() * (max - min);
    },
    int(min, max) {
      return Math.floor(min + next() * (max - min + 1));
    },
    pick(list) {
      return list[Math.floor(next() * list.length)];
    },
    // Smooth 1-D noise in [-1, 1] for ridgelines and river bends.
    noise1(x) {
      const i = Math.floor(x);
      const f = x - i;
      const u = f * f * (3 - 2 * f);
      const h = (n) => {
        let s = (n * 374761393 + 668265263) | 0;
        s = Math.imul(s ^ (s >>> 13), 1274126177);
        return (((s ^ (s >>> 16)) >>> 0) / 4294967296) * 2 - 1;
      };
      return h(i) * (1 - u) + h(i + 1) * u;
    },
  };
}
