"use strict";
(() => {
  const outcomes = Object.freeze({skipped:"广告出现，并提前自动关闭",missed:"广告出现，但没有自动关闭",redirected:"误点或晃动后跳进广告",no_ad:"没有出现广告，暂时无法判断",service:"服务无法连接或被系统停止",unsupported:"无法安装或系统不支持授权"});
  const clean = (value,limit) => String(value===null||value===undefined?"":value).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, "").trim().slice(0,limit);
  function buildReport(data,dateText) {
    const brand=clean(data.brand,40),target=clean(data.target,100);
    if(!brand||!target||!Object.prototype.hasOwnProperty.call(outcomes,data.outcome))throw new Error("请先选择手机品牌、填写目标应用，并选择实际现象。");
    const optional=(key,limit)=>clean(data[key],limit)||"未填写 / 不确定";
    return ["开屏清净兼容反馈（用户报告，尚未复核）",`填写时间（本机）：${clean(dateText,80)}`,`开屏清净版本：${optional("toolVersion",40)}`,`手机品牌：${brand}`,`手机型号：${optional("model",80)}`,`系统及版本：${optional("system",120)}`,`目标应用：${target}`,`目标应用版本：${optional("targetVersion",60)}`,`进入应用的方式：${optional("entryMode",80)}`,`实际现象：${outcomes[data.outcome]}`,`首页服务状态：${optional("serviceStatus",80)}`,"",`补充说明：${optional("notes",600)}`,"","未出现广告不能算跳过成功。本记录不等于该机型已完成适配。"].join("\n");
  }
  if(typeof module!=="undefined"&&module.exports)module.exports={buildReport,outcomes};
  if(typeof document==="undefined")return;
  const form=document.querySelector("#trial-feedback"),result=document.querySelector("#trial-result"),report=document.querySelector("#trial-report"),status=document.querySelector("#form-status");
  function invalidate(){result.hidden=true;report.value="";status.textContent="";}
  form.addEventListener("input",invalidate);form.addEventListener("change",invalidate);
  form.addEventListener("submit",event=>{
    event.preventDefault();
    if(!form.reportValidity())return;
    try{const values=Object.create(null);new FormData(form).forEach((value,key)=>{values[key]=value;});report.value=buildReport(values,new Date().toLocaleString("zh-CN",{hour12:false}));result.hidden=false;status.textContent="已在本页生成，没有发送。请核对后自行分享。";result.scrollIntoView({behavior:"auto",block:"start"});}
    catch(error){status.textContent=error.message;}
  });
  document.querySelector("#clear-feedback").addEventListener("click",()=>{form.reset();invalidate();status.textContent="本页输入已清空。";});
  document.querySelector("#copy-feedback").addEventListener("click",async()=>{
    if(result.hidden||!report.value)return;
    try{if(!navigator.clipboard||typeof navigator.clipboard.writeText!=="function")throw new Error();await navigator.clipboard.writeText(report.value);status.textContent="反馈已复制。请自行粘贴给邀请你测试的人。";}
    catch(error){report.focus();report.select();status.textContent="浏览器未允许自动复制，请长按或手动复制选中的文字。";}
  });
  document.querySelector("#save-feedback").addEventListener("click",()=>{
    if(result.hidden||!report.value)return;
    const url=URL.createObjectURL(new Blob([report.value],{type:"text/plain;charset=utf-8"}));const link=document.createElement("a");link.href=url;link.download="SplashGuard-feedback.txt";document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);status.textContent="已请求浏览器保存文字文件，没有上传或发送。";
  });
})();
