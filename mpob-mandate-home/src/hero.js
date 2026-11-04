// Mandate Studio Home concept: one unbroken camera flight through one palm-oil world, driven by scroll.
// Raw WebGL2, no libraries, no network. Everything that could stall the opening is time-sliced (see boot()).
(() => {
'use strict';
const qs = new URLSearchParams(location.search);
const TEST_G = qs.has('g') ? +qs.get('g') : null;      // ?g=2.0 holds the camera at that point (used by the acceptance shots)
const FORCE_TIER = /^[012]$/.test(qs.get('tier') || '') ? +qs.get('tier') : null;
const OFF = new Set((qs.get('off') || '').split(','));
const stage = document.getElementById('stage'), track = document.getElementById('track'), canvas = document.getElementById('scene'), poster = document.getElementById('poster');
const N = 7, NAMES = ['Sky', 'Mandate', 'Price', 'Shock test', 'Money sources', 'Mandate rule', 'Decide'];
const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
const mix = (a, b, t) => a + (b - a) * t;
const ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const vsub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], vadd = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]], vmul = (a, s) => [a[0] * s, a[1] * s, a[2] * s];
const vdot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2], vlen = a => Math.hypot(a[0], a[1], a[2]), vnorm = a => vmul(a, 1 / (vlen(a) || 1));
const vcross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
let reduced = reducedMQ.matches; reducedMQ.addEventListener?.('change', e => { reduced = e.matches; needDraw = true; });
const coarse = matchMedia('(pointer: coarse)').matches;

/* ── World layout (metres). -z is out to sea, +x is along the coast road. ── */
const ZL = -700, WORD_W = 520, COAST = -3900, ROAD_Z = -3650, DROP = [2640, 0, ROAD_Z], DROP_R = 13, DROP_H = 21;
const hgt = (x, z) => {
  const r = 5 * Math.sin(x * .0031 + 1) * Math.sin(z * .0027) + 2.2 * Math.sin(x * .0083 + z * .0061) + .9 * Math.sin(z * .017 - x * .011);
  const cz = COAST + 70 * Math.sin(x * .0021), land = ss(cz - 70, cz + 200, z);
  let h = mix(-14, r + 9, land);
  h = mix(h, 6, 1 - ss(0, 120, Math.max(Math.abs(x + 200) - 560, Math.abs(z + 3050) - 400)));
  h = mix(h, 6, (1 - ss(14, 70, Math.abs(z - ROAD_Z))) * ss(-700, -520, x));
  return h;
};
const estate = (x, z) => {
  if (z < COAST + 70 * Math.sin(x * .0021) + 60) return false;
  if (x > -760 && x < 360 && z > -3450 && z < -2650) return false;
  if (x > -560 && Math.abs(z - ROAD_Z) < 26) return false;
  if (Math.abs(z - ZL) < 13 && Math.abs(x) < 300) return false;
  if (Math.hypot(x - DROP[0], z - DROP[2]) < 70) return false;
  const mx = ((x % 216) + 216) % 216, mz = ((z % 216) + 216) % 216;
  return mx > 7 && mz > 7;
};
/* The same two functions in GLSL, so the ground under each palm always matches. */
const G_WORLD = `
float H(vec2 p){
  float r=5.*sin(p.x*.0031+1.)*sin(p.y*.0027)+2.2*sin(p.x*.0083+p.y*.0061)+.9*sin(p.y*.017-p.x*.011);
  float cz=${COAST}.+70.*sin(p.x*.0021);
  float h=mix(-14.,r+9.,smoothstep(cz-70.,cz+200.,p.y));
  h=mix(h,6.,1.-smoothstep(0.,120.,max(abs(p.x+200.)-560.,abs(p.y+3050.)-400.)));
  h=mix(h,6.,(1.-smoothstep(14.,70.,abs(p.y-(${ROAD_Z}.))))*smoothstep(-700.,-520.,p.x));
  return h;
}`;

/* ── Shared shader pieces ── */
const UBO = `layout(std140) uniform F{mat4 VP;vec4 Cam;vec4 Sun;vec4 SunC;vec4 Zen;vec4 Hor;vec4 FogC;vec4 Amb;vec4 RF;vec4 RR;vec4 RU;vec4 Misc;vec4 Misc2;};`;
// Cam.w time | Sun.w letter shadow | SunC.w rain | Zen.w flash | Hor.w fog density | FogC.w palm radius | Amb.w alpha cut
// RF.w near | RR.w far | RU.w lens x | Misc: lens y, output scale, viewport h, unused | Misc2: letters z, width, base y, height
const VH = `#version 300 es
precision highp float;precision highp int;${UBO}\n`;
const FH = `#version 300 es
precision highp float;precision highp int;precision highp sampler3D;${UBO}\nout vec4 O;\n`;
const G_SKY = `
vec3 skyCol(vec3 d){
  float y=clamp(d.y,0.,1.);
  float hl=dot(Hor.rgb,vec3(.33));vec3 cream=mix(Hor.rgb,hl*vec3(1.1,1.04,.86),.42);
  vec3 c=mix(Hor.rgb,cream,smoothstep(0.,.13,y));c=mix(c,Zen.rgb,smoothstep(.05,.72,y));
  float s=max(dot(d,Sun.xyz),0.);
  c+=SunC.rgb*(pow(s,5.)*.016+pow(s,40.)*.03+pow(s,420.)*.16);
  if(d.y<0.)c=mix(c,FogC.rgb,clamp(-d.y*14.,0.,1.));
  return c;
}
vec3 fogIt(vec3 c,vec3 wp){
  vec3 v=wp-Cam.xyz;float d=length(v);vec3 n=v/max(d,.001);
  float f=1.-exp(-d*Hor.a);
  float s=pow(max(dot(n,Sun.xyz),0.),7.);
  return mix(c,FogC.rgb+SunC.rgb*s*.05,f);
}`;
const G_LSHADOW = `
uniform sampler2D tL;
float letterShadow(vec3 p){
  if(Sun.w<.01||Sun.z>-.02)return 1.;
  float t=(Misc2.x-p.z)/Sun.z;if(t<0.)return 1.;
  vec3 q=p+Sun.xyz*t;vec2 uv=vec2((q.x+Misc2.y*.5)/Misc2.y,(q.y-Misc2.z)/Misc2.w);
  if(uv.x<0.||uv.x>1.||uv.y<0.||uv.y>1.)return 1.;
  return 1.-Sun.w*.82*smoothstep(.3,.7,texture(tL,uv).a);
}`;
const FULL_VS = `#version 300 es
out vec2 P;void main(){vec2 v=vec2((gl_VertexID<<1)&2,gl_VertexID&2);P=v*2.-1.;gl_Position=vec4(P,0.,1.);}`;

/* ── Sky pass. Clouds arrive already marched in a small buffer. ── */
const SKY_FS = FH + `in vec2 P;uniform sampler2D tC;uniform float uClouds;${G_SKY}
void main(){
  vec3 d=normalize(RF.xyz+RR.xyz*(P.x+RU.w)+RU.xyz*(P.y+Misc.x));
  vec3 c=skyCol(d);
  float s=dot(d,Sun.xyz);c+=SunC.rgb*smoothstep(.99955,.9998,s)*2.2*smoothstep(4.,10.,SunC.r);
  // far blue hills, inland only: gives the haze something to swallow
  float az=atan(d.x,d.z),land=smoothstep(-.35,.45,d.z+d.x*.8);
  float r1=.016+.012*sin(az*5.+1.)+.006*sin(az*17.+2.)+.003*sin(az*41.);
  float r2=.008+.008*sin(az*7.+4.)+.004*sin(az*23.);
  if(d.y<r1*land)c=mix(c,mix(FogC.rgb,Zen.rgb,.32),.55*land);
  if(d.y<r2*land)c=mix(c,mix(FogC.rgb,Zen.rgb,.5),.5*land);
  if(uClouds>.5){vec2 u=P*.5+.5,t=1./vec2(textureSize(tC,0));vec4 q=(texture(tC,u+t*vec2(.75,.25))+texture(tC,u+t*vec2(-.25,.75))+texture(tC,u+t*vec2(-.75,-.25))+texture(tC,u+t*vec2(.25,-.75)))*.25;c=c*(1.-q.a)+q.rgb*2.;}
  O=vec4(c*Misc.y,1.);
}`;
const OVER_FS = `#version 300 es
precision highp float;precision highp int;${UBO}\nout vec4 O;in vec2 P;uniform sampler2D tC;
void main(){vec2 u=P*.5+.5,t=1./vec2(textureSize(tC,0));vec4 q=(texture(tC,u+t*vec2(.75,.25))+texture(tC,u+t*vec2(-.25,.75))+texture(tC,u+t*vec2(-.75,-.25))+texture(tC,u+t*vec2(.25,-.75)))*.25;O=vec4(q.rgb*2.*Misc.y,q.a);}`;
/* Volumetric clouds: premultiplied colour (x0.5 so an 8-bit buffer still works) and coverage. */
const CLOUD_FS = FH + `in vec2 P;uniform sampler3D tN;uniform vec4 uLay;uniform vec3 uLit,uShade;uniform int uSteps;${G_SKY}
float dens(vec3 p,bool hi){
  float hf=(p.y-uLay.x)/(uLay.y-uLay.x);
  float prof=smoothstep(0.,.14,hf)*smoothstep(1.,.5,hf);
  vec3 q=p*.00058+vec3(Cam.w*.0016,0.,Cam.w*.0006);
  float b=texture(tN,q).r;
  float d=b-(1.-uLay.z)-(1.-prof)*.5;
  if(d<=0.)return 0.;
  if(hi)d-=texture(tN,q*3.3).g*.17*(1.-hf*.35);
  return clamp(d*uLay.w,0.,1.);
}
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
  O=vec4(0.);
  if(uLay.z<.02)return;
  vec3 ro=Cam.xyz,rd=normalize(RF.xyz+RR.xyz*(P.x+RU.w)+RU.xyz*(P.y+Misc.x));
  float t0,t1;
  if(abs(rd.y)<.0006)return;
  float a=(uLay.x-ro.y)/rd.y,b=(uLay.y-ro.y)/rd.y;
  t0=max(min(a,b),0.);t1=max(a,b);
  if(t1<=0.)return;
  t1=min(t1,t0+7000.);
  float st=(t1-t0)/float(uSteps);
  float t=t0+st*ign(gl_FragCoord.xy);
  vec3 acc=vec3(0.);float tr=1.;
  float mu=dot(rd,Sun.xyz),ph=mix(.72,1.9,pow(max(mu,0.),5.))+.16;
  for(int i=0;i<uSteps;i++){
    vec3 p=ro+rd*t;
    float d=dens(p,true);
    if(d>.004){
      float l=0.;for(int j=1;j<=3;j++){l+=dens(p+Sun.xyz*float(j*j)*42.,false);}
      float sh=exp(-l*2.4),hf=clamp((p.y-uLay.x)/(uLay.y-uLay.x),0.,1.);
      vec3 c=mix(uShade,uLit,sh*(.4+.6*hf))+SunC.rgb*sh*ph*.022*(1.-exp(-d*5.));
      c+=vec3(.55,.62,.72)*Zen.w*2.2;
      float e=exp(-d*st*.017);
      acc+=c*tr*(1.-e);tr*=e;
      if(tr<.02)break;
    }
    t+=st;
  }
  float fade=exp(-t0*.00011);                    // far clouds melt into the haze
  vec3 hz=skyCol(rd);
  O=vec4(mix(hz*(1.-tr),acc,fade)*.5,(1.-tr));
}`;

/* ── Ground and sea ── */
const TERR_VS = VH + `in vec2 aRT;uniform float uYaw;out vec3 W;out float vSea;${G_WORLD}
void main(){
  float a=uYaw+aRT.y;vec2 p=Cam.xz+aRT.x*vec2(cos(a),sin(a));
  float h=H(p);vSea=h;W=vec3(p.x,max(h,0.),p.y);gl_Position=VP*vec4(W,1.);
}`;
const TERR_FS = FH + `in vec3 W;in float vSea;uniform sampler3D tN;${G_WORLD}${G_SKY}${G_LSHADOW}
float estate(vec2 p){
  float cz=${COAST}.+70.*sin(p.x*.0021);
  if(p.y<cz+60.)return 0.;
  if(p.x>-760.&&p.x<360.&&p.y>-3450.&&p.y<-2650.)return 0.;
  if(p.x>-560.&&abs(p.y-(${ROAD_Z}.))<26.)return 0.;
  if(length(p-vec2(${DROP[0]}.,${DROP[2]}.))<70.)return 0.;
  return 1.;
}
void main(){
  vec3 V=W-Cam.xyz;float dist=length(V);vec3 vd=V/dist;
  vec2 p=W.xz;vec3 col;
  if(vSea<=.05){
    // sea: two sliding noise normals, sky reflection, sun road
    float tt=Cam.w;
    float lod=clamp(dist/2600.,0.,1.);
    vec2 g1=texture(tN,vec3(p*.012+tt*.012,.3)).rg-.5,g2=texture(tN,vec3(p*.043-tt*.02,.7)).rg-.5;
    vec3 n=normalize(vec3((g1.x+g2.x*.6)*mix(.34,.06,lod),1.,(g1.y+g2.y*.6)*mix(.34,.06,lod)));
    vec3 r=reflect(vd,n);r.y=abs(r.y);
    float fr=.04+.96*pow(1.-max(dot(-vd,n),0.),5.);
    vec3 deep=mix(vec3(.02,.05,.07),Amb.rgb*.22,.5);
    col=mix(deep,skyCol(r)*.82,clamp(fr*1.05,0.,1.));
    float s=pow(max(dot(r,Sun.xyz),0.),340.);
    col+=SunC.rgb*s*.9;
    col+=SunC.rgb*pow(max(dot(r,Sun.xyz),0.),18.)*.03;
  }else{
    float e=.9;float h0=H(p);
    vec3 n=normalize(vec3(h0-H(p+vec2(e,0.)),e,h0-H(p+vec2(0.,e))));
    float NL=max(dot(n,Sun.xyz),0.);
    vec2 d2=texture(tN,vec3(p*.021,.2)).rg,d3=texture(tN,vec3(p*.0031,.6)).rg;
    float mask=estate(p);
    // palm lattice, also used for the crown shadows and the far canopy
    float a=7.794,j=floor(p.y/a+.5),ox=mod(j,2.)*4.5,i=floor((p.x-ox)/9.+.5);
    vec2 c=vec2(i*9.+ox,j*a),q=p-c;
    float pxs=fwidth(p.x)+fwidth(p.y);
    vec2 blk=floor(p/216.);
    float bv=fract(sin(dot(blk,vec2(12.98,78.23)))*43758.5);
    vec2 mo=mod(p,216.);
    float track=max(1.-smoothstep(3.5,6.5,min(mo.x,216.-mo.x)),1.-smoothstep(3.5,6.5,min(mo.y,216.-mo.y)))*mask;
    vec3 under=mix(vec3(.018,.04,.016),vec3(.05,.075,.028),d2.r);
    vec3 soil=mix(vec3(.26,.105,.05),vec3(.40,.18,.09),d2.g);
    vec3 sand=vec3(.62,.49,.34);
    // crowns: near the camera the real palms cast these; far away they are the canopy itself
    vec2 sh=normalize(Sun.xz+vec2(.0001))*min(11./max(Sun.y,.05),24.);
    vec2 qs=(p+sh);float jj=floor(qs.y/a+.5),oo=mod(jj,2.)*4.5,ii=floor((qs.x-oo)/9.+.5);
    float dsh=length(qs-vec2(ii*9.+oo,jj*a));
    float shade=mix(1.,.52,mask*(1.-smoothstep(2.2,6.4,dsh+d2.r*2.2))*(1.-track));
    col=under;
    col=mix(col,soil,track);
    float bch=1.-smoothstep(30.,90.,p.y-(${COAST}.+70.*sin(p.x*.0021)));
    col=mix(col,sand,bch*(1.-mask));
    col=mix(col,vec3(.17,.21,.09)*(.6+d2.r*.6),(1.-bch)*(1.-mask));
    // concrete pads
    float rf=1.-smoothstep(-20.,20.,max(abs(p.x+200.)-540.,abs(p.y+3050.)-380.));
    col=mix(col,vec3(.17,.17,.17)*(.7+d2.g*.5),rf);
    vec3 lit=SunC.rgb*NL*shade*.32+Amb.rgb*(.55+.45*n.y)*mix(.72,1.,shade);
    col*=lit;
    // the canopy takes over beyond the instanced palms
    float cb=smoothstep(FogC.w*.72,FogC.w*.96,dist)*mask*(1.-track);
    if(cb>0.){
      float dd=length(q)/4.9;
      float lt=dot(normalize(q+.001),Sun.xz)*.5+.5;
      vec3 leaf=mix(vec3(.03,.085,.03),vec3(.085,.15,.04),bv*.65+d3.r*.35);
      vec3 can=mix(leaf*.34,leaf*(.6+lt*.55),1.-smoothstep(.5,1.1,dd));
      vec3 mean=leaf*.6;
      can=mix(can,mean,clamp(pxs/5.,0.,1.));
      vec3 cl=SunC.rgb*(.05+.26*Sun.y)+Amb.rgb*.9;
      col=mix(col,can*cl,cb);
    }
    col*=letterShadow(W);
  }
  O=vec4(fogIt(col,W)*Misc.y,1.);
}`;

