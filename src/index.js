'use strict'

const https = require('https')

const { DISCOGS_KEY, DISCOGS_SECRET, DISCOGS_USERNAME } = process.env

module.exports = {
  async bootstrap({ strapi }) {
    const remoteListings = await fetchDiscogsInventory()
    const localListings = await strapi.entityService.findMany(
      'api::listing.listing',
      { fields: ['id', 'discogs_listing_id'] }
    )

    const newRemoteListings = remoteListings.filter(
      ({ id: remoteDiscogsListingId }) =>
        !localListings.find(
          ({ discogs_listing_id }) =>
            Number(discogs_listing_id) === remoteDiscogsListingId
        )
    )
    if (newRemoteListings.length) {
      await strapi.db.query('api::listing.listing').createMany({
        data: newRemoteListings.map((listing) => ({
          discogs_listing_id: listing.id,
          artist: listing.release.artist,
          title: listing.release.title,
          format: listing.release.format,
        })),
      })
    }

    const localListingsToDelete = localListings.filter(
      ({ discogs_listing_id }) =>
        !remoteListings.find(
          ({ id: remoteDiscogsListingId }) =>
            Number(discogs_listing_id) === remoteDiscogsListingId
        )
    )
    if (localListingsToDelete.length) {
      await strapi.db.query('api::listing.listing').deleteMany({
        where: {
          id: localListingsToDelete.map(({ id }) => id),
        },
      })
    }

    console.log(
      '\nLOG -- Data was updated from Discogs. New listings: ',
      newRemoteListings.length,
      '. Deleted listings: ',
      localListingsToDelete.length
    )
  },
}

async function fetchDiscogsInventory() {
  if (!DISCOGS_KEY || !DISCOGS_SECRET || !DISCOGS_USERNAME) {
    throw new Error('Missing environment variables when reading ./.env, check .env.example for more info')
  }

  const firstPage = await fetchInventoryPage()
  const numPages = firstPage.pagination.pages

  const extraPagePromises = []
  for (let i = 2; i <= numPages; i++) {
    extraPagePromises.push(fetchInventoryPage(i))
  }
  const extraPages = await Promise.all(extraPagePromises)

  return [firstPage, ...extraPages].map((page) => page?.listings).flat()
}

function fetchInventoryPage(page = 1) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.discogs.com',
      port: 443,
      path: `/users/${process.env.DISCOGS_USERNAME}/inventory?page=${page}&per_page=50`,
      method: 'GET',
      headers: {
        'User-Agent': 'Script',
        Authorization: `Discogs key=${DISCOGS_KEY}, secret=${DISCOGS_SECRET}`,
      },
    }

    const req = https.request(options, (res) => {
      let response = ''

      res.on('data', (d) => {
        response += d
      })

      res.on('close', () => {
        const inventory = JSON.parse(response)
        resolve(inventory)
      })
    })

    req.on('error', (error) => {
      reject(error)
    })

    req.end()
  })
}
