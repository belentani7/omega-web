/** Spectral ocean with analytical Gerstner waves and physically motivated Fresnel. */
export const ocean = `
vec3 oceanSky(vec3 ray) {
  float horizon=smoothstep(-.18,.45,ray.y);
  vec3 night=vec3(.001,.014,.033);
  vec3 dusk=vec3(.12,.02,.085);
  vec3 azure=vec3(.015,.08,.17);
  vec3 base=mix(dusk,azure,horizon);
  float horizonLight=exp(-abs(ray.y)*22.0);
  base+=vec3(.16,.065,.1)*horizonLight;
  vec3 star=backgroundStars(vec2(ray.x,ray.y));
  base+=star*(.4+.6*horizon);
  vec3 moonDir=normalize(vec3(-.4,.19,1.0));
  float moon=pow(max(0.0,dot(ray,moonDir)),1550.0);
  float moonHalo=pow(max(0.0,dot(ray,moonDir)),26.0);
  base+=vec3(1.2,.9,.8)*moon+vec3(.28,.37,.52)*moonHalo;
  return base;
}
float intersectionWave(vec3 ro,vec3 rd) {
  float t=max(.001,-ro.y/min(-.001,rd.y));
  for(int i=0;i<6;i++) {
    vec3 p=ro+rd*t;
    float terrain=waveHeight(p.xz);
    float denom=rd.y;
    if(abs(denom)<.002)break;
    t+=(terrain-p.y)/denom;
  }
  return t>0.0?t:-1.0;
}
vec3 oceanWater(vec3 p,vec3 rd) {
  vec3 n=waveNormal(p.xz);
  vec3 light=normalize(vec3(-.48,.55,.72));
  float NoV=abs(dot(n,-rd));
  float fres=fresnel(NoV,5.0);
  vec3 deep=vec3(.003,.043,.064);
  vec3 shallow=vec3(.015,.18,.23);
  float shallowFactor=smoothstep(-.24,.30,n.y);
  vec3 water=mix(deep,shallow,shallowFactor);
  vec3 reflection=oceanSky(reflect(rd,n));
  vec3 diffuse=shadePBR(n,-rd,light,water,.35,.12);
  vec3 color=mix(water,reflection,.07+fres*.85)+diffuse*.7;
  float ripples=ridgedFbm(vec3(p.xz*.85,u_time*.03));
  float foam=smoothstep(.57,.78,ripples);
  color+=vec3(.15,.34,.4)*foam*.08;
  float moonPath=pow(max(0.0,dot(reflect(rd,n),light)),35.0);
  color+=vec3(.23,.48,.59)*moonPath;
  float trough=smoothstep(.07,.23,abs(waveHeight(p.xz)));
  color+=vec3(.02,.06,.11)*trough*.13;
  return color;
}
vec3 underwater(vec2 uv) {
  vec3 color=vec3(.003,.015,.042);
  vec2 p=uv;
  float rays=sin(p.x*14.0+sin(p.y*3.0+u_time*.3));
  rays=pow(max(0.0,rays),5.0);
  color+=vec3(.01,.08,.13)*rays*.08;
  float floaters=starLayers(p+vec2(u_time*.003,0.0),9.0);
  color+=vec3(.09,.27,.4)*floaters*.14;
  return color;
}
vec3 renderWorld(vec2 uv) {
  vec2 p=uv;
  p=rotate2(p,u_camera.x*.05);
  p.y+=u_camera.y*.15;
  p.y+=.04;
  vec3 ro=vec3(0.0,1.2,-1.0-u_camera.z*.3);
  vec3 rd=normalize(vec3(p.x,p.y-.10,1.1));
  rd=rotateY(u_camera.x*.24)*rd;
  float skyAmount=smoothstep(-.04,.015,rd.y);
  vec3 sky=oceanSky(rd);
  float hit=intersectionWave(ro,rd);
  if(hit<0.0)return sky;
  vec3 position=ro+rd*hit;
  vec3 water=oceanWater(position,rd);
  float distanceFog=1.0-exp(-hit*.022);
  water=mix(water,sky*.58,distanceFog);
  float horizonalGlow=exp(-abs(p.y+.1)*13.0);
  water+=vec3(.1,.03,.07)*horizonalGlow*.16;
  float waveLight=pow(max(0.0,waveNormal(position.xz).y),9.0);
  water+=vec3(.08,.17,.26)*waveLight*.025;
  return water;
}
`;
