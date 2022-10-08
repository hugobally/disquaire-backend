const { fetchDiscogsListings } = require('./discogs')

module.exports = {
  fetchDiscogsListings,
  syncWithDiscogs: async (strapi) => {
    const remoteListings = await fetchDiscogsListings()
    const localListings = await strapi.entityService.findMany(
      'api::listing.listing',
      { fields: ['id', 'discogs_listing_id'] }
    )

    // Create data that exists in Discogs but doesn't exist in Strapi yet

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

    // Remove data that does not exist in Discogs anymore but still exists in Strapi

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
      '\n-- DISCOGS SYNC -- Data was updated from Discogs. New listings: ',
      newRemoteListings.length,
      '. Deleted listings: ',
      localListingsToDelete.length
    )
  }
}