/* ── Oil palms, instanced ── */
const PALM_VS = VH + `in vec3 aP,aN,aU;in vec4 iA,iB;out vec3 W,vN,vU;out float vT;
void main(){
  float c=cos(iB.x),s=sin(iB.x);
  vec3 p=aP;
  float u=aU.x*aU.z;
  p.y+=sin(Cam.w*1.1+iB.z+u*2.4)*u*u*.016;
  p.x+=sin(Cam.w*.8+iB.z*1.7)*u*u*.012;
  vec3 q=vec3(p.x*c-p.z*s,p.y,p.x*s+p.z*c);
  W=q*iA.w+iA.xyz;vN=vec3(aN.x*c-aN.z*s,aN.y,aN.x*s+aN.z*c);vU=aU;vT=iB.y;
  gl_Position=VP*vec4(W,1.);
}`;
const PALM_FS = FH + `in vec3 W,vN,vU;in float vT;${G_SKY}${G_LSHADOW}
void main(){
  vec3 N=normalize(vN);if(!gl_FrontFacing)N=-N;
  vec3 V=normalize(Cam.xyz-W);float a=1.;vec3 col;
  float dcam=length(Cam.xyz-W);
  if(dcam<1.5)discard;
  if(vU.z>.5){
    float v=abs(vU.y),q=vU.x*72.-v*2.6;
    float fw=fwidth(q);
    float m=abs(fract(q)-.5)*2.;
    a=1.-smoothstep(.52,.86,m+v*v*.4);
    a=max(a,1.-smoothstep(.05,.09,v));
    a=mix(a,.9,clamp(fw*1.15,0.,1.));
    if(a<Amb.w)discard;
    float NL=dot(N,Sun.xyz);
    float inner=smoothstep(0.,.42,vU.x);
    vec3 alb=mix(vec3(.022,.05,.018),mix(vec3(.05,.13,.03),vec3(.15,.22,.05),vT),inner);
    float ls=letterShadow(W);
    col=alb*(Amb.rgb*(.52+.48*N.y)*1.15+SunC.rgb*max(NL,0.)*.3*ls);
    col+=vec3(.2,.3,.05)*SunC.rgb*max(-NL,0.)*.13*ls*(.35+inner*.65); // sun through the leaflets
    vec3 Hh=normalize(V+Sun.xyz);
    col+=SunC.rgb*pow(max(dot(N,Hh),0.),24.)*.02*ls;
    col+=Zen.rgb*pow(1.-max(dot(N,V),0.),3.)*.12*inner;
  }else{
    float band=.72+.28*sin(vU.x*170.+sin(vU.y*9.)*2.);
    vec3 alb=vec3(.07,.055,.04)*band;
    col=alb*(Amb.rgb*.9+SunC.rgb*max(dot(N,Sun.xyz),0.)*.3)*letterShadow(W);
  }
  O=vec4(fogIt(col,W)*Misc.y,a);
}`;

/* ── The word, standing in the estate: a stack of cut-out slabs, so it has thickness and a hole to fly through. ── */
const LET_VS = VH + `in vec2 aQ;uniform float uLayers,uDepth;out vec2 vUv;out vec3 W;flat out float vL;
void main(){
  float l=float(gl_InstanceID)/max(uLayers-1.,1.);vL=l;
  vUv=aQ;W=vec3((aQ.x-.5)*Misc2.y,Misc2.z+aQ.y*Misc2.w,Misc2.x-l*uDepth);
  gl_Position=VP*vec4(W,1.);
}`;
const LET_FS = FH + `in vec2 vUv;in vec3 W;flat in float vL;uniform sampler2D tT;${G_SKY}
void main(){
  float d=texture(tT,vUv).a,w=fwidth(d)*.7+.001;
  float a=smoothstep(.5-w,.5+w,d);
  if(a<max(Amb.w,.05))discard;
  float back=smoothstep(.55,1.,vL);
  vec3 stone=vec3(.86,.8,.7);
  vec3 front=stone*(Amb.rgb*1.7+vec3(.62,.6,.58));
  vec3 side=stone*(Amb.rgb*.75+SunC.rgb*.1*back);
  vec3 col=mix(front,side,smoothstep(0.,.08,vL));
  col*=mix(.82,1.,smoothstep(0.,26.,W.y-Misc2.z));
  O=vec4(mix(col,fogIt(col,W),.3)*Misc.y,a);
}`;

/* ── Built things: refinery, port, tanker, gantry ── */
const STAT_VS = VH + `in vec3 aP,aN;in vec4 aC;out vec3 W,vN;out vec4 vC;
void main(){W=aP;vN=aN;vC=aC;gl_Position=VP*vec4(aP,1.);}`;
const STAT_FS = FH + `in vec3 W,vN;in vec4 vC;${G_SKY}
void main(){
  vec3 N=normalize(vN),V=normalize(Cam.xyz-W);
  float NL=max(dot(N,Sun.xyz),0.);
  vec3 col=vC.rgb*(Amb.rgb*(.55+.45*N.y)+SunC.rgb*NL*.3);
  vec3 r=reflect(-V,N);
  float fr=.04+.5*pow(1.-max(dot(N,V),0.),4.);
  col+=skyCol(vec3(r.x,abs(r.y),r.z))*fr*(.22+SunC.a*.5);
  col+=SunC.rgb*pow(max(dot(r,Sun.xyz),0.),60.)*.05;
  col+=vC.rgb*vC.a*5.;
  O=vec4(fogIt(col,W)*Misc.y,1.);
}`;
/* Sign faces with baked lettering */
const SIGN_VS = VH + `in vec3 aP;in vec2 aT;out vec3 W;out vec2 vT;void main(){W=aP;vT=aT;gl_Position=VP*vec4(aP,1.);}`;
const SIGN_FS = FH + `in vec3 W;in vec2 vT;uniform sampler2D tS;${G_SKY}
void main(){vec3 c=texture(tS,vT).rgb;O=vec4(c*c*vec3(1.5)*Misc.y,1.);}`;
/* The road: a runway-straight strip with a sheen toward the low sun */
const ROAD_VS = VH + `in vec2 aQ;out vec3 W;void main(){W=vec3(aQ.x,6.05,aQ.y);gl_Position=VP*vec4(W,1.);}`;
const ROAD_FS = FH + `in vec3 W;uniform sampler3D tN;${G_SKY}
void main(){
  vec3 V=normalize(W-Cam.xyz);float z=W.z-(${ROAD_Z}.);
  float px=fwidth(W.x)+fwidth(W.z);
  float aaz=max(fwidth(z),.02);
  vec2 d=texture(tN,vec3(W.xz*.11,.4)).rg;
  vec3 col=vec3(.045,.042,.046)*(.8+d.r*.5);
  float wheel=exp(-pow((abs(z)-5.)/1.4,2.))*.35;col*=1.-wheel*.5;
  float dash=smoothstep(.45,.5,abs(fract(W.x/18.)-.5));
  float centre=(1.-smoothstep(.16,.16+aaz,abs(z)))*mix(1.,.5,clamp(px/5.,0.,1.));
  float lane=(1.-smoothstep(.1,.1+aaz,abs(abs(z)-5.2)))*(1.-dash);
  float edge=1.-smoothstep(.12,.12+aaz,abs(abs(z)-10.4));
  vec3 paint=vec3(.75,.7,.58);
  vec3 lit=Amb.rgb*.85+SunC.rgb*Sun.y*.32;
  col*=lit;
  col=mix(col,paint*lit,clamp(centre+lane*.8+edge*.6,0.,1.));
  vec3 n=normalize(vec3((d.r-.5)*.05,1.,(d.g-.5)*.05));
  vec3 r=reflect(V,n);
  float fr=.03+.97*pow(1.-max(-V.y,0.),5.);
  col=mix(col,skyCol(vec3(r.x,abs(r.y),r.z)),fr*.3);
  col+=SunC.rgb*pow(max(dot(r,Sun.xyz),0.),30.)*.1;
  float e=1.-smoothstep(10.6,11.5,abs(z));
  if(e<.02)discard;
  O=vec4(fogIt(col,W)*Misc.y,1.);
}`;

/* ── Fruit bunch, macro: ripe fruit with black tips ── */
const FRUIT_VS = VH + `in vec3 aP,aN;in vec4 iA,iB;uniform vec4 uBunch;out vec3 W,vN,vL;out float vR,vRip;
void main(){
  vec3 ax=iB.xyz,up=abs(ax.y)<.9?vec3(0.,1.,0.):vec3(1.,0.,0.),s=normalize(cross(up,ax)),t=cross(ax,s);
  vec3 lp=vec3(aP.x*iA.w,aP.y*iA.w,aP.z*iA.w*1.34);
  vec3 q=s*lp.x+t*lp.y+ax*lp.z;
  W=uBunch.xyz+(iA.xyz+q)*uBunch.w;
  vN=s*aN.x+t*aN.y+ax*aN.z;vL=aP;vR=length(iA.xyz);vRip=iB.w;
  gl_Position=VP*vec4(W,1.);
}`;
const FRUIT_FS = FH + `in vec3 W,vN,vL;in float vR,vRip;${G_SKY}
void main(){
  vec3 N=normalize(vN),V=normalize(Cam.xyz-W);
  float t=vL.z*.5+.5;                                   // 0 buried base, 1 exposed tip
  vec3 base=mix(vec3(.9,.34,.03),vec3(.78,.12,.02),vRip);
  vec3 tipc=mix(vec3(.3,.06,.03),vec3(.035,.012,.015),vRip);
  vec3 alb=mix(vec3(.95,.55,.08),base,smoothstep(.04,.42,t));
  alb=mix(alb,tipc,smoothstep(.62,.95,t));
  float ao=mix(.2,1.,smoothstep(.08,.6,t));
  float NL=dot(N,Sun.xyz);
  vec3 Hh=normalize(V+Sun.xyz);
  vec3 col=alb*(Amb.rgb*(.75+.25*N.y)*.8+SunC.rgb*max(NL*.8+.2,0.)*.075)*ao;
  col+=alb*SunC.rgb*pow(max(-dot(V,Sun.xyz),0.),1.5)*pow(1.-max(dot(N,V),0.),2.)*.05*ao;      // light through ripe skin at the rim
  col+=SunC.rgb*pow(max(dot(N,Hh),0.),90.)*.03*ao;
  col+=skyCol(reflect(-V,N))*pow(1.-max(dot(N,V),0.),4.)*.14*ao;
  O=vec4(fogIt(col,W)*Misc.y,1.);
}`;

/* ── The drop: fuel in glass. One opaque pass; the fill is solved along the refracted ray, so the surface reads in depth. ── */
const DROP_VS = VH + `in vec3 aP,aN;uniform vec4 uDrop;out vec3 W,vN;void main(){W=uDrop.xyz+aP*uDrop.w;vN=aN;gl_Position=VP*vec4(W,1.);}`;
const DROP_FS = FH + `in vec3 W,vN;uniform float uLvl,uRL;uniform vec4 uDrop;${G_SKY}
void main(){
  vec3 N=normalize(vN),I=normalize(W-Cam.xyz);
  float fr=.03+.97*pow(1.-max(dot(-I,N),0.),4.);
  vec3 refl=skyCol(reflect(I,N));
  vec3 r=refract(I,N,1./1.34);if(dot(r,r)<.01)r=I;
  vec3 glass=skyCol(vec3(r.x,abs(r.y),r.z))*vec3(.17,.155,.145)+vec3(.008,.007,.007);
  vec3 gold=vec3(0.);float g=0.;
  vec3 hi=vec3(1.14,.36,.028),lo=vec3(.5,.095,.004);
  if(W.y<uLvl){
    g=1.;float k=clamp((uLvl-W.y)/(uDrop.w*.9),0.,1.);
    gold=mix(hi,lo,k)*(1.+.45*pow(max(dot(r,Sun.xyz),0.),3.));
  }else if(I.y<-.001){
    float t=(uLvl-W.y)/I.y;vec3 q=W+I*t;
    if(length(q.xz-uDrop.xz)<uRL){g=1.;gold=vec3(1.25,.48,.05);}
  }
  float lip=1.-smoothstep(0.,uDrop.w*.022,abs(W.y-uLvl));gold+=vec3(.7,.3,.04)*lip*g;
  vec3 inside=mix(glass,gold,g);
  vec3 col=mix(inside,refl,fr);
  col+=SunC.rgb*pow(max(dot(reflect(I,N),Sun.xyz),0.),200.)*.6;
  col+=SunC.rgb*pow(1.-max(dot(-I,N),0.),6.)*.018;
  O=vec4(fogIt(col,W)*Misc.y,1.);
}`;

/* ── Small lights (additive) ── */
const SPR_VS = VH + `in vec4 aA;in vec4 aB;uniform float uPx;out vec3 vC;out float vK;
void main(){
  vec3 p=aA.xyz;
  if(aB.w!=0.)p.x=-520.+mod(p.x+aB.w*Cam.w+1e5,3100.);
  vec4 c=VP*vec4(p,1.);gl_Position=c;
  gl_PointSize=clamp(aA.w*uPx/max(c.w,.5),1.5,56.);vC=aB.rgb;
  vec3 v=p-Cam.xyz;vK=exp(-length(v)*Hor.a*.7);
}`;
const SPR_FS = FH + `in vec3 vC;in float vK;
void main(){vec2 d=gl_PointCoord-.5;float a=max(1.-length(d)*2.,0.);a=a*a*a;O=vec4(vC*a*vK*Misc.y,1.);}`;
/* Tall camera-facing strips: the flare's fire and the pillar of light over the plant */
const BILL_VS = VH + `uniform vec4 uPos;uniform vec2 uSz;out vec2 vQ;
void main(){
  vec2 q=vec2(float(gl_VertexID&1)*2.-1.,float((gl_VertexID>>1)&1));vQ=q;
  vec3 to=Cam.xyz-uPos.xyz;vec3 r=normalize(vec3(to.z,0.,-to.x));
  vec3 w=uPos.xyz+r*q.x*uSz.x+vec3(0.,q.y*uSz.y,0.);
  gl_Position=VP*vec4(w,1.);
}`;
const BILL_FS = FH + `in vec2 vQ;uniform vec3 uCol;uniform float uMode;
void main(){
  float a;
  if(uMode<.5){a=pow(max(1.-abs(vQ.x),0.),2.6)*pow(1.-vQ.y,1.6)*smoothstep(0.,.04,vQ.y);}
  else{float d=length(vec2(vQ.x,vQ.y*2.-1.));float n=sin(vQ.y*16.-Cam.w*14.)*.08+sin(vQ.x*9.+Cam.w*11.)*.06;a=pow(max(1.-d+n,0.),2.4);}
  O=vec4(uCol*a*Misc.y,1.);
}`;
const RAIN_VS = VH + `in vec4 aR;in float aEnd;out float vA;
void main(){
  float s=.75+aR.w*.5;
  vec3 b=vec3(aR.x,aR.y-Cam.w*(.9+.5*aR.w),aR.z+Cam.w*.08);
  vec3 q=fract(b-Cam.xyz/70.)*70.-35.;
  vec3 p=Cam.xyz+q-vec3(.25,-1.,0.)*aEnd*1.5*s;
  vA=(1.-aEnd*.6)*SunC.w*(.25+.75*smoothstep(35.,8.,length(q)));
  gl_Position=VP*vec4(p,1.);
}`;
const RAIN_FS = FH + `in float vA;void main(){O=vec4(vec3(.52,.6,.66)*vA*.13*Misc.y,1.);}`;
const BOLT_VS = VH + `in vec3 aP;void main(){gl_Position=VP*vec4(aP,1.);}`;
const BOLT_FS = FH + `uniform float uA;void main(){O=vec4(vec3(6.,7.,9.)*uA*Misc.y,1.);}`;

