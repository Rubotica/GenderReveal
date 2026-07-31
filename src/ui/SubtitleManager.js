const SPECIAL_WORDS = new Set(['girl', 'boy', 'wizard', 'witch']);

function endsSentence(text) {
  return /[.!?]["']?$/.test(String(text));
}

function sentenceStart(words, activeIndex) {
  let start = activeIndex;
  while (start > 0 && !endsSentence(words[start - 1].text)) start -= 1;
  return start;
}

function specialClass(text) {
  const clean = String(text).toLowerCase().replace(/[^a-z]/g, '');
  return SPECIAL_WORDS.has(clean) ? clean : '';
}

export class SubtitleManager {
  constructor(element) {
    this.element = element;
    this.sceneId = null;
    this.sentenceStart = -1;
    this.lastWord = -1;
  }

  resetState(scene) {
    this.sceneId = scene.id ?? scene.audio;
    this.sentenceStart = -1;
    this.lastWord = -1;
    this.element.innerHTML = '';
  }

  update(scene, time) {
    const id = scene.id ?? scene.audio;
    if (id !== this.sceneId) this.resetState(scene);

    let activeIndex = -1;
    for (let i = 0; i < scene.words.length; i += 1) {
      if (scene.words[i].start <= time + 0.035) activeIndex = i;
      else break;
    }
    if (activeIndex < 0) return;

    const start = sentenceStart(scene.words, activeIndex);
    if (start !== this.sentenceStart) {
      this.element.innerHTML = '';
      this.sentenceStart = start;
      this.lastWord = start - 1;
      this.element.classList.remove('subtitle-new-sentence');
      void this.element.offsetWidth;
      this.element.classList.add('subtitle-new-sentence');
    }

    for (let index = this.lastWord + 1; index <= activeIndex; index += 1) {
      const previousLatest = this.element.querySelector('.subtitle-word-latest');
      const previousRecent = this.element.querySelector('.subtitle-word-recent');
      const previousOlder = this.element.querySelector('.subtitle-word-older');
      previousOlder?.classList.remove('subtitle-word-older');
      if (previousRecent) {
        previousRecent.classList.remove('subtitle-word-recent');
        previousRecent.classList.add('subtitle-word-older');
      }
      if (previousLatest) {
        previousLatest.classList.remove('subtitle-word-latest');
        previousLatest.classList.add('subtitle-word-recent');
      }

      if (this.element.childNodes.length) this.element.append(' ');
      const span = document.createElement('span');
      span.className = 'subtitle-word subtitle-word-visible subtitle-word-new subtitle-word-latest';
      const emphasis = specialClass(scene.words[index].text);
      if (emphasis) span.classList.add(emphasis);
      span.textContent = scene.words[index].text;
      this.element.appendChild(span);
    }
    this.lastWord = activeIndex;
  }

  clear() {
    this.element.innerHTML = '';
    this.element.classList.remove('subtitle-new-sentence');
    this.sceneId = null;
    this.sentenceStart = -1;
    this.lastWord = -1;
  }
}
