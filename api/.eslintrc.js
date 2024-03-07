module.exports = {
	root: true,
	env: {
		node: true,
	},
    parserOptions: {
        ecmaVersion: 12
    },
	rules: {
        'no-promise-executor-return': "error",
	}
};