/* ── Post ── */
const BRIGHT_FS = `#version 300 es
precision highp float;in vec2 P;out vec4 O;uniform sampler2D tS;uniform vec2 uK;uniform float uDec;
void main(){vec2 u=(P*.5+.5)*uK;vec3 c=texture(tS,u).rgb/uDec;float l=max(c.r,max(c.g,c.b));O=vec4(min(c*smoothstep(1.3,3.2,l),vec3(9.)),1.);}`;
const BLUR_FS = `#version 300 es
precision highp float;in vec2 P;out vec4 O;uniform sampler2D tS;uniform vec2 uD;
void main(){vec2 u=P*.5+.5;vec3 c=texture(tS,u).rgb*.2941;c+=(texture(tS,u+uD*1.3333).rgb+texture(tS,u-uD*1.3333).rgb)*.3529;O=vec4(c,1.);}`;
const RAYS_FS = `#version 300 es
precision highp float;in vec2 P;out vec4 O;uniform sampler2D tS;uniform vec2 uK,uSun;uniform float uDec;uniform int uN;
float ign(vec2 p){return fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))));}
void main(){
  vec2 u=P*.5+.5,dl=(uSun-u)/float(uN)*.92,q=u+dl*ign(gl_FragCoord.xy);
  float w=1.;vec3 s=vec3(0.);
  for(int i=0;i<uN;i++){vec3 c=texture(tS,q*uK).rgb/uDec;float l=max(c.r,max(c.g,c.b));s+=min(c*smoothstep(1.5,4.,l),vec3(5.))*w;w*=.94;q+=dl;}
  O=vec4(s/float(uN),1.);
}`;
const FINAL_FS = `#version 300 es
precision highp float;in vec2 P;out vec4 O;
uniform sampler2D tS,tD,tB1,tB2,tR;
uniform vec2 uK,uSun,uFoE;uniform vec4 uP;uniform vec4 uQ;uniform vec3 uSunC;uniform int uTaps;
// uP: aperture, focus, near, far | uQ: motion blur, rays, flare, exposure
float lin(float d){float n=uP.z,f=uP.w;return 2.*n*f/(f+n-(2.*d-1.)*(f-n));}
float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
vec3 aces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
uniform float uDec,uTime,uAsp;
void main(){
  vec2 u=P*.5+.5,uvs=u*uK;vec3 c;
  float z0=uP.x>0.?lin(texture(tD,uvs).r):0.;
  if(uP.x>0.){
    float coc0=min(abs(z0-uP.y)/max(z0,.01)*uP.x,.03);
    vec3 s=texture(tS,uvs).rgb;float wt=1.;
    float rn=hash(gl_FragCoord.xy)*6.283;
    for(int i=1;i<uTaps;i++){
      float fi=float(i),r=sqrt(fi/float(uTaps))*.03,a=fi*2.39996+rn;
      vec2 o=vec2(cos(a)/uAsp,sin(a))*r;vec2 q=(u+o)*uK;
      float z=lin(texture(tD,q).r);float coc=min(abs(z-uP.y)/max(z,.01)*uP.x,.03);
      float w=(z<z0-.02)?smoothstep(r*.6,r*1.2,coc+.002):smoothstep(r*.6,r*1.2,coc0+.002);
      s+=texture(tS,q).rgb*w;wt+=w;
    }
    c=s/wt;
  }else if(uQ.x>.0006){
    vec2 d=(u-uFoE);float rn=hash(gl_FragCoord.xy);vec3 s=vec3(0.);
    float len=uQ.x*smoothstep(.02,.5,length(d*vec2(uAsp,1.)));
    for(int i=0;i<uTaps;i++){s+=texture(tS,(u-d*len*(float(i)+rn)/float(uTaps))*uK).rgb;}
    c=s/float(uTaps);
  }else c=texture(tS,uvs).rgb;
  c/=uDec;
  c+=texture(tB1,u).rgb*.07+texture(tB2,u).rgb*.11;
  if(uQ.y>.001)c+=texture(tR,u).rgb*uQ.y;
  if(uQ.z>.001){
    vec2 d=(u-uSun)*vec2(uAsp,1.);float l=length(d),a=atan(d.y,d.x);
    float rays=pow(abs(cos(a*3.+.5)),48.)+.7*pow(abs(cos(a*5.-.9)),80.);
    c+=uSunC*uQ.z*(rays*exp(-l*5.5)*.018+exp(-l*l*90.)*.012+exp(-abs(d.y)*110.)*exp(-abs(d.x)*3.)*.004);
  }
  c*=uQ.w;
  c=aces(c);
  float lum=dot(c,vec3(.299,.587,.114));
  c=mix(vec3(lum),c,1.12);                                // a little less saturated, like a graded film frame
  c=c*.965+vec3(.016,.021,.03);                          // lifted, slightly cool blacks
  c=pow(c,vec3(1./2.2));
  c=mix(c,c*c*(3.-2.*c),.32);
  vec2 v=u-.5;c*=1.-dot(v,v)*.5;
  float g=hash(gl_FragCoord.xy+fract(uTime)*91.7)-.5;c+=g*.028;   // film grain, and it hides banding in the sky
  O=vec4(c,1.);
}`;

/* ── Camera path. Two keys per chapter: nearly still while the words are on screen, then it pushes through to the next. ── */
const HERO = { x: 0, z: ZL - 96 };  // the palm the macro lands on (x set after the word is measured)
let BUNCH = [0, 0, 0], KEYS = [];
function buildKeys(xD, yD) {
  HERO.x = xD + 12;
  const hy = hgt(HERO.x, HERO.z), palmS = 15;
  BUNCH = [HERO.x + .3, hy + palmS * .475, HERO.z + 1.55];
  const B = BUNCH;
  KEYS = [
    { g: 0.00, p: [0, 1540, 2700], l: [80, 1480, 0], fov: 50 },
    { g: 0.20, p: [0, 1500, 2520], l: [70, 1400, 0], fov: 50 },
    { g: 0.48, p: [0, 1120, 1600], l: [40, 500, -500], fov: 52 },
    { g: 0.72, p: [0, 360, 600], l: [0, 90, -700], fov: 54, fit: 1 },
    { g: 0.90, p: [0, 96, 40], l: [0, 42, -700], fov: 52, fit: 1 },
    { g: 1.00, p: [0, 40, -300], l: [0, 34, -700], fov: 50, fit: 1 },
    { g: 1.20, p: [0, 37, -372], l: [xD * .2, 33, -700], fov: 50, fit: 1 },
    { g: 1.50, p: [xD * .9, yD + 2, -560], l: [xD, yD, -700], fov: 52 },
    { g: 1.62, p: [xD, yD, -700], l: [xD + 1, yD - 3, -800], fov: 58 },
    { g: 1.78, p: [HERO.x - 5, hy + 16, HERO.z + 44], l: [B[0], B[1] + 1, B[2]], fov: 50 },
    { g: 1.92, p: [B[0] + 2.8, B[1] + .6, B[2] + 4.8], l: B, fov: 38, near: .25 },
    { g: 2.00, p: [B[0] + 1.75, B[1] + .28, B[2] + 2.9], l: B, fov: 34, near: .25, sx: -.32, sy: -.1 },
    { g: 2.22, p: [B[0] + 1.35, B[1] + .1, B[2] + 2.5], l: B, fov: 33, near: .25, sx: -.32, sy: -.1 },
    { g: 2.42, p: [HERO.x + 9, hy + 26, HERO.z + 12], l: [HERO.x - 20, hy + 26, HERO.z - 300], fov: 52 },
    { g: 2.72, p: [-40, 120, -1560], l: [-150, 50, -3000], fov: 52 },
    { g: 3.00, p: [-90, 52, -2600], l: [-150, 92, -3050], fov: 52 },
    { g: 3.22, p: [-98, 50, -2640], l: [-150, 92, -3050], fov: 52 },
    { g: 3.55, p: [-205, 190, -3020], l: [-330, 55, -3780], fov: 54 },
    { g: 3.82, p: [-640, 66, -3840], l: [-600, 20, -4400], fov: 52 },
    { g: 4.00, p: [-822, 13, -3995], l: [-585, 25, -4430], fov: 42, psx: .62 },
    { g: 4.22, p: [-808, 12.5, -4012], l: [-575, 25, -4430], fov: 42, psx: .62 },
    { g: 4.52, p: [-560, 52, -3930], l: [-40, 12, -3700], fov: 50 },
    { g: 4.78, p: [-260, 16, -3652], l: [420, 13, ROAD_Z], fov: 52 },
    { g: 5.00, p: [1066, 8.4, ROAD_Z + .6], l: [1120, 15.6, ROAD_Z], fov: 50 },
    { g: 5.20, p: [1078, 8.2, ROAD_Z + .4], l: [1120, 15.6, ROAD_Z], fov: 50 },
    { g: 5.34, p: [1116, 8.6, ROAD_Z], l: [1420, 10, ROAD_Z], fov: 56 },
    { g: 5.70, p: [2000, 11, ROAD_Z], l: [DROP[0], 28, ROAD_Z], fov: 46 },
    { g: 6.00, p: [2552, 13, ROAD_Z + 4], l: [DROP[0], 28, ROAD_Z], fov: 42, sx: -.38, sy: -.03 },
    { g: 6.30, p: [2566, 12.6, ROAD_Z + 4], l: [DROP[0], 28, ROAD_Z], fov: 42, sx: -.38, sy: -.03 },
  ];
}
function fitKeys(asp, fovY) {
  // On a tall phone the word needs more distance to fit across the screen.
  const need = (WORD_W * .56) / (Math.tan(fovY * Math.PI / 360) * asp);
  const k = Math.max(1, need / 400);
  for (const K of KEYS) {
    K._p = K.p; if (K.fit) { const d = vsub(K.p, K.l); K._p = vadd(K.l, [d[0] * k, d[1] * Math.min(k, 1.5), d[2] * k]); }
  }
}
function hermite(arr, g, field) {
  let i = 0; while (i < arr.length - 2 && g > arr[i + 1].g) i++;
  const a = arr[i], b = arr[i + 1], pa = arr[Math.max(0, i - 1)], pb = arr[Math.min(arr.length - 1, i + 2)];
  const dt = b.g - a.g, t = clamp((g - a.g) / dt), t2 = t * t, t3 = t2 * t;
  const out = [0, 0, 0], A = a[field], B = b[field], PA = pa[field], PB = pb[field];
  const dA = Math.max(a.g - pa.g, 1e-4), dB = Math.max(pb.g - b.g, 1e-4);
  for (let k = 0; k < 3; k++) {
    // Finite differences weighted by the uneven key spacing keep the speed continuous through every key.
    const m0 = i === 0 ? (B[k] - A[k]) : ((B[k] - A[k]) / dt * dA + (A[k] - PA[k]) / dA * dt) / (dA + dt) * dt;
    const m1 = i >= arr.length - 2 ? (B[k] - A[k]) : ((PB[k] - B[k]) / dB * dt + (B[k] - A[k]) / dt * dB) / (dt + dB) * dt;
    out[k] = (2 * t3 - 3 * t2 + 1) * A[k] + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * B[k] + (t3 - t2) * m1;
  }
  return out;
}
function keyParam(g, name, def) {
  let i = 0; while (i < KEYS.length - 2 && g > KEYS[i + 1].g) i++;
  const a = KEYS[i], b = KEYS[i + 1], t = ss(a.g, b.g, g);
  return mix(a[name] ?? def, b[name] ?? def, t);
}

