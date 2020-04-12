const express = require('express')
const app = express()
const port = 3000
const puppeteer = require('puppeteer')

const maxX = 1280
const maxY = 800

let currX = 0
let currY = 0

async function installMouseHelper(page) {
  await page.evaluateOnNewDocument(() => {
    // Install mouse helper only for top-level frame.
    if (window !== window.parent) return;

    window.addEventListener('DOMContentLoaded', () => {
      const box = document.createElement('puppeteer-mouse-pointer');
      const styleElement = document.createElement('style');
      
      styleElement.innerHTML = `
        puppeteer-mouse-pointer {
          pointer-events: none;
          position: absolute;
          top: 0;
          z-index: 10000;
          left: 0;
          width: 20px;
          height: 20px;
          background: rgba(0,0,0,.4);
          border: 1px solid white;
          border-radius: 10px;
          margin: -10px 0 0 -10px;
          padding: 0;
          transition: background .2s, border-radius .2s, border-color .2s;
        }
        puppeteer-mouse-pointer.button-1 {
          transition: none;
          background: rgba(0,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-2 {
          transition: none;
          border-color: rgba(0,0,255,0.9);
        }
        puppeteer-mouse-pointer.button-3 {
          transition: none;
          border-radius: 4px;
        }
        puppeteer-mouse-pointer.button-4 {
          transition: none;
          border-color: rgba(255,0,0,0.9);
        }
        puppeteer-mouse-pointer.button-5 {
          transition: none;
          border-color: rgba(0,255,0,0.9);
        }
      `;
      
      document.head.appendChild(styleElement);
      document.body.appendChild(box);
      
      document.addEventListener('mousemove', event => {
        box.style.left = event.pageX + 'px';
        box.style.top = event.pageY + 'px';
        updateButtons(event.buttons);
      }, true);
      
      document.addEventListener('mousedown', event => {
        updateButtons(event.buttons);
        box.classList.add('button-' + event.which);
      }, true);
      
      document.addEventListener('mouseup', event => {
        updateButtons(event.buttons);
        box.classList.remove('button-' + event.which);
      }, true);

      function updateButtons(buttons) {
        for (let i = 0; i < 5; i++)
          box.classList.toggle('button-' + i, buttons & (1 << i));
      }
    }, false)
  })
}

let page

(async () => {
  const browser = await puppeteer.launch({
     headless: false,
     executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
     args: ['--start-fullscreen', '--disable-infobars'],
     ignoreDefaultArgs: ['--enable-automation'],
    })
  page = await browser.newPage()
  await installMouseHelper(page)
  await page.setViewport({width: maxX, height: maxY});
  page.goto('https://www.youtube.com')
})()

app.use(express.json())

app.get('/', (req, res) => res.send('Hello World!'))

app.get('/api/v1/browser/mouse', async (req, res) => {
  if (req.query.click) {
    await page.mouse.down()
    await page.mouse.up()
  } else {
    const x = currX + parseInt(req.query.deltaX, 10)
    const y = currY + parseInt(req.query.deltaY, 10)
    currX = x >= 0 ? (x <= maxX ? x : maxX) : 0
    currY = y >= 0 ? (y <= maxY ? y : maxY) : 0

    await page.mouse.move(currX, currY)
  }
  
  res.send('OK')
})

app.get('/api/v1/browser/enter', async (req, res) => {
  await page.keyboard.press(String.fromCharCode(13));
  res.send('OK')
});

app.get('/api/v1/browser/escape', async (req, res) => {
  await page.keyboard.press('Escape');
  res.send('OK')
});

app.get('/api/v1/browser/scroll', async (req, res) => {
  await page.evaluate(_ => {
    window.scrollBy(0, req.query.deltaY);
  });
  res.send('OK')
});

app.get('/api/v1/browser/type', async (req, res) => {
  const el = await page.evaluateHandle(() => document.activeElement)
  await el.type(req.query.text)
  res.send('OK')
})

app.get('/api/v1/browser/back', async (req, res) => {
  await page.goBack()
  res.send('OK')
})

app.get('/api/v1/browser/forward', async (req, res) => {
  await page.goForward()
  res.send('OK')
})

app.post('/api/v1/page/events', async (req, res) => {
  console.log(req.body)
  res.send('OK')
})

app.use(express.static('public'))

app.listen(port, () => console.log(`Example app listening at http://localhost:${port}`))
