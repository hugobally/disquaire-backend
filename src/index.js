'use strict'

const { syncWithDiscogs } = require('../utils')

module.exports = {
  async bootstrap({ strapi }) {
    await syncWithDiscogs(strapi)
    console.log(process.env.CLOUDINARY_KEY)
    console.log(process.env.CLOUDINARY_NAME)
    console.log(process.env.CLOUDINARY_SECRET)
  },
}
