/** Bounded volumetric raymarch over a stratified cloud deck and sunlight. */
export const clouds = `
float cloudField(vec3 p) {
  vec3 wind=vec3(u_time*.026,0.0,u_time*.012);
  float n=fbm3(p*.37+wind);
  float ridged=ridgedFbm(p*.92+wind*.4);
  float base=smoothstep(.37,.68,n+ridged*.21);
  float strata=smoothstep(.2,.35,p.y)*(1.0-smoothstep(2.7,3.2,p.y));
  return base*strata;
}
float cloudShadow(vec3 origin,vec3 dir) {
  float transmittance=1.0;
  for(int i=0;i<9;i++) {
    if(float(i)>mix(4.0,8.0,u_quality)) break;
    vec3 p=origin+dir*(.16+float(i)*.28);
    float density=cloudField(p);
    transmittance*=exp(-density*.48);
  }
  return transmittance;
}
vec3 cloudPhaseColor(vec3 position,vec3 lightDir,float density,float shadow) {
  float height=sat(position.y/3.2);
  float warm=sat(1.0-position.y*.25);
  vec3 color=mix(vec3(.16,.16,.29),vec3(.47,.39,.48),height);
  color+=vec3(.33,.25,.24)*warm;
  float forward=pow(sat(dot(normalize(position),lightDir)),5.0);
  color+=vec3(.9,.63,.37)*forward*.22;
  color=mix(color,vec3(.92,.74,.72),shadow*.64);
  return color*density;
}
vec3 cloudBackground(vec2 uv) {
  float h=sat(uv.y*1.3+.6);
  vec3 sky=mix(vec3(.21,.08,.16),vec3(.017,.024,.082),h);
  sky+=vec3(.3,.12,.16)*exp(-abs(uv.y+.2)*8.0)*.45;
  float r=length(uv-vec2(-.52,.26));
  sky+=vec3(1.3,.46,.32)*.034/(r*r+.03);
  sky+=backgroundStars(uv)*smoothstep(-.2,.37,uv.y)*.55;
  return sky;
}
vec3 renderClouds(vec3 ro,vec3 rd) {
  vec3 total=vec3(0.0);
  vec3 light=normalize(vec3(-.35,.65,.52));
  float transmission=1.0;
  float jitter=hash12(gl_FragCoord.xy+u_frame*.11);
  float sampleStep=.18;
  for(int i=0;i<54;i++) {
    if(float(i)>mix(18.0,53.0,u_quality)) break;
    float t=(float(i)+jitter)*sampleStep;
    vec3 p=ro+rd*t;
    float density=cloudField(p);
    if(density>.014) {
      float nearby=cloudField(p+light*.11);
      float localShade=sat(1.0-(nearby-density)*2.2);
      float shadow=cloudShadow(p,light);
      vec3 contribution=cloudPhaseColor(p,light,density,shadow*localShade);
      float alpha=1.0-exp(-density*.18);
      total+=contribution*transmission*alpha*1.9;
      transmission*=1.0-alpha;
    }
  }
  vec2 projected=rd.xy;
  vec3 bg=cloudBackground(projected);
  total+=bg*transmission;
  return total;
}
float silverLining(vec2 p) {
  float noise=fbm2(p*3.4+vec2(u_time*.015,-u_time*.014));
  float stripe=smoothstep(.55,.61,noise)*(1.0-smoothstep(.65,.75,noise));
  return stripe*exp(-abs(p.y-.04)*2.0);
}
vec3 renderWorld(vec2 uv) {
  vec2 p=uv;
  p+=u_pointer*.028;
  p/=max(.6,u_camera.z);
  vec3 ro=vec3(0.0,1.2,-4.5);
  vec3 rd=cameraRay(p);
  rd=rotateY(u_camera.x*.2)*rotateX(u_camera.y*.22)*rd;
  vec3 volumetric=renderClouds(ro,rd);
  vec3 cloudHalo=vec3(.73,.47,.53)*silverLining(p)*.28;
  float sunDist=length(p-vec2(-.5,.35));
  vec3 sunlight=vec3(1.0,.65,.37)*exp(-sunDist*sunDist*16.0)*.3;
  vec3 color=volumetric+cloudHalo+sunlight;
  color=mix(color,vec3(.025,.014,.033),smoothstep(.65,1.5,length(p))*.35);
  return color;
}
`;
