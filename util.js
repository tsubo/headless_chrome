/**
 * Click & Wait
 */
exports.clickWaitForNavigation = async (page, element) => {
  const navigationPromise = page.waitForNavigation()
  await element.click()
  await navigationPromise
}

/**
 * console.log with prosess.id
 */
exports.plog = (...xs) => {
  console.log(`${process.pid}:`, ...xs)
}
