import { Container, Sprite } from 'pixi.js';
import { BaseScene } from './BaseScene.js';
import { PotionSmoke } from '../objects/PotionSmoke.js';
import { PotionBeams } from '../objects/PotionBeams.js';

export class PotionScene extends BaseScene {
  constructor(textures) {
    super('potion'); this.textures=textures; this.soundscape=null;
    const composition=new Container();
    const left=new Sprite(textures.rIdle), right=new Sprite(textures.iIdle);
    const cauldronBack=new Sprite(textures.cauldron), cauldronFront=new Sprite(textures.cauldronBottom);
    [left,right,cauldronBack,cauldronFront].forEach(s=>s.anchor.set(.5));
    left.position.set(540,620); right.position.set(1380,620); cauldronBack.position.set(960,760); cauldronFront.position.set(960,760);
    left.scale.set(.78); right.scale.set(.78); cauldronBack.scale.set(.72); cauldronFront.scale.set(.72);
    this.smoke=new PotionSmoke(textures,{reducedMotion:matchMedia('(prefers-reduced-motion: reduce)').matches});
    this.smoke.position.set(960,690); this.smoke.scale.set(1.18); this.beams=new PotionBeams();
    composition.addChild(left,right,cauldronBack); this.addChild(composition,this.beams,this.smoke,cauldronFront);
    this.composition=composition; this.left=left; this.right=right; this.cauldron=cauldronBack; this.cauldronFront=cauldronFront;
    this.timers=[];
  }
  setSoundscape(soundscape){this.soundscape=soundscape;}
  async enter(context={}){await super.enter(context); this.smoke.start();}
  schedule(fn,delay){
    const timer={fn,remaining:Math.max(0,Number(delay)||0),cancelled:false};
    this.timers.push(timer);
    return timer;
  }
  clearTimers(){
    this.timers.forEach(timer=>{timer.cancelled=true;});
    this.timers.length=0;
  }
  startPour(){
    this.clearTimers();
    this.left.texture=this.textures.rHold;
    this.right.texture=this.textures.iHold;

    // Let the audience register the bottles. The pour sound begins on the
    // exact frame the pour artwork appears.
    const pourStartMS = 1750;
    const pourDurationMS = 3000;
    const beamDurationMS = 5000;

    this.schedule(()=>{
      this.left.texture=this.textures.rPour;
      this.right.texture=this.textures.iPour;
      this.beams.start(beamDurationMS);
      this.soundscape?.potionPour();
    }, pourStartMS);

    // bubbling.wav follows pour.wav and finishes as the pink/blue beams fade.
    this.schedule(()=>this.soundscape?.potionBubbling(), pourStartMS + pourDurationMS);

    // Only start the local cauldron smoke after the beams are completely gone.
    this.schedule(()=>this.smoke.intensify(), pourStartMS + beamDurationMS + 80);
    this.schedule(()=>this.resetCharacters(), pourStartMS + beamDurationMS + 850);
  }
  beginTransitionSmoke(){this.smoke.intensify();}
  calmSmoke(){this.smoke.calm();}
  resetCharacters(){this.left.texture=this.textures.rIdle;this.right.texture=this.textures.iIdle;}
  update(deltaMS){
    for(const timer of [...this.timers]){
      if(timer.cancelled) continue;
      timer.remaining-=deltaMS;
      if(timer.remaining<=0){
        timer.cancelled=true;
        this.timers.splice(this.timers.indexOf(timer),1);
        try{timer.fn();}catch(error){console.error(error);}
      }
    }
    this.smoke.update(deltaMS);
    this.beams.update(deltaMS);
  }
  async exit(context={}){this.clearTimers();this.resetCharacters();this.smoke.reset();this.beams.stop();await super.exit(context);}
}
