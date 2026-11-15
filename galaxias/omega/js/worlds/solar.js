/** Schematic solar RTS: star, orbital tracks, phases, satellites and selection. */
export const solar = `
vec2 orbitPosition(float semiMajor,float eccentricity,float angle) {
  float r=semiMajor*(1.0-eccentricity*eccentricity)/(1.0+eccentricity*cos(angle));
  return vec2(r*cos(angle),r*sin(angle)*.52);
}
float orbitalTrack(vec2 p,float radius,float eccentricity) {
  float a=atan(p.y*1.92,p.x);
  vec2 q=orbitPosition(radius,eccentricity,a);
  float d=length(p-q);
  return exp(-d*210.0)*.4+exp(-d*36.0)*.04;
}
float orbitalSatellite(vec2 p,vec2 center,float radius,float time,float phase) {
  vec2 q=p-center;
  float orbit=length(vec2(q.x,q.y*1.7));
  float ring=exp(-abs(orbit-radius)*140.0)*.13;
  vec2 moon=center+vec2(cos(time+phase),sin(time+phase)/1.7)*radius;
  float d=length(p-moon);
  return ring+.003/(d*d+.0001);
}
vec3 sunSurface(vec2 p) {
  float r=length(p);
  float star=1.0-smoothstep(.07,.082,r);
  float corona=.012/(r*r+.007);
  float filaments=fbm2(p*24.0+vec2(u_time*.09,0.0));
  float rays=(sin(atan(p.y,p.x)*22.0+u_time*.2)*.5+.5);
  float limb=exp(-abs(r-.078)*90.0);
  vec3 col=vec3(1.9,1.02,.36)*star;
  col+=vec3(1.8,.39,.14)*corona*.35;
  col+=vec3(1.0,.65,.23)*limb*.38;
  col+=vec3(.85,.21,.07)*filaments*star*.4;
  col+=vec3(.75,.2,.07)*rays*exp(-r*7.0)*.18;
  return col;
}
vec3 renderOrbitalBody(vec2 p,vec2 center,float radius,float index) {
  vec2 q=(p-center)/radius;
  float r2=dot(q,q);
  if(r2>=1.0) {
    float haze=exp(-abs(sqrt(r2)-1.0)*25.0)*.016;
    return vec3(.2,.38,.65)*haze;
  }
  vec3 normal=normalize(vec3(q,sqrt(1.0-r2)));
  float n=fbm3(normal*9.0+vec3(u_time*.01));
  float contrast=smoothstep(.35,.7,n);
  vec3 rock=mix(vec3(.19,.14,.16),vec3(.66,.46,.28),contrast);
  vec3 ice=mix(vec3(.06,.12,.25),vec3(.5,.65,.83),contrast);
  vec3 red=mix(vec3(.24,.025,.04),vec3(.85,.21,.11),contrast);
  vec3 planet=index<2.0?rock:index<4.0?ice:red;
  vec3 light=normalize(vec3(-center,.65));
  float diffuse=max(.1,dot(normal,light));
  float limb=fresnel(normal.z,4.0);
  return planet*diffuse+planet*limb*.24;
}
vec3 solarHud(vec2 p) {
  float ax=abs(p.x),ay=abs(p.y);
  float topLine=exp(-abs(p.y-.66)*440.0)*smoothPulse(.1,.15,.9,1.0,ax);
  float bottomLine=exp(-abs(p.y+.66)*440.0)*smoothPulse(.1,.15,.9,1.0,ax);
  float leftLine=exp(-abs(p.x+.94)*440.0)*smoothPulse(.1,.15,.61,.7,ay);
  float rightLine=exp(-abs(p.x-.94)*440.0)*smoothPulse(.1,.15,.61,.7,ay);
  float gridX=exp(-abs(fract(p.x*12.0+.5)-.5)*110.0)*.025;
  float gridY=exp(-abs(fract(p.y*12.0+.5)-.5)*110.0)*.025;
  return vec3(.08,.31,.4)*(topLine+bottomLine+leftLine+rightLine+gridX+gridY);
}
vec3 renderWorld(vec2 uv) {
  vec2 p=rotate2(uv,u_camera.x*.06);
  p.y+=u_camera.y*.15;
  p/=max(.55,u_camera.z);
  vec3 color=backgroundStars(p)*.68;
  color+=solarHud(p);
  vec2 center=vec2(0.0);
  float t=u_time*.05;
  for(int i=0;i<7;i++) {
    float n=float(i);
    float radius=.18+n*.117;
    float eccentricity=.04+float(mod(n,3.0))*.026;
    float track=orbitalTrack(p,radius,eccentricity);
    color+=vec3(.12,.32,.39)*track;
    float angularVelocity=(1.0/(radius*radius))*.022;
    float angle=t*angularVelocity+n*2.39996;
    vec2 q=orbitPosition(radius,eccentricity,angle);
    float bodyRadius=.012+n*.0017;
    color+=renderOrbitalBody(p,q,bodyRadius,n);
    float disk=length(p-q);
    float halo=.00017/(disk*disk+.00015);
    color+=vec3(.2,.3,.4)*halo*.13;
    if(i==3) color+=vec3(.32,.4,.67)*orbitalSatellite(p,q,.031,t*.5,2.0)*.035;
  }
  color+=sunSurface(p);
  vec2 line=vec2(sin(u_time*.09)*.36,cos(u_time*.07)*.27);
  float scan=exp(-abs(length(p-line)-.023)*22.0);
  color+=vec3(.08,.28,.34)*scan*.09;
  float nebula=fbm2(p*2.4+vec2(u_time*.004,0.0));
  color+=vec3(.11,.02,.06)*pow(nebula,3.0)*.08;
  return color;
}
`;
