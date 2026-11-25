/** Procedural planets with visible atmospheres, orbits, bands and a ring system. */
export const planets = `
vec3 planetAlbedo(vec3 normal,float style,float time) {
  float longitude=atan(normal.z,normal.x);
  float latitude=asin(normal.y);
  float belts=sin(latitude*21.0+sin(longitude*3.0+time*.02)*1.8);
  float swirl=fbm3(normal*6.0+vec3(0.0,time*.006,0.0));
  float ridges=ridgedFbm(normal*9.0);
  vec3 earthy=mix(vec3(.1,.22,.31),vec3(.49,.26,.16),smoothstep(.40,.68,swirl));
  earthy=mix(earthy,vec3(.76,.7,.48),smoothstep(.56,.68,ridges)*.5);
  vec3 gas=mix(vec3(.31,.13,.12),vec3(.9,.56,.37),belts*.5+.5);
  gas*=.9+swirl*.25;
  vec3 ice=mix(vec3(.015,.23,.46),vec3(.24,.8,1.0),swirl);
  vec3 lava=mix(vec3(.12,.016,.025),vec3(2.0,.17,.035),smoothstep(.47,.61,swirl));
  if(style<.5) return earthy;
  if(style<1.5) return gas;
  if(style<2.5) return ice;
  if(style<3.5) return lava;
  return mix(gas,vec3(.75,.69,.31),.42);
}
float planetClouds(vec3 n,float t) {
  vec3 p=n*8.0+vec3(t*.014,0.0,t*.009);
  float n1=fbm3(p);
  float n2=ridgedFbm(p*1.9);
  return smoothstep(.48,.65,n1+n2*.16);
}
float planetAtmosphere(vec2 uv,vec2 center,float radius) {
  float d=length(uv-center);
  float outer=exp(-abs(d-radius)*40.0)*.5;
  float haze=exp(-abs(d-radius)*12.0)*.22;
  return outer+haze;
}
vec3 renderPlanet(vec2 uv,vec2 center,float radius,float style,vec3 sunDir) {
  vec2 p=(uv-center)/radius;
  float r2=dot(p,p);
  if(r2>1.0) return vec3(0.0);
  vec3 n=normalize(vec3(p,sqrt(max(0.0,1.0-r2))));
  vec3 orbitN=rotateY(u_time*.055+style*.6)*n;
  vec3 albedo=planetAlbedo(orbitN,style,u_time);
  float diffuse=max(.05,dot(n,sunDir));
  float limb=fresnel(n.z,3.0);
  float cloud=planetClouds(orbitN,u_time);
  if(style<.5)albedo=mix(albedo,vec3(.86,.9,.95),cloud*.61);
  float terminator=smoothstep(-.13,.48,dot(n,sunDir));
  float twilight=exp(-abs(dot(n,sunDir))/.11)*.16;
  vec3 lit=albedo*(diffuse*.9+.07)*terminator;
  vec3 nightside=albedo*.035+vec3(.02,.04,.06)*twilight;
  vec3 atmos=style<1.5?vec3(.08,.48,.85):style<3.5?vec3(.15,.65,1.0):vec3(.9,.45,.22);
  return mix(nightside,lit,terminator)+atmos*limb*.42;
}
float orbitArc(vec2 uv,vec2 center,float radius,float thickness) {
  vec2 p=uv-center;
  float ellipse=length(vec2(p.x,p.y*2.6));
  float noise=sin(atan(p.y,p.x)*19.0+u_time*.1)*.0007;
  return 1.0-smoothstep(thickness*.1,thickness,abs(ellipse-radius+noise));
}
vec3 planetRing(vec2 p,vec2 center,float radius,float phase) {
  vec2 q=p-center;
  q=rotate2(q,.27+sin(u_time*.02)*.03);
  float r=length(vec2(q.x,q.y*3.5));
  float band=smoothPulse(radius*.96,radius*1.06,radius*1.7,radius*1.78,r);
  float stripe=sin(r*145.0+phase)*.5+.5;
  return vec3(.84,.53,.32)*band*(.2+.8*stripe);
}
vec3 surfaceLight(vec2 uv,vec2 center,float radius,float style,vec3 sunDir) {
  vec3 result=vec3(0.0);
  float d=length(uv-center);
  vec3 tint=style<.5?vec3(.18,.5,.9):style<1.5?vec3(1.0,.51,.3):style<2.5?vec3(.2,.7,1.0):style<3.5?vec3(1.0,.18,.06):vec3(1.0,.75,.31);
  result+=tint*planetAtmosphere(uv,center,radius)*.35;
  result+=tint*.003/(max(.003,abs(d-radius)+.01));
  result+=renderPlanet(uv,center,radius,style,sunDir);
  return result;
}
vec3 renderWorld(vec2 uv) {
  vec2 p=rotate2(uv,u_camera.x*.13);
  p.y+=u_camera.y*.19;
  p/=max(.55,u_camera.z);
  vec3 base=backgroundStars(p);
  float horizon=exp(-abs(p.y+.15)*4.0)*.08;
  base+=vec3(.08,.02,.11)*horizon;
  vec3 sunDirection=normalize(vec3(-.53,.38,1.0));
  float t=u_time*.045;
  vec2 centers[5];
  centers[0]=vec2(-.45,.20)+vec2(sin(t*.8),cos(t*.8))*.016;
  centers[1]=vec2(.23,.13)+vec2(cos(t*.4),sin(t*.4))*.021;
  centers[2]=vec2(-.13,-.32)+vec2(sin(t*.9),cos(t*.9))*.013;
  centers[3]=vec2(.67,-.17)+vec2(cos(t*.6),sin(t*.6))*.012;
  centers[4]=vec2(-.72,-.32)+vec2(sin(t*.3),cos(t*.3))*.01;
  float radii[5];
  radii[0]=.38;
  radii[1]=.16;
  radii[2]=.095;
  radii[3]=.083;
  radii[4]=.066;
  for(int i=0;i<5;i++) {
    float n=float(i);
    base+=vec3(.10,.04,.07)*orbitArc(p,vec2(0.0),.23+n*.18,.0019);
  }
  // Sort visually from smaller distant planets to the foreground giant.
  for(int i=4;i>=0;i--) {
    float n=float(i);
    if(i==0) base+=planetRing(p,centers[0],radii[0],t);
    base+=surfaceLight(p,centers[i],radii[i],n,sunDirection);
  }
  float sunD=length(p-vec2(-.95,.77));
  base+=vec3(1.0,.45,.11)*(.025/(sunD*sunD+.055));
  base+=vec3(1.0,.73,.3)*exp(-sunD*sunD*18.0)*.58;
  float spaceDust=pow(fbm2(p*5.0+3.0),4.0)*.02;
  base+=vec3(.38,.09,.16)*spaceDust;
  return base;
}
`;
