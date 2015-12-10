var cryptojs = require('crypto-js');

module.exports = function(db) {
	return {
		requireAuthentication: function(req, res, next) {
			var token = req.get('Auth') || '';

			console.log("Looking for token in db: " + token);
			db.token.findOne({
				where: {
					tokenHash: cryptojs.MD5(token).toString()
				}
			}).then(function(tokenInstance) {
				if (!tokenInstance) {
					console.log("Unable to find tokenHash in db: " + cryptojs.MD5(token).toString());
					throw new Error();
				}
				req.token = tokenInstance;
				return db.user.findByToken(token);
			}).then(function(user) {
				req.user = user;
				next();
			}).catch(function() {
				res.status(401).send();
			});
		}
	};
};