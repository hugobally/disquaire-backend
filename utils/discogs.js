const https = require('https')

const { DISCOGS_KEY, DISCOGS_SECRET, DISCOGS_USERNAME } = process.env

module.exports = {
  fetchDiscogsListings: async () => {
    if (!DISCOGS_KEY || !DISCOGS_SECRET || !DISCOGS_USERNAME) {
      throw new Error(
        'Missing environment variables, check .env.example for more info'
      )
    }

    return (await fetchAllPages(fetchDiscogsInventoryPage))
      .map((page) => page.listings)
      .flat()
  },
}

function fetchDiscogsInventoryPage(page = 1) {
  const options = {
    hostname: 'api.discogs.com',
    port: 443,
    path: `/users/${DISCOGS_USERNAME}/inventory?page=${page}&per_page=50`,
    method: 'GET',
    headers: {
      'User-Agent': 'Script',
      Authorization: `Discogs key=${DISCOGS_KEY}, secret=${DISCOGS_SECRET}`,
    },
  }

  return performRequest(
    options,
    (response) => {
      const responseFromJSON = JSON.parse(response)
      return {
        ...responseFromJSON,
        numPages: responseFromJSON.pagination.pages,
      }
    }
  )
}

async function fetchAllPages(fetchOnePage) {
  const firstPage = await fetchOnePage()

  const extraPagePromises = []
  for (let i = 2; i <= firstPage.numPages; i++) {
    extraPagePromises.push(fetchOnePage(i))
  }
  const extraPages = await Promise.all(extraPagePromises)

  return [firstPage, ...extraPages]
}

function performRequest(options, responseParser) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let response = ''

      res.on('data', (d) => {
        response += d
      })

      res.on('close', () => {
        resolve(responseParser(response))
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}
