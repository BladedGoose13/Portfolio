/* script.js — Portfolio interactive behaviors */

/* ── Navbar scroll effect ──────────────────────────────── */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.querySelector('.nav-links');

window.addEventListener('scroll', () => {
  if (window.scrollY > 30) {
    navbar.classList.add('scrolled');
  } else {
    navbar.classList.remove('scrolled');
  }
}, { passive: true });

/* ── Mobile nav toggle ─────────────────────────────────── */
navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

/* Close mobile nav when a link is clicked */
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('open');
  });
});

/* ── Skill bars animate on scroll (IntersectionObserver) ── */
const skillSection = document.getElementById('skills');
const skillFills = document.querySelectorAll('.skill-fill');

if (skillFills.length > 0) {
  /* Reset widths initially so animation plays when visible */
  skillFills.forEach(el => {
    el.style.animationPlayState = 'paused';
  });

  const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        skillFills.forEach(el => {
          el.style.animationPlayState = 'running';
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  if (skillSection) observer.observe(skillSection);
}

/* ── Lattice Canvas — animated hexagonal lattice ──────── */
(function initLattice() {
  const canvas = document.getElementById('latticeCanvas');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    const rect = canvas.parentElement.getBoundingClientRect();
    canvas.width  = rect.width  * DPR;
    canvas.height = rect.height * DPR;
    ctx.scale(DPR, DPR);
  }

  window.addEventListener('resize', resize, { passive: true });
  resize();

  /* Hexagonal lattice parameters */
  const a1 = [2.68, 0];          /* lattice vector 1 (Å scaled to px) */
  const a2 = [1.34, 2.32];       /* lattice vector 2 */
  const SCALE = 28;              /* Å → px */

  /* Basis atoms: Si (0,0) and C (1/3, 2/3) in fractional coords */
  const basis = [
    { fx: 0,       fy: 0,       r: 5.5, rgba: [56, 189, 248], label: 'Si' },
    { fx: 1 / 3,   fy: 2 / 3,  r: 4.0, rgba: [52, 211, 153], label: 'C'  },
  ];

  /* Helper: build an rgba() string from an [r,g,b] array and alpha */
  function atomColor([r, g, b], alpha) {
    return `rgba(${r},${g},${b},${alpha})`;
  }

  /* Bonds: pairs of basis indices and PBC copies */
  const bondVectors = [
    [0, 0],   /* to same cell */
    [1, 0],   /* +a1 */
    [0, 1],   /* +a2 */
    [-1, 1],
    [-1, 0],
    [0, -1],
  ];

  let time = 0;
  let animId;

  function draw() {
    const W = canvas.width  / DPR;
    const H = canvas.height / DPR;

    ctx.clearRect(0, 0, W, H);

    /* gentle breathing glow */
    const glow = 0.06 + 0.04 * Math.sin(time * 0.02);

    /* lattice extent */
    const range = 8;
    const cx = W / 2;
    const cy = H / 2;

    /* Clip to circle */
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, W / 2 - 1, 0, Math.PI * 2);
    ctx.clip();

    /* Draw bonds */
    ctx.lineWidth = 1.2;

    for (let n = -range; n <= range; n++) {
      for (let m = -range; m <= range; m++) {
        /* origin of unit cell (n,m) */
        const ox = cx + (n * a1[0] + m * a2[0]) * SCALE;
        const oy = cy + (n * a1[1] + m * a2[1]) * SCALE;

        basis.forEach((atomA, idxA) => {
          const ax = ox + (atomA.fx * a1[0] + atomA.fy * a2[0]) * SCALE;
          const ay = oy + (atomA.fx * a1[1] + atomA.fy * a2[1]) * SCALE;

          /* connect Si to nearest C in neighbouring cells */
          if (idxA === 0) {
            const cFrac = basis[1];
            bondVectors.forEach(([dn, dm]) => {
              const bx = cx + ((n + dn) * a1[0] + (m + dm) * a2[0] + cFrac.fx * a1[0] + cFrac.fy * a2[0]) * SCALE;
              const by = cy + ((n + dn) * a1[1] + (m + dm) * a2[1] + cFrac.fx * a1[1] + cFrac.fy * a2[1]) * SCALE;

              /* Distance check — only draw short bonds */
              const dist = Math.hypot(bx - ax, by - ay);
              if (dist < SCALE * 1.8) {
                const alpha = glow + 0.08;
                ctx.strokeStyle = `rgba(56,189,248,${alpha})`;
                ctx.beginPath();
                ctx.moveTo(ax, ay);
                ctx.lineTo(bx, by);
                ctx.stroke();
              }
            });
          }
        });
      }
    }

    /* Draw atoms */
    for (let n = -range; n <= range; n++) {
      for (let m = -range; m <= range; m++) {
        const ox = cx + (n * a1[0] + m * a2[0]) * SCALE;
        const oy = cy + (n * a1[1] + m * a2[1]) * SCALE;

        basis.forEach(atom => {
          const ax = ox + (atom.fx * a1[0] + atom.fy * a2[0]) * SCALE;
          const ay = oy + (atom.fx * a1[1] + atom.fy * a2[1]) * SCALE;

          /* Skip atoms outside canvas with margin */
          if (ax < -10 || ax > W + 10 || ay < -10 || ay > H + 10) return;

          const pulse = atom.r + 0.8 * Math.sin(time * 0.025 + n * 0.5 + m * 0.3);

          /* Glow halo */
          const grad = ctx.createRadialGradient(ax, ay, 0, ax, ay, pulse * 3.5);
          grad.addColorStop(0, atomColor(atom.rgba, glow * 2.5));
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(ax, ay, pulse * 3.5, 0, Math.PI * 2);
          ctx.fill();

          /* Atom core */
          const coreAlpha = 0.55 + 0.2 * Math.sin(time * 0.025 + n * 0.5 + m * 0.3);
          ctx.fillStyle = atomColor(atom.rgba, coreAlpha);
          ctx.beginPath();
          ctx.arc(ax, ay, pulse, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    }

    ctx.restore();

    time++;
    animId = requestAnimationFrame(draw);
  }

  /* Pause when not visible */
  const visibilityObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        if (!animId) animId = requestAnimationFrame(draw);
      } else {
        cancelAnimationFrame(animId);
        animId = null;
      }
    });
  }, { threshold: 0.1 });

  visibilityObserver.observe(canvas);
  animId = requestAnimationFrame(draw);
})();

/* ── Smooth active link highlight on scroll ─────────────── */
(function initActiveLinks() {
  const sections = document.querySelectorAll('section[id]');
  const links = document.querySelectorAll('.nav-links a[href^="#"]');

  const io = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        links.forEach(link => {
          link.classList.toggle(
            'active',
            link.getAttribute('href') === '#' + entry.target.id
          );
        });
      }
    });
  }, { rootMargin: '-40% 0px -55% 0px' });

  sections.forEach(sec => io.observe(sec));
})();
