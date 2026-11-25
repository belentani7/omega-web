/** A polar sky with procedural auroral curtains, arcs and atmospheric horizon. */
export const aurora = `
vec3 atmosphere(vec2 p) {
  float altitude=p.y+.35;
  float h=sat(altitude*2.2+.25);
  vec3 deep=vec3(.002,.005,.034);
  vec3 night=vec3(.012,.018,.058);
  vec3 bottom=vec3(.07,.018,.06);
  vec3 base=mix(bottom,deep,smoothstep(-.6,.3,altitude));
  float haze=exp(-abs(altitude)*8.0);
  base+=vec3(.08,.04,.085)*haze;
  base+=vec3(.01,.02,.045)*pow(h,3.0);
  return base;
}
float auroraCurtain(vec2 p,float phase) {
  float x=p.x;
  float y=p.y;
  float sway=sin(x*1.5+u_time*.075+phase)*.16;
  sway+=sin(x*4.3-u_time*.041+phase)*.055;
  sway+=sin(x*13.7+phase*1.7+u_time*.1)*.018;
  float curtainCenter=.13+sway;
  float vertical=smoothstep(-.42,curtainCenter,y)*(1.0-smoothstep(.58,.97,y));
  float ribbon=fbm2(vec2(x*2.2+phase*.3,y*.8+u_time*.02));
  float bands=sin(x*25.0+sin(y*9.0+u_time*.11)*1.6+phase*7.0);
  float finely=sin(x*81.0+phase*11.0+u_time*.17);
  float intensity=(.45+.5*ribbon)*(.65+.25*bands+.1*finely);
  float lower=smoothstep(curtainCenter-.16,curtainCenter+.12,y);
  float heightShape=exp(-sqr((y-curtainCenter-.28)*1.7));
  return vertical*intensity*lower*heightShape;
}
float arcGlow(vec2 p,float phase) {
  float y=p.y+.1;
  float ribbon=sin(p.x*2.2+phase+u_time*.05)*.22;
  float d=abs(y-ribbon-.31);
  return exp(-d*15.0);
}
vec3 auroraColor(vec2 p,float phase) {
  float t=sat((p.y+.25)*1.2);
  vec3 green=vec3(.025,.72,.27);
  vec3 cyan=vec3(.05,.4,.8);
  vec3 purple=vec3(.28,.05,.61);
  vec3 pink=vec3(.65,.12,.39);
  vec3 color=mix(green,cyan,smoothstep(.13,.47,t));
  color=mix(color,purple,smoothstep(.4,.69,t));
  color=mix(color,pink,smoothstep(.66,.94,t));
  color*=mix(.65,1.45,valueNoise(p*4.0+phase));
  return color;
}
vec3 mountainSurface(vec2 p) {
  float detail=fbm2(p*9.0);
  float ridge=.14+sin(p.x*2.1+2.3)*.08;
  ridge+=sin(p.x*5.3)*.045+sin(p.x*13.0)*.01;
  ridge+=detail*.04;
  float silhouette=1.0-smoothstep(ridge-.01,ridge+.01,-p.y);
  vec3 dark=vec3(.002,.005,.014);
  float rocks=ridgedFbm(vec3(p*5.0,1.0));
  dark+=vec3(.015,.026,.039)*rocks*.18;
  return dark*silhouette;
}
vec3 snowGlint(vec2 p) {
  float ridge=.12+sin(p.x*4.2)*.025;
  float dust=smoothstep(.53,.64,fbm2(p*23.0));
  float glint=dust*exp(-abs(p.y+ridge)*24.0);
  return vec3(.1,.2,.28)*glint*.2;
}
vec3 renderWorld(vec2 uv) {
  vec2 p=uv;
  p=rotate2(p,u_camera.x*.055);
  p.y+=u_camera.y*.12;
  p/=max(.58,u_camera.z);
  vec3 sky=atmosphere(p);
  sky+=backgroundStars(p)*.8;
  // Layers shift at different rates to produce parallax under free flight.
  for(int i=0;i<5;i++) {
    float phase=float(i)*2.13;
    vec2 q=p;
    q.x+=sin(phase*1.7)*.26;
    q.y+=float(i)*.025;
    q.x*=1.0+float(i)*.15;
    float density=auroraCurtain(q,phase);
    float arc=arcGlow(q,phase);
    vec3 tint=auroraColor(q,phase);
    sky+=tint*density*(.46-float(i)*.045);
    sky+=tint*arc*.016;
  }
  float horizon=exp(-abs(p.y+.31)*10.0);
  sky+=vec3(.16,.07,.15)*horizon*.32;
  float ground=1.0-smoothstep(.01,.06,p.y+.36);
  vec3 distant=vec3(.004,.006,.017);
  distant+=vec3(.01,.017,.025)*ridgedFbm(vec3(p*3.0,0.0));
  sky=mix(sky,distant,ground);
  sky+=snowGlint(p);
  sky+=mountainSurface(p)*.8;
  return sky;
}
`;
