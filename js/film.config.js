/* Sable Villas — home film.
   Three Kling clips, 61 frames each (12 fps, square webp from tools/frames.sh):
     descend  aerial of the twelve villas → eye level across the pool of one villa
     enter    across the terrace, through the open glass doors, into the living room
     glow     the aerial deepens from golden hour to dusk; windows and pools light up
   The return legs (living room → pool → aerial) are the first two clips played in
   reverse on the timeline, so the film comes back to the exact frame it left.
   Text sections in index.html reference these segment ids: data-seg="clip1:0.12,clip1:0.92". */
window.FILM = {
  sources: {
    descend: { dir: "frames/descend", prefix: "ds_", count: 61 },
    enter:   { dir: "frames/enter",   prefix: "en_", count: 61 },
    glow:    { dir: "frames/glow",    prefix: "gl_", count: 61 },
  },
  timeline: [
    { id: "hero",     units: 0.9, src: "descend", f0: 0,  f1: 0  },   // aerial held under the hero copy
    { id: "clip1",    units: 1.0, src: "descend", f0: 0,  f1: 60 },   // arrive by water
    { id: "hold1",    units: 0.3, src: "descend", f0: 60, f1: 60 },   // your own pool
    { id: "clip2",    units: 1.0, src: "enter",   f0: 0,  f1: 60 },   // through the doors
    { id: "hold2",    units: 0.5, src: "enter",   f0: 60, f1: 60 },   // open-plan living
    { id: "clip2rev", units: 0.7, src: "enter",   f0: 60, f1: 0  },   // back out to the pool
    { id: "clip1rev", units: 0.8, src: "descend", f0: 60, f1: 0  },   // rise back to the aerial
    { id: "hold3",    units: 0.2, src: "descend", f0: 0,  f1: 0  },
    { id: "glow",     units: 1.3, src: "glow",    f0: 0,  f1: 60 },   // golden hour to dusk, stats
    { id: "end",      units: 0.4, src: "glow",    f0: 60, f1: 60 },
  ],
  overlay: { enter: "glow:0.45", leave: "end:0.55", max: 0.78 },   // the sky turns in the open, then the overlay comes in for the stats and is gone before release
  marquee: { enter: "clip2rev:0.05", leave: "clip2rev:0.95" },
  firstChunk: 40,
};