/* ── Light, weather and grade through the day ── */
const n3 = v => vnorm(v);
const DAY = [
  { g: 0.0, sun: n3([.03, .06, -1]), c: [14, 8.6, 4.6], z: [.1, .19, .36], h: [.98, .66, .38], f: [.86, .6, .4], fd: .00012, a: [.44, .38, .36], cov: .6, cb: 560, ct: 1200, cd: 4.2, lit: [1.6, 1.24, .9], sh: [.2, .22, .3], ex: 1, ls: 0, rain: 0, rays: .3, fl: 1 },
  { g: .7, sun: n3([.05, .065, -1]), c: [14, 8.6, 4.6], z: [.11, .2, .37], h: [1, .68, .4], f: [.74, .58, .4], fd: .00016, a: [.46, .4, .38], cov: .5, cb: 560, ct: 1200, cd: 4.2, lit: [1.6, 1.24, .9], sh: [.2, .22, .3], ex: 1, ls: 0, rain: 0, rays: .3, fl: 1 },
  { g: 1.0, sun: n3([.04, .1, -1]), c: [10, 6, 3], z: [.1, .2, .4], h: [.94, .54, .27], f: [.86, .54, .32], fd: .00024, a: [.5, .43, .4], cov: .32, cb: 900, ct: 1500, cd: 3, lit: [1.42, 1.04, .76], sh: [.74, .6, .5], ex: 1, ls: 1, rain: 0, rays: .34, fl: .7 },
  { g: 1.6, sun: n3([.16, .14, -1]), c: [15, 10, 5.8], z: [.11, .23, .44], h: [.92, .72, .5], f: [.8, .68, .52], fd: .00024, a: [.52, .47, .45], cov: .28, cb: 1000, ct: 1600, cd: 3, lit: [1.4, 1.1, .84], sh: [.72, .62, .54], ex: 1, ls: .9, rain: 0, rays: .4, fl: .8 },
  { g: 2.0, sun: n3([.5, .34, -.8]), c: [14, 11, 7.4], z: [.09, .24, .52], h: [.66, .64, .54], f: [.54, .58, .55], fd: .00018, a: [.62, .63, .64], cov: .32, cb: 1100, ct: 1700, cd: 3, lit: [1.25, 1.15, 1], sh: [.34, .36, .42], ex: 1, ls: 0, rain: 0, rays: 0, fl: 0 },
  { g: 2.55, sun: n3([.3, .28, -.9]), c: [8, 6.6, 4.8], z: [.07, .15, .3], h: [.42, .44, .42], f: [.36, .4, .4], fd: .00028, a: [.48, .51, .54], cov: .58, cb: 700, ct: 1500, cd: 3.4, lit: [.72, .72, .72], sh: [.17, .19, .22], ex: 1, ls: 0, rain: 0, rays: 0, fl: 0 },
  { g: 3.0, sun: n3([-.1, .32, -.9]), c: [.9, 1, 1.15], z: [.03, .045, .058], h: [.13, .17, .19], f: [.11, .145, .16], fd: .00065, a: [.27, .33, .38], cov: .63, cb: 300, ct: 1100, cd: 5, lit: [.34, .4, .45], sh: [.018, .025, .034], ex: 1.25, ls: 0, rain: 1, rays: 0, fl: 0 },
  { g: 3.3, sun: n3([-.1, .32, -.9]), c: [.9, 1, 1.15], z: [.03, .045, .058], h: [.13, .17, .19], f: [.11, .145, .16], fd: .00065, a: [.27, .33, .38], cov: .63, cb: 300, ct: 1100, cd: 5, lit: [.34, .4, .45], sh: [.018, .025, .034], ex: 1.25, ls: 0, rain: 1, rays: 0, fl: 0 },
  { g: 3.7, sun: n3([.2, .07, -1]), c: [11, 6, 3], z: [.08, .13, .26], h: [.8, .46, .27], f: [.66, .42, .29], fd: .00024, a: [.36, .31, .35], cov: .5, cb: 1100, ct: 1800, cd: 3, lit: [1.1, .68, .48], sh: [.16, .15, .22], ex: 1.02, ls: 0, rain: 0, rays: .25, fl: .5 },
  { g: 4.0, sun: n3([.17, .045, -1]), c: [16, 8.4, 3.8], z: [.1, .15, .3], h: [1, .55, .27], f: [.86, .5, .29], fd: .00014, a: [.36, .3, .33], cov: .24, cb: 1200, ct: 1900, cd: 3, lit: [1.35, .78, .48], sh: [.74, .48, .36], ex: 1, ls: 0, rain: 0, rays: .45, fl: 1 },
  { g: 4.5, sun: n3([.72, .045, -.7]), c: [16, 8.4, 3.8], z: [.1, .15, .3], h: [1, .56, .28], f: [.86, .52, .3], fd: .00016, a: [.36, .3, .33], cov: .22, cb: 1200, ct: 1900, cd: 3, lit: [1.35, .78, .48], sh: [.74, .48, .36], ex: 1, ls: 0, rain: 0, rays: .35, fl: 1 },
  { g: 5.0, sun: n3([1, .055, .012]), c: [16, 9.2, 4.4], z: [.12, .19, .36], h: [1, .64, .32], f: [.9, .6, .34], fd: .00028, a: [.42, .35, .34], cov: .2, cb: 1200, ct: 1900, cd: 3, lit: [1.35, .86, .56], sh: [.76, .54, .4], ex: 1, ls: 0, rain: 0, rays: .22, fl: .35 },
  { g: 6.0, sun: n3([1, .04, .0]), c: [16, 8, 3.4], z: [.08, .13, .29], h: [1, .56, .26], f: [.88, .52, .28], fd: .00032, a: [.34, .28, .3], cov: .2, cb: 1200, ct: 1900, cd: 3, lit: [1.3, .72, .46], sh: [.7, .44, .32], ex: 1, ls: 0, rain: 0, rays: .55, fl: 1 },
];
function dayAt(g) {
  let i = 0; while (i < DAY.length - 2 && g > DAY[i + 1].g) i++;
  const a = DAY[i], b = DAY[i + 1], t = ss(a.g, b.g, g), o = {};
  for (const k in a) { if (k === 'g') continue; const va = a[k], vb = b[k]; o[k] = Array.isArray(va) ? [mix(va[0], vb[0], t), mix(va[1], vb[1], t), mix(va[2], vb[2], t)] : mix(va, vb, t); }
  o.sun = vnorm(o.sun);
  return o;
}

/* ── Quality. Phones start low and earn detail; nothing here ever reallocates a buffer mid-flight. ── */
const TIERS = [
  { name: 'phone', msaa: 0, cloudDiv: 5, cloudSteps: 13, near: 46, nearCap: 70, mid: 420, midCap: 2600, taps: 7, mblur: 4, rays: 9, fruit: 320, nearGeo: [18, 4], terr: [72, 56], dprMax: 1.5, maxW: 1500 },
  { name: 'laptop', msaa: 2, cloudDiv: 4, cloudSteps: 18, near: 70, nearCap: 150, mid: 620, midCap: 4800, taps: 11, mblur: 6, rays: 13, fruit: 620, nearGeo: [24, 6], terr: [96, 72], dprMax: 1.25, maxW: 1920 },
  { name: 'desktop', msaa: 4, cloudDiv: 3, cloudSteps: 26, near: 110, nearCap: 320, mid: 980, midCap: 11000, taps: 17, mblur: 8, rays: 18, fruit: 1000, nearGeo: [30, 8], terr: [128, 96], dprMax: 1.6, maxW: 2560 },
];
let T, gl, dynScale = 1, needDraw = true;

function pickTier(g) {
  if (FORCE_TIER != null) return FORCE_TIER;
  const mem = navigator.deviceMemory || 8, dbg = g.getExtension('WEBGL_debug_renderer_info');
  const r = dbg ? String(g.getParameter(dbg.UNMASKED_RENDERER_WEBGL)) : '';
  if (coarse || mem <= 3 || /mali-[gt][0-9]{1,2}\b|adreno.{0,3}[1-5][0-9]{2}\b|powervr|swiftshader|llvmpipe|intel.*\b(hd|uhd) graphics/i.test(r)) return 0;
  if (/rtx|gtx (10|16)|radeon rx|apple m[1-9]|arc a/i.test(r)) return 2;
  return 1;
}

/* ── GL helpers ── */
const programs = {};
function sh(type, src) { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; }
function prog(name, vs, fs) {
  const p = gl.createProgram(), v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
  gl.attachShader(p, v); gl.attachShader(p, f); gl.linkProgram(p);
  programs[name] = { p, name, v, f, u: {}, a: {}, ready: false };
}
function finishProg(P) {
  const { p } = P;
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
    const log = gl.getProgramInfoLog(p) + '\nVS ' + gl.getShaderInfoLog(P.v) + '\nFS ' + gl.getShaderInfoLog(P.f);
    throw new Error('shader ' + P.name + ': ' + log);
  }
  const idx = gl.getUniformBlockIndex(p, 'F'); if (idx !== gl.INVALID_INDEX) gl.uniformBlockBinding(p, idx, 0);
  const nu = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < nu; i++) { const inf = gl.getActiveUniform(p, i); const l = gl.getUniformLocation(p, inf.name); if (l) P.u[inf.name] = l; }
  const na = gl.getProgramParameter(p, gl.ACTIVE_ATTRIBUTES);
  for (let i = 0; i < na; i++) { const inf = gl.getActiveAttrib(p, i); P.a[inf.name] = gl.getAttribLocation(p, inf.name); }
  P.ready = true;
}
function use(name) { const P = programs[name]; gl.useProgram(P.p); return P; }
function buf(data, target = gl.ARRAY_BUFFER, usage = gl.STATIC_DRAW) { const b = gl.createBuffer(); gl.bindBuffer(target, b); gl.bufferData(target, data, usage); return b; }
function tex(unit, t, target = gl.TEXTURE_2D) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(target, t); }
function target(w, h, ifmt, fmt, type, filter = gl.LINEAR) {
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.texImage2D(gl.TEXTURE_2D, 0, ifmt, w, h, 0, fmt, type, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
  return { t, f, w, h };
}
const nextFrame = () => new Promise(r => requestAnimationFrame(r));
let sliceStart = 0;
async function breathe(budget = 6) { if (performance.now() - sliceStart > budget) { await nextFrame(); sliceStart = performance.now(); } }

/* ── Noise: tiling 3D texture for clouds, sea and ground, built in small slices so the opening never stalls ── */
async function buildNoise(size) {
  const data = new Uint8Array(size * size * size * 2);
  const hash = (x, y, z, p) => { x = ((x % p) + p) % p; y = ((y % p) + p) % p; z = ((z % p) + p) % p; let h = x * 374761393 + y * 668265263 + z * 2147483647 % 1000003; h = (h ^ (h >>> 13)) * 1274126177; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
  const value = (x, y, z, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), fx = x - xi, fy = y - yi, fz = z - zi;
    const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy), w = fz * fz * (3 - 2 * fz);
    const l = (a, b, t) => a + (b - a) * t;
    return l(l(l(hash(xi, yi, zi, p), hash(xi + 1, yi, zi, p), u), l(hash(xi, yi + 1, zi, p), hash(xi + 1, yi + 1, zi, p), u), v),
      l(l(hash(xi, yi, zi + 1, p), hash(xi + 1, yi, zi + 1, p), u), l(hash(xi, yi + 1, zi + 1, p), hash(xi + 1, yi + 1, zi + 1, p), u), v), w);
  };
  const worley = (x, y, z, p) => {
    const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z); let best = 9;
    for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) for (let c = -1; c <= 1; c++) {
      const cx = xi + a, cy = yi + b, cz = zi + c;
      const dx = cx + hash(cx, cy, cz, p) - x, dy = cy + hash(cx + 7, cy, cz, p) - y, dz = cz + hash(cx, cy + 5, cz, p) - z;
      const d = dx * dx + dy * dy + dz * dz; if (d < best) best = d;
    }
    return Math.sqrt(best);
  };
  let k = 0;
  for (let z = 0; z < size; z++) {
    const zf = z / size;
    for (let y = 0; y < size; y++) {
      const yf = y / size;
      for (let x = 0; x < size; x++) {
        const xf = x / size;
        const v = value(xf * 4, yf * 4, zf * 4, 4) * .55 + value(xf * 8, yf * 8, zf * 8, 8) * .3 + value(xf * 16, yf * 16, zf * 16, 16) * .15;
        const w0 = 1 - worley(xf * 4, yf * 4, zf * 4, 4);
        const w1 = 1 - worley(xf * 8, yf * 8, zf * 8, 8);
        const body = clamp((v - .5) * 1.1 + .5) * .55 + clamp(w0 * 1.15 - .08) * .45;   // billows, not fog
        data[k++] = clamp(body * 1.12 - .03) * 255;
        data[k++] = clamp(w1 * .7 + v * .3) * 255;
      }
      await breathe();
    }
  }
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_3D, t);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG8, size, size, size, 0, gl.RG, gl.UNSIGNED_BYTE, data);
  gl.generateMipmap(gl.TEXTURE_3D);
  gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  for (const w of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, w, gl.REPEAT);
  return t;
}

/* ── The word: real type, measured, so the camera path goes through the actual hole in the D ── */
async function buildWord() {
  try { await Promise.race([document.fonts.load('800 200px Archivo'), new Promise(r => setTimeout(r, 900))]); } catch { /* falls back to the system face */ }
  const w = T.msaa ? 4096 : 2048, h = Math.round(w * .2);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d', { willReadFrequently: true });
  let size = h * .9;
  const setF = () => { x.font = `800 ${size}px Archivo, "Arial Black", Arial, sans-serif`; try { x.fontStretch = 'expanded'; } catch {} };
  setF(); size *= (w * .985) / x.measureText('MANDATE').width; setF();
  x.textBaseline = 'alphabetic'; x.textAlign = 'left'; x.fillStyle = '#fff';
  const m = x.measureText('MANDATE'), capH = m.actualBoundingBoxAscent, base = Math.round(h * .5 + capH * .5), left = (w - m.width) / 2;
  x.fillText('MANDATE', left, base);
  // Find the D's counter along the row through mid-height.
  const x0 = left + x.measureText('MAN').width, x1 = left + x.measureText('MAND').width, row = Math.round(base - capH * .5);
  const px = x.getImageData(0, row, w, 1).data;
  let bestS = 0, bestL = 0, s = -1;
  for (let i = Math.round(x0 + (x1 - x0) * .05); i < x1; i++) { const clear = px[i * 4 + 3] < 40; if (clear && s < 0) s = i; if (!clear && s >= 0) { if (i - s > bestL) { bestL = i - s; bestS = s; } s = -1; } }
  const cxD = bestS + bestL / 2;
  const unit = WORD_W / w, H_ = h * unit;
  const y0 = hgt(0, ZL) - (h - base) * unit - .6;      // baseline just under the ground
  const xD = (cxD - w / 2) * unit, yD = y0 + (h - row) * unit;
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return { t, xD, yD, y0, H: H_, hole: bestL * unit, capH: capH * unit };
}

