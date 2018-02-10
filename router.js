let routes = {
	'/getPolicy': require('./routes/getPolicy')
};

module.exports = function (app) {
	for (let key of Object.keys(routes)) {
		app.use(key, routes[key]);
	}
};