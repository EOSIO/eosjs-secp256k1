module.exports = {
	hasServer: true,
	modifyWebpackConfig: (baseConfig, options) => {// eslint-disable-line no-unused-vars
		// const {type, environment} = options
		const {target} = baseConfig
		baseConfig.output = {
			path: 'build',
			filename: `${target}.js`,
			libraryTarget: 'umd',
			library: 'secp256k1-js',
		}
		// console.log(type, environment, JSON.stringify(baseConfig, null, 4))
		return baseConfig
	},
}
