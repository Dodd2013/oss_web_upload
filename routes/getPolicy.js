let express = require('express');
let router = express.Router();
const config = require('../config');
const moment = require('moment');
const crypto = require('crypto');
/* GET home page. */
router.get('/', getPolicy);

module.exports = router;

// Routes
/**
 *
 * @param {* req} req
 * @param {* res} res
 */
function getPolicy(req, res) {
	let expire = moment().unix() + config.oss.expire;
	let conditions = [
		['content-length-range', 0, 10485760000]
	];
	let policy = calcPolicy(expire, conditions);
	res.json({
		accessid: config.oss.id,
		host: config.oss.host,
		policy: policy,
		signature: calcSignature(policy, config.oss.key),
		expire: moment().unix() + config.oss.expire,
		callback: getBase64CallbackBody(),
		dir: ''
	});
}
//Tools
function calcPolicy(expire, conditions) {
	let policy = {expiration: moment.unix(expire).toISOString(), conditions: conditions};
	return Buffer.from(JSON.stringify(policy), 'binary').toString('base64');
}

function calcSignature(policy, key) {
	return crypto.createHmac('sha1', key).update(policy).digest().toString('base64'); //base64
}

function getBase64CallbackBody() {
	let callback = {
		callbackUrl: config.oss.callbackUrl,
		callbackBody: 'filename=${object}&size=${size}&mimeType=${mimeType}&height=${imageInfo.height}&width=${imageInfo.width}',
		callbackBodyType: 'application/x-www-form-urlencoded'
	};
	let callbackString = JSON.stringify(callback);
	return Buffer.from(callbackString, 'binary').toString('base64');
}