const { syncWithDiscogs } = require('../utils')

module.exports = {
  '*/5 * * * *': ({ strapi }) => syncWithDiscogs(strapi),
}
