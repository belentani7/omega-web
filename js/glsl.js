/**
 * Shared GLSL ES 1.00 library, adapted for WebGL 1 and WebGL 2 compatibility.
 * Every world defines a renderWorld(vec2 uv) function; the compositor supplies
 * camera, quality, audio, and transition without requiring any outside CDN.
 */
export const VERTEX_SHADER = `
attribute vec2 a_position;
varying vec2 v_uv;
void main() {
  v_uv = a_position * .5 + .5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

export const GLSL_PRELUDE = `
precision highp float;
#define PI 3.1415926535897932384626433832795
#define TAU 6.283185307179586476925286766559
#define GOLDEN 1.6180339887498948482
varying vec2 v_uv;
uniform vec2 u_resolution;
uniform vec2 u_pointer;
uniform vec4 u_camera;
uniform vec3 u_camera_position;
uniform float u_time;
uniform float u_frame;
uniform float u_quality;
uniform float u_reduced;
uniform float u_audio;
uniform float u_transition;
uniform float u_seed;
uniform vec3 u_accent;

float sat(float x) { return clamp(x, 0.0, 1.0); }
vec2 sat2(vec2 x) { return clamp(x, 0.0, 1.0); }
vec3 sat3(vec3 x) { return clamp(x, 0.0, 1.0); }
float sqr(float x) { return x * x; }
float cube(float x) { return x * x * x; }
float remap(float x, float a, float b, float c, float d) {
  return mix(c, d, clamp((x-a)/(b-a), 0.0, 1.0));
}
float smoothPulse(float a, float b, float c, float d, float x) {
  return smoothstep(a, b, x) * (1.0-smoothstep(c, d, x));
}
float hash11(float p) {
  p = fract(p * .1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * .1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x+p3.y)*p3.z);
}
vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(.1031,.1030,.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx+p3.yz)*p3.zy);
}
vec3 hash33(vec3 p) {
  p = fract(p * vec3(.1031,.11369,.13787));
  p += dot(p, p.yxz + 19.19);
  return fract((p.xxy+p.yxx)*p.zyx);
}
float valueNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0-2.0*f);
  return mix(mix(hash12(i), hash12(i+vec2(1,0)), f.x),
             mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),f.x),f.y);
}
float noise3(vec3 x) {
  vec3 p = floor(x);
  vec3 f = fract(x);
  f = f*f*(3.0-2.0*f);
  float n = dot(p, vec3(1.0,57.0,113.0));
  return mix(mix(mix(hash11(n),hash11(n+1.0),f.x),
                 mix(hash11(n+57.0),hash11(n+58.0),f.x),f.y),
             mix(mix(hash11(n+113.0),hash11(n+114.0),f.x),
                 mix(hash11(n+170.0),hash11(n+171.0),f.x),f.y),f.z);
}
float fbm2(vec2 p) {
  float v = 0.0;
  float a = .5;
  mat2 rot = mat2(.8,-.6,.6,.8);
  for(int i=0;i<6;i++) {
    v += a * valueNoise(p);
    p = rot*p*2.03 + 13.17;
    a *= .5;
  }
  return v;
}
float fbm3(vec3 p) {
  float v = 0.0;
  float a = .5;
  for(int i=0;i<6;i++) {
    v += a * noise3(p);
    p = p*2.07 + vec3(13.1,7.4,19.7);
    a *= .52;
  }
  return v;
}
float turbulence3(vec3 p) {
  float a=.5;
  float v=0.0;
  for(int i=0;i<6;i++) {
    v+=a*abs(noise3(p)*2.0-1.0);
    p = p*2.15 + 8.1;
    a*=.55;
  }
  return v;
}
float ridgedFbm(vec3 p) {
  float sum=0.0;
  float amp=.52;
  for(int i=0;i<5;i++) {
    float v=1.0-abs(noise3(p)*2.0-1.0);
    sum+=v*v*amp;
    p*=2.13;
    amp*=.54;
  }
  return sum;
}
vec2 rotate2(vec2 v,float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c)*v;
}
mat3 rotateX(float a){
  float c=cos(a),s=sin(a);
  return mat3(1,0,0,0,c,-s,0,s,c);
}
mat3 rotateY(float a){
  float c=cos(a),s=sin(a);
  return mat3(c,0,s,0,1,0,-s,0,c);
}
mat3 rotateZ(float a){
  float c=cos(a),s=sin(a);
  return mat3(c,-s,0,s,c,0,0,0,1);
}
vec3 cameraRay(vec2 uv) {
  float fov = 1.05 / max(.2,u_camera.z);
  vec3 d = normalize(vec3(uv*fov,1.6));
  d = rotateX(u_camera.y)*rotateY(u_camera.x)*d;
  return d;
}
vec2 normalizedUV() {
  return (gl_FragCoord.xy - .5*u_resolution.xy)/min(u_resolution.x,u_resolution.y) - u_camera_position.xy*.035;
}
float sphereIntersect(vec3 ro,vec3 rd,vec3 center,float radius) {
  vec3 oc=ro-center;
  float b=dot(oc,rd);
  float c=dot(oc,oc)-radius*radius;
  float h=b*b-c;
  if(h<0.0) return -1.0;
  return -b-sqrt(h);
}
float sphereExit(vec3 ro,vec3 rd,vec3 center,float radius) {
  vec3 oc=ro-center;
  float b=dot(oc,rd);
  float c=dot(oc,oc)-radius*radius;
  float h=b*b-c;
  return h<0.0?-1.0:-b+sqrt(h);
}
float planeIntersect(vec3 ro,vec3 rd,vec3 n,float h) {
  float denom=dot(rd,n);
  if(abs(denom)<.0001) return -1.0;
  return (h-dot(ro,n))/denom;
}
float sdSphere(vec3 p,float r){return length(p)-r;}
float sdTorus(vec3 p,vec2 t){
  vec2 q=vec2(length(p.xz)-t.x,p.y);
  return length(q)-t.y;
}
float sdBox(vec3 p,vec3 b){
  vec3 d=abs(p)-b;
  return length(max(d,0.0))+min(max(d.x,max(d.y,d.z)),0.0);
}
float sdRoundBox(vec3 p,vec3 b,float r){
  return sdBox(p,b)-r;
}
float sdCapsule(vec3 p,vec3 a,vec3 b,float r){
  vec3 ab=b-a;
  return length(p-a-ab*clamp(dot(p-a,ab)/dot(ab,ab),0.0,1.0))-r;
}
float sdCylinder(vec3 p,float radius,float height){
  vec2 d=abs(vec2(length(p.xz),p.y))-vec2(radius,height);
  return min(max(d.x,d.y),0.0)+length(max(d,0.0));
}
vec3 hsv2rgb(vec3 c){
  vec3 p=abs(fract(c.xxx+vec3(0.0,2.0/3.0,1.0/3.0))*6.0-3.0);
  return c.z*mix(vec3(1.0),clamp(p-1.0,0.0,1.0),c.y);
}
vec3 palette(float t,vec3 a,vec3 b,vec3 c,vec3 d){
  return a+b*cos(TAU*(c*t+d));
}
vec3 filmic(vec3 color){
  color=max(color,vec3(0.0));
  color=(color*(2.51*color+.03))/(color*(2.43*color+.59)+.14);
  return clamp(color,0.0,1.0);
}
vec3 acesApprox(vec3 v){
  return clamp((v*(v*.6+.22))/(v*(v*.6+1.7)+.06),0.0,1.0);
}
vec3 gammaCorrect(vec3 color){
  return pow(max(color,vec3(0.0)),vec3(.45454545));
}
float luminous(vec3 color){
  return dot(color,vec3(.2126,.7152,.0722));
}
float vignette(vec2 uv,float intensity){
  vec2 s=uv+.5;
  float v=s.x*s.y*(1.0-s.x)*(1.0-s.y);
  return pow(16.0*max(0.0,v),intensity);
}
float ring2(vec2 uv,float radius,float thickness){
  return 1.0-smoothstep(thickness*.5,thickness,length(uv)-radius)*smoothstep(-thickness,-thickness*.5,length(uv)-radius);
}
float glowDot(vec2 uv,float radius){
  return radius/(radius+dot(uv,uv));
}
float starCross(vec2 p,float size){
  float d=length(p);
  float core=exp(-d*d*120.0/size);
  float x=exp(-abs(p.x)*180.0)*exp(-abs(p.y)*13.0);
  float y=exp(-abs(p.y)*180.0)*exp(-abs(p.x)*13.0);
  return core+(x+y)*.35;
}
float starCell(vec2 uv){
  vec2 cell=floor(uv);
  vec2 p=fract(uv)-.5;
  vec2 jitter=hash22(cell)-.5;
  float radius=mix(.004,.03,hash12(cell+17.0));
  float intensity=step(.935,hash12(cell+vec2(43,7)));
  return intensity*starCross(p-jitter*.45,radius*50.0);
}
float starLayers(vec2 uv,float density){
  float stars=0.0;
  stars+=starCell(uv*density);
  stars+=starCell(uv*density*1.87+19.5)*.55;
  stars+=starCell(uv*density*3.12-41.1)*.2;
  return min(2.0,stars);
}
vec3 backgroundStars(vec2 uv){
  vec2 p=rotate2(uv,u_camera.x*.09);
  float twinkle=.91+.09*sin(u_time*.8+p.x*38.0);
  float stars=starLayers(p,11.0)*twinkle;
  vec3 base=mix(vec3(.001,.003,.013),vec3(.009,.002,.018),sat(uv.y+.4));
  base+=stars*mix(vec3(.42,.7,1.0),vec3(1.0,.54,.67),valueNoise(p*17.0));
  return base;
}
float depthFog(float depth,float density){
  return 1.0-exp(-density*depth);
}
float fresnel(float ndotv,float power){
  return pow(1.0-clamp(ndotv,0.0,1.0),power);
}
float smithShadow(float NoV,float rough){
  float k=rough*rough*.5;
  return NoV/(NoV*(1.0-k)+k);
}
float distributionGGX(float NoH,float rough){
  float a=rough*rough;
  float a2=a*a;
  float denom=NoH*NoH*(a2-1.0)+1.0;
  return a2/(PI*denom*denom+.00001);
}
vec3 fresnelSchlick(float cosTheta,vec3 f0){
  return f0+(1.0-f0)*pow(1.0-sat(cosTheta),5.0);
}
vec3 shadePBR(vec3 n,vec3 v,vec3 l,vec3 albedo,float metallic,float rough){
  vec3 h=normalize(v+l);
  float NoL=max(dot(n,l),.0);
  float NoV=max(dot(n,v),.0001);
  float NoH=max(dot(n,h),.0001);
  float HoV=max(dot(h,v),.0001);
  vec3 f0=mix(vec3(.04),albedo,metallic);
  vec3 f=fresnelSchlick(HoV,f0);
  float d=distributionGGX(NoH,rough);
  float g=smithShadow(NoL,rough)*smithShadow(NoV,rough);
  vec3 spec=d*g*f/max(.001,4.0*NoL*NoV);
  vec3 diffuse=(1.0-f)*(1.0-metallic)*albedo/PI;
  return (diffuse+spec)*NoL;
}
vec3 skyGradient(vec2 uv,vec3 top,vec3 bottom){
  float t=smoothstep(-.8,.9,uv.y);
  return mix(bottom,top,t);
}
vec3 radialBloom(vec2 p,vec3 color,float radius,float power){
  float d=length(p);
  float bloom=pow(radius/max(radius,d),power);
  return color*bloom;
}
vec2 flowField(vec2 p,float t){
  return vec2(fbm2(p*.5+vec2(t*.05,0.0)),fbm2(p*.5+vec2(0.0,-t*.03)))-.5;
}
float waveGerstner(vec2 position,vec2 direction,float steepness,float frequency,float speed,float phase){
  float projection=dot(position,normalize(direction));
  return steepness*cos(projection*frequency+speed*u_time+phase);
}
vec3 gerstnerPosition(vec2 p){
  float h=0.0;
  h+=waveGerstner(p,vec2(1.0,.1),.19,2.6,1.2,0.0);
  h+=waveGerstner(p,vec2(.23,1.0),.12,4.2,-1.55,1.3);
  h+=waveGerstner(p,vec2(-.72,.85),.08,7.1,.9,2.7);
  h+=waveGerstner(p,vec2(.8,-.6),.045,11.0,-1.2,.7);
  return vec3(p.x,h,p.y);
}
float waveHeight(vec2 p){
  return gerstnerPosition(p).y;
}
vec3 waveNormal(vec2 p){
  float e=.03;
  float hx=waveHeight(p+vec2(e,0.0))-waveHeight(p-vec2(e,0.0));
  float hy=waveHeight(p+vec2(0.0,e))-waveHeight(p-vec2(0.0,e));
  return normalize(vec3(-hx,2.0*e,-hy));
}
float densityCloud(vec3 p){
  float n=fbm3(p*.7);
  float detail=ridgedFbm(p*1.6);
  return sat(n*.94+detail*.31-.56);
}
float lightningSeed(float t){
  float slot=floor(t*1.8);
  return step(.86,hash11(slot+u_seed));
}
float lightningFilament(vec2 p,float t){
  float x=p.x;
  float y=p.y;
  float bend=fbm2(vec2(y*13.0,t*.17))*.24;
  bend+=(valueNoise(vec2(y*64.0,t))-.5)*.042;
  float filament=abs(x-bend);
  float branch=abs(x-bend-sin(y*23.0)*.058);
  return exp(-filament*250.0)+.2*exp(-branch*145.0);
}
vec3 lightRay(vec3 ro,vec3 rd,vec3 center,vec3 tint,float spread){
  vec3 rel=center-ro;
  float closeness=length(cross(normalize(rel),rd));
  return tint*spread/(spread+closeness*closeness);
}
float tonemapLuma(float x){
  return x/(1.0+x);
}
vec3 applyAtmosphere(vec3 col,vec2 uv,float haze){
  float f=exp(-abs(uv.y)*3.0)*haze;
  return col+vec3(.016,.02,.04)*f;
}
vec3 chromaticSpectral(vec2 p){
  return vec3(
    sin(p.x*2.7+p.y*1.2)*.5+.5,
    sin(p.x*1.7-p.y*2.5+2.1)*.5+.5,
    sin(p.x*.9+p.y*3.5+4.2)*.5+.5
  );
}
float scanGrain(vec2 uv){
  return hash12(floor(uv*u_resolution.xy)+floor(u_frame))-.5;
}
vec3 finishColor(vec3 color,vec2 uv){
  color=filmic(color);
  color*=vignette(uv*.5,.17);
  color+=(scanGrain(uv)*.008)*(1.0-u_reduced);
  color=mix(color,u_accent*0.01,u_transition*.15);
  return gammaCorrect(max(color,vec3(0.0)));
}
`;

export const GLSL_EPILOGUE = `
void main() {
  vec2 uv=normalizedUV();
  vec3 color=renderWorld(uv);
  gl_FragColor=vec4(finishColor(color,uv),1.0);
}
`;

export function compileWorldFragment(worldSource) {
  if (typeof worldSource !== 'string' || !worldSource.includes('renderWorld(')) {
    throw new Error('World GLSL must export vec3 renderWorld(vec2 uv).');
  }
  return GLSL_PRELUDE + '\n' + worldSource + '\n' + GLSL_EPILOGUE;
}
