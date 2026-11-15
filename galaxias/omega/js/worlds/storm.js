/** Rain, stratified clouds, moving storm cells and deterministic lightning. */
export const storm = `
float stormCloud(vec2 p) {
  vec2 drift=vec2(u_time*.032,-u_time*.009);
  float n=fbm2(p*2.2+drift);
  float d=ridgedFbm(vec3(p*5.0,u_time*.017));
  return smoothstep(.22,.69,n+d*.19);
}
vec3 stormSky(vec2 p) {
  vec3 top=vec3(.008,.009,.024);
  vec3 bottom=vec3(.052,.036,.063);
  vec3 color=mix(bottom,top,smoothstep(-.4,.7,p.y));
  float cloud=stormCloud(p);
  float highCloud=stormCloud(p*1.8+vec2(9.0,4.0));
  color+=vec3(.075,.065,.1)*cloud*.5;
  color+=vec3(.045,.034,.065)*highCloud*.3;
  float horizon=exp(-abs(p.y+.42)*8.0);
  color+=vec3(.12,.025,.055)*horizon*.32;
  return color;
}
float rainStreak(vec2 uv,float level,float t) {
  vec2 p=uv;
  p*=vec2(95.0+level*35.0,30.0+level*55.0);
  p.x+=p.y*.21;
  p.y+=t*(3.0+level*3.0);
  vec2 tile=floor(p);
  vec2 cell=fract(p)-.5;
  float random=hash12(tile+level*16.0);
  float left=hash12(vec2(tile.x,0.0)+level*43.0);
  float x=cell.x-(left-.5)*.65;
  float y=cell.y;
  float probability=step(.76,random);
  float shape=exp(-abs(x)*36.0)*exp(-abs(y)*1.8);
  float fall=smoothstep(-.45,-.22,y)*(1.0-smoothstep(.27,.48,y));
  return probability*shape*fall;
}
vec3 rainLayers(vec2 p,float t) {
  float foreground=rainStreak(p,0.0,t);
  float middle=rainStreak(p*.83+.4,1.0,t*.77);
  float distant=rainStreak(p*.63+1.8,2.0,t*.62);
  vec3 color=vec3(.39,.43,.57)*(foreground*.12+middle*.09+distant*.06);
  color+=vec3(.27,.27,.4)*foreground*foreground*.2;
  return color;
}
float bolt(vec2 p,float strike,float seed) {
  float y=p.y;
  float crooked=fbm2(vec2(y*7.0+seed*.4,floor(strike)))*.26;
  crooked+=(valueNoise(vec2(y*32.0,seed))-.5)*.065;
  float channel=abs(p.x-crooked);
  float main=exp(-channel*305.0);
  float bloom=exp(-channel*41.0)*.27;
  float branches=abs(p.x-crooked-sin(y*19.0+seed)*.18);
  float branching=exp(-branches*180.0)*.22;
  float vertical=smoothstep(-.5,-.1,y)*(1.0-smoothstep(.48,.76,y));
  return (main+bloom+branching)*vertical;
}
float lightningPulse(float t) {
  float segment=floor(t*.52);
  float rng=hash11(segment+19.0);
  float event=step(.78,rng);
  float elapsed=fract(t*.52);
  float flash=exp(-elapsed*35.0)+.45*exp(-abs(elapsed-.13)*65.0);
  return event*flash;
}
vec3 land(vec2 p) {
  float ridge=-.43+sin(p.x*2.6+1.1)*.034+sin(p.x*6.3)*.019;
  ridge+=fbm2(p*8.0)*.02;
  float terrain=1.0-smoothstep(ridge-.018,ridge+.01,p.y);
  vec3 mountains=vec3(.003,.004,.012);
  mountains+=vec3(.015,.011,.02)*ridgedFbm(vec3(p*17.0,0.0));
  return mountains*terrain;
}
vec3 renderWorld(vec2 uv) {
  vec2 p=uv;
  p=rotate2(p,u_camera.x*.035);
  p.y+=u_camera.y*.14;
  p/=max(.56,u_camera.z);
  float t=u_time;
  vec3 sky=stormSky(p);
  float flash=lightningPulse(t);
  float center=hash11(floor(t*.52)+17.0)*1.5-.7;
  float boltShape=bolt(p-vec2(center,.1),t,center);
  vec3 lavender=vec3(.64,.62,1.0);
  sky+=lavender*boltShape*flash*2.8;
  sky+=vec3(.19,.18,.36)*flash*.6;
  sky+=rainLayers(p,t);
  vec3 ground=land(p);
  sky+=ground;
  float sheet=fbm2(vec2(p.x*13.0+u_time*.18,p.y*8.0));
  float sheetOpacity=smoothstep(.7,.92,sheet)*.09;
  sky=mix(sky,vec3(.06,.06,.1),sheetOpacity);
  float redPulse=exp(-abs(p.y+.35)*15.0)*(.08+.12*sin(t*.5));
  sky+=vec3(.42,.015,.07)*redPulse;
  return sky;
}
`;