/* ── Meshes ── */
function palmMesh(nF, segs) {
  const V = [], I = []; const R = (() => { let s = 91; return () => (s = s * 16807 % 2147483647) / 2147483647; })();
  const v = (p, n, u) => { V.push(p[0], p[1], p[2], n[0], n[1], n[2], u[0], u[1], u[2]); return V.length / 9 - 1; };
  // trunk
  const sides = nF > 12 ? 7 : 4, TOP = .5;
  for (let k = 0; k <= 5; k++) for (let i = 0; i <= sides; i++) {
    const a = i / sides * 6.283, t = k / 5, r = mix(.042, .033, t) * (1 + .1 * Math.sin(t * 40)), c = Math.cos(a), s = Math.sin(a);
    v([c * r, t * TOP, s * r], [c, 0, s], [t * TOP, a, 0]);
  }
  for (let k = 0; k < 5; k++) for (let i = 0; i < sides; i++) { const a = k * (sides + 1) + i, b = a + sides + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  // fronds, in spiral order from the upright centre to the drooping skirt
  for (let f = 0; f < nF; f++) {
    const q = (f + .5) / nF, az = f * 2.39996 + R() * .3, L = mix(.34, .52, Math.sqrt(q)) * (.92 + R() * .16);
    const rise = mix(.34, .06, q), droop = mix(.1, .52, q * q), dir = [Math.cos(az), 0, Math.sin(az)], side = [-dir[2], 0, dir[0]];
    const base = v([0, TOP - .01, 0], [0, 1, 0], [0, 0, 1]); // shared root
    let prev = null;
    for (let s = 1; s <= segs; s++) {
      const u = s / segs;
      const y = TOP + rise * Math.sin(u * 1.75) * L * 1.8 - droop * u * u * L * 1.9;
      const c = [dir[0] * u * L, y, dir[2] * u * L];
      const dy = (rise * Math.cos(u * 1.75) * 1.75 * L * 1.8 - 2 * droop * u * L * 1.9);
      const tan = vnorm([dir[0] * L, dy, dir[2] * L]);
      const up = vnorm(vcross(side, tan)), upf = up[1] < 0 ? vmul(up, -1) : up;
      const w = (.024 + .06 * Math.sin(Math.PI * Math.min(1, u * .98 + .02))) * L * 1.5 * (u > .93 ? (1 - u) / .07 * .6 + .4 : 1);
      const dih = .42;
      const l = v(vadd(c, vadd(vmul(side, -w), [0, -w * dih, 0])), vnorm(vadd(upf, vmul(side, -.34))), [u, -1, 1]);
      const m = v(c, upf, [u, 0, 1]);
      const r = v(vadd(c, vadd(vmul(side, w), [0, -w * dih, 0])), vnorm(vadd(upf, vmul(side, .34))), [u, 1, 1]);
      if (!prev) I.push(base, m, l, base, r, m);
      else I.push(prev[0], prev[1], m, prev[0], m, l, prev[1], prev[2], r, prev[1], r, m);
      prev = [l, m, r];
    }
  }
  return { vb: buf(new Float32Array(V)), ib: buf(new Uint16Array(I), gl.ELEMENT_ARRAY_BUFFER), n: I.length };
}
function fruitMesh(tier) {
  const seg = tier ? 9 : 6, ring = tier ? 6 : 4, V = [], I = [];
  for (let r = 0; r <= ring; r++) { const t = r / ring * Math.PI, st = Math.sin(t), ct = Math.cos(t);
    for (let s = 0; s <= seg; s++) { const a = s / seg * 6.283, c = Math.cos(a), n = Math.sin(a); V.push(c * st, n * st, ct, c * st, n * st, ct); } }
  for (let r = 0; r < ring; r++) for (let s = 0; s < seg; s++) { const a = r * (seg + 1) + s, b = a + seg + 1; I.push(a, b, a + 1, a + 1, b, b + 1); }
  return { vb: buf(new Float32Array(V)), ib: buf(new Uint16Array(I), gl.ELEMENT_ARRAY_BUFFER), n: I.length };
}
function fruitInstances(count) {
  // A ripe bunch: packed fruit on a spined ovoid, red-orange with dark tips.
  const d = new Float32Array(count * 8), g = Math.PI * (3 - Math.sqrt(5)); let s = 5; const R = () => (s = s * 16807 % 2147483647) / 2147483647;
  for (let i = 0; i < count; i++) {
    const y = 1 - 2 * (i + .5) / count, r = Math.sqrt(1 - y * y), a = i * g;
    const ly = y * 1.16, lump = 1 + .1 * Math.sin(a * 2.3 + y * 9) + .05 * (R() - .5);
    const x = Math.cos(a) * r * lump, z = Math.sin(a) * r * lump;
    const ax = vnorm([x + (R() - .5) * .34, y * 1.1 + (R() - .5) * .34 - .1, z + (R() - .5) * .34]);
    d.set([x * .78, ly * .78, z * .78, (.094 + R() * .03), ax[0], ax[1], ax[2], clamp(.45 + R() * .5 + (y > 0 ? .08 : -.1))], i * 8);
  }
  return buf(d);
}
function dropMesh(res) {
  // Surface of revolution with a true teardrop profile; the fill level is solved by volume, so B20 really is 20% of it.
  const prof = p => { const s = Math.sin(p), r = s * Math.pow(Math.sin(p / 2), 1.5) * 1.06, y = Math.cos(p) * DROP_H / DROP_R * .78; return [r, y]; };
  const V = [], I = [], rows = res, cols = res * 2;
  for (let i = 0; i <= rows; i++) {
    const p = i / rows * Math.PI * .999 + .001, [r, y] = prof(p), [r2, y2] = prof(p + .01), tr = r2 - r, ty = y2 - y, l = Math.hypot(tr, ty), nr = -ty / l, ny = tr / l;
    for (let j = 0; j <= cols; j++) { const a = j / cols * 6.283, c = Math.cos(a), s = Math.sin(a); V.push(c * r, y, s * r, c * nr * 1, ny, s * nr); }
  }
  for (let i = 0; i < rows; i++) for (let j = 0; j < cols; j++) { const a = i * (cols + 1) + j, b = a + cols + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
  // volume table, tip down to base
  const tab = []; let vol = 0; const steps = 400;
  for (let i = 0; i < steps; i++) { const p0 = Math.PI - i / steps * Math.PI, p1 = Math.PI - (i + 1) / steps * Math.PI, [r0, y0] = prof(p0), [r1, y1] = prof(p1); vol += Math.PI * ((r0 + r1) / 2) ** 2 * Math.abs(y1 - y0); tab.push({ y: y1, r: r1, v: vol }); }
  const levelFor = share => { const tgt = share * vol; for (const e of tab) if (e.v >= tgt) return e; return tab[tab.length - 1]; };
  return { vb: buf(new Float32Array(V)), ib: buf(new Uint16Array(I), gl.ELEMENT_ARRAY_BUFFER), n: I.length, levelFor };
}

/* Built world. Each piece is plain boxes and cylinders, merged into one buffer. */
function buildStatic() {
  const V = [];
  const quad = (a, b, c, d, n, col, em) => { for (const p of [a, b, c, a, c, d]) V.push(p[0], p[1], p[2], n[0], n[1], n[2], col[0], col[1], col[2], em); };
  const box = (x, y, z, sx, sy, sz, col, em = 0) => {
    const x0 = x - sx / 2, x1 = x + sx / 2, y0 = y, y1 = y + sy, z0 = z - sz / 2, z1 = z + sz / 2;
    quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0], [0, 1, 0], col, em);
    quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], [0, 0, 1], col, em);
    quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0], [0, 0, -1], col, em);
    quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [1, 0, 0], col, em);
    quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0], [-1, 0, 0], col, em);
  };
  const cyl = (x, y, z, r, h, col, n = 12, roof = 0, em = 0, r2 = r) => {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * 6.283, a1 = (i + 1) / n * 6.283, c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      quad([x + c0 * r, y, z + s0 * r], [x + c1 * r, y, z + s1 * r], [x + c1 * r2, y + h, z + s1 * r2], [x + c0 * r2, y + h, z + s0 * r2], [(c0 + c1) / 2, 0, (s0 + s1) / 2], col, em);
      if (roof > 0) { const t = [x, y + h + roof, z], nrm = vnorm([(c0 + c1) / 2 * roof, r2, (s0 + s1) / 2 * roof]); for (const p of [[x + c0 * r2, y + h, z + s0 * r2], [x + c1 * r2, y + h, z + s1 * r2], t]) V.push(p[0], p[1], p[2], nrm[0], nrm[1], nrm[2], col[0], col[1], col[2], em); }
    }
  };
  let s = 21; const R = () => (s = s * 16807 % 2147483647) / 2147483647;
  const steel = [.34, .36, .37], pale = [.62, .6, .55], dark = [.1, .1, .11], rust = [.35, .2, .12];
  /* Biodiesel plant, in the flat clearing by the coast */
  for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const x = -640 + i * 66, z = -2880 - j * 66; cyl(x, 6, z, 24, 20 + R() * 4, pale, 16, 3); }
  for (let i = 0; i < 6; i++) { const x = -250 + i * 34, z = -3010 + (i % 2) * 14, h = 48 + R() * 42, r = 4 + R() * 3; cyl(x, 6, z, r, h, steel, 12, 2);
    for (let k = 1; k <= 4; k++) { const y = 6 + h * k / 4.6; box(x, y, z, r * 3, .8, r * 3, dark); } cyl(x + r + 1, 6, z, .8, h * .9, dark, 6); }
  for (let i = 0; i < 9; i++) { const x = -240 + i * 44, z = -2925; box(x, 6, z, 2, 18, 2, dark); box(x, 6, z - 70, 2, 13, 2, dark); }
  box(-65, 24, -2925, 360, 2.4, 6, rust); box(-65, 19, -2995, 360, 2, 6, rust); box(-65, 14, -2960, 8, 2, 76, rust);
  for (let i = 0; i < 5; i++) box(-65, 26.4 + i * 1.5, -2925 + (i - 2) * 1.2, 360, .8, .8, steel);
  box(210, 6, -2940, 90, 26, 60, [.3, .3, .3]); box(150, 6, -3160, 110, 18, 50, [.42, .4, .36]);
  for (let i = 0; i < 3; i++) { cyl(120 + i * 44, 6, -3250, 12, 26, steel, 14, 2); }
  for (let i = 0; i < 3; i++) { cyl(-500 + i * 60, 6, -3200, 20, 16, pale, 16, 2); }
  cyl(-150, 6, -3060, 2.8, 104, dark, 8, 0, 0, 1.8);  // flare stack
  for (let k = 0; k < 4; k++) { box(-150, 30 + k * 22, -3060, 12 - k * 2, .7, 12 - k * 2, dark); }
  /* Port: jetty, loading arms, cranes, the tanker that takes the oil out */
  const jx = -430; box(jx, 0, -4060, 16, 5, 480, [.2, .2, .22]);
  for (let i = 0; i < 16; i++) box(jx, -6, -3830 - i * 30, 3, 6, 3, dark);
  box(jx, 5, -4265, 120, 4, 34, [.22, .22, .24]);
  for (let i = 0; i < 3; i++) { const x = jx - 40 + i * 40; box(x, 9, -4268, 3, 26, 3, [.5, .42, .28]); box(x, 34, -4276, 3, 2, 20, [.5, .42, .28]); }
  const cx = jx - 120, cz = -4345;  // tanker lying alongside, 270 m
  const hull = [.1, .08, .09], red = [.28, .07, .05];
  box(cx + 70, -4, cz, 270, 19, 46, hull); box(cx + 70, -4, cz, 271, 6, 47, red);
  for (let i = 0; i < 12; i++) { const xx = cx - 34 + i * 18; cyl(xx, 15, cz, 4.4, 2.6, [.32, .3, .28], 10, 0); }
  box(cx + 70, 15, cz, 220, 1.6, 3, [.3, .28, .26]);
  box(cx - 52, 15, cz, 24, 26, 36, [.68, .64, .58]); box(cx - 52, 41, cz, 12, 7, 30, [.6, .57, .52]); cyl(cx - 62, 15, cz, 3.4, 36, red, 10);
  for (const [xx, zz, em] of [[cx - 52, cz + 18.2, 1], [cx - 52, cz - 18.2, 1]]) box(xx, 34, zz, 20, 1.6, .3, [.9, .7, .35], .3 * em);
  // quay cranes on the shore side
  for (const [x0, k] of [[-1040, 1], [-1150, .86]]) { const z = -3880, h = 66 * k; box(x0 - 11, 2, z - 10, 2.6, h, 2.6, [.34, .28, .22]); box(x0 + 11, 2, z - 10, 2.6, h, 2.6, [.34, .28, .22]); box(x0 - 11, 2, z + 10, 2.6, h, 2.6, [.34, .28, .22]); box(x0 + 11, 2, z + 10, 2.6, h, 2.6, [.34, .28, .22]); box(x0, h + 2, z - 22, 7, 5, 110 * k, [.4, .32, .24]); box(x0, h + 7, z, 3, 26, 3, [.34, .28, .22]); }
  /* Road furniture */
  for (let x = -480; x < DROP[0] - 100; x += 90) for (const side of [-1, 1]) { box(x, 6, ROAD_Z + side * 13.6, .35, 10.5, .35, [.18, .18, .19]); box(x, 16.4, ROAD_Z + side * 12.2, .25, .25, 3, [.18, .18, .19]); }
  const gx = 1120; // overhead sign gantry
  for (const side of [-1, 1]) { box(gx, 6, ROAD_Z + side * 13, .9, 11.5, .9, [.2, .21, .22]); }
  box(gx, 17.2, ROAD_Z, .8, .8, 27, [.2, .21, .22]); box(gx, 15.4, ROAD_Z, .5, .5, 27, [.2, .21, .22]);
  cyl(DROP[0], 5.5, DROP[2], 30, .9, [.24, .22, .22], 28, 0);   // plinth below the drop
  return { vb: buf(new Float32Array(V)), n: V.length / 10 };
}
function buildSigns() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512; const x = c.getContext('2d');
  const board = (y, big, small, on) => {
    x.fillStyle = on ? '#12633f' : '#0e4a32'; x.fillRect(0, y, 1024, 256);
    x.strokeStyle = '#fff6e6'; x.lineWidth = 8; x.strokeRect(14, y + 14, 996, 228);
    x.fillStyle = '#fffaf0'; x.textBaseline = 'alphabetic'; x.textAlign = 'left';
    x.font = '800 138px Archivo, Arial, sans-serif'; x.fillText(big, 54, y + 142);
    x.font = '500 50px Archivo, Arial, sans-serif'; x.fillText(small, 58, y + 212);
  };
  board(0, 'B20', 'Stays, unless all three checks pass', false);
  board(256, 'B30', 'Cheaper + fund safe + approved', true);
  const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, c); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
  gl.generateMipmap(gl.TEXTURE_2D); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
  const gx = 1119.6, top = 22.6, h = 6.6;
  const d = [];
  // Facing the camera (camera looks toward +x), +z is on the driver's right, so the first board reads on the left.
  const q = (z0, z1, v0, v1) => { const a = [gx, top - h, z0], b = [gx, top - h, z1], c2 = [gx, top, z1], e = [gx, top, z0]; for (const [p, u, v] of [[a, 0, v0], [b, 1, v0], [c2, 1, v1], [a, 0, v0], [c2, 1, v1], [e, 0, v1]]) d.push(p[0], p[1], p[2], u, v); };
  q(ROAD_Z - 13, ROAD_Z - .5, .5, 1); q(ROAD_Z + .5, ROAD_Z + 13, 0, .5);
  return { t, vb: buf(new Float32Array(d)), n: 6 * 2 };
}
function buildSprites() {
  const d = []; let s = 77; const R = () => (s = s * 16807 % 2147483647) / 2147483647;
  const add = (x, y, z, size, r, g, b, sp = 0) => d.push(x, y, z, size, r, g, b, sp);
  for (let i = 0; i < 70; i++) add(-700 + R() * 1040, 12 + R() * 70, -3400 + R() * 690, 2.4 + R() * 1.8, 3.2, 1.9, .7);
  for (let x = -480; x < DROP[0] - 100; x += 90) for (const side of [-1, 1]) add(x, 16.2, ROAD_Z + side * 10.8, 2.2, 2.6, 1.6, .75);
  for (let i = 0; i < 44; i++) { const fwd = i % 2 === 0, lane = (i % 4 < 2 ? 2.6 : 7.8) * (fwd ? 1 : -1), sp = fwd ? (20 + R() * 8) : -(22 + R() * 8), x0 = R() * 3100, col = fwd ? [3.8, .35, .2] : [3.4, 2.7, 1.8]; for (const off of [-.7, .7]) add(x0, 6.8, ROAD_Z + lane + off, 1, col[0], col[1], col[2], sp); }
  for (let i = 0; i < 12; i++) add(-560 + i * 30, 44, -4345, 1.6, 2.6, 1.8, .8);
  return { vb: buf(new Float32Array(d)), n: d.length / 8 };
}

/* ── Frame state and targets ── */
let W = 0, H = 0, cssH = 0, FW = 0, FH_ = 0, hdr, rts = {}, enc = 1;
let M = {}, WORD, NOISE, palmNear, palmMid, FRUIT, FRUITI, DROPM, STATIC, SIGNS, SPRITES, RAIN, ROADV, TERR, BOLTV;
const UB = new Float32Array(16 + 4 * 12);
let ubo, emptyVAO, instBufs = [], instIdx = 0, instNear = new Float32Array(0), instMid = new Float32Array(0), nearCount = 0, midCount = 0, lastCull = [1e9, 0, 0, 0, 0];
let g = TEST_G ?? 0, gVel = 0, target_g = g, last = 0, ema = 16, lowFor = 0, highFor = 0, ready = false, firstFrame = true;
let lvlShare = .2, lvlVel = 0, lvlTarget = .2, boltAt = -10, nextBolt = 3, boltN = 0, parX = 0, parY = 0, parTX = 0, parTY = 0, pathNear = [];

function allocTargets() {
  const f = hdr, mk = (w, h) => target(Math.max(2, w | 0), Math.max(2, h | 0), f.i, f.f, f.t);
  for (const k in rts) { const r = rts[k]; if (r.t) gl.deleteTexture(r.t); if (r.f) gl.deleteFramebuffer(r.f); }
  rts = {};
  const res = target(FW, FH_, f.i, f.f, f.t);
  const depth = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, depth);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.DEPTH_COMPONENT24, FW, FH_, 0, gl.DEPTH_COMPONENT, gl.UNSIGNED_INT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.bindFramebuffer(gl.FRAMEBUFFER, res.f); gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.TEXTURE_2D, depth, 0);
  rts.scene = res; rts.depth = { t: depth };
  if (T.msaa) {
    const maxS = gl.getInternalformatParameter(gl.RENDERBUFFER, f.i, gl.SAMPLES); const samples = Math.min(T.msaa, maxS && maxS.length ? maxS[0] : 0);
    if (samples > 0) {
      const fb = gl.createFramebuffer(), c = gl.createRenderbuffer(), d = gl.createRenderbuffer();
      gl.bindRenderbuffer(gl.RENDERBUFFER, c); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, f.i, FW, FH_);
      gl.bindRenderbuffer(gl.RENDERBUFFER, d); gl.renderbufferStorageMultisample(gl.RENDERBUFFER, samples, gl.DEPTH_COMPONENT24, FW, FH_);
      gl.bindFramebuffer(gl.FRAMEBUFFER, fb); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.RENDERBUFFER, c); gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, d);
      rts.ms = { f: fb };
    }
  }
  rts.b1a = mk(W / 4, H / 4); rts.b1b = mk(W / 4, H / 4); rts.b2a = mk(W / 8, H / 8); rts.b2b = mk(W / 8, H / 8); rts.rays = mk(W / 4, H / 4); rts.raysB = mk(W / 4, H / 4);
  const cw = Math.max(96, W / T.cloudDiv | 0), ch = Math.max(64, H / T.cloudDiv | 0);
  rts.cloud = target(cw, ch, hdr.cloudI, hdr.cloudF, hdr.cloudT);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}
