const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const FRAME_INTERVAL = 1000 / 60;
const TWO_PI = Math.PI * 2;
const RADIUS_SQ = 130 * 130;
const WAKE_RADIUS_SQ = 260 * 260;
const particles = [];
let width = 1;
let height = 1;
let animationId = null;
let resizeId = null;
let lastFrameTime = null;
let nextFrameTime = 0;

const mouse = {
  x: 0, y: 0, prevX: 0, prevY: 0,
  active: false, pressed: false
};

class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() - 0.5;
    this.speedY = Math.random() - 0.5;
  }

  update(step, damping, trailDX, trailDY, repulsion) {
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distSq = dx * dx + dy * dy;
      const inWake = distSq < WAKE_RADIUS_SQ && (trailDX !== 0 || trailDY !== 0);

      // 普通漂浮不计算方向；只有交互范围内或按住旋转时才计算。
      if (mouse.pressed || distSq < RADIUS_SQ || inWake) {
        // 避免粒子与指针重合时除以零，以及近距离产生过大的力。
        const safeDistSq = Math.max(distSq, 36);
        const invDistance = 1 / Math.sqrt(safeDistSq);
        const unitX = dx * invDistance;
        const unitY = dy * invDistance;

        if (mouse.pressed) {
          const rotation = 20000 / safeDistSq;
          this.speedX = unitY * rotation;
          this.speedY = -unitX * rotation;
        }

        if (distSq < RADIUS_SQ) {
          const force = repulsion / safeDistSq * step;
          this.speedX += unitX * force;
          this.speedY += unitY * force;
        }

        if (inWake) {
          const relativeX = this.speedX - trailDX;
          const relativeY = this.speedY - trailDY;
          const omega = (trailDX * unitY - trailDY * unitX) / safeDistSq;
          this.speedX -= omega * relativeY * 0.8 * step;
          this.speedY += omega * relativeX * 0.8 * step;
        }
      }
    }

    if (Math.abs(this.speedX) > 0.5) this.speedX *= damping;
    if (Math.abs(this.speedY) > 0.5) this.speedY *= damping;
    this.speedX += (Math.random() - 0.5) * 0.1 * step;
    this.speedY += (Math.random() - 0.5) * 0.1 * step;
    this.speedX = Math.max(-5, Math.min(5, this.speedX));
    this.speedY = Math.max(-5, Math.min(5, this.speedY));
    this.x += this.speedX * step;
    this.y += this.speedY * step;

    if (this.x < 0 || this.x > width) {
      this.x = Math.max(0, Math.min(width, this.x));
      this.speedX *= -1;
    }
    if (this.y < 0 || this.y > height) {
      this.y = Math.max(0, Math.min(height, this.y));
      this.speedY *= -1;
    }
  }
}

function resizeCanvas() {
  const oldWidth = width;
  const oldHeight = height;
  width = Math.max(1, window.innerWidth);
  height = Math.max(1, window.innerHeight);
  // 使用 CSS 像素，避免高分屏额外放大背景画布的绘制开销。
  canvas.width = width;
  canvas.height = height;
  for (const particle of particles) {
    particle.x *= width / oldWidth;
    particle.y *= height / oldHeight;
  }

  const limit = width > 1200 ? 1800 : width > 768 ? 700 : 280;
  const count = Math.min(limit, Math.max(80, Math.round(width * height / 1200)));
  if (particles.length > count) particles.length = count;
  while (particles.length < count) particles.push(new Particle());
}

function drawParticles() {
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#1a73e8';
  // 同色粒子合并为一次填充，避免每个粒子单独提交绘制。
  ctx.beginPath();
  for (const particle of particles) {
    ctx.moveTo(particle.x + particle.size, particle.y);
    ctx.arc(particle.x, particle.y, particle.size, 0, TWO_PI);
  }
  ctx.fill();
}

function animate(timestamp) {
  animationId = null;
  if (document.hidden || reducedMotion.matches) return;

  // 高刷新率屏幕最多绘制 60 帧；位移按实际时间计算。
  if (timestamp >= nextFrameTime) {
    const step = lastFrameTime === null ? 1 : Math.min((timestamp - lastFrameTime) / FRAME_INTERVAL, 2);
    lastFrameTime = timestamp;
    nextFrameTime = Math.max(nextFrameTime + FRAME_INTERVAL, timestamp);
    const damping = Math.pow(0.9, step);
    // 每帧只取一次指针位移，停下后尾流不会持续施力。
    const trailDX = mouse.active ? Math.max(-40, Math.min(40, (mouse.x - mouse.prevX) / step)) : 0;
    const trailDY = mouse.active ? Math.max(-40, Math.min(40, (mouse.y - mouse.prevY) / step)) : 0;
    const repulsion = 500 + 0.8 * (trailDX * trailDX + trailDY * trailDY);
    for (const particle of particles) {
      particle.update(step, damping, trailDX, trailDY, repulsion);
    }
    mouse.prevX = mouse.x;
    mouse.prevY = mouse.y;
    drawParticles();
  }

  animationId = requestAnimationFrame(animate);
}

function clearPointer() {
  mouse.active = false;
  mouse.pressed = false;
}

function syncAnimation() {
  if (animationId !== null) cancelAnimationFrame(animationId);
  animationId = null;
  lastFrameTime = null;
  nextFrameTime = 0;
  clearPointer();
  if (!document.hidden) {
    if (reducedMotion.matches) drawParticles();
    else animationId = requestAnimationFrame(animate);
  }
}

function updatePointer(event) {
  if (!mouse.active) {
    mouse.prevX = event.clientX;
    mouse.prevY = event.clientY;
  }
  mouse.x = event.clientX;
  mouse.y = event.clientY;
  mouse.active = true;
}

// 统一鼠标与触摸输入，保留手机页面的正常滚动与链接点击。
window.addEventListener('pointermove', (event) => {
  if (event.isPrimary) updatePointer(event);
}, { passive: true });
window.addEventListener('pointerdown', (event) => {
  if (event.isPrimary && event.button === 0) {
    updatePointer(event);
    mouse.pressed = true;
  }
}, { passive: true });
window.addEventListener('pointerup', (event) => {
  if (event.isPrimary) {
    mouse.pressed = false;
    if (event.pointerType !== 'mouse') clearPointer();
  }
}, { passive: true });
window.addEventListener('pointercancel', clearPointer, { passive: true });
window.addEventListener('pointerout', (event) => {
  if (event.relatedTarget === null) clearPointer();
}, { passive: true });
window.addEventListener('blur', clearPointer);
document.addEventListener('visibilitychange', syncAnimation);
reducedMotion.addEventListener('change', syncAnimation);
window.addEventListener('resize', () => {
  if (resizeId !== null) return;
  resizeId = requestAnimationFrame(() => {
    resizeId = null;
    resizeCanvas();
    if (reducedMotion.matches) drawParticles();
  });
});

resizeCanvas();
syncAnimation();

// 内容隐藏/显示功能
const toggleBtn = document.getElementById('toggleBtn');
const pageContent = [
  document.querySelector('.navbar'),
  document.querySelector('.header'),
  ...document.querySelectorAll('.section'),
  document.querySelector('.footer')
];

let isHidden = false;
toggleBtn.addEventListener('click', () => {
  isHidden = !isHidden;
  pageContent.forEach(el => {
    el.classList.toggle('content-hidden', isHidden);
  });
  canvas.classList.toggle('clear', isHidden);
  toggleBtn.textContent = isHidden ? ' show personal page' : ' hide content';
});
