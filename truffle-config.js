// const HDWalletProvider = require('@truffle/hdwallet-provider');

module.exports = {
    // Uncommenting the defaults below
    // provides for an easier quick-start with Ganache.
    // You can also follow this format for other networks;
    // see <http://truffleframework.com/docs/advanced/configuration>
    // for more details on how to specify configuration options!
    //
    networks: {
        development: {
            host: 'localhost',
            port: 7545,
            network_id: '*',
        },
    },
    compilers: {
        solc: {
            version: "0.8.1"
        }
    }
};