function resize(force) {
  const r = canvas.getBoundingClientRect();
  const w = r.width, h = r.height;
  // A phone's address bar only changes height: the canvas is sized to the largest height, so ignore it.
  if (!force && Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < (coarse ? 140 : 1)) return;
  lastW = w; lastH = h;
  const dpr = Math.min(devicePixelRatio || 1, T.dprMax);
  { const k = Math.min(dpr, T.maxW / Math.max(w, h * .6)); W = Math.round(w * k); H = Math.round(h * k); } cssH = h;
  canvas.width = W; canvas.height = H;
  FW = W; FH_ = H;
  allocTargets();
  fitKeys(W / H, 52);
  dynScale = Math.min(dynScale, 1);
  lastCull[0] = 1e9; needDraw = true;
}
let lastW = 0, lastH = 0;

function fillInstances(cam, fwd, cosLimit) {
  const a = 7.794, Rm = T.mid, Rn = T.near, Rm2 = Rm * Rm, Rn2 = Rn * Rn;
  let nc = 0, mc = 0; const cx = cam[0], cz = cam[2], y = cam[1];
  const altFade = ss(1500, 760, y);
  if (altFade <= 0) { nearCount = midCount = 0; return; }
  const j0 = Math.floor((cz - Rm) / a), j1 = Math.ceil((cz + Rm) / a);
  const fl = Math.hypot(fwd[0], fwd[2]) || 1, fx = fwd[0] / fl, fz = fwd[2] / fl;
  for (let j = j0; j <= j1; j++) {
    const z = j * a, dz = z - cz, ox = (j & 1) ? 4.5 : 0;
    const wx = Math.sqrt(Math.max(0, Rm2 - dz * dz));
    const i0 = Math.floor((cx - wx - ox) / 9), i1 = Math.ceil((cx + wx - ox) / 9);
    for (let i = i0; i <= i1; i++) {
      const x = i * 9 + ox, dx = x - cx, d2 = dx * dx + dz * dz;
      if (d2 > Rm2) continue;
      if (d2 > 3600) { const dl = Math.sqrt(d2); if ((dx * fx + dz * fz) / dl < cosLimit) continue; }
      if (!estate(x, z)) continue;
      if (d2 < 40000) { let hit = false; for (const q of pathNear) { const ex = q[0] - x, ez = q[1] - z; if (ex * ex + ez * ez < q[2]) { hit = true; break; } } if (hit) continue; }
      const h = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453, r = h - Math.floor(h);
      const s = (12.5 + r * 4.5) * (1 - ss(Rm * .86, Rm, Math.sqrt(d2)));
      const py = hgt(x, z) - .2, rot = r * 57.3, tint = (r * 7.1) % 1, ph = r * 41;
      if (d2 < Rn2 && nc < T.nearCap) { const o = nc++ * 8; instNear[o] = x; instNear[o + 1] = py; instNear[o + 2] = z; instNear[o + 3] = s; instNear[o + 4] = rot; instNear[o + 5] = tint; instNear[o + 6] = ph; instNear[o + 7] = 0; }
      else if (mc < T.midCap) { const o = mc++ * 8; instMid[o] = x; instMid[o + 1] = py; instMid[o + 2] = z; instMid[o + 3] = s; instMid[o + 4] = rot; instMid[o + 5] = tint; instMid[o + 6] = ph; instMid[o + 7] = 0; }
    }
  }
  // The hero palm the macro lands on, always in the near set.
  if (nc < T.nearCap && Math.hypot(HERO.x - cx, HERO.z - cz) < Math.max(Rn, 90)) { const o = nc++ * 8; instNear.set([HERO.x, hgt(HERO.x, HERO.z) - .2, HERO.z, 15, 1.1, .7, 3, 0], o); }
  nearCount = nc; midCount = mc;
}

