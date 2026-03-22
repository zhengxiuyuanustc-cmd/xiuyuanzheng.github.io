const canvas = document.getElementById('particles');
const ctx = canvas.getContext('2d');
let width = window.innerWidth;
let height = window.innerHeight;
canvas.width = width;
canvas.height = height;

// 粒子配置
// 屏幕自适应粒子数量（根据分辨率自动调整）
let particleCount;
const screenWidth = window.innerWidth;
if (screenWidth > 1200) {
  particleCount = 5000;   // 电脑大屏：高密度粒子
} else if (screenWidth > 768) {
  particleCount = 2000;   // 平板/中等屏幕：中等粒子
} else {
  particleCount = 1000;    // 手机小屏：低密度粒子（丝滑不卡）
}
const particles = [];
// let mouse = { x: null, y: null, radius: 120, active: false };
// 鼠标 + 卡门涡街核心参数
let mouse = { 
    x: null, y: null, radius: 130, active: false,
    prevX: null, prevY: null, // 记录鼠标轨迹（生成尾流）
    velocity: null, //鼠标的速度
    vortexStrength: 0.1,    // 涡街强度（力学可调参数）
    fillForce: 0.1          // 空缺填补力
};

// 粒子类
class Particle {

    constructor() {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.size = Math.random() * 3 + 1;
        this.speedX = (Math.random() -0.5)*1;
        this.speedY = (Math.random() -0.5)*1;
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
  const repulsionForce_adaptive = 0.1; // 自适应排斥力强度（根据鼠标速度动态调整，增加交互感）

  // ========= 卡门涡街 + 尾流填补逻辑（力学流体模拟） =========
  if (mouse.active && distSq < radiusSq) {
    // const angle = Math.atan2(dy, dx);
    // 1. 鼠标排斥力（靠近指针）
    this.speedX += dx * invDistSq * (repulsiveForce + repulsionForce_adaptive*mouse.velocity);
    this.speedY += dy * invDistSq * (repulsiveForce + repulsionForce_adaptive*mouse.velocity);

    // 2. 核心：鼠标后方尾流空缺 → 粒子填补力（不空缺也有，但更弱）
      const trailDX = mouse.x - mouse.prevX;
      const trailDY = mouse.y - mouse.prevY;

      const velocity_r_x = this.speedX - trailDX;// 粒子相对于鼠标尾流的相对速度
      const velocity_r_y = this.speedY - trailDY;
      const omega = (trailDX * dy - trailDY * dx) * invDistSq; // 旋转矢量（基于鼠标移动方向和粒子位置，主要求其正负性，关于其相对位置）

      // 涡街旋转力（模拟流体涡流）

      // todo: 进一步优化：根据鼠标速度动态调整涡街强度（更快的移动产生更强的涡流效果）



      // 负压区填补：粒子向鼠标尾部空缺聚集

      this.speedX -= omega * velocity_r_y * mouse.fillForce; // 旋转力对粒子速度的影响（垂直于相对速度方向，形成涡流效果）;
      this.speedY += omega * velocity_r_x * mouse.fillForce; ;



  }

  // ========= 统一物理阻尼（丝滑运动，删除冗余判断） =========

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
  // 根据速度动态调整填补强度（更快的移动产生更强的填补效果）
//   mouse.vortexStrength = 0.01 + Math.min(mouse.velocity * 0.000001, 0.05);
  mouse.active = true;
});// 鼠标监听

// 手机端触摸滑动（模拟鼠标移动，核心修复）
window.addEventListener('touchstart', (e) => {
  e.preventDefault(); // 禁止页面抖动
  const touch = e.touches[0];
  mouse.prevX = touch.clientX;
  mouse.prevY = touch.clientY;
  mouse.x = touch.clientX;
  mouse.y = touch.clientY;
  mouse.active = true;
});

window.addEventListener('touchmove', (e) => {
  e.preventDefault(); // 禁止页面滚动干扰
  const touch = e.touches[0];
  // 同步记录轨迹（保证空缺填补/涡街效果生效）
  mouse.prevX = mouse.x;
  mouse.prevY = mouse.y;
  mouse.x = touch.clientX;
  mouse.y = touch.clientY;
});

window.addEventListener('touchend', () => {
  mouse.active = false; // 手指离开=鼠标移出
});

// 窗口大小适配
window.addEventListener('resize', () => {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width;
  canvas.height = height;

});

window.addEventListener('mouseout', () => mouse.active = false);// 鼠标离开时停用交互

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