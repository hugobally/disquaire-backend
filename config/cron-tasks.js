const { syncWithDiscogs } = require('../utils')

module.exports = {
  '*/15 * * * *': ({ strapi }) => syncWithDiscogs(strapi),
}