/* ── One frame ── */
const perspective = (fovy, asp, n, f, sx, sy) => { const t = 1 / Math.tan(fovy * Math.PI / 360), m = new Float32Array(16); m[0] = t / asp; m[5] = t; m[8] = sx; m[9] = sy; m[10] = (f + n) / (n - f); m[11] = -1; m[14] = 2 * f * n / (n - f); return m; };
const mul4 = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
let time = 0, prevCam = null, mbSmooth = 0, foe = [.5, .5];
function draw(now, dt) {
  const gg = g;
  const pos = hermite(KEYS.map(K => ({ g: K.g, p: K._p })), gg, 'p');
  const look0 = hermite(KEYS, gg, 'l');
  const asp = W / H, wide = asp >= 1;
  const speed = Math.min(1, Math.abs(gVel) * 1.1);
  let fov = keyParam(gg, 'fov', 50) + (reduced ? 0 : speed * 5);
  if (!wide) fov = Math.min(74, fov * 1.2);
  const near = keyParam(gg, 'near', 1.2);
  // Lens shift keeps the subject clear of the words; on a tall screen it moves up instead of sideways.
  let sx = keyParam(gg, 'sx', 0), sy = keyParam(gg, 'sy', 0);
  if (!wide) { sy = -Math.abs(sx) * .95; sx = keyParam(gg, 'psx', 0); }
  const ptr = reduced ? 0 : 1;
  const look = [look0[0], look0[1], look0[2]];
  const f0 = vnorm(vsub(look, pos));
  const r0 = vnorm(vcross(f0, [0, 1, 0]));
  const dist = vlen(vsub(look, pos));
  const lookP = vadd(look, vadd(vmul(r0, parX * dist * .012 * ptr), [0, parY * dist * .008 * ptr, 0]));
  const F = vnorm(vsub(lookP, pos));
  // A slight bank through the turns: this is what makes it read as flight, not a slider.
  const ahead = hermite(KEYS, gg + .03, 'l'), yawRate = (F[0] * (ahead[2] - look[2]) - F[2] * (ahead[0] - look[0])) / Math.max(dist, 1);
  const bank = reduced ? 0 : clamp(yawRate * 1.2, -.14, .14) * ss(0, .2, speed);
  const R0 = vnorm(vcross(F, [0, 1, 0])), U0 = vcross(R0, F), cb = Math.cos(bank), sb = Math.sin(bank);
  const Rr = vadd(vmul(R0, cb), vmul(U0, sb)), Uu = vadd(vmul(U0, cb), vmul(R0, -sb));
  const far = 42000;
  const P = perspective(fov, asp, near, far, sx, sy);
  const Vw = new Float32Array([Rr[0], Uu[0], -F[0], 0, Rr[1], Uu[1], -F[1], 0, Rr[2], Uu[2], -F[2], 0, -vdot(Rr, pos), -vdot(Uu, pos), vdot(F, pos), 1]);
  const VP = mul4(P, Vw);
  const tf = 1 / Math.tan(fov * Math.PI / 360);
  const D = dayAt(gg);
  time = reduced ? 20 : now / 1000;
  // Lightning, only while the storm is overhead
  let flash = 0;
  if (D.rain > .6 && !reduced) {
    if (time > nextBolt) { boltAt = time; nextBolt = time + 2.4 + Math.random() * 4; makeBolt(); }
    const k = time - boltAt; flash = k < .36 ? Math.max(0, 1 - k * 3.2) * (.65 + .35 * Math.sin(k * 60)) : 0;
  }
  const rs = dynScale, VW = Math.max(2, Math.round(FW * rs)), VH_ = Math.max(2, Math.round(FH_ * rs));
  const u = UB; u.set(VP, 0);
  u.set([pos[0], pos[1], pos[2], time], 16);
  u.set([D.sun[0], D.sun[1], D.sun[2], D.ls], 20);
  u.set([D.c[0], D.c[1], D.c[2], D.rain], 24);
  u.set([D.z[0], D.z[1], D.z[2], flash], 28);
  u.set([D.h[0], D.h[1], D.h[2], D.fd], 32);
  u.set([D.f[0], D.f[1], D.f[2], T.mid], 36);
  u.set([D.a[0] * (1 + flash * .7), D.a[1] * (1 + flash * .7), D.a[2] * (1 + flash * .8), useMS && rts.ms ? .08 : .5], 40);
  u.set([F[0], F[1], F[2], near], 44);
  u.set([Rr[0] * asp / tf, Rr[1] * asp / tf, Rr[2] * asp / tf, far], 48);
  u.set([Uu[0] / tf, Uu[1] / tf, Uu[2] / tf, sx], 52);
  u.set([sy, enc, VH_, 0], 56);
  u.set([ZL, WORD_W, WORD.y0, WORD.H], 60);
  gl.bindBuffer(gl.UNIFORM_BUFFER, ubo); gl.bufferSubData(gl.UNIFORM_BUFFER, 0, UB);
  gl.bindBufferBase(gl.UNIFORM_BUFFER, 0, ubo);

  // Palms are static: rebuild the visible list only after the camera has really moved.
  const horiz = Math.atan(Math.tan(fov * Math.PI / 360) * asp) + .2 + Math.abs(sx) * .4;
  const moved = Math.hypot(pos[0] - lastCull[0], pos[2] - lastCull[2]) > 5 || Math.abs(pos[1] - lastCull[1]) > 12 || F[0] * lastCull[3] + F[2] * lastCull[4] < .9994 * Math.hypot(F[0], F[2]);
  if (moved) {
    fillInstances(pos, F, Math.cos(Math.min(horiz, 3.1)));
    lastCull = [pos[0], pos[1], pos[2], F[0] / (Math.hypot(F[0], F[2]) || 1), F[2] / (Math.hypot(F[0], F[2]) || 1)];
    // Three buffers in rotation, so the driver never has to wait for one still in flight.
    instIdx = (instIdx + 1) % 3;
    gl.bindBuffer(gl.ARRAY_BUFFER, instBufs[instIdx].near); gl.bufferSubData(gl.ARRAY_BUFFER, 0, instNear, 0, nearCount * 8);
    gl.bindBuffer(gl.ARRAY_BUFFER, instBufs[instIdx].mid); gl.bufferSubData(gl.ARRAY_BUFFER, 0, instMid, 0, midCount * 8);
  }

  gl.bindVertexArray(emptyVAO);
  /* Clouds, into their small buffer */
  const layerMode = pos[1] > D.cb;                       // above or inside the deck: clouds draw over the ground
  gl.disable(gl.DEPTH_TEST); gl.disable(gl.BLEND); gl.depthMask(false);
  gl.bindFramebuffer(gl.FRAMEBUFFER, rts.cloud.f); gl.viewport(0, 0, rts.cloud.w, rts.cloud.h);
  if (!OFF.has('clouds')) { const Pp = use('cloud'); tex(0, NOISE, gl.TEXTURE_3D); gl.uniform1i(Pp.u.tN, 0); gl.uniform4f(Pp.u.uLay, D.cb, D.ct, D.cov, D.cd); gl.uniform3fv(Pp.u.uLit, D.lit); gl.uniform3fv(Pp.u.uShade, D.sh); gl.uniform1i(Pp.u.uSteps, T.cloudSteps); gl.drawArrays(gl.TRIANGLES, 0, 3); }

  /* The world */
  const ms = useMS && rts.ms;
  gl.bindFramebuffer(gl.FRAMEBUFFER, ms ? rts.ms.f : rts.scene.f); gl.viewport(0, 0, VW, VH_);
  gl.depthMask(true); gl.clearDepth(1); gl.clear(gl.DEPTH_BUFFER_BIT);
  { const Pp = use('sky'); tex(0, rts.cloud.t); gl.uniform1i(Pp.u.tC, 0); gl.uniform1f(Pp.u.uClouds, layerMode ? 0 : 1); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL); gl.enable(gl.CULL_FACE); gl.cullFace(gl.BACK);

  // Ground: a fan of rings around the camera
  if (!OFF.has('terr')) { const Pp = use('terr'); gl.bindBuffer(gl.ARRAY_BUFFER, TERR.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, TERR.ib);
    gl.enableVertexAttribArray(Pp.a.aRT); gl.vertexAttribPointer(Pp.a.aRT, 2, gl.FLOAT, false, 0, 0);
    tex(0, NOISE, gl.TEXTURE_3D); gl.uniform1i(Pp.u.tN, 0); tex(1, WORD.t); gl.uniform1i(Pp.u.tL, 1);
    gl.uniform1f(Pp.u.uYaw, Math.atan2(F[2], F[0]));
    gl.drawElements(gl.TRIANGLES, TERR.n, TERR.it, 0); gl.disableVertexAttribArray(Pp.a.aRT); }

  // Road and plaza strip
  if (pos[2] < -2000) { gl.disable(gl.CULL_FACE); gl.depthFunc(gl.ALWAYS); const Pp = use('road'); gl.bindBuffer(gl.ARRAY_BUFFER, ROADV); gl.enableVertexAttribArray(Pp.a.aQ); gl.vertexAttribPointer(Pp.a.aQ, 2, gl.FLOAT, false, 0, 0); tex(0, NOISE, gl.TEXTURE_3D); gl.uniform1i(Pp.u.tN, 0); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); gl.disableVertexAttribArray(Pp.a.aQ); gl.depthFunc(gl.LEQUAL); }

  // Built things
  { const Pp = use('stat'); gl.bindBuffer(gl.ARRAY_BUFFER, STATIC.vb); const st = 40;
    for (const [k, n, o] of [['aP', 3, 0], ['aN', 3, 12], ['aC', 4, 24]]) { gl.enableVertexAttribArray(Pp.a[k]); gl.vertexAttribPointer(Pp.a[k], n, gl.FLOAT, false, st, o); }
    gl.disable(gl.CULL_FACE); gl.drawArrays(gl.TRIANGLES, 0, STATIC.n); for (const k of ['aP', 'aN', 'aC']) gl.disableVertexAttribArray(Pp.a[k]); }
  // Gantry sign faces
  if (Math.hypot(pos[0] - 1120, pos[2] - ROAD_Z) < 2600) { const Pp = use('sign'); gl.bindBuffer(gl.ARRAY_BUFFER, SIGNS.vb); gl.enableVertexAttribArray(Pp.a.aP); gl.enableVertexAttribArray(Pp.a.aT); gl.vertexAttribPointer(Pp.a.aP, 3, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(Pp.a.aT, 2, gl.FLOAT, false, 20, 12); tex(0, SIGNS.t); gl.uniform1i(Pp.u.tS, 0); gl.drawArrays(gl.TRIANGLES, 0, SIGNS.n); gl.disableVertexAttribArray(Pp.a.aP); gl.disableVertexAttribArray(Pp.a.aT); }

  // Palms: thin leaves need both sides and, with multisampling, soft cut-outs
  if (nearCount + midCount > 0 && !OFF.has('palms')) {
    const Pp = use('palm');
    tex(1, WORD.t); gl.uniform1i(Pp.u.tL, 1);
    if (useMS && rts.ms) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    const drawLod = (m, buffer, count) => {
      if (!count) return;
      gl.bindBuffer(gl.ARRAY_BUFFER, m.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.ib);
      for (const [k, o] of [['aP', 0], ['aN', 12], ['aU', 24]]) { gl.enableVertexAttribArray(Pp.a[k]); gl.vertexAttribPointer(Pp.a[k], 3, gl.FLOAT, false, 36, o); gl.vertexAttribDivisor(Pp.a[k], 0); }
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
      for (const [k, o] of [['iA', 0], ['iB', 16]]) { gl.enableVertexAttribArray(Pp.a[k]); gl.vertexAttribPointer(Pp.a[k], 4, gl.FLOAT, false, 32, o); gl.vertexAttribDivisor(Pp.a[k], 1); }
      gl.drawElementsInstanced(gl.TRIANGLES, m.n, gl.UNSIGNED_SHORT, 0, count);
      for (const k of ['iA', 'iB', 'aP', 'aN', 'aU']) { gl.vertexAttribDivisor(Pp.a[k], 0); gl.disableVertexAttribArray(Pp.a[k]); }
    };
    drawLod(palmNear, instBufs[instIdx].near, nearCount);
    drawLod(palmMid, instBufs[instIdx].mid, midCount);
    gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE);
  }

  // The word
  if (gg < 2.3 && pos[2] > ZL - 400 && pos[1] < 520) { const Pp = use('letters'); gl.bindBuffer(gl.ARRAY_BUFFER, M.quad); gl.enableVertexAttribArray(Pp.a.aQ); gl.vertexAttribPointer(Pp.a.aQ, 2, gl.FLOAT, false, 0, 0);
    tex(0, WORD.t); gl.uniform1i(Pp.u.tT, 0); const layers = T.msaa ? 18 : 10; gl.uniform1f(Pp.u.uLayers, layers); gl.uniform1f(Pp.u.uDepth, 9);
    if (useMS && rts.ms) gl.enable(gl.SAMPLE_ALPHA_TO_COVERAGE);
    gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, layers); gl.disable(gl.SAMPLE_ALPHA_TO_COVERAGE); gl.disableVertexAttribArray(Pp.a.aQ); }

  // The bunch
  if (vlen(vsub(pos, BUNCH)) < 70) { const Pp = use('fruit'); gl.bindBuffer(gl.ARRAY_BUFFER, FRUIT.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, FRUIT.ib);
    gl.enable(gl.CULL_FACE);
    for (const [k, o] of [['aP', 0], ['aN', 12]]) { gl.enableVertexAttribArray(Pp.a[k]); gl.vertexAttribPointer(Pp.a[k], 3, gl.FLOAT, false, 24, o); gl.vertexAttribDivisor(Pp.a[k], 0); }
    gl.bindBuffer(gl.ARRAY_BUFFER, FRUITI);
    for (const [k, o] of [['iA', 0], ['iB', 16]]) { gl.enableVertexAttribArray(Pp.a[k]); gl.vertexAttribPointer(Pp.a[k], 4, gl.FLOAT, false, 32, o); gl.vertexAttribDivisor(Pp.a[k], 1); }
    gl.uniform4f(Pp.u.uBunch, BUNCH[0], BUNCH[1], BUNCH[2], .86);
    gl.drawElementsInstanced(gl.TRIANGLES, FRUIT.n, gl.UNSIGNED_SHORT, 0, T.fruit);
    for (const k of ['iA', 'iB', 'aP', 'aN']) { gl.vertexAttribDivisor(Pp.a[k], 0); gl.disableVertexAttribArray(Pp.a[k]); }
    gl.disable(gl.CULL_FACE); }

  // The drop
  if (gg > 4.6) { const Pp = use('drop'); gl.bindBuffer(gl.ARRAY_BUFFER, DROPM.vb); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, DROPM.ib);
    for (const [k, o] of [['aP', 0], ['aN', 12]]) { gl.enableVertexAttribArray(Pp.a[k]); gl.vertexAttribPointer(Pp.a[k], 3, gl.FLOAT, false, 24, o); }
    const cy = DROP_R * 1.72 + 6.5, e = DROPM.levelFor(lvlShare);
    gl.uniform4f(Pp.u.uDrop, DROP[0], cy, DROP[2], DROP_R); gl.uniform1f(Pp.u.uLvl, cy + e.y * DROP_R); gl.uniform1f(Pp.u.uRL, e.r * DROP_R);
    gl.enable(gl.CULL_FACE); gl.drawElements(gl.TRIANGLES, DROPM.n, gl.UNSIGNED_SHORT, 0); gl.disable(gl.CULL_FACE);
    for (const k of ['aP', 'aN']) gl.disableVertexAttribArray(Pp.a[k]); }

  /* Clouds over the ground while we are above them */
  gl.disable(gl.DEPTH_TEST); gl.depthMask(false);
  if (layerMode) { gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); const Pp = use('over'); tex(0, rts.cloud.t); gl.uniform1i(Pp.u.tC, 0); gl.drawArrays(gl.TRIANGLES, 0, 3); gl.disable(gl.BLEND); }

  /* Additive lights */
  gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE); gl.enable(gl.DEPTH_TEST); gl.depthMask(false);
  { const Pp = use('spr'); gl.bindBuffer(gl.ARRAY_BUFFER, SPRITES.vb); gl.enableVertexAttribArray(Pp.a.aA); gl.enableVertexAttribArray(Pp.a.aB); gl.vertexAttribPointer(Pp.a.aA, 4, gl.FLOAT, false, 32, 0); gl.vertexAttribPointer(Pp.a.aB, 4, gl.FLOAT, false, 32, 16);
    gl.uniform1f(Pp.u.uPx, VH_ * tf * .5); gl.drawArrays(gl.POINTS, 0, SPRITES.n); gl.disableVertexAttribArray(Pp.a.aA); gl.disableVertexAttribArray(Pp.a.aB); }
  { const Pp = use('bill'); gl.bindVertexArray(emptyVAO);
    const dome = [-150, 6 + 106, -3060];
    const fk = reduced ? 1 : .86 + Math.sin(time * 13) * .08 + Math.sin(time * 7.3) * .06;
    gl.uniform1f(Pp.u.uMode, 1); gl.uniform4f(Pp.u.uPos, dome[0], dome[1] - 2, dome[2], 0); gl.uniform2f(Pp.u.uSz, 11 * fk, 34 * fk); gl.uniform3f(Pp.u.uCol, 9, 3.6, .9); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    const pillar = ss(.25, .55, gg) * (1 - ss(.92, 1.16, gg)) * .85;                 // the pillar of light over the plant, seen from the sky
    if (pillar > .01) { gl.uniform1f(Pp.u.uMode, 0); gl.uniform4f(Pp.u.uPos, dome[0], dome[1], dome[2], 0); gl.uniform2f(Pp.u.uSz, 34, 2300); gl.uniform3f(Pp.u.uCol, 1.5 * pillar, 1.32 * pillar, 1.05 * pillar); gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4); } }
  if (D.rain > .01) { const Pp = use('rain'); gl.bindBuffer(gl.ARRAY_BUFFER, RAIN.vb); gl.enableVertexAttribArray(Pp.a.aR); gl.enableVertexAttribArray(Pp.a.aEnd); gl.vertexAttribPointer(Pp.a.aR, 4, gl.FLOAT, false, 20, 0); gl.vertexAttribPointer(Pp.a.aEnd, 1, gl.FLOAT, false, 20, 16); gl.drawArrays(gl.LINES, 0, RAIN.n); gl.disableVertexAttribArray(Pp.a.aR); gl.disableVertexAttribArray(Pp.a.aEnd); }
  if (flash > .03 && boltN > 0) { const Pp = use('bolt'); gl.bindBuffer(gl.ARRAY_BUFFER, BOLTV); gl.enableVertexAttribArray(Pp.a.aP); gl.vertexAttribPointer(Pp.a.aP, 3, gl.FLOAT, false, 0, 0); gl.uniform1f(Pp.u.uA, flash); gl.disable(gl.DEPTH_TEST); gl.drawArrays(gl.TRIANGLE_STRIP, 0, boltN); gl.disableVertexAttribArray(Pp.a.aP); }
  gl.disable(gl.BLEND);
  gl.disable(gl.DEPTH_TEST); gl.depthMask(true);

  /* Resolve */
  if (ms) {
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, rts.ms.f); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, rts.scene.f);
    gl.blitFramebuffer(0, 0, VW, VH_, 0, 0, VW, VH_, gl.COLOR_BUFFER_BIT, gl.NEAREST);
    gl.blitFramebuffer(0, 0, VW, VH_, 0, 0, VW, VH_, gl.DEPTH_BUFFER_BIT, gl.NEAREST);
    gl.bindFramebuffer(gl.READ_FRAMEBUFFER, null); gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);
  }
  const kx = VW / FW, ky = VH_ / FH_, dec = enc;
  const pass = (rt, name, set) => { gl.bindFramebuffer(gl.FRAMEBUFFER, rt ? rt.f : null); gl.viewport(0, 0, rt ? rt.w : W, rt ? rt.h : H); const Pp = use(name); set(Pp); gl.drawArrays(gl.TRIANGLES, 0, 3); };

  /* Bloom */
  pass(rts.b1a, 'bright', Pp => { tex(0, rts.scene.t); gl.uniform1i(Pp.u.tS, 0); gl.uniform2f(Pp.u.uK, kx, ky); gl.uniform1f(Pp.u.uDec, dec); });
  const blur = (src, dst, dx, dy) => pass(dst, 'blur', Pp => { tex(0, src.t); gl.uniform1i(Pp.u.tS, 0); gl.uniform2f(Pp.u.uD, dx, dy); });
  blur(rts.b1a, rts.b1b, 1 / rts.b1a.w, 0); blur(rts.b1b, rts.b1a, 0, 1 / rts.b1a.h);
  blur(rts.b1a, rts.b2a, 1.6 / rts.b2a.w, 0); blur(rts.b2a, rts.b2b, 0, 1.6 / rts.b2a.h); blur(rts.b2b, rts.b2a, 2.4 / rts.b2a.w, 0); blur(rts.b2a, rts.b2b, 0, 2.4 / rts.b2a.h);

  /* Sun on screen: shafts and the lens star */
  const sw = VP, sd = D.sun, cw = sw[3] * sd[0] + sw[7] * sd[1] + sw[11] * sd[2];
  // Project a point far along the sun direction from the camera
  const sp = vadd(pos, vmul(sd, 30000));
  const cx = VP[0] * sp[0] + VP[4] * sp[1] + VP[8] * sp[2] + VP[12], cy = VP[1] * sp[0] + VP[5] * sp[1] + VP[9] * sp[2] + VP[13], cwS = VP[3] * sp[0] + VP[7] * sp[1] + VP[11] * sp[2] + VP[15];
  const inFront = cwS > 0, su = inFront ? cx / cwS * .5 + .5 : -9, sv = inFront ? cy / cwS * .5 + .5 : -9;
  const onScreen = inFront ? (1 - ss(.0, .45, Math.max(Math.abs(su - .5) - .5, Math.abs(sv - .5) - .5))) : 0;
  const raysK = D.rays * onScreen;
  if (raysK > .01) pass(rts.rays, 'rays', Pp => { tex(0, rts.scene.t); gl.uniform1i(Pp.u.tS, 0); gl.uniform2f(Pp.u.uK, kx, ky); gl.uniform2f(Pp.u.uSun, su, sv); gl.uniform1f(Pp.u.uDec, dec); gl.uniform1i(Pp.u.uN, T.rays); });
  if (raysK > .01) { blur(rts.rays, rts.raysB, 1.5 / rts.rays.w, 0); blur(rts.raysB, rts.rays, 0, 1.5 / rts.rays.h); }

  /* Motion blur grows with camera speed, aimed from where the camera is heading */
  if (prevCam && dt > 0) {
    const vel = vsub(pos, prevCam);
    const vl = vlen(vel);
    if (vl > .001) { const tp = vadd(pos, vmul(vnorm(vel), 2000)); const px = VP[0] * tp[0] + VP[4] * tp[1] + VP[8] * tp[2] + VP[12], py = VP[1] * tp[0] + VP[5] * tp[1] + VP[9] * tp[2] + VP[13], pw = VP[3] * tp[0] + VP[7] * tp[1] + VP[11] * tp[2] + VP[15]; if (pw > 0) { foe[0] = mix(foe[0], px / pw * .5 + .5, .25); foe[1] = mix(foe[1], py / pw * .5 + .5, .25); } }
  }
  prevCam = pos;
  const mbT = reduced ? 0 : clamp(Math.abs(gVel) * .075 - .004, 0, .055);
  mbSmooth = mix(mbSmooth, mbT, .3);
  const aperture = keyParam(gg, 'ap', 0);
  const bunchD = vlen(vsub(pos, BUNCH));
  const macro = ss(1.9, 1.99, gg) * (1 - ss(2.26, 2.38, gg));
  const ap = macro * .05;
  const endDof = ss(5.7, 6, gg) * .012;
  const focus = macro > 0 ? bunchD : vlen(vsub(pos, [DROP[0], 25, DROP[2]]));
  pass(null, 'final', Pp => {
    tex(0, rts.scene.t); gl.uniform1i(Pp.u.tS, 0); tex(1, rts.depth.t); gl.uniform1i(Pp.u.tD, 1); tex(2, rts.b1a.t); gl.uniform1i(Pp.u.tB1, 2); tex(3, rts.b2b.t); gl.uniform1i(Pp.u.tB2, 3); tex(4, rts.rays.t); gl.uniform1i(Pp.u.tR, 4);
    gl.uniform2f(Pp.u.uK, kx, ky); gl.uniform2f(Pp.u.uSun, su, sv); gl.uniform2f(Pp.u.uFoE, foe[0], foe[1]);
    const total = Math.max(ap, endDof);
    gl.uniform4f(Pp.u.uP, total, focus, near, far);
    gl.uniform4f(Pp.u.uQ, total > 0 ? 0 : mbSmooth, raysK, D.fl * onScreen, D.ex);
    gl.uniform3fv(Pp.u.uSunC, D.c); gl.uniform1i(Pp.u.uTaps, total > 0 ? T.taps : T.mblur);
    gl.uniform1f(Pp.u.uDec, dec); gl.uniform1f(Pp.u.uTime, reduced ? 0 : time); gl.uniform1f(Pp.u.uAsp, asp);
  });
}
function makeBolt() {
  const pts = []; let x = -150 + (Math.random() - .5) * 900, y = 900, z = -3150 - Math.random() * 400;
  while (y > 40) { const w = 3 + y * .002; pts.push(x - w, y, z, x + w, y, z); y -= 40 + Math.random() * 70; x += (Math.random() - .5) * 90; }
  pts.push(x, 6, z, x, 6, z);
  gl.bindBuffer(gl.ARRAY_BUFFER, BOLTV); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(pts)); boltN = pts.length / 3;
}

/* ── Words and controls. Only opacity and transform are written, and only when they change. ── */
const chs = [...document.querySelectorAll('.ch')].map(el => ({ el, i: +el.dataset.i, o: -1, y: 1e9 }));
const WINDOWS = [[-.5, 0, .1, .3], [.86, .97, 1.2, 1.32], [1.92, 2.0, 2.24, 2.36], [2.9, 3.0, 3.26, 3.4], [3.9, 4.0, 4.24, 4.38], [4.9, 5.0, 5.22, 5.32], [5.86, 5.98, 7, 8]];
const rail = document.getElementById('rail'), playBtn = document.getElementById('play');
NAMES.forEach((n, i) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', 'Go to ' + n); b.innerHTML = `<em>${n}</em><i></i>`; b.onclick = () => jump(i); rail.appendChild(b); });
const railBtns = [...rail.children];
let curCh = -1;
function updateWords(gg) {
  for (const c of chs) {
    const [a, b, d, e] = WINDOWS[c.i];
    const enter = clamp((gg - a) / (b - a)), leave = clamp((e - gg) / (e - d));
    const easeOut = 1 - Math.pow(1 - enter, 3);       // enters decelerating, exits quicker and quieter
    const o = Math.min(easeOut, leave * leave * (3 - 2 * leave));
    const y = reduced ? 0 : (1 - easeOut) * 28 - (1 - leave) * 14;
    if (Math.abs(o - c.o) > .002 || Math.abs(y - c.y) > .1) {
      c.el.style.opacity = o.toFixed(3);
      c.el.style.transform = `translate3d(0,${y.toFixed(1)}px,0)`;
      c.el.style.visibility = o < .004 ? 'hidden' : 'visible';
      c.el.classList.toggle('live', o > .55);
      c.o = o; c.y = y;
    }
  }
  const cur = clamp(Math.round(gg), 0, N - 1);
  if (cur !== curCh) { curCh = cur; railBtns.forEach((b, k) => { b.classList.toggle('on', k === cur); if (k === cur) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); }); stage.classList.toggle('at-end', cur === N - 1); }
}
const SCREENS_PER = 1.35;
function layoutTrack() { track.style.height = `calc(${(N - 1) * SCREENS_PER * 100}svh + 100svh)`; maxScroll = track.offsetHeight - innerHeight; }
let maxScroll = 1;
const readTarget = () => { if (TEST_G != null) return TEST_G; return clamp(scrollY / Math.max(maxScroll, 1)) * (N - 1); };

