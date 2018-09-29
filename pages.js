const fs = require('fs')
var beautify = require('js-beautify')
const dateFns = require('date-fns')
const plog = require('./util').plog
const clickWaitForNavigation = require('./util').clickWaitForNavigation

/**
 * ホームページ
 */
exports.homePage = async page => {
  await page.goto(
    'https://yoyaku.sports.metro.tokyo.jp/user/view/user/homeIndex.html'
  )
  plog(await page.title())
  // await page.screenshot({ path: 'example.png' })

  // "種目から" リンクをクリック
  await clickWaitForNavigation(page, await page.$('#dateSearch'))
}

/**
 * 利用日と種目の選択ページ
 */
exports.dateSearchPage = async (page, category, date) => {
  plog(
    await page.title(),
    category,
    dateFns.format(date, 'YYYY/MM/DD', { locale: dateFns.jaLocale })
  )

  const yyyy = dateFns.getYear(date).toString()
  const mm = dateFns.getMonth(date) + 1 + ''
  const dd = dateFns.getDate(date).toString()
  // plog(yyyy, mm, dd)

  // 日付を選択
  await page.select('select#year', yyyy)
  await page.select('select#month', mm)
  await page.select('select#day', dd)

  // 時間を選択
  await page.select('select#sHour', '0')
  await page.select('select#eHour', '23')

  // "種目" チェックボックスをクリック
  const elements = await page.$x(`//span[contains(text(), '${category}')]`)
  await elements[0].click()

  // "上記内容で検索" ボタンをクリック
  await clickWaitForNavigation(page, await page.$('#srchBtn'))
}

/**
 * 空き状況ページ
 */
const emptyStatePage = async (page, category, date, pageCnt) => {
  const ymd = dateFns.format(date, 'YYYY-MM-DD', { locale: dateFns.jaLocale })
  plog(await page.title(), category.name, ymd, pageCnt)

  try {
    // コート空きデータの取得
    const notEmptyDiv = await page.$eval('div#isNotEmptyPager', element => {
      return element.outerHTML
    })
    // html をファイルに出力
    fs.writeFile(
      `tmp/${category.type}_${ymd}_${pageCnt}.html`,
      beautify.html(notEmptyDiv, { indent_size: 2 }),
      err => {
        if (err) throw err
      }
    )
  } catch (error) {
    // 空きデータが無い時は何もしない
  }

  // "次のｎ件" リンクをクリック
  const element = await page.$('#goNextPager')
  if (element) {
    await clickWaitForNavigation(page, element)
    await emptyStatePage(page, category, date, pageCnt + 1)
  }
}
exports.emptyStatePage = emptyStatePage
