/** An actual procedural spiral nebula: five arms, volumetric dust and stars. */
export const galaxy = `
float spiralArm(vec2 p, float arm, float t) {
  float r=max(length(p),.001);
  float a=atan(p.y,p.x);
  float target=arm*TAU/5.0+log(r+.15)*2.4+t*.026;
  float difference=abs(sin((a-target)*2.5));
  float width=mix(.12,.37,sat(r/2.2));
  return pow(1.0-smoothstep(.0,width,difference),2.0);
}
float nebulaDensity(vec3 p) {
  float r=length(p.xy);
  float thickness=exp(-abs(p.z)*2.0);
  float cloud=fbm3(p*2.3+vec3(0.0,0.0,u_time*.013));
  float ridged=ridgedFbm(p*1.3);
  float arm=0.0;
  for(int i=0;i<5;i++) {
    arm=max(arm,spiralArm(p.xy,float(i),u_time));
  }
  float core=exp(-r*r*7.0);
  float dust=smoothstep(.38,.68,cloud+.16*ridged);
  return (arm*dust*.69+core*.7)*thickness*exp(-r*.8);
}
vec3 nebulaTint(vec3 p) {
  float r=length(p.xy);
  float t=atan(p.y,p.x);
  float index=floor(mod(t/TAU*5.0+5.0,5.0));
  vec3 red=vec3(.93,.015,.095);
  vec3 purple=vec3(.26,.08,.62);
  vec3 cyan=vec3(.03,.45,.65);
  vec3 gold=vec3(1.0,.37,.09);
  vec3 color=mix(red,purple,sat(r*.7));
  color=mix(color,cyan,sat(sin(t*2.0+u_time*.06)*.5+.5)*.5);
  color=mix(color,gold,exp(-r*r*17.0)*.85);
  return color;
}
float ringDisk(vec3 p,float radius,float thickness) {
  return exp(-sqr((length(p.xy)-radius)/thickness))*exp(-abs(p.z)*12.0);
}
vec3 galaxyDust(vec3 ro,vec3 rd) {
  vec3 sum=vec3(0.0);
  float light=.0;
  float trans=1.0;
  for(int i=0;i<40;i++) {
    if(float(i)>mix(21.0,39.0,u_quality)) break;
    float t=float(i)*.12+.11;
    vec3 p=ro+rd*t;
    p.xy=rotate2(p.xy,u_camera.x*.14);
    float density=nebulaDensity(p);
    float extinction=density*.074;
    vec3 emission=nebulaTint(p)*density*1.45;
    emission+=vec3(1.0,.55,.27)*exp(-dot(p,p)*8.0)*.45;
    sum+=emission*trans*.12;
    light+=density*.01;
    trans*=exp(-extinction);
  }
  return sum;
}
float starCluster(vec2 uv,float density,float threshold) {
  vec2 p=uv*density;
  vec2 g=floor(p);
  vec2 f=fract(p)-.5;
  float total=.0;
  for(int y=-1;y<=1;y++) {
    for(int x=-1;x<=1;x++) {
      vec2 offset=vec2(float(x),float(y));
      vec2 cell=g+offset;
      float h=hash12(cell);
      vec2 star=hash22(cell)-.5+offset;
      float bright=step(threshold,h);
      float d=length(f-star);
      total+=bright*.006/(d*d+.00045);
    }
  }
  return min(3.0,total);
}
vec3 starTint(vec2 uv,float scale) {
  float noise=valueNoise(uv*scale);
  return mix(vec3(.32,.6,1.0),vec3(1.0,.4,.52),noise);
}
vec3 rotatingArms(vec2 uv) {
  vec2 p=rotate2(uv,u_time*.003+u_camera.x*.06);
  p*=1.1/max(.5,u_camera.z);
  float r=length(p);
  float hue=atan(p.y,p.x);
  float arm=0.0;
  for(int i=0;i<5;i++) {
    arm+=spiralArm(p,float(i),u_time);
  }
  float dust=fbm2(p*5.0+vec2(0.0,u_time*.01));
  float filaments=pow(ridgedFbm(vec3(p*6.0,u_time*.016)),2.0);
  float center=exp(-r*r*24.0);
  float falloff=exp(-r*1.8);
  vec3 color=palette(hue/TAU,vec3(.3,.07,.17),vec3(.2,.11,.2),vec3(1.0),vec3(.05,.14,.31));
  color+=vec3(.6,.015,.16);
  vec3 light=arm*falloff*(dust*.57+filaments*.35)*color;
  light+=center*vec3(2.6,1.15,.47);
  light+=ringDisk(vec3(p,0),.23,.095)*vec3(.3,.02,.06);
  return light;
}
vec3 renderWorld(vec2 uv) {
  vec2 p=uv;
  p+=vec2(u_pointer.x,-u_pointer.y)*.12;
  vec3 stars=backgroundStars(p);
  vec2 q=rotate2(p,u_camera.x*.10-u_time*.003);
  q.y/=max(.20,cos(u_camera.y*.55));
  vec3 dust=rotatingArms(q);
  vec3 ro=vec3(0.0,0.0,-3.8);
  vec3 rd=normalize(vec3(q*.85,1.7));
  vec3 volumetric=galaxyDust(ro,rd);
  float center=exp(-dot(q,q)*25.0);
  float active=1.0+.08*sin(u_time*.75);
  float deep=starCluster(p+vec2(u_camera.x*.08,u_camera.y*.08),24.0,.94);
  float outer=starCluster(p*1.6+17.1,48.0,.986);
  vec3 sparkle=(deep*.42+outer*.24)*starTint(p,7.0);
  vec3 lens=vec3(1.0,.68,.35)*center*(2.0+u_audio*1.7);
  float halo=.008/(dot(q,q)+.012);
  vec3 color=stars+dust*.7+volumetric*.64+sparkle+halo*vec3(.4,.11,.14)+lens;
  float wisps=fbm2(q*7.0+vec2(u_time*.018,0.0));
  color+=vec3(.27,.02,.17)*pow(wisps,4.0)*exp(-length(q)*1.0)*.26;
  color*=active;
  color=applyAtmosphere(color,p,.65);
  return color;
}
`;
