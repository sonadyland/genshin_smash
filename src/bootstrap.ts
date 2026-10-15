import { ensureArtUrls } from './game/art-url-session';

async function start() {
  const root = document.getElementById('root')!;
  root.textContent = '正在准备素材授权…';
  try {
    await ensureArtUrls(true);
    await import('./main');
  } catch {
    root.replaceChildren();
    const message = document.createElement('p');
    message.textContent = '素材服务暂不可用，请重试。';
    const retry = document.createElement('button');
    retry.textContent = '重试';
    retry.onclick = () => { void start(); };
    root.append(message, retry);
  }
}
void start();
