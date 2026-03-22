const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

// 粒子配置
const particleCount = 5000;
const particles = [];
// let mouse = { x: null, y: null, radius: 120, active: false };
// 鼠标 + 卡门涡街核心参数
let mouse = { 
    x: null, y: null, radius: 130, active: false,
    prevX: null, prevY: null, // 记录鼠标轨迹（生成尾流）
    velocity: null, //鼠标的速度
    vortexStrength: 0.01,    // 涡街强度（力学可调参数）
    fillForce: 0.01          // 空缺填补力
};

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
  // ========= 性能优化：用距离平方代替开方，彻底解决卡顿 =========
  const dx = this.x - mouse.x;
  const dy = this.y - mouse.y;
  const distSq = dx * dx + dy * dy; // 弃用 Math.sqrt()
  const invDistSq = 1 / distSq; // 反距离平方（更自然的力学衰减）
  const radiusSq = mouse.radius * mouse.radius; // 同样弃用 Math.sqrt()，直接比较平方距离
  const repulsiveForce = 8 ; // 鼠标排斥力强度（可调参数）

  // ========= 卡门涡街 + 尾流填补逻辑（力学流体模拟） =========
  if (mouse.active && distSq < radiusSq) {
    // const angle = Math.atan2(dy, dx);
    // 1. 鼠标排斥力（靠近指针）
    this.speedX += dx * invDistSq * repulsiveForce;
    this.speedY += dy * invDistSq * repulsiveForce;

    // 2. 核心：鼠标后方尾流空缺 → 粒子填补力（不空缺也有，但更弱）
      const trailDX = mouse.x - mouse.prevX;
      const trailDY = mouse.y - mouse.prevY;
      // 涡街旋转力（模拟流体涡流）
      const velocity_r_x = this.speedX - trailDX;// 粒子相对于鼠标尾流的相对速度
      const velocity_r_y = this.speedY - trailDY;
      const omega = (trailDX * dy - trailDY * dx) * invDistSq; // 旋转方向（基于鼠标移动方向和粒子位置，主要求其正负性，关于其相对位置）
      this.speedX -= omega * velocity_r_y * mouse.vortexStrength ;
      this.speedY += omega * velocity_r_x * mouse.vortexStrength ;
      // 负压区填补：粒子向鼠标尾部空缺聚集
    //   this.speedX -= dx * mouse.fillForce;
    //   this.speedY -= dy * mouse.fillForce;
    
    // if (mouse.prevX !== null) {

    // }
  }

  // ========= 统一物理阻尼（丝滑运动，删除冗余判断） =========
//   this.speedX *= 0.97;
//   this.speedY *= 0.97;

if (this.speedX > 0.5 || this.speedX < -0.5) this.speedX *= 0.9;
if (this.speedY > 0.5 || this.speedY < -0.5) this.speedY *= 0.9;

  // 引入噪声改变运动轨迹，增加自然感
  this.speedX += (Math.random() - 0.5) * 0.01;
  this.speedY += (Math.random() - 0.5) * 0.01;
  // 自由漂浮 + 边界反弹
  this.x += this.speedX;
  this.y += this.speedY;
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


window.addEventListener('mousemove', (e) => {
  mouse.prevX = mouse.x; // 保存上一帧位置（生成尾流）
  mouse.prevY = mouse.y;
  mouse.x = e.x;
  mouse.y = e.y;
  const dx = mouse.x - mouse.prevX;
  const dy = mouse.y - mouse.prevY;
  mouse.velocity = dx * dx + dy * dy; // 计算鼠标速度（用于动态调整涡街强度）
  // 根据速度动态调整涡街强度（更快的移动产生更强的涡街）
//   mouse.vortexStrength = 0.01 + Math.min(mouse.velocity * 0.000001, 0.05);
  mouse.vortexStrength = 0.05
  mouse.active = true;
});// 鼠标监听

window.addEventListener('mouseout', () => mouse.active = false);// 鼠标离开时停用交互

window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;
});// 窗口调整时更新画布尺寸

// 内容隐藏/显示功能
const toggleBtn = document.getElementById('toggleBtn');
// 需要隐藏的所有页面元素
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

  canvas.classList.toggle('clear', isHidden); // 切换粒子画布的清晰度

  // 切换按钮文字
  toggleBtn.textContent = isHidden ? ' show personal page' : ' hide content';
});