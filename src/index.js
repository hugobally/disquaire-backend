'use strict'

const { syncWithDiscogs } = require('../utils')

module.exports = {
  async bootstrap({ strapi }) {
    await syncWithDiscogs(strapi)
  },
}
