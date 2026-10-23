// Renders the CV PDF inline with PDF.js, one canvas per page, with the
// PDF's hyperlinks overlaid as clickable links. Replaces the Google Docs
// viewer embed, which intermittently returns an empty (HTTP 204) response.
import * as pdfjsLib from 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs';

pdfjsLib.GlobalWorkerOptions.workerSrc =
  'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs';

const container = document.getElementById('cv-viewer');
const status = document.getElementById('cv-viewer-status');
const url = container.dataset.pdf;

async function renderPage(pdf, pageNumber, cssWidth) {
  const page = await pdf.getPage(pageNumber);
  const base = page.getViewport({ scale: 1 });
  const ratio = window.devicePixelRatio || 1;
  const viewport = page.getViewport({ scale: (cssWidth / base.width) * ratio });

  const wrapper = document.createElement('div');
  wrapper.className = 'cv-page';
  const canvas = document.createElement('canvas');
  canvas.width = Math.floor(viewport.width);
  canvas.height = Math.floor(viewport.height);
  wrapper.appendChild(canvas);
  container.appendChild(wrapper);

  await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;

  // Position links in percentages so they track the canvas as it scales.
  const annotations = await page.getAnnotations();
  for (const a of annotations) {
    if (a.subtype !== 'Link' || !a.url) continue;
    const [x1, y1, x2, y2] = viewport.convertToViewportRectangle(a.rect);
    const link = document.createElement('a');
    link.href = a.url;
    link.className = 'cv-link';
    if (!a.url.startsWith('mailto:')) {
      link.target = '_blank';
      link.rel = 'noopener';
    }
    link.style.left = `${(Math.min(x1, x2) / viewport.width) * 100}%`;
    link.style.top = `${(Math.min(y1, y2) / viewport.height) * 100}%`;
    link.style.width = `${(Math.abs(x2 - x1) / viewport.width) * 100}%`;
    link.style.height = `${(Math.abs(y2 - y1) / viewport.height) * 100}%`;
    wrapper.appendChild(link);
  }
}

try {
  const pdf = await pdfjsLib.getDocument({ url, isEvalSupported: false }).promise;
  const cssWidth = container.clientWidth;
  for (let n = 1; n <= pdf.numPages; n++) {
    await renderPage(pdf, n, cssWidth);
    if (n === 1) status.remove();
  }
} catch (err) {
  console.error(err);
  status.innerHTML = `The CV could not be displayed here. <a href="${url}">Open the PDF</a>.`;
  if (!status.isConnected) container.before(status);
}
