/** Black-hole event horizon, redshifted accretion disk and lens approximation. */
export const blackhole = `
float angularDistance(float a,float b) {
  float d=mod(abs(a-b),TAU);
  return min(d,TAU-d);
}
float diskDetail(vec2 position) {
  float angle=atan(position.y,position.x);
  float radius=length(position);
  float stripes=sin(angle*17.0+radius*43.0-u_time*1.3);
  float turbulence=fbm2(position*7.0+vec2(u_time*.04,0.0));
  return .44+stripes*.18+turbulence*.47;
}
vec3 diskEmission(vec2 p,float inclination) {
  vec2 q=rotate2(p,.25+u_camera.x*.1);
  q.y/=inclination;
  float radius=length(q);
  float disk=smoothPulse(.22,.33,1.07,1.35,radius);
  float a=atan(q.y,q.x);
  float swirl=sin(a*15.0-radius*39.0+u_time*.42);
  float noise=fbm2(q*10.0+vec2(u_time*.15,0.0));
  float grain=fbm2(q*49.0-u_time*.12);
  float breakup=smoothstep(.24,.75,noise+swirl*.2);
  float emissivity=disk*breakup*mix(.5,1.0,grain);
  float temperature=sat(1.1-radius*.79);
  vec3 cold=vec3(.54,.02,.09);
  vec3 warm=vec3(1.65,.3,.05);
  vec3 hot=vec3(2.0,1.48,.57);
  vec3 color=mix(cold,warm,smoothstep(.12,.64,temperature));
  color=mix(color,hot,smoothstep(.62,.98,temperature));
  float doppler=smoothstep(-.65,.65,sin(a+u_time*.021));
  color*=mix(.53,1.75,doppler);
  return color*emissivity;
}
vec2 lensDistortion(vec2 p,float radius) {
  float r=length(p);
  float influence=.035/(r*r+.018);
  float bending=sat(influence)*radius;
  return p+normalize(p+vec2(.0001))*bending;
}
float photonRing(vec2 p,float r) {
  float d=abs(length(p)-r);
  return exp(-d*125.0)*1.3+exp(-d*35.0)*.28;
}
float blackDiskMask(vec2 p,float radius) {
  float d=length(p);
  return 1.0-smoothstep(radius*.92,radius*1.07,d);
}
float gravitionalHalo(vec2 p) {
  float d=length(p);
  float flux=.003/(d*d+.01);
  return flux*(1.0-smoothstep(.2,1.4,d));
}
vec3 verticalJet(vec2 p,float t) {
  float core=exp(-abs(p.x)*24.0)*exp(-abs(p.y)*1.3);
  float outward=exp(-abs(p.x)*8.0)*exp(-abs(p.y)*.64);
  float stream=fbm2(vec2(p.x*19.0+t*.12,p.y*8.0));
  float direction=sin(p.y*13.0+t)*.5+.5;
  return vec3(.35,.21,.67)*(core*.35+outward*stream*.2)*direction;
}
vec3 gravitationalLensing(vec2 uv) {
  vec2 p=lensDistortion(uv,.34);
  vec3 bg=backgroundStars(p*1.3);
  float band=exp(-abs(length(p)-.24)*6.0);
  bg+=vec3(.09,.013,.025)*band;
  return bg;
}
vec3 renderWorld(vec2 uv) {
  vec2 p=uv;
  p+=u_pointer*.035;
  p=rotate2(p,u_camera.x*.09);
  p.y+=u_camera.y*.09;
  p/=max(.55,u_camera.z);
  float r=length(p);
  vec3 background=gravitationalLensing(p);
  float inclination=.26+abs(sin(u_camera.y*.49))*.13;
  vec3 disk=diskEmission(p,inclination);
  // Rear lensed accretion arc extends above the central event horizon.
  float behind=photonRing(vec2(p.x,p.y*.85),.25);
  float rearMask=smoothstep(-.3,.16,p.y);
  disk+=vec3(1.0,.44,.17)*behind*rearMask*.5;
  float horizon=blackDiskMask(p,.225);
  disk*=1.0-horizon;
  float photon=photonRing(p,.228);
  float halo=gravitionalHalo(p);
  vec3 color=background+disk;
  color+=vec3(1.8,.68,.22)*photon*.8;
  color+=vec3(.62,.08,.13)*halo*.26;
  color+=verticalJet(p,u_time)*(1.0-horizon*.7);
  color=mix(color,vec3(.0,.0005,.001),horizon);
  // Lensing differentiates black-hole presence from a flat circular cutout.
  float caustic=exp(-abs(r-.3)*60.0);
  color+=vec3(.52,.12,.14)*caustic*.11;
  float dust=fbm2(p*4.0+vec2(3.0,u_time*.003));
  color+=vec3(.07,.005,.025)*dust*exp(-r*1.5);
  return color;
}
`;