/* A jump is an eased flight, and any touch or wheel takes over at once. */
let jumpA = null, playing = false;
function jump(i) {
  stopPlay();
  const to = maxScroll * (i / (N - 1));
  if (reduced) { scrollTo(0, to); return; }
  const from = scrollY, dist = Math.abs(to - from) / Math.max(maxScroll, 1) * (N - 1);
  jumpA = { from, to, t0: performance.now(), dur: 700 + Math.min(dist, 3) * 900 };
}
function setPlayUI() { playBtn.querySelector('span').textContent = playing ? 'Pause' : 'Play'; playBtn.querySelector('svg').innerHTML = playing ? '<path d="M2 1h3v10H2zM7 1h3v10H7z"/>' : '<path d="M2 1l9 5-9 5z"/>'; playBtn.setAttribute('aria-pressed', String(playing)); }
function stopPlay() { if (playing) { playing = false; setPlayUI(); } }
playBtn.onclick = () => { playing = !playing; jumpA = null; if (playing && scrollY >= maxScroll - 2) scrollTo(0, 0); setPlayUI(); playAt = performance.now(); };
for (const ev of ['wheel', 'touchstart']) addEventListener(ev, () => { stopPlay(); jumpA = null; }, { passive: true });
addEventListener('keydown', e => { if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(e.key) && e.target !== playBtn) { stopPlay(); jumpA = null; } });
let playAt = 0;
function stepScroll(now) {
  if (jumpA) {
    const t = clamp((now - jumpA.t0) / jumpA.dur), e = t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    scrollTo(0, mix(jumpA.from, jumpA.to, e)); if (t >= 1) jumpA = null;
  } else if (playing) {
    const dt = Math.min(.05, (now - playAt) / 1000); playAt = now;
    // Slow while words are on screen, faster between chapters.
    const fr = target_g - Math.floor(target_g), hold = fr < .24 || fr > .94;
    const y = scrollY + maxScroll / (N - 1) / (hold ? 4.4 : 2.4) * dt;
    if (y >= maxScroll - 1) { scrollTo(0, maxScroll); stopPlay(); } else scrollTo(0, y);
  }
}
for (const b of document.querySelectorAll('[data-blend]')) b.onclick = () => {
  lvlTarget = +b.dataset.blend / 100; document.querySelectorAll('[data-blend]').forEach(x => x.setAttribute('aria-pressed', String(x === b))); needDraw = true;
};
if (!coarse) addEventListener('pointermove', e => { parTX = e.clientX / innerWidth * 2 - 1; parTY = -(e.clientY / innerHeight * 2 - 1); }, { passive: true });

/* ── Loop: spring-driven camera, and frame-time control that changes resolution without touching a buffer ── */
const dbg = document.getElementById('debug'); if (qs.has('debug')) dbg.hidden = false;
let useMS = true, ceilScale = 1, ceilUntil = 0, retryMs = 15000, benching = false, frames = 0, drawnOnce = false, fps = 60, statT = 0, statF = 0;
function frame(now) {
  raf = requestAnimationFrame(frame);
  const dt = Math.min(.1, Math.max(.001, (now - last) / 1000)); last = now;
  stepScroll(now);
  target_g = readTarget();
  if (reduced) {
    const snap = clamp(Math.round(target_g), 0, N - 1);
    if (snap !== g) { g = snap; gVel = 0; needDraw = true; }
  } else if (TEST_G != null) { g = TEST_G; gVel = 0; }
  else {
    // Critically damped: starts soft, lands soft, and a mouse-wheel notch can never read as a jump.
    const w = coarse ? 7 : 5.2, a = (target_g - g) * w * w - 2 * w * gVel;
    gVel += a * dt; g += gVel * dt;
    if (Math.abs(target_g - g) < .00008 && Math.abs(gVel) < .0004) { g = target_g; gVel = 0; }
  }
  // Blend-share spring for the drop, with a small iOS-like overshoot.
  const lw = 9, la = (lvlTarget - lvlShare) * lw * lw - 2 * .62 * lw * lvlVel; lvlVel += la * dt; lvlShare += lvlVel * dt;
  parX += (parTX - parX) * (1 - Math.exp(-dt * 4)); parY += (parTY - parY) * (1 - Math.exp(-dt * 4));
  updateWords(Math.max(g, 0));
  if (!ready || benching) return;
  if (!reduced || needDraw) { draw(now, dt); needDraw = false; if (!drawnOnce) { drawnOnce = true; reveal(); } frames++; }
  // Keep it fluid first, sharp second. Sustained slow frames lower resolution; sustained headroom raises it again.
  if (!reduced && frames > 20) {
    ema = ema * .9 + dt * 1000 * .1;
    statF++; if (now - statT > 500) { fps = statF / ((now - statT) / 1000); statT = now; statF = 0; }
    if (ema > 20) { lowFor += dt; highFor = 0; } else if (ema < 17.6) { highFor += dt; lowFor = 0; } else { lowFor = 0; highFor = Math.max(0, highFor - dt); }
    if (lowFor > .3 && dynScale > .5) { ceilScale = dynScale; ceilUntil = now + retryMs; retryMs = Math.min(retryMs * 2, 120000); if (useMS && rts.ms && dynScale <= .8) useMS = false; dynScale = Math.max(.5, dynScale - .1); lowFor = 0; }
    if (highFor > 3 && dynScale < 1 && (dynScale + .04 < ceilScale || now > ceilUntil)) { dynScale = Math.min(1, dynScale + .05); highFor = 1.8; }
    if (!dbg.hidden) dbg.textContent = `${fps.toFixed(0)} fps  frame ${ema.toFixed(1)} ms\ntier ${T.name}  res ${(dynScale * 100).toFixed(0)}%  ${FW}x${FH_}  msaa ${useMS && rts.ms ? T.msaa : 0}\npalms ${nearCount}+${midCount}  g ${g.toFixed(2)}`;
  }
}
let raf = 0;
document.addEventListener('visibilitychange', () => { cancelAnimationFrame(raf); if (!document.hidden) { last = performance.now(); raf = requestAnimationFrame(frame); } });

/* ── Opening: an iOS-style spring on the very first paint, then the 3D fades in underneath the words ── */
function springEasing(omega = 11, zeta = .82, n = 40) {
  const pts = []; const wd = omega * Math.sqrt(1 - zeta * zeta);
  const dur = 1.0;
  for (let i = 0; i <= n; i++) { const t = i / n * dur, e = Math.exp(-zeta * omega * t); pts.push((1 - e * (Math.cos(wd * t) + (zeta * omega / wd) * Math.sin(wd * t))).toFixed(4)); }
  pts[n] = '1';
  return { easing: `linear(${pts.join(',')})`, duration: dur * 1000 };
}
function opening() {
  if (reduced || !stage.animate || TEST_G != null) return;
  const sp = CSS.supports('animation-timing-function', 'linear(0,1)') ? springEasing() : { easing: 'cubic-bezier(.2,0,0,1)', duration: 620 };
  stage.style.borderRadius = '26px';
  stage.animate([{ transform: 'scale(.92)' }, { transform: 'scale(1)' }], { ...sp, fill: 'none' });
  setTimeout(() => { stage.style.borderRadius = ''; }, 520);
}
function reveal() {
  canvas.classList.add('on');
  const done = () => { poster.style.display = 'none'; document.querySelector('meta[name=theme-color]').content = '#3b2f48'; };
  if (reduced || TEST_G != null) done(); else setTimeout(done, 800);
  window.__heroReady = true;
}

/* ── Boot: every step yields, so the opening spring and the first scroll stay smooth while the world is built ── */
async function boot() {
  layoutTrack(); updateWords(g); opening();
  addEventListener('resize', () => { layoutTrack(); if (ready) resize(false); }, { passive: true });
  addEventListener('scroll', () => { needDraw = needDraw || reduced; }, { passive: true });
  raf = requestAnimationFrame(frame);
  await nextFrame();
  if (TEST_G == null && !qs.has('nodefer')) await new Promise(r => (window.requestIdleCallback || (f => setTimeout(f, 1)))(() => setTimeout(r, 620), { timeout: 900 }));
  gl = canvas.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance', preserveDrawingBuffer: !!qs.has('shot') });
  if (!gl) { document.documentElement.classList.add('no-gl'); return; }   // the poster and the words still work
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); ready = false; canvas.classList.remove('on'); poster.style.display = ''; });
  canvas.addEventListener('webglcontextrestored', () => location.reload());
  const tierN = pickTier(gl); T = TIERS[clamp(tierN, 0, 2)];
  const f32 = gl.getExtension('EXT_color_buffer_float'), f16 = gl.getExtension('EXT_color_buffer_half_float');
  gl.getExtension('OES_texture_float_linear');
  if (f32 && !T.msaa) hdr = { i: gl.R11F_G11F_B10F, f: gl.RGB, t: gl.HALF_FLOAT, enc: 1 };
  else if (f32 || f16) hdr = { i: gl.RGBA16F, f: gl.RGBA, t: gl.HALF_FLOAT, enc: 1 };
  else hdr = { i: gl.RGBA8, f: gl.RGBA, t: gl.UNSIGNED_BYTE, enc: .25 };
  enc = hdr.enc;
  if (f32 || f16) { hdr.cloudI = gl.RGBA16F; hdr.cloudF = gl.RGBA; hdr.cloudT = gl.HALF_FLOAT; } else { hdr.cloudI = gl.RGBA8; hdr.cloudF = gl.RGBA; hdr.cloudT = gl.UNSIGNED_BYTE; }
  emptyVAO = gl.createVertexArray(); gl.bindVertexArray(emptyVAO);

  // Shaders compile in parallel where the driver allows it; we poll instead of blocking.
  const par = gl.getExtension('KHR_parallel_shader_compile');
  prog('sky', FULL_VS, SKY_FS); prog('over', FULL_VS, OVER_FS); prog('cloud', FULL_VS, CLOUD_FS); prog('terr', TERR_VS, TERR_FS); prog('palm', PALM_VS, PALM_FS);
  prog('letters', LET_VS, LET_FS); prog('stat', STAT_VS, STAT_FS); prog('sign', SIGN_VS, SIGN_FS); prog('road', ROAD_VS, ROAD_FS); prog('fruit', FRUIT_VS, FRUIT_FS);
  prog('drop', DROP_VS, DROP_FS); prog('spr', SPR_VS, SPR_FS); prog('bill', BILL_VS, BILL_FS); prog('rain', RAIN_VS, RAIN_FS); prog('bolt', BOLT_VS, BOLT_FS);
  prog('bright', FULL_VS, BRIGHT_FS); prog('blur', FULL_VS, BLUR_FS); prog('rays', FULL_VS, RAYS_FS); prog('final', FULL_VS, FINAL_FS);
  const all = Object.values(programs);
  if (par) { while (!all.every(P => gl.getProgramParameter(P.p, par.COMPLETION_STATUS_KHR))) await nextFrame(); }
  sliceStart = performance.now();
  for (const P of all) { finishProg(P); await breathe(); }

  ubo = gl.createBuffer(); gl.bindBuffer(gl.UNIFORM_BUFFER, ubo); gl.bufferData(gl.UNIFORM_BUFFER, UB.byteLength, gl.DYNAMIC_DRAW);
  NOISE = await buildNoise(tierN === 0 ? 32 : 48);
  await breathe();
  WORD = await buildWord();
  buildKeys(WORD.xD, WORD.yD);
  // Keep palms out of the camera's way wherever it flies low.
  for (let gg = .8; gg < 5.5; gg += .004) {
    const p = hermite(KEYS, gg, 'p'); if (p[1] > 34) continue;
    const q = [p[0], p[2], 12 * 12]; const l = pathNear[pathNear.length - 1];
    if (!l || Math.hypot(l[0] - q[0], l[1] - q[1]) > 6) pathNear.push(q);
  }
  pathNear.push([HERO.x, HERO.z, 11 * 11]);
  await breathe();
  palmNear = palmMesh(...T.nearGeo); palmMid = palmMesh(tierN === 0 ? 9 : 12, 2);
  await breathe();
  { const [m, n] = T.terr, RT = [], I = []; for (let i = 0; i <= n; i++) { const r = 1.5 * Math.pow(38000 / 1.5, i / n); for (let j = 0; j <= m; j++) RT.push(r, (j / m - .5) * 4.5); }
    for (let i = 0; i < n; i++) for (let j = 0; j < m; j++) { const a = i * (m + 1) + j, b = a + m + 1; I.push(a, a + 1, b, a + 1, b + 1, b); }
    TERR = { vb: buf(new Float32Array(RT)), ib: buf(new Uint32Array(I), gl.ELEMENT_ARRAY_BUFFER), n: I.length, it: gl.UNSIGNED_INT }; }
  await breathe();
  FRUIT = fruitMesh(tierN); FRUITI = fruitInstances(T.fruit); DROPM = dropMesh(tierN === 0 ? 28 : 56);
  await breathe();
  STATIC = buildStatic(); await breathe();
  SIGNS = buildSigns(); SPRITES = buildSprites();
  ROADV = buf(new Float32Array([-540, ROAD_Z - 12, DROP[0] + 40, ROAD_Z - 12, -540, ROAD_Z + 12, DROP[0] + 40, ROAD_Z + 12]));
  M.quad = buf(new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]));
  { const n = tierN === 0 ? 420 : 900, d = new Float32Array(n * 10); for (let i = 0; i < n; i++) { const a = Math.random(), b = Math.random(), c = Math.random(), e = Math.random(); d.set([a, b, c, e, 0, a, b, c, e, 1], i * 10); } RAIN = { vb: buf(d), n: n * 2 }; }
  BOLTV = buf(new Float32Array(400), gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW);
  instNear = new Float32Array(T.nearCap * 8); instMid = new Float32Array(T.midCap * 8);
  for (let i = 0; i < 3; i++) instBufs.push({ near: buf(instNear.byteLength, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW), mid: buf(instMid.byteLength, gl.ARRAY_BUFFER, gl.DYNAMIC_DRAW) });
  gl.getExtension('OES_standard_derivatives');
  await breathe();
  resize(true);
  if (!reduced && TEST_G == null) { const keep = g; for (const gk of [0, .7, 1, 2, 3.1, 4, 5, 6]) { g = gk; gVel = 0; draw(performance.now(), .016); gl.flush(); await nextFrame(); } g = keep; gVel = 0; prevCam = null; lastCull[0] = 1e9; boltAt = -10; }
  window.__hero = { get stats() { return { fps, ema, dynScale, tier: T.name, g, lvl: lvlShare, nearCount, midCount, W, H, msaa: rts.ms ? T.msaa : 0, word: WORD && { xD: WORD.xD, yD: WORD.yD, hole: WORD.hole, capH: WORD.capH } }; }, setDyn: v => { dynScale = v; }, OFF,
    bench: async (gv, n = 14) => { const keep = g; g = gv; gVel = 0; let tot = 0, c = 0; const px = new Uint8Array(4); benching = true; for (let i = 0; i < n; i++) { await nextFrame(); const t0 = performance.now(); draw(performance.now(), .016); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); const d = performance.now() - t0; if (i > 3) { tot += d; c++; } } benching = false; g = keep; return tot / c; } };
  if (coarse) dynScale = .8;
  ready = true;
}
boot().catch(e => { console.error(e); window.__heroError = String(e); });
})();
