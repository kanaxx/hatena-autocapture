const moment = require('moment');
const puppeteer = require('puppeteer');
const cloudinary = require('cloudinary')
const fs = require('fs');

// for pupetter
const viewPoint = {width:1000, height:800};
const captureOffset = {x:240, y:40};
const captureClipArea = { x:captureOffset.x, y:captureOffset.y, width:(viewPoint.width - captureOffset.x), height:viewPoint.height};
const puppeterOptions = process.env.DYNO ? { args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=ja-JP,ja'], slowMo:100 } : { headless: true, slowMo:100 };

// for date
const baseFilename = moment().format('YYYYMMDD-HHmmss');
const captureTop = baseFilename + '_hatena-top.png';
const captureAccessLog = baseFilename + '_hatena-access-log.png';
const overlayText = moment().format('YYYY年M月D日');

// for env
const hatenaId = process.env.hatena_id;
const hatenaPass = process.env.hatena_pass;
const blogAdminUrl = process.env.blog_admin_url;
const blogAdminAccessLogUrl = blogAdminUrl + 'accesslog';

// other
const imageDir = './captures/';

if (!fs.existsSync(imageDir)){
    fs.mkdirSync(imageDir);
}


(async () => {
  const browser = await puppeteer.launch(puppeterOptions);

  const page = (await browser.pages())[0];
  await page.setExtraHTTPHeaders({'Accept-Language': 'ja'});
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/93.0.4577.82 Safari/537.36');
  await page.setViewport({ width:viewPoint.width, height:viewPoint.height });

  console.info('goto login page');
  const response = await page.goto('https://www.hatena.ne.jp/login?location='+blogAdminUrl,{waitUntil: "domcontentloaded"});
  console.log('login page response');
  console.log(response);

  console.info('input login information');
  await page.type('input[name="name"]', hatenaId);
  await page.type('input[name="password"]', hatenaPass);

  await Promise.all([
    page.click('button#login-button'),
    page.waitForNavigation({timeout: 60000, waitUntil: "domcontentloaded"}),
  ]);
  
  console.info('reached top page');
  await page.waitForTimeout(1000);

  console.info('take screenshot top');
  await page.screenshot({ path: imageDir + captureTop, clip:captureClipArea });

  console.info('goto access log page');
  let response2 = null;
  await Promise.all([
    response2 = page.goto(blogAdminAccessLogUrl),
    page.waitForNavigation({timeout: 60000, waitUntil: "networkidle0"}),
  ]);
  console.info('reached access log page');
  // console.log(response1);

  await page.waitForTimeout(1000);

  console.info('take screenshot access log');
  await page.screenshot({ path: imageDir + captureAccessLog, clip:captureClipArea });
  browser.close()

  //環境変数にCoudinaryがあるときだけ実施
  if( process.env.CLOUDINARY_URL ){
    console.info('send image to cloudinary');

    for(file of [captureTop, captureAccessLog] ){
      await cloudinary.v2.uploader.upload(
        imageDir + file,
        {
          public_id: file, folder:'hatena',type:'private',
          transformation : [
            //最下部に余白をいれる
            { width: captureClipArea.width, height: (captureClipArea.height+60), crop:'pad', background:'pink',gravity:'north' }, 
            //余白にテキストを入れる
            { overlay: {font_family: 'Potta One.ttf', font_size: 20, text: overlayText} ,gravity:'south_east', x:15, y:15,}
          ],                                   
          
        },
        function (error, result) {
          if(error){
            console.error('error with cloudinary.upload');
            console.error(error);
          }
          if(result){
            console.info('uploaded to cloudinary as public_id = %s', result.public_id);
          }
        }
      );
    }
  }
  
  console.info('End of Program');
  
})();