const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

// 粒子配置
const particleCount = 300;
const particles = [];
let mouse = { x: null, y: null, radius: 120, active: false };

// 粒子类
class Particle {
  constructor() {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.size = Math.random() * 3 + 1;
    this.speedX = Math.random() * 0.5 - 0.25;
    this.speedY = Math.random() * 0.5 - 0.25;
    this.color = '#1a73e8';
  }
  update() {
    // 鼠标吸引逻辑
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      if (distance < mouse.radius) {
        // 绕鼠标旋转
        const angle = Math.atan2(dy, dx);
        // this.x = mouse.x + Math.cos(angle) * mouse.radius;
        // this.y = mouse.y + Math.sin(angle) * mouse.radius;
        this.x += Math.cos(angle) * 0.5;
        this.y += Math.sin(angle) * 0.5;
        // 鼠标附近加速
        this.speedX += Math.cos(angle) /distance;
        this.speedY += Math.sin(angle) /distance;

      }

    }
    // 自由漂浮
    this.x += this.speedX;
    this.y += this.speedY; 
    if (this.speedX > 0.5 || this.speedX < -0.5) this.speedX *= 0.980;
    if (this.speedY > 0.5 || this.speedY < -0.5) this.speedY *= 0.980;

    // 边界反弹
    if (this.x < 0 || this.x > width) this.speedX *= -1;
    if (this.y < 0 || this.y > height) this.speedY *= -1;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
  }
}

// 初始化粒子
for (let i = 0; i < particleCount; i++) particles.push(new Particle());

// 动画循环
function animate() {
  ctx.clearRect(0, 0, width, height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animate);
}
animate();

// 鼠标监听
window.addEventListener('mousemove', (e) => {
  mouse.x = e.x;
  mouse.y = e.y;
  mouse.active = true;
});
window.addEventListener('mouseout', () => mouse.active = false);
window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});

// 内容隐藏/显示功能
const toggleBtn = document.getElementById('toggleBtn');
// 需要隐藏的所有页面元素
const pageContent = [
  document.querySelector('.navbar'),
  document.querySelector('.header'),
  ...document.querySelectorAll('.section'),
  document.querySelector('.footer')
];

