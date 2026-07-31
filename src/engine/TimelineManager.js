const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

export class TimelineManager {
  constructor({ audio, subtitles, events, interSceneGapMS = 1000 }) {
    this.audio = audio;
    this.subtitles = subtitles;
    this.events = events;
    this.interSceneGapMS = interSceneGapMS;
  }

  async run(data) {
    for (let index = 0; index < data.scenes.length; index += 1) {
      await this.runScene(data.scenes[index]);
      if (index < data.scenes.length - 1) await wait(this.interSceneGapMS);
    }
  }

  async runScene(scene) {
    const fired = new Set();
    const timed = scene.events.filter(event => event.time !== 'end');
    const endEvents = scene.events.filter(event => event.time === 'end');
    let active = true;
    const frame = () => {
      if (!active) return;
      const time = this.audio.currentTime;
      this.subtitles.update(scene, time);
      timed.forEach((event, index) => {
        if (!fired.has(index) && time >= Number(event.time)) {
          fired.add(index);
          Promise.resolve(this.events(event)).catch(console.error);
        }
      });
      requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    await this.audio.play(scene.audio);
    active = false;
    for (const event of endEvents) await this.events(event);
    this.subtitles.clear();
  }
}
