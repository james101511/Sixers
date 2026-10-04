/* 可縮放、可拖曳的互動地圖（Leaflet + OpenStreetMap/CARTO 底圖）。
   TripLive.render(legs, cities) 設定路線；TripLive.show() 在地圖分頁顯示時建立／刷新；
   TripLive.refreshTheme() 切換淺色／深色底圖。若 Leaflet 或底圖載入失敗，頁面會退回示意圖。 */
(function(){
var LL={chi:[41.88,-87.63],cle:[41.5,-81.69],akr:[41.08,-81.52],nyc:[40.71,-74.0],phi:[39.95,-75.17],was:[38.9,-77.04]};
var TPE=[25.08,121.23-360];            // 以 -238.77 表示台北，讓跨太平洋的線連續
var ORD=[41.98,-87.9],IAD=[38.95,-77.46];
var LABEL_LEFT={was:1,akr:1};
var T=function(s){return window.TR?window.TR(s):s};
var st={map:null,tile:null,ref:null,group:null,legs:[],cities:[],box:null,style:"gray"};
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim()}
function dark(){return document.documentElement.dataset.eff==="dark"}
function arc(a,b,bend,n){
 // 二次曲線近似的弧線：控制點取中點，再沿著垂直於連線的方向偏移
 n=n||40;var mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dx=b[1]-a[1],dy=b[0]-a[0],len=Math.sqrt(dx*dx+dy*dy)||1;
 var px=mx+(-dy/len)*bend*len,py=my+(dx/len)*bend*len,pts=[];
 for(var i=0;i<=n;i++){var t=i/n,u=1-t;pts.push([u*u*a[0]+2*u*t*px+t*t*b[0],u*u*a[1]+2*u*t*py+t*t*b[1]]);}
 return pts;
}
function angle(p,q){return Math.atan2(-(q[0]-p[0]),q[1]-p[1])*180/Math.PI}
function planeIcon(deg,big){return L.divIcon({className:"lplane",html:'<span style="transform:rotate('+deg+'deg);font-size:'+(big?18:16)+'px">✈</span>',iconSize:[0,0]})}
function cityIcon(c){
 var side=LABEL_LEFT[c.k]?"l":"r";
 var html='<div class="lm '+side+'" style="--c:'+(c.color&&c.color!=="#0b2a5b"?c.color:css("--phi"))+'"><i></i><b>'+c.label+'</b>'+(c.sub?'<span>'+c.sub+'</span>':'')+'</div>';
 return L.divIcon({className:"lmw",html:html,iconSize:[0,0]});
}
function draw(){
 if(!st.map)return;
 if(st.group)st.group.remove();
 var g=L.layerGroup().addTo(st.map);st.group=g;
 var fly=css("--fly"),train=css("--train"),car=css("--car");
 // 長程航班：台北 ↔ 芝加哥／華盛頓
 [[TPE,ORD,"去程 BR056",-0.12],[IAD,TPE,"回程 BR003",-0.12]].forEach(function(r){
  var pts=arc(r[0],r[1],r[3],60);
  L.polyline(pts,{color:fly,weight:2,opacity:.55,dashArray:"4 7"}).addTo(g);
  var mid=pts[30];L.marker(mid,{icon:planeIcon(angle(pts[28],pts[32])),interactive:false}).addTo(g);
 });
 L.marker(TPE,{icon:L.divIcon({className:"lmw",html:'<div class="lm r tw"><i></i><b>'+T("台北")+'</b><span>TPE</span></div>',iconSize:[0,0]})}).addTo(g);
 // 本次行程
 st.legs.forEach(function(l){
  var a=LL[l.from],b=LL[l.to];if(!a||!b)return;
  if(l.mode==="fly"){
   var pts=arc(a,b,l.bend||-0.14,40);
   L.polyline(pts,{color:fly,weight:3,dashArray:"7 7"}).addTo(g);
   L.marker(pts[20],{icon:planeIcon(angle(pts[18],pts[22]),true),interactive:false}).addTo(g);
  }else{
   L.polyline([a,b],{color:l.mode==="car"?car:train,weight:l.mode==="car"?5:4,opacity:.9,lineCap:"round"}).addTo(g);
  }
 });
 st.cities.forEach(function(c){
  var p=LL[c.k];if(!p)return;
  var m=L.marker(p,{icon:cityIcon(c),riseOnHover:true}).addTo(g);
  m.bindPopup("<b>"+c.label+"</b>"+(c.sub?"<br>"+c.sub:""));
 });
 var ll=st.cities.map(function(c){return LL[c.k]}).filter(Boolean);
 st.box=ll.length?L.latLngBounds(ll).pad(.22):null;
}
function tiles(){
 if(st.tile)st.tile.remove();if(st.ref){st.ref.remove();st.ref=null}
 var base="https://server.arcgisonline.com/ArcGIS/rest/services/",at='Tiles © <a href="https://www.esri.com">Esri</a> — Esri, HERE, Garmin, © OpenStreetMap contributors';
 if(st.style==="street"){
  st.tile=L.tileLayer(base+"World_Street_Map/MapServer/tile/{z}/{y}/{x}",{maxNativeZoom:18,maxZoom:18,attribution:at}).addTo(st.map);
 }else{
  var d=dark(),k=d?"World_Dark_Gray_":"World_Light_Gray_";
  st.tile=L.tileLayer(base+"Canvas/"+k+"Base/MapServer/tile/{z}/{y}/{x}",{maxNativeZoom:16,maxZoom:18,attribution:at}).addTo(st.map);
  st.ref=L.tileLayer(base+"Canvas/"+k+"Reference/MapServer/tile/{z}/{y}/{x}",{maxNativeZoom:16,maxZoom:18,opacity:.55}).addTo(st.map);
 }
 st.tile.bringToBack();
}
function init(){
 var el=document.getElementById("livemap");if(!el||!window.L)return false;
 if(st.map)return true;
 var touch=L.Browser.mobile||("ontouchstart" in window);
 st.map=L.map(el,{zoomControl:true,attributionControl:true,scrollWheelZoom:false,dragging:!touch,tap:false,worldCopyJump:false,zoomSnap:.5,minZoom:2,maxZoom:14,center:[40.5,-80],zoom:5});
 tiles();
 // 縮小到看全球時，隱藏擠在一起的城市文字，只留台北
 st.map.on("zoomend",function(){el.classList.toggle("far",st.map.getZoom()<3.8)});
 // 電腦：點一下地圖後才啟用滾輪縮放，避免捲頁時誤觸
 el.addEventListener("click",function(){st.map.scrollWheelZoom.enable()});
 el.addEventListener("mouseleave",function(){st.map.scrollWheelZoom.disable()});
 // 自訂按鈕
 var Ctl=L.Control.extend({options:{position:"bottomright"},onAdd:function(){
  var d=L.DomUtil.create("div","lbtns");
  d.innerHTML='<button type="button" data-lm="fit"></button><button type="button" data-lm="tw"></button><button type="button" data-lm="style"></button>';
  L.DomEvent.disableClickPropagation(d);
  d.addEventListener("click",function(e){var b=e.target.closest("[data-lm]");if(!b)return;
   if(b.dataset.lm==="fit")fit();
   else if(b.dataset.lm==="tw")world();
   else{st.style=st.style==="gray"?"street":"gray";relabel();tiles()}});
  return d;}});
 new Ctl().addTo(st.map);
 relabel();
 draw();
 // 容器大小改變（分頁切換、動畫結束、旋轉手機）時自動校正，並在第一次取得有效尺寸時重新對焦
 if(window.ResizeObserver){var first=true;new ResizeObserver(function(){if(!st.map)return;st.map.invalidateSize();if(first&&el.clientWidth>0){first=false;fit()}}).observe(el)}
 return true;
}
function relabel(){
 var q=function(k){return document.querySelector('.lbtns [data-lm="'+k+'"]')};
 var a=q("fit"),b=q("tw"),c=q("style");
 if(a)a.textContent=T("回到行程");if(b)b.textContent=T("全球視角");if(c)c.textContent=T(st.style==="gray"?"樣式：簡約":"樣式：彩色");
}
function fit(){if(st.map&&st.box)st.map.fitBounds(st.box,{maxZoom:7,animate:true,padding:[20,20]})}
function world(){if(!st.map)return;st.map.fitBounds(L.latLngBounds([TPE,ORD,IAD,[15,-238],[50,-70]]).pad(.05),{animate:true})}
window.TripLive={
 available:function(){return!!window.L},
 render:function(legs,cities){st.legs=legs||[];st.cities=cities||[];if(st.map){draw();fit()}},
 show:function(){if(!init())return false;st.map.invalidateSize();fit();setTimeout(function(){if(st.map){st.map.invalidateSize();fit()}},320);return true},
 invalidate:function(){if(st.map)st.map.invalidateSize()},
 relabel:relabel,
 refreshTheme:function(){if(st.map){tiles();draw()}}
};
})();
