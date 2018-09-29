const fs = require('fs')
const glob = require('glob')
const puppeteer = require('puppeteer')
const dateFns = require('date-fns')
const cluster = require('cluster')
const os = require('os')
const pages = require('./pages')
const plog = require('./util').plog

/**
 * スタートブラウザ
 */
const startBrowser = async () => {
  const browser = await puppeteer.launch({ headless: false })
  const page = await browser.newPage()
  await page.setViewport({ width: 1000, height: 800 })
  return { browser, page }
}

/**
 * スクレイピング対象日付の生成
 */
const getScrapingDaysSets = numOfSet => {
  const today = new Date()
  const lastday = dateFns.lastDayOfMonth(dateFns.addMonths(today, 1))
  const days = dateFns.eachDay(today, lastday)

  const num_of_data = days.length / numOfSet
  if (days.length % numOfSet) num_of_data++
  let daysSet = []
  while (days.length) {
    daysSet.push(days.splice(0, num_of_data))
  }
  plog(daysSet)

  return daysSet
}

/**
 * 日付ごとのスクレイピング
 */
const scrapingByDate = async (page, date, category) => {
  // plog(
  //   category,
  //   dateFns.format(date, 'YYYY/MM/DD', { locale: dateFns.jaLocale })
  // )

  await pages.homePage(page)
  await pages.dateSearchPage(page, category.name, date)
  await pages.emptyStatePage(page, category, date, 1)
}

/**
 * スクレイピングメイン
 */
const scraping = async days => {
  const { browser, page } = await startBrowser()
  const categories = [
    { type: 'hard', name: 'テニス（ハード）' },
    { type: 'omni', name: 'テニス（人工芝）' },
  ]

  for (category of categories) {
    for (day of days) {
      await scrapingByDate(page, day, category)
    }
  }

  await browser.close()
}

/**
 * main クラスタで並行処理
 */
const main = () => {
  if (cluster.isMaster) {
    plog(`Master ${process.pid} is running...`)
    console.time('Master Benchmark')

    glob.sync('./tmp/*.html').map(file => {
      fs.unlink(file, err => {
        if (err) throw err
      })
    })

    daysSets = getScrapingDaysSets(os.cpus().length)
    for (let i = 0; i < daysSets.length; i++) {
      cluster.fork({ days: daysSets[i].join(',') })
    }

    cntDie = 0
    cluster.on('exit', (worker, code, signal) => {
      plog(`Worker ${worker.process.pid} died.`)
      cntDie++

      if (cntDie === daysSets.length) {
        console.timeEnd('Master Benchmark')
      }
    })
  } else {
    plog(`Worker ${process.pid} started...`)
    const days = process.env.days.split(',')
    ;(async () => {
      await scraping(days)
      process.exit()
    })()
  }
}

main()
